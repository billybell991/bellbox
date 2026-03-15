// One Word Story — Players build a story one word at a time, then vote on the best
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const STORY_THEMES = {
  1: ['A day at the zoo', 'An adventure in space', 'The world\'s worst birthday party', 'A robot goes to school', 'A pirate gets lost',
    'A talking animal solves a mystery', 'A magic carpet with no sense of direction', 'The world\'s longest road trip', 'A superhero with a silly weakness',
    'A dragon who is afraid of fire', 'Aliens visit a kindergarten class', 'A detective dog cracks the case', 'The great pillow fort war',
    'A penguin opens a restaurant', 'A time traveling hamster', 'The world championship of hide and seek', 'A wizard who forgot all their spells',
    'An underwater school for fish', 'A ghost who is terrible at haunting', 'The coolest treehouse ever built', 'A cat becomes mayor of a small town',
    'A bear tries to make friends at a park', 'The great cookie heist', 'A volcano that only erupts confetti', 'Two clouds arguing about rain'],
  2: ['The worst first date ever', 'A heist gone wrong', 'The office holiday party disaster', 'A zombie looking for a job', 'The world\'s worst superhero',
    'A reality TV show in space', 'The most awkward job interview', 'A spy who is terrible at being sneaky', 'The world\'s strangest Airbnb',
    'A couples therapy session for robots', 'The reunion nobody wanted', 'A startup that pivots every hour', 'The worst wedding speech in history',
    'A vampire trying to fit in at the gym', 'An AI that develops a caffeine addiction', 'A cooking show where nothing works',
    'The most passive-aggressive neighborhood', 'A detective who only solves crimes by accident', 'The cursed group chat',
    'A Tinder date in the apocalypse', 'The world\'s worst life coach', 'An escape room designed by a toddler',
    'A support group for failed influencers', 'The company retreat that went sideways', 'A ghost that only haunts the office kitchen'],
  3: ['The apocalypse but everyone is chill', 'A ghost tries to file taxes', 'An alien invasion at the DMV', 'A villain\'s midlife crisis', 'The internet becomes sentient',
    'God\'s performance review', 'The universe\'s customer service hotline', 'A therapy session for the Grim Reaper',
    'A black hole opens in a Costco', 'The sentient roomba uprising', 'Reality TV but everyone is an AI',
    'Santa gets audited by the IRS', 'A time loop in an IKEA', 'The last braincell\'s retirement party',
    'A courtroom drama for existential crimes', 'Gravity takes a day off', 'The simulation crashes during a job interview',
    'A parallel universe where cats are in charge', 'The autobiography of a sentient sock', 'An ancient prophecy about a parking ticket',
    'The five stages of grief for WiFi going down', 'A philosophical debate between household appliances',
    'Death goes on vacation and hires a temp', 'The universe applies for a bank loan', 'A group therapy session for all the clocks that got set wrong'],
};

export class OneWordStoryGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'one-word-story',
      name: 'One Word Story',
      rounds: 3,
      submissionTime: 10,
      votingTime: 25,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.storyWords = [];
    this.currentTheme = null;
    this.wordRound = 0;
    this.maxWordRounds = 0;
    this.stories = new Map(); // Store complete stories per "round"
  }

  async generatePrompt() {
    // Each "round" is actually a full story-building session
    // Players contribute words in sequence, then vote on the result
    this.storyWords = [];
    this.wordRound = 0;
    // Everyone contributes 2 words each
    this.maxWordRounds = this.playerOrder.length * 2;

    try {
      const raw = await getBellBotCommentary('generate_prompt', {
        gameName: this.gameName,
        count: 1,
        description: 'Players build a story going around in a circle, each adding ONE word. The theme sets the scene.',
        extra: `Spice level: ${this.spiceLevel}.${this.getTopicHint() ? ` Topic area: ${this.getTopicHint()}.` : ''} Generate ONE story theme/setting in 3-5 words.`,
      }, this.spiceLevel);
      const prompts = parseBellBotJSON(raw);
      if (prompts?.[0]) {
        this.currentTheme = prompts[0];
        return { text: prompts[0], type: 'one-word', instruction: 'Add ONE word to the story! Each player takes turns.', wordsPerPlayer: 2 };
      }
    } catch { /* fallback */ }

    const pool = STORY_THEMES[this.spiceLevel] || STORY_THEMES[2];
    this.currentTheme = pool[Math.floor(Math.random() * pool.length)];
    return { text: this.currentTheme, type: 'one-word', instruction: 'Add ONE word to continue the story!', wordsPerPlayer: 2 };
  }

  /** In One Word Story, submission is just a single word */
  validateSubmission(submission) {
    const word = String(submission).trim().split(/\s+/)[0]?.substring(0, 30);
    if (!word) return { error: 'Say a word!' };
    return { data: word };
  }

  getDefaultSubmission() {
    const defaults = ['suddenly', 'but', 'then', 'however', 'and', 'the', 'meanwhile'];
    return defaults[Math.floor(Math.random() * defaults.length)];
  }

  getSubmissionText(sub) { return sub; }

  /** Override to include the story-so-far in state */
  getState(socketId) {
    const base = super.getState(socketId);
    base.storyWords = this.storyWords;
    base.storySoFar = this.storyWords.join(' ');
    base.currentWordPlayer = this.playerOrder[this.wordRound % this.playerOrder.length];
    base.isMyTurn = base.currentWordPlayer === socketId;
    return base;
  }
}
