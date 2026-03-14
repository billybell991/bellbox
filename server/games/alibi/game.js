// Alibi — Where were you when the crime happened? Build your alibi!
import { BaseGame, STATES } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const CRIMES = {
  1: [
    'Someone replaced all the cookies in the cookie jar with vegetables',
    'The class hamster was found wearing a tiny hat and sunglasses',
    'All the chairs in the office were replaced with beanbags overnight',
    'Someone programmed the school bell to play "Baby Shark" every hour',
  ],
  2: [
    'Someone changed all the WiFi passwords to "asktheboss"',
    'The office fridge was "cleaned out" and everyone lost their lunch',
    'A mysterious person booked the conference room for "naptime" every day at 2pm',
    'Someone submitted everyone\'s out-of-office to say "Gone fishing, permanently"',
  ],
  3: [
    'Someone sent a company-wide email from the CEO\'s account saying "Pizza party cancelled forever"',
    'The entire parking lot was shrink-wrapped overnight',
    'All the printers now only print in Comic Sans and nobody can fix it',
    'Someone installed a karaoke machine in the elevator during shareholder season',
  ],
};

export class AlibiGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'alibi',
      name: 'Alibi',
      rounds: 3,
      submissionTime: 60,
      votingTime: 40,
      minPlayers: 4,
      maxPlayers: 10,
    });
    this.culprit = null;
  }

  async startNextRound() {
    this.round++;
    if (this.round > this.totalRounds) return this.endGame();

    this.submissions.clear();
    this.votes.clear();
    this.aiScores.clear();
    for (const [, p] of this.players) { p.submitted = false; p.voted = false; }

    // Pick the culprit
    this.culprit = this.playerOrder[Math.floor(Math.random() * this.playerOrder.length)];

    const pool = CRIMES[this.spiceLevel] || CRIMES[2];
    const crime = pool[Math.floor(Math.random() * pool.length)];

    this.state = STATES.SUBMISSION;
    this.currentPrompt = {
      text: crime,
      type: 'alibi',
      instruction: 'Build your alibi! Where were you?',
    };

    return {
      state: STATES.SUBMISSION,
      round: this.round,
      totalRounds: this.totalRounds,
      prompt: this.currentPrompt,
      timeLimit: this.submissionTime,
      players: this.getPlayerList(),
      scores: this.getScores(),
      bellbotSays: `A CRIME has been committed! 🚨 ${crime}. Write your alibi — one of you is GUILTY!`,
    };
  }

  getState(socketId) {
    const base = super.getState(socketId);
    base.isCulprit = socketId === this.culprit;
    if (socketId === this.culprit) {
      base.prompt = {
        ...base.prompt,
        instruction: 'YOU did it! 😈 Build a convincing alibi to avoid getting caught!',
      };
    }
    return base;
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 500);
    if (text.length < 15) return { error: 'Your alibi needs more detail!' };
    return { data: text };
  }

  async tallyScores() {
    const voteCounts = new Map();
    for (const [, targetId] of this.votes) {
      voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
    }

    const totalVoters = this.votes.size || 1;
    const culpritVotes = voteCounts.get(this.culprit) || 0;
    const caught = culpritVotes > totalVoters / 2;

    const roundScores = [];
    for (const id of this.playerOrder) {
      const player = this.players.get(id);
      let points = 0;

      if (id === this.culprit) {
        points = caught ? 100 : 500;
      } else {
        points = this.votes.get(id) === this.culprit ? 400 : 100;
      }

      player.score += points;
      roundScores.push({
        id, name: player.name,
        aiScore: 0, voteScore: points, roundTotal: points,
        cumulativeScore: player.score,
        aiComment: id === this.culprit
          ? (caught ? 'Guilty! 🔒' : 'Not guilty! 🎭')
          : (this.votes.get(id) === this.culprit ? 'Nailed it! 🎯' : 'Wrong suspect! 😅'),
      });
    }

    roundScores.sort((a, b) => b.roundTotal - a.roundTotal);
    this.state = this.round >= this.totalRounds ? STATES.GAME_OVER : STATES.ROUND_END;

    const culpritName = this.players.get(this.culprit)?.name;
    return {
      state: this.state, round: this.round, roundScores,
      leaderboard: this.getScores(),
      culprit: culpritName, caught,
      bellbotSays: caught
        ? `${culpritName} is GUILTY! The alibi didn't hold up! 🔒`
        : `${culpritName} walks free! That alibi was bulletproof! 🎭`,
      gameOver: this.state === STATES.GAME_OVER,
    };
  }

  getDefaultSubmission() { return 'I was... somewhere else. Doing... things. Definitely not crime things.'; }
  getSubmissionText(sub) { return sub; }
}
