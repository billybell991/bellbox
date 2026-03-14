// BellBox — Gemini Audio Processing Utility
// Handles speech-to-text transcription and AI audio analysis via Gemini

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

let model = null;

if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-api-key-here') {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
  } catch { /* handled in trivia.js already */ }
}

/**
 * Transcribe audio to text using Gemini
 * @param {string} base64Audio - Base64-encoded audio data
 * @param {string} mimeType - Audio MIME type (e.g., 'audio/webm')
 * @returns {Promise<string>} Transcribed text
 */
export async function transcribeAudio(base64Audio, mimeType = 'audio/webm') {
  if (!model) return '[Voice message]';

  try {
    const result = await model.generateContent([
      { text: 'Transcribe this audio exactly. Return ONLY the transcribed text, nothing else. If the audio is unintelligible or empty, return "[inaudible]".' },
      { inlineData: { mimeType, data: base64Audio } },
    ]);
    const text = result.response.text().trim();
    return text || '[inaudible]';
  } catch (e) {
    console.warn('Gemini transcription failed:', e.message);
    return '[Voice message]';
  }
}

/**
 * Analyze/judge audio with a custom prompt (for AI games)
 * @param {string} base64Audio - Base64-encoded audio data
 * @param {string} mimeType - Audio MIME type
 * @param {string} prompt - The analysis prompt
 * @returns {Promise<string>} AI response text
 */
export async function analyzeAudio(base64Audio, mimeType = 'audio/webm', prompt) {
  if (!model) return 'AI unavailable — using text fallback.';

  try {
    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { mimeType, data: base64Audio } },
    ]);
    return result.response.text().trim();
  } catch (e) {
    console.warn('Gemini audio analysis failed:', e.message);
    return 'AI could not process the audio.';
  }
}

export function isAudioAvailable() {
  return model !== null;
}
