const { App } = require('@slack/bolt');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { processVideo } = require('./videoProcessor');
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

// Create temp directories with error handling
try {
    fs.mkdirSync(inputDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
    console.log('Temp directories created/verified:');
    console.log('Input directory:', inputDir);
    console.log('Output directory:', outputDir);
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

// Handle "Process Videos" button click
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
                        }
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
                        }
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
                        }
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
                        }
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

    const channelId = view.private_metadata;
    const channelVideos = pendingVideos.get(channelId) || [];
    
    if (channelVideos.length === 0) {
        console.error('No videos found to process');
        return;
    }

    const speedAdjustment = parseFloat(view.state.values.speed_adjustment.speed_input.value);
    const saturation = parseFloat(view.state.values.saturation_adjustment.saturation_input.value);
    const brightness = parseFloat(view.state.values.brightness_adjustment.brightness_input.value);
    const contrast = parseFloat(view.state.values.contrast_adjustment.contrast_input.value);

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

                // Process
                try {
                    await processVideo(inputPath, outputPath, speedAdjustment, saturation, brightness, contrast);
                    console.log('Processing completed for:', videoInfo.file.name);

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