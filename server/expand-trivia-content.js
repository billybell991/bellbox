// Expand Trivia Fetch question pool using Gemini
// Generates 30 questions per category across all categories
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const CATEGORIES = [
  'geography', 'entertainment', 'history', 'art', 'science', 'sports',
  'disney', 'harrypotter', 'horror', 'animals', 'tv', 'movies',
  'music', 'videogames', 'food', 'mythology', 'space', 'technology',
  'comics', 'nostalgia'
];

async function generateJSON(prompt) {
  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  return JSON.parse(text);
}

async function main() {
  console.log('🧠 Generating expanded trivia question pool with Gemini...\n');

  const allQuestions = {};

  for (const category of CATEGORIES) {
    const categoryName = {
      geography: 'Geography', entertainment: 'Entertainment', history: 'History',
      art: 'Art & Literature', science: 'Science & Nature', sports: 'Sports & Leisure',
      disney: 'Disney', harrypotter: 'Harry Potter', horror: 'Horror',
      animals: 'Animals', tv: 'TV Shows', movies: 'Movies',
      music: 'Music', videogames: 'Video Games', food: 'Food & Drink',
      mythology: 'Mythology', space: 'Space', technology: 'Technology',
      comics: 'Comics & Anime', nostalgia: '90s & 2000s Nostalgia',
    }[category] || category;
    console.log(`  Generating ${categoryName}...`);
    try {
      const data = await generateJSON(`You are a trivia question writer for a fun multiplayer party game called "Trivia Fetch!" hosted by Gus the Goldendoodle.

Generate exactly 30 trivia questions for the category: "${categoryName}"

Requirements:
- Mix of easy (10), medium (10), and hard (10) difficulty
- All 4 answer options must be plausible (no joke/obvious wrong answers)
- Each question gets a brief, delightful fun fact about the correct answer
- Questions should be fun and interesting, not dry textbook stuff
- Cover a wide range of subtopics within the category
- No duplicate concepts

OUTPUT FORMAT (strict JSON array, no markdown):
[
  {"question":"...","options":["A","B","C","D"],"correctIndex":0,"funFact":"...","difficulty":"easy"},
  ...
]`);
      allQuestions[category] = data;
      console.log(`    ✓ Got ${data.length} questions for ${categoryName}`);
    } catch (err) {
      console.error(`    ✗ Failed for ${categoryName}: ${err.message}`);
      allQuestions[category] = [];
    }
  }

  const outputPath = path.join(__dirname, 'trivia-expansion-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(allQuestions, null, 2));

  const total = Object.values(allQuestions).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`\n✅ Generated ${total} questions across ${CATEGORIES.length} categories`);
  console.log(`   Saved to ${outputPath}`);
}

main().catch(err => { console.error('Failed:', err.message); process.exit(1); });
