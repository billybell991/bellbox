// High-roglyphics — emoji rebus puzzle game with pre-generated puzzles
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary } from '../../bellbot.js';
import { PUZZLES } from './puzzles.js';

// ── Spice-Tiered Pharaoh Personas ──────────────────────────
// Spice 1: Pharaoh Friendhotep — wholesome, encouraging, educational
// Spice 2: Pharaoh Punhotep — snarky, pun-heavy, sarcastic
// Spice 3: Pharaoh Wrathhotep — unhinged, threatening, dark humor
const PHARAOH_PUNS = {
  1: {
    intro: [
      'Welcome, young explorers! The pyramids have a puzzle for you! 🏛️',
      'Wonderful! A new scroll from the friendly sphinx!',
      'The kind pharaoh presents a gift of knowledge!',
      'Let\'s decode together, friends! Every guess is a treasure!',
      'The ancient scribes left this just for you! How exciting!',
      'A gentle breeze from the Nile brings a new puzzle!',
      'The pyramids are smiling! Time to explore!',
      'Oh boy! Even the baby camels are excited for this one!',
    ],
    correct: [
      'Brilliant! You\'re as wise as the scribes of Alexandria! ⭐',
      'Wonderful job! The pharaoh does a little happy dance!',
      'You cracked the code! High-fives all around the pyramid!',
      'Amazing! You\'d make a great archaeologist!',
      'The sphinx is SO proud of you right now!',
      'Gold star from the pharaoh! You\'re a natural!',
    ],
    close: [
      'So close! Even the sphinx needed hints sometimes!',
      'Almost there! The pyramids weren\'t solved in a day either!',
      'Ooh, warm like a desert sunrise! Try again next time!',
      'Not quite, but what a great effort! The pharaoh claps!',
      'You\'re on the right path through the tomb! Almost!',
    ],
    wrong: [
      'Don\'t worry! The desert has many paths to knowledge!',
      'That\'s okay! Even pharaohs make mistakes sometimes!',
      'No worries, friend! Every wrong guess teaches us something!',
      'The sphinx says: keep trying, you\'ll get the next one!',
      'Oops! But the pharaoh still believes in you! 💛',
    ],
  },
  2: {
    intro: [
      'The sphinx has spoken! Decode or be mummified!',
      'By the Nile, these emojis hold ancient secrets...',
      'Pharaoh decrees: solve this or clean the pyramids!',
      'The hieroglyphs are revealed! May Anubis guide you.',
      'Even Cleopatra couldn\'t solve this one... or could she?',
      'Another tablet from the tomb! Let the guessing begin!',
      'The sarcophagus opens... what do these symbols mean?',
      'Behold! A message from the ancient emoji gods!',
    ],
    correct: [
      'By Ra\'s light, you cracked the code!',
      'The pharaoh is impressed! You may keep your head.',
      'Sphinx-level intellect! Well decoded!',
      'Tutankhamun would be proud!',
      'You read hieroglyphs like a true scribe!',
    ],
    close: [
      'Almost, mortal! The tomb trembles with your near-wisdom.',
      'So close the mummy almost clapped!',
      'The sphinx raises an eyebrow... not quite!',
      'Warm like the desert sun, but not quite gold!',
    ],
    wrong: [
      'The curse activates! That was... not it.',
      'Even the scarab beetles are cringing.',
      'Pharaoh hides behind his sarcophagus in shame.',
      'The Nile flows with your tears of failure!',
    ],
  },
  3: {
    intro: [
      'SILENCE, WORMS! Decode this or I seal you in the tomb ALIVE!',
      'Another puzzle, another chance for you MORTALS to disappoint me!',
      'The gods sent this puzzle to PUNISH your feeble minds!',
      'Bow before my emoji riddle, you hieroglyphic PEASANTS!',
      'I buried the last group who failed this one. Literally. Under a pyramid.',
      'Pharaoh Wrathhotep demands ANSWERS! Or heads will roll... into the Nile!',
      'These emojis contain dark magic. Your brain probably can\'t handle it.',
      'I\'ve released seven plagues worse than this puzzle. You\'ll be fine. Maybe.',
    ],
    correct: [
      'How DARE you solve that?! ...fine, you may live. FOR NOW.',
      'Impossible! You must have stolen the answer scroll from my tomb!',
      'The pharaoh is... disgusted by your competence. Well done, I GUESS.',
      'You got it right and I\'ve never been more angry about it.',
      'By Anubis\'s flea-bitten HIDE, someone actually has a brain cell!',
      'I had a sarcastic comment ready and everything. You RUINED it.',
    ],
    close: [
      'Almost right?! ALMOST doesn\'t save you from the crocodile pit!',
      'That was so close I almost didn\'t order your execution. ALMOST.',
      'The sphinx is laughing at you. The SPHINX. A stone statue with no mouth.',
      'SO close and yet SO far from keeping your organs inside your body.',
      'I\'m writing "mediocre" on your canopic jar RIGHT NOW.',
    ],
    wrong: [
      'GUARDS! Prepare the mummification table! This one\'s brain is EMPTY anyway!',
      'I\'ve seen smarter answers from the LOCUSTS in the seventh plague!',
      'That answer was so wrong, Osiris himself facepalmed in the underworld.',
      'Congratulations! You\'ve earned a one-way trip to the bottom of the Nile!',
      'My MUMMY could answer better than that, and she\'s been dead for 3000 years!',
      'I\'m sending plagues to your house specifically. Seven of them. No, EIGHT.',
    ],
  },
};

function randomPun(category, spiceLevel = 2) {
  const tier = PHARAOH_PUNS[spiceLevel] || PHARAOH_PUNS[2];
  const puns = tier[category] || tier.intro;
  return puns[Math.floor(Math.random() * puns.length)];
}

// ── Fuzzy Scoring ──────────────────────────────────────────

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalize(s) {
  return s.toLowerCase().trim()
    .replace(/^(the|a|an)\s+/i, '')   // strip leading articles
    .replace(/[''`]/g, '')            // strip apostrophes
    .replace(/[^\w\s]/g, '')          // strip punctuation
    .replace(/\s+/g, ' ');            // collapse whitespace
}

function scoreGuess(rawGuess, rawAnswer, alternates = []) {
  const guess = normalize(rawGuess);
  const answer = normalize(rawAnswer);
  if (!guess) return 0;

  // Exact match
  if (guess === answer) return 500;

  // Alternate exact match
  for (const alt of alternates) {
    if (guess === normalize(alt)) return 500;
  }

  // Contains match (one contains the other)
  if (answer.includes(guess) && guess.length >= 3) return 400;
  if (guess.includes(answer)) return 400;
  for (const alt of alternates) {
    const a = normalize(alt);
    if (a.includes(guess) && guess.length >= 3) return 350;
    if (guess.includes(a)) return 350;
  }

  // Levenshtein similarity
  const dist = levenshtein(guess, answer);
  const maxLen = Math.max(guess.length, answer.length);
  const similarity = 1 - dist / maxLen;
  if (similarity >= 0.85) return 450;
  if (similarity >= 0.7) return 350;
  if (similarity >= 0.55) return 250;

  // Word overlap
  const gWords = new Set(guess.split(/\s+/).filter(w => w.length > 2));
  const aWords = new Set(answer.split(/\s+/).filter(w => w.length > 2));
  const overlap = [...gWords].filter(w => aWords.has(w)).length;
  if (overlap > 0 && aWords.size > 0) {
    const ratio = overlap / aWords.size;
    return Math.floor(150 + ratio * 200);
  }

  return 0;
}

export class HieroglyphicsGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'hieroglyphics',
      name: 'High-roglyphics',
      rounds: 4,
      submissionTime: 30,
      votingTime: 0,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.usedAnswers = new Set();
    this.currentAnswer = null;
    this.currentEmojis = null;
    this.currentCategory = null;
    this.currentAlternates = [];
    this.puzzlePool = [];  // filtered + shuffled pool for this session
  }

  /** Build the puzzle pool from selected topics, shuffle it */
  _buildPuzzlePool() {
    if (this.puzzlePool.length > 0) return; // already built
    const topics = this.topics && this.topics.length > 0
      ? this.topics
      : Object.keys(PUZZLES);
    const pool = [];
    for (const topic of topics) {
      if (PUZZLES[topic]) pool.push(...PUZZLES[topic]);
    }
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.puzzlePool = pool;
  }

  async generatePrompt() {
    this._buildPuzzlePool();

    // Pick the next unused puzzle from the shuffled pool
    const puzzle = this.puzzlePool.find(p => !this.usedAnswers.has(p.answer.toLowerCase()));
    if (puzzle) {
      this.currentAnswer = puzzle.answer;
      this.currentEmojis = puzzle.emojis;
      this.currentCategory = puzzle.hint;
      this.currentAlternates = puzzle.alternates || [];
      this.usedAnswers.add(puzzle.answer.toLowerCase());
      return {
        text: puzzle.emojis,
        type: 'rebus',
        instruction: `What ${puzzle.hint} do these emojis represent?`,
        hostMessage: randomPun('intro', this.spiceLevel),
        category: puzzle.hint,
      };
    }

    // Exhausted the pool (very unlikely with 25+ per topic)
    this.currentAnswer = 'Sunshine';
    this.currentEmojis = '☀️😎🌈🌻';
    this.currentCategory = 'Thing';
    this.currentAlternates = [];
    return {
      text: this.currentEmojis,
      type: 'rebus',
      instruction: 'What do these emojis represent?',
      hostMessage: randomPun('intro', this.spiceLevel),
      category: 'Thing',
    };
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 100);
    if (!text) return { error: 'Type your guess!' };
    return { data: text };
  }

  /** Score locally with fuzzy matching — no AI needed */
  async scoreSubmissions() {
    const submissions = [];
    for (const [socketId, sub] of this.submissions) {
      const player = this.players.get(socketId);
      if (player) submissions.push({ socketId, playerName: player.name, text: sub });
    }
    if (submissions.length === 0) return;

    for (const sub of submissions) {
      const score = scoreGuess(sub.text, this.currentAnswer, this.currentAlternates);
      const category = score >= 400 ? 'correct' : score >= 200 ? 'close' : 'wrong';
      this.aiScores.set(sub.socketId, {
        score,
        comment: randomPun(category, this.spiceLevel),
      });
    }
  }

  /** Override tallyScores — local scoring + pharaoh host commentary */
  async tallyScores() {
    await this.scoreSubmissions();

    const roundScores = [];
    for (const [socketId, scoreData] of this.aiScores) {
      const player = this.players.get(socketId);
      if (player) {
        player.score = (player.score || 0) + scoreData.score;
        roundScores.push({
          id: socketId,
          name: player.name,
          submission: this.submissions.get(socketId),
          aiScore: scoreData.score,
          aiComment: scoreData.comment,
          roundTotal: scoreData.score,
          cumulativeScore: player.score,
        });
      }
    }

    roundScores.sort((a, b) => b.roundTotal - a.roundTotal);

    this.state = this.round >= this.totalRounds ? 'GAME_OVER' : 'ROUND_END';

    // Try to get a dynamic pharaoh host quip from AI (flavor only — game doesn't depend on it)
    let pharaohSays;
    try {
      const topScorer = roundScores[0];
      const anyoneGotIt = topScorer && topScorer.aiScore >= 400;
      const pharaohContext = anyoneGotIt
        ? `Player "${topScorer.name}" correctly guessed "${this.currentAnswer}" from the emojis ${this.currentEmojis}. Celebrate their genius (or mock how easy it was).`
        : `Nobody correctly guessed "${this.currentAnswer}" from the emojis ${this.currentEmojis}. Mock their failure and reveal the answer dramatically.`;

      const pharaohPersona = this.spiceLevel === 1
        ? 'You are Pharaoh Friendhotep, a kind and encouraging ancient Egyptian host. You\'re warm, educational, and treat every player like a beloved student. Keep it G-rated and wholesome.'
        : this.spiceLevel === 3
        ? 'You are Pharaoh Wrathhotep, an UNHINGED ancient Egyptian tyrant hosting a game show. You threaten players with mummification, plagues, crocodile pits, and tomb curses. Dark humor, insult comedy, over-the-top threats. You\'re furious when people get it right (they weren\'t supposed to!) and GLEEFUL when they fail. R-rated energy.'
        : 'You are Pharaoh Punhotep, a snarky ancient Egyptian host full of puns and sarcasm. You make pyramid puns, sphinx jokes, and mummy references. PG-13 territory. Think a stand-up comedian dressed as a pharaoh.';

      const raw = await getBellBotCommentary('generate_scenarios', {
        instruction: `${pharaohPersona}\n\n${pharaohContext}\n\nGive a 1-2 sentence dramatic pharaoh reaction. Stay in character. End by revealing the answer: "${this.currentAnswer}".`,
        jsonFormat: '"your pharaoh commentary as a plain string"',
      }, this.spiceLevel);
      // Strip quotes if Gemini wraps it
      pharaohSays = raw.replace(/^["']|["']$/g, '').trim();
      if (!pharaohSays || pharaohSays.length < 5) throw new Error('empty');
    } catch {
      // Fallback to static puns
      let pharaohCategory = 'wrong';
      if (roundScores.length === 0) pharaohCategory = 'intro';
      else if (roundScores[0]?.aiScore >= 400) pharaohCategory = 'correct';
      else if (roundScores[0]?.aiScore >= 200) pharaohCategory = 'close';
      pharaohSays = `${randomPun(pharaohCategory, this.spiceLevel)} The answer was: ${this.currentAnswer}!`;
    }

    return {
      state: this.state,
      round: this.round,
      roundScores,
      leaderboard: this.getScores(),
      bellbotSays: pharaohSays,
      prompt: this.currentPrompt,
      gameOver: this.state === 'GAME_OVER',
      correctAnswer: this.currentAnswer,
    };
  }

  getDefaultSubmission() { return '???'; }
  getSubmissionText(sub) { return sub; }

  // Skip base getAIScores — our tallyScores handles scoring via scoreSubmissions
  async getAIScores() { }
}
