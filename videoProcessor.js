const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

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
    const randomLat = (Math.random() * 180 - 90).toFixed(4);
    const randomLong = (Math.random() * 360 - 180).toFixed(4);
    
    // More varied encoder strings
    const encoders = [
        `video_processor_${1000 + Math.floor(Math.random() * 9000)}`,
        `content_creator_${2000 + Math.floor(Math.random() * 8000)}`,
        `mediatools_${Math.floor(Math.random() * 1000)}`,
        `enc_v${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
        `H264_${500 + Math.floor(Math.random() * 500)}`
    ];
    const randomEncoder = encoders[Math.floor(Math.random() * encoders.length)];
    
    // Format the date strings with proper padding
    const dateString = `${randomYear}-${String(randomMonth).padStart(2, '0')}-${String(randomDay).padStart(2, '0')}`;
    const timeString = `${String(randomHour).padStart(2, '0')}:${String(randomMin).padStart(2, '0')}:${String(randomSec).padStart(2, '0')}`;
    
    // NEW: Audio-specific metadata
    const audioCodecs = ["AAC", "MP3", "Opus", "FLAC", "PCM", "Vorbis"];
    const audioSampleRates = ["44100", "48000", "96000", "32000", "22050"];
    const audioBitRates = ["128k", "192k", "256k", "320k", "96k"];
    const audioEquipment = [
        "Built-in Microphone", 
        "Rode NT-USB", 
        "Blue Yeti", 
        "Shure SM7B", 
        "Lavalier Mic",
        "AirPods Pro",
        "Zoom H4n",
        "Sennheiser MKE 600"
    ];
    const audioSoftware = [
        "Voice Memos", 
        "Audacity", 
        "GarageBand", 
        "Adobe Audition", 
        "Logic Pro",
        "Pro Tools",
        "FL Studio"
    ];
    
    // Select random audio metadata
    const randomAudioCodec = audioCodecs[Math.floor(Math.random() * audioCodecs.length)];
    const randomSampleRate = audioSampleRates[Math.floor(Math.random() * audioSampleRates.length)];
    const randomBitRate = audioBitRates[Math.floor(Math.random() * audioBitRates.length)];
    const randomAudioEquipment = audioEquipment[Math.floor(Math.random() * audioEquipment.length)];
    const randomAudioSoftware = audioSoftware[Math.floor(Math.random() * audioSoftware.length)];
    
    // Return metadata including new audio fields
    return {
        creation_time: `${dateString} ${timeString}`,
        date: dateString,
        year: String(randomYear),
        device_model: deviceModel,
        encoder: randomEncoder,
        software: randomSoftware,
        resolution: randomResolution,
        location: randomLocation,
        gps: `${randomLat}, ${randomLong}`,
        audio_codec: randomAudioCodec,
        audio_sample_rate: randomSampleRate,
        audio_bit_rate: randomBitRate,
        audio_equipment: randomAudioEquipment,
        audio_software: randomAudioSoftware
    };
}

async function processVideo(inputPath, outputPath, speedAdjustment, saturation, brightness, contrast, fpsAdjustment = null, 
    // New audio parameters
    reverbLevel = null, 
    delayLevel = null, 
    pitchShift = null,
    distortion = null,
    noiseReduction = null,
    eqLowLevel = null,
    eqMidLevel = null,
    eqHighLevel = null,
    compression = null,
    deEssing = null) {
    
    return new Promise((resolve, reject) => {
        // Apply limits to parameters
        speedAdjustment = Math.max(-100, Math.min(100, speedAdjustment)); // Limit -100 to 100
        saturation = Math.max(0, Math.min(2, saturation));               // Limit 0 to 2
        brightness = Math.max(-1, Math.min(1, brightness));              // Limit -1 to 1
        contrast = Math.max(0, Math.min(2, contrast));                   // Limit 0 to 2
        
        // Apply limits to audio parameters
        reverbLevel = reverbLevel !== null ? Math.max(0, Math.min(100, reverbLevel)) : null; // 0-100%
        delayLevel = delayLevel !== null ? Math.max(0, Math.min(90, delayLevel)) : null; // 0-90%
        pitchShift = pitchShift !== null ? Math.max(-12, Math.min(12, pitchShift)) : null; // -12 to +12 semitones
        distortion = distortion !== null ? Math.max(0, Math.min(100, distortion)) : null; // 0-100%
        noiseReduction = noiseReduction !== null ? Math.max(0, Math.min(30, noiseReduction)) : null; // 0-30dB
        eqLowLevel = eqLowLevel !== null ? Math.max(-15, Math.min(15, eqLowLevel)) : null; // -15 to +15 dB
        eqMidLevel = eqMidLevel !== null ? Math.max(-15, Math.min(15, eqMidLevel)) : null; // -15 to +15 dB
        eqHighLevel = eqHighLevel !== null ? Math.max(-15, Math.min(15, eqHighLevel)) : null; // -15 to +15 dB
        compression = compression !== null ? Math.max(0, Math.min(30, compression)) : null; // 0-30dB
        deEssing = deEssing !== null ? Math.max(0, Math.min(10, deEssing)) : null; // 0-10dB
        
        // Set random values for automatic features
        const applyWatermark = Math.random() > 0.5; // 50% chance to apply watermark
        const applyVoiceEnhancement = Math.random() > 0.5; // 50% chance to apply voice enhancement
        
        const randomMetadata = generateRandomMetadata();
        const speedMultiplier = 1 + (speedAdjustment / 100);

        // NEW CODE: Get the original FPS first
        ffmpeg.ffprobe(inputPath, (err, metadata) => { // This metadata is from ffprobe, different variable
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
                    `-r ${adjustedFps}`, // Set the output frame rate
                    '-crf 28',          // Quality setting
                    '-movflags +faststart' // Optimize for streaming
                ]);

            // Apply video filters
            command.videoFilters([
                {
                    filter: 'setpts',
                    options: `${1/speedMultiplier}*PTS` // Speed adjustment for video
                },
                {
                    filter: 'eq',
                    options: `saturation=${saturation}:brightness=${brightness}:contrast=${contrast}`
                },
                // Add invisible mesh overlay - subtle grid pattern that's imperceptible
                {
                    filter: 'drawgrid',
                    options: `width=10:height=10:thickness=1:color=0x00000001` // Nearly invisible grid
                }
            ]);

            // Create a clean array of audio filters with proper ordering
            const audioFilters = [];
            
            // 1. FIRST: Basic cleanup and EQ
            
            // Noise reduction if needed
            if (noiseReduction !== null && noiseReduction > 0) {
                audioFilters.push({
                    filter: 'highpass',
                    options: [`f=${100 + noiseReduction * 10}`]
                });
            }
            
            // Voice enhancement (simplified to avoid filter chain complexity)
            if (applyVoiceEnhancement) {
                audioFilters.push({
                    filter: 'equalizer',
                    options: ['f=2500:width_type=h:width=1000:g=2'] // Enhance voice clarity
                });
            }
            
            // Apply EQ only if non-zero values provided
            if (eqLowLevel !== null && eqLowLevel !== 0) {
                audioFilters.push({
                    filter: 'equalizer',
                    options: [`f=100:width_type=o:width=2:g=${eqLowLevel}`] // Low frequencies
                });
            }
            
            if (eqMidLevel !== null && eqMidLevel !== 0) {
                audioFilters.push({
                    filter: 'equalizer',
                    options: [`f=1000:width_type=o:width=2:g=${eqMidLevel}`] // Mid frequencies
                });
            }
            
            if (eqHighLevel !== null && eqHighLevel !== 0) {
                audioFilters.push({
                    filter: 'equalizer',
                    options: [`f=10000:width_type=o:width=2:g=${eqHighLevel}`] // High frequencies
                });
            }
            
            // De-essing only if needed
            if (deEssing !== null && deEssing > 0) {
                audioFilters.push({
                    filter: 'bandreject',
                    options: [`f=6000:width_type=h:width=${500 + deEssing * 300}`]
                });
            }
            
            // 2. SECOND: Dynamic processing
            
            // Distortion/saturation
            if (distortion !== null && distortion > 0) {
                const amount = distortion / 100;
                const samples = Math.max(1, Math.min(250, 250 - (amount * 200)));
                const bits = Math.max(1, 8 - (amount * 4)); // Ensure bits is at least 1
                audioFilters.push({
                    filter: 'acrusher', 
                    options: [`samples=${Math.floor(samples)}:bits=${bits}:mode=log`]
                });
            }
            
            // Compression/limiting
            if (compression !== null && compression > 0) {
                const threshold = Math.max(0.001, Math.min(1, 1 - (compression / 30)));
                audioFilters.push({
                    filter: 'acompressor',
                    options: [`threshold=${threshold}:ratio=${3 + compression/10}:attack=20:release=100`]
                });
            }
            
            // 3. THIRD: Creative effects
            
            // Apply only ONE echo effect - either reverb or delay, whichever is stronger
            if (reverbLevel !== null && reverbLevel > 0 && 
                (delayLevel === null || reverbLevel >= delayLevel)) {
                audioFilters.push({
                    filter: 'aecho',
                    options: [`0.8:0.9:${reverbLevel * 10}:0.5`] // Reverb effect
                });
            } else if (delayLevel !== null && delayLevel > 0) {
                audioFilters.push({
                    filter: 'aecho',
                    options: [`0.6:0.3:${delayLevel * 30}:0.5`] // Delay/echo effect
                });
            }
            
            // Watermark if selected (using tremolo for compatibility)
            if (applyWatermark) {
                audioFilters.push({
                    filter: 'tremolo',
                    options: [`f=${10 + Math.random() * 5}:d=0.01`] // Very subtle tremolo
                });
            }
            
            // 4. LAST: Pitch shifting and speed adjustment
            
            // Pitch shifting
            if (pitchShift !== null && pitchShift !== 0) {
                // Simpler pitch shift with fixed sample rate
                const pitchFactor = Math.pow(2, pitchShift/12);
                audioFilters.push({
                    filter: 'asetrate',
                    options: [`44100*${pitchFactor}`]
                });
                audioFilters.push({
                    filter: 'aresample',
                    options: ['44100']
                });
            }
            
            // Speed adjustment - limited to 2 chained filters maximum
            if (speedMultiplier !== 1.0) {
                if (speedMultiplier <= 0.5) {
                    // Extreme slowdown (max 2 filters)
                    audioFilters.push({ filter: 'atempo', options: ['0.5'] });
                    if (speedMultiplier <= 0.25) {
                        audioFilters.push({ 
                            filter: 'atempo', 
                            options: [Math.max(0.5, speedMultiplier / 0.5)] 
                        });
                    }
                } else if (speedMultiplier >= 2.0) {
                    // Extreme speedup (max 2 filters)
                    audioFilters.push({ filter: 'atempo', options: ['2.0'] });
                    if (speedMultiplier >= 4.0) {
                        audioFilters.push({ 
                            filter: 'atempo', 
                            options: [Math.min(2.0, speedMultiplier / 2.0)] 
                        });
                    }
                } else {
                    // Normal range
                    audioFilters.push({
                        filter: 'atempo',
                        options: [speedMultiplier]
                    });
                }
            }
            
            // Apply the audio filters
            if (audioFilters.length > 0) {
                command.audioFilters(audioFilters);
            }
            
            // Add metadata
            command
                .addOutputOption('-metadata', `date=${randomMetadata.date}`)
                .addOutputOption('-metadata', `year=${randomMetadata.year}`)
                .addOutputOption('-metadata', `device_model=${randomMetadata.device_model}`)
                .addOutputOption('-metadata', `encoder=${randomMetadata.encoder}`)
                .addOutputOption('-metadata', `software=${randomMetadata.software}`)
                .addOutputOption('-metadata', `resolution=${randomMetadata.resolution}`)
                .addOutputOption('-metadata', `location=${randomMetadata.location}`)
                .addOutputOption('-metadata', `gps=${randomMetadata.gps}`)
                .addOutputOption('-metadata', `audio_codec=${randomMetadata.audio_codec}`)
                .addOutputOption('-metadata', `audio_sample_rate=${randomMetadata.audio_sample_rate}`)
                .addOutputOption('-metadata', `audio_bit_rate=${randomMetadata.audio_bit_rate}`)
                .addOutputOption('-metadata', `audio_equipment=${randomMetadata.audio_equipment}`)
                .addOutputOption('-metadata', `audio_software=${randomMetadata.audio_software}`);
            
            // Event handlers for monitoring
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
                
                if (stderr) {
                    console.error('FFmpeg stderr output:');
                    console.error(stderr);
                    
                    if (stderr.includes('Error reinitializing filters')) {
                        console.error('Filter error detected. This might be due to incompatible filter combinations or invalid parameters.');
                    }
                    
                    if (stderr.includes('Invalid argument')) {
                        console.error('Invalid argument error detected. Check filter parameter ranges.');
                    }
                }
                
                const enhancedError = new Error(`FFmpeg processing failed: ${err.message || 'Unknown error'}`);
                enhancedError.originalError = err;
                enhancedError.stderr = stderr;
                
                reject(enhancedError);
            });

            command.on('end', () => {
                console.log('FFmpeg processing finished');
                resolve(outputPath);
            });

            // Start the processing
            command.save(outputPath);
        }); // NEW CODE: Close the ffprobe callback
    });
}

// New function to apply rehash effects (similar to fresh_rehash_v2.py)
async function applyRehash(inputPath, outputPath, overlaysFolder) {
    return new Promise((resolve, reject) => {
        // Generate random ID similar to Python version
        const randomId = Math.floor(Math.random() * 1000);
        const basename = path.basename(inputPath);
        const name = path.basename(basename, path.extname(basename));
        
        // If output path is not specified, create one with the random ID
        if (!outputPath) {
            const ext = path.extname(basename);
            outputPath = path.join(path.dirname(inputPath), `${name}_fresh_edit_${randomId}${ext}`);
        }
        
        console.log(`\n🎬 Processing rehash: ${basename}`);
        
        // 1. First, extract frames from a section of the video
        const tempDir = path.join(path.dirname(inputPath), `.temp_${randomId}`);
        fs.mkdirSync(tempDir, { recursive: true });
        
        // Get video info to determine frame count and framerates
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
            if (err) {
                console.error('Error getting video metadata:', err);
                // Clean up temp directory
                fs.rmdirSync(tempDir, { recursive: true });
                reject(err);
                return;
            }
            
            // Find the video stream
            const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
            if (!videoStream) {
                console.error('No video stream found');
                fs.rmdirSync(tempDir, { recursive: true });
                reject(new Error('No video stream found'));
                return;
            }
            
            // Get original FPS and duration
            let fps = 30; // Default fallback
            if (videoStream.r_frame_rate) {
                const [num, den] = videoStream.r_frame_rate.split('/');
                fps = num / den;
            }
            
            const duration = parseFloat(videoStream.duration) || 
                             parseFloat(metadata.format.duration) || 10;
            
            // Calculate total frames
            const totalFrames = Math.floor(duration * fps);
            
            // Extract frames from middle section (10% margin from start/end like Python script)
            const margin = Math.floor(0.1 * totalFrames);
            const startFrame = margin;
            const endFrame = totalFrames - margin;
            
            // Only extract a section of frames in the middle (where we'll swap some)
            const frameCount = Math.min(20, endFrame - startFrame); // Get enough frames to work with
            const extractStart = startFrame + Math.floor((endFrame - startFrame - frameCount) / 2);
            
            // Extract frames to temp directory
            console.log(`🔄 Extracting ${frameCount} frames from central section...`);
            
            ffmpeg(inputPath)
                .outputOptions([
                    `-vf select='between(n,${extractStart},${extractStart + frameCount - 1})'`,
                    '-vsync 0'
                ])
                .output(path.join(tempDir, 'frame_%04d.png'))
                .on('error', (err) => {
                    console.error('Error extracting frames:', err);
                    fs.rmdirSync(tempDir, { recursive: true });
                    reject(err);
                })
                .on('end', () => {
                    console.log('✅ Frames extracted successfully');
                    
                    // 2. Swap some frames (similar to Python version)
                    const swapCount = Math.floor(Math.random() * 3) + 3; // 3-5 swaps
                    
                    // Get list of extracted frames
                    const frameFiles = fs.readdirSync(tempDir)
                        .filter(f => f.startsWith('frame_') && f.endsWith('.png'))
                        .sort();
                    
                    if (frameFiles.length < 4) {
                        console.error('Not enough frames extracted for swapping');
                        fs.rmdirSync(tempDir, { recursive: true });
                        reject(new Error('Not enough frames extracted'));
                        return;
                    }
                    
                    console.log(`🔀 Swapping ${swapCount} pairs of frames...`);
                    
                    // Perform the swaps
                    for (let i = 0; i < swapCount; i++) {
                        // Select random adjacent frames (avoiding first and last)
                        const idx = Math.floor(Math.random() * (frameFiles.length - 3)) + 1;
                        
                        // Swap the files by renaming them with temporary names
                        const tempName1 = `temp1_${i}_${frameFiles[idx]}`;
                        const tempName2 = `temp2_${i}_${frameFiles[idx+1]}`;
                        
                        fs.renameSync(
                            path.join(tempDir, frameFiles[idx]), 
                            path.join(tempDir, tempName1)
                        );
                        fs.renameSync(
                            path.join(tempDir, frameFiles[idx+1]), 
                            path.join(tempDir, tempName2)
                        );
                        
                        // Swap them back with opposite names
                        fs.renameSync(
                            path.join(tempDir, tempName1),
                            path.join(tempDir, frameFiles[idx+1])
                        );
                        fs.renameSync(
                            path.join(tempDir, tempName2),
                            path.join(tempDir, frameFiles[idx])
                        );
                    }
                    
                    // 3. Check for overlays - but make them OPTIONAL
                    let useOverlay = false;
                    let overlayPath = null;
                    
                    // Only attempt to use overlays if the folder exists and contains valid files
                    if (overlaysFolder && fs.existsSync(overlaysFolder)) {
                        try {
                            const overlayFiles = fs.readdirSync(overlaysFolder)
                                .filter(f => f.toLowerCase().endsWith('.mp4') || f.toLowerCase().endsWith('.webm'));
                                
                            if (overlayFiles.length > 0) {
                                const chosenOverlay = overlayFiles[Math.floor(Math.random() * overlayFiles.length)];
                                overlayPath = path.join(overlaysFolder, chosenOverlay);
                                
                                // Only use overlay if the file actually exists
                                if (fs.existsSync(overlayPath)) {
                                    useOverlay = true;
                                    console.log(`📼 Overlay used: ${chosenOverlay}`);
                                }
                            }
                        } catch (err) {
                            // If we can't access overlays folder, just continue without overlay
                            console.log('⚠️ Could not access overlays folder, continuing without overlay');
                        }
                    } else {
                        console.log('⚠️ No overlays folder found or it\'s empty, continuing without overlay');
                    }
                    
                    // 4. Prepare audio pitch adjustment
                    const pitchFactor = (1 + (Math.random() * 0.01) + 0.005).toFixed(5); // 1.005 to 1.015
                    
                    // Create filter for reinserting modified frames
                    // First we need to figure out which frame number corresponds to the source
                    const frameRegex = /frame_(\d+)\.png/;
                    const frameNumbers = frameFiles.map(f => {
                        const match = f.match(frameRegex);
                        return match ? parseInt(match[1]) : 0;
                    });
                    
                    const minFrameNum = Math.min(...frameNumbers);
                    
                    // Recombine video with the modified frames
                    console.log(`🔄 Recombining video with modified frames and pitch factor ${pitchFactor}...`);
                    
                    // Create final command
                    let command = ffmpeg(inputPath);
                    
                    // Add overlay input if available and should be used
                    if (useOverlay && overlayPath) {
                        command = command.input(overlayPath);
                    }
                    
                    // Add each modified frame as input
                    frameFiles.forEach(frame => {
                        command = command.input(path.join(tempDir, frame));
                    });
                    
                    // Design complex filter based on whether overlay is available
                    if (useOverlay && overlayPath) {
                        // With overlay
                        command
                            .complexFilter([
                                `[0:v]split=2[mainvid][extractsec];` +
                                `[extractsec]trim=start_frame=${extractStart}:end_frame=${extractStart + frameCount},setpts=PTS-STARTPTS[extract];` +
                                // Replace extracted section with modified frames
                                `[2:v][3:v][4:v][5:v][6:v][7:v][8:v][9:v][10:v][11:v][12:v][13:v][14:v][15:v][16:v][17:v][18:v][19:v][20:v][21:v]` +
                                `concat=n=${frameCount}:v=1:a=0[modified];` +
                                // Cut main video into three parts and insert modified section
                                `[mainvid]trim=0:${extractStart/fps},setpts=PTS-STARTPTS[part1];` +
                                `[mainvid]trim=start_frame=${extractStart + frameCount}:end_frame=${totalFrames},setpts=PTS-STARTPTS[part3];` +
                                `[part1][modified][part3]concat=n=3:v=1:a=0[newvid];` +
                                // Apply overlay
                                `[newvid][1:v]overlay=format=auto:alpha=0.3[finalvid]`
                            ], 'finalvid')
                            .map('finalvid')
                            .map('0:a');
                    } else {
                        // Without overlay, just do frame replacement
                        command
                            .complexFilter([
                                `[0:v]split=2[mainvid][extractsec];` +
                                `[extractsec]trim=start_frame=${extractStart}:end_frame=${extractStart + frameCount},setpts=PTS-STARTPTS[extract];` +
                                // Replace extracted section with modified frames
                                `[2:v][3:v][4:v][5:v][6:v][7:v][8:v][9:v][10:v][11:v][12:v][13:v][14:v][15:v][16:v][17:v][18:v][19:v][20:v][21:v]` +
                                `concat=n=${frameCount}:v=1:a=0[modified];` +
                                // Cut main video into three parts and insert modified section
                                `[mainvid]trim=0:${extractStart/fps},setpts=PTS-STARTPTS[part1];` +
                                `[mainvid]trim=start_frame=${extractStart + frameCount}:end_frame=${totalFrames},setpts=PTS-STARTPTS[part3];` +
                                `[part1][modified][part3]concat=n=3:v=1:a=0[finalvid]`
                            ], 'finalvid')
                            .map('finalvid')
                            .map('0:a');
                    }
                    
                    // Apply audio pitch adjustment
                    command.audioFilters([
                        {
                            filter: 'asetrate',
                            options: [`48000*${pitchFactor}`]
                        },
                        {
                            filter: 'aresample',
                            options: ['48000'] 
                        }
                    ]);
                    
                    // Set output options
                    command
                        .outputOptions([
                            '-c:v', 'libx264',
                            '-c:a', 'aac',
                            '-b:v', '2000k',
                            '-preset', 'fast',
                            '-movflags', '+faststart'
                        ]);
                        
                    // Add random metadata similar to Python version
                    const randomMetadata = generateRandomMetadata();
                    command
                        .addOutputOption('-metadata', `title=${name}_fresh_edit_${randomId}`)
                        .addOutputOption('-metadata', `comment=Processed with stealth rehash script`)
                        .addOutputOption('-metadata', `date=${randomMetadata.date}`)
                        .addOutputOption('-metadata', `software=${randomMetadata.software}`);
                    
                    // Process and save the output
                    command
                        .on('start', (cmdline) => {
                            console.log(`🚀 FFmpeg command: ${cmdline}`);
                        })
                        .on('progress', (progress) => {
                            if (progress.percent) {
                                console.log(`⏳ Rehashing progress: ${Math.round(progress.percent)}%`);
                            }
                        })
                        .on('error', (err, stdout, stderr) => {
                            console.error('❌ FFmpeg rehash error:', err);
                            if (stderr) console.error(stderr);
                            
                            // Clean up temp directory
                            try {
                                fs.rmdirSync(tempDir, { recursive: true });
                            } catch (cleanupErr) {
                                console.error('Error cleaning up temp directory:', cleanupErr);
                            }
                            reject(err);
                        })
                        .on('end', () => {
                            console.log('✅ Video rehash completed successfully');
                            
                            // Clean up temp directory
                            try {
                                fs.rmdirSync(tempDir, { recursive: true });
                            } catch (cleanupErr) {
                                console.error('Error cleaning up temp directory:', cleanupErr);
                            }
                            resolve(outputPath);
                        })
                        .save(outputPath);
                });
        });
    });
}

// Export both functions
module.exports = { processVideo, applyRehash };