// Apply meme-expansion-data.json into cards.js
// Adds new memeCards entries (61-180) and new caption cards
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'meme-expansion-data.json'), 'utf8'));

// ── Generate new memeCards entries ──
console.log('Generating memeCards entries 61-180...');
const newMemeEntries = data.memes.map((m, i) => {
  const num = 61 + i;
  const padded = String(num).padStart(2, '0');
  return `  { imageUrl: '/images/meme-melee/meme-${padded}.png', alt: '${m.alt.replace(/'/g, "\\'")}', pick: 1, category: 'generated', spice: ${m.spice} },`;
});
console.log(`  ${newMemeEntries.length} new meme card entries`);

// ── Generate new caption entries ──
console.log('Generating new caption cards...');
const newCaptions = { 1: [], 2: [], 3: [] };
for (const [spiceStr, cards] of Object.entries(data.captions)) {
  newCaptions[parseInt(spiceStr)] = cards;
}
console.log(`  Spice 1: +${newCaptions[1].length}, Spice 2: +${newCaptions[2].length}, Spice 3: +${newCaptions[3].length}`);

// ── Read existing cards.js ──
const cardsPath = path.join(__dirname, 'games', 'meme-melee', 'cards.js');
let src = fs.readFileSync(cardsPath, 'utf8');

// ── Insert new memeCards before the closing ]; of memeCards array ──
// Find the line "// Image generation prompts" which comes right after memeCards array
const memeCardsEnd = src.indexOf("// Image generation prompts");
if (memeCardsEnd === -1) {
  console.error('Could not find memeCards insertion point (looking for "// Image generation prompts")');
  process.exit(1);
}

// Find the ]; before that comment
const beforePrompts = src.lastIndexOf('];', memeCardsEnd);
if (beforePrompts === -1) {
  console.error('Could not find memeCards closing bracket');
  process.exit(1);
}

// Insert new entries before the ];
src = src.slice(0, beforePrompts) +
  '  // ── Expansion Pack (Gemini-generated) ──\n' +
  newMemeEntries.join('\n') + '\n' +
  src.slice(beforePrompts);

// ── Append captions to each spice tier ──
for (const spice of [1, 2, 3]) {
  const captions = newCaptions[spice];
  if (captions.length === 0) continue;

  // Find the closing bracket of captionCards[spice] array
  // Pattern: We look for the section in captionCards
  const captionEntries = captions.map(c => `    "${c.replace(/"/g, '\\"')}",`).join('\n');
  
  // Strategy: find `],` that closes each spice tier's array
  // The structure is captionCards = { 1: [...], 2: [...], 3: [...] }
  // Find the start of each tier
  const tierKey = `  ${spice}: [`;
  const tierStart = src.indexOf(tierKey, src.indexOf('captionCards'));
  if (tierStart === -1) {
    console.warn(`  Could not find tier ${spice} start`);
    continue;
  }
  
  // Find the closing ], for this tier
  let depth = 0;
  let i = src.indexOf('[', tierStart);
  for (; i < src.length; i++) {
    if (src[i] === '[') depth++;
    if (src[i] === ']') {
      depth--;
      if (depth === 0) break;
    }
  }
  
  // Insert before the ]
  src = src.slice(0, i) +
    '\n    // ── Expansion Pack ──\n' +
    captionEntries + '\n  ' +
    src.slice(i);
}

fs.writeFileSync(cardsPath, src);
console.log('\n✅ cards.js updated with expansion data!');
console.log('   Next: run generate-memes.js to create images for meme-61 through meme-180');
