// Story Sabotage — One player sabotages a collaborative story, others find them
import { BaseGame, STATES } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const STORY_THEMES = [
  'A heist at the world\'s most guarded museum',
  'Surviving the first day at a new school... on Mars',
  'A cooking competition where everything goes wrong',
  'An office where the employees are secretly superheroes',
  'A road trip in a haunted RV',
  'A detective who can only solve crimes by accident',
  'A wedding where nothing goes as planned',
  'A space station where the AI is having feelings',
];

export class StorySabotageGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'story-sabotage',
      name: 'Story Sabotage',
      rounds: 3,
      submissionTime: 60,
      votingTime: 45,
      minPlayers: 4,
      maxPlayers: 10,
    });
    this.saboteur = null;
    this.storyTheme = null;
    this.saboteurObjective = null;
  }

  async startGame(spiceLevel = 2) {
    this.spiceLevel = spiceLevel;
    this.round = 0;
    for (const [, p] of this.players) { p.score = 0; }
    return this.startNextRound();
  }

  async startNextRound() {
    this.round++;
    if (this.round > this.totalRounds) return this.endGame();

    this.submissions.clear();
    this.votes.clear();
    this.aiScores.clear();
    for (const [, p] of this.players) { p.submitted = false; p.voted = false; }

    // Pick saboteur
    this.saboteur = this.playerOrder[Math.floor(Math.random() * this.playerOrder.length)];
    this.storyTheme = STORY_THEMES[Math.floor(Math.random() * STORY_THEMES.length)];

    // Saboteur gets a secret objective to derail the story
    const objectives = [
      'subtly make the story about food without anyone noticing',
      'steer every scene toward a beach/ocean setting',
      'make every character sound overly dramatic',
      'insert hidden references to nursery rhymes',
      'make the story gradually become a love story',
      'subtly turn the protagonist into a villain',
    ];
    this.saboteurObjective = objectives[Math.floor(Math.random() * objectives.length)];

    this.state = STATES.SUBMISSION;
    this.currentPrompt = {
      text: this.storyTheme,
      type: 'story-sabotage',
      instruction: 'Write the next chapter of this story!',
    };

    return {
      state: STATES.SUBMISSION,
      round: this.round,
      totalRounds: this.totalRounds,
      prompt: this.currentPrompt,
      timeLimit: this.submissionTime,
      players: this.getPlayerList(),
      scores: this.getScores(),
      bellbotSays: `Round ${this.round}! One of you is the SABOTEUR. Write your chapter... but who's trying to derail the story? 🕵️`,
    };
  }

  /** Each player gets different instructions */
  getState(socketId) {
    const base = super.getState(socketId);
    base.isSaboteur = socketId === this.saboteur;
    if (socketId === this.saboteur) {
      base.saboteurObjective = this.saboteurObjective;
      base.prompt = {
        ...base.prompt,
        instruction: `You're the SABOTEUR! Secret mission: ${this.saboteurObjective}. Write your chapter to subtly sabotage!`,
      };
    }
    return base;
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 600);
    if (text.length < 20) return { error: 'Write more story!' };
    return { data: text };
  }

  /** Voting is accusation-based: who do you think is the saboteur? */
  castVote(voterId, targetId) {
    if (this.state !== STATES.VOTING) return { error: 'Not voting phase' };
    const voter = this.players.get(voterId);
    if (!voter) return { error: 'Not in game' };
    if (voter.voted) return { error: 'Already voted' };

    this.votes.set(voterId, targetId);
    voter.voted = true;

    return { success: true, allVoted: this.playerOrder.every(id => this.players.get(id).voted) };
  }

  /** Score based on who caught the saboteur + saboteur stealth */
  async tallyScores() {
    const voteCounts = new Map();
    for (const [, targetId] of this.votes) {
      voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
    }

    const totalVoters = this.votes.size || 1;
    const saboteurVotes = voteCounts.get(this.saboteur) || 0;
    const saboteurCaught = saboteurVotes > totalVoters / 2;

    const roundScores = [];
    for (const id of this.playerOrder) {
      const player = this.players.get(id);
      let points = 0;

      if (id === this.saboteur) {
        // Saboteur scores based on NOT being caught
        points = saboteurCaught ? 100 : 500;
      } else {
        // Others score for correctly identifying saboteur
        const votedCorrectly = this.votes.get(id) === this.saboteur;
        points = votedCorrectly ? 400 : 100;
      }

      player.score += points;
      roundScores.push({
        id, name: player.name,
        aiScore: 0, voteScore: points, roundTotal: points,
        cumulativeScore: player.score,
        aiComment: id === this.saboteur
          ? (saboteurCaught ? 'CAUGHT! 🚨' : 'Got away with it! 🎭')
          : (this.votes.get(id) === this.saboteur ? 'Correct accusation! 🎯' : 'Wrong guess! 😅'),
      });
    }

    roundScores.sort((a, b) => b.roundTotal - a.roundTotal);
    this.state = this.round >= this.totalRounds ? STATES.GAME_OVER : STATES.ROUND_END;

    const saboteurName = this.players.get(this.saboteur)?.name;
    return {
      state: this.state,
      round: this.round,
      roundScores,
      leaderboard: this.getScores(),
      saboteur: saboteurName,
      saboteurCaught,
      saboteurObjective: this.saboteurObjective,
      bellbotSays: saboteurCaught
        ? `${saboteurName} has been CAUGHT! Their mission was: "${this.saboteurObjective}" 🚨`
        : `${saboteurName} got away with it! They were trying to: "${this.saboteurObjective}" 🎭`,
      gameOver: this.state === STATES.GAME_OVER,
    };
  }

  getDefaultSubmission() { return 'And then nothing particularly interesting happened...'; }
  getSubmissionText(sub) { return sub; }
}
