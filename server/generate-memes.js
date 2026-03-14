// Generate meme images for Meme Melee using Imagen
import { memePrompts } from './games/meme-melee/cards.js';
import { generateAndSave, throttle } from './games/trivia-fetch/imagen.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'client', 'public', 'images', 'meme-melee');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function main() {
  console.log(`Generating ${memePrompts.length} meme images...`);

  let success = 0;
  let fail = 0;

  for (let i = 0; i < memePrompts.length; i++) {
    const num = String(i + 1).padStart(2, '0');
    const outPath = path.join(OUTPUT_DIR, `meme-${num}.png`);

    if (fs.existsSync(outPath)) {
      console.log(`[${num}] Already exists, skipping`);
      success++;
      continue;
    }

    console.log(`[${num}] Generating...`);
    const ok = await generateAndSave(memePrompts[i], outPath, '1:1');
    if (ok) {
      success++;
      console.log(`[${num}] ✓ Done`);
    } else {
      fail++;
      console.log(`[${num}] ✗ Failed`);
    }

    if (i < memePrompts.length - 1) await throttle(2000);
  }

  console.log(`\nDone! ${success} succeeded, ${fail} failed.`);
}

main().catch(console.error);
