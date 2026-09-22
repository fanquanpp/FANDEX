import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, '..', 'src', 'assets', 'og-image.svg');
const outPath = join(__dirname, '..', 'public', 'og-image.png');

const svg = readFileSync(svgPath);

await sharp(svg, { density: 96 })
  .resize(1200, 630)
  .png({ compressionLevel: 9 })
  .toFile(outPath);

console.log('[generate-og] Written', outPath);
