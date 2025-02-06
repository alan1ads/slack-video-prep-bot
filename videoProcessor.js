const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

function generateRandomMetadata() {
    const randomYear = 2018 + Math.floor(Math.random() * 6);
    const randomMonth = 1 + Math.floor(Math.random() * 12);
    const randomDay = 1 + Math.floor(Math.random() * 28);
    const randomHour = Math.floor(Math.random() * 24);
    const randomMin = Math.floor(Math.random() * 60);
    const randomSec = Math.floor(Math.random() * 60);

    const devices = ["iPhone", "Samsung Galaxy", "Google Pixel", "Sony Camera", "Canon EOS", "Nikon D"];
    const randomDevice = devices[Math.floor(Math.random() * devices.length)];
    const randomModel = `${randomDevice} ${Math.floor(Math.random() * 12 + 1)}`;

    return {
        creation_time: `${randomYear}-${String(randomMonth).padStart(2, '0')}-${String(randomDay).padStart(2, '0')} ${String(randomHour).padStart(2, '0')}:${String(randomMin).padStart(2, '0')}:${String(randomSec).padStart(2, '0')}`,
        date: `${randomYear}-${String(randomMonth).padStart(2, '0')}-${String(randomDay).padStart(2, '0')}`,
        year: String(randomYear),
        device_model: randomModel,
        encoder: `video_processor_${1000 + Math.floor(Math.random() * 9000)}`
    };
}

async function processVideo(inputPath, outputPath, speedAdjustment, saturation) {
    return new Promise((resolve, reject) => {
        const metadata = generateRandomMetadata();
        const speedMultiplier = 1 + (speedAdjustment / 100);

        let command = ffmpeg(inputPath)
            // Add resource constraints
            .outputOptions([
                '-threads 4',          // Limit CPU threads
                '-preset ultrafast',   // Fastest encoding
                '-max_muxing_queue_size 1024'
            ])
            .videoFilters([
                {
                    filter: 'setpts',
                    options: `${1/speedMultiplier}*PTS`
                },
                {
                    filter: 'eq',
                    options: `saturation=${saturation}`
                }
            ])
            .audioFilters([
                {
                    filter: 'atempo',
                    options: [speedMultiplier]
                }
            ])
            .outputOptions([
                `-metadata creation_time="${metadata.creation_time}"`,
                `-metadata date="${metadata.date}"`,
                `-metadata year="${metadata.year}"`,
                `-metadata device_model="${metadata.device_model}"`,
                `-metadata encoder="${metadata.encoder}"`
            ]);

        // Add progress monitoring
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
            console.error('FFmpeg stderr:', stderr);
            reject(err);
        });

        command.on('end', () => {
            console.log('FFmpeg processing finished');
            resolve(outputPath);
        });

        // Save with quality reduction to save memory
        command
            .outputOptions([
                '-crf 28',            // Reduce quality slightly
                '-movflags +faststart' // Optimize for web playback
            ])
            .save(outputPath);
    });
}

module.exports = { processVideo };