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

            // Add metadata correctly - CHANGED: Use randomMetadata instead of metadata
            command
            .addOutputOption('-metadata', `date=${randomMetadata.date}`)
            .addOutputOption('-metadata', `year=${randomMetadata.year}`)
            .addOutputOption('-metadata', `device_model=${randomMetadata.device_model}`)
            .addOutputOption('-metadata', `encoder=${randomMetadata.encoder}`)
            // Add new metadata fields
            .addOutputOption('-metadata', `software=${randomMetadata.software}`)
            .addOutputOption('-metadata', `resolution=${randomMetadata.resolution}`)
            .addOutputOption('-metadata', `location=${randomMetadata.location}`)
            .addOutputOption('-metadata', `gps=${randomMetadata.gps}`);

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

            // Audio filters array
            let audioFilters = [];
            
            // Always include speed adjustment
            audioFilters.push({
                filter: 'atempo',
                options: [speedMultiplier]
            });
            
            // Apply each requested audio filter if a value is provided
            
            // Reverb
            if (reverbLevel !== null) {
                audioFilters.push({
                    filter: 'aecho',
                    options: [`0.8:0.9:${reverbLevel * 10}:0.5`] // Adjust delay time based on level
                });
            }
            
            // Delay/Echo
            if (delayLevel !== null) {
                audioFilters.push({
                    filter: 'aecho',
                    options: [`0.6:0.3:${delayLevel * 30}:0.5`] // Different style of echo than reverb
                });
            }
            
            // Pitch Shift
            if (pitchShift !== null) {
                audioFilters.push({
                    filter: 'asetrate',
                    options: [`44100*${Math.pow(2, pitchShift/12)}`] // Convert semitones to frequency ratio
                });
            }
            
            // Distortion/Saturation
            if (distortion !== null) {
                const amount = distortion / 100;
                audioFilters.push({
                    filter: 'acrusher', 
                    options: [`samples=${4000-3000*amount}:bits=${8-4*amount}:mode=log`]
                });
            }
            
            // Noise Reduction (simplified version using highpass filter)
            if (noiseReduction !== null) {
                audioFilters.push({
                    filter: 'highpass',
                    options: [`f=${100 + noiseReduction * 10}`] // Higher cutoff for more reduction
                });
            }
            
            // Equalization (3-band EQ)
            if (eqLowLevel !== null || eqMidLevel !== null || eqHighLevel !== null) {
                const lowLevel = eqLowLevel !== null ? eqLowLevel : 0;
                const midLevel = eqMidLevel !== null ? eqMidLevel : 0;
                const highLevel = eqHighLevel !== null ? eqHighLevel : 0;
                
                audioFilters.push({
                    filter: 'equalizer',
                    options: [`f=100:width_type=o:width=2:g=${lowLevel}`] // Low frequencies
                });
                
                audioFilters.push({
                    filter: 'equalizer',
                    options: [`f=1000:width_type=o:width=2:g=${midLevel}`] // Mid frequencies
                });
                
                audioFilters.push({
                    filter: 'equalizer',
                    options: [`f=10000:width_type=o:width=2:g=${highLevel}`] // High frequencies
                });
            }
            
            // Compression/Limiting
            if (compression !== null) {
                audioFilters.push({
                    filter: 'acompressor',
                    options: [`threshold=${-30 + compression}:ratio=${3 + compression/10}:attack=20:release=100`]
                });
            }
            
            // De-essing (simplified using a band stop filter around sibilance frequencies)
            if (deEssing !== null) {
                audioFilters.push({
                    filter: 'bandreject',
                    options: [`f=6000:width_type=h:width=${500 + deEssing * 300}`]
                });
            }
            
            // Apply Voice Enhancement (if randomly selected)
            if (applyVoiceEnhancement) {
                audioFilters.push(
                    {
                        filter: 'highpass',
                        options: ['f=200'] // Remove low rumble
                    },
                    {
                        filter: 'lowpass',
                        options: ['f=3000'] // Focus on voice frequencies
                    },
                    {
                        filter: 'equalizer',
                        options: ['f=2500:width_type=h:width=1000:g=2'] // Enhance clarity
                    }
                );
            }
            
            // Apply Audio Watermarking (if randomly selected)
            if (applyWatermark) {
                // Generate unique identifier (timestamp-based)
                const timestamp = Date.now().toString(36);
                const watermarkFreq = 18000 + Math.random() * 2000; // Near-ultrasonic frequency
                
                audioFilters.push({
                    filter: 'asin',
                    options: [`frequency=${watermarkFreq}:sample_rate=44100:amplitude=0.005`] // Very quiet sine wave
                });
            }
            
            // Apply all audio filters
            command.audioFilters(audioFilters);

            // Add metadata correctly - CHANGED: Use randomMetadata instead of metadata
            command
            .addOutputOption('-metadata', `date=${randomMetadata.date}`)
            .addOutputOption('-metadata', `year=${randomMetadata.year}`)
            .addOutputOption('-metadata', `device_model=${randomMetadata.device_model}`)
            .addOutputOption('-metadata', `encoder=${randomMetadata.encoder}`)
            // Add video metadata fields
            .addOutputOption('-metadata', `software=${randomMetadata.software}`)
            .addOutputOption('-metadata', `resolution=${randomMetadata.resolution}`)
            .addOutputOption('-metadata', `location=${randomMetadata.location}`)
            .addOutputOption('-metadata', `gps=${randomMetadata.gps}`)
            // Add new audio metadata
            .addOutputOption('-metadata', `audio_codec=${randomMetadata.audio_codec}`)
            .addOutputOption('-metadata', `audio_sample_rate=${randomMetadata.audio_sample_rate}`)
            .addOutputOption('-metadata', `audio_bit_rate=${randomMetadata.audio_bit_rate}`)
            .addOutputOption('-metadata', `audio_equipment=${randomMetadata.audio_equipment}`)
            .addOutputOption('-metadata', `audio_software=${randomMetadata.audio_software}`);

            // Start processing
            command.save(outputPath);
        }); // NEW CODE: Close the ffprobe callback
    });
}
module.exports = { processVideo };