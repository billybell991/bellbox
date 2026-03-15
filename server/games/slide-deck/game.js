// Slide Deck — Players create one slide for a ridiculous presentation
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const PRESENTATIONS = {
  1: [
    'Why My Pet Should Be President',
    'A 5-Step Plan to Make Mondays Fun',
    'The Secret Lives of School Supplies',
    'How to Train Your Parents',
    'Why Recess Should Be 6 Hours Long',
    'The History of the Pillow Fort',
    'Why Dessert Should Come First: A Scientific Argument',
    'How to Survive a Road Trip With Your Family',
    'A Beginner\'s Guide to Befriending Squirrels',
    'Why Homework Is Actually Bad for the Environment',
    'The Top 10 Things Your Dog Is Thinking Right Now',
    'How to Win at Hide and Seek Every Single Time',
    'A Proposal: Replace All Tests With Pizza Parties',
    'The Untold History of the Rubber Duck',
    'Why Your Imaginary Friend Deserves a Driver\'s License',
    'The Definitive Ranking of Playground Equipment',
    'A 12-Step Program for Recovering Picky Eaters',
    'Why Cats Are Secretly Running the Internet',
    'The Case for Making Nap Time a Global Requirement',
    'How to Build a Functioning Spaceship From Household Items',
    'Why Every Meal Should Include Mac and Cheese',
    'The Science Behind Why Bedtime Is Too Early',
    'A Proposal to Replace All Doorbells With Custom Songs',
    'How To Give Your Goldfish the Best Life Possible',
    'The Underground Economy of School Lunch Trading',
  ],
  2: [
    'Why I Deserve a Raise (I Don\'t)',
    'How to Survive a Family Reunion',
    'The Complete Guide to Looking Busy at Work',
    'Why I Should Be Your Emergency Contact',
    'A TED Talk on Why TED Talks Are Overrated',
    'My 12-Step Plan to Become a Morning Person (Step 1: Give Up)',
    'How to Win Arguments You\'re Definitely Wrong About',
    'A Business Case for Extending Weekends to 4 Days',
    'The Art of the "I\'m Busy" Text When You\'re Not Busy',
    'Why Your Worst Ex Was a Valuable Learning Experience (They Weren\'t)',
    'A Guide to Surviving Your Friend\'s Terrible Cooking',
    'How to Look Like You\'re Listening in Meetings',
    'The Economic Impact of "Let Me Check My Calendar"',
    'Why Adulting Should Come With a User Manual',
    'A Proposal: Cancel All Mondays Permanently',
    'The Psychology Behind Passive-Aggressive Emojis',
    'How to Write an Out-of-Office Reply That Establishes Dominance',
    'Why Your Screen Time Report Is a Personal Attack',
    'A Defense of Watching the Same Show for the 7th Time',
    'The Hidden Costs of Being the "Funny Friend"',
    'Why Your Plant Dying Is Not Your Fault: A Legal Perspective',
    'A Complete Strategy Guide for Avoiding Small Talk',
    'The Science of Why You Always Pick the Slowest Lane',
    'How I Accidentally Became My Group Chat\'s Therapist',
    'Why No One Should Be Required to Have a "Signature Dish"',
  ],
  3: [
    'A Pitch Deck for a Startup That Should Not Exist',
    'Why I\'m Qualified to Run a Country (I\'m Not)',
    'Conspiracy Theories I Invented in the Shower',
    'A Self-Help Seminar by the Least Helpful Person Alive',
    'How to Gaslight Your Smart Home Devices',
    'My Manifesto on Why Socks Are a Scam',
    'Why the Simulation We Live In Needs a Software Update',
    'A Business Plan: Selling Existential Crises as a Service',
    'How to Successfully Argue With an AI and Win (You Can\'t)',
    'The Declassified Files of My Browser History',
    'Why Birds Are Government Drones: Evidence Presentation',
    'A Legal Brief on Why 3 AM Thoughts Should Be Inadmissible',
    'How to Convince Your Therapist That You\'re Doing Fine (You\'re Not)',
    'The PowerPoint I Made Instead of Going to Therapy',
    'Why My Life Is a Sitcom and Who Cancelled It',
    'A Comprehensive Analysis of Why I\'m Like This',
    'How to Write a Resignation Letter That Gets You a Raise',
    'Why Parallel Universes Have Better Versions of You',
    'A Proposal: Replace All Currency With Good Vibes',
    'The Case for Letting My Intrusive Thoughts Take the Wheel',
    'How I Accidentally Started a Cult and the Five-Star Yelp Reviews It Got',
    'Why AI Will Replace Us All But At Least It\'ll Be Funny',
    'A Scientific Exploration of What Dreams Are Actually Downloading',
    'The Board Meeting My Pets Would Run If Given the Chance',
    'A TED Talk on Why We Should All Collectively Agree to Stop Pretending',
  ],
};

export class SlideDeckGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'slide-deck',
      name: 'Slide Deck',
      rounds: 4,
      submissionTime: 60,
      votingTime: 30,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.usedTopics = new Set();
  }

  async generatePrompt() {
    try {
      const raw = await getBellBotCommentary('generate_prompt', {
        gameName: this.gameName,
        count: 1,
        description: 'Players each write ONE presentation slide (title + bullet points) for a ridiculous group presentation. The funniest/most creative slide wins.',
        extra: `Spice level: ${this.spiceLevel}.${this.getTopicHint() ? ` Topic area: ${this.getTopicHint()}.` : ''} Generate ONE absurd presentation topic. Players will each contribute one slide (title + 3 bullet points).`,
      }, this.spiceLevel);
      const prompts = parseBellBotJSON(raw);
      if (prompts?.[0]) return { text: prompts[0], type: 'slide', instruction: 'Create ONE killer slide: title + 3 bullet points! 📊' };
    } catch { /* fallback */ }

    const pool = PRESENTATIONS[this.spiceLevel] || PRESENTATIONS[2];
    const available = pool.filter(p => !this.usedTopics.has(p));
    const list = available.length > 0 ? available : pool;
    const topic = list[Math.floor(Math.random() * list.length)];
    this.usedTopics.add(topic);
    return { text: topic, type: 'slide', instruction: 'Create ONE killer slide: title + 3 bullet points! 📊' };
  }

  validateSubmission(submission) {
    if (!submission || typeof submission !== 'object') return { error: 'Create a slide!' };
    const title = String(submission.title || '').trim().substring(0, 100);
    const bullets = (submission.bullets || []).map(b => String(b).trim().substring(0, 150)).filter(Boolean);
    if (!title) return { error: 'Your slide needs a title!' };
    if (bullets.length < 1) return { error: 'Add at least one bullet point!' };
    return { data: { title, bullets: bullets.slice(0, 5) } };
  }

  getDefaultSubmission() { return { title: 'This Slide Intentionally Left Blank', bullets: ['No comment'] }; }
  getSubmissionText(sub) { return `${sub.title}\n${(sub.bullets || []).map(b => `• ${b}`).join('\n')}`; }
}
