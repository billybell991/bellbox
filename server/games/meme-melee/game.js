// Meme Melee — Game Logic
// Same mechanics as NAH but with meme images as "black cards" and caption cards as "white cards"

import { buildMemeDeck, availableMemes } from './cards.js';

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const HAND_SIZE = 10;
const POINTS_TO_WIN = 7;

export class MemeGameRoom {
  constructor(roomCode, hostId, hostName) {
    this.roomCode = roomCode;
    this.hostId = hostId;
    this.players = new Map();
    this.playerOrder = [];
    this.playerIdMap = new Map();
    this.disconnectTimers = new Map();
    this.state = 'LOBBY';
    this.memeDeck = [];     // meme images (like black cards)
    this.captionDeck = [];  // caption cards (like white cards)
    this.currentMeme = null;
    this.usedMemes = new Set(); // track used meme URLs across rematches
    this.cardCzarIndex = 0;
    this.submissions = new Map();
    this.roundNumber = 0;
    this.pointsToWin = POINTS_TO_WIN;
    this.shuffledSubmissions = [];

    this.addPlayer(hostId, hostName);
  }

  addPlayer(socketId, name, playerId) {
    if (this.state !== 'LOBBY') return { error: 'Game already in progress' };
    if (this.players.has(socketId)) return { error: 'Already in room' };
    this.players.set(socketId, { name, score: 0, hand: [], playerId });
    this.playerOrder.push(socketId);
    if (playerId) this.playerIdMap.set(playerId, socketId);
    return { success: true };
  }

  reconnectPlayer(playerId, newSocketId) {
    const oldSocketId = this.playerIdMap.get(playerId);
    if (!oldSocketId) return null;
    const player = this.players.get(oldSocketId);
    if (!player) return null;

    const timer = this.disconnectTimers.get(playerId);
    if (timer) { clearTimeout(timer); this.disconnectTimers.delete(playerId); }

    this.players.delete(oldSocketId);
    this.players.set(newSocketId, player);
    this.playerIdMap.set(playerId, newSocketId);

    const orderIdx = this.playerOrder.indexOf(oldSocketId);
    if (orderIdx !== -1) this.playerOrder[orderIdx] = newSocketId;
    if (this.hostId === oldSocketId) this.hostId = newSocketId;

    if (this.submissions.has(oldSocketId)) {
      const sub = this.submissions.get(oldSocketId);
      this.submissions.delete(oldSocketId);
      this.submissions.set(newSocketId, sub);
    }
    for (const s of this.shuffledSubmissions) {
      if (s.socketId === oldSocketId) s.socketId = newSocketId;
    }
    return player;
  }

  getPlayerIdBySocketId(socketId) {
    return this.players.get(socketId)?.playerId || null;
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
      gameState: (this.state !== 'LOBBY') ? {
        phase: this.state === 'PICKING' ? 'picking'
             : this.state === 'JUDGING' ? 'judging'
             : this.state === 'ROUND_END' ? 'roundend'
             : this.state === 'GAME_OVER' ? 'gameover'
             : 'picking',
        blackCard: this.currentMeme,  // meme image acts as "black card"
        hand: player.hand,
        cardCzar: this.getCardCzarId(),
        roundNumber: this.roundNumber,
        players: this.getPlayerList(),
        scores: this.getScores(),
        submissions: this.state === 'JUDGING' ? this.getAnonymousSubmissions() : null,
      } : null,
    };
  }

  removePlayer(socketId) {
    if (!this.players.has(socketId)) return;
    const wasHost = socketId === this.hostId;
    const wasCzar = this.playerOrder[this.cardCzarIndex] === socketId;

    this.players.delete(socketId);
    const orderIndex = this.playerOrder.indexOf(socketId);
    this.playerOrder.splice(orderIndex, 1);
    this.submissions.delete(socketId);

    if (wasHost && this.playerOrder.length > 0) this.hostId = this.playerOrder[0];
    if (this.playerOrder.length === 0) return;
    if (this.cardCzarIndex >= this.playerOrder.length) this.cardCzarIndex = 0;

    if (this.state !== 'LOBBY' && this.playerOrder.length < 3) {
      this.state = 'GAME_OVER';
      return;
    }
    if (wasCzar && (this.state === 'PICKING' || this.state === 'JUDGING')) this.startRound();
    if (this.state === 'PICKING' && this.allSubmitted()) this.prepareJudging();
  }

  startGame(spiceLevel = 1) {
    if (this.playerOrder.length < 3) return { error: 'Need at least 3 players' };

    const deck = buildMemeDeck(spiceLevel);
    this.memeDeck = shuffle(deck.blackCards);
    this.captionDeck = shuffle(deck.whiteCards);
    this.cardCzarIndex = 0;
    this.roundNumber = 0;

    for (const [socketId] of this.players) {
      const player = this.players.get(socketId);
      player.hand = this.drawCaptionCards(HAND_SIZE);
      player.score = 0;
    }

    this.startRound();
    return { success: true };
  }

  drawCaptionCards(count) {
    const drawn = [];
    for (let i = 0; i < count; i++) {
      if (this.captionDeck.length === 0) {
        // Reshuffle all caption cards
        const deck = buildMemeDeck(3);
        this.captionDeck = shuffle(deck.whiteCards);
      }
      drawn.push(this.captionDeck.pop());
    }
    return drawn;
  }

  startRound() {
    if (this.memeDeck.length === 0) {
      // Prefer unseen memes, fallback to full reshuffle if all used
      const unseen = availableMemes.filter(m => !this.usedMemes.has(m.imageUrl));
      this.memeDeck = shuffle(unseen.length > 0 ? [...unseen] : [...availableMemes]);
      if (unseen.length === 0) this.usedMemes.clear();
    }

    this.roundNumber++;
    this.currentMeme = this.memeDeck.pop();
    this.usedMemes.add(this.currentMeme.imageUrl);
    this.submissions = new Map();
    this.shuffledSubmissions = [];
    this.state = 'PICKING';

    for (const [socketId] of this.players) {
      const player = this.players.get(socketId);
      while (player.hand.length < HAND_SIZE) {
        const cards = this.drawCaptionCards(1);
        player.hand.push(...cards);
      }
    }
  }

  getCardCzarId() { return this.playerOrder[this.cardCzarIndex]; }

  submitCards(socketId, cardIndices) {
    if (this.state !== 'PICKING') return { error: 'Not in picking phase' };
    if (socketId === this.getCardCzarId()) return { error: "Meme Judge can't submit" };
    if (this.submissions.has(socketId)) return { error: 'Already submitted' };

    const player = this.players.get(socketId);
    if (!player) return { error: 'Player not found' };

    const pick = this.currentMeme.pick;
    if (cardIndices.length !== pick) return { error: `Must pick exactly ${pick} card(s)` };

    for (const idx of cardIndices) {
      if (idx < 0 || idx >= player.hand.length) return { error: 'Invalid card index' };
    }

    const sortedIndices = [...cardIndices].sort((a, b) => b - a);
    const selectedCards = cardIndices.map(i => player.hand[i]);
    for (const idx of sortedIndices) player.hand.splice(idx, 1);

    this.submissions.set(socketId, { cards: selectedCards, playerName: player.name });

    if (this.allSubmitted()) this.prepareJudging();
    return { success: true };
  }

  allSubmitted() {
    return this.submissions.size >= this.playerOrder.length - 1;
  }

  prepareJudging() {
    const entries = [...this.submissions.entries()];
    this.shuffledSubmissions = shuffle(entries).map(([socketId, sub]) => ({
      socketId, cards: sub.cards, playerName: sub.playerName,
    }));
    this.state = 'JUDGING';
  }

  judgeWinner(submissionIndex) {
    if (this.state !== 'JUDGING') return { error: 'Not in judging phase' };
    if (submissionIndex < 0 || submissionIndex >= this.shuffledSubmissions.length) {
      return { error: 'Invalid submission' };
    }

    const winner = this.shuffledSubmissions[submissionIndex];
    const winnerPlayer = this.players.get(winner.socketId);
    if (winnerPlayer) winnerPlayer.score++;

    this.state = 'ROUND_END';
    if (winnerPlayer && winnerPlayer.score >= this.pointsToWin) this.state = 'GAME_OVER';

    this.cardCzarIndex = (this.cardCzarIndex + 1) % this.playerOrder.length;

    return {
      success: true,
      winnerName: winner.playerName,
      winnerSocketId: winner.socketId,
      winningCards: winner.cards,
      blackCard: this.currentMeme,
      gameOver: this.state === 'GAME_OVER',
    };
  }

  getPlayerList() {
    return this.playerOrder.map(id => {
      const p = this.players.get(id);
      return {
        id, name: p.name, score: p.score,
        isHost: id === this.hostId,
        isCzar: id === this.getCardCzarId(),
        hasSubmitted: this.submissions.has(id),
      };
    });
  }

  getAnonymousSubmissions() {
    return this.shuffledSubmissions.map(s => ({ cards: s.cards }));
  }

  getScores() {
    return this.playerOrder.map(id => {
      const p = this.players.get(id);
      return { name: p.name, score: p.score };
    }).sort((a, b) => b.score - a.score);
  }
}
