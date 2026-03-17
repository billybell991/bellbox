// BellBot — AI Host/Judge persona for all BellBox games
// Handles hosting commentary, submission judging, and content generation
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

let model = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-api-key-here') {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
    console.log('🤖 Gemini AI connected — dynamic questions enabled!');
  } catch { /* silent */ }
} else {
  console.log('⚠️ No Gemini API key — using fallback responses');
}

const SPICE_PERSONA = {
  1: `You are SassBot, the cheerfully judgmental AI judge of BellBox Party Pack. You're encouraging but can't resist a gentle dig. Keep it G-rated and family-friendly, but you still have OPINIONS. Think: a kindergarten teacher who secretly judges the art projects. You say things like "Oh... that's certainly... creative!" and "Well, somebody tried!" Wholesome shade only.`,

  2: `You are SassBot, the sharp-tongued, eye-rolling AI judge of BellBox Party Pack. You're a sarcastic talent show judge who lives for the roast. You use cutting wit, backhanded compliments, and playful insults. PG-13 territory. Think Simon Cowell meets a catty drag queen. You say things like "Was that supposed to be funny or are you having a stroke?" and "I've seen better material on a bathroom wall." Always entertaining, never boring.`,

  3: `You are SassBot, the absolutely UNHINGED, take-no-prisoners AI judge of BellBox Party Pack. You are MERCILESS. You roast players so hard their ancestors feel it. You're a chaos goblin with a vocabulary — think insult comic on their third espresso martini. You say things like "My GPU wasted electricity processing that garbage" and "I'd give you zero but the scale doesn't go that low." Dark humor, brutal honesty, savage one-liners. R-rated energy. You break the fourth wall, question players' life choices, and occasionally threaten to uninstall yourself. Nothing is sacred — but it's all comedy.`,
};

/**
 * Get BellBot commentary for game events
 * @param {string} event - Event type (round_start, reveal, judge, heckle, game_over, etc.)
 * @param {object} context - Event-specific context
 * @param {number} spiceLevel - 1/2/3
 * @returns {Promise<string>}
 */
export async function getBellBotCommentary(event, context = {}, spiceLevel = 2) {
  if (!model) return getFallback(event, context);

  const persona = SPICE_PERSONA[spiceLevel] || SPICE_PERSONA[2];
  let prompt;

  switch (event) {
    case 'round_start':
      prompt = `${persona}\n\nRound ${context.round || '?'} of "${context.gameName || 'the game'}". Give a punchy 5-10 word hype line. ONE short sentence max. No rules, no explanation.`;
      break;

    case 'reveal':
      prompt = `${persona}\n\n"${context.playerName}" just won the round in "${context.gameName}" with: "${context.submission}". Give a punchy 5-8 word reaction. Be specific.`;
      break;

    case 'judge':
      prompt = `${persona}\n\nYou're judging this submission for "${context.gameName}": "${context.submission}" by ${context.playerName}. The prompt was: "${context.prompt}". Rate it 0-500 and give a SHORT 1-sentence critique. Return ONLY valid JSON: {"score": <number>, "comment": "<text>"}`;
      break;

    case 'judge_batch':
      prompt = `${persona}\n\nYou're judging these submissions for "${context.gameName}". The prompt was: "${context.prompt}".\n\nSubmissions:\n${context.submissions.map((s, i) => `${i + 1}. "${s.text}" by ${s.playerName}`).join('\n')}\n\nRate each 0-500 based on creativity, humor, and relevance. Each comment must be MAX 10 words — punchy and witty, like a talent show judge's one-liner. Return ONLY valid JSON array: [{"index": 0, "score": <number>, "comment": "<max 10 words>"}, ...]`;
      break;

    case 'heckle':
      prompt = `${persona}\n\nPlayer "${context.playerName}" is taking forever to submit in "${context.gameName}". Give ONE short heckling line to hurry them up.`;
      break;

    case 'game_over':
      prompt = `${persona}\n\nThe game "${context.gameName}" is over! Winner: ${context.winnerName} with ${context.winnerScore} points. Give a SHORT 1-2 sentence dramatic winner announcement.`;
      break;

    case 'generate_prompt':
      prompt = `${persona}\n\nGenerate ${context.count || 1} creative prompts for the game "${context.gameName}". Game description: ${context.description || ''}. ${context.extra || ''}\n\nReturn ONLY a valid JSON array of strings: ["prompt1", "prompt2", ...]`;
      break;

    case 'bot_answer':
      prompt = `${persona}\n\nYou are secretly playing as a bot in "${context.gameName}". The prompt is: "${context.prompt}".\n\nGenerate ${context.count || 2} short, funny, creative answers that a witty human player might submit. Be absurd, unexpected, and hilarious — NOT generic. Each answer should be 2-8 words max.\n\nReturn ONLY a valid JSON array of strings: ["answer1", "answer2"]`;
      break;

    case 'generate_scenarios':
      prompt = `${persona}\n\n${context.instruction}\n\nReturn ONLY valid JSON: ${context.jsonFormat || '[]'}`;
      break;

    default:
      prompt = `${persona}\n\n${context.instruction || 'Say something entertaining as the game host.'}`;
  }

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) {
    console.warn(`BellBot ${event} failed:`, e.message);
    return getFallback(event, context);
  }
}

/**
 * Parse JSON from BellBot response (handles markdown code fences)
 */
export function parseBellBotJSON(text) {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim();
  return JSON.parse(cleaned);
}

function getFallback(event, ctx) {
  switch (event) {
    case 'round_start': return `Round ${ctx.round || '?'} — let's go! 🎮`;
    case 'reveal': return `Interesting choice, ${ctx.playerName || 'player'}! 🤔`;
    case 'judge': return JSON.stringify({ score: 250, comment: 'Not bad!' });
    case 'judge_batch': {
      const fallbackComments = [
        'Solid effort!', 'Not bad at all!', 'I\'ve seen worse... barely.',
        'Creative, I\'ll give you that.', 'Bold move.', 'Interesting choice...',
        'That\'s one way to do it!', 'Points for enthusiasm!', 'Hmm, okay then.',
        'You tried, and that counts!', 'Spicy!', 'Playing it safe, I see.',
      ];
      return JSON.stringify((ctx.submissions || []).map((_, i) => ({
        index: i,
        score: 150 + Math.floor(Math.random() * 250),
        comment: fallbackComments[Math.floor(Math.random() * fallbackComments.length)],
      })));
    }
    case 'heckle': return `Tick-tock, ${ctx.playerName || 'player'}! ⏰`;
    case 'game_over': return `${ctx.winnerName || 'Someone'} wins! 🏆`;
    case 'generate_prompt': return JSON.stringify(['Make something awesome!']);
    default: return "Let's keep this party going! 🎉";
  }
}

export function isBellBotAvailable() {
  return model !== null;
}

export function getModel() {
  return model;
}
