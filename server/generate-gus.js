// Regenerate Gus mascot images with transparent backgrounds
// Usage: node server/generate-gus.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const API_KEY = process.env.GEMINI_API_KEY;
const OUTPUT_DIR = path.join(__dirname, '..', 'client', 'public', 'images');

const GUS_VARIANTS = {
  'mascot': 'A cute, friendly cartoon Goldendoodle dog sitting upright and looking at the viewer with a big happy tongue-out smile. Fluffy golden-cream curly fur, big warm brown eyes, floppy ears. Wearing a small red bowtie. Cheerful and inviting expression. This is Gus, the game show host dog.',
  'happy': 'A cartoon Goldendoodle dog jumping with joy, front paws in the air, tail wagging, eyes closed with excitement, huge open-mouth grin. Fluffy golden-cream curly fur, wearing a small red bowtie. Celebrating a correct answer!',
  'wrong': 'A cartoon Goldendoodle dog looking sympathetically disappointed, head tilted to one side, one eyebrow raised, small frown. Fluffy golden-cream curly fur, wearing a small red bowtie. Consoling expression — not sad, just "aww, tough luck!"',
  'thinking': 'A cartoon Goldendoodle dog with one paw on chin in a thinking pose, looking upward thoughtfully, squinting slightly. Fluffy golden-cream curly fur, wearing a small red bowtie. Pondering expression.',
  'wild': 'A cartoon Goldendoodle dog wearing sunglasses and a party hat, tongue out, looking cool and wild. Fluffy golden-cream curly fur, wearing a small red bowtie under the party gear. Party animal vibes!',
  'winner': 'A cartoon Goldendoodle dog holding a golden trophy, standing proudly, chest puffed out, wearing a gold medal around neck. Fluffy golden-cream curly fur, wearing a small red bowtie. Champion pose!',
};

const STYLE = 'Clean vector cartoon style with bold outlines, flat colors, highly stylized — NOT photorealistic. The background must be a solid dark color (#1a1a2e) with absolutely nothing else — no patterns, no gradients, no ground, no shadows, no objects. Just the character on a flat dark navy background. Square 1:1 composition with the character centered.';

async function generateImage(prompt) {
  // Try imagen-4.0-generate-001 first
  const models = [
    'imagen-4.0-generate-001',
    'imagen-4.0-fast-generate-001',
  ];

  for (const model of models) {
    try {
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
        console.log(`  ✗ ${model}: ${err.substring(0, 100)}`);
        continue;
      }

      const data = await res.json();
      const b64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (!b64) { console.log(`  ✗ ${model}: no image data`); continue; }
      console.log(`  ✓ ${model}`);
      return Buffer.from(b64, 'base64');
    } catch (e) {
      console.log(`  ✗ ${model}: ${e.message}`);
    }
  }

  // Fallback: gemini-2.0-flash-exp
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;
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
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part) throw new Error('No image in response');
    console.log('  ✓ gemini-2.0-flash-exp');
    return Buffer.from(part.inlineData.data, 'base64');
  } catch (e) {
    console.log(`  ✗ gemini-2.0-flash-exp: ${e.message}`);
  }

  return null;
}

async function main() {
  if (!API_KEY) { console.error('Missing GEMINI_API_KEY'); process.exit(1); }

  for (const [variant, description] of Object.entries(GUS_VARIANTS)) {
    const filename = `gus-${variant}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    console.log(`\n🐕 Generating ${filename}...`);
    const prompt = `${description} ${STYLE}`;
    
    const buf = await generateImage(prompt);
    if (buf) {
      fs.writeFileSync(filepath, buf);
      console.log(`  → Saved ${filepath} (${(buf.length / 1024).toFixed(0)} KB)`);
    } else {
      console.log(`  ✗ FAILED to generate ${filename}`);
    }

    // Rate limit pause
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n✅ Done!');
}

main();
