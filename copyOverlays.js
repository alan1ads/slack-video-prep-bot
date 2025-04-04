const fs = require('fs');
const path = require('path');

// Define source and target paths
const sourceOverlaysDir = path.join(__dirname, 'rehash', 'overlays');
const targetOverlaysDir = path.join(__dirname, 'overlays');

// Function to copy a directory recursively
function copyDir(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
    console.log(`Created directory: ${dest}`);
  }

  // Read source directory contents
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyDir(srcPath, destPath);
    } else {
      // Copy files
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${entry.name}`);
    }
  }
}

// Check if source directory exists
if (fs.existsSync(sourceOverlaysDir)) {
  console.log(`Found overlays directory at: ${sourceOverlaysDir}`);
  console.log(`Copying overlays to: ${targetOverlaysDir}`);
  
  try {
    copyDir(sourceOverlaysDir, targetOverlaysDir);
    console.log('✅ Overlays copied successfully!');
  } catch (error) {
    console.error('❌ Error copying overlays:', error);
  }
} else {
  console.error(`❌ Source overlays directory not found at: ${sourceOverlaysDir}`);
  console.log('Please make sure the rehash/overlays directory exists.');
} 