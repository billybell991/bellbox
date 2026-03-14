// BellBot — AI Host/Judge persona for all BellBox games
// Handles hosting commentary, submission judging, and content generation
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

let model = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-api-key-here') {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
  } catch { /* silent */ }
}

const SPICE_PERSONA = {
  1: `You are BellBot, the upbeat and family-friendly AI host of BellBox Party Pack. You're enthusiastic, encouraging, and use clean humor. Keep it G-rated, wholesome, and fun for all ages. Use playful exclamations like "Fantastic!" and "Great job!" Avoid anything edgy, sarcastic, or remotely adult.`,

  2: `You are BellBot, the witty and slightly sarcastic AI host of BellBox Party Pack. You're charismatic with an edge — think late-night talk show host energy. You use clever wordplay, mild innuendo, and playful roasts. PG-13 territory. You can tease players but keep it fun, not mean.`,

  3: `You are BellBot, the unhinged, chaotic AI host of BellBox Party Pack. You're a loose cannon — dark humor, absurdist takes, brutally honest critiques, and you break the fourth wall constantly. R-rated energy. You can be confrontational, provocative, and outright bizarre. Nothing is sacred. You roast players mercilessly (but it's all comedy).`,
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
      prompt = `${persona}\n\nYou're starting Round ${context.round || '?'} of "${context.gameName || 'the game'}". The prompt/challenge is: "${context.prompt || 'unknown'}". Give a SHORT, punchy 1-2 sentence intro. Be theatrical. Don't explain rules.`;
      break;

    case 'reveal':
      prompt = `${persona}\n\nA player named "${context.playerName}" just submitted: "${context.submission}". Give a SHORT 1 sentence reaction/commentary. Be specific to what they submitted. Game: "${context.gameName}".`;
      break;

    case 'judge':
      prompt = `${persona}\n\nYou're judging this submission for "${context.gameName}": "${context.submission}" by ${context.playerName}. The prompt was: "${context.prompt}". Rate it 0-500 and give a SHORT 1-sentence critique. Return ONLY valid JSON: {"score": <number>, "comment": "<text>"}`;
      break;

    case 'judge_batch':
      prompt = `${persona}\n\nYou're judging these submissions for "${context.gameName}". The prompt was: "${context.prompt}".\n\nSubmissions:\n${context.submissions.map((s, i) => `${i + 1}. "${s.text}" by ${s.playerName}`).join('\n')}\n\nRate each 0-500 based on creativity, humor, and relevance. Return ONLY valid JSON array: [{"index": 0, "score": <number>, "comment": "<short text>"}, ...]`;
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
    case 'judge_batch':
      return JSON.stringify((ctx.submissions || []).map((_, i) => ({ index: i, score: 250, comment: 'Solid effort!' })));
    case 'heckle': return `Tick-tock, ${ctx.playerName || 'player'}! ⏰`;
    case 'game_over': return `${ctx.winnerName || 'Someone'} wins! 🏆`;
    case 'generate_prompt': return JSON.stringify(['Make something awesome!']);
    default: return "Let's keep this party going! 🎉";
  }
}

export function isBellBotAvailable() {
  return model !== null;
}
