const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

function generateRandomMetadata() {
    // More varied date ranges
    const randomYear = 2018 + Math.floor(Math.random() * 7); // 2018-2024
    const randomMonth = 1 + Math.floor(Math.random() * 12);
    const randomDay = 1 + Math.floor(Math.random() * 28);
    const randomHour = Math.floor(Math.random() * 24);
    const randomMin = Math.floor(Math.random() * 60);
    const randomSec = Math.floor(Math.random() * 60);
    
    // Expanded device list with more specific naming
    const devices = [
        // Phones with specific model numbers
        { brand: "iPhone", models: ["11 Pro", "12", "13 Pro Max", "14", "15 Pro", "SE"] },
        { brand: "Samsung Galaxy", models: ["S21", "S22 Ultra", "S23", "A53", "Note 20", "Z Flip 4"] },
        { brand: "Google Pixel", models: ["6", "7 Pro", "8", "6a", "7a", "Fold"] },
        { brand: "Xiaomi", models: ["Mi 11", "Redmi Note 10", "13T Pro", "Poco F5"] },
        { brand: "OnePlus", models: ["9 Pro", "10T", "11", "Nord 3"] },
        
        // Cameras with more specific model details
        { brand: "Sony", models: ["Alpha a7 III", "Alpha a6400", "ZV-1", "RX100 VII"] },
        { brand: "Canon", models: ["EOS R6", "EOS 90D", "PowerShot G7 X", "EOS M50"] },
        { brand: "Nikon", models: ["Z6 II", "D780", "D7500", "Coolpix P1000"] },
        { brand: "GoPro", models: ["Hero 10 Black", "Hero 11", "Max"] }
    ];
    
    // Randomly select a device brand and model
    const deviceBrand = devices[Math.floor(Math.random() * devices.length)];
    const deviceModel = `${deviceBrand.brand} ${deviceBrand.models[Math.floor(Math.random() * deviceBrand.models.length)]}`;
    
    // Software/apps used for recording
    const software = [
        "Instagram", "TikTok", "Snapchat", "Camera App", "Filmic Pro", 
        "DJI Mimo", "Premiere Rush", "iMovie", "CapCut", "Adobe Premiere"
    ];
    const randomSoftware = software[Math.floor(Math.random() * software.length)];
    
    // Camera settings
    const resolutions = ["1920x1080", "3840x2160", "1280x720", "2560x1440"];
    const randomResolution = resolutions[Math.floor(Math.random() * resolutions.length)];
    
    // Random location data
    const locations = [
        "New York", "Los Angeles", "Chicago", "Miami", "London", "Paris", 
        "Tokyo", "Sydney", "Berlin", "Toronto", "Barcelona", "Seoul"
    ];
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    
    // Random GPS coordinates - not too precise to maintain some privacy
    const randomLat = (Math.random() * 180 - 90).toFixed(3);
    const randomLong = (Math.random() * 360 - 180).toFixed(3);
    
    // Look for this in videoProcessor.js and make sure it returns all values
    return {
        creation_time: `${randomYear}-${String(randomMonth).padStart(2, '0')}-${String(randomDay).padStart(2, '0')} ${String(randomHour).padStart(2, '0')}:${String(randomMin).padStart(2, '0')}:${String(randomSec).padStart(2, '0')}`,
        date: `${randomYear}-${String(randomMonth).padStart(2, '0')}-${String(randomDay).padStart(2, '0')}`,
        year: String(randomYear),
        device_model: deviceModel,
        encoder: `video_processor_${1000 + Math.floor(Math.random() * 9000)}`,
        software: randomSoftware,
        resolution: randomResolution,
        location: randomLocation,
        gps: `${randomLat}, ${randomLong}`
    };
}

async function processVideo(inputPath, outputPath, speedAdjustment, saturation, brightness, contrast, fpsAdjustment = null) {
    return new Promise((resolve, reject) => {
        // Apply limits to parameters
        speedAdjustment = Math.max(-100, Math.min(100, speedAdjustment)); // Limit -100 to 100
        saturation = Math.max(0, Math.min(2, saturation));               // Limit 0 to 2
        brightness = Math.max(-1, Math.min(1, brightness));              // Limit -1 to 1
        contrast = Math.max(0, Math.min(2, contrast));                   // Limit 0 to 2
        
        const metadata = generateRandomMetadata();
        const speedMultiplier = 1 + (speedAdjustment / 100);

        // NEW CODE: Get the original FPS first
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
            if (err) {
                console.error('Error getting video metadata:', err);
                reject(err);
                return;
            }
            
            // Find the video stream
            const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
            if (!videoStream) {
                console.error('No video stream found');
                reject(new Error('No video stream found'));
                return;
            }
            
            // Get original FPS
            let originalFps = 30; // Default fallback
            if (videoStream.r_frame_rate) {
                const [num, den] = videoStream.r_frame_rate.split('/');
                originalFps = num / den;
            }
            
            // Apply FPS adjustment with your specified limits
            let appliedFpsAdjustment = fpsAdjustment;
            if (appliedFpsAdjustment !== null) {
                // Apply limits to FPS adjustment (-10 to 10)
                appliedFpsAdjustment = Math.max(-10, Math.min(10, appliedFpsAdjustment));
            } else {
                // Random value between -5 and 5 percent
                appliedFpsAdjustment = (Math.random() * 10 - 5);
            }
            
            const fpsMultiplier = 1 + (appliedFpsAdjustment / 100);
            const adjustedFps = originalFps * fpsMultiplier;
             
            console.log(`Original FPS: ${originalFps}, Adjusted FPS: ${adjustedFps}, Speed Adjustment: ${speedAdjustment}%`);
            // END OF NEW CODE FOR FPS DETECTION
            
            let command = ffmpeg(inputPath);

            // Resource constraints
            command
                .outputOptions([
                    '-threads 4',
                    '-preset ultrafast',
                    '-max_muxing_queue_size 1024',
                    `-r ${adjustedFps}` // NEW CODE: Set the output frame rate
                ]);

            // Video and audio filters
            command
                .videoFilters([
                    {
                        filter: 'setpts',
                        options: `${1/speedMultiplier}*PTS`
                    },
                    {
                        filter: 'eq',
                        options: `saturation=${saturation}:brightness=${brightness}:contrast=${contrast}`
                    },
                    // Add invisible mesh overlay - subtle grid pattern that's imperceptible
                    {
                        filter: 'drawgrid',
                        options: `width=10:height=10:thickness=1:color=0x00000001`  // Nearly invisible grid
                    }
                ])
                .audioFilters([
                    {
                        filter: 'atempo',
                        options: [speedMultiplier]
                    }
                ]);

            // Add metadata correctly
            command
            .addOutputOption('-metadata', `date=${metadata.date}`)
            .addOutputOption('-metadata', `year=${metadata.year}`)
            .addOutputOption('-metadata', `device_model=${metadata.device_model}`)
            .addOutputOption('-metadata', `encoder=${metadata.encoder}`)
            // Add new metadata fields
            .addOutputOption('-metadata', `software=${metadata.software}`)
            .addOutputOption('-metadata', `resolution=${metadata.resolution}`)
            .addOutputOption('-metadata', `location=${metadata.location}`)
            .addOutputOption('-metadata', `gps=${metadata.gps}`);
            
            // Quality and optimization settings
            command
                .outputOptions([
                    '-crf 28',
                    '-movflags +faststart'
                ]);

            // Event handlers
            command.on('start', (commandLine) => {
                console.log('FFmpeg command:', commandLine);
            });

            command.on('progress', (progress) => {
                if (progress.percent) {
                    console.log(`Processing: ${Math.round(progress.percent)}% done`);
                }
            });

            command.on('error', (err, stdout, stderr) => {
                console.error('FFmpeg error:', err);
                if (stderr) console.error('FFmpeg stderr:', stderr);
                reject(err);
            });

            command.on('end', () => {
                console.log('FFmpeg processing finished');
                resolve(outputPath);
            });

            // Start processing
            command.save(outputPath);
        }); // NEW CODE: Close the ffprobe callback
    });
}

module.exports = { processVideo };