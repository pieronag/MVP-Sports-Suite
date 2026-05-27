const sharp = require('sharp');
const path = require('path');

async function createFeatureGraphic() {
  const bgPath = 'C:\\Users\\Piero\\.gemini\\antigravity-ide\\brain\\5d4b7ada-228a-4d34-b0da-5ba0c4b2bb6b\\sports_background_1779898698044.png';
  const logoPath = 'c:\\Users\\Piero\\Desktop\\PROYECTOS 2026\\MVP-Sports-Suite\\mvp-sports-app\\assets\\images\\Logo.png';
  const outPath = 'c:\\Users\\Piero\\Desktop\\PROYECTOS 2026\\MVP-Sports-Suite\\feature_graphic.png';

  console.log("Loading background...");
  const bg = await sharp(bgPath)
    .resize(1024, 500, { fit: 'cover' })
    .toBuffer();

  console.log("Loading logo...");
  const logo = await sharp(logoPath)
    .resize({ width: 450, height: 450, fit: 'inside' })
    .toBuffer();

  console.log("Compositing...");
  await sharp(bg)
    .composite([
      { input: logo, gravity: 'center' }
    ])
    .toFile(outPath);

  console.log("Done! Image saved to:", outPath);
}

createFeatureGraphic().catch(console.error);
