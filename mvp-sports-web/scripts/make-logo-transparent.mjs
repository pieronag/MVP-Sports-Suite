import sharp from "sharp";

const input = "public/Logo.png";
const output = "public/icons/logo-mark.png";

const SIZE = 512;

const { data, info } = await sharp(input)
  .resize(SIZE, SIZE, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;

for (let i = 0; i < data.length; i += channels) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const min = Math.min(r, g, b);

  if (min > 245) {
    data[i + 3] = 0;
  } else if (min > 222) {
    data[i + 3] = Math.round((255 * (245 - min)) / 23);
  }
}

await sharp(data, { raw: { width, height, channels } })
  .trim({ threshold: 1 })
  .png({ compressionLevel: 9 })
  .toFile(output);

console.log(`Wrote ${output}`);
