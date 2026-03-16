// Generate game poster images for the Netflix-style lobby
import { generateAndSave, throttle } from './games/trivia-fetch/imagen.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'client', 'public', 'images', 'posters');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Each poster: game ID, display name, and a prompt that matches the game's theme
const POSTERS = [
  {
    id: 'nerds-against-humanity',
    prompt: `Create a game poster image in portrait 3:4 format. At the top, render the title "NERDS AGAINST HUMANITY" in very large, ultra-bold, blocky white capital letters with a subtle green glow. The letters must be thick, heavy, and easily readable even at small sizes. Below the title, a single nerdy character with oversized glasses smirks while holding a fan of playing cards, lit by dramatic purple and green neon light. Keep the background simple — dark purple with subtle geometric shapes, no clutter. The title must dominate the top third of the image.`,
  },
  {
    id: 'trivia-fetch',
    prompt: `Create a game poster image in portrait 3:4 format. At the top, display the title "TRIVIA FETCH!" in medium-sized bold capital letters — use a smaller font size so the entire title fits comfortably within the image width with plenty of space on both sides. White text with a golden outline on a dark area. Below, a single excited cream-colored goldendoodle dog (curly fluffy coat, floppy ears, mouth open, happy expression) sits center-frame surrounded by a few floating question mark icons and bone treats. Background is a clean gradient from deep purple to violet with soft spotlight beams. Keep it simple — dog and title are the stars. No tiny background details.`,
  },
  {
    id: 'caption-this',
    prompt: `Create a game poster image in portrait 3:4 format. At the top, display the title "ARTIFICIAL INSULT-IGENCE" in medium-sized bold capital letters — use a smaller font size so the entire title fits comfortably within the image width with plenty of space on both sides. Glowing cyan text on a dark area. It is okay to split this across two lines: "ARTIFICIAL" on line one, "INSULT-IGENCE" on line two. Below, a single sleek robot with crossed arms and a sassy smirk, glowing cyan eyes, on a simple dark background with a few floating speech bubbles containing "!@#$". Minimal clutter.`,
  },
  {
    id: 'hieroglyphics',
    prompt: `Create a game poster image in portrait 3:4 format. At the top, display the title split across two lines: "HIGH-" on the first line and "ROGLYPHICS" on the second line. Use small bold blocky capital letters in bright gold with a dark outline — keep the text compact and small so there is lots of empty space around it and it fits easily within the image. Do NOT use a thin or ornate font. Below, a cool Egyptian pharaoh wearing modern sunglasses, centered and dominant, with a simple dark blue and gold background. A few large emoji symbols float nearby. Clean composition, minimal clutter.`,
  },
  {
    id: 'meme-melee',
    prompt: `Create a game poster image in portrait 3:4 format. At the top, display the title "MEME MELEE" in medium-sized bold white capital letters with a heavy black outline — use a smaller font size so the entire title fits comfortably within the image width with plenty of space on both sides. Below, a dramatic face-off between a surprised cat and a dramatic dog in comic-book style with bold outlines. Simple bold color background (red vs blue split). Clean and punchy, no tiny scattered elements.`,
  },
  {
    id: 'super-sketchy',
    prompt: `A vibrant game poster in portrait 3:4 format with bold neon colors. The title "SUPER SKETCHY" appears at the top in large thick white block letters with a bright pink glow. Center the image on a giant pencil drawing a funny wobbly stick figure on white paper. The background is deep purple with scattered colorful question marks. Bold, clean, eye-catching design with strong contrast. Digital illustration style.`,
  },
];

async function main() {
  console.log(`Generating ${POSTERS.length} game posters...`);

  let success = 0;
  let fail = 0;

  for (let i = 0; i < POSTERS.length; i++) {
    const poster = POSTERS[i];
    const outPath = path.join(OUTPUT_DIR, `${poster.id}.png`);

    if (fs.existsSync(outPath)) {
      console.log(`[${poster.id}] Already exists, skipping`);
      success++;
      continue;
    }

    console.log(`[${poster.id}] Generating poster...`);
    const ok = await generateAndSave(poster.prompt, outPath, '3:4');
    if (ok) {
      success++;
      console.log(`[${poster.id}] ✓ Done`);
    } else {
      fail++;
      console.log(`[${poster.id}] ✗ Failed`);
    }

    if (i < POSTERS.length - 1) await throttle(3000);
  }

  console.log(`\nDone! ${success} succeeded, ${fail} failed.`);
}

main().catch(console.error);
