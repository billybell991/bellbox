// BaseGame — Shared game engine for all BellBox games
// Handles the canonical round flow: Intro → Submission → Reveal → Voting → Scoring

import { getBellBotCommentary, parseBellBotJSON } from './bellbot.js';

/**
 * Game states — all games follow this state machine
 */
export const STATES = {
  WAITING: 'WAITING',
  ROUND_INTRO: 'ROUND_INTRO',
  SUBMISSION: 'SUBMISSION',
  REVEAL: 'REVEAL',
  VOTING: 'VOTING',
  SCORING: 'SCORING',
  ROUND_END: 'ROUND_END',
  GAME_OVER: 'GAME_OVER',
};

export class BaseGame {
  /**
   * @param {string} roomCode
   * @param {object} config - Game-specific config
   *   config.id           - Game ID string
   *   config.name         - Display name
   *   config.rounds       - Number of rounds (default 4)
   *   config.submissionTime - Seconds for submission phase (default 45)
   *   config.votingTime   - Seconds for voting phase (default 30)
   *   config.revealTime   - Seconds per reveal (default 8)
   *   config.minPlayers   - Minimum players (default 3)
   *   config.maxPlayers   - Maximum players (default 10)
   */
  constructor(roomCode, config = {}) {
    this.roomCode = roomCode;
    this.gameId = config.id || 'base-game';
    this.gameName = config.name || 'BellBox Game';
    this.totalRounds = config.rounds || 4;
    this.submissionTime = config.submissionTime || 45;
    this.votingTime = config.votingTime || 30;
    this.revealTime = config.revealTime || 8;
    this.minPlayers = config.minPlayers || 3;
    this.maxPlayers = config.maxPlayers || 10;

    this.players = new Map(); // socketId -> { name, score, submitted, voted }
    this.playerOrder = [];
    this.playerIdMap = new Map(); // playerId -> socketId (for reconnection)
    this.state = STATES.WAITING;
    this.round = 0;
    this.spiceLevel = 2;

    // Current round state
    this.currentPrompt = null;
    this.submissions = new Map(); // socketId -> submission data
    this.votes = new Map(); // voterId -> targetSocketId
    this.aiScores = new Map(); // socketId -> { score, comment }
    this.revealIndex = 0;

    // Timers
    this._timer = null;
    this._timerEnd = null;
  }

  // ── Player Management ─────────────────────────────────────

  addPlayer(socketId, name, playerId) {
    if (this.players.size >= this.maxPlayers) return { error: 'Game full' };
    this.players.set(socketId, {
      name,
      score: 0,
      submitted: false,
      voted: false,
    });
    this.playerOrder.push(socketId);
    if (playerId) this.playerIdMap.set(playerId, socketId);
    return { success: true };
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.playerOrder = this.playerOrder.filter(id => id !== socketId);
  }

  reconnectPlayer(playerId, newSocketId) {
    const oldSocketId = this.playerIdMap.get(playerId);
    if (!oldSocketId) return null;

    const player = this.players.get(oldSocketId);
    if (!player) return null;

    // Swap socket ID in all data structures
    this.players.delete(oldSocketId);
    this.players.set(newSocketId, player);
    this.playerIdMap.set(playerId, newSocketId);

    const orderIdx = this.playerOrder.indexOf(oldSocketId);
    if (orderIdx !== -1) this.playerOrder[orderIdx] = newSocketId;

    // Swap in submissions, votes, aiScores
    if (this.submissions.has(oldSocketId)) {
      this.submissions.set(newSocketId, this.submissions.get(oldSocketId));
      this.submissions.delete(oldSocketId);
    }
    if (this.votes.has(oldSocketId)) {
      this.votes.set(newSocketId, this.votes.get(oldSocketId));
      this.votes.delete(oldSocketId);
    }
    if (this.aiScores.has(oldSocketId)) {
      this.aiScores.set(newSocketId, this.aiScores.get(oldSocketId));
      this.aiScores.delete(oldSocketId);
    }
    // Swap vote targets pointing to old socket
    for (const [voterId, targetId] of this.votes) {
      if (targetId === oldSocketId) this.votes.set(voterId, newSocketId);
    }

    return player;
  }

  getPlayerList() {
    return this.playerOrder.map(id => {
      const p = this.players.get(id);
      return { id, name: p.name, score: p.score, submitted: p.submitted, voted: p.voted };
    });
  }

  getScores() {
    return this.playerOrder.map(id => {
      const p = this.players.get(id);
      return { id, name: p.name, score: p.score };
    }).sort((a, b) => b.score - a.score);
  }

  // ── Round Flow ────────────────────────────────────────────

  /**
   * Start the game. Override generatePrompt() for game-specific prompts.
   * Returns the initial state to broadcast.
   */
  async startGame(spiceLevel = 2) {
    this.spiceLevel = spiceLevel;
    this.round = 0;
    for (const [, p] of this.players) { p.score = 0; }
    return this.startNextRound();
  }

  /**
   * Advance to the next round. Override generatePrompt().
   */
  async startNextRound() {
    this.round++;
    if (this.round > this.totalRounds) {
      return this.endGame();
    }

    // Reset round state
    this.submissions.clear();
    this.votes.clear();
    this.aiScores.clear();
    this.revealIndex = 0;
    for (const [, p] of this.players) {
      p.submitted = false;
      p.voted = false;
    }

    // Generate prompt (game-specific)
    this.currentPrompt = await this.generatePrompt();

    this.state = STATES.SUBMISSION;

    // Get BellBot intro
    let bellbotIntro = '';
    try {
      bellbotIntro = await getBellBotCommentary('round_start', {
        round: this.round,
        gameName: this.gameName,
        prompt: typeof this.currentPrompt === 'string' ? this.currentPrompt : this.currentPrompt?.text,
      }, this.spiceLevel);
    } catch { /* use empty */ }

    return {
      state: STATES.SUBMISSION,
      round: this.round,
      totalRounds: this.totalRounds,
      prompt: this.currentPrompt,
      bellbotSays: bellbotIntro,
      timeLimit: this.submissionTime,
      players: this.getPlayerList(),
      scores: this.getScores(),
    };
  }

  /**
   * Handle a player's submission. Override validateSubmission() for game-specific validation.
   */
  submitEntry(socketId, submission) {
    if (this.state !== STATES.SUBMISSION) return { error: 'Not in submission phase' };
    const player = this.players.get(socketId);
    if (!player) return { error: 'Not in game' };
    if (player.submitted) return { error: 'Already submitted' };

    const validated = this.validateSubmission(submission);
    if (validated.error) return validated;

    this.submissions.set(socketId, validated.data);
    player.submitted = true;

    const allSubmitted = this.playerOrder.every(id => this.players.get(id).submitted);

    return {
      success: true,
      allSubmitted,
      submittedCount: this.submissions.size,
      totalPlayers: this.playerOrder.length,
    };
  }

  /**
   * Lock submissions and move to reveal phase
   */
  async lockSubmissions() {
    if (this.state !== STATES.SUBMISSION) return { error: 'Not in submission phase' };

    // Auto-submit empty for players who didn't submit
    for (const id of this.playerOrder) {
      const p = this.players.get(id);
      if (!p.submitted) {
        this.submissions.set(id, this.getDefaultSubmission());
        p.submitted = true;
      }
    }

    // Get AI scores for all submissions (batch)
    await this.getAIScores();

    this.state = STATES.REVEAL;
    this.revealIndex = 0;

    return {
      state: STATES.REVEAL,
      totalSubmissions: this.submissions.size,
    };
  }

  /**
   * Get the next submission to reveal
   */
  getNextReveal() {
    if (this.state !== STATES.REVEAL) return null;

    const ids = [...this.submissions.keys()];
    if (this.revealIndex >= ids.length) {
      // All revealed, move to voting
      this.state = STATES.VOTING;
      return { done: true, state: STATES.VOTING, timeLimit: this.votingTime };
    }

    const socketId = ids[this.revealIndex];
    const player = this.players.get(socketId);
    const submission = this.submissions.get(socketId);
    const aiScore = this.aiScores.get(socketId);
    this.revealIndex++;

    return {
      done: false,
      index: this.revealIndex - 1,
      total: ids.length,
      playerName: player?.name || 'Anonymous',
      playerId: socketId,
      submission,
      aiComment: aiScore?.comment || '',
    };
  }

  /**
   * Handle a player's vote
   */
  castVote(voterId, targetId) {
    if (this.state !== STATES.VOTING) return { error: 'Not in voting phase' };
    const voter = this.players.get(voterId);
    if (!voter) return { error: 'Not in game' };
    if (voter.voted) return { error: 'Already voted' };
    if (voterId === targetId) return { error: "Can't vote for yourself" };
    if (!this.submissions.has(targetId)) return { error: 'Invalid target' };

    this.votes.set(voterId, targetId);
    voter.voted = true;

    const allVoted = this.playerOrder.every(id => this.players.get(id).voted);

    return { success: true, allVoted };
  }

  /**
   * Tally scores and produce round results
   */
  async tallyScores() {
    if (this.state !== STATES.VOTING && this.state !== STATES.REVEAL) return { error: 'Not in voting/reveal phase' };

    // Calculate round scores (AI-only scoring)
    const roundScores = [];
    for (const [socketId] of this.submissions) {
      const aiResult = this.aiScores.get(socketId) || { score: 250, comment: '' };
      const total = Math.min(aiResult.score, 500);

      // Add to cumulative score
      const player = this.players.get(socketId);
      if (player) player.score += total;

      const sub = this.submissions.get(socketId);
      roundScores.push({
        id: socketId,
        name: player?.name || 'Anonymous',
        aiScore: aiResult.score,
        aiComment: aiResult.comment,
        roundTotal: total,
        cumulativeScore: player?.score || 0,
        submission: this.getSubmissionText(sub),
      });
    }

    roundScores.sort((a, b) => b.roundTotal - a.roundTotal);

    this.state = this.round >= this.totalRounds ? STATES.GAME_OVER : STATES.ROUND_END;

    // BellBot commentary on winner
    let bellbotSays = '';
    try {
      if (this.state === STATES.GAME_OVER) {
        const winner = this.getScores()[0];
        bellbotSays = await getBellBotCommentary('game_over', {
          gameName: this.gameName,
          winnerName: winner.name,
          winnerScore: winner.score,
        }, this.spiceLevel);
      } else {
        const roundWinner = roundScores[0];
        bellbotSays = await getBellBotCommentary('reveal', {
          gameName: this.gameName,
          playerName: roundWinner.name,
          submission: `winner of round ${this.round} with ${roundWinner.roundTotal} points`,
        }, this.spiceLevel);
      }
    } catch { /* use empty */ }

    return {
      state: this.state,
      round: this.round,
      roundScores,
      leaderboard: this.getScores(),
      bellbotSays,
      prompt: this.currentPrompt,
      gameOver: this.state === STATES.GAME_OVER,
    };
  }

  /**
   * End the game
   */
  endGame() {
    this.state = STATES.GAME_OVER;
    const leaderboard = this.getScores();
    return {
      state: STATES.GAME_OVER,
      gameOver: true,
      leaderboard,
      winner: leaderboard[0] || null,
    };
  }

  // ── AI Scoring (batch) ────────────────────────────────────

  async getAIScores() {
    const submissionList = [];
    for (const [socketId, sub] of this.submissions) {
      const player = this.players.get(socketId);
      submissionList.push({
        socketId,
        playerName: player?.name || 'Anonymous',
        text: this.getSubmissionText(sub),
      });
    }

    try {
      const raw = await getBellBotCommentary('judge_batch', {
        gameName: this.gameName,
        prompt: typeof this.currentPrompt === 'string' ? this.currentPrompt : this.currentPrompt?.text,
        submissions: submissionList,
      }, this.spiceLevel);

      const results = parseBellBotJSON(raw);
      for (const r of results) {
        const entry = submissionList[r.index];
        if (entry) {
          this.aiScores.set(entry.socketId, {
            score: Math.max(0, Math.min(500, r.score || 250)),
            comment: r.comment || '',
          });
        }
      }
    } catch {
      // Fallback: give everyone 250
      for (const [socketId] of this.submissions) {
        this.aiScores.set(socketId, { score: 250, comment: 'Nice effort!' });
      }
    }
  }

  // ── Override Points (subclasses implement these) ──────────

  /** Generate a prompt for the current round */
  async generatePrompt() {
    return 'Default prompt — override generatePrompt()';
  }

  /** Validate a submission. Return { data } or { error } */
  validateSubmission(submission) {
    if (!submission || (typeof submission === 'string' && !submission.trim())) {
      return { error: 'Empty submission' };
    }
    return { data: typeof submission === 'string' ? submission.trim() : submission };
  }

  /** Default submission for players who timeout */
  getDefaultSubmission() {
    return '[No response]';
  }

  /** Extract display text from a submission (for AI judging) */
  getSubmissionText(submission) {
    return typeof submission === 'string' ? submission : JSON.stringify(submission);
  }

  // ── Serialization ─────────────────────────────────────────

  getState(socketId) {
    return {
      gameId: this.gameId,
      gameName: this.gameName,
      state: this.state,
      round: this.round,
      totalRounds: this.totalRounds,
      prompt: this.currentPrompt,
      players: this.getPlayerList(),
      scores: this.getScores(),
      timeLimit: this.state === STATES.SUBMISSION ? this.submissionTime : this.votingTime,
      mySubmission: this.submissions.get(socketId) || null,
      hasSubmitted: this.players.get(socketId)?.submitted || false,
      hasVoted: this.players.get(socketId)?.voted || false,
    };
  }

  /** Get all submissions for voting (anonymized shuffle) */
  getSubmissionsForVoting() {
    const entries = [];
    for (const [socketId, sub] of this.submissions) {
      const player = this.players.get(socketId);
      entries.push({
        id: socketId,
        playerName: player?.name || 'Anonymous',
        submission: sub,
        aiComment: this.aiScores.get(socketId)?.comment || '',
      });
    }
    // Shuffle
    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }
    return entries;
  }
}
