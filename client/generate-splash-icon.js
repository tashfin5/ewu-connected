import sharp from 'sharp';

async function generateSplashIcon() {
  // Create a 1024x1024 fully transparent background
  const base = sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 } // fully transparent
    }
  });

  // Read logo and resize it to be much smaller (e.g., 600 width) so it looks clean and small on the splash screen
  const logo = await sharp('public/logo2_white.png')
    .resize(500, null, { fit: 'inside' })
    .toBuffer();

  // Composite logo onto base in the center
  const output = await base
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer();

  // Save to Android drawable folder
  await sharp(output).toFile('android/app/src/main/res/drawable/splash_icon.png');
  
  console.log("Clean transparent splash icon generated successfully!");
}

generateSplashIcon().catch(console.error);
