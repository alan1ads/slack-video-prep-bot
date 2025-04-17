const { App } = require('@slack/bolt');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { 
    processVideo, 
    applyRehash, 
    applyTextOverlay, 
    applyEmojiImageOverlay 
} = require('./videoProcessor');
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
            },
            timeout: 30000 // Add a timeout to prevent hanging downloads
        };

        const request = https.get(url, options, response => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download file: ${response.statusCode}`));
                return;
            }

            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                
                // Verify the file was downloaded correctly
                const fileStats = fs.statSync(outputPath);
                if (fileStats.size === 0) {
                    console.error('Downloaded file is empty');
                    reject(new Error('Downloaded file is empty'));
                    return;
                }
                
                console.log('File downloaded successfully to:', outputPath);
                console.log('File size:', Math.round(fileStats.size / 1024), 'KB');
                resolve(outputPath);
            });

            fileStream.on('error', (err) => {
                fs.unlink(outputPath, () => {}); // Delete the file if there's an error
                reject(err);
            });
        });
        
        request.on('error', (err) => {
            fs.unlink(outputPath, () => {}); // Delete the file if there's an error
            reject(err);
        });
        
        // Add a timeout handler
        request.on('timeout', () => {
            request.abort();
            reject(new Error('Download request timed out'));
        });
    });
}

// Fix the slash command to not clear existing videos and add a debug counter
let globalVideoCount = 0; // For tracking total videos ever added

app.command('/videoprep', async ({ command, ack, client }) => {
    try {
        await ack();
        
        // Log the channel ID for debugging
        console.log(`Command triggered in channel: ${command.channel_id}`);
        
        // Instead, ensure the channel exists in the map without clearing
        if (!pendingVideos.has(command.channel_id)) {
            pendingVideos.set(command.channel_id, []);
        }
        
        // Get current video count
        const currentVideos = pendingVideos.get(command.channel_id) || [];
        console.log(`Channel ${command.channel_id} has ${currentVideos.length} videos in queue`);

        await client.chat.postMessage({
            channel: command.channel_id,
            text: `Upload your videos to this channel. When you're done uploading, click 'Process Videos' to modify them all at once. ${currentVideos.length > 0 ? `(${currentVideos.length} videos already in queue)` : ''}`,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*Upload Multiple Videos:*\n1️⃣ Upload all your videos to this channel\n2️⃣ Click the button below when done uploading\n3️⃣ Set processing options for all videos ${currentVideos.length > 0 ? `\n\n*${currentVideos.length} videos already in queue*` : ''}`
                    }
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: currentVideos.length > 0 ? `Process Videos (${currentVideos.length})` : "Process Videos",
                                emoji: true
                            },
                            // Store the channel ID in the button metadata
                            value: command.channel_id,
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

// Modify the file_shared event handler to be more robust
app.event('file_shared', async ({ event, client }) => {
    try {
        // Log the event for debugging
        console.log(`File shared event received at ${new Date().toISOString()}. Channel ID: ${event.channel_id}, File ID: ${event.file_id}`);
        
        const result = await client.files.info({
            file: event.file_id
        });

        const file = result.file;
        
        // Skip if this is a processed video (check the filename)
        if (file.name && file.name.startsWith('Processed_')) {
            console.log('Skipping processed video:', file.name);
            return;
        }

        if (!file.mimetype || !file.mimetype.startsWith('video/')) {
            console.log(`File type not supported: ${file.mimetype}`);
            await client.chat.postMessage({
                channel: event.channel_id,
                text: "Please share only video files."
            });
            return;
        }

        // Add to pending videos with more reliable structure
        if (!event.channel_id) {
            console.error('Missing channel ID in file_shared event');
            return;
        }

        // Add to pending videos with debug info and unique ID
        globalVideoCount++;
        const videoId = `video_${globalVideoCount}_${Date.now()}`;
        
        // Create a deep copy of file object to avoid reference issues
        const fileCopy = JSON.parse(JSON.stringify(file));
        
        // Use a safer approach to get and update the videos array
        let channelVideos = pendingVideos.get(event.channel_id) || [];
        const newVideo = {
            file: fileCopy,
            file_id: event.file_id,
            added_time: new Date().toISOString(),
            unique_id: videoId
        };
        
        channelVideos.push(newVideo);
        
        // CRITICAL: Make sure to set the updated array back to the map
        pendingVideos.set(event.channel_id, channelVideos);
        
        console.log(`Added video to queue for channel ${event.channel_id}. Queue now has ${channelVideos.length} videos`);
        console.log(`Pending videos map has ${pendingVideos.size} channels`);
        console.log(`Total videos ever added: ${globalVideoCount}`);

        // Print more detailed queue info for debugging
        console.log('Video Queue Contents:');
        pendingVideos.forEach((videos, channelId) => {
            console.log(`Channel ${channelId}: ${videos.length} videos`);
            videos.forEach((vid, idx) => {
                console.log(`  Video ${idx+1}: ${vid.file?.name || 'Unknown'} (ID: ${vid.file_id}, Added: ${vid.added_time})`);
            });
        });

        await client.chat.postMessage({
            channel: event.channel_id,
            text: `Video added to queue! (${channelVideos.length} videos ready for processing)`
        });

    } catch (error) {
        console.error('Error handling file_shared event:', error);
    }
});

app.action('process_multiple_videos', async ({ ack, body, client }) => {
    await ack();
    
    // Extract the correct channel ID from multiple possible sources
    // This ensures we always get the right one regardless of context
    const channelId = body.actions[0].value || body.channel.id || body.container.channel_id;
    
    // Log ALL possible channel IDs for debugging
    console.log('==== PROCESSING VIDEOS ====');
    console.log(`Action triggered at ${new Date().toISOString()}`);
    console.log(`Action triggered with button value: ${body.actions[0].value}`);
    console.log(`Action body.channel.id: ${body.channel?.id}`);
    console.log(`Action body.container.channel_id: ${body.container?.channel_id}`);
    console.log(`Using channel ID: ${channelId}`);
    console.log(`Pending videos map has ${pendingVideos.size} channels with ${getTotalVideoCount()} total videos`);
    
    // Dump the entire map for debugging
    console.log('Full pending videos map contents:');
    pendingVideos.forEach((videos, mapChannelId) => {
        console.log(`Channel ${mapChannelId}: ${videos.length} videos ${mapChannelId === channelId ? '(MATCH)' : '(NO MATCH)'}`);
        if (videos.length > 0) {
            console.log(`  First video: ${videos[0].file?.name || 'Unknown'} (Added: ${videos[0].added_time})`);
            console.log(`  Last video: ${videos[videos.length-1].file?.name || 'Unknown'} (Added: ${videos[videos.length-1].added_time})`);
        }
    });
    
    // Safety check to ensure we don't lose videos
    // If the channel doesn't exist in the map, check if any channels have videos
    let channelVideos = pendingVideos.get(channelId) || [];
    
    if (channelVideos.length === 0) {
        console.log(`Channel ${channelId} has 0 videos - checking for misplaced videos in other channels`);
        
        // Look for the first channel with videos
        pendingVideos.forEach((videos, otherChannelId) => {
            if (videos.length > 0 && channelVideos.length === 0) {
                console.log(`Found ${videos.length} videos in channel ${otherChannelId} - using these instead`);
                channelVideos = videos;
                // Don't overwrite the original channelId - we'll use the one from the button
            }
        });
    }
    
    // Additional debugging for race conditions
    console.log(`Final video count for processing: ${channelVideos.length}`);
    
    // If we still have no videos, try the retry approach
    if (channelVideos.length === 0) {
        // Use the original check with retries
        channelVideos = await checkForVideos(channelId);
    }
    
    if (channelVideos.length === 0) {
        console.log(`No videos found after all checks for channel ${channelId}`);
        
        // Check if there are videos in other channels that might have been misplaced
        let foundInOtherChannels = false;
        let otherChannelsWithVideos = [];
        pendingVideos.forEach((videos, mapChannelId) => {
            if (mapChannelId !== channelId && videos.length > 0) {
                console.log(`Found ${videos.length} videos in channel ${mapChannelId} instead`);
                foundInOtherChannels = true;
                otherChannelsWithVideos.push({channel: mapChannelId, count: videos.length});
            }
        });
        
        // Send a more helpful message
        let message = "No videos found to process. Please upload some videos first!";
        if (foundInOtherChannels) {
            message += " (Note: There are videos in other channels that I can't access from here)";
            console.log("Videos found in other channels:", JSON.stringify(otherChannelsWithVideos));
        }
        
        await client.chat.postMessage({
            channel: channelId,
            text: message
        });
        return;
    }
    
    // Log that we found videos and proceed
    console.log(`Found ${channelVideos.length} videos to process in channel ${channelId}`);

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
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: "*Automatic Subtle Changes*\nEach video will be processed with small, random variations to make it unique but still look natural."
                        }
                    },
                    // Text Watermark - the only option we keep
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
                            text: 'Text/Emoji Watermark (Optional)'
                        },
                        optional: true
                    },
                    // Note about automatic features
                    {
                        type: 'context',
                        elements: [
                            {
                                type: 'mrkdwn',
                                text: "*What happens behind the scenes:* We'll apply subtle randomized changes to speed, color, audio effects, and metadata. These changes will be almost imperceptible but make each video unique."
                            }
                        ]
                    }
                ],
                // Store the correct channel ID in the modal's private metadata
                private_metadata: channelId
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
    
    // Get the pending videos for this channel - CRITICAL CHANGE: retrieve latest state
    let channelVideos = pendingVideos.get(channelId) || [];
    
    // Double-check video count with a fresh look at the queue
    console.log(`Modal submitted for channel ${channelId}, found ${channelVideos.length} videos in queue`);
    console.log('Current video queue state:');
    pendingVideos.forEach((videos, mapChannelId) => {
        console.log(`Channel ${mapChannelId}: ${videos.length} videos ${mapChannelId === channelId ? '(MATCH)' : ''}`);
    });
    
    // ALWAYS use randomized values for all parameters except text watermark
    // Generate extremely subtle random video adjustments
    let speedAdjustment = Math.floor(Math.random() * 5) - 2; // Range from -2% to 2%
    let saturation = 0.95 + (Math.random() * 0.1); // Range from 0.95 to 1.05
    let brightness = (Math.random() * 0.1) - 0.05; // Range from -0.05 to 0.05
    let contrast = 0.95 + (Math.random() * 0.1); // Range from 0.95 to 1.05
    let fpsAdjustment = (Math.random() * 2) - 1; // Range from -1% to 1%
    
    // Generate extremely subtle random audio adjustments
    let reverbLevel = Math.floor(Math.random() * 15); // Very subtle reverb
    let delayLevel = Math.floor(Math.random() * 10); // Very subtle delay
    let pitchShift = (Math.random() * 1) - 0.5; // Range from -0.5 to 0.5 semitones
    let distortion = Math.floor(Math.random() * 5); // Minimal distortion
    let noiseReduction = Math.floor(Math.random() * 5); // Minimal noise reduction
    let eqLowLevel = (Math.random() * 2) - 1; // Range from -1 to 1
    let eqMidLevel = (Math.random() * 2) - 1; // Range from -1 to 1
    let eqHighLevel = (Math.random() * 2) - 1; // Range from -1 to 1
    let compression = Math.floor(Math.random() * 5); // Minimal compression
    let deEssing = Math.floor(Math.random() * 2); // Minimal de-essing
    
    // Only extract text watermark (the one option we kept)
    let textWatermark = null;
    const textWatermarkInput = view.state.values.text_watermark?.text_watermark_input?.value;
    if (textWatermarkInput && textWatermarkInput.trim() !== '') {
        textWatermark = textWatermarkInput.trim();
    }
    
    // Always apply rehash as a standard part of processing
    const shouldRehash = true;
    console.log('Video rehashing is enabled by default');
    
    if (shouldRehash) {
        console.log('Video rehashing is enabled');
    }
    
    // Log the parameters being used
    console.log(`Processing parameters: Speed=${speedAdjustment}%, Saturation=${saturation.toFixed(2)}, Brightness=${brightness.toFixed(2)}, Contrast=${contrast.toFixed(2)}, FPS=${fpsAdjustment}%`);
    console.log(`Audio parameters: Reverb=${reverbLevel}, Delay=${delayLevel}, Pitch=${pitchShift.toFixed(2)}, Distortion=${distortion}, NoiseReduction=${noiseReduction}`);
    console.log(`EQ: Low=${eqLowLevel.toFixed(2)}, Mid=${eqMidLevel.toFixed(2)}, High=${eqHighLevel.toFixed(2)}, Compression=${compression}, DeEssing=${deEssing}`);
    
    // Log text watermark if present
    if (textWatermark) {
        console.log(`Text Watermark: "${textWatermark}"`);
    }

    try {
        // Make sure we have the latest videos array (could have changed since modal opened)
        channelVideos = pendingVideos.get(channelId) || [];
        const videoCount = channelVideos.length;
        
        // If we have no videos, don't even start
        if (videoCount === 0) {
            console.log("No videos in queue, aborting process");
            await client.chat.postMessage({
                channel: channelId,
                text: "No videos found to process. Please upload some videos first!"
            });
            return;
        }
        
        // Notify start of processing with the CORRECT count
        console.log(`Starting to process ${videoCount} videos for channel ${channelId}`);
        await client.chat.postMessage({
            channel: channelId,
            text: `Starting to process ${videoCount} videos... This might take a while.`
        });

        // Process videos sequentially with delay between each
        for (const videoInfo of channelVideos) {
            try {
                const inputPath = path.join(inputDir, `input_${videoInfo.file_id}.mp4`);
                const outputPath = path.join(outputDir, `output_${videoInfo.file_id}.mp4`);

                console.log('Processing video:', videoInfo.file?.name || 'Unknown');
                
                // Download
                await downloadFile(videoInfo.file.url_private_download, inputPath);
                console.log('Download completed for:', videoInfo.file?.name || 'Unknown');
                
                // Add a small delay between operations
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Process video with the new textWatermark parameter
                try {
                    // Slightly vary parameters for each video to make each one unique
                    const uniqueSpeedAdj = speedAdjustment + (Math.random() * 0.6 - 0.3); // +/- 0.3%
                    const uniqueSaturation = saturation + (Math.random() * 0.04 - 0.02); // +/- 0.02
                    const uniqueBrightness = brightness + (Math.random() * 0.02 - 0.01); // +/- 0.01
                    const uniqueContrast = contrast + (Math.random() * 0.04 - 0.02); // +/- 0.02
                    const uniqueFps = fpsAdjustment + (Math.random() * 0.4 - 0.2); // +/- 0.2%
                    
                    // First apply standard processing
                    const processedPath = await processVideo(
                        inputPath, 
                        outputPath, 
                        uniqueSpeedAdj, 
                        uniqueSaturation, 
                        uniqueBrightness, 
                        uniqueContrast, 
                        uniqueFps,
                        // Audio parameters with very minimal variations
                        reverbLevel + Math.floor(Math.random() * 3 - 1),
                        delayLevel + Math.floor(Math.random() * 3 - 1),
                        pitchShift + (Math.random() * 0.2 - 0.1),
                        distortion + Math.floor(Math.random() * 2 - 1),
                        noiseReduction + Math.floor(Math.random() * 2 - 1),
                        eqLowLevel + (Math.random() * 0.4 - 0.2),
                        eqMidLevel + (Math.random() * 0.4 - 0.2),
                        eqHighLevel + (Math.random() * 0.4 - 0.2),
                        compression + Math.floor(Math.random() * 2 - 1),
                        deEssing,  // Keep de-essing as is, it's already minimal
                        // Text watermark parameter - kept as is
                        textWatermark
                    );
                    console.log('Processing completed for:', videoInfo.file?.name || 'Unknown');
                    
                    // Always apply rehash as a standard part of processing
                    console.log('Applying rehash data refresh to:', videoInfo.file?.name || 'Unknown');
                    const rehashOutputPath = path.join(outputDir, `rehash_${videoInfo.file_id}.mp4`);
                    
                    // Use the actual processed path that came back from processVideo
                    // This could be different if a watermark was applied
                    const actualInputPath = processedPath || outputPath;
                    
                    // Check if input path exists
                    if (!fs.existsSync(actualInputPath)) {
                        console.error(`Input file for rehash doesn't exist: ${actualInputPath}`);
                        throw new Error('Processed video file not found');
                    }
                    
                    // Pass the text watermark to the rehash function as well
                    await applyRehash(actualInputPath, rehashOutputPath, overlaysDir, textWatermark);
                    
                    // Replace the output path with the rehashed version
                    if (fs.existsSync(actualInputPath) && actualInputPath !== outputPath) {
                        fs.unlinkSync(actualInputPath);
                    }
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                    
                    // Rename the rehashed output to the standard output path for upload
                    fs.renameSync(rehashOutputPath, outputPath);
                    console.log('Rehash completed for:', videoInfo.file?.name || 'Unknown');

                    // Upload
                    await client.files.uploadV2({
                        channel_id: channelId,
                        file: fs.createReadStream(outputPath),
                        filename: `Processed_${videoInfo.file?.name || 'video.mp4'}`,
                        title: `Processed_${videoInfo.file?.name || 'video.mp4'}`
                    });
                    console.log('Upload completed for:', videoInfo.file?.name || 'Unknown');

                    await client.chat.postMessage({
                        channel: channelId,
                        text: `✅ Processed: ${videoInfo.file?.name || 'Unknown video'}`
                    });
                } catch (processError) {
                    console.error(`Error processing video: ${processError.message}`);
                    await client.chat.postMessage({
                        channel: channelId,
                        text: `⚠️ Warning: ${videoInfo.file?.name || 'A video'} was too large to process. Try a smaller video.`
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
                    text: `❌ Error processing video ${videoInfo.file?.name || 'Unknown'}: ${error.message}`
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

// Helper function to get total video count
function getTotalVideoCount() {
    let count = 0;
    pendingVideos.forEach(videos => {
        count += videos.length;
    });
    return count;
}

// Improve the checkForVideos function with even better debugging
async function checkForVideos(channelId, attempts = 0) {
    let channelVideos = pendingVideos.get(channelId) || [];
    
    // More detailed debugging on each attempt
    console.log(`Checking for videos - attempt ${attempts + 1}. Found: ${channelVideos.length} videos for channel ${channelId}`);
    console.log(`Current map status: ${pendingVideos.size} channels, ${getTotalVideoCount()} total videos`);
    
    if (channelVideos.length === 0 && attempts < 5) {
        // If no videos found on first try, wait a moment and try again
        console.log(`No videos found for channel ${channelId}, waiting for retrieval...`);
        
        // Only send a message on the first attempt
        if (attempts === 0) {
            // Skip the message to reduce noise
        }
        
        // Longer delay between attempts (3 seconds × attempt number)
        const delayTime = 3000 * (attempts + 1);
        console.log(`Waiting ${delayTime}ms before retry ${attempts + 1}...`);
        await new Promise(resolve => setTimeout(resolve, delayTime));
        
        // Reprint the entire map for debuggin - sometimes videos appear during the wait
        console.log('Map contents after delay:');
        pendingVideos.forEach((videos, mapChannelId) => {
            console.log(`Channel ${mapChannelId}: ${videos.length} videos`);
        });
        
        // Refresh the channel videos
        channelVideos = pendingVideos.get(channelId) || [];
        console.log(`After delay: found ${channelVideos.length} videos for channel ${channelId}`);
        
        // If still no videos, retry
        if (channelVideos.length === 0) {
            return checkForVideos(channelId, attempts + 1);
        }
    }
    
    return channelVideos;
}