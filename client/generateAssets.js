import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generate() {
  const logoPath = path.join(__dirname, 'public', 'logo2.png');
  const bgPath = path.join(__dirname, 'assets', 'icon-background.png');
  const fgPath = path.join(__dirname, 'assets', 'icon-foreground.png');
  const splashDarkPath = path.join(__dirname, 'assets', 'splash-dark.png');
  const splashPath = path.join(__dirname, 'assets', 'splash.png');

  // Generate solid dark background for icon (1024x1024)
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 12, g: 10, b: 9, alpha: 1 } // #0c0a09
    }
  }).png().toFile(bgPath);

  // Generate foreground icon (1024x1024, scaled to 80% to fit circle)
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([
      { input: await sharp(logoPath).resize(800, 800, { fit: 'contain' }).toBuffer(), gravity: 'center' }
    ])
    .png()
    .toFile(fgPath);

  // Generate dark splash screen (2732x2732)
  const splashBuffer = await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background: { r: 12, g: 10, b: 9, alpha: 1 } // #0c0a09
    }
  })
    .composite([
      { input: await sharp(logoPath).resize(1000, 1000, { fit: 'contain' }).toBuffer(), gravity: 'center' }
    ])
    .png()
    .toBuffer();

  await sharp(splashBuffer).toFile(splashDarkPath);
  await sharp(splashBuffer).toFile(splashPath);

  console.log('✅ Custom dark/transparent assets generated successfully!');
}

generate().catch(console.error);
