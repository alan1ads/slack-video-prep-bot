const { App } = require('@slack/bolt');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { processVideo, applyRehash } = require('./videoProcessor');
const https = require('https');
require('dotenv').config();

// Debug lines to check if tokens are loaded
console.log('Bot Token:', process.env.SLACK_BOT_TOKEN ? 'Found' : 'Missing');
console.log('App Token:', process.env.SLACK_APP_TOKEN ? 'Found' : 'Missing');

// App initialization with port configuration
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
});

// Create temp directories
const inputDir = path.join(__dirname, 'temp', 'input');
const outputDir = path.join(__dirname, 'temp', 'output');
const overlaysDir = path.join(__dirname, 'overlays');

// Create temp directories with error handling
try {
    fs.mkdirSync(inputDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
    fs.mkdirSync(overlaysDir, { recursive: true });
    console.log('Temp directories created/verified:');
    console.log('Input directory:', inputDir);
    console.log('Output directory:', outputDir);
    console.log('Overlays directory:', overlaysDir);
} catch (error) {
    console.error('Error creating temp directories:', error);
}

// Store for pending videos
const pendingVideos = new Map();

// Download function with proper headers
async function downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(outputPath);
        
        const options = {
            headers: {
                'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
            }
        };

        https.get(url, options, response => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download file: ${response.statusCode}`));
                return;
            }

            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                console.log('File downloaded successfully to:', outputPath);
                resolve(outputPath);
            });

            fileStream.on('error', (err) => {
                fs.unlink(outputPath, () => {}); // Delete the file if there's an error
                reject(err);
            });
        }).on('error', (err) => {
            fs.unlink(outputPath, () => {}); // Delete the file if there's an error
            reject(err);
        });
    });
}

// Handle slash command
app.command('/videoprep', async ({ command, ack, client }) => {
    try {
        await ack();
        
        // Clear any existing pending videos for this channel
        pendingVideos.set(command.channel_id, []);

        await client.chat.postMessage({
            channel: command.channel_id,
            text: "Upload your videos to this channel. When you're done uploading, click 'Process Videos' to modify them all at once.",
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "*Upload Multiple Videos:*\n1️⃣ Upload all your videos to this channel\n2️⃣ Click the button below when done uploading\n3️⃣ Set processing options for all videos"
                    }
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "Process Videos",
                                emoji: true
                            },
                            action_id: "process_multiple_videos"
                        }
                    ]
                }
            ]
        });
    } catch (error) {
        console.error('Error handling slash command:', error);
    }
});

// Handle file sharing
app.event('file_shared', async ({ event, client }) => {
    try {
        const result = await client.files.info({
            file: event.file_id
        });

        const file = result.file;
        
        // Skip if this is a processed video (check the filename)
        if (file.name.startsWith('Processed_')) {
            console.log('Skipping processed video:', file.name);
            return;
        }

        if (!file.mimetype.startsWith('video/')) {
            await client.chat.postMessage({
                channel: event.channel_id,
                text: "Please share only video files."
            });
            return;
        }

        // Add to pending videos
        let channelVideos = pendingVideos.get(event.channel_id) || [];
        channelVideos.push({
            file: file,
            file_id: event.file_id
        });
        pendingVideos.set(event.channel_id, channelVideos);

        await client.chat.postMessage({
            channel: event.channel_id,
            text: `Video added to queue! (${channelVideos.length} videos ready for processing)`
        });

    } catch (error) {
        console.error(error);
    }
});

app.action('process_multiple_videos', async ({ ack, body, client }) => {
    await ack();
    
    const channelVideos = pendingVideos.get(body.channel.id) || [];
    
    if (channelVideos.length === 0) {
        await client.chat.postMessage({
            channel: body.channel.id,
            text: "No videos found to process. Please upload some videos first!"
        });
        return;
    }

    try {
        await client.views.open({
            trigger_id: body.trigger_id,
            view: {
                type: 'modal',
                callback_id: 'video_processing_modal',
                title: {
                    type: 'plain_text',
                    text: 'Process Videos'
                },
                submit: {
                    type: 'plain_text',
                    text: 'Process All'
                },
                close: {
                    type: 'plain_text',
                    text: 'Cancel'
                },
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*Processing ${channelVideos.length} videos*`
                        }
                    },
                    // Add this new checkbox block at the top
                    {
                        type: 'input',
                        block_id: 'random_mode',
                        optional: true,
                        element: {
                            type: 'checkboxes',
                            action_id: 'random_mode_checkbox',
                            options: [
                                {
                                    text: {
                                        type: 'plain_text',
                                        text: 'Use Random Mode (all parameters will be randomly generated)',
                                        emoji: true
                                    },
                                    value: 'random'
                                }
                            ]
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Processing Mode',
                            emoji: true
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'speed_adjustment',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'speed_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter a number (e.g., 2 for 2% faster, -5 for 5% slower)'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Speed Adjustment (%)'
                        },
                        optional: true  // Make this optional so random mode can work
                    },
                    {
                        type: 'input',
                        block_id: 'saturation_adjustment',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'saturation_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter a number (e.g., 1.2 for 20% more saturated)'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Saturation Adjustment'
                        },
                        optional: true
                    },
                    {
                        type: 'input',
                        block_id: 'brightness_adjustment',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'brightness_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter a number (e.g., 0.1 for 10% brighter, -0.1 for 10% darker)'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Brightness Adjustment'
                        },
                        optional: true
                    },
                    {
                        type: 'input',
                        block_id: 'contrast_adjustment',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'contrast_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter a number (e.g., 1.2 for 20% more contrast)'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Contrast Adjustment'
                        },
                        optional: true
                    },
                    // Add this field to your modal blocks
                    {
                        type: 'input',
                        block_id: 'fps_adjustment',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'fps_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter a number (e.g., 2 for 2% higher FPS, -5 for 5% lower FPS)'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'FPS Adjustment (%)'
                        },
                        optional: true
                    },
                    // Add a divider for better section organization
                    {
                        type: 'divider'
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: '*Audio Editing Options*'
                        }
                    },
                    // Reverb
                    {
                        type: 'input',
                        block_id: 'reverb_level',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'reverb_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter a number from 0-100 (e.g., 30 for medium reverb)'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Reverb Level'
                        },
                        optional: true
                    },
                    // Delay/Echo
                    {
                        type: 'input',
                        block_id: 'delay_level',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'delay_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter a number from 0-90 (e.g., 20 for subtle delay)'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Echo/Delay Level'
                        },
                        optional: true
                    },
                    // Pitch Shift
                    {
                        type: 'input',
                        block_id: 'pitch_shift',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'pitch_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter from -12 to 12 (e.g., 3 for higher pitch, -4 for lower)'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Pitch Shift (semitones)'
                        },
                        optional: true
                    },
                    // Distortion/Saturation
                    {
                        type: 'input',
                        block_id: 'distortion',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'distortion_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter from 0-100 (e.g., 10 for subtle distortion)'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Distortion/Saturation'
                        },
                        optional: true
                    },
                    // Noise Reduction
                    {
                        type: 'input',
                        block_id: 'noise_reduction',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'noise_reduction_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter from 0-30 (e.g., 10 for moderate noise reduction)'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Noise Reduction'
                        },
                        optional: true
                    },
                    // EQ - Low
                    {
                        type: 'input',
                        block_id: 'eq_low_level',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'eq_low_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter from -15 to 15 (e.g., 3 for more bass, -3 for less)'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'EQ: Low Frequencies (Bass)'
                        },
                        optional: true
                    },
                    // EQ - Mid
                    {
                        type: 'input',
                        block_id: 'eq_mid_level',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'eq_mid_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter from -15 to 15 (e.g., 2 for more mids, -2 for less)'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'EQ: Mid Frequencies'
                        },
                        optional: true
                    },
                    // EQ - High
                    {
                        type: 'input',
                        block_id: 'eq_high_level',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'eq_high_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter from -15 to 15 (e.g., 3 for more treble, -3 for less)'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'EQ: High Frequencies (Treble)'
                        },
                        optional: true
                    },
                    // Compression
                    {
                        type: 'input',
                        block_id: 'compression',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'compression_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter from 0-30 (e.g., 10 for moderate compression)'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Compression/Limiting'
                        },
                        optional: true
                    },
                    // De-essing
                    {
                        type: 'input',
                        block_id: 'de_essing',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'de_essing_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter from 0-10 (e.g., 5 for moderate de-essing)'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'De-essing (reduce harsh S sounds)'
                        },
                        optional: true
                    },
                    // Add a divider for text watermark section
                    {
                        type: 'divider'
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: '*Visual Options*'
                        }
                    },
                    // Text Watermark
                    {
                        type: 'input',
                        block_id: 'text_watermark',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'text_watermark_input',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter text or emoji (e.g., "© 2024" or "👍")'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Text/Emoji Watermark'
                        },
                        optional: true
                    },
                    // Note about automatic features
                    {
                        type: 'context',
                        elements: [
                            {
                                type: 'mrkdwn',
                                text: '*Note:* Voice Enhancement and Audio Watermarking will be applied randomly. Audio metadata will be generated automatically.'
                            }
                        ]
                    }
                ],
                private_metadata: body.channel.id
            }
        });
    } catch (error) {
        console.error('Error opening modal:', error);
    }
});

// Handle modal submission
app.view('video_processing_modal', async ({ ack, body, view, client }) => {
    await ack();
    
    // Extract channel ID
    const channelId = body.view.private_metadata || body.channel.id;
    
    // Get the pending videos for this channel
    const channelVideos = pendingVideos.get(channelId) || [];
    
    // Check if random mode is enabled
    const useRandomMode = view.state.values.random_mode?.random_mode_checkbox?.selected_options?.length > 0;
    
    // Extract user inputs
    let speedAdjustment = 0;
    let saturation = 1;
    let brightness = 0;
    let contrast = 1;
    let fpsAdjustment = null;
    
    // NEW: Extract audio parameters with defaults
    let reverbLevel = null;
    let delayLevel = null;
    let pitchShift = null;
    let distortion = null;
    let noiseReduction = null;
    let eqLowLevel = null;
    let eqMidLevel = null;
    let eqHighLevel = null;
    let compression = null;
    let deEssing = null;
    
    // NEW: Extract text watermark
    let textWatermark = null;
    
    // Always apply rehash as a standard part of processing
    const shouldRehash = true;
    console.log('Video rehashing is enabled by default');
    
    if (shouldRehash) {
        console.log('Video rehashing is enabled');
    }
    
    // If random mode is enabled, use random values
    if (useRandomMode) {
        // Random video adjustments (existing code)
        speedAdjustment = Math.floor(Math.random() * 21) - 10; // Range from -10% to 10%
        saturation = (Math.random() * 0.4) + 0.8; // Range from 0.8 to 1.2
        brightness = (Math.random() * 0.4) - 0.2; // Range from -0.2 to 0.2
        contrast = (Math.random() * 0.4) + 0.8; // Range from 0.8 to 1.2
        fpsAdjustment = (Math.random() * 10) - 5; // Range from -5% to 5%
        
        // NEW: Random audio adjustments
        reverbLevel = Math.floor(Math.random() * 60); // Most users prefer not too extreme
        delayLevel = Math.floor(Math.random() * 50);
        pitchShift = Math.floor(Math.random() * 9) - 4; // Range from -4 to 4
        distortion = Math.floor(Math.random() * 30); // Not too harsh
        noiseReduction = Math.floor(Math.random() * 15);
        eqLowLevel = Math.floor(Math.random() * 11) - 5; // Range from -5 to 5
        eqMidLevel = Math.floor(Math.random() * 11) - 5;
        eqHighLevel = Math.floor(Math.random() * 11) - 5;
        compression = Math.floor(Math.random() * 15);
        deEssing = Math.floor(Math.random() * 6);
        
        // No random watermark - this should be explicitly set by user
    } else {
        // Extract existing video parameters
        const speedInput = view.state.values.speed_adjustment?.speed_input?.value;
        if (speedInput && speedInput.trim() !== '') {
            speedAdjustment = parseFloat(speedInput);
        }
        
        const saturationInput = view.state.values.saturation_adjustment?.saturation_input?.value;
        if (saturationInput && saturationInput.trim() !== '') {
            saturation = parseFloat(saturationInput);
        }
        
        const brightnessInput = view.state.values.brightness_adjustment?.brightness_input?.value;
        if (brightnessInput && brightnessInput.trim() !== '') {
            brightness = parseFloat(brightnessInput);
        }
        
        const contrastInput = view.state.values.contrast_adjustment?.contrast_input?.value;
        if (contrastInput && contrastInput.trim() !== '') {
            contrast = parseFloat(contrastInput);
        }
        
        const fpsInput = view.state.values.fps_adjustment?.fps_input?.value;
        if (fpsInput && fpsInput.trim() !== '') {
            fpsAdjustment = parseFloat(fpsInput);
        }
        
        // NEW: Extract audio parameters
        const reverbInput = view.state.values.reverb_level?.reverb_input?.value;
        if (reverbInput && reverbInput.trim() !== '') {
            reverbLevel = parseFloat(reverbInput);
        }
        
        const delayInput = view.state.values.delay_level?.delay_input?.value;
        if (delayInput && delayInput.trim() !== '') {
            delayLevel = parseFloat(delayInput);
        }
        
        const pitchInput = view.state.values.pitch_shift?.pitch_input?.value;
        if (pitchInput && pitchInput.trim() !== '') {
            pitchShift = parseFloat(pitchInput);
        }
        
        const distortionInput = view.state.values.distortion?.distortion_input?.value;
        if (distortionInput && distortionInput.trim() !== '') {
            distortion = parseFloat(distortionInput);
        }
        
        const noiseReductionInput = view.state.values.noise_reduction?.noise_reduction_input?.value;
        if (noiseReductionInput && noiseReductionInput.trim() !== '') {
            noiseReduction = parseFloat(noiseReductionInput);
        }
        
        const eqLowInput = view.state.values.eq_low_level?.eq_low_input?.value;
        if (eqLowInput && eqLowInput.trim() !== '') {
            eqLowLevel = parseFloat(eqLowInput);
        }
        
        const eqMidInput = view.state.values.eq_mid_level?.eq_mid_input?.value;
        if (eqMidInput && eqMidInput.trim() !== '') {
            eqMidLevel = parseFloat(eqMidInput);
        }
        
        const eqHighInput = view.state.values.eq_high_level?.eq_high_input?.value;
        if (eqHighInput && eqHighInput.trim() !== '') {
            eqHighLevel = parseFloat(eqHighInput);
        }
        
        const compressionInput = view.state.values.compression?.compression_input?.value;
        if (compressionInput && compressionInput.trim() !== '') {
            compression = parseFloat(compressionInput);
        }
        
        const deEssingInput = view.state.values.de_essing?.de_essing_input?.value;
        if (deEssingInput && deEssingInput.trim() !== '') {
            deEssing = parseFloat(deEssingInput);
        }
        
        // NEW: Extract text watermark
        const textWatermarkInput = view.state.values.text_watermark?.text_watermark_input?.value;
        if (textWatermarkInput && textWatermarkInput.trim() !== '') {
            textWatermark = textWatermarkInput.trim();
        }
    }
    
    console.log(`Processing parameters: Speed=${speedAdjustment}%, Saturation=${saturation}, Brightness=${brightness}, Contrast=${contrast}, FPS=${fpsAdjustment}%`);
    // Log audio parameters
    console.log(`Audio parameters: Reverb=${reverbLevel}, Delay=${delayLevel}, Pitch=${pitchShift}, Distortion=${distortion}, NoiseReduction=${noiseReduction}`);
    console.log(`EQ: Low=${eqLowLevel}, Mid=${eqMidLevel}, High=${eqHighLevel}, Compression=${compression}, DeEssing=${deEssing}`);
    // Log text watermark if present
    if (textWatermark) {
        console.log(`Text Watermark: "${textWatermark}"`);
    }

    try {
        // Notify start of processing
        await client.chat.postMessage({
            channel: channelId,
            text: `Starting to process ${channelVideos.length} videos... This might take a while.`
        });

        // Process videos sequentially with delay between each
        for (const videoInfo of channelVideos) {
            try {
                const inputPath = path.join(inputDir, `input_${videoInfo.file_id}.mp4`);
                const outputPath = path.join(outputDir, `output_${videoInfo.file_id}.mp4`);

                console.log('Processing video:', videoInfo.file.name);
                
                // Download
                await downloadFile(videoInfo.file.url_private_download, inputPath);
                console.log('Download completed for:', videoInfo.file.name);
                
                // Add a small delay between operations
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Process video with the new textWatermark parameter
                try {
                    // First apply standard processing
                    await processVideo(
                        inputPath, 
                        outputPath, 
                        speedAdjustment, 
                        saturation, 
                        brightness, 
                        contrast, 
                        fpsAdjustment,
                        // Audio parameters
                        reverbLevel,
                        delayLevel,
                        pitchShift,
                        distortion,
                        noiseReduction,
                        eqLowLevel,
                        eqMidLevel,
                        eqHighLevel,
                        compression,
                        deEssing,
                        // Text watermark parameter
                        textWatermark
                    );
                    console.log('Processing completed for:', videoInfo.file.name);
                    
                    // Always apply rehash as a standard part of processing
                    console.log('Applying rehash data refresh to:', videoInfo.file.name);
                    const rehashOutputPath = path.join(outputDir, `rehash_${videoInfo.file_id}.mp4`);
                    // Pass the text watermark to the rehash function as well
                    await applyRehash(outputPath, rehashOutputPath, overlaysDir, textWatermark);
                    
                    // Replace the output path with the rehashed version
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                    fs.renameSync(rehashOutputPath, outputPath);
                    console.log('Rehash completed for:', videoInfo.file.name);

                    // Upload
                    await client.files.uploadV2({
                        channel_id: channelId,
                        file: fs.createReadStream(outputPath),
                        filename: `Processed_${videoInfo.file.name}`,
                        title: `Processed_${videoInfo.file.name}`
                    });
                    console.log('Upload completed for:', videoInfo.file.name);

                    await client.chat.postMessage({
                        channel: channelId,
                        text: `✅ Processed: ${videoInfo.file.name}`
                    });
                } catch (processError) {
                    console.error(`Error processing video: ${processError.message}`);
                    await client.chat.postMessage({
                        channel: channelId,
                        text: `⚠️ Warning: ${videoInfo.file.name} was too large to process. Try a smaller video.`
                    });
                }

                // Cleanup regardless of success or failure
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

                // Add delay between videos
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                console.error(`Error processing video ${videoInfo.file_id}:`, error);
                await client.chat.postMessage({
                    channel: channelId,
                    text: `❌ Error processing video ${videoInfo.file.name}: ${error.message}`
                });
            }
        }

        // Clear the pending videos queue after processing is complete
        pendingVideos.set(channelId, []);

        await client.chat.postMessage({
            channel: channelId,
            text: "✅ All videos have been processed! Use /videoprep again if you want to process more videos."
        });

    } catch (error) {
        console.error('Detailed error:', error);
        await client.chat.postMessage({
            channel: channelId,
            text: "Sorry, there was an error processing your videos. Error: " + error.message
        });
    }
});

// Create a basic HTTP server
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Slack bot is running!');
});

// Start the app
(async () => {
    try {
        await app.start();
        console.log('⚡️ Bolt app is running!');
        
        // Start HTTP server
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`HTTP server is running on port ${PORT}`);
        });
        
        // Log more information about the server
        console.log('Environment:', process.env.NODE_ENV);
    } catch (error) {
        console.error('Error starting app:', error);
        process.exit(1);
    }
})();