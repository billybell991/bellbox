// Wiretap — Players try to identify a secret word from vague AI clues
import { BaseGame, STATES } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const WORD_LISTS = {
  1: ['banana', 'umbrella', 'dinosaur', 'rainbow', 'pizza', 'elephant', 'spaceship', 'library', 'volcano', 'penguin', 'chocolate', 'trampoline', 'butterfly', 'telescope', 'waterfall'],
  2: ['procrastination', 'sarcasm', 'overthinking', 'nostalgia', 'anxiety', 'charisma', 'déjà vu', 'karma', 'irony', 'ambition', 'awkward', 'hangover', 'passive-aggressive', 'binge-watch'],
  3: ['existential crisis', 'gaslighting', 'main character energy', 'doom scrolling', 'quiet quitting', 'touch grass', 'rent free', 'red flag', 'delulu', 'rizz', 'ick', 'ghosting', 'situationship'],
};

export class WiretapGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'wiretap',
      name: 'Wiretap',
      rounds: 5,
      submissionTime: 15,
      votingTime: 0,
      minPlayers: 2,
      maxPlayers: 10,
    });
    this.secretWord = null;
    this.clues = [];
    this.clueIndex = 0;
    this.usedWords = new Set();
  }

  async generatePrompt() {
    const pool = WORD_LISTS[this.spiceLevel] || WORD_LISTS[1];
    const available = pool.filter(w => !this.usedWords.has(w));
    const list = available.length > 0 ? available : pool;
    this.secretWord = list[Math.floor(Math.random() * list.length)];
    this.usedWords.add(this.secretWord);

    // Generate 3 clues (easy to hard)
    try {
      const raw = await getBellBotCommentary('generate_scenarios', {
        instruction: `Generate 3 clues for the word/phrase "${this.secretWord}". Clue 1: very vague/cryptic. Clue 2: more specific. Clue 3: almost gives it away. Do NOT use the word itself. Return JSON array.`,
        jsonFormat: '["clue1", "clue2", "clue3"]',
      }, this.spiceLevel);
      this.clues = parseBellBotJSON(raw);
    } catch {
      this.clues = ['Think about it...', 'Getting warmer...', `It starts with "${this.secretWord[0]}"`];
    }

    this.clueIndex = 0;

    return {
      type: 'wiretap',
      clue: this.clues[0],
      clueNumber: 1,
      totalClues: this.clues.length,
      instruction: 'Guess the secret word from the clue! First to guess correctly wins! 🔍',
    };
  }

  /** Players submit guesses — first correct answer wins */
  validateSubmission(submission) {
    const guess = String(submission).trim().toLowerCase();
    if (!guess) return { error: 'Make a guess!' };
    return { data: { guess, time: Date.now(), correct: guess === this.secretWord.toLowerCase() } };
  }

  /** Speed game — no traditional voting */
  async lockSubmissions() {
    const roundScores = [];
    let winnerFound = false;

    // Find first correct guesser (by time)
    const guesses = [];
    for (const [socketId, sub] of this.submissions) {
      if (sub.correct) guesses.push({ socketId, time: sub.time });
    }
    guesses.sort((a, b) => a.time - b.time);

    for (const id of this.playerOrder) {
      const player = this.players.get(id);
      const sub = this.submissions.get(id);
      let points = 0;

      if (guesses.length > 0 && guesses[0].socketId === id) {
        // First correct guesser
        points = 500 - (this.clueIndex * 100); // More points for fewer clues
        winnerFound = true;
      } else if (sub?.correct) {
        points = 200; // Also correct but not first
      }

      player.score += points;
      roundScores.push({
        id, name: player.name,
        aiScore: 0, voteScore: points, roundTotal: points,
        cumulativeScore: player.score,
        aiComment: points >= 400 ? 'Lightning fast! ⚡' : points > 0 ? 'Got it! 🎯' : 'Not this time! 😅',
      });
    }

    roundScores.sort((a, b) => b.roundTotal - a.roundTotal);
    this.state = this.round >= this.totalRounds ? STATES.GAME_OVER : STATES.ROUND_END;

    return {
      state: this.state, round: this.round, roundScores,
      leaderboard: this.getScores(),
      secretWord: this.secretWord,
      bellbotSays: winnerFound
        ? `The word was "${this.secretWord}"! ${roundScores[0]?.name} got it! 🎯`
        : `Nobody guessed it! The word was "${this.secretWord}"! 🤦`,
      gameOver: this.state === STATES.GAME_OVER,
    };
  }

  /** Advance to next clue */
  nextClue() {
    this.clueIndex = Math.min(this.clueIndex + 1, this.clues.length - 1);
    return {
      clue: this.clues[this.clueIndex],
      clueNumber: this.clueIndex + 1,
      totalClues: this.clues.length,
    };
  }

  getDefaultSubmission() { return { guess: '', time: Date.now() + 99999, correct: false }; }
  getSubmissionText(sub) { return sub.guess || '?'; }
}
