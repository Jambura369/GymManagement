const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const svgPath = path.join(__dirname, 'app_icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

const resDir = path.join(__dirname, '../android/app/src/main/res');

const sizes = [
  {folder: 'mipmap-mdpi',    size: 48},
  {folder: 'mipmap-hdpi',    size: 72},
  {folder: 'mipmap-xhdpi',   size: 96},
  {folder: 'mipmap-xxhdpi',  size: 144},
  {folder: 'mipmap-xxxhdpi', size: 192},
];

(async () => {
  for (const {folder, size} of sizes) {
    const dir = path.join(resDir, folder);

    // Square icon
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    // Round icon (circle-cropped)
    const circle = Buffer.from(
      `<svg><circle cx="${size/2}" cy="${size/2}" r="${size/2}" /></svg>`
    );
    await sharp(svgBuffer)
      .resize(size, size)
      .composite([{input: circle, blend: 'dest-in'}])
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    console.log(`✓ ${folder} (${size}px)`);
  }
  console.log('Done — all icons generated.');
})();
