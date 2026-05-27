const sharp = require('sharp');

async function processMockups() {
  const m1 = 'c:\\Users\\Piero\\Desktop\\PROYECTOS 2026\\MVP-Sports-Suite\\mockup1.png';
  const m2 = 'c:\\Users\\Piero\\Desktop\\PROYECTOS 2026\\MVP-Sports-Suite\\mockup2.png';
  
  const out1 = 'c:\\Users\\Piero\\Desktop\\PROYECTOS 2026\\MVP-Sports-Suite\\screenshot1.jpg';
  const out2 = 'c:\\Users\\Piero\\Desktop\\PROYECTOS 2026\\MVP-Sports-Suite\\screenshot2.jpg';

  console.log("Processing screenshot 1...");
  await sharp(m1)
    .resize(1080, 1920, { fit: 'contain', background: { r: 5, g: 11, b: 20, alpha: 1 } })
    .jpeg({ quality: 90 })
    .toFile(out1);

  console.log("Processing screenshot 2...");
  await sharp(m2)
    .resize(1080, 1920, { fit: 'contain', background: { r: 5, g: 11, b: 20, alpha: 1 } })
    .jpeg({ quality: 90 })
    .toFile(out2);

  console.log("Screenshots saved successfully.");
}

processMockups().catch(console.error);
