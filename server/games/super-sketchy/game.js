// Super Sketch — Drawful-style drawing + deception game
// Draw a weird prompt → others guess what it is → vote on which guess is real → score

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
  // SPICE 1 — Family Fun: silly, absurd, safe for all ages
  1: [
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
    'A bear stuck in a revolving door',
    'A flamingo at a bowling alley',
    'The world\'s tiniest dragon with the world\'s biggest attitude',
    'A shark on a tricycle',
    'A potato running for mayor',
    'A grumpy cat at a birthday party',
    'A hot dog wearing sunglasses at the beach',
    'A hamster powering a city with its wheel',
    'A wizard who only performs mundane spells',
    'A dragon afraid of fire',
    'An astronaut stuck in traffic on the way to the rocket',
    'A monster under the bed who is actually very shy',
    'The world\'s worst superhero landing',
    'A ghost trying to use a smartphone',
    'A T-rex trying to do pushups',
    'A very tiny person trying to ride a very large dog',
    'A cloud that rains glitter instead of rain',
    'A pencil who dreams of becoming a paintbrush',
    'A cookie refusing to be eaten',
    'An escalator in a medieval castle',
    'Two socks who lost each other in the laundry',
    'A fire hydrant who wants to be a fountain',
    'A broom that refuses to sweep',
    'The loneliest bench in the park',
    'A mailbox that reads all the letters',
    'A submarine in a swimming pool',
    'A very polite spider',
    'A confused GPS giving directions underwater',
    'A vending machine that only sells vegetables',
    'A mirror that shows your future self',
  ],

  // SPICE 2 — Spicy: crude body humor, drunk disasters, naked/embarrassing, sexual innuendo — NAH SPICY tier
  2: [
    'Skinny dipping when someone steals all the clothes',
    'Waking up completely naked somewhere you\'ve never been',
    'Getting caught in the shower by your roommate\'s new date',
    'A beer gut in a Speedo at a crowded public pool',
    'An accidental erection at the absolute worst moment in public',
    'The wrong bachelor party getting the very aggressive stripper',
    'A visible ass crack at a fancy restaurant',
    'Finding your own underwear somewhere it definitely should not be',
    'Your weed dealer turning out to be your new boss',
    'Getting so drunk you confess your deepest kinks to a complete stranger',
    'Your sexts being read aloud by accident at a family function',
    'The walk of shame in someone else\'s underwear',
    'A fart so powerful it ends a first date instantly',
    'The exact moment your thong becomes visible at a work presentation',
    'A man whose swim trunks have gone completely see-through at the public pool',
    'Someone\'s mom accidentally opening their browser history on the big TV',
    'Waking up with a stranger\'s name tattooed on your body',
    'Getting caught on a nudist beach when you didn\'t know it was one',
    'A bachelorette party gone completely sideways',
    'Accidentally sending your nudes to the wrong group chat',
    'A woman\'s bikini top flying off on a crowded waterslide',
    'A drunk person trying to explain their kink to a confused Uber driver',
    'Being pantsed in front of your entire office',
    'Discovering your parents\' sex tape while house-sitting',
    'Running out of toilet paper on a first date at their place',
    'The face you make during a very aggressive prostate exam',
    'Getting walked in on during something that\'s hard to explain innocently',
    'A striptease that goes catastrophically wrong',
    'Your boner being clearly visible in a formal group photo',
    'An old man in a thong at the beach who has absolutely no shame',
    'A couple\'s sex noises being broadcast through a baby monitor to the whole neighborhood',
    'Getting caught mid-strip by an Airbnb host who forgot someone was checking in',
    'Getting a lap dance from someone who turns out to be your cousin',
    'The desperate morning-after search for your underwear',
    'An ass so hairy it could have its own Instagram',
    'Your sexting auto-corrects changing everything to something horrifying',
    'A naked man walking into a nude yoga class by accident and staying to not seem rude',
    'Two people caught making out on a security camera in a grocery store',
    'Accidentally sitting on someone\'s crotch on a crowded bus',
    'The face you make when you realize your microphone was on the whole time',
    'Getting your junk caught in your zipper at the worst possible moment',
    'A man who is very clearly not wearing anything under his kilt in the wind',
    'Getting blackout drunk at your own work retirement party',
    'The moment you realize the bathroom you used had no walls',
    'Someone\'s thong snapping loudly in a completely silent church',
    'A naked person lost in the wrong hotel hallway at 2am trying to find their room',
    'A very horny ghost haunting a couple\'s honeymoon suite',
    'Your elderly grandmother finding your vibrator and asking what it\'s for',
    'Being walked in on by your parents at the absolute worst possible time',
    'Someone\'s ass getting stuck in an IKEA toilet',
    'Getting bare-ass smacked by a stranger at a bar who thought you were someone else',
    'The exact moment your bathing suit falls off mid-dive',
    'Getting an erection during a very solemn work presentation',
    'Someone smuggling something suspicious through airport security in their pants',
    'A very aggressive farting competition at a first family dinner',
    'Your one-night stand turning out to be your new coworker\'s spouse',
    'A very hairy man\'s first and last attempt at a wax',
    'Accidentally walking into the wrong gender\'s locker room and staying too long',
    'The look on the paramedic\'s face when they find out how this happened',
    'Getting your head stuck somewhere between a headboard and a wall',
    'A person\'s one-piece swimsuit having a catastrophic wardrobe malfunction at a pool party',
  ],

  // SPICE 3 — Unhinged: explicit sex acts, genitalia, kinks, depraved scenarios — NAH UNHINGED tier
  3: [
    'A prostate exam performed by Captain Hook with a hook',
    'What your genitals would look like as a Renaissance painting',
    'Getting caught masturbating by your Alexa who immediately announces it to the house',
    'A colonoscopy performed by an overly enthusiastic clown',
    'Accidentally sending your boss a nude instead of your CV',
    'A glory hole at a church confessional booth',
    'A threesome ruined by terrible logistics and a pullout couch',
    'A sex dungeon that turns out to be an Airbnb with really bad reviews',
    'The worst possible use of whipped cream at a dinner party',
    'Your grandma\'s browser history projected on a jumbotron at the Super Bowl',
    'A strip club for sentient robots with performance anxiety',
    'A very aggressive orgy interrupted by a fire alarm and mandatory evacuation',
    'Two people realizing they\'re using the same sex worker as a therapist',
    'What Satan does for fun on his day off',
    'A nudist colony fire drill where no one is allowed to cover up',
    'Accidentally discovering what a glory hole is the hard way',
    'A dick pic text sent to the wrong group when everyone is relatives',
    'Your "special folder" opened on the office projector by IT support',
    'Getting a boner at your grandmother\'s open casket funeral',
    'A naked couple trying to have sex in a hammock when it breaks and flings them both into a fence',
    'A drunk sext sent to your ex that also accidentally cc\'s your boss and priest',
    'Someone getting walked in on mid-sex by an Airbnb cleaning crew who just keeps cleaning around them',
    'Finding your mom\'s collection of sex toys while helping her move',
    'A pregnancy scare at your senior prom after-party',
    'A naked man being chased through a shopping mall by a security guard',
    'Getting a very personal tattoo removed by a very judgmental dermatologist',
    'A couples therapist watching two people describe their fetishes in real time',
    'The last thing you\'d want your urologist to say during a procedure',
    'A strip search that got WAY too personal and nobody complained',
    'What the TSA confiscates from someone\'s carry-on that requires a supervisor',
    'Getting your genitals stuck in a piece of gym equipment',
    'A swinger party accidentally advertised as a neighborhood block party',
    'Two people trying to sneakily have sex in the ocean at a crowded beach while everyone watches',
    'A drunk Vegas wedding consummated before anyone realized they were cousins',
    'A nude streaker tripping and sliding face-first into a crowd of wedding guests',
    'A couple whose handcuffs won\'t open having to call a locksmith while still attached to the headboard',
    'A donkey show explained to someone who genuinely doesn\'t know what it is',
    'A person\'s sex toy vibrating loudly in their bag during a job interview',
    'Getting caught mid-act by a Ring doorbell camera that auto-uploads to the family cloud',
    'A very detailed medical description of where the gerbil was found',
    'An erotic audiobook accidentally played at full volume in a library',
    'Someone\'s genitals accidentally drawn on in Sharpie by a friend who fell asleep while babysitting them drunk',
    'A drunk person explaining pegging to a very confused priest at a wedding',
    'Two people caught trying to have sex in a ski gondola as it arrives at a full station',
    'A sex ed class taught completely incorrectly by a very confident alien',
    'Getting walked in on mid-sex by an elderly neighbor who just wanted to return a casserole dish',
    'A very aggressive lap dance knocking the recipient headfirst into a birthday cake',
    'A person\'s sex toy accidentally turning on at full power during a video call with their boss',
    'A pornographic version of a children\'s fairy tale explained to a judge',
    'A naked person locked out of their Airbnb trying to get a neighbor\'s attention from a balcony',
    'A wedding night ruined by a forgotten safe word and a very concerned neighbor',
    'Getting your junk tattooed while blackout drunk on a cruise ship',
    'A priest discovering his parishioner\'s OnlyFans mid-confession',
    'The look on the ER nurse\'s face when you explain what the eggplant was for',
    'Being caught watching niche fetish content at 30,000 feet on the plane\'s WiFi',
    'What a proctologist has seen that permanently changed their perspective on humanity',
    'A very aggressive lap dance from someone who turns out to be your high school principal',
    'Getting your balls waxed for the first time by someone who is clearly a trainee',
    'Two people having sex in a car when it rolls into a dealership during a test drive',
    'Getting blackout drunk and waking up legally married to three different people',
  ],
};

// Spice algorithm: Level 1=[1], Level 2=[1,2], Level 3=[2,3]
function getSpiceLevels(level) {
  if (level === 1) return [1];
  if (level === 2) return [1, 2];
  return [2, 3];
}

// ── Game Constants ──────────────────────────────────────────
const DRAW_TIME = 60;
const DECOY_TIME = 30;
const VOTE_TIME = 15;
const REVEAL_TIME = 8;
const TOTAL_ROUNDS = 3;

// Game flow per round:
//   DRAWING (everyone draws) → for each drawing: DECOY → VOTING → REVEAL → next drawing
//   After all drawings in a round → next round (or GAME_OVER after round 3)

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

    // Round tracking
    this.roundNumber = 0;
    this.totalRounds = TOTAL_ROUNDS;

    // Drawing assignments for CURRENT round: socketId -> { prompt, drawingData }
    this.assignments = new Map();
    // Queue of socket IDs whose drawings still need to be shown this round
    this.drawingQueue = [];
    this.currentArtistId = null;
    // Decoys for current drawing: socketId -> their guess text
    this.decoys = new Map();
    // Votes for current drawing: voterId -> optionId
    this.votes = new Map();
    // Options for current vote: [{ id, text, authorId, isReal }]
    this.voteOptions = [];
    // Per-round drawing progress
    this.drawingsShown = 0;
    this.totalDrawings = 0;

    // Track used prompts across rounds to avoid repeats
    this.usedPrompts = new Set();

    // Players who joined mid-game — promoted to active at start of next round
    this.pendingPlayers = new Map(); // socketId -> { name, playerId }

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

  // Add a late-joining player — they'll be active starting next round
  addPendingPlayer(socketId, name, playerId) {
    if (this.players.has(socketId) || this.pendingPlayers.has(socketId)) return { error: 'Already in game' };
    this.pendingPlayers.set(socketId, { name, playerId });
    if (playerId) this.playerIdMap.set(playerId, socketId);
    return { success: true };
  }

  isPending(socketId) {
    return this.pendingPlayers.has(socketId);
  }

  getPendingState(socketId) {
    const pending = this.pendingPlayers.get(socketId);
    if (!pending) return null;
    const currentArtist = this.currentArtistId ? this.players.get(this.currentArtistId) : null;
    const assignment = this.currentArtistId ? this.assignments.get(this.currentArtistId) : null;
    return {
      roomCode: this.roomCode,
      players: this.getPlayerList(),
      isHost: false,
      playerName: pending.name,
      state: 'PENDING',
      activeGame: 'super-sketchy',
      gameState: {
        phase: 'pending',
        roundNumber: this.roundNumber,
        totalRounds: this.totalRounds,
        scores: this.getScores(),
        // Show the current drawing so they can watch
        currentDrawing: assignment?.drawingData || null,
        artistName: currentArtist?.name || null,
      },
    };
  }

  reconnectPlayer(playerId, newSocketId) {
    const oldSocketId = this.playerIdMap.get(playerId);
    if (!oldSocketId) return null;

    // Handle pending player reconnect
    const pendingEntry = this.pendingPlayers.get(oldSocketId);
    if (pendingEntry) {
      this.pendingPlayers.delete(oldSocketId);
      this.pendingPlayers.set(newSocketId, pendingEntry);
      this.playerIdMap.set(playerId, newSocketId);
      return pendingEntry;
    }

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

    if (this.assignments.has(oldSocketId)) {
      this.assignments.set(newSocketId, this.assignments.get(oldSocketId));
      this.assignments.delete(oldSocketId);
    }
    if (this.decoys.has(oldSocketId)) {
      this.decoys.set(newSocketId, this.decoys.get(oldSocketId));
      this.decoys.delete(oldSocketId);
    }
    if (this.votes.has(oldSocketId)) {
      this.votes.set(newSocketId, this.votes.get(oldSocketId));
      this.votes.delete(oldSocketId);
    }
    const qIdx = this.drawingQueue.indexOf(oldSocketId);
    if (qIdx !== -1) this.drawingQueue[qIdx] = newSocketId;
    if (this.currentArtistId === oldSocketId) this.currentArtistId = newSocketId;
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
    if (this.pendingPlayers.has(socketId)) return this.getPendingState(socketId);
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
        roundNumber: this.roundNumber,
        totalRounds: this.totalRounds,
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
      // In voting phase, return all options but mark the player's own decoy
      // so the client can show it greyed-out instead of hiding it entirely.
      voteOptions: this.state === 'VOTING'
        ? this.voteOptions.map(o => ({
            id: o.id,
            text: o.text,
            isOwn: o.authorId === socketId,
          }))
        : [],
      drawingsShown: this.drawingsShown,
      totalDrawings: this.totalDrawings,
    };
  }

  // ── Start Game (begins round 1) ──────────────────────────

  startGame(spiceLevel = 2) {
    if (this.playerOrder.length < 3) return { error: 'Need at least 3 players' };
    this.spiceLevel = spiceLevel;
    this.roundNumber = 0;
    this.usedPrompts.clear();
    return this._startNextRound();
  }

  // ── Start a new round (assign fresh prompts, enter DRAWING) ──

  _startNextRound() {
    this.roundNumber++;
    if (this.roundNumber > this.totalRounds) {
      return this.endGame();
    }

    // Build prompt pool excluding already-used prompts
    const levels = getSpiceLevels(this.spiceLevel);
    let pool = levels.flatMap(lvl => PROMPTS[lvl] || []).filter(p => !this.usedPrompts.has(p));
    if (pool.length < this.playerOrder.length) {
      // If we ran out, reset and reshuffle
      this.usedPrompts.clear();
      pool = levels.flatMap(lvl => PROMPTS[lvl] || []);
    }
    pool = shuffle(pool);

    // Assign unique prompts to each player
    this.assignments.clear();
    let promptIdx = 0;
    for (const socketId of this.playerOrder) {
      const prompt = pool[promptIdx % pool.length];
      this.assignments.set(socketId, { prompt, drawingData: null });
      this.usedPrompts.add(prompt);
      promptIdx++;
    }

    // Promote pending players into the active roster
    for (const [socketId, { name, playerId }] of this.pendingPlayers) {
      this.players.set(socketId, { name, score: 0, playerId });
      this.playerOrder.push(socketId);
      if (playerId) this.playerIdMap.set(playerId, socketId);
    }
    this.pendingPlayers.clear();

    this.totalDrawings = this.playerOrder.length;
    this.drawingsShown = 0;
    this.drawingQueue = [];
    this.currentArtistId = null;
    this.decoys.clear();
    this.votes.clear();
    this.voteOptions = [];
    this.state = 'DRAWING';

    return {
      state: 'DRAWING',
      roundNumber: this.roundNumber,
      totalRounds: this.totalRounds,
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

  // ── Lock Drawings & Start cycling through them ────────────

  lockDrawings() {
    if (this.state !== 'DRAWING') return { error: 'Not in drawing phase' };

    // Auto-submit blank for players who didn't draw
    for (const id of this.playerOrder) {
      const a = this.assignments.get(id);
      if (a && !a.drawingData) {
        a.drawingData = null;
      }
    }

    this.drawingQueue = shuffle([...this.playerOrder]);
    return this._showNextDrawing();
  }

  // ── Show Next Drawing (starts DECOY/guess phase) ──────────

  _showNextDrawing() {
    if (this.drawingQueue.length === 0) {
      // All drawings for this round done — start next round
      return this._startNextRound();
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
      roundNumber: this.roundNumber,
      totalRounds: this.totalRounds,
      timeLimit: DECOY_TIME,
    };
  }

  // ── Submit Decoy/Guess ────────────────────────────────────

  submitDecoy(socketId, decoyText) {
    if (this.state !== 'DECOY') return { error: 'Not in guess phase' };
    if (socketId === this.currentArtistId) return { error: 'Artist cannot submit a guess' };
    if (this.decoys.has(socketId)) return { error: 'Already submitted' };

    const cleaned = String(decoyText).trim().substring(0, 150);
    if (cleaned.length < 3) return { error: 'Too short' };

    this.decoys.set(socketId, cleaned);

    const nonArtists = this.playerOrder.filter(id => id !== this.currentArtistId);
    const allSubmitted = nonArtists.every(id => this.decoys.has(id));

    return { success: true, allSubmitted, submittedCount: this.decoys.size, totalDecoys: nonArtists.length };
  }

  // ── Lock Guesses & Start Voting ───────────────────────────

  lockDecoys() {
    if (this.state !== 'DECOY') return { error: 'Not in guess phase' };

    const nonArtists = this.playerOrder.filter(id => id !== this.currentArtistId);
    for (const id of nonArtists) {
      if (!this.decoys.has(id)) {
        this.decoys.set(id, '???');
      }
    }

    // Build vote options: real prompt + all guesses, shuffled
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

    const chosen = this.voteOptions.find(o => o.id === optionId);
    if (!chosen) return { error: 'Invalid option' };
    if (chosen.authorId === socketId) return { error: 'Cannot vote for your own answer' };

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
    for (const opt of this.voteOptions) voteCounts[opt.id] = [];
    for (const [voterId, optionId] of this.votes) {
      if (!voteCounts[optionId]) voteCounts[optionId] = [];
      voteCounts[optionId].push(voterId);
    }

    const correctGuessers = voteCounts['real'] || [];
    const artist = this.players.get(this.currentArtistId);

    // Scoring:
    // - Correct guesser: +1000 (double points — the big prize)
    // - Artist: +500 per player who guessed correctly
    // - Trickster: +500 per player fooled by their fake answer
    // - If NOBODY guessed right AND artist is human, artist gets +500 bonus
    const artistIsBot = typeof this.currentArtistId === 'string' && this.currentArtistId.startsWith('ai-bot-');
    if (artist) {
      artist.score += correctGuessers.length * 500;
      if (correctGuessers.length === 0 && !artistIsBot) {
        artist.score += 500; // nobody-got-it bonus (humans only)
      }
    }

    for (const gId of correctGuessers) {
      const guesser = this.players.get(gId);
      if (guesser) guesser.score += 1000;
    }

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

    const isLastDrawingInRound = this.drawingQueue.length === 0;
    const isLastRound = this.roundNumber >= this.totalRounds;
    const isGameOver = isLastDrawingInRound && isLastRound;

    return {
      state: 'REVEAL',
      realPrompt,
      artistName,
      artistId: this.currentArtistId,
      artistBonus: correctGuessers.length === 0 && !artistIsBot ? 500 : correctGuessers.length * 500,
      nobodyGuessedRight: correctGuessers.length === 0 && !artistIsBot,
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
      roundNumber: this.roundNumber,
      totalRounds: this.totalRounds,
      isGameOver,
      timeLimit: REVEAL_TIME,
    };
  }

  // ── Advance After Reveal ──────────────────────────────────

  advanceAfterReveal() {
    if (this.drawingQueue.length === 0) {
      // Round is over — start next round or end game
      return this._startNextRound();
    }
    return this._showNextDrawing();
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
