const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create iconset directory
const iconsetDir = path.join(__dirname, 'public', 'logo.iconset');
if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir);
}

// Define icon sizes for macOS with their proper naming convention
const iconSizes = [
    { size: 16, scale: 1, name: 'icon_16x16.png' },
    { size: 32, scale: 1, name: 'icon_16x16@2x.png' },
    { size: 32, scale: 1, name: 'icon_32x32.png' },
    { size: 64, scale: 1, name: 'icon_32x32@2x.png' },
    { size: 128, scale: 1, name: 'icon_128x128.png' },
    { size: 256, scale: 1, name: 'icon_128x128@2x.png' },
    { size: 256, scale: 1, name: 'icon_256x256.png' },
    { size: 512, scale: 1, name: 'icon_256x256@2x.png' },
    { size: 512, scale: 1, name: 'icon_512x512.png' },
    { size: 1024, scale: 1, name: 'icon_512x512@2x.png' }
];

try {
    // Convert PNG to different sizes
    iconSizes.forEach(({ size, name }) => {
        const input = path.join(__dirname, 'public', 'logo.png');
        const output = path.join(iconsetDir, name);

        console.log(`Converting to ${name}...`);
        execSync(`sips -z ${size} ${size} "${input}" --out "${output}"`);
    });

    // Create icns file
    console.log('Creating icns file...');
    execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(__dirname, 'public', 'logo.icns')}"`);
    console.log('Successfully created logo.icns');

    // Clean up iconset directory
    fs.rmSync(iconsetDir, { recursive: true, force: true });
} catch (error) {
    console.error('Error:', error.message);
    // Clean up on error
    if (fs.existsSync(iconsetDir)) {
        fs.rmSync(iconsetDir, { recursive: true, force: true });
    }
    process.exit(1);
}