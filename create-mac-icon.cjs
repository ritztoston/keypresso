const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Create iconset directory
const iconsetDir = path.join(__dirname, 'public', 'logo.iconset');
if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir);
}

// Define icon sizes for macOS
const sizes = [16, 32, 64, 128, 256, 512, 1024];

// Convert PNG to different sizes
sizes.forEach(size => {
    const input = path.join(__dirname, 'public', 'logo.png');
    const output = path.join(iconsetDir, `icon_${size}x${size}.png`);

    exec(`sips -z ${size} ${size} "${input}" --out "${output}"`, (error) => {
        if (error) {
            console.error(`Error converting icon size ${size}:`, error);
            return;
        }
    });
});

// Create icns file
exec(`iconutil -c icns "${iconsetDir}" -o "${path.join(__dirname, 'public', 'logo.icns')}"`, (error) => {
    if (error) {
        console.error('Error creating icns file:', error);
        return;
    }
    console.log('Successfully created logo.icns');

    // Clean up iconset directory
    fs.rmSync(iconsetDir, { recursive: true, force: true });
});