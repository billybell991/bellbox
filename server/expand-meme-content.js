// Expand Meme Melee content using Gemini
// Generates new meme image prompts (with spice levels) and caption cards
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

async function generateJSON(prompt) {
  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();
  // Strip markdown fences
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  return JSON.parse(text);
}

async function main() {
  console.log('🎨 Generating expanded Meme Melee content with Gemini...\n');

  // ── 1. New meme image prompts with spice levels ──
  console.log('Step 1: Generating meme image prompts...');
  const memePromptData = await generateJSON(`You are a creative meme image designer for a party game called "Meme Melee".
Players see a meme IMAGE and play funny caption cards against it.

Generate exactly 120 NEW meme image prompts organized by spice level.
Each prompt describes a funny, meme-worthy image that Imagen AI will generate.

SPICE LEVELS:
- Level 1 (Family Fun): Wholesome, cute, silly. Animals doing human things, everyday awkward moments, kids being kids. Nothing edgy.
- Level 2 (Spicy): Awkward adult situations, dating disasters, office politics, hangovers, mild embarrassment. Suggestive but not explicit.  
- Level 3 (Unhinged): Dark humor, absurdist chaos, existential dread, nightmare fuel (but still funny). Edgy but not hateful/sexual.

OUTPUT FORMAT (strict JSON, no markdown):
{
  "memes": [
    { "spice": 1, "alt": "short 3-6 word description", "prompt": "Detailed image generation prompt. Photorealistic/meme-worthy style." },
    ...
  ]
}

Requirements:
- 40 prompts per spice level (120 total)
- Diverse categories: animals, people, objects, surreal situations, workplace, food, technology, nature
- Each prompt should be 1-3 sentences, vivid enough for image generation
- Alt text should be concise (used as image alt attribute)
- DO NOT duplicate concepts from these existing memes: pigeon in suit, surprised lion, confused elderly with phone, dog on beach, cat at dinner table, squirrel superhero, sloth marathon, ducks graduating, giraffe hiding, bear baking, hamster monster truck, sheep yoga, alien tourist, octopus king, eagle dropping fry, cat wizard, office animal costumes, jar opening fail, child drawing alive, gnome party, raccoon sneaking, retriever scientist, penguin desert, cat on counter, seagulls fighting, chihuahua CEO, meerkats exercising, fish unimpressed, rooster runway, panda couch, owl laptop, retriever lifeguard, cats boxing, duck monocle, pigeons SWAT, tortoise racing, frog thinking, squirrel jumping, alpaca salon, elephant kiddie pool, goat on car, deer dancing, parrot witness, flamingo meeting, dog derp face, gorilla birthday, cat cucumber, bulldog rocking chair, otter floating, chameleon disco, turtles stacked, horse photobomb, ducklings stairs, pelican swallowing, koala hugging, cats western, mouse dinner, parakeet shocked, corgi fence, seal fish
- Make them genuinely funny and meme-worthy!`);

  console.log(`  ✓ Got ${memePromptData.memes.length} meme prompts`);

  // ── 2. New caption cards ──
  console.log('Step 2: Generating caption cards...');
  const captionData = await generateJSON(`You are a comedy writer for a party card game called "Meme Melee" (like Cards Against Humanity but with meme images).
Players see a meme image and play a caption card to make it funny.

Generate 180 NEW caption cards (short funny phrases/sentences that could be funny paired with almost any meme image).

SPICE LEVELS:
- Level 1 (Family Fun, 60 cards): Clean humor. Relatable everyday situations, school/work life, pets, food, technology fails. Think "When the..." or "POV:..." or "Me trying to..." format. NO swearing, NO adult themes.
- Level 2 (Spicy, 60 cards): Edgy humor. Dating fails, office politics, social media drama, mild embarrassment, sarcasm, therapy jokes. Can reference alcohol/hangovers/dating but nothing explicit.
- Level 3 (Unhinged, 60 cards): Dark/absurdist humor. Existential dread, chaotic energy, "the voices", feral behavior, villain origin stories, unhinged confessions. Edgy but not hateful or explicitly sexual.

OUTPUT FORMAT (strict JSON, no markdown):
{
  "captions": {
    "1": ["caption1", "caption2", ...],
    "2": ["caption1", "caption2", ...],
    "3": ["caption1", "caption2", ...]
  }
}

Requirements:
- Each caption is 3-12 words, punchy and versatile
- They should work as funny pairings with MANY different images (not too specific)
- Mix formats: "When...", "POV:...", "Me after...", "That one friend who...", statement format, etc.
- DO NOT duplicate these existing captions: "When the WiFi goes out", "Me trying to adult", "That's what she said", "My therapist is going to hear about this", "The voices told me to do it", "This is fine. Everything is fine."
- Be genuinely creative and funny. Think viral meme caption energy.`);

  console.log(`  ✓ Got captions: L1=${captionData.captions['1'].length}, L2=${captionData.captions['2'].length}, L3=${captionData.captions['3'].length}`);

  // ── 3. Write output file ──
  const outputPath = path.join(__dirname, 'meme-expansion-data.json');
  fs.writeFileSync(outputPath, JSON.stringify({ memes: memePromptData.memes, captions: captionData.captions }, null, 2));
  console.log(`\n✅ Saved to ${outputPath}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Run: node apply-meme-expansion.js   (merges into cards.js)`);
  console.log(`  2. Run: node generate-memes.js          (generates missing images)`);
}

main().catch(err => { console.error('Failed:', err.message); process.exit(1); });
