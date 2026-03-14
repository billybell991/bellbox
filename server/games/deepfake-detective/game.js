// Deepfake Detective — One answer is AI-generated, players find the fake
import { BaseGame, STATES } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const QUESTIONS = [
  'What\'s the most embarrassing thing that happened to you this year?',
  'What\'s a weird habit you have that nobody knows about?',
  'What\'s your most unpopular opinion?',
  'What\'s the strangest dream you\'ve ever had?',
  'If you could have dinner with anyone, dead or alive, who and why?',
  'What\'s the dumbest thing you believed as a kid?',
  'What would your autobiography be titled?',
  'What\'s your go-to karaoke song?',
  'What conspiracy theory do you secretly find convincing?',
  'What would you do with a million dollars but you have to spend it in 24 hours?',
];

export class DeepfakeDetectiveGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'deepfake-detective',
      name: 'Deepfake Detective',
      rounds: 4,
      submissionTime: 45,
      votingTime: 40,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.aiAnswer = null;
    this.aiPlayerId = 'ai-faker';
    this.usedQuestions = new Set();
  }

  async generatePrompt() {
    const available = QUESTIONS.filter(q => !this.usedQuestions.has(q));
    const pool = available.length > 0 ? available : QUESTIONS;
    const question = pool[Math.floor(Math.random() * pool.length)];
    this.usedQuestions.add(question);
    return { text: question, type: 'deepfake', instruction: 'Answer honestly! One extra answer will be AI-generated. 🤖' };
  }

  async lockSubmissions() {
    // Auto-submit empty for missing players
    for (const id of this.playerOrder) {
      const p = this.players.get(id);
      if (!p.submitted) {
        this.submissions.set(id, this.getDefaultSubmission());
        p.submitted = true;
      }
    }

    // Generate AI answer to blend in
    try {
      const raw = await getBellBotCommentary('generate_scenarios', {
        instruction: `A group of humans answered: "${this.currentPrompt?.text}". Generate ONE fake answer that sounds human-written — casual, imperfect, with personality. Match the style of a 20-30 year old at a party game. Don't be too polished or verbose.`,
        jsonFormat: '"just the answer text as a string"',
      }, this.spiceLevel);
      this.aiAnswer = raw.replace(/^"|"$/g, '').trim();
    } catch {
      this.aiAnswer = 'Honestly I can\'t even decide. Probably something really dumb that I\'d regret.';
    }

    // Add AI answer to submissions with a special ID
    this.submissions.set(this.aiPlayerId, this.aiAnswer);

    this.state = STATES.REVEAL;
    this.revealIndex = 0;
    return { state: STATES.REVEAL, totalSubmissions: this.submissions.size };
  }

  getSubmissionsForVoting() {
    const entries = [];
    for (const [id, sub] of this.submissions) {
      entries.push({
        id,
        playerName: id === this.aiPlayerId ? 'Mystery Player' : (this.players.get(id)?.name || 'Anonymous'),
        submission: sub,
        isAI: id === this.aiPlayerId,
      });
    }
    // Shuffle
    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }
    return entries;
  }

  async tallyScores() {
    const roundScores = [];

    for (const id of this.playerOrder) {
      const player = this.players.get(id);
      const votedForAI = this.votes.get(id) === this.aiPlayerId;
      const points = votedForAI ? 400 : 0;

      // Bonus: if nobody voted for YOUR answer as AI, you're convincingly human
      let humanBonus = 0;
      const votesAgainstMe = [...this.votes.values()].filter(v => v === id).length;
      if (votesAgainstMe === 0) humanBonus = 200;

      const total = points + humanBonus;
      player.score += total;

      roundScores.push({
        id, name: player.name,
        aiScore: humanBonus, voteScore: points, roundTotal: total,
        cumulativeScore: player.score,
        aiComment: votedForAI ? 'Spotted the fake! 🎯' : 'Fooled by the AI! 🤖',
      });
    }

    roundScores.sort((a, b) => b.roundTotal - a.roundTotal);
    this.state = this.round >= this.totalRounds ? STATES.GAME_OVER : STATES.ROUND_END;

    const correctVoters = [...this.votes.values()].filter(v => v === this.aiPlayerId).length;

    return {
      state: this.state, round: this.round, roundScores,
      leaderboard: this.getScores(),
      aiAnswer: this.aiAnswer,
      correctVoters,
      totalVoters: this.votes.size,
      bellbotSays: correctVoters > this.votes.size / 2
        ? `Most of you spotted the AI! I need to try harder... 🤖💦`
        : `Ha! The AI fooled most of you! Humans are SO predictable. 🤖😏`,
      gameOver: this.state === STATES.GAME_OVER,
    };
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 300);
    if (text.length < 5) return { error: 'Write a real answer!' };
    return { data: text };
  }

  getDefaultSubmission() { return 'I honestly don\'t know what to say to that.'; }
  getSubmissionText(sub) { return sub; }
}
