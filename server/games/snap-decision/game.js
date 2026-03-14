// Snap Decision — Fast-paced "this or that" with speed scoring
import { BaseGame, STATES } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const SNAP_QUESTIONS = {
  1: [
    { q: 'Which is a real animal?', a: 'Axolotl', b: 'Flumperbird', answer: 'a' },
    { q: 'Which happened first?', a: 'Invention of the wheel', b: 'Construction of the pyramids', answer: 'a' },
    { q: 'Which weighs more?', a: 'An elephant\'s brain', b: 'A watermelon', answer: 'a' },
    { q: 'Which country has more people?', a: 'India', b: 'USA', answer: 'a' },
    { q: 'Which is taller?', a: 'Giraffe', b: 'Double-decker bus', answer: 'a' },
    { q: 'Which is faster?', a: 'Cheetah', b: 'Peregrine falcon', answer: 'b' },
    { q: 'Which ocean is bigger?', a: 'Atlantic', b: 'Pacific', answer: 'b' },
    { q: 'Which came first?', a: 'The printing press', b: 'The compass', answer: 'b' },
    { q: 'Which planet is bigger?', a: 'Neptune', b: 'Saturn', answer: 'b' },
    { q: 'Which has more bones?', a: 'A baby', b: 'An adult', answer: 'a' },
    { q: 'Which is a flightless bird?', a: 'Ostrich', b: 'Eagle', answer: 'a' },
    { q: 'Which continent is larger?', a: 'Africa', b: 'Europe', answer: 'a' },
    { q: 'Which has more legs?', a: 'Centipede', b: 'Spider', answer: 'a' },
    { q: 'Which is colder?', a: 'North Pole', b: 'South Pole', answer: 'b' },
    { q: 'Which language has more native speakers?', a: 'Mandarin', b: 'English', answer: 'a' },
    { q: 'Which planet is closest to the Sun?', a: 'Mercury', b: 'Venus', answer: 'a' },
    { q: 'Which fruit has more sugar?', a: 'Banana', b: 'Strawberry', answer: 'a' },
    { q: 'Which country is bigger?', a: 'Canada', b: 'China', answer: 'a' },
    { q: 'Which instrument has more strings?', a: 'Guitar', b: 'Violin', answer: 'a' },
    { q: 'Which building is taller?', a: 'Eiffel Tower', b: 'Statue of Liberty', answer: 'a' },
    { q: 'Which animal lives longer?', a: 'Tortoise', b: 'Parrot', answer: 'a' },
    { q: 'Which mountain is taller?', a: 'Mount Everest', b: 'K2', answer: 'a' },
    { q: 'Which moves faster?', a: 'Light', b: 'Sound', answer: 'a' },
    { q: 'Which sport uses a bigger ball?', a: 'Basketball', b: 'Soccer', answer: 'a' },
    { q: 'Which planet has more moons?', a: 'Jupiter', b: 'Mars', answer: 'a' },
  ],
  2: [
    { q: 'Which is a real law somewhere?', a: 'Illegal to own more than 2 dogs in Iran', b: 'Illegal to die in the Houses of Parliament', answer: 'b' },
    { q: 'Which costs more?', a: 'A gram of saffron', b: 'A gram of gold', answer: 'b' },
    { q: 'Which is real?', a: 'A sport called "chess boxing"', b: 'A sport called "competitive sleeping"', answer: 'a' },
    { q: 'Which company is older?', a: 'Nintendo', b: 'Coca-Cola', answer: 'a' },
    { q: 'Which is true?', a: 'Honey never expires', b: 'Diamonds are the hardest natural material', answer: 'a' },
    { q: 'Which cocktail uses gin and vermouth?', a: 'Margarita', b: 'Martini', answer: 'b' },
    { q: 'Which famous artist cut off his own ear?', a: 'Picasso', b: 'Van Gogh', answer: 'b' },
    { q: 'Which band performed at Woodstock?', a: 'The Beatles', b: 'Jimi Hendrix', answer: 'b' },
    { q: 'Which fictional detective lives at 221B Baker Street?', a: 'Poirot', b: 'Sherlock Holmes', answer: 'b' },
    { q: 'Which is a real phobia?', a: 'Arachibutyrophobia (peanut butter on roof of mouth)', b: 'Fluffophobia (fear of cotton balls)', answer: 'a' },
    { q: 'Which happened more recently?', a: 'Last execution by guillotine in France', b: 'Release of the first Star Wars movie', answer: 'a' },
    { q: 'Which country drinks more coffee per capita?', a: 'Finland', b: 'Italy', answer: 'a' },
    { q: 'Which was invented first?', a: 'Fax machine', b: 'Telephone', answer: 'a' },
    { q: 'Which is longer?', a: 'The Great Wall of China', b: 'The Nile River', answer: 'b' },
    { q: 'Which animal has a larger brain?', a: 'Dolphin', b: 'Elephant', answer: 'b' },
    { q: 'Which TV show ran longer?', a: 'The Simpsons', b: 'Friends', answer: 'a' },
    { q: 'Which is a real word?', a: 'Defenestration (throwing someone out a window)', b: 'Florbicate (to wiggle your toes)', answer: 'a' },
    { q: 'Which famous novel starts with "Call me Ishmael"?', a: 'Great Expectations', b: 'Moby Dick', answer: 'b' },
    { q: 'Which is more expensive?', a: 'A pound of vanilla beans', b: 'A pound of silver', answer: 'a' },
    { q: 'Which city has more people?', a: 'Tokyo', b: 'New York City', answer: 'a' },
    { q: 'Which animal is venomous?', a: 'Platypus', b: 'Porcupine', answer: 'a' },
    { q: 'Which empire lasted longer?', a: 'Roman Empire', b: 'British Empire', answer: 'a' },
    { q: 'Which is a real job title?', a: 'Professional cuddler', b: 'Certified nap consultant', answer: 'a' },
    { q: 'Which came first?', a: 'Oxford University', b: 'The Aztec Empire', answer: 'a' },
    { q: 'Which country has more islands?', a: 'Sweden', b: 'Philippines', answer: 'a' },
  ],
  3: [
    { q: 'Which is a real Wikipedia article?', a: 'List of animals with fraudulent diplomas', b: 'List of inventors killed by their own inventions', answer: 'b' },
    { q: 'Which actually happened?', a: 'Australia lost a war against emus', b: 'Canada apologized to Japan for good weather', answer: 'a' },
    { q: 'Which is a real product?', a: 'Toilet paper for your phone screen', b: 'USB pet rock', answer: 'b' },
    { q: 'Which is true?', a: 'There\'s a town called "Boring" in Oregon', b: 'There\'s a town called "Dull" in Scotland', answer: 'a' },
    { q: 'Which conspiracy theory has actual followers?', a: 'Flat Earth Theory', b: 'Birds Aren\'t Real', answer: 'a' },
    { q: 'Which is a real sport?', a: 'Cheese rolling down a hill', b: 'Competitive rock skipping in space', answer: 'a' },
    { q: 'Which actually exists?', a: 'An island of only cats in Japan', b: 'An island of only squirrels in Finland', answer: 'a' },
    { q: 'Which is a real place?', a: 'Batman, Turkey', b: 'Superman, Canada', answer: 'a' },
    { q: 'Which is true?', a: 'Octopuses have three hearts', b: 'Octopuses have three brains', answer: 'a' },
    { q: 'Which actually happened?', a: 'A pig was once put on trial for murder in France', b: 'A goat was elected mayor in Brazil', answer: 'a' },
    { q: 'Which is a real invention?', a: 'Solar-powered flashlight', b: 'Battery-powered battery charger', answer: 'a' },
    { q: 'Which is true?', a: 'Scotland\'s national animal is the unicorn', b: 'Ireland\'s national animal is the leprechaun', answer: 'a' },
    { q: 'Which is a real book?', a: 'How to Avoid Huge Ships', b: 'How to Outrun a Tornado in Sandals', answer: 'a' },
    { q: 'Which is a real patent?', a: 'Animal toy (stick)', b: 'Cloud seeding with cheese particles', answer: 'a' },
    { q: 'Which is true?', a: 'There are more fake flamingos than real ones', b: 'There are more rubber ducks than real ducks', answer: 'a' },
    { q: 'Which actually exists?', a: 'A museum of bad art', b: 'A museum of expired food', answer: 'a' },
    { q: 'Which is real?', a: 'Competitive tag is a professional sport', b: 'Competitive hide and seek has a world cup', answer: 'a' },
    { q: 'Which is true?', a: 'Bananas are berries', b: 'Strawberries are berries', answer: 'a' },
    { q: 'Which happened first?', a: 'Cleopatra lived', b: 'The moon landing', answer: 'a' },
    { q: 'Which is real?', a: 'There\'s an official word for throwing someone out a window', b: 'There\'s an official word for the fear of long words', answer: 'a' },
    { q: 'Which is a real fear?', a: 'Nomophobia (fear of being without your phone)', b: 'Screenophobia (fear of screen glare)', answer: 'a' },
    { q: 'Which is true?', a: 'A group of flamingos is called a flamboyance', b: 'A group of cats is called a catastrophe', answer: 'a' },
    { q: 'Which exists?', a: 'A town called Accident, Maryland', b: 'A town called Mistake, Ohio', answer: 'a' },
    { q: 'Which is real?', a: 'Bubble wrap was originally intended as wallpaper', b: 'Post-it notes were originally intended as bookmarks', answer: 'a' },
    { q: 'Which is true?', a: 'Cows have best friends', b: 'Chickens have favorite songs', answer: 'a' },
  ],
};

export class SnapDecisionGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'snap-decision',
      name: 'Snap Decision',
      rounds: 10, // More rounds, faster
      submissionTime: 8, // 8 seconds!
      votingTime: 0, // No voting phase — it's a speed game
      minPlayers: 2,
      maxPlayers: 10,
    });
    this.usedQuestions = new Set();
    this.answerTimes = new Map(); // socketId -> timestamp of answer
  }

  async generatePrompt() {
    const pool = SNAP_QUESTIONS[this.spiceLevel] || SNAP_QUESTIONS[1];
    const available = pool.filter((_, i) => !this.usedQuestions.has(i));
    const list = available.length > 0 ? available : pool;
    const idx = Math.floor(Math.random() * list.length);
    this.usedQuestions.add(idx);
    this.answerTimes.clear();
    const q = list[idx];
    return { ...q, type: 'snap', instruction: 'QUICK! Choose A or B! ⚡', startTime: Date.now() };
  }

  validateSubmission(submission) {
    const choice = String(submission).toLowerCase().trim();
    if (choice !== 'a' && choice !== 'b') return { error: 'Pick A or B!' };
    return { data: { choice, time: Date.now() } };
  }

  /** Speed game — no voting phase, score immediately */
  async lockSubmissions() {
    for (const id of this.playerOrder) {
      const p = this.players.get(id);
      if (!p.submitted) {
        this.submissions.set(id, this.getDefaultSubmission());
        p.submitted = true;
      }
    }

    // Score immediately — no reveal/voting
    const correctAnswer = this.currentPrompt?.answer;
    const startTime = this.currentPrompt?.startTime || Date.now();
    const roundScores = [];

    for (const [socketId, sub] of this.submissions) {
      const player = this.players.get(socketId);
      if (!player) continue;

      const isCorrect = sub.choice === correctAnswer;
      const responseTime = sub.time ? (sub.time - startTime) / 1000 : this.submissionTime;
      // Speed bonus: faster = more points (max 500 for correct, scaled by speed)
      let points = 0;
      if (isCorrect) {
        const speedFactor = Math.max(0, 1 - (responseTime / this.submissionTime));
        points = Math.round(200 + (300 * speedFactor)); // 200-500 based on speed
      }

      player.score += points;
      roundScores.push({
        id: socketId, name: player.name,
        aiScore: 0, voteScore: points, roundTotal: points,
        cumulativeScore: player.score,
        aiComment: isCorrect ? `Correct! (${responseTime.toFixed(1)}s) ⚡` : 'Wrong! ❌',
      });
    }

    roundScores.sort((a, b) => b.roundTotal - a.roundTotal);
    this.state = this.round >= this.totalRounds ? STATES.GAME_OVER : STATES.ROUND_END;

    return {
      state: this.state,
      round: this.round,
      roundScores,
      leaderboard: this.getScores(),
      correctAnswer,
      bellbotSays: `The answer was ${correctAnswer?.toUpperCase()}! ${roundScores[0]?.roundTotal > 0 ? `${roundScores[0].name} was fastest! ⚡` : 'Nobody got it! 😅'}`,
      gameOver: this.state === STATES.GAME_OVER,
    };
  }

  getDefaultSubmission() { return { choice: '', time: Date.now() + 99999 }; }
  getSubmissionText(sub) { return sub.choice?.toUpperCase() || '?'; }
}
