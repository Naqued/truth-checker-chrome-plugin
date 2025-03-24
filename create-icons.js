const fs = require('fs');
const path = require('path');

console.log('Creating icon files...');

// Make sure the icons directory exists in dist
const iconDir = path.join(__dirname, 'dist', 'icons');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
  console.log('Created icons directory in dist folder');
}

// Read base64 encoded data
const icon16Data = fs.readFileSync(path.join(__dirname, 'src', 'icons', 'icon16.txt'), 'utf8');
const icon48Data = fs.readFileSync(path.join(__dirname, 'src', 'icons', 'icon48.txt'), 'utf8');
const icon128Data = fs.readFileSync(path.join(__dirname, 'src', 'icons', 'icon128.txt'), 'utf8');

// Convert base64 to binary and save as PNG
fs.writeFileSync(path.join(iconDir, 'icon16.png'), Buffer.from(icon16Data, 'base64'));
fs.writeFileSync(path.join(iconDir, 'icon48.png'), Buffer.from(icon48Data, 'base64'));
fs.writeFileSync(path.join(iconDir, 'icon128.png'), Buffer.from(icon128Data, 'base64'));

console.log('Successfully created icon files:');
console.log('- icon16.png');
console.log('- icon48.png');
console.log('- icon128.png'); 