const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up the Slack Video Prep Bot environment...');

// Create necessary directories
const directories = [
    path.join(__dirname, 'temp', 'input'),
    path.join(__dirname, 'temp', 'output'),
    path.join(__dirname, 'overlays')
];

// Create directories
directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    } else {
        console.log(`✓ Directory exists: ${dir}`);
    }
});

// Handle overlay directory - create default overlays if needed
const overlaysDir = path.join(__dirname, 'overlays');
const defaultOverlaysDir = path.join(__dirname, 'default-overlays');

// Check if rehash overlays exist in the rehash folder
const rehashOverlaysDir = path.join(__dirname, 'rehash', 'overlays');

console.log('Setting up overlay files for rehash functionality...');

// Approach 1: Try to use overlays from rehash folder if present
if (fs.existsSync(rehashOverlaysDir)) {
    console.log(`✅ Found rehash overlays directory at: ${rehashOverlaysDir}`);
    
    try {
        // Run the copyOverlays.js script if it exists
        if (fs.existsSync(path.join(__dirname, 'copyOverlays.js'))) {
            console.log('Copying overlays to the main overlays directory...');
            execSync('node copyOverlays.js', { stdio: 'inherit' });
            console.log('✅ Overlays copied successfully!');
        } else {
            console.log('⚠️ copyOverlays.js not found, manual copy may be needed');
        }
    } catch (error) {
        console.error('❌ Error copying overlays:', error.message);
    }
} 
// Approach 2: Check for default overlays directory in project
else if (fs.existsSync(defaultOverlaysDir)) {
    console.log(`✅ Found default overlays directory at: ${defaultOverlaysDir}`);
    
    try {
        // Copy files from default-overlays to overlays
        const files = fs.readdirSync(defaultOverlaysDir);
        files.forEach(file => {
            const sourcePath = path.join(defaultOverlaysDir, file);
            const targetPath = path.join(overlaysDir, file);
            
            if (fs.statSync(sourcePath).isFile()) {
                fs.copyFileSync(sourcePath, targetPath);
                console.log(`Copied: ${file}`);
            }
        });
        console.log('✅ Default overlays copied successfully!');
    } catch (error) {
        console.error('❌ Error copying default overlays:', error.message);
    }
} 
// Approach 3: Create an info README when no overlays are found
else {
    console.log('⚠️ No overlays found. Creating README in overlays directory...');
    
    // Create a basic README file in overlays directory
    const readmePath = path.join(overlaysDir, 'README.txt');
    fs.writeFileSync(readmePath, 
        'This directory is used for overlay videos in the rehash feature.\n\n' +
        'For optimal use in cloud environments:\n' +
        '1. Create a "default-overlays" directory in your project\n' +
        '2. Add MP4 or WebM files with transparency to use as overlays\n' +
        '3. These will be copied to the overlays directory during setup\n\n' +
        'Note: The rehash feature will work without overlays, but with overlays\n' +
        'it provides an additional layer of uniqueness to processed videos.'
    );
    console.log('✅ Created README in overlays directory');
}

// Check if .env file exists, create template if not
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.log('Creating template .env file...');
    fs.writeFileSync(envPath, 
        '# Slack API Tokens\n' +
        'SLACK_BOT_TOKEN=xoxb-your-bot-token\n' +
        'SLACK_APP_TOKEN=xapp-your-app-token\n' +
        '\n' +
        '# Optional settings\n' +
        'PORT=3000\n'
    );
    console.log('✅ Created template .env file - PLEASE UPDATE WITH YOUR ACTUAL TOKENS');
} else {
    console.log('✓ .env file exists');
}

console.log('\n🎉 Setup complete! Make sure to:');
console.log('1. Update the .env file with your Slack API tokens if you haven\'t already');
console.log('2. For cloud deployment, consider adding overlay videos to a "default-overlays" directory in your repository');
console.log('3. Run the bot with: npm start'); 