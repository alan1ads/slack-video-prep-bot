# Slack Video Prep Bot

This bot allows you to process videos shared on Slack with various audio and video effects, and includes a special "rehash" feature that helps videos avoid automated detection systems.

## Features

- Process multiple videos at once
- Video adjustments (speed, saturation, brightness, contrast, FPS)
- Audio adjustments (reverb, delay, pitch, distortion, noise reduction, EQ, compression, etc.)
- "Rehash" feature to make videos more unique by swapping frames and subtly adjusting audio pitch

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the setup script:
   ```
   npm run setup
   ```
4. Edit the `.env` file with your Slack tokens:
   ```
   SLACK_BOT_TOKEN=xoxb-your-bot-token
   SLACK_APP_TOKEN=xapp-your-app-token
   ```
5. Start the bot:
   ```
   npm start
   ```

## Using the Bot in Slack

1. Invite the bot to a channel
2. Use the `/videoprep` command to start
3. Upload videos to the channel
4. Click "Process Videos" when done uploading
5. Configure processing options
6. Submit to process all videos

## Rehash Feature

The rehash feature subtly modifies videos by:
1. Swapping a few frames in the middle section of the video
2. Slightly adjusting audio pitch (1.005-1.015x)
3. Optionally applying a transparent overlay

### Overlays in Cloud Environments

If you're running this bot in a cloud environment like Render.com, follow these steps to use overlays:

1. Create a `default-overlays` directory in your project repository
2. Add MP4 or WebM files with transparency to this directory
3. During deployment, the setup script will copy these overlays to the working directory

Note: The rehash feature works perfectly fine without overlays, but with overlays it adds an additional layer of uniqueness to processed videos.

## Development

- `app.js` - Main Slack bot application
- `videoProcessor.js` - Video and audio processing functions
- `setup.js` - Environment setup script

## License

ISC 