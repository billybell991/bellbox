// Word Weaver — Fake Artist-style deduction game (text-based)
// One player is the Imposter who doesn't know the secret word
// Everyone writes a sentence, then votes on who's the Imposter
import { BaseGame, STATES } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const SECRET_WORDS = {
  1: [
    'Beach', 'Pizza', 'Christmas', 'Rainbow', 'Volcano',
    'Robot', 'Pirate', 'Snowman', 'Jungle', 'Astronaut',
    'Chocolate', 'Dinosaur', 'Unicorn', 'Fireworks', 'Treehouse',
    'Waterfall', 'Circus', 'Dragon', 'Castle', 'Submarine',
  ],
  2: [
    'Tinder Date', 'Tax Season', 'Monday Morning', 'Food Coma',
    'Elevator Music', 'Black Friday', 'Gym Membership', 'Password',
    'Airplane Food', 'Spam Email', 'IKEA Instructions', 'Speed Limit',
    'Self Checkout', 'WiFi Password', 'Parallel Parking',
    'Group Project', 'Job Interview', 'Conspiracy Theory', 'Horoscope', 'Autopilot',
  ],
  3: [
    'Walk of Shame', 'Drunk Text', 'Browser History', 'Incognito Mode',
    'Walk of Fame', 'Sugar Rush', 'Hot Mess', 'Plot Twist',
    'Last Brain Cell', 'Caught Red Handed', 'Broken Filter',
    'Crisis Mode', 'Ghost Mode', 'Zero Chill', 'Main Character Energy',
    'Suspicious Activity', 'Damage Control', 'Hidden Talent', 'Double Life', 'Red Flag',
  ],
};

export class WordWeaverGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'word-weaver',
      name: 'Word Weaver',
      rounds: 4,
      submissionTime: 40,
      votingTime: 25,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.usedWords = new Set();
    this.secretWord = null;
    this.imposterId = null;
    this.impostorVotes = new Map(); // voterId -> suspectId
  }

  async generatePrompt() {
    // Pick a random player as the Imposter
    const shuffled = [...this.playerOrder].sort(() => Math.random() - 0.5);
    this.imposterId = shuffled[0];

    // Try Gemini for word
    try {
      const raw = await getBellBotCommentary('generate_prompt', {
        gameName: 'Word Weaver',
        count: 1,
        description: 'Generate a single secret word or short phrase (2-3 words max) that players must describe without being too obvious. Should be something common enough that people can write about it but specific enough that a faker would struggle.',
        extra: `Spice level: ${this.spiceLevel}. Return just the word/phrase as the first element of a JSON array.`,
      }, this.spiceLevel);
      const parsed = parseBellBotJSON(raw);
      if (parsed?.[0]) {
        this.secretWord = parsed[0];
        return this._buildPrompt();
      }
    } catch { /* fallback */ }

    // Fallback
    const pool = SECRET_WORDS[this.spiceLevel] || SECRET_WORDS[2];
    const available = pool.filter(w => !this.usedWords.has(w));
    const list = available.length > 0 ? available : pool;
    this.secretWord = list[Math.floor(Math.random() * list.length)];
    this.usedWords.add(this.secretWord);
    return this._buildPrompt();
  }

  _buildPrompt() {
    return {
      type: 'word-weaver',
      secretWord: this.secretWord,
      imposterId: this.imposterId,
      instruction: 'Write ONE sentence that subtly hints at the secret word — without giving it away!',
    };
  }

  /** Imposter sees a vague prompt; everyone else sees the secret word */
  getState(socketId) {
    const base = super.getState(socketId);
    if (base.prompt) {
      if (socketId === this.imposterId) {
        base.prompt = {
          ...base.prompt,
          secretWord: null,
          isImposter: true,
          instruction: 'You are the IMPOSTER! You don\'t know the word. Write something that blends in!',
        };
      } else {
        base.prompt = {
          ...base.prompt,
          isImposter: false,
        };
      }
    }
    return base;
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 300);
    if (!text) return { error: 'Write something!' };
    return { data: text };
  }

  getDefaultSubmission() { return 'I have nothing to say about that.'; }
  getSubmissionText(sub) { return sub; }

  /** After reveals, move to voting where players vote on who's the Imposter */
  async getAIScores() {
    // Don't score during submission — scoring happens after voting
    // Give placeholder scores; real scoring happens in tallyScores
    for (const [socketId] of this.submissions) {
      this.aiScores.set(socketId, { score: 0, comment: '' });
    }
  }

  /** Override tally to handle imposter voting */
  async tallyScores() {
    if (this.state !== STATES.VOTING && this.state !== STATES.REVEAL) {
      return { error: 'Not in voting/reveal phase' };
    }

    // Count votes for each suspect
    const voteCounts = new Map();
    for (const targetId of this.votes.values()) {
      voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
    }

    // Find who got the most votes
    let maxVotes = 0;
    let accusedId = null;
    for (const [id, count] of voteCounts) {
      if (count > maxVotes) {
        maxVotes = count;
        accusedId = id;
      }
    }

    const imposterCaught = accusedId === this.imposterId;
    const imposterName = this.players.get(this.imposterId)?.name || 'The Imposter';

    // Score: Imposter gets points for NOT being caught; others get points for catching
    const roundScores = [];
    for (const [socketId] of this.submissions) {
      const player = this.players.get(socketId);
      let score = 0;
      let comment = '';

      if (socketId === this.imposterId) {
        if (imposterCaught) {
          score = 50;
          comment = 'Busted! They saw right through you.';
        } else {
          score = 400;
          comment = 'Master of disguise! Nobody suspected a thing.';
        }
      } else {
        const votedCorrectly = this.votes.get(socketId) === this.imposterId;
        if (votedCorrectly) {
          score = 300;
          comment = 'Sharp detective work!';
        } else {
          score = 100;
          comment = 'Wrong suspect...';
        }
      }

      if (player) player.score += score;

      roundScores.push({
        id: socketId,
        name: player?.name || 'Anonymous',
        aiScore: score,
        aiComment: comment,
        roundTotal: score,
        cumulativeScore: player?.score || 0,
        submission: this.getSubmissionText(this.submissions.get(socketId)),
      });
    }

    roundScores.sort((a, b) => b.roundTotal - a.roundTotal);
    this.state = this.round >= this.totalRounds ? STATES.GAME_OVER : STATES.ROUND_END;

    // BellBot commentary
    let bellbotSays = '';
    try {
      const verb = imposterCaught ? 'was caught' : 'got away with it';
      bellbotSays = await getBellBotCommentary('reveal', {
        gameName: 'Word Weaver',
        playerName: imposterName,
        submission: `The secret word was "${this.secretWord}". The imposter (${imposterName}) ${verb}!`,
      }, this.spiceLevel);
    } catch { /* empty */ }

    return {
      state: this.state,
      round: this.round,
      roundScores,
      leaderboard: this.getScores(),
      bellbotSays,
      correctAnswer: `The imposter was ${imposterName}! The secret word was "${this.secretWord}".`,
      gameOver: this.state === STATES.GAME_OVER,
    };
  }
}
