// Hieroglyphics — Players communicate a phrase using ONLY emojis, others guess
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const PHRASES = {
  1: [
    'Walking the dog in the rain',
    'Eating pizza and watching movies',
    'Building a sandcastle at the beach',
    'Flying a kite on a windy day',
    'Baking cookies for your friends',
    'Playing hide and seek in the dark',
    'Reading a book under a tree',
    'Riding a bicycle uphill',
    'A monkey stealing bananas from a market',
    'Dancing in the living room when nobody is home',
    'Trying to catch a butterfly with your hands',
    'Making a snow angel in the backyard',
    'A penguin sliding on ice into a swimming pool',
    'Cooking pancakes and flipping them too high',
    'A cat knocking a glass off a table on purpose',
    'Throwing a surprise birthday party for a friend',
    'Swimming with dolphins in the ocean',
    'A robot learning to ride a skateboard',
    'Getting lost in a giant corn maze',
    'A chicken crossing the road during rush hour',
    'Playing soccer with a coconut on the beach',
    'A wizard making potions in a messy kitchen',
    'Camping under the stars and telling ghost stories',
    'A dragon trying to blow out its own birthday candles',
    'Racing shopping carts through a grocery store',
  ],
  2: [
    'That awkward moment when you wave back at someone not waving at you',
    'Pretending to work when the boss walks by',
    'Sending a text to the wrong person',
    'Trying to parallel park while everyone watches',
    'When your food arrives and it looks nothing like the menu photo',
    'Realizing you left your phone at home',
    'The Sunday scaries hitting at 4pm',
    'Being put on speakerphone without warning',
    'Forgetting someone\'s name immediately after they introduce themselves',
    'Saying goodbye then walking in the same direction',
    'Pulling a push door in front of people',
    'When your Spotify wrapped exposes your guilty pleasure music',
    'Seeing your ex in public and pretending you don\'t see them',
    'Looking busy at work while actually online shopping',
    'When your phone dies at 1% mid-argument text',
    'Trying to take a good passport photo and failing miserably',
    'When you accidentally like a photo from 2 years ago while stalking',
    'Rehearsing an argument in the shower',
    'Being the only person who laughed at a joke in a meeting',
    'When the waiter says enjoy your meal and you say you too',
    'Pretending to understand a joke everyone else laughed at',
    'Accidentally calling your teacher mom',
    'When your chair makes a noise and everyone thinks it was you',
    'Waving at someone who was waving at the person behind you',
    'When the group chat goes silent after your message',
  ],
  3: [
    'Existential crisis in the shower',
    'Googling your symptoms at 3am',
    'The walk of shame but you feel no shame',
    'When autocorrect ruins your life',
    'Accidentally liking a photo from 3 years ago while stalking',
    'The moment you realize you\'ve been on mute the entire meeting',
    'Rage-quitting but in real life',
    'The five stages of grief but for your Wi-Fi going out',
    'Your last brain cell trying to function on a Monday',
    'Doom scrolling until your phone battery dies then staring at the ceiling',
    'Sending a risky text and immediately turning your phone face down',
    'When your inner thoughts accidentally come out of your mouth',
    'Explaining a meme to your parents and losing the will to live',
    'When your alarm goes off and you negotiate with God for 5 more minutes',
    'Having a full conversation with yourself in different accents',
    'Your sleep paralysis demon judging your sleep schedule',
    'Crying over a commercial at 2am for no reason',
    'When the AI starts giving you therapy instead of answers',
    'Your fight or flight response activating when someone says we need to talk',
    'That moment when you realize the call wasn\'t on mute',
    'Questioning your entire existence over a minor inconvenience',
    'When you open the fridge hoping new food appeared since last time',
    'Procrastinating by organizing everything except what you need to do',
    'When the simulation glitches and you walk into a room forgetting why',
    'Your brain at 3am playing your most embarrassing memories on repeat',
  ],
};

export class HieroglyphicsGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'hieroglyphics',
      name: 'Hieroglyphics',
      rounds: 4,
      submissionTime: 30,
      votingTime: 30,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.usedPhrases = new Set();
    this.currentPhrase = null;
    // In hieroglyphics, the twist is: some players encode, others decode
    this.encoders = new Set(); // Players who get the phrase and use emojis
  }

  async generatePrompt() {
    // Assign half as encoders, half as decoders
    this.encoders.clear();
    const shuffled = [...this.playerOrder].sort(() => Math.random() - 0.5);
    const halfCount = Math.ceil(shuffled.length / 2);
    for (let i = 0; i < halfCount; i++) {
      this.encoders.add(shuffled[i]);
    }

    try {
      const raw = await getBellBotCommentary('generate_prompt', {
        gameName: this.gameName,
        count: 1,
        description: 'Players must translate a phrase/scenario into ONLY emojis. Other players will try to guess what it means. The phrase should be visual enough to be emoji-able.',
        extra: `Spice level: ${this.spiceLevel}. Generate ONE phrase or common scenario that can be represented with emojis.`,
      }, this.spiceLevel);
      const prompts = parseBellBotJSON(raw);
      if (prompts?.[0]) {
        this.currentPhrase = prompts[0];
        return { phrase: prompts[0], type: 'hieroglyphics', instruction: 'Translate this into EMOJIS ONLY! 🔤➡️😀' };
      }
    } catch { /* fallback */ }

    const pool = PHRASES[this.spiceLevel] || PHRASES[2];
    const available = pool.filter(p => !this.usedPhrases.has(p));
    const list = available.length > 0 ? available : pool;
    const phrase = list[Math.floor(Math.random() * list.length)];
    this.usedPhrases.add(phrase);
    this.currentPhrase = phrase;
    return { phrase, type: 'hieroglyphics', instruction: 'Translate this into EMOJIS ONLY! 🔤➡️😀' };
  }

  /** Encoders see the phrase and submit emojis, decoders submit guesses */
  getState(socketId) {
    const base = super.getState(socketId);
    base.isEncoder = this.encoders.has(socketId);
    if (!base.isEncoder && base.prompt) {
      // Decoders don't see the phrase — they'll see emoji submissions during voting
      base.prompt = { ...base.prompt, phrase: '[Hidden — you\'ll guess from the emojis!]' };
    }
    return base;
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 100);
    if (!text) return { error: 'Submit something!' };
    return { data: text };
  }

  getDefaultSubmission() { return '🤷'; }
  getSubmissionText(sub) { return sub; }
}
