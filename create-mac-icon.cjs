const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create iconset directory
const iconsetDir = path.join(__dirname, 'public', 'logo.iconset');
if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir);
}

// Define icon sizes for macOS
const sizes = [16, 32, 64, 128, 256, 512, 1024];

try {
    // Convert PNG to different sizes
    sizes.forEach(size => {
        const input = path.join(__dirname, 'public', 'logo.png');
        const output = path.join(iconsetDir, `icon_${size}x${size}.png`);

        console.log(`Converting to ${size}x${size}...`);
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