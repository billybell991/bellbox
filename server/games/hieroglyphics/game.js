// High-roglyphics — AI generates emoji rebus puzzles, players guess the answer
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

// Egyptian host character — Pharaoh Punhotep
const PHARAOH_PUNS = {
  intro: [
    'The sphinx has spoken! Decode or be mummified!',
    'By the Nile, these emojis hold ancient secrets...',
    'Pharaoh decrees: solve this or clean the pyramids!',
    'The hieroglyphs are revealed! May Anubis guide you.',
    'Even Cleopatra couldn\'t solve this one... or could she?',
    'Another tablet from the tomb! Let the guessing begin!',
    'The sarcophagus opens... what do these symbols mean?',
    'Behold! A message from the ancient emoji gods!',
  ],
  correct: [
    'By Ra\'s light, you cracked the code!',
    'The pharaoh is impressed! You may keep your head.',
    'Sphinx-level intellect! Well decoded!',
    'Tutankhamun would be proud!',
    'You read hieroglyphs like a true scribe!',
  ],
  close: [
    'Almost, mortal! The tomb trembles with your near-wisdom.',
    'So close the mummy almost clapped!',
    'The sphinx raises an eyebrow... not quite!',
    'Warm like the desert sun, but not quite gold!',
  ],
  wrong: [
    'The curse activates! That was... not it.',
    'Even the scarab beetles are cringing.',
    'Pharaoh hides behind his sarcophagus in shame.',
    'The Nile flows with your tears of failure!',
  ],
};

function randomPun(category) {
  const puns = PHARAOH_PUNS[category] || PHARAOH_PUNS.intro;
  return puns[Math.floor(Math.random() * puns.length)];
}

export class HieroglyphicsGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'hieroglyphics',
      name: 'High-roglyphics',
      rounds: 4,
      submissionTime: 30,
      votingTime: 0, // No voting phase — scoring is answer-based
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.usedAnswers = new Set();
    this.currentAnswer = null; // The correct answer
    this.currentEmojis = null; // The emoji rebus
    this.currentCategory = null; // phrase / celebrity / brand / etc.
  }

  async generatePrompt() {
    const topicHint = this.getTopicHint();
    const categoryPool = ['phrase', 'celebrity', 'movie', 'brand', 'song', 'food', 'place', 'animal', 'TV show'];
    const category = categoryPool[Math.floor(Math.random() * categoryPool.length)];
    const usedList = [...this.usedAnswers].join(', ');

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const raw = await getBellBotCommentary('generate_scenarios', {
          instruction: `Generate a rebus puzzle for the game "High-roglyphics". Pick a well-known ${category} and represent it using ONLY emojis (4-8 emojis). Players will try to guess the answer from the emojis. Spice level: ${this.spiceLevel}.${topicHint ? ` Topic area: ${topicHint}.` : ''} Pick something widely recognizable. The emojis should be a creative visual representation, not just literally spelling it out.${usedList ? ` DO NOT use any of these answers (already used): ${usedList}.` : ''}`,
          jsonFormat: `{"answer": "the thing being represented", "emojis": "the emoji sequence", "hint": "a one-word category hint like Movie or Celebrity"}`,
        }, this.spiceLevel);
        const parsed = parseBellBotJSON(raw);
        if (parsed?.answer && parsed?.emojis) {
          // Skip if duplicate
          if (this.usedAnswers.has(parsed.answer.toLowerCase())) continue;
          this.currentAnswer = parsed.answer;
          this.currentEmojis = parsed.emojis;
          this.currentCategory = parsed.hint || parsed.category || category;
          this.usedAnswers.add(parsed.answer.toLowerCase());
          return {
            text: parsed.emojis,
            type: 'rebus',
            instruction: `What ${this.currentCategory} do these emojis represent?`,
            hostMessage: randomPun('intro'),
            category: this.currentCategory,
          };
        }
      } catch (e) { console.warn(`HR rebus attempt ${attempt + 1} failed:`, e.message); }
    }

    // Last-resort fallback: ask Gemini for literally anything, no topic/category constraints
    try {
      const raw = await getBellBotCommentary('generate_scenarios', {
        instruction: `Generate an emoji rebus puzzle for a party game. Pick ANY well-known thing — a movie, phrase, celebrity, food, place, song, brand, anything at all — and represent it with 4-8 emojis. Just pick something fun and universally recognizable.${[...this.usedAnswers].length ? ` Avoid these: ${[...this.usedAnswers].join(', ')}.` : ''}`,
        jsonFormat: `{"answer": "the thing", "emojis": "the emoji sequence", "hint": "one-word category like Movie or Phrase"}`,
      }, this.spiceLevel);
      const parsed = parseBellBotJSON(raw);
      if (parsed?.answer && parsed?.emojis) {
        this.currentAnswer = parsed.answer;
        this.currentEmojis = parsed.emojis;
        this.currentCategory = parsed.hint || 'Thing';
        this.usedAnswers.add(parsed.answer.toLowerCase());
        return {
          text: parsed.emojis,
          type: 'rebus',
          instruction: `What ${this.currentCategory} do these emojis represent?`,
          hostMessage: randomPun('intro'),
          category: this.currentCategory,
        };
      }
    } catch (e) { console.warn('HR last-resort fallback failed:', e.message); }

    // Absolute last resort — shouldn't happen unless Gemini is completely down
    this.currentAnswer = 'Sunshine';
    this.currentEmojis = '☀️😎🌈🌻';
    this.currentCategory = 'Thing';
    return {
      text: this.currentEmojis,
      type: 'rebus',
      instruction: 'What do these emojis represent?',
      hostMessage: randomPun('intro'),
      category: 'Thing',
    };
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 100);
    if (!text) return { error: 'Type your guess!' };
    return { data: text };
  }

  /** Score based on correctness — AI evaluates closeness */
  async scoreSubmissions() {
    const submissions = [];
    for (const [socketId, sub] of this.submissions) {
      const player = this.players.get(socketId);
      if (player) submissions.push({ socketId, playerName: player.name, text: sub });
    }

    if (submissions.length === 0) return;

    try {
      const raw = await getBellBotCommentary('judge_batch', {
        gameName: 'High-roglyphics',
        prompt: `Emoji rebus: ${this.currentEmojis} — The correct answer is "${this.currentAnswer}" (${this.currentCategory}). Score based on closeness: exact match=500, synonym/close=350-450, partial=150-300, wrong=0-100`,
        submissions: submissions.map(s => ({ playerName: s.playerName, text: s.text })),
      }, this.spiceLevel);
      const results = parseBellBotJSON(raw);
      if (Array.isArray(results)) {
        for (const r of results) {
          const sub = submissions[r.index];
          if (sub) {
            const score = Math.min(500, Math.max(0, Math.round(r.score || 0)));
            this.aiScores.set(sub.socketId, { score, comment: r.comment || '' });
          }
        }
        // Fill in any unscored players with fallback
        const unscored = submissions.filter(s => !this.aiScores.has(s.socketId));
        if (unscored.length === 0) return;
        // Fall through to fallback for unscored only
        for (const sub of unscored) {
          const guess = sub.text.toLowerCase().trim();
          const answer = this.currentAnswer.toLowerCase().trim();
          let score = 0;
          if (guess === answer) score = 500;
          else if (answer.includes(guess) || guess.includes(answer)) score = 300;
          else score = Math.floor(Math.random() * 80) + 10;
          const category = score >= 400 ? 'correct' : score >= 200 ? 'close' : 'wrong';
          this.aiScores.set(sub.socketId, { score, comment: randomPun(category) });
        }
        return;
      }
    } catch { /* fallback */ }

    // Fallback: simple string matching
    for (const sub of submissions) {
      const guess = sub.text.toLowerCase().trim();
      const answer = this.currentAnswer.toLowerCase().trim();
      let score = 0;
      if (guess === answer) score = 500;
      else if (answer.includes(guess) || guess.includes(answer)) score = 300;
      else score = Math.floor(Math.random() * 80) + 10;
      const category = score >= 400 ? 'correct' : score >= 200 ? 'close' : 'wrong';
      this.aiScores.set(sub.socketId, { score, comment: randomPun(category) });
    }
  }

  /** Override tallyScores to use our custom scoring */
  async tallyScores() {
    await this.scoreSubmissions();

    const roundScores = [];
    for (const [socketId, scoreData] of this.aiScores) {
      const player = this.players.get(socketId);
      if (player) {
        player.score = (player.score || 0) + scoreData.score;
        roundScores.push({
          id: socketId,
          name: player.name,
          submission: this.submissions.get(socketId),
          aiScore: scoreData.score,
          aiComment: scoreData.comment,
          roundTotal: scoreData.score,
          cumulativeScore: player.score,
        });
      }
    }

    roundScores.sort((a, b) => b.roundTotal - a.roundTotal);

    this.state = this.round >= this.totalRounds ? 'GAME_OVER' : 'ROUND_END';

    // Pharaoh host commentary
    let pharaohCategory = 'wrong';
    if (roundScores.length === 0) pharaohCategory = 'intro';
    else if (roundScores[0]?.aiScore >= 400) pharaohCategory = 'correct';
    else if (roundScores[0]?.aiScore >= 200) pharaohCategory = 'close';
    const pharaohSays = `${randomPun(pharaohCategory)} The answer was: ${this.currentAnswer}!`;

    return {
      state: this.state,
      round: this.round,
      roundScores,
      leaderboard: this.getScores(),
      bellbotSays: pharaohSays,
      prompt: this.currentPrompt,
      gameOver: this.state === 'GAME_OVER',
      correctAnswer: this.currentAnswer,
    };
  }

  getDefaultSubmission() { return '???'; }
  getSubmissionText(sub) { return sub; }

  // Skip base getAIScores — our tallyScores handles scoring via scoreSubmissions
  async getAIScores() { }
}
