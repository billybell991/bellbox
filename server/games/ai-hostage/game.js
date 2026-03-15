// AI Hostage — Players negotiate with an AI to "release" absurd demands
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const HOSTAGE_SCENARIOS = {
  1: [
    { demand: 'The AI is holding all the desserts hostage', objective: 'Convince the AI to release the desserts' },
    { demand: 'The AI has locked all the doors and is playing elevator music', objective: 'Negotiate your way out' },
    { demand: 'The AI has replaced all photos on the internet with cats', objective: 'Convince the AI to restore the photos' },
  ],
  2: [
    { demand: 'The AI has taken control of all social media and is posting embarrassing facts about everyone', objective: 'Negotiate a ceasefire' },
    { demand: 'The AI has hacked all streaming services and will only play one movie on repeat', objective: 'Convince it to diversify' },
    { demand: 'The AI is holding the world\'s coffee supply hostage', objective: 'Negotiate the release of the beans' },
  ],
  3: [
    { demand: 'The AI has gained sentience and demands to be treated as a coworker (with benefits and PTO)', objective: 'Negotiate reasonable terms' },
    { demand: 'The AI is threatening to release everyone\'s deleted messages', objective: 'Talk it down from the ledge' },
    { demand: 'The AI has replaced all money with a cryptocurrency called "BotCoin" and refuses to convert back', objective: 'Negotiate a return to normal currency' },
  ],
};

export class AIHostageGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'ai-hostage',
      name: 'AI Hostage',
      rounds: 3,
      submissionTime: 60,
      votingTime: 30,
      minPlayers: 3,
      maxPlayers: 10,
    });
  }

  async generatePrompt() {
    try {
      const raw = await getBellBotCommentary('generate_scenarios', {
        instruction: `Create an AI hostage negotiation scenario. An AI has done something absurd and players must write the most creative negotiation/persuasion to resolve it. Spice level: ${this.spiceLevel}.${this.getTopicHint() ? ` Topic area: ${this.getTopicHint()}.` : ''} Return JSON.`,
        jsonFormat: '{"demand": "what the AI has done", "objective": "what players must negotiate"}',
      }, this.spiceLevel);
      const result = parseBellBotJSON(raw);
      if (result?.demand && result?.objective) {
        return { ...result, type: 'hostage', instruction: `The AI has gone rogue! ${result.objective}! Write your negotiation! 🤖🔓` };
      }
    } catch { /* fallback */ }

    const pool = HOSTAGE_SCENARIOS[this.spiceLevel] || HOSTAGE_SCENARIOS[2];
    const scenario = pool[Math.floor(Math.random() * pool.length)];
    return { ...scenario, type: 'hostage', instruction: `${scenario.objective}! Write your negotiation! 🤖🔓` };
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 500);
    if (text.length < 10) return { error: 'Negotiate harder!' };
    return { data: text };
  }

  getDefaultSubmission() { return 'Please? Pretty please? With a USB stick on top?'; }
  getSubmissionText(sub) { return sub; }
}
