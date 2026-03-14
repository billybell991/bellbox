// Hot Potato — Pass the "potato" quickly, don't be holding it when time's up!
// Players must type a valid answer to a category before passing
import { BaseGame, STATES } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const CATEGORIES = [
  'Name a movie', 'Name a fruit', 'Name a country', 'Name a color',
  'Name a song', 'Name a sport', 'Name an animal', 'Name a TV show',
  'Name a brand', 'Name a city', 'Name a food you eat for breakfast',
  'Name a board game', 'Name a famous person', 'Name a body of water',
  'Name something you find in a kitchen', 'Name a holiday',
  'Name something round', 'Name a musical instrument',
  'Name a three-letter word', 'Name something you wear',
];

export class HotPotatoGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'hot-potato',
      name: 'Hot Potato',
      rounds: 5,
      submissionTime: 6, // Tight timer per person!
      votingTime: 0,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.currentHolder = null;
    this.usedAnswers = new Set();
    this.passCount = 0;
    this.eliminatedThisRound = null;
  }

  async generatePrompt() {
    this.usedAnswers.clear();
    this.passCount = 0;
    this.eliminatedThisRound = null;
    this.currentHolder = this.playerOrder[Math.floor(Math.random() * this.playerOrder.length)];

    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    return {
      text: category,
      type: 'hot-potato',
      instruction: `${category}! Type fast — if time runs out while YOU hold the potato, you're OUT! 🥔💣`,
      holder: this.currentHolder,
    };
  }

  /** Each "submission" passes the potato — must name something in the category */
  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 50);
    if (!text) return { error: 'Name something!' };
    if (this.usedAnswers.has(text.toLowerCase())) return { error: 'Already said!' };
    return { data: text };
  }

  submitEntry(socketId, submission) {
    if (socketId !== this.currentHolder) return { error: 'You don\'t have the potato!' };
    const validated = this.validateSubmission(submission);
    if (validated.error) return validated;

    this.usedAnswers.add(validated.data.toLowerCase());
    this.passCount++;

    // Pass to next player
    const currentIdx = this.playerOrder.indexOf(this.currentHolder);
    const nextIdx = (currentIdx + 1) % this.playerOrder.length;
    this.currentHolder = this.playerOrder[nextIdx];

    return {
      success: true,
      answer: validated.data,
      nextHolder: this.currentHolder,
      nextHolderName: this.players.get(this.currentHolder)?.name,
      passCount: this.passCount,
    };
  }

  /** When timer expires, current holder "explodes" */
  async lockSubmissions() {
    // Current holder loses points
    this.eliminatedThisRound = this.currentHolder;
    const eliminated = this.players.get(this.currentHolder);

    const roundScores = [];
    for (const id of this.playerOrder) {
      const player = this.players.get(id);
      let points = id === this.currentHolder ? 0 : 200;
      player.score += points;
      roundScores.push({
        id, name: player.name,
        aiScore: 0, voteScore: points, roundTotal: points,
        cumulativeScore: player.score,
        aiComment: id === this.currentHolder ? 'BOOM! 💥🥔' : 'Safe! 😅',
      });
    }

    roundScores.sort((a, b) => b.roundTotal - a.roundTotal);
    this.state = this.round >= this.totalRounds ? STATES.GAME_OVER : STATES.ROUND_END;

    return {
      state: this.state, round: this.round, roundScores,
      leaderboard: this.getScores(),
      eliminated: eliminated?.name,
      bellbotSays: `💥 BOOM! ${eliminated?.name} was caught holding the potato! ${this.passCount} passes this round!`,
      gameOver: this.state === STATES.GAME_OVER,
    };
  }

  getState(socketId) {
    const base = super.getState(socketId);
    base.currentHolder = this.currentHolder;
    base.currentHolderName = this.players.get(this.currentHolder)?.name;
    base.isMyTurn = socketId === this.currentHolder;
    base.usedAnswers = [...this.usedAnswers];
    return base;
  }

  getDefaultSubmission() { return ''; }
  getSubmissionText(sub) { return sub; }
}
