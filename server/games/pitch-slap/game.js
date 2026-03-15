// Pitch Slap — Players pitch absurd product/business ideas, others vote
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const PITCH_PROMPTS = {
  1: [
    'A new app for kids that helps them organize their toy collection',
    'A restaurant that only serves food shaped like animals',
    'A theme park ride designed for grandparents',
    'A new holiday that the whole world should celebrate',
    'A school subject that doesn\'t exist yet but should',
    'A gadget that helps you do your least favorite chore',
    'A product that appeals exclusively to squirrels',
    'A device powered by static electricity from socks',
    'A hat that also functions as a breakfast toaster',
    'A product whose user manual is written entirely in emoji',
    'A service that generates compliments for strangers',
    'A toy that teaches pets to do household chores',
    'An alarm clock that wakes you up using only pleasant smells',
    'A subscription box for imaginary friends',
    'A vehicle designed specifically for traveling to the mailbox',
    'A new board game that combines cooking and exercise',
    'A backpack that floats behind you using tiny propellers',
    'A vending machine that only accepts jokes as payment',
    'A musical instrument anyone can play with zero practice',
    'A pillow that helps you remember your dreams',
    'A lunchbox that cooks your food on the walk to school',
    'A shoe that doubles as a flashlight for night walks',
    'A water bottle that makes any liquid taste like chocolate milk',
    'A calendar that rearranges your schedule to include more naps',
    'A garden tool designed for people who kill every plant they touch',
  ],
  2: [
    'A dating app but for finding new friends (that actually works)',
    'A subscription service nobody asked for but everyone needs',
    'A fitness product that requires absolutely zero effort',
    'A self-help book for a very specific and niche problem',
    'An AI-powered device that solves a problem no one has',
    'A luxury brand version of the most mundane product possible',
    'A product designed to annoy your neighbors passive-aggressively',
    'Something marketed exclusively to people who have been ghosted',
    'A device whose main feature is plausible deniability',
    'A product that helps you escape boring conversations at parties',
    'An app that tracks how many times your boss says synergy',
    'A subscription service for sending apology gifts to your ex automatically',
    'A social media platform exclusively for complaining about Mondays',
    'A fitness tracker that shames you instead of encouraging you',
    'A smart mirror that gives you unsolicited fashion advice',
    'A briefcase that makes you look important but contains only snacks',
    'A cologne/perfume that smells like financial stability',
    'An AI assistant that passive-aggressively manages your email',
    'A wine glass that holds an entire bottle but looks socially acceptable',
    'A meal kit service for meals that require therapy afterwards',
    'A robot that attends meetings on your behalf and overcommits',
    'A product that identifies which of your friends would not visit you in prison',
    'An alarm clock that reads your unread emails at increasing volume',
    'A mattress that kicks you out at a preset time',
    'A noise machine that plays sounds of productive work',
  ],
  3: [
    'A startup that sells artisanal air from different cities',
    'A social media platform specifically for complaining',
    'A reverse restaurant where you cook and the chef eats',
    'An insurance policy for embarrassing moments',
    'A time-share on the moon',
    'A gig economy app where people pay strangers to make life decisions for them',
    'A cryptocurrency backed exclusively by vibes',
    'A therapy app for sentient AI having existential crises',
    'A delivery service that brings your food from parallel dimensions',
    'A legal service for suing abstract concepts',
    'An airline that only flies to places that don\'t exist',
    'A dating app that matches you with your nemesis',
    'A real estate agency specializing in properties inside volcanoes',
    'A fitness tracker for your emotional baggage',
    'A subscription service that mails you someone else\'s problems',
    'A social media platform where you can only post things you regret',
    'A consulting firm that gives aggressively wrong advice on purpose',
    'A theme park based on your browser history',
    'A meditation app narrated by an increasingly panicked person',
    'A subscription box that sends you evidence of a crime you didn\'t commit',
    'An NFT marketplace for your abandoned New Year\'s resolutions',
    'A streaming service that only plays the wrong episode',
    'A weather app that predicts your emotional forecast',
    'A self-driving car that takes you where it thinks you should go',
    'A reverse alarm clock that tells you when you should have gone to bed',
  ],
};

export class PitchSlapGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'pitch-slap',
      name: 'Pitch Slap',
      rounds: 4,
      submissionTime: 60,
      votingTime: 30,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.usedPrompts = new Set();
  }

  async generatePrompt() {
    try {
      const raw = await getBellBotCommentary('generate_prompt', {
        gameName: this.gameName,
        count: 1,
        description: 'Players create the funniest elevator pitch for an absurd product or business.',
        extra: `Spice level: ${this.spiceLevel}.${this.getTopicHint() ? ` Topic area: ${this.getTopicHint()}.` : ''} Generate ONE product/business category or constraint. Players must pitch a product within this constraint. Make it specific enough to inspire creativity.`,
      }, this.spiceLevel);
      const prompts = parseBellBotJSON(raw);
      if (prompts?.[0]) return { text: prompts[0], type: 'pitch', instruction: 'Give your best 30-second elevator pitch!' };
    } catch { /* fallback */ }

    const pool = PITCH_PROMPTS[this.spiceLevel] || PITCH_PROMPTS[2];
    const available = pool.filter(p => !this.usedPrompts.has(p));
    const list = available.length > 0 ? available : pool;
    const prompt = list[Math.floor(Math.random() * list.length)];
    this.usedPrompts.add(prompt);
    return { text: prompt, type: 'pitch', instruction: 'Give your best elevator pitch for this!' };
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 500);
    if (text.length < 10) return { error: 'Pitch needs more substance!' };
    return { data: text };
  }

  getDefaultSubmission() { return 'Um... buy my thing? It\'s great. Trust me.'; }
  getSubmissionText(sub) { return sub; }
}
