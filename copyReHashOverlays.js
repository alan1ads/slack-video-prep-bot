const fs = require('fs');
const path = require('path');

console.log('📂 Copying overlay files from rehash/overlays to default-overlays...');

const sourceDir = path.join(__dirname, 'rehash', 'overlays');
const targetDir = path.join(__dirname, 'default-overlays');

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`✅ Created directory: ${targetDir}`);
}

// Check if source directory exists
if (!fs.existsSync(sourceDir)) {
    console.error(`❌ Source directory not found: ${sourceDir}`);
    process.exit(1);
}

// Get list of files in source directory
try {
    const files = fs.readdirSync(sourceDir);
    
    if (files.length === 0) {
        console.log('No files found in source directory.');
        process.exit(0);
    }
    
    // Copy each file
    let successCount = 0;
    for (const file of files) {
        const sourcePath = path.join(sourceDir, file);
        const targetPath = path.join(targetDir, file);
        
        // Only copy files (not directories)
        if (fs.statSync(sourcePath).isFile()) {
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`✅ Copied: ${file}`);
            successCount++;
        }
    }
    
    console.log(`\n🎉 Copied ${successCount} overlay files successfully!`);
} catch (error) {
    console.error('❌ Error copying files:', error.message);
    process.exit(1);
} 