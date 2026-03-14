// Bad Influence — Players give terrible advice, one is real, vote for worst
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const SITUATIONS = {
  1: [
    'Your friend is nervous about their first day at a new school',
    'Someone asks you how to make friends with a squirrel',
    'A kid wants to know the best way to eat spaghetti',
    'Someone needs help planning a surprise party',
    'A person asks for advice on how to get their cat to like them',
  ],
  2: [
    'Your friend asks how to get out of a boring conversation at a party',
    'Someone wants advice on how to ask for a raise',
    'A coworker needs tips on surviving a Monday morning meeting',
    'Someone asks how to impress on a first date',
    'Your friend wants to know how to deal with a terrible roommate',
  ],
  3: [
    'Someone asks how to fake being sick to skip work',
    'A friend needs advice on responding to their ex\'s 2am text',
    'Someone wants to know how to quit their job dramatically',
    'A person asks how to win an argument they\'re clearly wrong about',
    'Someone wants advice on how to outrun their responsibilities',
  ],
};

export class BadInfluenceGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'bad-influence',
      name: 'Bad Influence',
      rounds: 4,
      submissionTime: 45,
      votingTime: 30,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.usedSituations = new Set();
  }

  async generatePrompt() {
    try {
      const raw = await getBellBotCommentary('generate_prompt', {
        gameName: this.gameName,
        count: 1,
        description: 'Players give the WORST possible advice for a situation. The most hilariously terrible advice wins.',
        extra: `Spice level: ${this.spiceLevel}. Generate ONE situation where someone needs advice. Players will give the worst advice possible.`,
      }, this.spiceLevel);
      const prompts = parseBellBotJSON(raw);
      if (prompts?.[0]) return { text: prompts[0], type: 'bad-advice', instruction: 'Give the WORST advice possible! 😈' };
    } catch { /* fallback */ }

    const pool = SITUATIONS[this.spiceLevel] || SITUATIONS[2];
    const available = pool.filter(s => !this.usedSituations.has(s));
    const list = available.length > 0 ? available : pool;
    const situation = list[Math.floor(Math.random() * list.length)];
    this.usedSituations.add(situation);
    return { text: situation, type: 'bad-advice', instruction: 'Give the WORST advice possible! 😈' };
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 300);
    if (text.length < 5) return { error: 'Give some advice!' };
    return { data: text };
  }

  getDefaultSubmission() { return 'Just wing it, what could go wrong?'; }
  getSubmissionText(sub) { return sub; }
}
