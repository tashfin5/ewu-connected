import sharp from 'sharp';

async function generateSplash() {
  const bg = { r: 12, g: 10, b: 9, alpha: 1 }; // #0c0a09
  
  // Create a 2732x2732 background
  const base = sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background: bg
    }
  });

  // Read logo and resize it to fit comfortably (e.g. 1024 width)
  const logo = await sharp('public/logo2_white.png')
    .resize(1024, null, { fit: 'inside' })
    .toBuffer();

  // Composite logo onto base
  const output = await base
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer();

  // Save to assets
  await sharp(output).toFile('assets/splash.png');
  await sharp(output).toFile('assets/splash-dark.png');
  
  console.log("Splash screens generated successfully.");
}

generateSplash().catch(console.error);
