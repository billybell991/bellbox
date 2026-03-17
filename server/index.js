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
import { MemeGameRoom } from './games/meme-melee/game.js';
import { TriviaGame } from './games/trivia-fetch/game.js';
import { ALL_CATEGORIES, DEFAULT_CATEGORY_IDS, getGusReaction } from './games/trivia-fetch/trivia.js';

// ── Universal Topic Packs ─────────────────────────────────
const TOPIC_PACKS = {
  'standard':  { id: 'standard',  name: 'Standard Nerdery',     emoji: '🤓', description: 'The classic catch-all pack of horrible nerdery' },
  'scifi':     { id: 'scifi',     name: 'Sci-Fi Smut',          emoji: '🚀', description: 'Boldly going where no one has gone before' },
  'fantasy':   { id: 'fantasy',   name: 'Fantasy & Fables',     emoji: '🐉', description: 'Swords, sorcery, and deeply questionable choices' },
  'nostalgia': { id: 'nostalgia', name: '90s/2000s Nostalgia',   emoji: '📼', description: 'A/S/L? The golden age of internet chaos' },
  'horror':    { id: 'horror',    name: 'Horror & Gore',        emoji: '🔪', description: 'The only thing scarier than these cards is your browser history' },
  'science':   { id: 'science',   name: 'Science & Tech',       emoji: '⚗️', description: 'When STEM majors drink too much' },
};
import { generateAllAssets, getMissingAssets } from './games/trivia-fetch/generate-assets.js';
import { transcribeAudio, analyzeAudio, isAudioAvailable } from './gemini-audio.js';
import { getBellBotCommentary, parseBellBotJSON } from './bellbot.js';

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
import { SuperSketchyGame } from './games/super-sketchy/game.js';

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
    howToPlay: 'Each round, one player is the Card Czar and draws a black prompt card. Everyone else picks the funniest white card from their hand to complete the prompt. The Card Czar reads all submissions and picks the winner. First to the score limit wins!',
    emoji: '🃏',
    minPlayers: 3,
    maxPlayers: 10,
    color: '#AFFF33',
    category: 'Wordplay & Wit',
    enabled: true,
    spicy: true,
  },
  'trivia-fetch': {
    id: 'trivia-fetch',
    name: 'Trivia Fetch!',
    description: 'Spin the wheel, answer trivia, collect treats. Hosted by Gus!',
    howToPlay: 'Take turns spinning the wheel to land on a trivia category. Answer correctly to earn treats and keep spinning! Answer wrong and your turn passes. First to collect all 6 treats wins. Hosted by Gus the dog!',
    emoji: '🐕',
    minPlayers: 2,
    maxPlayers: 6,
    color: '#bf6eff',
    category: 'Rapid Reactions',
    enabled: true,
    triviaThemes: true,
  },
  // ── Wordplay & Wit ───────────────────────────
  'caption-this': {
    id: 'caption-this', name: 'Artificial Insult-igence', emoji: '🤖',
    description: 'Write hilarious captions for bizarre AI images — and get roasted by SassBot!',
    howToPlay: 'Each round, an AI generates a bizarre image. Everyone writes their funniest caption for it. SassBot — the AI judge — roasts your answers and scores each one based on creativity, humor, and relevance. The sassier the spice level, the meaner SassBot gets. Highest score wins the round!',
    minPlayers: 3, maxPlayers: 10, color: '#AFFF33', category: 'Wordplay & Wit',
    spicy: true, enabled: true,
  },
  'hot-take-tribunal': {
    id: 'hot-take-tribunal', name: 'Hot Take Tribunal', emoji: '🔥',
    description: 'Defend your most controversial opinions. The crowd judges!',
    howToPlay: 'Each round presents a spicy topic. One player must defend an outrageous hot take while everyone else judges how convincing they are. The crowd votes guilty or not guilty!',
    minPlayers: 3, maxPlayers: 10, color: '#AFFF33', category: 'Wordplay & Wit',
  },
  'wrong-answers-only': {
    id: 'wrong-answers-only', name: 'Wrong Answers Only', emoji: '🚫',
    description: 'Give the worst possible answer. Embrace total absurdity!',
    howToPlay: 'A question appears and everyone races to give the WORST, most hilariously wrong answer. The AI judges how creatively terrible your answer is. Points for maximum absurdity!',
    minPlayers: 3, maxPlayers: 10, color: '#AFFF33', category: 'Wordplay & Wit',
  },
  'sketchy-context': {
    id: 'sketchy-context', name: 'Sketchy Context', emoji: '💬',
    description: 'Explain what\'s REALLY happening in this absurd scene!',
    howToPlay: 'An AI describes a bizarre scene. Players must write the most hilarious explanation for what is actually going on. Vote for the funniest context! The best storyteller wins.',
    minPlayers: 3, maxPlayers: 10, color: '#AFFF33', category: 'Wordplay & Wit',
  },
  'pitch-slap': {
    id: 'pitch-slap', name: 'Pitch Slap', emoji: '💡',
    description: 'Pitch a terrible product idea. The audience decides your fate!',
    howToPlay: 'You get a ridiculous product concept. Pitch it to the group like your life depends on it! Everyone votes on whether they would invest. Best pitch wins the round!',
    minPlayers: 3, maxPlayers: 10, color: '#AFFF33', category: 'Wordplay & Wit',
  },
  // ── Moral Mayhem ─────────────────────────────
  'moral-maze': {
    id: 'moral-maze', name: 'Moral Maze', emoji: '🌀',
    description: 'Navigate a web of ethical dilemmas. What would you sacrifice?',
    howToPlay: 'Face increasingly absurd ethical dilemmas. Everyone picks their choice secretly, then all answers are revealed. See who shares your moral compass (or lack thereof)!',
    minPlayers: 3, maxPlayers: 10, color: '#33CCFF', category: 'Moral Mayhem',
  },
  'lesser-evil': {
    id: 'lesser-evil', name: 'Lesser Evil', emoji: '😈',
    description: 'Choose between two terrible options. Pick the lesser evil!',
    howToPlay: 'Two awful scenarios are presented. Everyone votes for the one they think is less terrible. If you pick the majority answer, you score! Consensus is survival.',
    minPlayers: 3, maxPlayers: 10, color: '#33CCFF', category: 'Moral Mayhem',
  },
  'off-the-rails': {
    id: 'off-the-rails', name: 'Off The Rails', emoji: '🚄',
    description: 'Guide a runaway trolley through escalating ethical quandaries!',
    howToPlay: 'The classic trolley problem, but it keeps getting worse. Each round adds a new twist. Make your choice and see how your friends react. No judgment... okay, lots of judgment.',
    minPlayers: 3, maxPlayers: 10, color: '#33CCFF', category: 'Moral Mayhem',
  },
  'honorable-bot': {
    id: 'honorable-bot', name: 'Honorable Bot', emoji: '🤖',
    description: 'Program a robot with your moral code. Watch it hilariously fail!',
    howToPlay: 'Write rules for an AI robot to follow. Then watch as it encounters situations your rules never anticipated. The AI interprets your rules literally with hilarious results!',
    minPlayers: 3, maxPlayers: 10, color: '#33CCFF', category: 'Moral Mayhem',
  },
  // ── Spark of Creation ────────────────────────
  'ai-dlibs': {
    id: 'ai-dlibs', name: 'AI-Dlibs', emoji: '📝',
    description: 'Mad Libs meets AI! Fill in blanks for hilarious stories.',
    howToPlay: 'Everyone submits words for different categories (noun, verb, adjective, etc.). The AI weaves them into an absurd story. The results are read aloud for maximum laughs!',
    minPlayers: 3, maxPlayers: 10, color: '#ff4081', category: 'Spark of Creation',
  },
  'slide-deck': {
    id: 'slide-deck', name: 'Slide Deck', emoji: '📊',
    description: 'Improvise a presentation on a ridiculous topic. Master BS!',
    howToPlay: 'You get a random ridiculous presentation topic and must improvise a convincing pitch. The AI generates absurd slide titles to guide you. Everyone votes on the best BS artist!',
    minPlayers: 3, maxPlayers: 10, color: '#ff4081', category: 'Spark of Creation',
  },
  'hieroglyphics': {
    id: 'hieroglyphics', name: 'High-roglyphics', emoji: '🫅',
    description: 'Decode emoji rebus puzzles! Pharaoh Punhotep demands answers!',
    howToPlay: 'Each round, the AI creates an emoji rebus puzzle based on the topic packs you picked at launch. Type your best guess! The closer your answer, the more points you earn. Exact matches score big. Pharaoh Punhotep judges your wisdom!',
    minPlayers: 3, maxPlayers: 10, color: '#ff4081', category: 'Spark of Creation',
    spicy: true, enabled: true,
  },
  'one-word-story': {
    id: 'one-word-story', name: 'One Word Story', emoji: '📖',
    description: 'Build an epic tale, one word at a time. Chaos guaranteed!',
    howToPlay: 'Players take turns adding one word to build a story. The AI keeps track and narrates. Try to steer the story in hilarious directions! Bonus points for plot twists.',
    minPlayers: 3, maxPlayers: 10, color: '#ff4081', category: 'Spark of Creation',
  },
  // ── Sonic Shenanigans ────────────────────────
  'voice-chameleon': {
    id: 'voice-chameleon', name: 'Voice Chameleon', emoji: '🦎',
    description: 'Mimic famous voices or characters. Can you fool everyone?',
    howToPlay: 'Get a character or celebrity to impersonate. Record yourself doing the voice. Everyone listens and rates your impression. The AI also judges your accuracy!',
    minPlayers: 3, maxPlayers: 8, color: '#21ffb2', category: 'Sonic Shenanigans',
  },
  'sound-bites': {
    id: 'sound-bites', name: 'Sound Bites', emoji: '🔊',
    description: 'Recreate absurd sound effects or jingles with your voice!',
    howToPlay: 'Get a sound effect prompt (car crash, laser beam, dramatic gasp). Record yourself making the sound with just your voice. Everyone votes on the most convincing (or funniest) recreation!',
    minPlayers: 3, maxPlayers: 8, color: '#21ffb2', category: 'Sonic Shenanigans',
  },
  'accent-roulette': {
    id: 'accent-roulette', name: 'Accent Roulette', emoji: '🗣️',
    description: 'Speak with a random accent. Try not to break character!',
    howToPlay: 'Spin the wheel for a random accent. Read a sentence in that accent and record it. The AI analyzes your attempt. Players vote on who nailed it (or hilariously butchered it)!',
    minPlayers: 3, maxPlayers: 8, color: '#21ffb2', category: 'Sonic Shenanigans',
  },
  'ai-interview': {
    id: 'ai-interview', name: 'The AI Interview', emoji: '🎙️',
    description: 'Answer bizarre interview questions for absurd jobs!',
    howToPlay: 'You are interviewing for ridiculous jobs (Professional Mattress Tester, Zombie Therapist). Answer the AI interviewer\'s bizarre questions. Players vote on who got "hired"!',
    minPlayers: 3, maxPlayers: 8, color: '#21ffb2', category: 'Sonic Shenanigans',
  },
  // ── Schemes & Suspects ───────────────────────
  'under-the-bus': {
    id: 'under-the-bus', name: 'Under The Bus', emoji: '🚌',
    description: 'Blame your friends for fictional crimes. Ultimate scapegoat!',
    howToPlay: 'A fictional crime is presented. Write the most convincing argument for why ANOTHER player is guilty. Everyone votes on the most believable accusation. Don\'t get thrown under the bus!',
    minPlayers: 3, maxPlayers: 10, color: '#FF7F00', category: 'Schemes & Suspects',
  },
  'dead-giveaway': {
    id: 'dead-giveaway', name: 'Dead Giveaway', emoji: '👀',
    description: 'Spot the liar among you. Their tells are your victory!',
    howToPlay: 'One player gets a secret lie to tell. Everyone else tries to identify the liar by asking questions. The liar must stay convincing. Vote to catch them!',
    minPlayers: 4, maxPlayers: 10, color: '#FF7F00', category: 'Schemes & Suspects',
  },
  'small-claims': {
    id: 'small-claims', name: 'Small Claims', emoji: '🏛️',
    description: 'Argue a ridiculous court case against your friends!',
    howToPlay: 'Two players face off in a ridiculous court case (who stole the last pizza slice?). Present your argument and call witnesses. The jury (other players) delivers the verdict!',
    minPlayers: 3, maxPlayers: 10, color: '#FF7F00', category: 'Schemes & Suspects',
  },
  'alibi': {
    id: 'alibi', name: 'Alibi', emoji: '🕵️',
    description: 'Craft a believable alibi on the spot. Escape suspicion!',
    howToPlay: 'A crime happened and you need an alibi! Quickly craft a story about where you were. Other players interrogate you with questions. Inconsistencies get you caught!',
    minPlayers: 4, maxPlayers: 10, color: '#FF7F00', category: 'Schemes & Suspects',
  },
  'wiretap': {
    id: 'wiretap', name: 'Wiretap', emoji: '🎧',
    description: 'Decipher secret conversations and uncover hidden motives!',
    howToPlay: 'Listen to AI-generated snippets of suspicious conversations. Figure out what\'s really going on and identify the culprit. Best detective instincts win!',
    minPlayers: 2, maxPlayers: 10, color: '#FF7F00', category: 'Schemes & Suspects',
  },
  'bad-influence': {
    id: 'bad-influence', name: 'Bad Influence', emoji: '🎭',
    description: 'Secretly manipulate others to achieve your mischievous goals!',
    howToPlay: 'Each player gets a secret objective (get someone to say a specific word, make someone agree with something absurd). Manipulate the conversation to complete your mission!',
    minPlayers: 3, maxPlayers: 10, color: '#FF7F00', category: 'Schemes & Suspects',
  },
  // ── Rapid Reactions ──────────────────────────
  'snap-decision': {
    id: 'snap-decision', name: 'Snap Decision', emoji: '⏱️',
    description: 'Make split-second choices under pressure. Every second counts!',
    howToPlay: 'Quick-fire questions appear with a ticking clock. Pick the best answer before time runs out! Faster correct answers earn more points. Stay sharp!',
    minPlayers: 2, maxPlayers: 10, color: '#FFE02F', category: 'Rapid Reactions',
  },
  'hot-potato': {
    id: 'hot-potato', name: 'Hot Potato', emoji: '🥔',
    description: 'Pass the bomb before it explodes. Don\'t get caught holding it!',
    howToPlay: 'A ticking bomb passes between players. Answer a quick question to pass it on! If the timer runs out while you\'re holding it — BOOM, you lose a life!',
    minPlayers: 3, maxPlayers: 10, color: '#FFE02F', category: 'Rapid Reactions',
  },
  'deepfake-detective': {
    id: 'deepfake-detective', name: 'Deepfake Detective', emoji: '🔍',
    description: 'Spot the AI-generated fake. Your perception is tested!',
    howToPlay: 'See a set of statements or descriptions — some real, some AI-generated fakes. Identify which ones are fake! Test your BS detector against the machine.',
    minPlayers: 3, maxPlayers: 10, color: '#FFE02F', category: 'Rapid Reactions',
  },
  'art-heist': {
    id: 'art-heist', name: 'Art Heist', emoji: '💰',
    description: 'Quickly identify valuable art before the alarm sounds!',
    howToPlay: 'AI describes artworks — some priceless masterpieces, some worthless fakes. Quickly decide which to steal before the alarm triggers! Most valuable haul wins.',
    minPlayers: 3, maxPlayers: 10, color: '#FFE02F', category: 'Rapid Reactions',
  },
  'ai-hostage': {
    id: 'ai-hostage', name: 'AI Hostage', emoji: '🚨',
    description: 'Negotiate with a rogue AI to save the day. Think fast!',
    howToPlay: 'A rogue AI has taken something hostage. Players take turns negotiating with it. The AI responds based on your approach. Cooperate or compete to resolve the crisis!',
    minPlayers: 3, maxPlayers: 10, color: '#FFE02F', category: 'Rapid Reactions',
  },
  'story-sabotage': {
    id: 'story-sabotage', name: 'Story Sabotage', emoji: '❌',
    description: 'Disrupt a developing story with absurd twists!',
    howToPlay: 'An AI tells a story, but players can inject sabotage twists at key moments. Vote on the best (worst?) disruption. The story gets increasingly unhinged!',
    minPlayers: 4, maxPlayers: 10, color: '#FFE02F', category: 'Rapid Reactions',
  },
  'meme-melee': {
    id: 'meme-melee', name: 'Meme Melee', emoji: '🤣',
    description: 'Match hilarious captions to meme images. The Meme Judge picks the winner!',
    howToPlay: 'Each round, a meme image is revealed. Everyone plays a caption card from their hand to match it. The Meme Judge picks the funniest combo. First to 7 points wins!',
    minPlayers: 3, maxPlayers: 10, color: '#AFFF33', category: 'Wordplay & Wit',
    spicy: true, enabled: true,
  },
  'super-sketchy': {
    id: 'super-sketchy', name: 'Super Sketchy', emoji: '✏️',
    description: 'Draw a weird prompt. Others write fakes. Can you spot the real one?',
    howToPlay: 'Everyone gets a secret, weird prompt and draws it on their phone. Then each drawing is shown — players write FAKE prompts to trick each other. Vote on which prompt you think is the REAL one. Points for fooling others, guessing right, and getting your art recognized!',
    minPlayers: 3, maxPlayers: 8, color: '#FF69B4', category: 'Spark of Creation',
    spicy: true, enabled: true,
  },
};

function getEnabledGames() {
  return Object.values(GAMES).filter(g => g.enabled).sort((a, b) => a.name.localeCompare(b.name)).map(g => {
    // NAH gets theme packs for pre-launch configuration
    if (g.id === 'nerds-against-humanity') {
      return { ...g, nahThemes };
    }
    // Base games get TOPIC_PACKS for pre-launch configuration
    if (BASE_GAME_CLASSES[g.id] && !g.packs) {
      return { ...g, packs: TOPIC_PACKS, spicy: true };
    }
    // Trivia Fetch gets category picker
    if (g.triviaThemes) {
      return { ...g, triviaCategories: ALL_CATEGORIES, defaultCategories: DEFAULT_CATEGORY_IDS };
    }
    return g;
  });
}

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
    this.aiBots = false; // Whether AI opponents are enabled
    this.nextAvatar = 1; // cycles 1-10 for avatar assignment
    this.lastSelectedTopics = Object.keys(TOPIC_PACKS); // stored from last launch

    this.addPlayer(hostId, hostName);
  }

  addPlayer(socketId, name, playerId) {
    if (this.players.has(socketId)) return { error: 'Already in room' };
    if (this.players.size >= 10) return { error: 'Room is full (max 10)' };

    const avatar = this.nextAvatar;
    this.nextAvatar = (this.nextAvatar % 10) + 1;
    this.players.set(socketId, { name, playerId: playerId || null, vote: null, avatar });
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

  // ── AI Bot Management ────────────────────────────────
  addAiBots() {
    if (this.aiBots) return; // already added
    const firstNames = [
      'Martha', 'Dave', 'Linda', 'Gary', 'Susan', 'Doug', 'Karen', 'Steve',
      'Brenda', 'Phil', 'Janet', 'Earl', 'Dolores', 'Chuck', 'Barb', 'Hank',
      'Patty', 'Larry', 'Donna', 'Ralph', 'Cheryl', 'Bud', 'Gladys', 'Norm',
    ];
    // Fill to 3 total players
    const realCount = this.players.size;
    const botsNeeded = Math.max(0, 3 - realCount);
    if (botsNeeded === 0) { this.aiBots = true; return; }
    const shuffled = firstNames.sort(() => Math.random() - 0.5);
    for (let i = 0; i < botsNeeded; i++) {
      const botId = `ai-bot-${i + 1}-${this.roomCode}`;
      if (this.players.has(botId)) continue;
      const botName = `${shuffled[i]}Bot \u{1F916}`;
      this.addPlayer(botId, botName);
      const botPlayer = this.players.get(botId);
      if (botPlayer) botPlayer.playerId = `bot-pid-${i + 1}`;
      this.playerIdMap.set(`bot-pid-${i + 1}`, botId);
    }
    this.aiBots = true;
  }

  removeAiBots() {
    if (!this.aiBots) return;
    // Remove all bot players
    for (let i = 0; i < 3; i++) {
      const botId = `ai-bot-${i + 1}-${this.roomCode}`;
      this.removePlayer(botId);
      this.playerIdMap.delete(`bot-pid-${i + 1}`);
    }
    this.aiBots = false;
  }

  rebalanceBots() {
    if (!this.aiBots) return;
    const realCount = [...this.players.keys()].filter(id => !this.isBot(id)).length;
    const botsNeeded = Math.max(0, 3 - realCount);
    const currentBots = this.getBotIds();
    // Remove excess bots (last ones first)
    while (currentBots.length > botsNeeded) {
      const botId = currentBots.pop();
      this.removePlayer(botId);
      // Clean up playerIdMap
      for (const [pid, sid] of this.playerIdMap) {
        if (sid === botId) { this.playerIdMap.delete(pid); break; }
      }
    }
    // If all bots removed and none needed, keep aiBots true (toggle still on)
  }

  isBot(socketId) {
    return typeof socketId === 'string' && socketId.startsWith('ai-bot-');
  }

  getBotIds() {
    return this.playerOrder.filter(id => this.isBot(id));
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
        avatar: p.avatar,
      };
    });
  }

  getFullState(socketId) {
    const base = {
      roomCode: this.roomCode,
      players: this.getPlayerList(),
      isHost: socketId === this.hostId,
      playerName: this.players.get(socketId)?.name,
      state: this.state,
      activeGame: this.activeGame,
      votes: this.getVoteTally(),
      games: getEnabledGames(),
      chatMessages: this.chatMessages.slice(-20),
      spiceLevel: this.spiceLevel,
      aiBots: this.aiBots,

    };

    // Include game-specific state for reconnection
    if (this.state === 'IN_GAME' && this.gameInstance) {
      if (typeof this.gameInstance.getFullState === 'function') {
        const gs = this.gameInstance.getFullState(socketId);
        if (gs?.gameState) base.gameState = gs.gameState;
      } else if (typeof this.gameInstance.getState === 'function') {
        base.gameState = this.gameInstance.getState(socketId);
      }
    }

    return base;
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

    // Mid-game join: only Super Sketchy supports late joining as a pending player
    if (room.state === 'IN_GAME') {
      if (room.activeGame !== 'super-sketchy' || !room.gameInstance) {
        return callback({ error: 'Game already in progress' });
      }
      // Add as pending — they'll be active starting next round
      const gi = room.gameInstance;
      const result = gi.addPendingPlayer(socket.id, name, playerId);
      if (result.error) return callback(result);
      // Register in room's player/id maps so reconnect works
      room.players.set(socket.id, { name, playerId: playerId || null, vote: null, avatar: room.nextAvatar });
      room.nextAvatar = (room.nextAvatar % 10) + 1;
      if (playerId) room.playerIdMap.set(playerId, socket.id);
      socket.join(code);
      const pendingState = gi.getPendingState(socket.id);
      callback({ success: true, ...pendingState });
      socket.to(code).emit('player-joined', { players: room.getPlayerList() });
      console.log(`⏳ ${name} joined mid-game as pending in ${code}`);
      return;
    }

    const result = room.addPlayer(socket.id, name, playerId);
    if (result.error) return callback(result);

    socket.join(code);
    // If bots are enabled, remove one to make room for the real player
    room.rebalanceBots();
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

  // ── Toggle AI Bots ──────────────────────────────────────
  socket.on('toggle-ai-bots', (callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return callback?.({ error: 'Not in a room' });
    if (socket.id !== room.hostId) return callback?.({ error: 'Only the host can toggle AI players' });
    if (room.state !== 'LOBBY') return callback?.({ error: 'Cannot change during a game' });

    if (room.aiBots) {
      room.removeAiBots();
    } else {
      if (room.players.size > 8) return callback?.({ error: 'Not enough room for AI players' });
      room.addAiBots();
    }

    callback?.({ success: true, aiBots: room.aiBots });
    io.to(room.roomCode).emit('ai-bots-update', {
      aiBots: room.aiBots,
      players: room.getPlayerList(),
    });
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
  socket.on('launch-game', async (opts = {}, callback) => {
    const { gameId, selectedThemes } = opts;
    const room = getRoomByPlayer(socket.id);
    if (!room) return callback({ error: 'Not in a room' });
    if (socket.id !== room.hostId) return callback({ error: 'Only the host can launch' });
    if (room.state !== 'LOBBY') return callback({ error: 'Game already in progress' });

    const game = GAMES[gameId];
    if (!game) return callback({ error: 'Unknown game' });
    if (!game.enabled) return callback({ error: `${game.name} is not available yet` });

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
      scheduleNAHBotActions(room);

    } else if (gameId === 'meme-melee') {
      // Meme Melee — same structure as NAH
      room.gameInstance = new MemeGameRoom(room.roomCode, room.hostId, room.players.get(room.hostId).name);
      for (const socketId of room.playerOrder) {
        if (socketId !== room.hostId) {
          const p = room.players.get(socketId);
          room.gameInstance.addPlayer(socketId, p.name, p.playerId);
        }
      }
      for (const [pid, sid] of room.playerIdMap) {
        room.gameInstance.playerIdMap.set(pid, sid);
      }

      const startResult = room.gameInstance.startGame(room.spiceLevel);
      if (startResult.error) {
        room.state = 'LOBBY';
        room.activeGame = null;
        room.gameInstance = null;
        return callback(startResult);
      }

      callback({ success: true, game: gameId });
      io.to(room.roomCode).emit('game-launched', { game: gameId });
      emitNAHNewRound(room); // same protocol

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

      const selectedCategories = opts.selectedCategories;
      const startResult = room.gameInstance.startGame(selectedCategories);
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
        categories: room.gameInstance.categories,
      });

      sendGusReaction(room, 'game_start', {
        detail: `Game starting with ${room.playerOrder.length} players!`,
      });

      // Kick off bot turn if first player is a bot
      scheduleTriviaBotTurn(room);

    } else if (gameId === 'super-sketchy') {
      // ── Super Sketchy — Drawful-style drawing + deception ──
      room.gameInstance = new SuperSketchyGame(room.roomCode, room.hostId, room.players.get(room.hostId).name);
      for (const socketId of room.playerOrder) {
        if (socketId !== room.hostId) {
          const p = room.players.get(socketId);
          room.gameInstance.addPlayer(socketId, p.name, p.playerId);
        }
      }
      for (const [pid, sid] of room.playerIdMap) {
        room.gameInstance.playerIdMap.set(pid, sid);
      }

      const startResult = room.gameInstance.startGame(room.spiceLevel);
      if (startResult.error) {
        room.state = 'LOBBY';
        room.activeGame = null;
        room.gameInstance = null;
        return callback(startResult);
      }

      callback({ success: true, game: gameId });
      io.to(room.roomCode).emit('game-launched', { game: gameId });

      // Send each player their secret prompt
      for (const socketId of room.gameInstance.playerOrder) {
        const assignment = room.gameInstance.assignments.get(socketId);
        io.to(socketId).emit('ss-draw-phase', {
          prompt: assignment?.prompt || '???',
          timeLimit: 60,
          scores: room.gameInstance.getScores(),
          totalDrawings: room.gameInstance.totalDrawings,
        });
      }
      scheduleSSBotActions(room);

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
      callback({ success: true, game: gameId });
      io.to(room.roomCode).emit('game-launched', { game: gameId });
      io.to(room.roomCode).emit('bg-preparing', { message: 'Generating round...' });

      // Use selectedTopics from launch opts, or fall back to all packs
      const topics = opts.selectedTopics && opts.selectedTopics.length > 0
        ? opts.selectedTopics.filter(id => TOPIC_PACKS[id])
        : Object.keys(TOPIC_PACKS);
      room.lastSelectedTopics = topics;

      const startResult = await room.gameInstance.startGame(room.spiceLevel, topics);
      if (startResult?.error) {
        room.state = 'LOBBY';
        room.activeGame = null;
        room.gameInstance = null;
        io.to(room.roomCode).emit('back-to-lobby', {
          players: room.getPlayerList(), votes: room.getVoteTally(), games: getEnabledGames(),
        });
        return;
      }

      io.to(room.roomCode).emit('bg-round-start', startResult);
      scheduleBaseGameBotSubmissions(room);
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
      games: getEnabledGames(),
      spiceLevel: room.spiceLevel,
      aiBots: room.aiBots,
    });
  });

  // ═══════════════════════════════════════════════════════════
  // NERDS AGAINST HUMANITY GAME EVENTS
  // ═══════════════════════════════════════════════════════════

  socket.on('get-themes', (callback) => {
    callback(nahThemes);
  });

  // ── Topic Packs (removed from lobby — now per-game at launch) ──

  socket.on('submit-cards', ({ cardIndices }, callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room || (room.activeGame !== 'nerds-against-humanity' && room.activeGame !== 'meme-melee')) return callback({ error: 'Not in a card game' });

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
        blackCard: gi.currentBlackCard || gi.currentMeme,
        cardCzar: gi.getCardCzarId(),
      });
      // If the czar is a bot, auto-judge
      scheduleNAHBotJudge(room);
    }
  });

  socket.on('judge-pick', ({ submissionIndex }, callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room || (room.activeGame !== 'nerds-against-humanity' && room.activeGame !== 'meme-melee')) return callback({ error: 'Not in a card game' });

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
    if (!room || (room.activeGame !== 'nerds-against-humanity' && room.activeGame !== 'meme-melee')) return;

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

    if (room.activeGame === 'nerds-against-humanity' || room.activeGame === 'meme-melee') {
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
      games: getEnabledGames(),
    });
  });

  // ── Restart Same Game ───────────────────────────────────
  socket.on('restart-same-game', async (callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!room) return callback({ error: 'Not in a room' });
    if (socket.id !== room.hostId) return callback({ error: 'Only the host can restart' });
    if (!room.activeGame) return callback({ error: 'No active game to restart' });

    const gameId = room.activeGame;
    const game = GAMES[gameId];
    if (!game) return callback({ error: 'Unknown game' });

    // Preserve themes from old NAH instance
    const oldThemes = room.gameInstance?.selectedThemes;

    // Tear down old instance
    room.gameInstance = null;

    // Re-create game instance using the same pattern as launch-game
    if (gameId === 'nerds-against-humanity') {
      room.gameInstance = new NAHRoom(room.roomCode, room.hostId, room.players.get(room.hostId).name);
      for (const socketId of room.playerOrder) {
        if (socketId !== room.hostId) {
          const p = room.players.get(socketId);
          room.gameInstance.addPlayer(socketId, p.name, p.playerId);
        }
      }
      for (const [pid, sid] of room.playerIdMap) {
        room.gameInstance.playerIdMap.set(pid, sid);
      }
      const startResult = room.gameInstance.startGame(oldThemes, room.spiceLevel);
      if (startResult.error) return callback(startResult);

      callback({ success: true, game: gameId });
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
      scheduleNAHBotActions(room);

    } else if (gameId === 'meme-melee') {
      room.gameInstance = new MemeGameRoom(room.roomCode, room.hostId, room.players.get(room.hostId).name);
      for (const socketId of room.playerOrder) {
        if (socketId !== room.hostId) {
          const p = room.players.get(socketId);
          room.gameInstance.addPlayer(socketId, p.name, p.playerId);
        }
      }
      for (const [pid, sid] of room.playerIdMap) {
        room.gameInstance.playerIdMap.set(pid, sid);
      }
      const startResult = room.gameInstance.startGame(room.spiceLevel);
      if (startResult.error) return callback(startResult);

      callback({ success: true, game: gameId });
      io.to(room.roomCode).emit('game-launched', { game: gameId });
      emitNAHNewRound(room);

    } else if (gameId === 'trivia-fetch') {
      // Save last categories before creating new instance
      const lastCategories = room.gameInstance?.categories?.map(c => c.id);
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
      const startResult = room.gameInstance.startGame(lastCategories);
      if (startResult.error) return callback(startResult);

      callback({ success: true, game: gameId });
      io.to(room.roomCode).emit('game-launched', { game: gameId });
      io.to(room.roomCode).emit('game-started', {
        players: room.gameInstance.getPlayerList(),
        activePlayerId: room.gameInstance.getActivePlayerId(),
        categories: room.gameInstance.categories,
      });

    } else if (gameId === 'super-sketchy') {
      room.gameInstance = new SuperSketchyGame(room.roomCode, room.hostId, room.players.get(room.hostId).name);
      for (const socketId of room.playerOrder) {
        if (socketId !== room.hostId) {
          const p = room.players.get(socketId);
          room.gameInstance.addPlayer(socketId, p.name, p.playerId);
        }
      }
      for (const [pid, sid] of room.playerIdMap) {
        room.gameInstance.playerIdMap.set(pid, sid);
      }
      const startResult = room.gameInstance.startGame(room.spiceLevel);
      if (startResult.error) return callback(startResult);

      callback({ success: true, game: gameId });
      io.to(room.roomCode).emit('game-launched', { game: gameId });
      for (const socketId of room.gameInstance.playerOrder) {
        const assignment = room.gameInstance.assignments.get(socketId);
        io.to(socketId).emit('ss-draw-phase', {
          prompt: assignment?.prompt || '???',
          timeLimit: 60,
          scores: room.gameInstance.getScores(),
          totalDrawings: room.gameInstance.totalDrawings,
          roundNumber: room.gameInstance.roundNumber,
          totalRounds: room.gameInstance.totalRounds,
        });
      }
      scheduleSSBotActions(room);

    } else if (BASE_GAME_CLASSES[gameId]) {
      const GameClass = BASE_GAME_CLASSES[gameId];
      room.gameInstance = new GameClass(room.roomCode);
      for (const socketId of room.playerOrder) {
        const p = room.players.get(socketId);
        room.gameInstance.addPlayer(socketId, p.name, p.playerId);
      }

      callback({ success: true, game: gameId });
      io.to(room.roomCode).emit('game-launched', { game: gameId });
      io.to(room.roomCode).emit('bg-preparing', { message: 'Generating round...' });

      const startResult = await room.gameInstance.startGame(room.spiceLevel, room.lastSelectedTopics || Object.keys(TOPIC_PACKS));
      if (startResult?.error) {
        room.state = 'LOBBY';
        room.activeGame = null;
        room.gameInstance = null;
        io.to(room.roomCode).emit('back-to-lobby', {
          players: room.getPlayerList(), votes: room.getVoteTally(), games: getEnabledGames(),
        });
        return;
      }

      io.to(room.roomCode).emit('bg-round-start', startResult);
      scheduleBaseGameBotSubmissions(room);
    }

    console.log(`🔄 ${game.name} restarted in room ${room.roomCode}`);
  });

  // ═══════════════════════════════════════════════════════════
  // TRIVIA FETCH GAME EVENTS
  // ═══════════════════════════════════════════════════════════

  socket.on('get-categories', (callback) => {
    const room = getRoomByPlayer(socket.id);
    const gi = room?.gameInstance;
    const cats = gi?.categories || ALL_CATEGORIES.filter(c => DEFAULT_CATEGORY_IDS.includes(c.id));
    const segs = gi?.wheelSegments || cats;
    callback({ categories: cats, segments: segs });
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
          scheduleTriviaBotTurn(room);
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
    });

    // If next player is a bot, auto-play their turn
    scheduleTriviaBotTurn(room);
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

    scheduleTriviaBotTurn(room);
  });

  // ═══════════════════════════════════════════════════════════
  // GENERIC BASEGAME EVENTS
  // ═══════════════════════════════════════════════════════════

  function isBaseGame(room) {
    return room && BASE_GAME_CLASSES[room.activeGame] && room.gameInstance;
  }

  // ── State sync (client requests current state on mount) ──
  socket.on('bg-get-state', (callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!isBaseGame(room)) return callback?.({});
    const gi = room.gameInstance;
    if (!gi) return callback?.({});
    callback?.({
      state: gi.state,
      round: gi.round,
      totalRounds: gi.totalRounds,
      prompt: gi.currentPrompt,
      bellbotSays: '',
      timeLimit: gi.state === 'SUBMISSION' ? gi.submissionTime : gi.state === 'VOTING' ? gi.votingTime : 0,
      players: gi.getPlayerList(),
      scores: gi.getScores(),
    });
  });

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
      // Notify players we're processing
      io.to(room.roomCode).emit('bg-preparing', { message: 'Judging submissions...' });
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

    callback?.({ success: true });
    io.to(room.roomCode).emit('bg-preparing', { message: 'Judging submissions...' });

    const gi = room.gameInstance;
    const lockResult = await gi.lockSubmissions();
    if (lockResult?.error) return;

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
      io.to(room.roomCode).emit('bg-preparing', { message: 'Tallying scores...' });
      tallyBaseGameScores(room);
    }
  });

  // ── Force tally (host or timer) ─────────────────────────
  socket.on('bg-tally', async (callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!isBaseGame(room)) return callback?.({ error: 'Not in a BaseGame' });

    callback?.({ success: true });
    io.to(room.roomCode).emit('bg-preparing', { message: 'Tallying scores...' });
    await tallyBaseGameScores(room);
  });

  // ── Next round ──────────────────────────────────────────
  socket.on('bg-next-round', async (callback) => {
    const room = getRoomByPlayer(socket.id);
    if (!isBaseGame(room)) return callback?.({ error: 'Not in a BaseGame' });

    callback?.({ success: true });
    io.to(room.roomCode).emit('bg-preparing', { message: 'Generating round...' });

    const gi = room.gameInstance;
    const result = await gi.startNextRound();
    if (result?.error) return;

    io.to(room.roomCode).emit('bg-round-start', result);
    scheduleBaseGameBotSubmissions(room);
  });

  // ═══════════════════════════════════════════════════════════
  // SUPER SKETCHY GAME EVENTS
  // ═══════════════════════════════════════════════════════════

  function isSuperSketchy(room) {
    return room?.activeGame === 'super-sketchy' && room?.gameInstance instanceof SuperSketchyGame;
  }

  socket.on('ss-submit-drawing', ({ drawingData } = {}) => {
    const room = getRoomByPlayer(socket.id);
    if (!isSuperSketchy(room)) return;
    const gi = room.gameInstance;
    const result = gi.submitDrawing(socket.id, drawingData);
    if (result?.allSubmitted) {
      const decoyResult = gi.lockDrawings();
      emitSSDecoyPhase(room, decoyResult);
    } else if (result?.success) {
      // If all non-bot players have now submitted, don't wait for bot timers.
      // Give bots a 6-second grace window; if they haven't drawn by then,
      // auto-fill instant scribbles and proceed so humans are never blocked.
      const botIds = new Set(room.getBotIds());
      const anyHumanPending = gi.playerOrder.some(id => {
        const a = gi.assignments.get(id);
        return a && !a.drawingData && !botIds.has(id);
      });
      if (!anyHumanPending) {
        setTimeout(() => {
          if (gi.state !== 'DRAWING') return; // bots already submitted naturally
          for (const id of gi.playerOrder) {
            const a = gi.assignments.get(id);
            if (a && !a.drawingData) a.drawingData = generateBotDrawing();
          }
          const decoyResult = gi.lockDrawings();
          emitSSDecoyPhase(room, decoyResult);
        }, 6000);
      }
    }
  });

  socket.on('ss-lock-drawings', () => {
    const room = getRoomByPlayer(socket.id);
    if (!isSuperSketchy(room)) return;
    const gi = room.gameInstance;
    const result = gi.lockDrawings();
    emitSSDecoyPhase(room, result);
  });

  socket.on('ss-submit-decoy', ({ decoyText } = {}) => {
    const room = getRoomByPlayer(socket.id);
    if (!isSuperSketchy(room)) return;
    const gi = room.gameInstance;
    const result = gi.submitDecoy(socket.id, decoyText);
    if (result?.error) return;

    io.to(room.roomCode).emit('ss-decoy-update', {
      submittedCount: result.submittedCount,
      totalDecoys: result.totalDecoys,
    });

    if (result.allSubmitted) {
      const voteResult = gi.lockDecoys();
      emitSSVotePhase(room, voteResult);
    }
  });

  socket.on('ss-lock-decoys', () => {
    const room = getRoomByPlayer(socket.id);
    if (!isSuperSketchy(room)) return;
    const gi = room.gameInstance;
    const result = gi.lockDecoys();
    emitSSVotePhase(room, result);
  });

  socket.on('ss-vote', ({ optionId } = {}) => {
    const room = getRoomByPlayer(socket.id);
    if (!isSuperSketchy(room)) return;
    const gi = room.gameInstance;
    const result = gi.castVote(socket.id, optionId);
    if (result?.error) return;

    if (result.allVoted) {
      const reveal = gi.tallyAndReveal();
      io.to(room.roomCode).emit('ss-reveal', reveal);
    }
  });

  socket.on('ss-lock-votes', () => {
    const room = getRoomByPlayer(socket.id);
    if (!isSuperSketchy(room)) return;
    const gi = room.gameInstance;
    const reveal = gi.tallyAndReveal();
    if (reveal?.error) return;
    io.to(room.roomCode).emit('ss-reveal', reveal);
  });

  socket.on('ss-next-drawing', () => {
    const room = getRoomByPlayer(socket.id);
    if (!isSuperSketchy(room)) return;
    const gi = room.gameInstance;
    const result = gi.advanceAfterReveal();

    if (result.state === 'GAME_OVER') {
      io.to(room.roomCode).emit('ss-game-over', result);
    } else if (result.state === 'DRAWING') {
      // New round — send each player their new secret prompt
      for (const socketId of gi.playerOrder) {
        const assignment = gi.assignments.get(socketId);
        io.to(socketId).emit('ss-draw-phase', {
          prompt: assignment?.prompt || '???',
          timeLimit: 60,
          scores: gi.getScores(),
          totalDrawings: gi.totalDrawings,
          roundNumber: gi.roundNumber,
          totalRounds: gi.totalRounds,
        });
      }
      scheduleSSBotActions(room);
    } else {
      emitSSDecoyPhase(room, result);
    }
  });

  socket.on('ss-request-sync', () => {
    const room = getRoomByPlayer(socket.id);
    if (!isSuperSketchy(room)) return;
    const gi = room.gameInstance;
    if (gi.isPending(socket.id)) {
      const ps = gi.getPendingState(socket.id);
      socket.emit('ss-state-sync', ps.gameState);
      return;
    }
    const gs = gi.getFullState(socket.id);
    if (gs?.gameState) {
      socket.emit('ss-state-sync', gs.gameState);
    }
  });

  // ── Generate a visible bot drawing (random SVG scribble) ──
  // Ask Gemini to draw a simple SVG sketch for the given prompt.
  // Falls back to the random scribble if Gemini is unavailable or fails.
  async function generateBotSVGDrawing(prompt) {
    try {
      const { getModel } = await import('./bellbot.js');
      const model = getModel();
      if (!model) return generateBotDrawing();

      const instruction = `You are a terrible-but-trying artist in a party drawing game. Draw a simple SVG sketch (600x600) that represents: "${prompt}"

Rules:
- Output ONLY a valid SVG string starting with <svg and ending with </svg>. No markdown, no explanation.
- White background: <rect width="600" height="600" fill="white"/>
- Use only basic shapes: <circle>, <rect>, <line>, <polyline>, <polygon>, <ellipse>, <path>
- Black or dark strokes, stroke-width 3-6, fill="none" or simple solid fills
- Aim for a recognizable but charmingly bad stick-figure / cartoon style
- Include 5-15 elements total
- Keep it simple — this should look like a human drew it quickly with a marker`;

      const result = await Promise.race([
        model.generateContent(instruction),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), 5000)),
      ]);
      const text = result.response.text().trim();
      // Extract just the SVG tag
      const match = text.match(/<svg[\s\S]*<\/svg>/i);
      if (!match) return generateBotDrawing();
      const svg = match[0]
        .replace(/width="[^"]*"/, 'width="600"')
        .replace(/height="[^"]*"/, 'height="600"');
      return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    } catch {
      return generateBotDrawing();
    }
  }

  function generateBotDrawing() {
    const colors = ['#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#000000'];
    const pick = () => colors[Math.floor(Math.random() * colors.length)];
    const rnd = (max) => Math.floor(Math.random() * max);
    const els = [];
    // Random circles
    for (let i = 0; i < 6 + rnd(8); i++) {
      els.push(`<circle cx="${20 + rnd(560)}" cy="${20 + rnd(560)}" r="${10 + rnd(40)}" fill="${pick()}" opacity="0.7"/>`);
    }
    // Random squiggly lines
    for (let i = 0; i < 3 + rnd(4); i++) {
      const pts = [];
      for (let j = 0; j < 4 + rnd(4); j++) pts.push(`${rnd(600)},${rnd(600)}`);
      els.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${pick()}" stroke-width="${3 + rnd(5)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="white"/>${els.join('')}</svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  // Bot fake prompt pools — tiered by spice level
  const BOT_DECOY_POOL_1 = [
    'A horse eating spaghetti', 'Two cats in a trenchcoat', 'The world\'s saddest birthday party',
    'Someone stuck in a vending machine', 'A pigeon driving a bus', 'An octopus doing taxes',
    'A dog pretending to be a doctor', 'A ghost trying to use a phone', 'Someone sleeping at their own wedding',
    'A fish climbing a tree', 'An alien at a job interview', 'A penguin on a surfboard',
    'The worst haircut ever', 'A robot learning to cry', 'A bear at a tea party',
    'Someone proposing at a funeral', 'A clown doing your taxes', 'A chicken crossing a highway',
    'A wizard at the DMV', 'A snake with tiny arms', 'Two clouds having an argument',
    'A dinosaur in a tiny car', 'Someone walking their pet rock', 'A cactus giving a hug',
  ];
  const BOT_DECOY_POOL_2 = [
    'Two exes stuck in an elevator', 'A walk of shame on Sunday morning',
    'Explaining a hickey to your mother', 'Getting caught reading someone\'s texts',
    'A man hitting on someone way out of his league', 'Drunk texting your ex at 2am',
    'A stripper on a lunch break', 'Sneaking someone out before your roommate wakes up',
    'A one-night stand trying to remember names', 'Caught lying about being single',
    'Someone crying in a bar bathroom', 'A married person on a dating app',
    'Getting kicked out of a casino', 'A hungover person at a kid\'s birthday party',
    'Doing the walk of shame past your neighbors', 'A couple fighting over the check',
    'Someone passed out at their own party', 'Accidental FaceTime with your boss',
    'A guy hiding from his girlfriend at a party', 'Two friends who kissed and are now awkward',
  ];
  const BOT_DECOY_POOL_3 = [
    'Getting walked in on at the worst possible moment', 'A couple fighting naked',
    'Explaining what you were doing to the paramedics', 'Sexting the wrong person',
    'A threesome with a scheduling conflict', 'Caught by a Ring doorbell doing something shameful',
    'Two people doing it in an IKEA showroom', 'Explaining your browser history to your mom',
    'A naked person hiding in a closet while the spouse comes home', 'Getting a text from your hookup during Christmas dinner',
    'Someone trying to sneak out a fire escape with no clothes on', 'A couple interrupted by an Airbnb check-in',
    'Accidentally sending a risqué photo to a work group chat', 'Two-timing and both dates showing up at the same restaurant',
    'Explaining the handcuffs to the locksmith', 'A very awkward morning after',
    'Getting caught with the neighbor by the HOA', 'A very visible hickey at a job interview',
    'Someone finishing a video call before realizing their screen share was still on', 'A walk of shame through a hotel lobby in last night\'s formal wear',
  ];
  function getBotDecoyPool(spiceLevel) {
    if (spiceLevel >= 3) return BOT_DECOY_POOL_3;
    if (spiceLevel >= 2) return BOT_DECOY_POOL_2;
    return BOT_DECOY_POOL_1;
  }

  function scheduleSSBotActions(room) {
    if (!room.aiBots) return;
    const gi = room.gameInstance;
    if (!gi) return;

    if (gi.state === 'DRAWING') {
      // Bots auto-submit drawings — ask Gemini to draw the prompt
      for (const botId of room.getBotIds()) {
        const assignment = gi.assignments.get(botId);
        if (!assignment || assignment.drawingData) continue;
        const drawDelay = 2000 + Math.random() * 3000; // 2-5s to "think"
        setTimeout(async () => {
          if (gi.state !== 'DRAWING') return;
          const drawingData = await generateBotSVGDrawing(assignment.prompt);
          const result = gi.submitDrawing(botId, drawingData);
          if (result?.allSubmitted) {
            const decoyResult = gi.lockDrawings();
            emitSSDecoyPhase(room, decoyResult);
            scheduleSSBotActions(room);
          }
        }, drawDelay);
      }
    } else if (gi.state === 'DECOY') {
      // Bots auto-submit decoy prompts (skip if bot is the artist)
      for (const botId of room.getBotIds()) {
        if (botId === gi.currentArtistId) continue;
        if (gi.decoys.has(botId)) continue;
        setTimeout(() => {
          if (gi.state !== 'DECOY') return;
          const pool = getBotDecoyPool(gi.spiceLevel);
          const decoy = pool[Math.floor(Math.random() * pool.length)];
          const result = gi.submitDecoy(botId, decoy);
          if (result?.error) return;
          io.to(room.roomCode).emit('ss-decoy-update', {
            submittedCount: result.submittedCount,
            totalDecoys: result.totalDecoys,
          });
          if (result.allSubmitted) {
            const voteResult = gi.lockDecoys();
            emitSSVotePhase(room, voteResult);
            scheduleSSBotActions(room);
          }
        }, 1500 + Math.random() * 2500);
      }
    } else if (gi.state === 'VOTING') {
      // Bots auto-vote randomly (skip if bot is the artist)
      for (const botId of room.getBotIds()) {
        if (botId === gi.currentArtistId) continue;
        if (gi.votes.has(botId)) continue;
        setTimeout(() => {
          if (gi.state !== 'VOTING') return;
          // Pick a random option (but not their own decoy)
          const options = gi.voteOptions.filter(o => o.authorId !== botId);
          if (options.length === 0) return;
          const pick = options[Math.floor(Math.random() * options.length)];
          const result = gi.castVote(botId, pick.id);
          if (result?.error) return;
          if (result.allVoted) {
            const reveal = gi.tallyAndReveal();
            io.to(room.roomCode).emit('ss-reveal', reveal);
          }
        }, 1500 + Math.random() * 2000);
      }
    }
  }

  function emitSSDecoyPhase(room, result) {
    if (!result || result.error) return;
    if (result.state === 'GAME_OVER') {
      io.to(room.roomCode).emit('ss-game-over', result);
      return;
    }
    if (result.state === 'DRAWING') {
      // New round started — send each player their new prompt
      const gi = room.gameInstance;
      for (const socketId of gi.playerOrder) {
        const assignment = gi.assignments.get(socketId);
        io.to(socketId).emit('ss-draw-phase', {
          prompt: assignment?.prompt || '???',
          timeLimit: 60,
          scores: gi.getScores(),
          totalDrawings: gi.totalDrawings,
          roundNumber: gi.roundNumber,
          totalRounds: gi.totalRounds,
        });
      }
      scheduleSSBotActions(room);
      return;
    }
    const gi = room.gameInstance;
    const nonArtists = gi.playerOrder.filter(id => id !== gi.currentArtistId);
    io.to(room.roomCode).emit('ss-decoy-phase', {
      drawingData: result.drawingData,
      artistName: result.artistName,
      artistId: result.artistId,
      drawingsShown: result.drawingsShown,
      totalDrawings: result.totalDrawings,
      roundNumber: result.roundNumber || gi.roundNumber,
      totalRounds: result.totalRounds || gi.totalRounds,
      timeLimit: result.timeLimit || 30,
      totalDecoys: nonArtists.length,
    });
    scheduleSSBotActions(room);
  }

  function emitSSVotePhase(room, result) {
    if (!result || result.error) return;
    const gi = room.gameInstance;
    // Emit individually so each player's own decoy is filtered out
    for (const socketId of gi.playerOrder) {
      const filteredOptions = gi.voteOptions
        .filter(o => o.authorId !== socketId)
        .map(o => ({ id: o.id, text: o.text }));
      io.to(socketId).emit('ss-vote-phase', {
        options: filteredOptions,
        artistId: result.artistId,
        timeLimit: result.timeLimit || 15,
      });
    }
    scheduleSSBotActions(room);
  }

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
      if (room.gameInstance && (room.activeGame === 'nerds-against-humanity' || room.activeGame === 'meme-melee')) {
        const gi = room.gameInstance;
        if (gi.state === 'GAME_OVER') {
          io.to(room.roomCode).emit('round-winner', {
            winnerName: null, winningCards: [], blackCard: gi.currentBlackCard || gi.currentMeme,
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
      blackCard: gi.currentBlackCard || gi.currentMeme,
      hand: player.hand,
      cardCzar: gi.getCardCzarId(),
      roundNumber: gi.roundNumber,
      players: gi.getPlayerList(),
      scores: gi.getScores(),
    });
  }
  // Auto-play for AI bots
  scheduleNAHBotActions(room);
}

// ── AI Bot Auto-Play ──────────────────────────────────────────
function scheduleNAHBotActions(room) {
  if (!room.aiBots) return;
  const gi = room.gameInstance;
  if (!gi || gi.state !== 'PICKING') return;
  const czarId = gi.getCardCzarId();

  // Bots that need to submit cards
  for (const botId of room.getBotIds()) {
    if (botId === czarId) continue; // czar doesn't submit
    if (gi.submissions.has(botId)) continue;

    setTimeout(() => {
      if (gi.state !== 'PICKING') return;
      const player = gi.players.get(botId);
      if (!player || gi.submissions.has(botId)) return;

      const pick = (gi.currentBlackCard || gi.currentMeme)?.pick || 1;
      const indices = [];
      const available = [...Array(player.hand.length).keys()];
      for (let p = 0; p < pick && available.length > 0; p++) {
        const ri = Math.floor(Math.random() * available.length);
        indices.push(available.splice(ri, 1)[0]);
      }

      const result = gi.submitCards(botId, indices);
      if (!result.error) {
        io.to(room.roomCode).emit('submission-update', {
          players: gi.getPlayerList(),
          submittedCount: gi.submissions.size,
          totalNeeded: gi.playerOrder.length - 1,
        });

        if (gi.state === 'JUDGING') {
          io.to(room.roomCode).emit('judging-phase', {
            submissions: gi.getAnonymousSubmissions(),
            blackCard: gi.currentBlackCard || gi.currentMeme,
            cardCzar: gi.getCardCzarId(),
          });
          // If the czar is also a bot, auto-judge
          scheduleNAHBotJudge(room);
        }
      }
    }, 1500 + Math.random() * 2000); // 1.5-3.5s delay
  }
}

function scheduleNAHBotJudge(room) {
  if (!room.aiBots) return;
  const gi = room.gameInstance;
  if (!gi || gi.state !== 'JUDGING') return;
  const czarId = gi.getCardCzarId();
  if (!room.isBot(czarId)) return;

  setTimeout(() => {
    if (gi.state !== 'JUDGING') return;
    const subs = gi.getAnonymousSubmissions();
    if (subs.length === 0) return;
    const pick = Math.floor(Math.random() * subs.length);
    const result = gi.judgeWinner(pick);
    if (!result.error) {
      io.to(room.roomCode).emit('round-winner', {
        winnerName: result.winnerName,
        winningCards: result.winningCards,
        blackCard: result.blackCard,
        scores: gi.getScores(),
        gameOver: result.gameOver,
      });
      // Auto-advance to next round after a pause
      if (!result.gameOver) {
        setTimeout(() => {
          if (gi.state === 'ROUND_END') {
            gi.startRound();
            emitNAHNewRound(room);
          }
        }, 3000);
      }
    }
  }, 2000 + Math.random() * 1500);
}

const BOT_RESPONSES = [
  'A sock full of bees',
  'Grandma\'s secret recipe',
  'Aggressive eye contact',
  'An uncomfortably long hug',
  'That weird noise at 3am',
  'A suspiciously enthusiastic thumbs up',
  'Pretending to be a robot',
  'Screaming into a pillow',
  'A strongly worded letter',
  'Interpretive dance',
  'Blaming the dog',
  'A mysterious briefcase',
  'Weaponized cringe',
  'Running away dramatically',
];

async function generateBotAnswers(room, count = 2) {
  const gi = room.gameInstance;
  const promptText = typeof gi.currentPrompt === 'string' ? gi.currentPrompt : gi.currentPrompt?.text || gi.currentPrompt?.instruction || '';
  const instruction = typeof gi.currentPrompt === 'object' ? gi.currentPrompt?.instruction || '' : '';
  if (!promptText) return null;

  try {
    const raw = await getBellBotCommentary('bot_answer', {
      gameName: gi.gameName || 'BellBox Game',
      prompt: instruction ? `${instruction}\n${promptText}` : promptText,
      count,
    }, gi.spiceLevel || 2);
    const answers = parseBellBotJSON(raw);
    if (Array.isArray(answers) && answers.length >= count) return answers;
  } catch { /* fall through to null */ }
  return null;
}

async function scheduleBaseGameBotSubmissions(room) {
  if (!room.aiBots) return;
  const gi = room.gameInstance;
  if (!gi || gi.state !== 'SUBMISSION') return;

  // Try to get Gemini-powered answers, fall back to static list
  const botIds = [...room.getBotIds()];
  const geminiAnswers = await generateBotAnswers(room, botIds.length);

  for (let idx = 0; idx < botIds.length; idx++) {
    const botId = botIds[idx];
    const player = gi.players.get(botId);
    if (!player || player.submitted) continue;

    setTimeout(() => {
      if (gi.state !== 'SUBMISSION') return;
      const p = gi.players.get(botId);
      if (!p || p.submitted) return;

      const answer = (geminiAnswers && geminiAnswers[idx])
        ? geminiAnswers[idx]
        : BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)];
      const result = gi.submitEntry(botId, answer);
      if (!result.error) {
        io.to(room.roomCode).emit('bg-submission-update', {
          submittedCount: result.submittedCount,
          totalPlayers: result.totalPlayers,
          players: gi.getPlayerList(),
        });

        if (result.allSubmitted) {
          io.to(room.roomCode).emit('bg-preparing', { message: 'Judging submissions...' });
          gi.lockSubmissions().then(lockResult => {
            if (!lockResult || lockResult.error) return;
            if (lockResult.roundScores) {
              io.to(room.roomCode).emit('bg-round-end', {
                state: lockResult.state, round: lockResult.round,
                roundScores: lockResult.roundScores, leaderboard: lockResult.leaderboard,
                bellbotSays: lockResult.bellbotSays, correctAnswer: lockResult.correctAnswer,
                gameOver: lockResult.gameOver,
              });
            } else {
              io.to(room.roomCode).emit('bg-reveal-start', {
                state: lockResult.state, totalSubmissions: lockResult.totalSubmissions,
              });
              emitBaseGameReveals(room);
            }
          });
        }
      }
    }, 2000 + Math.random() * 3000);
  }
}

function scheduleBaseGameBotVotes(room) {
  if (!room.aiBots) return;
  const gi = room.gameInstance;
  if (!gi || gi.state !== 'VOTING') return;

  for (const botId of room.getBotIds()) {
    const p = gi.players.get(botId);
    if (!p || p.voted) continue;

    setTimeout(() => {
      if (gi.state !== 'VOTING') return;
      const pp = gi.players.get(botId);
      if (!pp || pp.voted) return;

      // Pick a random non-bot player to vote for
      const targets = gi.playerOrder.filter(id => id !== botId && !room.isBot(id));
      if (targets.length === 0) return;
      const target = targets[Math.floor(Math.random() * targets.length)];
      const result = gi.castVote(botId, target);
      if (!result.error) {
        io.to(room.roomCode).emit('bg-vote-update', { players: gi.getPlayerList() });
        if (result.allVoted) {
          io.to(room.roomCode).emit('bg-preparing', { message: 'Tallying scores...' });
          tallyBaseGameScores(room);
        }
      }
    }, 1500 + Math.random() * 2000);
  }
}

async function sendGusReaction(room, event, context = {}) {
  try {
    context.spiceLevel = room.spiceLevel;
    const msg = await getGusReaction(event, context);
    io.to(room.roomCode).emit('gus-says', { message: msg });
  } catch { /* non-critical */ }
}

// ── Trivia Fetch Bot Auto-Play ────────────────────────────────
function scheduleTriviaBotTurn(room) {
  if (!room.aiBots) return;
  const gi = room.gameInstance;
  if (!gi || gi.state === 'GAME_OVER' || gi.state === 'LOBBY') return;

  const botId = gi.getActivePlayerId();
  if (!room.isBot(botId)) return;

  const player = gi.players.get(botId);
  if (!player) return;

  // Step 1: Spin the wheel after a short delay
  setTimeout(async () => {
    if (gi.state !== 'SPINNING') return;
    if (gi.getActivePlayerId() !== botId) return;

    const spinResult = gi.spinWheel();
    if (spinResult.error) return;

    io.to(room.roomCode).emit('wheel-result', {
      segmentIndex: spinResult.segmentIndex,
      segment: spinResult.segment,
      categoryId: spinResult.categoryId,
      spinnerName: player.name,
    });

    if (spinResult.categoryId === 'crown') {
      sendGusReaction(room, 'crown_attempt', { playerName: player.name });
    } else if (spinResult.categoryId === 'crown_not_ready') {
      sendGusReaction(room, 'crown_not_ready', { playerName: player.name });
    } else if (spinResult.categoryId === 'wild') {
      sendGusReaction(room, 'wild', { playerName: player.name });
    }

    // Step 2: Fetch question after wheel animation
    setTimeout(async () => {
      if (gi.getActivePlayerId() !== botId) return;

      try {
        const question = await gi.fetchQuestion();

        io.to(room.roomCode).emit('question-show', {
          question: question.question,
          options: question.options,
          timeLimit: question.timeLimit,
          activePlayerId: botId,
        });

        // Step 3: Submit answer after "thinking"
        setTimeout(() => {
          if (gi.state !== 'QUESTION') return;
          if (gi.getActivePlayerId() !== botId) return;

          // Bots get it right ~60% of the time
          const correct = Math.random() < 0.6;
          const answerIndex = correct
            ? gi.currentQuestion.correctIndex
            : [0, 1, 2, 3].filter(i => i !== gi.currentQuestion.correctIndex)[Math.floor(Math.random() * 3)];

          const result = gi.submitAnswer(botId, answerIndex);
          if (result.error) return;

          io.to(room.roomCode).emit('answer-result', result);

          if (result.gameWon) {
            sendGusReaction(room, 'win', { playerName: player.name });
            io.to(room.roomCode).emit('game-over', {
              winnerName: result.winnerName,
              scores: result.scores,
            });
            return;
          } else if (result.correct) {
            if (result.stampEarned) {
              sendGusReaction(room, 'stamp', { playerName: player.name, detail: `earned the ${result.stampEarned} treat` });
            } else {
              sendGusReaction(room, 'correct', { playerName: player.name });
            }
          } else {
            sendGusReaction(room, 'wrong', { playerName: player.name });
          }

          io.to(room.roomCode).emit('turn-update', {
            activePlayerId: gi.getActivePlayerId(),
            state: gi.state,
          });

          // If correct (and not choosing stamp), bot spins again — schedule next action
          // If wrong, turn passed — check if new active player is a bot
          scheduleTriviaBotTurn(room);
        }, 2000 + Math.random() * 2000);

      } catch {
        // Question generation failed — skip turn
        gi.nextTurn();
        io.to(room.roomCode).emit('turn-update', {
          activePlayerId: gi.getActivePlayerId(),
          state: gi.state,
        });
        scheduleTriviaBotTurn(room);
      }
    }, 4000); // Wait for wheel animation
  }, 1500 + Math.random() * 1500);
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

  // Send all reveals at once, then auto-tally after a brief viewing period
  io.to(room.roomCode).emit('bg-reveals', {
    reveals,
    state: 'REVEAL',
    timeLimit: 0,
  });

  // If game auto-skipped to scoring (e.g. snap-decision)
  if (gi.state === 'ROUND_END' || gi.state === 'GAME_OVER' || gi.state === 'SCORING') {
    io.to(room.roomCode).emit('bg-round-end', {
      state: gi.state,
      round: gi.round,
      roundScores: [],
      leaderboard: gi.getScores(),
      gameOver: gi.state === 'GAME_OVER',
    });
  } else {
    // Brief delay for players to see reveals, then tally
    setTimeout(() => {
      tallyBaseGameScores(room);
    }, 5000);
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
    prompt: result.prompt,
    gameOver: result.gameOver,
    correctAnswer: result.correctAnswer || null,
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
