// Super Sketchy — Drawful-style drawing + deception game
// Draw a weird prompt → others write fake prompts → vote on which is real

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Prompt Database ─────────────────────────────────────────
const PROMPTS = {
  1: [
    // Family Fun — innocent weirdness
    'A cat wearing a top hat riding a skateboard',
    'Pizza delivery to the moon',
    'A penguin at a job interview',
    'An octopus playing the drums',
    'A fish driving a car',
    'Breakfast in outer space',
    'A dog reading the newspaper',
    'A snowman on vacation at the beach',
    'A robot learning to dance',
    'A squirrel running a lemonade stand',
    'An elephant in an elevator',
    'A giraffe trying to hide behind a lamp post',
    'A pigeon with a briefcase',
    'A banana peel in court',
    'A snail winning a race',
    'A frog on a throne',
    'Homework eating the dog',
    'A cloud with legs going for a walk',
    'The world\'s most confusing road sign',
    'A cactus trying to give a hug',
    'A haunted piece of toast',
    'A turtle wearing rocket boots',
    'An invisible man\'s selfie',
    'A goldfish bowl with a doorbell',
    'A tree that grows hamburgers',
    'The tooth fairy\'s day off',
    'A horse in a business meeting',
    'A lamp that is afraid of the dark',
    'A sock puppet running for president',
    'Two clouds arguing about the weather',
    'A detective magnifying glass investigating itself',
    'A chair at a standing desk protest',
    'An umbrella on a sunny day looking sad',
    'A wifi signal trying to reach the bathroom',
    'A donut hole\'s identity crisis',
    'A traffic light having a bad day',
    'A pillow fort with a mortgage',
    'A superhero whose only power is folding laundry',
    'The last parking spot in the universe',
    'A dinosaur trying to make a bed',
  ],
  2: [
    // Spicy — awkward, suggestive, mildly uncomfortable
    'The walk of shame outfit',
    'What your browser history looks like at 3 AM',
    'A first date going horribly wrong',
    'Skinny dipping and someone steals your clothes',
    'Accidentally sending a text to the wrong person',
    'The most awkward elevator ride ever',
    'Getting caught picking your nose at a red light',
    'The morning after a bad decision',
    'A drunk person arguing with a stop sign',
    'Failing to parallel park while everyone watches',
    'The face you make during an awkward silence',
    'Waking up somewhere you don\'t recognize',
    'Your most embarrassing childhood photo',
    'A regrettable haircut',
    'Someone farting in yoga class',
    'The worst possible thing to say at a wedding',
    'Trying to act sober in front of your parents',
    'Being too hungover to function',
    'A bathroom emergency with no bathroom in sight',
    'Getting caught dancing alone by your roommate',
    'The face your dog gives you when you come home drunk',
    'Trying to flirt and completely failing',
    'Falling asleep in a meeting and everyone notices',
    'Your dating profile vs reality',
    'Getting your card declined on a first date',
    'A bad tattoo you got on vacation',
    'The moment you realize the walls are thin',
    'Eating something off the floor and someone saw',
    'Accidentally liking an ex\'s old photo at 2 AM',
    'The desperate search for a bathroom at a festival',
    'Your Uber driver eating your fries',
    'Being the only one who dressed up for the party',
    'A passive-aggressive sticky note from your roommate',
    'The exact moment you lock your keys in your car',
    'Running into your ex while looking your worst',
    'That one uncle at every family gathering',
    'What actually happens at office Christmas parties',
    'A questionable food truck at 2 AM',
    'The face you make when someone says "we need to talk"',
    'Getting pantsed in public',
  ],
  3: [
    // Unhinged — explicit, absurd, CAH energy
    'A strip club for robots',
    'What Satan does on his day off',
    'The worst possible thing to find in your search history',
    'A nudist colony\'s fire drill',
    'Getting caught doing something unspeakable with a vacuum cleaner',
    'Death by mayo',
    'What your organs do when you take a shot of tequila',
    'A sex ed class taught by aliens',
    'The most disturbing thing in your roommate\'s drawer',
    'Accidentally sending your boss a nude',
    'A prostate exam performed by Captain Hook',
    'What happens in the ball pit when the lights go off',
    'The worst use of whipped cream',
    'Someone finding your "special" folder',
    'A dick pic drawn by Picasso',
    'The walk of shame in a dinosaur costume',
    'A glory hole at a confessional',
    'Getting a boner at the absolute worst time',
    'What the priest really does after hours',
    'A furry convention emergency evacuation',
    'Drunk sexting your ex and hitting send to the group chat',
    'Finding your mom\'s secret toy drawer',
    'The world\'s most uncomfortable lap dance',
    'A colonoscopy performed by a clown',
    'What\'s actually in hot dogs',
    'A threesome gone horribly wrong',
    'Getting caught masturbating by Alexa who announces it',
    'The last thing you want to see in a public bathroom stall',
    'The morning after a blackout written as a crime scene',
    'A strip search that got too friendly',
    'What really happens at massage parlors',
    'Two people discovering they\'re Eskimo brothers',
    'A pregnancy scare at prom',
    'Your grandma\'s browser history',
    'The worst possible fortune in a fortune cookie',
    'A flasher at a nudist beach (the irony)',
    'What Grindr looks like for aliens',
    'A censored tattoo in an inappropriate place',
    'The world\'s most awkward prostate exam',
    'Getting your junk caught in something mechanical',
  ],
};

// Spice algorithm: Level 1=[1], Level 2=[1,2], Level 3=[2,3]
function getSpiceLevels(level) {
  if (level === 1) return [1];
  if (level === 2) return [1, 2];
  return [2, 3];
}

// ── Game States ─────────────────────────────────────────────
// LOBBY → DRAWING → DECOY → VOTING → REVEAL → (next drawing or GAME_OVER)

const DRAW_TIME = 60;
const DECOY_TIME = 30;
const VOTE_TIME = 15;
const REVEAL_TIME = 8;

export class SuperSketchyGame {
  constructor(roomCode, hostId, hostName) {
    this.roomCode = roomCode;
    this.hostId = hostId;
    this.players = new Map();
    this.playerOrder = [];
    this.playerIdMap = new Map();
    this.disconnectTimers = new Map();
    this.state = 'LOBBY';
    this.spiceLevel = 2;

    // Drawing assignments: socketId -> { prompt, drawingData }
    this.assignments = new Map();
    // Queue of socket IDs whose drawings still need to be shown
    this.drawingQueue = [];
    this.currentArtistId = null;
    // Decoys: socketId -> their fake prompt text
    this.decoys = new Map();
    // Votes: voterId -> optionId (the prompt/decoy they picked)
    this.votes = new Map();
    // Options for current vote: [{ id, text, authorId, isReal }]
    this.voteOptions = [];
    // Round tracking
    this.drawingsShown = 0;
    this.totalDrawings = 0;

    this.addPlayer(hostId, hostName);
  }

  addPlayer(socketId, name, playerId) {
    if (this.state !== 'LOBBY') return { error: 'Game already in progress' };
    if (this.players.has(socketId)) return { error: 'Already in room' };
    this.players.set(socketId, { name, score: 0, playerId });
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

    // Swap in assignments
    if (this.assignments.has(oldSocketId)) {
      this.assignments.set(newSocketId, this.assignments.get(oldSocketId));
      this.assignments.delete(oldSocketId);
    }
    // Swap in decoys
    if (this.decoys.has(oldSocketId)) {
      this.decoys.set(newSocketId, this.decoys.get(oldSocketId));
      this.decoys.delete(oldSocketId);
    }
    // Swap in votes
    if (this.votes.has(oldSocketId)) {
      this.votes.set(newSocketId, this.votes.get(oldSocketId));
      this.votes.delete(oldSocketId);
    }
    // Swap in drawingQueue
    const qIdx = this.drawingQueue.indexOf(oldSocketId);
    if (qIdx !== -1) this.drawingQueue[qIdx] = newSocketId;
    if (this.currentArtistId === oldSocketId) this.currentArtistId = newSocketId;
    // Swap voteOptions authorId
    for (const opt of this.voteOptions) {
      if (opt.authorId === oldSocketId) opt.authorId = newSocketId;
    }

    return player;
  }

  getPlayerList() {
    return this.playerOrder.map(id => {
      const p = this.players.get(id);
      return { id, name: p.name, score: p.score };
    });
  }

  getScores() {
    return this.getPlayerList().sort((a, b) => b.score - a.score);
  }

  getFullState(socketId) {
    const player = this.players.get(socketId);
    if (!player) return null;
    const assignment = this.assignments.get(socketId);
    return {
      roomCode: this.roomCode,
      players: this.getPlayerList(),
      isHost: socketId === this.hostId,
      playerName: player.name,
      state: this.state,
      gameState: {
        phase: this.state.toLowerCase(),
        myPrompt: assignment?.prompt || null,
        myDrawingSubmitted: !!assignment?.drawingData,
        currentDrawing: this.state === 'DECOY' || this.state === 'VOTING' || this.state === 'REVEAL'
          ? this._getCurrentDrawingState(socketId) : null,
        scores: this.getScores(),
        drawingsShown: this.drawingsShown,
        totalDrawings: this.totalDrawings,
      },
    };
  }

  _getCurrentDrawingState(socketId) {
    if (!this.currentArtistId) return null;
    const assignment = this.assignments.get(this.currentArtistId);
    const artistName = this.players.get(this.currentArtistId)?.name || 'Someone';
    const isArtist = socketId === this.currentArtistId;
    return {
      artistName,
      artistId: this.currentArtistId,
      drawingData: assignment?.drawingData || null,
      isArtist,
      hasSubmittedDecoy: this.decoys.has(socketId),
      hasVoted: this.votes.has(socketId),
      voteOptions: this.state === 'VOTING' ? this.voteOptions.map(o => ({ id: o.id, text: o.text })) : [],
      drawingsShown: this.drawingsShown,
      totalDrawings: this.totalDrawings,
    };
  }

  // ── Start Game ────────────────────────────────────────────

  startGame(spiceLevel = 2) {
    if (this.playerOrder.length < 3) return { error: 'Need at least 3 players' };
    this.spiceLevel = spiceLevel;

    // Assign unique prompts to each player
    const levels = getSpiceLevels(spiceLevel);
    const pool = shuffle(levels.flatMap(lvl => PROMPTS[lvl] || []));

    let promptIdx = 0;
    for (const socketId of this.playerOrder) {
      this.assignments.set(socketId, {
        prompt: pool[promptIdx % pool.length],
        drawingData: null,
      });
      promptIdx++;
    }

    this.totalDrawings = this.playerOrder.length;
    this.drawingsShown = 0;
    this.state = 'DRAWING';

    return {
      state: 'DRAWING',
      timeLimit: DRAW_TIME,
      players: this.getPlayerList(),
    };
  }

  // ── Submit Drawing ────────────────────────────────────────

  submitDrawing(socketId, drawingData) {
    if (this.state !== 'DRAWING') return { error: 'Not in drawing phase' };
    const assignment = this.assignments.get(socketId);
    if (!assignment) return { error: 'Not in game' };
    if (assignment.drawingData) return { error: 'Already submitted' };

    assignment.drawingData = drawingData;

    const allSubmitted = this.playerOrder.every(id => {
      const a = this.assignments.get(id);
      return a && a.drawingData;
    });

    return { success: true, allSubmitted };
  }

  // ── Lock Drawings & Start Decoy Phase ─────────────────────

  lockDrawings() {
    if (this.state !== 'DRAWING') return { error: 'Not in drawing phase' };

    // Auto-submit blank for players who didn't draw
    for (const id of this.playerOrder) {
      const a = this.assignments.get(id);
      if (a && !a.drawingData) {
        a.drawingData = null; // Will show as blank canvas
      }
    }

    // Shuffle drawing order
    this.drawingQueue = shuffle([...this.playerOrder]);
    return this.showNextDrawing();
  }

  // ── Show Next Drawing (starts DECOY phase) ────────────────

  showNextDrawing() {
    if (this.drawingQueue.length === 0) {
      return this.endGame();
    }

    this.currentArtistId = this.drawingQueue.shift();
    this.decoys.clear();
    this.votes.clear();
    this.voteOptions = [];
    this.drawingsShown++;
    this.state = 'DECOY';

    const assignment = this.assignments.get(this.currentArtistId);
    const artistName = this.players.get(this.currentArtistId)?.name || 'Someone';

    return {
      state: 'DECOY',
      drawingData: assignment?.drawingData || null,
      artistName,
      artistId: this.currentArtistId,
      drawingsShown: this.drawingsShown,
      totalDrawings: this.totalDrawings,
      timeLimit: DECOY_TIME,
    };
  }

  // ── Submit Decoy ──────────────────────────────────────────

  submitDecoy(socketId, decoyText) {
    if (this.state !== 'DECOY') return { error: 'Not in decoy phase' };
    if (socketId === this.currentArtistId) return { error: 'Artist cannot submit a decoy' };
    if (this.decoys.has(socketId)) return { error: 'Already submitted' };

    const cleaned = String(decoyText).trim().substring(0, 150);
    if (cleaned.length < 3) return { error: 'Too short' };

    this.decoys.set(socketId, cleaned);

    // Check if all non-artist players submitted
    const nonArtists = this.playerOrder.filter(id => id !== this.currentArtistId);
    const allSubmitted = nonArtists.every(id => this.decoys.has(id));

    return { success: true, allSubmitted, submittedCount: this.decoys.size, totalDecoys: nonArtists.length };
  }

  // ── Lock Decoys & Start Voting ────────────────────────────

  lockDecoys() {
    if (this.state !== 'DECOY') return { error: 'Not in decoy phase' };

    // Auto-submit blank decoys for non-submitters
    const nonArtists = this.playerOrder.filter(id => id !== this.currentArtistId);
    for (const id of nonArtists) {
      if (!this.decoys.has(id)) {
        this.decoys.set(id, '???');
      }
    }

    // Build vote options: real prompt + all decoys, shuffled
    const realPrompt = this.assignments.get(this.currentArtistId)?.prompt || '???';
    const options = [
      { id: 'real', text: realPrompt, authorId: null, isReal: true },
    ];
    for (const [socketId, text] of this.decoys) {
      options.push({ id: `decoy-${socketId}`, text, authorId: socketId, isReal: false });
    }

    this.voteOptions = shuffle(options);
    this.votes.clear();
    this.state = 'VOTING';

    return {
      state: 'VOTING',
      options: this.voteOptions.map(o => ({ id: o.id, text: o.text })),
      artistId: this.currentArtistId,
      timeLimit: VOTE_TIME,
    };
  }

  // ── Cast Vote ─────────────────────────────────────────────

  castVote(socketId, optionId) {
    if (this.state !== 'VOTING') return { error: 'Not in voting phase' };
    if (socketId === this.currentArtistId) return { error: 'Artist cannot vote' };
    if (this.votes.has(socketId)) return { error: 'Already voted' };

    // Can't vote for your own decoy
    const chosen = this.voteOptions.find(o => o.id === optionId);
    if (!chosen) return { error: 'Invalid option' };
    if (chosen.authorId === socketId) return { error: 'Cannot vote for your own decoy' };

    this.votes.set(socketId, optionId);

    const nonArtists = this.playerOrder.filter(id => id !== this.currentArtistId);
    const allVoted = nonArtists.every(id => this.votes.has(id));

    return { success: true, allVoted };
  }

  // ── Tally & Reveal ────────────────────────────────────────

  tallyAndReveal() {
    if (this.state !== 'VOTING') return { error: 'Not in voting phase' };

    const artistName = this.players.get(this.currentArtistId)?.name || 'Someone';
    const realPrompt = this.assignments.get(this.currentArtistId)?.prompt || '???';

    // Count votes per option
    const voteCounts = {};
    for (const opt of this.voteOptions) {
      voteCounts[opt.id] = [];
    }
    for (const [voterId, optionId] of this.votes) {
      if (!voteCounts[optionId]) voteCounts[optionId] = [];
      voteCounts[optionId].push(voterId);
    }

    // Score: Artist gets +500 per correct guesser
    const correctGuessers = voteCounts['real'] || [];
    const artist = this.players.get(this.currentArtistId);
    if (artist) {
      artist.score += correctGuessers.length * 500;
    }

    // Score: Correct guessers get +1000
    for (const gId of correctGuessers) {
      const guesser = this.players.get(gId);
      if (guesser) guesser.score += 1000;
    }

    // Score: Tricksters get +500 per player fooled by their decoy
    const tricksterResults = [];
    for (const opt of this.voteOptions) {
      if (opt.isReal) continue;
      const fooled = voteCounts[opt.id] || [];
      if (fooled.length > 0 && opt.authorId) {
        const trickster = this.players.get(opt.authorId);
        if (trickster) trickster.score += fooled.length * 500;
        tricksterResults.push({
          authorId: opt.authorId,
          authorName: trickster?.name || 'Someone',
          decoyText: opt.text,
          fooledCount: fooled.length,
          fooledNames: fooled.map(id => this.players.get(id)?.name || '?'),
        });
      }
    }

    this.state = 'REVEAL';

    // Build reveal data
    const reveal = {
      state: 'REVEAL',
      realPrompt,
      artistName,
      artistId: this.currentArtistId,
      artistBonus: correctGuessers.length * 500,
      correctGuessers: correctGuessers.map(id => ({
        id, name: this.players.get(id)?.name || '?',
      })),
      options: this.voteOptions.map(opt => ({
        id: opt.id,
        text: opt.text,
        isReal: opt.isReal,
        authorName: opt.authorId ? (this.players.get(opt.authorId)?.name || '?') : null,
        votes: (voteCounts[opt.id] || []).map(id => ({
          id, name: this.players.get(id)?.name || '?',
        })),
      })),
      tricksters: tricksterResults,
      scores: this.getScores(),
      drawingsRemaining: this.drawingQueue.length,
      drawingsShown: this.drawingsShown,
      totalDrawings: this.totalDrawings,
      timeLimit: REVEAL_TIME,
    };

    return reveal;
  }

  // ── Advance After Reveal ──────────────────────────────────

  advanceAfterReveal() {
    if (this.drawingQueue.length === 0) {
      return this.endGame();
    }
    return this.showNextDrawing();
  }

  // ── End Game ──────────────────────────────────────────────

  endGame() {
    this.state = 'GAME_OVER';
    return {
      state: 'GAME_OVER',
      scores: this.getScores(),
      winner: this.getScores()[0] || null,
    };
  }
}
