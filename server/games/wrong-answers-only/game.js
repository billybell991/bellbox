// Wrong Answers Only — Players give the funniest wrong answer to real questions
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const QUESTIONS = {
  1: [
    'What is the capital of France?',
    'How many legs does a spider have?',
    'What color is the sky?',
    'What sound does a cow make?',
    'What planet do we live on?',
    'Who invented the light bulb?',
    'What is 2 + 2?',
    'What animal is known as man\'s best friend?',
    'How many continents are there?',
    'What is the largest ocean?',
    'Which planet is known as the Red Planet?',
    'Who painted the Mona Lisa?',
    'How many days are in a leap year?',
    'What instrument does a violinist play?',
    'Which animal lays the largest eggs?',
    'What is the primary ingredient in guacamole?',
    'What does a botanist study?',
    'In what city would you find the Colosseum?',
    'What is the fastest land animal?',
    'What is the opposite of north?',
    'What is the chemical symbol for water?',
    'Which scientist developed the theory of relativity?',
    'What is the largest country by land area?',
    'What is the smallest prime number?',
    'What type of fruit is known for turning into wine?',
    'Which continent is home to the Amazon Rainforest?',
    'How many bones are in the adult human body?',
    'What is the name of the toy cowboy in Toy Story?',
    'What process do plants use to make food?',
    'Which ocean borders the west coast of the United States?',
  ],
  2: [
    'Why do we dream?',
    'What is the meaning of life?',
    'Why is the sky blue?',
    'What came first: the chicken or the egg?',
    'Why do we park in driveways but drive on parkways?',
    'What happens when you die?',
    'Why are we here?',
    'What is dark matter?',
    'Why do cats purr?',
    'What causes deja vu?',
    'What is the average legal drinking age in most European countries?',
    'What is the most common reason for a walk of shame?',
    'What is the primary unspoken rule of bro code?',
    'What is the ideal amount of personal space at an awkward family gathering?',
    'What is the most effective way to unsend a drunken text message?',
    'Which social faux pas is most unforgivable at a wedding?',
    'What is the primary psychological impact of doomscrolling?',
    'What is the most effective method for sneaking out of a terrible party?',
    'What is the true meaning of Netflix and chill?',
    'What is the most polite way to ask a guest to leave when they\'ve overstayed?',
    'What is the universal gesture for I need another drink desperately?',
    'What is the optimal technique for opening a stubborn jar of pickles?',
    'What is the unwritten rule for splitting a restaurant bill among friends?',
    'What is the most appropriate response when a stranger asks for your number?',
    'What is the most effective strategy for avoiding small talk at parties?',
  ],
  3: [
    'What does the government REALLY do with our taxes?',
    'Why do hot dogs come in packs of 10 but buns in packs of 8?',
    'What is the Bermuda Triangle ACTUALLY about?',
    'Why can\'t you tickle yourself?',
    'What do pets think about all day?',
    'Why does time feel faster as you get older?',
    'What are clouds REALLY made of?',
    'Why do we have eyebrows?',
    'What happens in Area 51?',
    'Why is Pluto not a planet anymore?',
    'What is the true color of the universe\'s collective consciousness?',
    'What sound does the universe make when it sneezes?',
    'What is the exact flavor of a black hole?',
    'If reality is a simulation, what patch notes would you release?',
    'What is the secret handshake for entering the fifth dimension?',
    'What is the true identity of the sock monster that devours laundry?',
    'Do shadows have feelings and do they resent being stepped on?',
    'What is the precise mathematical formula for maximum chaos?',
    'Do plants secretly judge your interior decorating choices?',
    'What happens when you divide by zero in a conceptual sense?',
    'What is the preferred communication method of sentient dust bunnies?',
    'How many existential crises can fit on the head of a pin?',
    'What is the purpose of socks if not to disappear into the void?',
    'If the universe is expanding, where does its ex-partner live?',
    'What is the optimal humidity level for pondering your insignificance?',
  ],
};

export class WrongAnswersOnlyGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'wrong-answers-only',
      name: 'Wrong Answers Only',
      rounds: 5,
      submissionTime: 30,
      votingTime: 25,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.usedQuestions = new Set();
  }

  async generatePrompt() {
    try {
      const raw = await getBellBotCommentary('generate_prompt', {
        gameName: this.gameName,
        count: 1,
        description: 'Players give the funniest WRONG answer to a real/serious question. The more creative and absurd the wrong answer, the better.',
        extra: `Spice level: ${this.spiceLevel}.${this.getTopicHint() ? ` Topic area: ${this.getTopicHint()}.` : ''} Generate ONE real question (trivia, science, philosophy, or common knowledge) that has a known answer. Players will submit funny WRONG answers.`,
      }, this.spiceLevel);
      const prompts = parseBellBotJSON(raw);
      if (prompts?.[0]) return { text: prompts[0], type: 'wrong-answer', instruction: 'WRONG answers only! Be creative! 🚫' };
    } catch { /* fallback */ }

    const pool = QUESTIONS[this.spiceLevel] || QUESTIONS[2];
    const available = pool.filter(q => !this.usedQuestions.has(q));
    const list = available.length > 0 ? available : pool;
    const q = list[Math.floor(Math.random() * list.length)];
    this.usedQuestions.add(q);
    return { text: q, type: 'wrong-answer', instruction: 'WRONG answers only! Be creative! 🚫' };
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 200);
    if (!text) return { error: 'Give us a wrong answer!' };
    return { data: text };
  }

  getDefaultSubmission() { return '42'; }
  getSubmissionText(sub) { return sub; }
}
