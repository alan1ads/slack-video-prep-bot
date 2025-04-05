const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const { execSync } = require('child_process');

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
    deEssing = null,
    // New text watermark parameter
    textWatermark = null) {
    
    return new Promise((resolve, reject) => {
        // Timeout for cloud environment - kill process if it takes too long
        const timeoutId = setTimeout(() => {
            console.error('Video processing timeout - killing process to prevent hanging');
            command.kill('SIGKILL');
            reject(new Error('Processing timeout - process terminated'));
        }, 10 * 60 * 1000); // 10-minute timeout
        
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
        // Cloud-optimized: Reduce random features to improve reliability
        const applyWatermark = Math.random() > 0.7; // 30% chance to apply watermark
        const applyVoiceEnhancement = Math.random() > 0.7; // 30% chance to apply voice enhancement
        
        const randomMetadata = generateRandomMetadata();
        const speedMultiplier = 1 + (speedAdjustment / 100);

        // Create command first to allow timeout to work properly
        let command = ffmpeg(inputPath);

        // NEW CODE: Get the original FPS first
        ffmpeg.ffprobe(inputPath, (err, metadata) => { // This metadata is from ffprobe, different variable
            if (err) {
                console.error('Error getting video metadata:', err);
                clearTimeout(timeoutId);
                reject(err);
                return;
            }
            
            // Find the video stream
            const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
            if (!videoStream) {
                console.error('No video stream found');
                clearTimeout(timeoutId);
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
            
            // Resource constraints - CLOUD OPTIMIZED
            command
                .outputOptions([
                    '-threads 2',                   // Reduced thread count for better stability
                    '-preset ultrafast',           // Fastest encoding
                    '-max_muxing_queue_size 1024', 
                    `-r ${adjustedFps}`,           // Set the output frame rate
                    '-crf 30',                     // Slightly reduced quality for better performance
                    '-movflags +faststart',        // Optimize for streaming
                    '-tune fastdecode'             // Optimize for decoding speed
                ]);

            // Get video dimensions for positioning the text watermark
            const width = videoStream.width || 1920;
            const height = videoStream.height || 1080;
            
            // CLOUD OPTIMIZED: Simplify video filters for better reliability
            let videoFilters = [
                {
                    filter: 'setpts',
                    options: `${1/speedMultiplier}*PTS` // Speed adjustment for video
                },
                {
                    filter: 'eq',
                    options: `saturation=${saturation}:brightness=${brightness}:contrast=${contrast}`
                }
            ];
            
            // Only add grid if system has enough resources (check video size)
            if (width * height <= 1920 * 1080) { // Only for 1080p or smaller
                videoFilters.push({
                    filter: 'drawgrid',
                    options: `width=10:height=10:thickness=1:color=0x00000001` // Nearly invisible grid
                });
            }
            
            // Note about emoji watermark
            if (textWatermark) {
                console.log(`Emoji watermark will be added as a separate step after main processing`);
            }
            
            // Apply video filters (only if we didn't use complex filter)
            command.videoFilters(videoFilters);

            // Create a clean array of audio filters with proper ordering
            const audioFilters = [];
            
            // CLOUD OPTIMIZED: Prioritize most important filters, limit total number
            // Count how many filters we've added to avoid overloading
            let filterCount = 0;
            const MAX_FILTERS = 6; // Limit total number of audio filters
            
            // 1. FIRST: Most essential adjustments - speed and pitch
            
            // Speed adjustment - limited to 2 chained filters maximum
            if (speedMultiplier !== 1.0 && filterCount < MAX_FILTERS) {
                filterCount++;
                if (speedMultiplier <= 0.5) {
                    // Extreme slowdown (max 2 filters)
                    audioFilters.push({ filter: 'atempo', options: ['0.5'] });
                    if (speedMultiplier <= 0.25 && filterCount < MAX_FILTERS) {
                        filterCount++;
                        audioFilters.push({ 
                            filter: 'atempo', 
                            options: [Math.max(0.5, speedMultiplier / 0.5)] 
                        });
                    }
                } else if (speedMultiplier >= 2.0) {
                    // Extreme speedup (max 2 filters)
                    audioFilters.push({ filter: 'atempo', options: ['2.0'] });
                    if (speedMultiplier >= 4.0 && filterCount < MAX_FILTERS) {
                        filterCount++;
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
            
            // Pitch shifting
            if (pitchShift !== null && pitchShift !== 0 && filterCount < MAX_FILTERS) {
                filterCount += 2; // This uses 2 filters
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
            
            // 2. SECOND: Creative effects (if filter limit allows)
            
            // Apply only ONE echo effect - either reverb or delay, whichever is stronger
            if (filterCount < MAX_FILTERS && 
                ((reverbLevel !== null && reverbLevel > 0 && 
                  (delayLevel === null || reverbLevel >= delayLevel)))) {
                filterCount++;
                audioFilters.push({
                    filter: 'aecho',
                    options: [`0.8:0.9:${reverbLevel * 10}:0.5`] // Reverb effect
                });
            } else if (filterCount < MAX_FILTERS && 
                      (delayLevel !== null && delayLevel > 0)) {
                filterCount++;
                audioFilters.push({
                    filter: 'aecho',
                    options: [`0.6:0.3:${delayLevel * 30}:0.5`] // Delay/echo effect
                });
            }
            
            // 3. THIRD: EQ and cleanup (only if filter slots available)
            
            // Apply EQ only if non-zero values provided and we have room for filters
            if (eqLowLevel !== null && eqLowLevel !== 0 && filterCount < MAX_FILTERS) {
                filterCount++;
                audioFilters.push({
                    filter: 'equalizer',
                    options: [`f=100:width_type=o:width=2:g=${eqLowLevel}`] // Low frequencies
                });
            }
            
            if (eqMidLevel !== null && eqMidLevel !== 0 && filterCount < MAX_FILTERS) {
                filterCount++;
                audioFilters.push({
                    filter: 'equalizer',
                    options: [`f=1000:width_type=o:width=2:g=${eqMidLevel}`] // Mid frequencies
                });
            }
            
            if (eqHighLevel !== null && eqHighLevel !== 0 && filterCount < MAX_FILTERS) {
                filterCount++;
                audioFilters.push({
                    filter: 'equalizer',
                    options: [`f=10000:width_type=o:width=2:g=${eqHighLevel}`] // High frequencies
                });
            }
            
            // Only apply these if absolutely necessary and we have room
            
            // Voice enhancement (simplified to avoid filter chain complexity)
            if (applyVoiceEnhancement && filterCount < MAX_FILTERS) {
                filterCount++;
                audioFilters.push({
                    filter: 'equalizer',
                    options: ['f=2500:width_type=h:width=1000:g=2'] // Enhance voice clarity
                });
            }
            
            // Watermark if selected (using tremolo for compatibility)
            if (applyWatermark && filterCount < MAX_FILTERS) {
                filterCount++;
                audioFilters.push({
                    filter: 'tremolo',
                    options: [`f=${10 + Math.random() * 5}:d=0.01`] // Very subtle tremolo
                });
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
                    // Update timeout on progress to prevent timeouts on large files
                    clearTimeout(timeoutId);
                    const newTimeoutId = setTimeout(() => {
                        console.error('Video processing timeout - killing process');
                        command.kill('SIGKILL');
                        reject(new Error('Processing timeout - process terminated'));
                    }, 5 * 60 * 1000); // 5-minute timeout from last progress
                }
            });

            command.on('error', (err, stdout, stderr) => {
                console.error('FFmpeg error:', err);
                clearTimeout(timeoutId); // Clear timeout on error
                
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

            command.on('end', async () => {
                console.log('FFmpeg processing finished');
                clearTimeout(timeoutId); // Clear timeout on success
                
                // If watermark requested, apply it as a separate step
                if (textWatermark) {
                    // Create a temporary file path for the intermediate result
                    const tempPath = outputPath;
                    const finalPath = `${path.dirname(outputPath)}/final_${path.basename(outputPath)}`;
                    
                    try {
                        // Apply the watermark (works for both emoji and text)
                        console.log('Applying watermark as separate step...');
                        const result = await applyWatermark(tempPath, finalPath, textWatermark);
                        
                        // If successful, clean up the temp file and resolve with the final path
                        if (result === finalPath && fs.existsSync(finalPath)) {
                            if (fs.existsSync(tempPath)) {
                                fs.unlinkSync(tempPath);
                            }
                            resolve(finalPath);
                        } else {
                            // If watermark failed, use the original processed file
                            resolve(tempPath);
                        }
                    } catch (watermarkError) {
                        console.error('Error applying watermark:', watermarkError);
                        // If watermark fails, still return the processed video
                        resolve(tempPath);
                    }
                } else {
                    // No watermark requested, just resolve with the processed file
                    resolve(outputPath);
                }
            });

            // Start the processing
            command.save(outputPath);
        }); // NEW CODE: Close the ffprobe callback
    });
}

// Micro-subtle rehash function for cloud environments
async function applyRehash(inputPath, outputPath, overlaysFolder, textWatermark = null) {
    return new Promise(async (resolve, reject) => {
        try {
            // Generate random ID
            const randomId = Math.floor(Math.random() * 1000);
            const basename = path.basename(inputPath);
            const name = path.basename(basename, path.extname(basename));
            
            // Create final output path if not specified
            if (!outputPath) {
                const ext = path.extname(basename);
                outputPath = path.join(path.dirname(inputPath), `${name}_fresh_edit_${randomId}${ext}`);
            }
            
            // Create temp paths for intermediate files
            const tempOutputPath = path.join(path.dirname(outputPath), `temp_${randomId}${path.extname(outputPath)}`);
            const finalOutputPath = outputPath; // Store the final path
            
            console.log(`\n🎬 Processing rehash (cloud-optimized): ${basename}`);
            
            // Step 1: Process the video with simple metadata changes only (no filters)
            let command = ffmpeg(inputPath);
            
            // Simple copy with metadata changes
            command.outputOptions([
                '-c:v', 'copy',        // Copy video stream for maximum speed
                '-c:a', 'copy',        // Copy audio stream for maximum speed
                '-movflags', '+faststart',
                // Add minimal metadata changes
                '-metadata', `title=${name}_edit_${randomId}`,
                '-metadata', `comment=Processed video ${new Date().toISOString()}`
            ]);
            
            // Process and save the metadata-only version
            await new Promise((resolveStep1, rejectStep1) => {
                const timeoutId = setTimeout(() => {
                    console.error('Rehash timeout - killing process');
                    command.kill('SIGKILL');
                    rejectStep1(new Error('Processing timeout - process terminated'));
                }, 10 * 60 * 1000);
                
                command
                    .on('start', (cmdline) => {
                        console.log(`🚀 FFmpeg rehash metadata started`);
                    })
                    .on('progress', (progress) => {
                        if (progress.percent) {
                            console.log(`⏳ Metadata update progress: ${Math.round(progress.percent)}%`);
                            clearTimeout(timeoutId);
                        }
                    })
                    .on('error', (err) => {
                        clearTimeout(timeoutId);
                        console.error('❌ Metadata update error:', err);
                        rejectStep1(err);
                    })
                    .on('end', () => {
                        clearTimeout(timeoutId);
                        console.log('✅ Metadata update completed');
                        resolveStep1();
                    })
                    .save(tempOutputPath);
            });
            
            // Step 2: If watermark is requested, apply it to the processed file
            if (textWatermark) {
                // Use the generalized watermark function that handles both text and emoji
                const watermarkedPath = await applyWatermark(tempOutputPath, finalOutputPath, textWatermark);
                
                // Clean up the temp file
                if (fs.existsSync(tempOutputPath)) {
                    fs.unlinkSync(tempOutputPath);
                }
                
                resolve(watermarkedPath);
            } else {
                // No watermark needed, just rename the temp file
                fs.renameSync(tempOutputPath, finalOutputPath);
                resolve(finalOutputPath);
            }
        } catch (error) {
            console.error('Error in rehash process:', error);
            reject(error);
        }
    });
}

// Rename function to be more general
async function applyWatermark(inputPath, outputPath, watermarkText) {
    return new Promise((resolve, reject) => {
        console.log(`Adding watermark: ${watermarkText}`);
        
        // Validate input path exists
        if (!fs.existsSync(inputPath)) {
            console.error(`Input file doesn't exist: ${inputPath}`);
            return resolve(inputPath); // Return original path if input doesn't exist
        }
        
        try {
            // Check if the watermark is an emoji or regular text
            const firstChar = watermarkText.codePointAt(0);
            const isEmoji = firstChar > 0x1F000; // Simple check - Unicode emoji range typically starts around 0x1F000
            
            if (isEmoji) {
                // EMOJI HANDLING - Use image overlay approach
                applyEmojiImageOverlay(inputPath, outputPath, watermarkText)
                    .then(result => resolve(result))
                    .catch(err => {
                        console.error('Emoji overlay failed, falling back to text:', err);
                        // If emoji fails, fall back to text rendering
                        applyTextOverlay(inputPath, outputPath, watermarkText)
                            .then(result => resolve(result))
                            .catch(() => resolve(inputPath));
                    });
            } else {
                // TEXT HANDLING - Use drawtext filter
                applyTextOverlay(inputPath, outputPath, watermarkText)
                    .then(result => resolve(result))
                    .catch(err => {
                        console.error('Text overlay failed:', err);
                        resolve(inputPath);
                    });
            }
        } catch (unexpectedError) {
            console.error(`Unexpected error in watermark process: ${unexpectedError.message}`);
            resolve(inputPath); // Continue without watermark on any unexpected error
        }
    });
}

// Function to apply text watermark using drawtext filter
async function applyTextOverlay(inputPath, outputPath, text) {
    return new Promise((resolve, reject) => {
        console.log(`Applying text watermark: "${text}"`);
        
        const command = ffmpeg(inputPath);
        
        // Setup timeout for cloud environment
        const timeoutId = setTimeout(() => {
            console.error('Text overlay timeout - killing process');
            command.kill('SIGKILL');
            resolve(inputPath);
        }, 5 * 60 * 1000);
        
        // Apply text overlay using drawtext filter with LARGER size
        command
            .videoFilters([
                {
                    filter: 'drawbox',
                    options: {
                        x: 'w-max(400,tw+60)-10',  // Position box for text (wider with larger text)
                        y: '10',                   // 10px from top
                        w: 'max(400,tw+60)',       // Width based on larger text
                        h: '80',                   // Taller box for larger text
                        color: 'black@0.5',        // Semi-transparent black
                        t: 'fill'                  // Fill the box
                    }
                },
                {
                    filter: 'drawtext',
                    options: {
                        text: text,               // The text to display
                        fontsize: 48,             // BIGGER font (increased from 32)
                        fontcolor: 'white',       // White text for visibility
                        x: 'w-tw-30',             // Position text (right-aligned)
                        y: '40',                  // Centered vertically in the larger box
                        shadowcolor: 'black@0.5', // Shadow for better visibility
                        shadowx: 3,               // Stronger shadow
                        shadowy: 3,
                    }
                }
            ])
            .outputOptions([
                '-c:a', 'copy',            // Copy audio stream
                '-preset', 'ultrafast',    // Use fastest encoding
                '-movflags', '+faststart'  // Optimize for web playback
            ])
            .on('start', (cmdline) => {
                console.log('Text overlay command:', cmdline);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    console.log(`Text overlay progress: ${Math.round(progress.percent)}%`);
                    clearTimeout(timeoutId);
                }
            })
            .on('error', (err) => {
                clearTimeout(timeoutId);
                console.error('Error applying text overlay:', err.message);
                reject(err);
            })
            .on('end', () => {
                clearTimeout(timeoutId);
                console.log('Text overlay applied successfully');
                resolve(outputPath);
            })
            .save(outputPath);
    });
}

// Fix emoji download mechanism to be more reliable
async function applyEmojiImageOverlay(inputPath, outputPath, textWatermark) {
    return new Promise((resolve, reject) => {
        console.log(`Adding emoji image overlay: ${textWatermark}`);
        
        // Create emoji image directory if it doesn't exist
        const emojiDir = path.join(__dirname, 'emoji_images');
        if (!fs.existsSync(emojiDir)) {
            try {
                fs.mkdirSync(emojiDir, { recursive: true });
                console.log(`Created emoji directory: ${emojiDir}`);
            } catch (dirError) {
                console.error(`Failed to create emoji directory: ${dirError.message}`);
                return reject(dirError);
            }
        }
        
        // Path to save the emoji image
        const emojiChar = textWatermark.codePointAt(0);
        const emojiImagePath = path.join(emojiDir, `emoji_${emojiChar}.png`);
        
        // Try multiple emoji sources to ensure we get a usable image
        const downloadEmoji = () => {
            try {
                // Primary source: Twitter's Twemoji library with a local fallback
                const emojiCodePoint = textWatermark.codePointAt(0).toString(16).toLowerCase();
                const emojiUrl = `https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/${emojiCodePoint}.png`;
                
                console.log(`Downloading emoji from ${emojiUrl}`);
                try {
                    execSync(`curl -s "${emojiUrl}" -o "${emojiImagePath}"`, { timeout: 10000 });
                    
                    // Verify the download was successful by checking file size (> 100 bytes)
                    if (fs.existsSync(emojiImagePath) && fs.statSync(emojiImagePath).size > 100) {
                        console.log(`Successfully downloaded emoji to ${emojiImagePath}`);
                        return true;
                    }
                } catch (curlError) {
                    console.error(`Curl download failed: ${curlError.message}`);
                }
                
                // Fallback: Try simplified emoji download with https
                try {
                    console.log("Trying alternative download method...");
                    const file = fs.createWriteStream(emojiImagePath);
                    https.get(emojiUrl, function(response) {
                        response.pipe(file);
                        file.on('finish', () => {
                            file.close();
                            console.log("Download completed via https");
                        });
                    });
                    
                    // Wait a moment for the download to complete
                    execSync('sleep 2');
                    
                    if (fs.existsSync(emojiImagePath) && fs.statSync(emojiImagePath).size > 100) {
                        return true;
                    }
                } catch (httpsError) {
                    console.error(`HTTPS download failed: ${httpsError.message}`);
                }
                
                // Final attempt - create a simple colored box as emoji
                console.log("All downloads failed, creating simple colored box");
                try {
                    const colorCommand = `ffmpeg -y -f lavfi -i color=c=yellow:s=216x216 -frames:v 1 "${emojiImagePath}"`;
                    execSync(colorCommand, { timeout: 5000 });
                    if (fs.existsSync(emojiImagePath)) {
                        return true;
                    }
                } catch (boxError) {
                    console.error(`Failed to create box: ${boxError.message}`);
                }
                
                return false;
            } catch (error) {
                console.error(`Error in emoji handling: ${error.message}`);
                return false;
            }
        };
        
        // Check if we already have this emoji downloaded or download it
        let emojiExists = fs.existsSync(emojiImagePath) && fs.statSync(emojiImagePath).size > 100;
        if (!emojiExists) {
            emojiExists = downloadEmoji();
        }
        
        // Only add overlay if the emoji image exists, otherwise fall back to text
        if (emojiExists) {
            console.log("Emoji file exists and is valid, applying as overlay");
            
            try {
                // Create the ffmpeg command
                const command = ffmpeg(inputPath);
                
                // Add the emoji image as input
                command.input(emojiImagePath);
                
                // Setup timeout for cloud environment
                const timeoutId = setTimeout(() => {
                    console.error('Emoji overlay timeout - killing process');
                    command.kill('SIGKILL');
                    // Instead of rejecting, resolve with original path
                    resolve(inputPath);
                }, 5 * 60 * 1000);
                
                // Create a more reliable filter complex syntax - use a much simpler approach
                // INCREASE SIZE: Change scale from 216x216 to 400x400 (almost double size)
                command
                    .outputOptions([
                        // Most basic overlay possible for maximum compatibility with BIGGER size
                        '-filter_complex', '[1:v]scale=400:400[emoji];[0:v][emoji]overlay=main_w-400-20:20',
                        '-c:a', 'copy',  // Copy audio stream
                        '-preset', 'ultrafast'  // Use fastest encoding
                    ])
                    .on('start', (cmdline) => {
                        console.log('Emoji overlay command:', cmdline);
                    })
                    .on('progress', (progress) => {
                        if (progress.percent) {
                            console.log(`Emoji overlay progress: ${Math.round(progress.percent)}%`);
                            // Reset timeout on progress
                            clearTimeout(timeoutId);
                        }
                    })
                    .on('error', (err, stdout, stderr) => {
                        clearTimeout(timeoutId);
                        console.error('Error applying emoji overlay:', err.message);
                        
                        // Fallback to text approach
                        console.log('Emoji overlay failed, falling back to text watermark');
                        applyTextOverlay(inputPath, outputPath, textWatermark)
                            .then(result => resolve(result))
                            .catch(() => resolve(inputPath));
                    })
                    .on('end', () => {
                        clearTimeout(timeoutId);
                        console.log('Emoji overlay applied successfully');
                        resolve(outputPath);
                    })
                    .save(outputPath);
            } catch (unexpectedError) {
                console.error(`Unexpected error setting up FFmpeg: ${unexpectedError.message}`);
                resolve(inputPath); // Continue without watermark
            }
        } else {
            console.error("No emoji image available, falling back to text");
            applyTextOverlay(inputPath, outputPath, textWatermark)
                .then(result => resolve(result))
                .catch(() => resolve(inputPath));
        }
    });
}

// Simpler fallback function with minimal options
async function retryWithSimpleOverlay(inputPath, outputPath, emojiImagePath) {
    return new Promise((resolve, reject) => {
        console.log("Attempting simpler overlay method...");
        
        // Get video dimensions
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
            if (err) {
                console.error('Failed to get video dimensions:', err.message);
                return reject(err);
            }
            
            // Find video stream
            const videoStream = metadata.streams.find(s => s.codec_type === 'video');
            if (!videoStream) {
                console.error('No video stream found for dimensions');
                return reject(new Error('No video stream found'));
            }
            
            const width = videoStream.width;
            const height = videoStream.height;
            
            // Calculate position with BIGGER emoji (400x400)
            const posX = width - 400 - 20; // Adjusted for new size
            const posY = 20;
            
            // Create command with absolute coordinates
            const command = ffmpeg(inputPath)
                .input(emojiImagePath)
                .outputOptions([
                    // Use absolute coordinates with larger size
                    '-filter_complex', `[1:v]scale=400:400[emoji];[0:v][emoji]overlay=${posX}:${posY}`,
                    '-c:a', 'copy',
                    '-preset', 'ultrafast'
                ])
                .on('error', (err) => {
                    console.error('Alternative overlay failed:', err.message);
                    reject(err);
                })
                .on('end', () => {
                    console.log('Alternative overlay method successful');
                    resolve(outputPath);
                });
                
            // Save the output
            command.save(outputPath);
        });
    });
}

// Add export for new helper functions to make them testable
module.exports = { 
    processVideo, 
    applyRehash,
    applyWatermark,
    applyTextOverlay,
    applyEmojiImageOverlay,
    retryWithSimpleOverlay,
    generateRandomMetadata
};