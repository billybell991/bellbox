// One-time script to generate themed avatar images using Imagen
// Run: node generate-avatars.js
// Generates 10 avatars per theme (50 total) into client/public/images/avatars/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'client', 'public', 'images', 'avatars');
const API_KEY = process.env.GEMINI_API_KEY;

const AVATARS_PER_THEME = 10;

// Character archetypes — each gets a unique silhouette
const CHARACTERS = [
  'a confident leader with a crown',
  'a sly trickster with a mischievous grin',
  'a tough warrior with battle scars',
  'a mysterious wizard with glowing eyes',
  'a cheerful jester juggling',
  'a cool rebel with sunglasses',
  'a wise owl-like sage with spectacles',
  'a fierce dragon-like creature',
  'a sneaky cat-like thief',
  'a jolly giant with a huge smile',
];

const THEMES = {
  party: {
    style: 'Bright neon party style, vibrant purple/pink/yellow palette, confetti and sparkles, fun cartoon character portrait',
    bg: 'vibrant gradient from deep purple (#200a36) to hot pink',
  },
  metal: {
    style: 'Heavy metal album art style, dark and chrome, fire and skulls, epic dramatic character portrait',
    bg: 'dark smoky black with orange fire accents',
  },
  cyber: {
    style: 'Cyberpunk neon style, glowing cyan and magenta, holographic effects, futuristic sci-fi character portrait',
    bg: 'dark navy (#0a0a0d) with neon grid lines',
  },
  backwoods: {
    style: 'Rustic country folk art style, warm earthy tones, wood textures, charming cartoon character portrait',
    bg: 'forest green (#223a22) with warm amber glow',
  },
  goth: {
    style: 'Victorian gothic style, deep wine-red and antique gold, ornate dark romantic, elegant character portrait',
    bg: 'near-black (#0a0608) with deep burgundy mist',
  },
};

// Tier 1: imagen-4.0-generate-001
// Tier 2: imagen-4.0-fast-generate-001
// Tier 3: gemini-2.5-flash (generateContent with image output)
const IMAGEN_MODELS = [
  { model: 'imagen-4.0-generate-001', type: 'predict' },
  { model: 'imagen-4.0-fast-generate-001', type: 'predict' },
  { model: 'gemini-2.0-flash-exp', type: 'generateContent' },
];

const exhaustedModels = new Set();

async function generateWithPredict(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${API_KEY}`;
  const body = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: '1:1',
      personGeneration: 'ALLOW_ALL',
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    if (err.includes('RESOURCE_EXHAUSTED')) {
      exhaustedModels.add(model);
      throw new Error(`RESOURCE_EXHAUSTED: ${model}`);
    }
    throw new Error(`${res.status}: ${err.substring(0, 200)}`);
  }

  const data = await res.json();
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error('No image data in response');
  return Buffer.from(b64, 'base64');
}

async function generateWithContent(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      responseMimeType: 'image/png',
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    if (err.includes('RESOURCE_EXHAUSTED')) {
      exhaustedModels.add(model);
      throw new Error(`RESOURCE_EXHAUSTED: ${model}`);
    }
    throw new Error(`${res.status}: ${err.substring(0, 200)}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find(p => p.inlineData);
  if (!imgPart) throw new Error('No image in response');
  return Buffer.from(imgPart.inlineData.data, 'base64');
}

async function generateImage(prompt) {
  for (const { model, type } of IMAGEN_MODELS) {
    if (exhaustedModels.has(model)) continue;
    try {
      if (type === 'predict') {
        return await generateWithPredict(model, prompt);
      } else {
        return await generateWithContent(model, prompt);
      }
    } catch (e) {
      console.warn(`  ⚠ ${model}: ${e.message.substring(0, 80)}`);
    }
  }
  throw new Error('All models exhausted');
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  if (!API_KEY) {
    console.error('Missing GEMINI_API_KEY in .env');
    process.exit(1);
  }

  // Create output directories
  for (const theme of Object.keys(THEMES)) {
    fs.mkdirSync(path.join(OUTPUT_DIR, theme), { recursive: true });
  }

  let generated = 0;
  let skipped = 0;

  for (const [themeId, themeDef] of Object.entries(THEMES)) {
    console.log(`\n🎨 Theme: ${themeId.toUpperCase()}`);

    for (let i = 0; i < AVATARS_PER_THEME; i++) {
      const outFile = path.join(OUTPUT_DIR, themeId, `avatar-${i + 1}.png`);

      // Skip if already exists
      if (fs.existsSync(outFile)) {
        console.log(`  ✓ avatar-${i + 1}.png already exists, skipping`);
        skipped++;
        continue;
      }

      const character = CHARACTERS[i];
      const prompt = `Create a stylized square avatar portrait of ${character}. ${themeDef.style}. Background: ${themeDef.bg}. The character should be centered, facing forward, bust/head shot only. Bold graphic style, thick outlines, highly stylized — NOT photorealistic. No text, no words, no letters. Suitable as a player avatar in a party game app. Square 1:1 ratio.`;

      console.log(`  🖌 Generating avatar-${i + 1}.png (${character.substring(0, 40)}...)`);

      try {
        const imageData = await generateImage(prompt);
        fs.writeFileSync(outFile, imageData);
        console.log(`  ✅ avatar-${i + 1}.png saved (${(imageData.length / 1024).toFixed(0)}KB)`);
        generated++;
      } catch (e) {
        console.error(`  ❌ Failed: ${e.message}`);
        if (e.message === 'All models exhausted') {
          console.error('\n💀 All Imagen models are exhausted. Try again later.');
          console.log(`\nGenerated: ${generated}, Skipped: ${skipped}`);
          process.exit(1);
        }
      }

      // Rate limit: wait between requests
      await sleep(2000);
    }
  }

  console.log(`\n🎉 Done! Generated: ${generated}, Skipped: ${skipped}`);
  console.log(`Avatars saved to: ${OUTPUT_DIR}`);
}

main().catch(console.error);
