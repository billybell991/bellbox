// Accent Roulette — Players read lines in random accents, AI judges
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';
import { analyzeAudio } from '../../gemini-audio.js';

const ACCENTS = [
  'Southern American', 'British Posh', 'Australian', 'French', 'Italian',
  'Texan Cowboy', 'New York Taxi Driver', 'Scottish', 'Surfer Dude',
  'Valley Girl', 'Old-Timey Newsreel', 'Transylvanian Vampire',
  'Shakespearean Actor', 'Excited Sports Announcer', 'Whisper ASMR',
  'Boston', 'Irish', 'Jamaican', 'Pirate', 'Robot Monotone',
  'German Scientist', 'Bollywood Drama', 'Southern Belle',
  'Viking Warrior', 'Old Western Sheriff', 'Noir Detective',
  'Spanish Bullfighter', 'Drill Sergeant', 'Yoga Instructor Zen',
  'Game Show Host', 'Opera Singer', 'Surfer Bro California',
];

const LINES = {
  1: [
    'I would like to order a large pizza with extra cheese, please.',
    'Excuse me, do you know where the nearest library is?',
    'I can\'t believe it\'s not butter!',
    'Ladies and gentlemen, please fasten your seatbelts.',
    'The weather today will be partly cloudy with a chance of meatballs.',
    'My dog ate my homework and honestly seemed to enjoy it.',
    'I have decided to become a professional napper. Please respect my career choice.',
    'The penguin just stole my sandwich and showed zero remorse.',
    'Welcome to the jungle! We have fun and games and a really great salad bar.',
    'I strongly believe that breakfast for dinner is one of life\'s greatest gifts.',
    'The wifi password is all lowercase, no spaces, and I\'ve already forgotten it.',
    'I would like to thank not only God but also the person who invented garlic bread.',
    'If found, please return this duck to the front desk immediately.',
    'Today\'s special is spaghetti, but the spaghetti has feelings so be gentle.',
    'According to my calculations, we\'re going to need a bigger boat.',
    'I am formally requesting a hug. Preferably from someone who doesn\'t judge.',
    'The cat is now in charge of the meeting. All questions go through the cat.',
    'In case of emergency, remain calm and eat a cookie.',
    'I pledge allegiance to the snack table at every social gathering.',
    'This concludes today\'s lesson. There will be NO homework. Class dismissed!',
    'Attention shoppers: there is a runaway shopping cart in aisle seven. It has chosen freedom.',
    'I think we can all agree that nap time should not end after kindergarten.',
    'The floor is lava! Everyone to the couch! This is not a drill!',
    'We interrupt this broadcast to bring you an important message about snacks.',
    'And the winner of Best Human of the Year goes to... probably not me, but let\'s see.',
  ],
  2: [
    'Look, I didn\'t come here to make friends. I came here to win.',
    'If you can dream it, you can do it. But also, lower your expectations.',
    'I\'m not saying it was aliens, but it was definitely aliens.',
    'Your table for two is ready. Unfortunately, your date is not.',
    'I\'ve made a huge mistake, but I\'ve also made lasagna, so it evens out.',
    'My therapist says I need to express my feelings more, so here goes: I\'m hungry.',
    'I didn\'t plan to be this dramatic today, but here we are.',
    'Life is short, but this meeting is not. When does it end?',
    'I have trust issues. Specifically with the weather app and the gas gauge in my car.',
    'Welcome to adulting where everything is made up and the points don\'t matter.',
    'I need a vacation from the vacation I just took.',
    'Breaking news: local man discovers the gym is actually harder than it looks on TikTok.',
    'I\'m speaking to you live from the parking lot because I need a moment before this meeting.',
    'The doctor said I need to reduce my stress. So I\'m quitting on your behalf.',
    'I would like to report a crime. Someone ate my clearly labeled lunch from the fridge.',
    'My dating profile says I love adventure. By adventure I mean Netflix and snacks.',
    'I just survived a family group chat. I request hazard pay immediately.',
    'You can\'t fire me, I quit. Actually wait, can I still use the coffee machine?',
    'I promise you, nobody in this room is having a worse day than me. Let me explain.',
    'Everything is fine. The house is fine. Nothing is on fire. Why do you ask?',
    'I need everyone to calm down. Especially me. Mostly me. Only me.',
    'My horoscope said today would be interesting. "Interesting" was an understatement.',
    'I was told there would be free food at this event. I see NO food. I feel BETRAYED.',
    'Listen, we can do this the easy way or the hard way. Both ways involve crying.',
    'For legal reasons I can neither confirm nor deny that I ate the entire cake.',
  ],
  3: [
    'I\'ve been trying to reach you about your car\'s extended warranty.',
    'In my defense, nobody told me the goat was load-bearing.',
    'I, for one, welcome our new robot overlords.',
    'My therapist says I should stop referring to my coworkers as NPCs.',
    'I didn\'t choose the thug life, and frankly the thug life made a poor choice too.',
    'The simulation is glitching again. I can see the code. It\'s mostly spaghetti.',
    'I have achieved a state of pure chaos, and I have never felt more alive.',
    'According to my cat, I serve no useful purpose. And honestly, valid.',
    'I have been awake for thirty-six hours and I can taste sounds.',
    'Reality is subjective. But my reality specifically is a dumpster fire. Objectively.',
    'If anyone needs me, I\'ll be having an existential crisis in the bathroom.',
    'I don\'t believe in Mondays. Not philosophically. I refuse to acknowledge them.',
    'I just googled my symptoms and apparently I\'ve been dead since 2019.',
    'Dear future self: I am so sorry. But also, you should have seen this coming.',
    'I am not running late. Time is running early. Check your clocks.',
    'I have gazed into the void and the void said "new phone, who dis?"',
    'My sleep paralysis demon left me a performance review. Three stars. Fair.',
    'I sold my soul for WiFi. Worth it? Debatable. But the connection is strong.',
    'Gravity is a social construct and I have chosen to opt out. Watch this.',
    'The voices in my head have started a podcast. It\'s actually pretty good.',
    'I have decided that I am a main character. Everyone else is an extra. Sorry not sorry.',
    'Today\'s mood is brought to you by unread emails and existential dread.',
    'I am simultaneously the hero and the villain of my own story. It\'s complicated.',
    'My autobiography will be titled "What Were You Thinking?" and it will be very short.',
    'I just had a staring contest with a pigeon and I lost. I lost BADLY.',
  ],
};

export class AccentRouletteGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'accent-roulette',
      name: 'Accent Roulette',
      rounds: 4,
      submissionTime: 60,
      votingTime: 30,
      minPlayers: 3,
      maxPlayers: 8,
    });
    this.usedCombos = new Set();
  }

  async generatePrompt() {
    const accent = ACCENTS[Math.floor(Math.random() * ACCENTS.length)];
    const pool = LINES[this.spiceLevel] || LINES[2];
    const line = pool[Math.floor(Math.random() * pool.length)];

    return {
      accent,
      line,
      type: 'accent',
      instruction: `Say this line in a ${accent} accent! 🎭`,
    };
  }

  validateSubmission(submission) {
    if (!submission) return { error: 'Record your accent!' };
    if (typeof submission === 'object' && submission.audio) {
      return { data: { audio: submission.audio, mimeType: submission.mimeType || 'audio/webm' } };
    }
    return { data: { text: String(submission).trim().substring(0, 200), audio: null } };
  }

  async getAIScores() {
    for (const [socketId, sub] of this.submissions) {
      try {
        if (sub.audio) {
          const analysis = await analyzeAudio(sub.audio, sub.mimeType || 'audio/webm',
            `Rate this accent performance 0-500. They were supposed to say "${this.currentPrompt?.line}" in a ${this.currentPrompt?.accent} accent. Judge on: accent accuracy, commitment, entertainment value. Return ONLY JSON: {"score": <0-500>, "comment": "<text>"}`
          );
          const result = parseBellBotJSON(analysis);
          this.aiScores.set(socketId, { score: Math.max(0, Math.min(500, result.score || 250)), comment: result.comment || '' });
          continue;
        }
      } catch { /* fallback */ }
      this.aiScores.set(socketId, { score: 150, comment: 'Text-only — we need to HEAR that accent! 🎤' });
    }
  }

  getDefaultSubmission() { return { text: '[No performance]', audio: null }; }
  getSubmissionText(sub) { return sub.text || '[Audio Performance]'; }
}
