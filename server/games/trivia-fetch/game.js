// Trivia Fetch! — Game Room Logic
// Trivia Crack-style room management, turn flow, treat collection

import { ALL_CATEGORIES, DEFAULT_CATEGORY_IDS, buildWheelSegments, generateQuestion, getGusReaction } from './trivia.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const rooms = new Map();

// ─── TriviaGame Class ─────────────────────────────────────────
export class TriviaGame {
  constructor(roomCode, hostId, hostName) {
    this.roomCode = roomCode;
    this.hostId = hostId;
    this.players = new Map();
    this.playerOrder = [];
    this.playerIdMap = new Map();
    this.disconnectTimers = new Map();
    this.state = 'LOBBY';
    this.activePlayerIndex = 0;
    this.currentQuestion = null;
    this.currentSegment = null;
    this.currentCategoryId = null;
    this.streakCount = 0;
    this.roundNumber = 0;
    this.usedHashes = new Set();
    this.answerTimer = null;
    this.categories = [];
    this.wheelSegments = [];

    this.addPlayer(hostId, hostName);
  }

  // ── Player Management ─────────────────────────────────────
  addPlayer(socketId, name, playerId) {
    if (this.players.size >= 6) return { error: 'Room is full (max 6 players)' };
    if (this.players.has(socketId)) return { error: 'Already in room' };

    this.players.set(socketId, {
      name,
      score: 0,
      pawStamps: [],
      playerId: playerId || null,
    });
    this.playerOrder.push(socketId);
    if (playerId) this.playerIdMap.set(playerId, socketId);
    return { success: true };
  }

  removePlayer(socketId) {
    if (!this.players.has(socketId)) return;

    const wasHost = socketId === this.hostId;
    const wasActive = this.playerOrder[this.activePlayerIndex] === socketId;

    this.players.delete(socketId);
    const idx = this.playerOrder.indexOf(socketId);
    if (idx !== -1) this.playerOrder.splice(idx, 1);

    if (wasHost && this.playerOrder.length > 0) {
      this.hostId = this.playerOrder[0];
    }

    if (this.playerOrder.length === 0) return;

    if (this.activePlayerIndex >= this.playerOrder.length) {
      this.activePlayerIndex = 0;
    }

    if (this.state !== 'LOBBY' && this.playerOrder.length < 2) {
      this.state = 'GAME_OVER';
      return;
    }

    if (wasActive && (this.state === 'QUESTION' || this.state === 'SPINNING')) {
      this.clearTimer();
      this.nextTurn();
    }
  }

  reconnectPlayer(playerId, newSocketId) {
    const oldSocketId = this.playerIdMap.get(playerId);
    if (!oldSocketId) return null;

    const player = this.players.get(oldSocketId);
    if (!player) return null;

    const timer = this.disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(playerId);
    }

    this.players.delete(oldSocketId);
    this.players.set(newSocketId, player);
    this.playerIdMap.set(playerId, newSocketId);

    const orderIdx = this.playerOrder.indexOf(oldSocketId);
    if (orderIdx !== -1) this.playerOrder[orderIdx] = newSocketId;
    if (this.hostId === oldSocketId) this.hostId = newSocketId;

    return player;
  }

  // ── Game Flow ─────────────────────────────────────────────
  startGame(selectedCategoryIds) {
    if (this.playerOrder.length < 2) return { error: 'Need at least 2 players' };

    // Build categories from selection or defaults
    const ids = (selectedCategoryIds && selectedCategoryIds.length === 6)
      ? selectedCategoryIds
      : DEFAULT_CATEGORY_IDS;
    this.categories = ids
      .map(id => ALL_CATEGORIES.find(c => c.id === id))
      .filter(Boolean);
    if (this.categories.length !== 6) {
      this.categories = ALL_CATEGORIES.filter(c => DEFAULT_CATEGORY_IDS.includes(c.id));
    }
    this.wheelSegments = buildWheelSegments(this.categories);

    this.state = 'SPINNING';
    this.activePlayerIndex = 0;
    this.roundNumber = 0;
    this.streakCount = 0;
    this.usedHashes = new Set();

    for (const [, player] of this.players) {
      player.score = 0;
      player.pawStamps = [];
    }

    return { success: true };
  }

  spinWheel() {
    if (this.state !== 'SPINNING') return { error: 'Not your turn to spin' };

    this.roundNumber++;
    const segmentIndex = Math.floor(Math.random() * this.wheelSegments.length);
    const segment = this.wheelSegments[segmentIndex];
    this.currentSegment = segment;

    this.currentCategoryId = segment.id;

    return { segmentIndex, segment, categoryId: this.currentCategoryId };
  }

  async fetchQuestion() {
    this.state = 'QUESTION';

    const question = await generateQuestion(this.currentCategoryId, this.usedHashes);

    this.currentQuestion = question;
    this.usedHashes.add(question.question.substring(0, 50));

    return {
      question: question.question,
      options: question.options,
      timeLimit: 20,
    };
  }

  submitAnswer(socketId, answerIndex) {
    if (this.state !== 'QUESTION') return { error: 'Not in question phase' };
    if (socketId !== this.getActivePlayerId()) return { error: 'Not your turn' };

    this.clearTimer();

    const correct = answerIndex === this.currentQuestion.correctIndex;
    const player = this.players.get(socketId);

    let stampEarned = null;
    let gameWon = false;

    if (correct) {
      player.score++;
      this.streakCount++;

      if (!player.pawStamps.includes(this.currentCategoryId)) {
        player.pawStamps.push(this.currentCategoryId);
        stampEarned = this.currentCategoryId;
      }
      if (player.pawStamps.length >= this.categories.length) {
        gameWon = true;
        this.state = 'GAME_OVER';
      } else {
        this.state = 'SPINNING';
      }
    } else {
      this.streakCount = 0;
      this.nextTurn();
    }

    return {
      correct,
      correctIndex: this.currentQuestion.correctIndex,
      funFact: this.currentQuestion.funFact,
      stampEarned,
      gameWon,
      winnerName: gameWon ? player.name : null,
      scores: this.getScores(),
      pawStamps: this.getAllPawStamps(),
      activePlayerId: this.getActivePlayerId(),
      streakCount: this.streakCount,
    };
  }

  handleTimeout(socketId) {
    if (this.state !== 'QUESTION') return null;
    if (socketId !== this.getActivePlayerId()) return null;

    this.clearTimer();
    this.streakCount = 0;
    this.nextTurn();

    return {
      correct: false,
      correctIndex: this.currentQuestion.correctIndex,
      funFact: this.currentQuestion.funFact,
      stampEarned: null,
      choosingStamp: false,
      gameWon: false,
      timedOut: true,
      scores: this.getScores(),
      pawStamps: this.getAllPawStamps(),
      activePlayerId: this.getActivePlayerId(),
      streakCount: 0,
    };
  }

  nextTurn() {
    this.activePlayerIndex = (this.activePlayerIndex + 1) % this.playerOrder.length;
    this.state = 'SPINNING';
    this.streakCount = 0;
  }

  clearTimer() {
    if (this.answerTimer) {
      clearTimeout(this.answerTimer);
      this.answerTimer = null;
    }
  }

  // ── Getters ───────────────────────────────────────────────
  getActivePlayerId() {
    return this.playerOrder[this.activePlayerIndex];
  }

  getActivePlayer() {
    return this.players.get(this.getActivePlayerId());
  }

  getPlayerList() {
    return this.playerOrder.map(id => {
      const p = this.players.get(id);
      return {
        socketId: id,
        name: p.name,
        score: p.score,
        pawStamps: [...p.pawStamps],
        isHost: id === this.hostId,
      };
    });
  }

  getScores() {
    return this.playerOrder.map(id => {
      const p = this.players.get(id);
      return { socketId: id, name: p.name, score: p.score, pawStamps: [...p.pawStamps] };
    });
  }

  getAllPawStamps() {
    const stamps = {};
    for (const [id, p] of this.players) {
      stamps[id] = [...p.pawStamps];
    }
    return stamps;
  }

  getFullState(socketId) {
    const player = this.players.get(socketId);
    if (!player) return null;

    return {
      roomCode: this.roomCode,
      players: this.getPlayerList(),
      isHost: socketId === this.hostId,
      playerName: player.name,
      state: this.state,
      gameState: this.state !== 'LOBBY' ? {
        phase: this.state === 'QUESTION' ? 'spinning' : this.state.toLowerCase(),
        activePlayerId: this.getActivePlayerId(),
        scores: this.getScores(),
        pawStamps: this.getAllPawStamps(),
        streakCount: this.streakCount,
        currentSegment: this.currentSegment,
        currentCategoryId: this.currentCategoryId,
        categories: this.categories,
      } : null,
    };
  }

  resetToLobby() {
    this.state = 'LOBBY';
    this.activePlayerIndex = 0;
    this.roundNumber = 0;
    this.streakCount = 0;
    this.usedHashes = new Set();
    this.currentQuestion = null;
    this.currentSegment = null;
    this.currentCategoryId = null;
    this.clearTimer();

    for (const [, player] of this.players) {
      player.score = 0;
      player.pawStamps = [];
    }
  }
}

// ─── Room Management ──────────────────────────────────────────
export function createRoom(hostId, hostName) {
  let code;
  do { code = generateRoomCode(); } while (rooms.has(code));

  const room = new TriviaGame(code, hostId, hostName);
  rooms.set(code, room);
  return room;
}

export function getRoom(code) {
  return rooms.get(code);
}

export function getRoomByPlayer(socketId) {
  for (const room of rooms.values()) {
    if (room.players.has(socketId)) return room;
  }
  return null;
}

export function getRoomByPlayerId(playerId) {
  for (const room of rooms.values()) {
    if (room.playerIdMap.has(playerId)) return room;
  }
  return null;
}

export function deleteRoom(code) {
  const room = rooms.get(code);
  if (room) room.clearTimer();
  rooms.delete(code);
}
