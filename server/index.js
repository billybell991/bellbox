// BellBox Party Pack — Unified Server
// One lobby, multiple games, game voting, in-game chat
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Game-specific imports
import { GameRoom as NAHRoom } from './games/nerds-against-humanity/game.js';
import { themes as nahThemes } from './games/nerds-against-humanity/cards.js';
import { TriviaGame } from './games/trivia-fetch/game.js';
import { CATEGORIES, WHEEL_SEGMENTS, getGusReaction } from './games/trivia-fetch/trivia.js';
import { generateAllAssets, getMissingAssets } from './games/trivia-fetch/generate-assets.js';
import { transcribeAudio, analyzeAudio, isAudioAvailable } from './gemini-audio.js';

// BaseGame-derived game imports
import { CaptionThisGame } from './games/caption-this/game.js';
import { HotTakeTribunalGame } from './games/hot-take-tribunal/game.js';
import { WrongAnswersOnlyGame } from './games/wrong-answers-only/game.js';
import { SketchyContextGame } from './games/sketchy-context/game.js';
import { PitchSlapGame } from './games/pitch-slap/game.js';
import { MoralMazeGame } from './games/moral-maze/game.js';
import { LesserEvilGame } from './games/lesser-evil/game.js';
import { OffTheRailsGame } from './games/off-the-rails/game.js';
import { HonorableBotGame } from './games/honorable-bot/game.js';
import { AIDlibsGame } from './games/ai-dlibs/game.js';
import { SlideDeckGame } from './games/slide-deck/game.js';
import { HieroglyphicsGame } from './games/hieroglyphics/game.js';
import { OneWordStoryGame } from './games/one-word-story/game.js';
import { VoiceChameleonGame } from './games/voice-chameleon/game.js';
import { SoundBitesGame } from './games/sound-bites/game.js';
import { AccentRouletteGame } from './games/accent-roulette/game.js';
import { AIInterviewGame } from './games/ai-interview/game.js';
import { UnderTheBusGame } from './games/under-the-bus/game.js';
import { DeadGiveawayGame } from './games/dead-giveaway/game.js';
import { SmallClaimsGame } from './games/small-claims/game.js';
import { AlibiGame } from './games/alibi/game.js';
import { WiretapGame } from './games/wiretap/game.js';
import { BadInfluenceGame } from './games/bad-influence/game.js';
import { SnapDecisionGame } from './games/snap-decision/game.js';
import { HotPotatoGame } from './games/hot-potato/game.js';
import { DeepfakeDetectiveGame } from './games/deepfake-detective/game.js';
import { ArtHeistGame } from './games/art-heist/game.js';
import { AIHostageGame } from './games/ai-hostage/game.js';
import { StorySabotageGame } from './games/story-sabotage/game.js';

// BaseGame class constructors by game ID
const BASE_GAME_CLASSES = {
  'caption-this': CaptionThisGame,
  'hot-take-tribunal': HotTakeTribunalGame,
  'wrong-answers-only': WrongAnswersOnlyGame,
  'sketchy-context': SketchyContextGame,
  'pitch-slap': PitchSlapGame,
  'moral-maze': MoralMazeGame,
  'lesser-evil': LesserEvilGame,
  'off-the-rails': OffTheRailsGame,
  'honorable-bot': HonorableBotGame,
  'ai-dlibs': AIDlibsGame,
  'slide-deck': SlideDeckGame,
  'hieroglyphics': HieroglyphicsGame,
  'one-word-story': OneWordStoryGame,
  'voice-chameleon': VoiceChameleonGame,
  'sound-bites': SoundBitesGame,
  'accent-roulette': AccentRouletteGame,
  'ai-interview': AIInterviewGame,
  'under-the-bus': UnderTheBusGame,
  'dead-giveaway': DeadGiveawayGame,
  'small-claims': SmallClaimsGame,
  'alibi': AlibiGame,
  'wiretap': WiretapGame,
  'bad-influence': BadInfluenceGame,
  'snap-decision': SnapDecisionGame,
  'hot-potato': HotPotatoGame,
  'deepfake-detective': DeepfakeDetectiveGame,
  'art-heist': ArtHeistGame,
  'ai-hostage': AIHostageGame,
  'story-sabotage': StorySabotageGame,
};

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173', `http://localhost:${PORT}`],
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 5e6, // 5MB — enough for 30s audio clips
});

// ─── Game Registry ────────────────────────────────────────────
const GAMES = {
  'nerds-against-humanity': {
    id: 'nerds-against-humanity',
    name: 'Nerds Against Humanity',
    description: 'A party game for horrible nerds. Judge picks the funniest card combo!',
    emoji: '🃏',
    minPlayers: 3,
    maxPlayers: 10,
    color: '#4a2371',
    category: 'Wordplay & Wit',
  },
  'trivia-fetch': {
    id: 'trivia-fetch',
    name: 'Trivia Fetch!',
    description: 'Spin the wheel, answer trivia, collect paw stamps. Hosted by Gus!',
    emoji: '🐕',
    minPlayers: 2,
    maxPlayers: 6,
    color: '#6d2c94',
    category: 'Rapid Reactions',
  },
  // ── Wordplay & Wit ───────────────────────────
  'caption-this': {
    id: 'caption-this', name: 'Caption This!', emoji: '🖼️',
    description: 'Write hilarious captions for bizarre image descriptions!',
    minPlayers: 3, maxPlayers: 10, color: '#AFFF33', category: 'Wordplay & Wit',
  },
  'hot-take-tribunal': {
    id: 'hot-take-tribunal', name: 'Hot Take Tribunal', emoji: '🔥',
    description: 'Defend your most controversial opinions. The crowd judges!',
    minPlayers: 3, maxPlayers: 10, color: '#AFFF33', category: 'Wordplay & Wit',
  },
  'wrong-answers-only': {
    id: 'wrong-answers-only', name: 'Wrong Answers Only', emoji: '🚫',
    description: 'Give the worst possible answer. Embrace total absurdity!',
    minPlayers: 3, maxPlayers: 10, color: '#AFFF33', category: 'Wordplay & Wit',
  },
  'sketchy-context': {
    id: 'sketchy-context', name: 'Sketchy Context', emoji: '💬',
    description: 'Explain what\'s REALLY happening in this absurd scene!',
    minPlayers: 3, maxPlayers: 10, color: '#AFFF33', category: 'Wordplay & Wit',
  },
  'pitch-slap': {
    id: 'pitch-slap', name: 'Pitch Slap', emoji: '💡',
    description: 'Pitch a terrible product idea. The audience decides your fate!',
    minPlayers: 3, maxPlayers: 10, color: '#AFFF33', category: 'Wordplay & Wit',
  },
  // ── Moral Mayhem ─────────────────────────────
  'moral-maze': {
    id: 'moral-maze', name: 'Moral Maze', emoji: '🌀',
    description: 'Navigate a web of ethical dilemmas. What would you sacrifice?',
    minPlayers: 3, maxPlayers: 10, color: '#33CCFF', category: 'Moral Mayhem',
  },
  'lesser-evil': {
    id: 'lesser-evil', name: 'Lesser Evil', emoji: '😈',
    description: 'Choose between two terrible options. Pick the lesser evil!',
    minPlayers: 3, maxPlayers: 10, color: '#33CCFF', category: 'Moral Mayhem',
  },
  'off-the-rails': {
    id: 'off-the-rails', name: 'Off The Rails', emoji: '🚄',
    description: 'Guide a runaway trolley through escalating ethical quandaries!',
    minPlayers: 3, maxPlayers: 10, color: '#33CCFF', category: 'Moral Mayhem',
  },
  'honorable-bot': {
    id: 'honorable-bot', name: 'Honorable Bot', emoji: '🤖',
    description: 'Program a robot with your moral code. Watch it hilariously fail!',
    minPlayers: 3, maxPlayers: 10, color: '#33CCFF', category: 'Moral Mayhem',
  },
  // ── Spark of Creation ────────────────────────
  'ai-dlibs': {
    id: 'ai-dlibs', name: 'AI-Dlibs', emoji: '📝',
    description: 'Mad Libs meets AI! Fill in blanks for hilarious stories.',
    minPlayers: 3, maxPlayers: 10, color: '#ff4081', category: 'Spark of Creation',
  },
  'slide-deck': {
    id: 'slide-deck', name: 'Slide Deck', emoji: '📊',
    description: 'Improvise a presentation on a ridiculous topic. Master BS!',
    minPlayers: 3, maxPlayers: 10, color: '#ff4081', category: 'Spark of Creation',
  },
  'hieroglyphics': {
    id: 'hieroglyphics', name: 'Hieroglyphics', emoji: '🗿',
    description: 'Describe something using only emojis. Can friends decode it?',
    minPlayers: 3, maxPlayers: 10, color: '#ff4081', category: 'Spark of Creation',
  },
  'one-word-story': {
    id: 'one-word-story', name: 'One Word Story', emoji: '📖',
    description: 'Build an epic tale, one word at a time. Chaos guaranteed!',
    minPlayers: 3, maxPlayers: 10, color: '#ff4081', category: 'Spark of Creation',
  },
  // ── Sonic Shenanigans ────────────────────────
  'voice-chameleon': {
    id: 'voice-chameleon', name: 'Voice Chameleon', emoji: '🦎',
    description: 'Mimic famous voices or characters. Can you fool everyone?',
    minPlayers: 3, maxPlayers: 8, color: '#21ffb2', category: 'Sonic Shenanigans',
  },
  'sound-bites': {
    id: 'sound-bites', name: 'Sound Bites', emoji: '🔊',
    description: 'Recreate absurd sound effects or jingles with your voice!',
    minPlayers: 3, maxPlayers: 8, color: '#21ffb2', category: 'Sonic Shenanigans',
  },
  'accent-roulette': {
    id: 'accent-roulette', name: 'Accent Roulette', emoji: '🗣️',
    description: 'Speak with a random accent. Try not to break character!',
    minPlayers: 3, maxPlayers: 8, color: '#21ffb2', category: 'Sonic Shenanigans',
  },
  'ai-interview': {
    id: 'ai-interview', name: 'The AI Interview', emoji: '🎙️',
    description: 'Answer bizarre interview questions for absurd jobs!',
    minPlayers: 3, maxPlayers: 8, color: '#21ffb2', category: 'Sonic Shenanigans',
  },
  // ── Schemes & Suspects ───────────────────────
  'under-the-bus': {
    id: 'under-the-bus', name: 'Under The Bus', emoji: '🚌',
    description: 'Blame your friends for fictional crimes. Ultimate scapegoat!',
    minPlayers: 3, maxPlayers: 10, color: '#FF7F00', category: 'Schemes & Suspects',
  },
  'dead-giveaway': {
    id: 'dead-giveaway', name: 'Dead Giveaway', emoji: '👀',
    description: 'Spot the liar among you. Their tells are your victory!',
    minPlayers: 4, maxPlayers: 10, color: '#FF7F00', category: 'Schemes & Suspects',
  },
  'small-claims': {
    id: 'small-claims', name: 'Small Claims', emoji: '🏛️',
    description: 'Argue a ridiculous court case against your friends!',
    minPlayers: 3, maxPlayers: 10, color: '#FF7F00', category: 'Schemes & Suspects',
  },
  'alibi': {
    id: 'alibi', name: 'Alibi', emoji: '🕵️',
    description: 'Craft a believable alibi on the spot. Escape suspicion!',
    minPlayers: 4, maxPlayers: 10, color: '#FF7F00', category: 'Schemes & Suspects',
  },
  'wiretap': {
    id: 'wiretap', name: 'Wiretap', emoji: '🎧',
    description: 'Decipher secret conversations and uncover hidden motives!',
    minPlayers: 2, maxPlayers: 10, color: '#FF7F00', category: 'Schemes & Suspects',
  },
  'bad-influence': {
    id: 'bad-influence', name: 'Bad Influence', emoji: '🎭',
    description: 'Secretly manipulate others to achieve your mischievous goals!',
    minPlayers: 3, maxPlayers: 10, color: '#FF7F00', category: 'Schemes & Suspects',
  },
  // ── Rapid Reactions ──────────────────────────
  'snap-decision': {
    id: 'snap-decision', name: 'Snap Decision', emoji: '⏱️',
    description: 'Make split-second choices under pressure. Every second counts!',
    minPlayers: 2, maxPlayers: 10, color: '#FFE02F', category: 'Rapid Reactions',
  },
  'hot-potato': {
    id: 'hot-potato', name: 'Hot Potato', emoji: '🥔',
    description: 'Pass the bomb before it explodes. Don\'t get caught holding it!',
    minPlayers: 3, maxPlayers: 10, color: '#FFE02F', category: 'Rapid Reactions',
  },
  'deepfake-detective': {
    id: 'deepfake-detective', name: 'Deepfake Detective', emoji: '🔍',
    description: 'Spot the AI-generated fake. Your perception is tested!',
    minPlayers: 3, maxPlayers: 10, color: '#FFE02F', category: 'Rapid Reactions',
  },
  'art-heist': {
    id: 'art-heist', name: 'Art Heist', emoji: '💰',
    description: 'Quickly identify valuable art before the alarm sounds!',
    minPlayers: 3, maxPlayers: 10, color: '#FFE02F', category: 'Rapid Reactions',
  },
  'ai-hostage': {
    id: 'ai-hostage', name: 'AI Hostage', emoji: '🚨',
    description: 'Negotiate with a rogue AI to save the day. Think fast!',
    minPlayers: 3, maxPlayers: 10, color: '#FFE02F', category: 'Rapid Reactions',
  },
  'story-sabotage': {
    id: 'story-sabotage', name: 'Story Sabotage', emoji: '❌',
    description: 'Disrupt a developing story with absurd twists!',
    minPlayers: 4, maxPlayers: 10, color: '#FFE02F', category: 'Rapid Reactions',
  },
};

// ─── BellBox Lobby Room ───────────────────────────────────────
class BellBoxRoom {
  constructor(roomCode, hostId, hostName) {
    this.roomCode = roomCode;
    this.hostId = hostId;
    this.players = new Map(); // socketId -> { name, playerId, vote }
    this.playerOrder = [];
    this.playerIdMap = new Map(); // playerId -> socketId
    this.disconnectTimers = new Map();
    this.state = 'LOBBY'; // LOBBY | IN_GAME
    this.activeGame = null; // 'nerds-against-humanity' | 'trivia-fetch'
    this.gameInstance = null; // NAHRoom or TriviaGame instance
    this.votes = new Map(); // socketId -> gameId
    this.chatMessages = []; // { sender, text, timestamp }
    this.spiceLevel = 2; // 1=Family Fun, 2=Spicy, 3=Unhinged

    this.addPlayer(hostId, hostName);
  }

  addPlayer(socketId, name, playerId) {
    if (this.players.has(socketId)) return { error: 'Already in room' };
    if (this.players.size >= 10) return { error: 'Room is full (max 10)' };

    this.players.set(socketId, { name, playerId: playerId || null, vote: null });
    this.playerOrder.push(socketId);
    if (playerId) this.playerIdMap.set(playerId, socketId);
    return { success: true };
  }

  removePlayer(socketId) {
    if (!this.players.has(socketId)) return;
    const wasHost = socketId === this.hostId;

    this.players.delete(socketId);
    const idx = this.playerOrder.indexOf(socketId);
    if (idx !== -1) this.playerOrder.splice(idx, 1);
    this.votes.delete(socketId);

    if (wasHost && this.playerOrder.length > 0) {
      this.hostId = this.playerOrder[0];
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

    // Also swap in active game instance
    if (this.gameInstance) {
      // Both game types have the same reconnect signature
      this.gameInstance.reconnectPlayer(playerId, newSocketId);
    }

    return player;
  }

  castVote(socketId, gameId) {
    if (!GAMES[gameId]) return { error: 'Unknown game' };
    const player = this.players.get(socketId);
    if (!player) return { error: 'Not in room' };

    // Toggle vote off if same game
    if (this.votes.get(socketId) === gameId) {
      this.votes.delete(socketId);
      player.vote = null;
    } else {
      this.votes.set(socketId, gameId);
      player.vote = gameId;
    }

    return { success: true, votes: this.getVoteTally() };
  }

  getVoteTally() {
    const tally = {};
    for (const gameId of Object.keys(GAMES)) {
      tally[gameId] = 0;
    }
    for (const [, gameId] of this.votes) {
      if (tally[gameId] !== undefined) tally[gameId]++;
    }
    return tally;
  }

  addChat(socketId, text) {
    const player = this.players.get(socketId);
    if (!player) return null;

    const sanitized = String(text).trim().substring(0, 200);
    if (!sanitized) return null;

    const msg = {
      sender: player.name,
      text: sanitized,
      timestamp: Date.now(),
    };
    this.chatMessages.push(msg);
    // Keep last 50 messages
    if (this.chatMessages.length > 50) {
      this.chatMessages = this.chatMessages.slice(-50);
    }
    return msg;
  }

  getPlayerList() {
    return this.playerOrder.map(id => {
      const p = this.players.get(id);
      return {
        id,
        name: p.name,
        isHost: id === this.hostId,
        vote: p.vote,
      };
    });
  }

  getFullState(socketId) {
    return {
      roomCode: this.roomCode,
      players: this.getPlayerList(),
      isHost: socketId === this.hostId,
      playerName: this.players.get(socketId)?.name,
      state: this.state,
      activeGame: this.activeGame,
      votes: this.getVoteTally(),
      games: Object.values(GAMES),
      chatMessages: this.chatMessages.slice(-20),
      spiceLevel: this.spiceLevel,
    };
  }
}

// ─── Room Management ──────────────────────────────────────────
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function createRoom(hostId, hostName) {
  let code;
  do { code = generateRoomCode(); } while (rooms.has(code));
  const room = new BellBoxRoom(code, hostId, hostName);
  rooms.set(code, room);
  return room;
}

function getRoom(code) { return rooms.get(code?.toUpperCase()); }
function deleteRoom(code) { rooms.delete(code); }

function getRoomByPlayer(socketId) {
  for (const [, room] of rooms) {
    if (room.players.has(socketId)) return room;
  }
  return null;
}

function getRoomByPlayerId(playerId) {
  for (const [, room] of rooms) {
    if (room.playerIdMap.has(playerId)) return room;
  }
  return null;
}

// ─── Static Files ─────────────────────────────────────────────
app.use('/images', express.static(path.join(__dirname, '..', 'client', 'public', 'images')));
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

// ─── Socket.IO ────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🎮 Player connected: ${socket.id}`);

  // ═══════════════════════════════════════════════════════════
  // BELLBOX LOBBY EVENTS
  // ═══════════════════════════════════════════════════════════

  socket.on('reconnect-attempt', ({ playerId }, callback) => {
    if (!playerId) return callback({ error: 'No player ID' });
    const room = getRoomByPlayerId(playerId);
    if (!room) return callback({ error: 'No active game' });

    const player = room.reconnectPlayer(playerId, socket.id);
    if (!player) return callback({ error: 'Could not reconnect' });

    socket.join(room.roomCode);
    callback({ success: true, ...room.getFullState(socket.id) });

    socket.to(room.roomCode).emit('player-rejoined', {
      playerName: player.name,
      players: room.getPlayerList(),
    });
    console.log(`🔄 ${player.name} reconnected to ${room.roomCode}`);
  });

  socket.on('create-room', ({ playerName, playerId }, callback) => {
    if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
      return callback({ error: 'Name is required' });
    }
    const name = playerName.trim().substring(0, 20);
    const room = createRoom(socket.id, name);

    if (playerId) {
      const player = room.players.get(socket.id);
      if (player) player.playerId = playerId;
      room.playerIdMap.set(playerId, socket.id);
    }

    socket.join(room.roomCode);
    callback({ success: true, ...room.getFullState(socket.id) });
    console.log(`🏠 Room ${room.roomCode} created by ${name}`);
  });

  socket.on('join-room', ({ roomCode, playerName, playerId }, callback) => {
    if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
      return callback({ error: 'Name is required' });
    }
    if (!roomCode || typeof roomCode !== 'string') {
      return callback({ error: 'Room code is required' });
    }

    const name = playerName.trim().substring(0, 20);
    const code = roomCode.trim().toUpperCase();
    const room = getRoom(code);

    if (!room) return callback({ error: 'Room not found' });
    if (room.players.size >= 10) return callback({ error: 'Room is full!' });

    const result = room.addPlayer(socket.id, name, playerId);
    if (result.error) return callback(result);

    socket.join(code);
    callback({ success: true, ...room.getFullState(socket.id) });
    socket.to(code).emit('player-joined', { players: room.getPlayerList() });
    console.log(`🎮 ${name} joined room ${code}`);
  });

  // ── Game Voting ─────────────────────────────────────────
  socket.on('vote-game', ({ gameId }, callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return callback({ error: 'Not in a room' });
    if (room.state !== 'LOBBY') return callback({ error: 'Game already in progress' });

    const result = room.castVote(socket.id, gameId);
    if (result.error) return callback(result);

    callback({ success: true, votes: result.votes });
    io.to(room.roomCode).emit('vote-update', {
      votes: result.votes,
      players: room.getPlayerList(),
    });
  });

  // ── Spice Level ─────────────────────────────────────────
  socket.on('set-spice', ({ spiceLevel }, callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return callback?.({ error: 'Not in a room' });
    if (socket.id !== room.hostId) return callback?.({ error: 'Only host can change spice' });
    if (![1, 2, 3].includes(spiceLevel)) return callback?.({ error: 'Invalid spice level' });

    room.spiceLevel = spiceLevel;
    callback?.({ success: true });
    io.to(room.roomCode).emit('spice-update', { spiceLevel });
  });

  // ── Promote to Party Leader ──────────────────────────────
  socket.on('promote-host', ({ targetId }, callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return callback?.({ error: 'Not in a room' });
    if (socket.id !== room.hostId) return callback?.({ error: 'Only the Party Leader can promote' });
    if (!room.players.has(targetId)) return callback?.({ error: 'Player not found' });
    if (targetId === socket.id) return callback?.({ error: "You're already the leader" });

    room.hostId = targetId;
    const newLeader = room.players.get(targetId);
    callback?.({ success: true });

    io.to(room.roomCode).emit('host-changed', {
      newHostId: targetId,
      newHostName: newLeader?.name,
      players: room.getPlayerList(),
    });
    console.log(`⭐ ${newLeader?.name} is now Party Leader in ${room.roomCode}`);
  });

  // ── Kick Player ─────────────────────────────────────────
  socket.on('kick-player', ({ targetId }, callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return callback?.({ error: 'Not in a room' });
    if (socket.id !== room.hostId) return callback?.({ error: 'Only the Party Leader can kick' });
    if (!room.players.has(targetId)) return callback?.({ error: 'Player not found' });
    if (targetId === socket.id) return callback?.({ error: "You can't kick yourself" });

    const kicked = room.players.get(targetId);
    const kickedName = kicked?.name || 'Unknown';
    const kickedPlayerId = kicked?.playerId;

    // Clean up disconnect timer if one exists
    if (kickedPlayerId) {
      const timer = room.disconnectTimers.get(kickedPlayerId);
      if (timer) { clearTimeout(timer); room.disconnectTimers.delete(kickedPlayerId); }
      room.playerIdMap.delete(kickedPlayerId);
    }

    // Remove from game instance
    if (room.gameInstance) room.gameInstance.removePlayer(targetId);
    room.removePlayer(targetId);

    // Tell the kicked player
    io.to(targetId).emit('kicked', { reason: 'Removed by the Party Leader' });
    // Force leave the socket from the room
    const targetSocket = io.sockets.sockets.get(targetId);
    if (targetSocket) targetSocket.leave(room.roomCode);

    callback?.({ success: true });
    io.to(room.roomCode).emit('player-left', {
      playerName: kickedName,
      players: room.getPlayerList(),
      votes: room.getVoteTally(),
      kicked: true,
    });
    console.log(`🚪 ${kickedName} was kicked from ${room.roomCode}`);
  });

  // ── Chat ────────────────────────────────────────────────
  socket.on('chat-message', ({ text }, callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return callback?.({ error: 'Not in a room' });

    const msg = room.addChat(socket.id, text);
    if (!msg) return callback?.({ error: 'Empty message' });

    callback?.({ success: true });
    io.to(room.roomCode).emit('chat-message', msg);
  });

  // ── Voice Message ───────────────────────────────────────
  socket.on('voice-message', async ({ audio, mimeType, duration }, callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return callback?.({ error: 'Not in a room' });

    const player = room.players.get(socket.id);
    if (!player) return callback?.({ error: 'Not in room' });

    if (!audio || typeof audio !== 'string' || audio.length > 7_000_000) {
      return callback?.({ error: 'Invalid audio data' });
    }

    // Transcribe via Gemini in the background
    let transcript = '[Voice message]';
    try {
      transcript = await transcribeAudio(audio, mimeType || 'audio/webm');
    } catch { /* use default */ }

    const msg = {
      sender: player.name,
      text: transcript,
      audio,
      mimeType: mimeType || 'audio/webm',
      audioDuration: duration || 0,
      timestamp: Date.now(),
      isVoice: true,
    };

    room.chatMessages.push(msg);
    if (room.chatMessages.length > 50) {
      room.chatMessages = room.chatMessages.slice(-50);
    }

    callback?.({ success: true, transcript });
    io.to(room.roomCode).emit('chat-message', msg);
  });

  // ── Audio Analysis (for AI games) ───────────────────────
  socket.on('analyze-audio', async ({ audio, mimeType, prompt }, callback) => {
    if (!audio || !prompt) return callback?.({ error: 'Missing audio or prompt' });
    if (typeof audio !== 'string' || audio.length > 7_000_000) {
      return callback?.({ error: 'Invalid audio data' });
    }

    try {
      const result = await analyzeAudio(audio, mimeType || 'audio/webm', prompt);
      callback?.({ success: true, result });
    } catch (e) {
      callback?.({ error: 'Audio analysis failed' });
    }
  });

  // ── Launch Game ─────────────────────────────────────────
  socket.on('launch-game', async ({ gameId, selectedThemes } = {}, callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return callback({ error: 'Not in a room' });
    if (socket.id !== room.hostId) return callback({ error: 'Only the host can launch' });
    if (room.state !== 'LOBBY') return callback({ error: 'Game already in progress' });

    const game = GAMES[gameId];
    if (!game) return callback({ error: 'Unknown game' });

    if (room.players.size < game.minPlayers) {
      return callback({ error: `Need at least ${game.minPlayers} players for ${game.name}` });
    }
    if (room.players.size > game.maxPlayers) {
      return callback({ error: `${game.name} supports max ${game.maxPlayers} players` });
    }

    room.activeGame = gameId;
    room.state = 'IN_GAME';

    // Create game-specific instance using the existing players
    if (gameId === 'nerds-against-humanity') {
      // Create NAH room and add all players
      room.gameInstance = new NAHRoom(room.roomCode, room.hostId, room.players.get(room.hostId).name);
      // Add remaining players
      for (const socketId of room.playerOrder) {
        if (socketId !== room.hostId) {
          const p = room.players.get(socketId);
          room.gameInstance.addPlayer(socketId, p.name, p.playerId);
        }
      }
      // Copy playerId mappings
      for (const [pid, sid] of room.playerIdMap) {
        room.gameInstance.playerIdMap.set(pid, sid);
      }

      const startResult = room.gameInstance.startGame(selectedThemes, room.spiceLevel);
      if (startResult.error) {
        room.state = 'LOBBY';
        room.activeGame = null;
        room.gameInstance = null;
        return callback(startResult);
      }

      callback({ success: true, game: gameId });

      // Tell all clients, then send each player their hand
      io.to(room.roomCode).emit('game-launched', { game: gameId });

      for (const socketId of room.gameInstance.playerOrder) {
        const player = room.gameInstance.players.get(socketId);
        io.to(socketId).emit('new-round', {
          blackCard: room.gameInstance.currentBlackCard,
          hand: player.hand,
          cardCzar: room.gameInstance.getCardCzarId(),
          roundNumber: room.gameInstance.roundNumber,
          players: room.gameInstance.getPlayerList(),
          scores: room.gameInstance.getScores(),
        });
      }

    } else if (gameId === 'trivia-fetch') {
      room.gameInstance = new TriviaGame(room.roomCode, room.hostId, room.players.get(room.hostId).name);
      for (const socketId of room.playerOrder) {
        if (socketId !== room.hostId) {
          const p = room.players.get(socketId);
          room.gameInstance.addPlayer(socketId, p.name, p.playerId);
        }
      }
      for (const [pid, sid] of room.playerIdMap) {
        room.gameInstance.playerIdMap.set(pid, sid);
      }

      const startResult = room.gameInstance.startGame();
      if (startResult.error) {
        room.state = 'LOBBY';
        room.activeGame = null;
        room.gameInstance = null;
        return callback(startResult);
      }

      callback({ success: true, game: gameId });

      io.to(room.roomCode).emit('game-launched', { game: gameId });
      io.to(room.roomCode).emit('game-started', {
        players: room.gameInstance.getPlayerList(),
        activePlayerId: room.gameInstance.getActivePlayerId(),
        categories: CATEGORIES,
      });

      sendGusReaction(room, 'game_start', {
        detail: `Game starting with ${room.playerOrder.length} players!`,
      });

    } else if (BASE_GAME_CLASSES[gameId]) {
      // ── Generic BaseGame launch ─────────────────────────
      const GameClass = BASE_GAME_CLASSES[gameId];
      room.gameInstance = new GameClass(room.roomCode);

      // Add all players with their playerIds for reconnection
      for (const socketId of room.playerOrder) {
        const p = room.players.get(socketId);
        room.gameInstance.addPlayer(socketId, p.name, p.playerId);
      }

      // Start game
      const startResult = await room.gameInstance.startGame(room.spiceLevel);
      if (startResult?.error) {
        room.state = 'LOBBY';
        room.activeGame = null;
        room.gameInstance = null;
        return callback(startResult);
      }

      callback({ success: true, game: gameId });

      io.to(room.roomCode).emit('game-launched', { game: gameId });
      io.to(room.roomCode).emit('bg-round-start', startResult);
    }

    console.log(`🎲 ${game.name} launched in room ${room.roomCode}`);
  });

  // ── Return to Lobby (from game) ─────────────────────────
  socket.on('return-to-lobby', () => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;
    if (socket.id !== room.hostId) return;

    room.state = 'LOBBY';
    room.activeGame = null;
    room.gameInstance = null;
    room.votes = new Map();
    for (const [, p] of room.players) { p.vote = null; }

    io.to(room.roomCode).emit('back-to-lobby', {
      players: room.getPlayerList(),
      votes: room.getVoteTally(),
      games: Object.values(GAMES),
      spiceLevel: room.spiceLevel,
    });
  });

  // ═══════════════════════════════════════════════════════════
  // NERDS AGAINST HUMANITY GAME EVENTS
  // ═══════════════════════════════════════════════════════════

  socket.on('get-themes', (callback) => {
    callback(nahThemes);
  });

  socket.on('submit-cards', ({ cardIndices }, callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room || room.activeGame !== 'nerds-against-humanity') return callback({ error: 'Not in NAH game' });

    const gi = room.gameInstance;
    const result = gi.submitCards(socket.id, cardIndices);
    if (result.error) return callback(result);

    callback({ success: true });

    io.to(room.roomCode).emit('submission-update', {
      players: gi.getPlayerList(),
      submittedCount: gi.submissions.size,
      totalNeeded: gi.playerOrder.length - 1,
    });

    if (gi.state === 'JUDGING') {
      io.to(room.roomCode).emit('judging-phase', {
        submissions: gi.getAnonymousSubmissions(),
        blackCard: gi.currentBlackCard,
        cardCzar: gi.getCardCzarId(),
      });
    }
  });

  socket.on('judge-pick', ({ submissionIndex }, callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room || room.activeGame !== 'nerds-against-humanity') return callback({ error: 'Not in NAH game' });

    const gi = room.gameInstance;
    if (socket.id !== gi.getCardCzarId()) return callback({ error: 'Only the Card Czar can judge' });

    const result = gi.judgeWinner(submissionIndex);
    if (result.error) return callback(result);

    callback({ success: true });

    io.to(room.roomCode).emit('round-winner', {
      winnerName: result.winnerName,
      winningCards: result.winningCards,
      blackCard: result.blackCard,
      scores: gi.getScores(),
      gameOver: result.gameOver,
    });
  });

  socket.on('next-round', () => {
    const room = getRoomByPlayer(socket.id);
    if (!room || room.activeGame !== 'nerds-against-humanity') return;

    const gi = room.gameInstance;
    if (gi.state === 'GAME_OVER') return;
    if (gi.state === 'ROUND_END') {
      gi.startRound();
      emitNAHNewRound(room);
    }
  });

  socket.on('play-again', () => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;
    if (socket.id !== room.hostId) return;

    if (room.activeGame === 'nerds-against-humanity') {
      const gi = room.gameInstance;
      gi.state = 'LOBBY';
      for (const [, player] of gi.players) {
        player.score = 0;
        player.hand = [];
      }
      gi.roundNumber = 0;
      gi.cardCzarIndex = 0;
    } else if (room.activeGame === 'trivia-fetch') {
      room.gameInstance.resetToLobby();
    }

    // Return to BellBox lobby
    room.state = 'LOBBY';
    room.activeGame = null;
    room.gameInstance = null;
    room.votes = new Map();
    for (const [, p] of room.players) { p.vote = null; }

    io.to(room.roomCode).emit('back-to-lobby', {
      players: room.getPlayerList(),
      votes: room.getVoteTally(),
      games: Object.values(GAMES),
    });
  });

  // ═══════════════════════════════════════════════════════════
  // TRIVIA FETCH GAME EVENTS
  // ═══════════════════════════════════════════════════════════

  socket.on('get-categories', (callback) => {
    callback({ categories: CATEGORIES, segments: WHEEL_SEGMENTS });
  });

  socket.on('spin-wheel', async (callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room || room.activeGame !== 'trivia-fetch') return callback({ error: 'Not in Trivia game' });

    const gi = room.gameInstance;
    if (socket.id !== gi.getActivePlayerId()) return callback({ error: 'Not your turn' });

    const result = gi.spinWheel();
    if (result.error) return callback(result);

    callback({ success: true, ...result });

    io.to(room.roomCode).emit('wheel-result', {
      segmentIndex: result.segmentIndex,
      segment: result.segment,
      categoryId: result.categoryId,
      spinnerName: gi.getActivePlayer().name,
    });

    if (result.categoryId === 'crown') {
      sendGusReaction(room, 'crown_attempt', { playerName: gi.getActivePlayer().name });
    } else if (result.categoryId === 'crown_not_ready') {
      sendGusReaction(room, 'crown_not_ready', { playerName: gi.getActivePlayer().name });
    } else if (result.categoryId === 'wild') {
      sendGusReaction(room, 'wild', { playerName: gi.getActivePlayer().name });
    }
  });

  socket.on('request-question', async (callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room || room.activeGame !== 'trivia-fetch') return callback({ error: 'Not in Trivia game' });

    try {
      const gi = room.gameInstance;
      const question = await gi.fetchQuestion();
      callback({ success: true, ...question });

      io.to(room.roomCode).emit('question-show', {
        question: question.question,
        options: question.options,
        timeLimit: question.timeLimit,
        activePlayerId: gi.getActivePlayerId(),
      });

      gi.answerTimer = setTimeout(() => {
        const result = gi.handleTimeout(gi.getActivePlayerId());
        if (result) {
          io.to(room.roomCode).emit('answer-result', result);
          sendGusReaction(room, 'timeout', { playerName: gi.getActivePlayer()?.name });
          io.to(room.roomCode).emit('turn-update', {
            activePlayerId: gi.getActivePlayerId(),
            state: gi.state,
          });
        }
      }, (question.timeLimit + 1) * 1000);
    } catch (e) {
      callback({ error: 'Failed to generate question' });
    }
  });

  socket.on('submit-answer', async ({ answerIndex }, callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room || room.activeGame !== 'trivia-fetch') return callback({ error: 'Not in Trivia game' });

    const gi = room.gameInstance;
    const result = gi.submitAnswer(socket.id, answerIndex);
    if (result.error) return callback(result);

    callback({ success: true, ...result });
    io.to(room.roomCode).emit('answer-result', result);

    const player = gi.players.get(socket.id);
    const playerName = player?.name || 'someone';

    if (result.gameWon) {
      sendGusReaction(room, 'win', { playerName });
      io.to(room.roomCode).emit('game-over', {
        winnerName: result.winnerName,
        scores: result.scores,
      });
    } else if (result.correct) {
      if (result.stampEarned) {
        sendGusReaction(room, 'stamp', { playerName, detail: `earned the ${result.stampEarned} stamp` });
      } else if (result.streakCount >= 3) {
        sendGusReaction(room, 'streak', { playerName, detail: `${result.streakCount} in a row!` });
      } else {
        sendGusReaction(room, 'correct', { playerName });
      }
    } else {
      sendGusReaction(room, 'wrong', { playerName });
    }

    io.to(room.roomCode).emit('turn-update', {
      activePlayerId: gi.getActivePlayerId(),
      state: gi.state,
      choosingStamp: result.choosingStamp,
    });
  });

  socket.on('choose-stamp', ({ categoryId }, callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room || room.activeGame !== 'trivia-fetch') return callback({ error: 'Not in Trivia game' });

    const gi = room.gameInstance;
    const result = gi.chooseStamp(socket.id, categoryId);
    if (result.error) return callback(result);

    callback({ success: true, ...result });

    const player = gi.players.get(socket.id);
    io.to(room.roomCode).emit('stamp-chosen', {
      playerName: player?.name,
      stampEarned: result.stampEarned,
      pawStamps: result.pawStamps,
    });

    if (result.gameWon) {
      sendGusReaction(room, 'win', { playerName: player?.name });
      io.to(room.roomCode).emit('game-over', {
        winnerName: result.winnerName,
        scores: gi.getScores(),
      });
    } else {
      sendGusReaction(room, 'stamp', {
        playerName: player?.name,
        detail: `chose the ${result.stampEarned} stamp from Gus's Wild!`,
      });
    }

    io.to(room.roomCode).emit('turn-update', {
      activePlayerId: gi.getActivePlayerId(),
      state: gi.state,
    });
  });

  socket.on('answer-timeout', (callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room || room.activeGame !== 'trivia-fetch') return callback?.({ error: 'Not in Trivia game' });

    const gi = room.gameInstance;
    const result = gi.handleTimeout(socket.id);
    if (!result) return callback?.({ error: 'Not in question phase' });

    callback?.({ success: true, ...result });
    io.to(room.roomCode).emit('answer-result', result);
    sendGusReaction(room, 'timeout', { playerName: gi.players.get(socket.id)?.name });

    io.to(room.roomCode).emit('turn-update', {
      activePlayerId: gi.getActivePlayerId(),
      state: gi.state,
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GENERIC BASEGAME EVENTS
  // ═══════════════════════════════════════════════════════════

  function isBaseGame(room) {
    return room && BASE_GAME_CLASSES[room.activeGame] && room.gameInstance;
  }

  // ── Submit entry (text or audio) ────────────────────────
  socket.on('bg-submit', async ({ submission } = {}, callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!isBaseGame(room)) return callback?.({ error: 'Not in a BaseGame' });

    const gi = room.gameInstance;
    const result = gi.submitEntry(socket.id, submission);
    if (result.error) return callback?.({ error: result.error });

    callback?.({ success: true });

    io.to(room.roomCode).emit('bg-submission-update', {
      submittedCount: result.submittedCount,
      totalPlayers: result.totalPlayers,
      players: gi.getPlayerList(),
    });

    if (result.allSubmitted) {
      // Lock and move to reveal  
      const lockResult = await gi.lockSubmissions();
      if (lockResult) {
        // Some games (snap-decision, hot-potato) skip reveal/voting and return scores directly
        if (lockResult.roundScores) {
          io.to(room.roomCode).emit('bg-round-end', {
            state: lockResult.state,
            round: lockResult.round,
            roundScores: lockResult.roundScores,
            leaderboard: lockResult.leaderboard,
            bellbotSays: lockResult.bellbotSays,
            correctAnswer: lockResult.correctAnswer,
            gameOver: lockResult.gameOver,
          });
        } else {
          io.to(room.roomCode).emit('bg-reveal-start', {
            state: lockResult.state,
            totalSubmissions: lockResult.totalSubmissions,
          });
          // Auto-reveal all submissions sequentially
          emitBaseGameReveals(room);
        }
      }
    }
  });

  // ── Force lock submissions (host or timer) ──────────────
  socket.on('bg-lock', async (callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!isBaseGame(room)) return callback?.({ error: 'Not in a BaseGame' });

    const gi = room.gameInstance;
    const lockResult = await gi.lockSubmissions();
    if (lockResult?.error) return callback?.({ error: lockResult.error });

    callback?.({ success: true });

    if (lockResult.roundScores) {
      io.to(room.roomCode).emit('bg-round-end', {
        state: lockResult.state,
        round: lockResult.round,
        roundScores: lockResult.roundScores,
        leaderboard: lockResult.leaderboard,
        bellbotSays: lockResult.bellbotSays,
        correctAnswer: lockResult.correctAnswer,
        gameOver: lockResult.gameOver,
      });
    } else {
      io.to(room.roomCode).emit('bg-reveal-start', {
        state: lockResult.state,
        totalSubmissions: lockResult.totalSubmissions,
      });
      emitBaseGameReveals(room);
    }
  });

  // ── Cast vote ───────────────────────────────────────────
  socket.on('bg-vote', ({ targetId } = {}, callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!isBaseGame(room)) return callback?.({ error: 'Not in a BaseGame' });

    const gi = room.gameInstance;
    const result = gi.castVote(socket.id, targetId);
    if (result.error) return callback?.({ error: result.error });

    callback?.({ success: true });

    io.to(room.roomCode).emit('bg-vote-update', {
      players: gi.getPlayerList(),
    });

    if (result.allVoted) {
      tallyBaseGameScores(room);
    }
  });

  // ── Force tally (host or timer) ─────────────────────────
  socket.on('bg-tally', async (callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!isBaseGame(room)) return callback?.({ error: 'Not in a BaseGame' });

    callback?.({ success: true });
    await tallyBaseGameScores(room);
  });

  // ── Next round ──────────────────────────────────────────
  socket.on('bg-next-round', async (callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!isBaseGame(room)) return callback?.({ error: 'Not in a BaseGame' });

    const gi = room.gameInstance;
    const result = await gi.startNextRound();
    if (result?.error) return callback?.({ error: result.error });

    callback?.({ success: true });
    io.to(room.roomCode).emit('bg-round-start', result);
  });

  // ═══════════════════════════════════════════════════════════
  // LEAVE / DISCONNECT
  // ═══════════════════════════════════════════════════════════

  socket.on('leave-game', (callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return callback?.({ error: 'Not in a room' });

    const player = room.players.get(socket.id);
    const playerName = player?.name || 'Unknown';
    const playerId = player?.playerId;

    if (playerId) {
      const timer = room.disconnectTimers.get(playerId);
      if (timer) { clearTimeout(timer); room.disconnectTimers.delete(playerId); }
      room.playerIdMap.delete(playerId);
    }

    socket.leave(room.roomCode);

    // Remove from game instance too
    if (room.gameInstance) {
      room.gameInstance.removePlayer(socket.id);
    }
    room.removePlayer(socket.id);

    if (room.players.size === 0) {
      deleteRoom(room.roomCode);
      console.log(`🗑️ Room ${room.roomCode} deleted (empty)`);
    } else {
      io.to(room.roomCode).emit('player-left', {
        playerName,
        players: room.getPlayerList(),
        votes: room.getVoteTally(),
      });

      // Check if game instance needs ending
      if (room.gameInstance && room.activeGame === 'nerds-against-humanity') {
        const gi = room.gameInstance;
        if (gi.state === 'GAME_OVER') {
          io.to(room.roomCode).emit('round-winner', {
            winnerName: null, winningCards: [], blackCard: gi.currentBlackCard,
            scores: gi.getScores(), gameOver: true, message: 'Not enough players',
          });
        } else if (gi.state === 'PICKING') {
          emitNAHNewRound(room);
        }
      }
      if (room.gameInstance && room.activeGame === 'trivia-fetch') {
        const gi = room.gameInstance;
        if (gi.state === 'GAME_OVER') {
          io.to(room.roomCode).emit('game-over', {
            winnerName: null, reason: 'Not enough players', scores: gi.getScores(),
          });
        }
      }
    }

    callback?.({ success: true });
    console.log(`👋 ${playerName} left room ${room.roomCode}`);
  });

  socket.on('disconnect', () => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return;

    const player = room.players.get(socket.id);
    const playerName = player?.name || 'Unknown';
    const playerId = player?.playerId;

    if (playerId && room.state === 'IN_GAME') {
      // Grace period for reconnection during gameplay
      room.disconnectTimers.set(playerId, setTimeout(() => {
        room.disconnectTimers.delete(playerId);
        if (room.gameInstance) room.gameInstance.removePlayer(socket.id);
        room.removePlayer(socket.id);

        if (room.players.size === 0) {
          deleteRoom(room.roomCode);
        } else {
          io.to(room.roomCode).emit('player-left', {
            playerName, players: room.getPlayerList(),
          });
        }
      }, 30000));
      console.log(`⏸️ ${playerName} disconnected from ${room.roomCode} (30s grace)`);
    } else {
      if (room.gameInstance) room.gameInstance.removePlayer(socket.id);
      room.removePlayer(socket.id);

      if (room.players.size === 0) {
        deleteRoom(room.roomCode);
        console.log(`🗑️ Room ${room.roomCode} deleted (empty)`);
      } else {
        io.to(room.roomCode).emit('player-left', {
          playerName, players: room.getPlayerList(), votes: room.getVoteTally(),
        });
      }
      console.log(`👋 ${playerName} disconnected from ${room.roomCode}`);
    }
  });
});

// ─── Helpers ──────────────────────────────────────────────────
function emitNAHNewRound(room) {
  const gi = room.gameInstance;
  for (const socketId of gi.playerOrder) {
    const player = gi.players.get(socketId);
    io.to(socketId).emit('new-round', {
      blackCard: gi.currentBlackCard,
      hand: player.hand,
      cardCzar: gi.getCardCzarId(),
      roundNumber: gi.roundNumber,
      players: gi.getPlayerList(),
      scores: gi.getScores(),
    });
  }
}

async function sendGusReaction(room, event, context = {}) {
  try {
    context.spiceLevel = room.spiceLevel;
    const msg = await getGusReaction(event, context);
    io.to(room.roomCode).emit('gus-says', { message: msg });
  } catch { /* non-critical */ }
}

// ── BaseGame reveal + scoring helpers ─────────────────────────
async function emitBaseGameReveals(room) {
  const gi = room.gameInstance;
  const reveals = [];

  // Collect all reveals
  let next = gi.getNextReveal();
  while (next && !next.done) {
    reveals.push(next);
    next = gi.getNextReveal();
  }

  // Send all reveals at once, then move to voting (or scoring if no voting)
  io.to(room.roomCode).emit('bg-reveals', {
    reveals,
    state: gi.state,
    timeLimit: gi.votingTime,
  });

  // If game auto-skipped voting (e.g. snap-decision with votingTime=0)
  if (gi.state === 'ROUND_END' || gi.state === 'GAME_OVER' || gi.state === 'SCORING') {
    // Some games handle scoring internally (snap-decision)
    io.to(room.roomCode).emit('bg-round-end', {
      state: gi.state,
      round: gi.round,
      roundScores: [],
      leaderboard: gi.getScores(),
      gameOver: gi.state === 'GAME_OVER',
    });
  }
}

async function tallyBaseGameScores(room) {
  const gi = room.gameInstance;
  const result = await gi.tallyScores();
  if (result?.error) return;

  io.to(room.roomCode).emit('bg-round-end', {
    state: result.state,
    round: result.round,
    roundScores: result.roundScores,
    leaderboard: result.leaderboard,
    bellbotSays: result.bellbotSays,
    gameOver: result.gameOver,
  });
}

// ─── Start Server ─────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
  🎉 ═══════════════════════════════════════ 🎉
  ║                                           ║
  ║    BELLBOX PARTY PACK                     ║
  ║    Server running on port ${PORT}             ║
  ║    "Let the party begin!" 🎮              ║
  ║                                           ║
  🎉 ═══════════════════════════════════════ 🎉
  `);

  // Show LAN IP for phone access
  import('os').then(os => {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`   📱 Network: http://${net.address}:${PORT}`);
        }
      }
    }
    console.log(`   💻 Local:   http://localhost:${PORT}\n`);
  });

  // Auto-generate missing trivia images
  const missing = getMissingAssets();
  if (missing.length > 0) {
    console.log(`🎨 Generating ${missing.length} missing game images...`);
    generateAllAssets((msg) => console.log(msg)).then(({ generated, failed }) => {
      if (failed > 0) console.warn(`⚠️ ${failed} images failed`);
      else console.log('✅ All game images ready!');
    });
  }
});
