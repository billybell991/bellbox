// Under the Bus — Players secretly assign blame, defend themselves
import { BaseGame, STATES } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const SCENARIOS = {
  1: [
    'The class pet escaped from its cage',
    'Someone ate the last donut that was being saved',
    'The science project exploded',
    'Someone left the fridge door open all night',
    'The team mascot costume is missing',
    'The art supplies were used to paint the school hallway',
    'The class goldfish bowl was found in the teacher\'s lounge',
    'Someone changed the school WiFi password to a meme',
    'The trophy case was found full of rubber ducks instead of trophies',
    'The cafeteria ran out of chocolate milk and someone is to blame',
    'The school bus took the wrong route and ended up at a water park',
    'Someone signed up the whole class for a talent show without asking',
    'The gym equipment was rearranged into a pillow fort overnight',
    'The fire alarm went off because someone microwaved a burrito for 20 minutes',
    'The teacher\'s desk drawers were taped shut with industrial-grade duct tape',
    'All the markers in the building dried out overnight and nobody knows how',
    'Someone taught the class parrot to say something inappropriate',
    'The library books are all in the wrong order — by COLOR instead of title',
    'The vending machine is dispensing nothing but grape soda regardless of button pressed',
    'The field trip permission slips were "accidentally" shredded',
    'The school clock is 20 minutes fast and nobody noticed for a week',
    'Someone left the sprinklers on all weekend and flooded the soccer field',
    'The classroom hamster has built an elaborate tunnel system through the wall',
    'The playground slide was mysteriously coated in cooking oil',
    'All the chairs in the cafeteria were replaced with bean bags overnight',
  ],
  2: [
    'The client presentation crashed mid-demo',
    'Someone "reply-all"d the company-wide gossip email',
    'The office coffee machine is absolutely destroyed',
    'The quarterly budget is missing $50,000 worth of "miscellaneous"',
    'Someone uploaded a meme as the company logo and it went live',
    'The boss\'s parking spot was mysteriously filled with traffic cones',
    'Someone left an anonymous passive-aggressive note on the fridge. In Comic Sans.',
    'The company retreat reservation was accidentally canceled and rebooked at a kids\' birthday venue',
    'Someone ate the CEO\'s labeled lunch and the security cameras were "coincidentally" down',
    'The office thermostat was changed and now it\'s a hostile work environment — literally freezing',
    'The company social media account posted a draft tweet that says just "ugh"',
    'Someone used the corporate credit card at a place called "Mystery Dungeon"',
    'The printer has been printing "help me" repeatedly and IT can\'t explain why',
    'The team Slack channel was renamed to something HR wouldn\'t approve of',
    'Someone signed the whole department up for a 6 AM CrossFit class',
    'The office plants are all dead and the replacement plants are plastic — nobody has noticed',
    'Someone "fixed" the microwave and now it only works at maximum power',
    'The projector in the conference room is stuck displaying someone\'s desktop wallpaper — it\'s a cat in a tuxedo',
    'The fire extinguisher was used at the office party and not for a fire',
    'Someone started a rumor that there\'s a ghost in the supply closet and people are calling in sick',
    'The elevator has been playing someone\'s personal Spotify playlist at full volume',
    'The quarterly report was sent with lorem ipsum instead of actual data',
    'Someone moved all the desks 2 inches to the left and is waiting for people to notice',
    'The company newsletter accidentally included someone\'s resignation letter draft',
    'The break room toilet is clogged and it happened during the executive meeting',
  ],
  3: [
    'The server room is on fire and nobody knows who had the last login',
    'Someone leaked the CEO\'s browser history to the entire company',
    'The AI assistant has been sending passive-aggressive emails on someone\'s behalf',
    'Someone used the company credit card for a "team building exercise" in Vegas',
    'The emergency exit was superglued shut and someone\'s taking credit',
    'The company AI chatbot became sentient and started filing HR complaints against management',
    'Someone replaced all the water cooler water with energy drinks and nobody slept for 3 days',
    'The backup generator was stolen and replaced with a hamster wheel — it almost worked',
    'Someone enrolled the CEO in a competitive reality show under a fake name',
    'The office surveillance system was hacked to play nothing but cat videos',
    'Someone donated the entire office furniture collection to charity over the weekend',
    'The company\'s customer service AI has started providing emotional support instead of technical help',
    'Someone reprogrammed the smart office to play "It\'s Not Unusual" every time the door opens',
    'The annual budget was accidentally transferred to an account named "Moon Base Alpha"',
    'Someone created a fake company newsletter predicting everyone\'s future — and it\'s weirdly accurate',
    'The intern accidentally had admin access for 6 months and nobody noticed until the logo changed to a dinosaur',
    'The building\'s AI climate system has developed preferences and makes some offices tropical and others arctic',
    'Someone submitted a patent for the company\'s product under their dog\'s name',
    'The break room microwave achieved sentience and is refusing to heat anything below 5 stars on DoorDash',
    'The office supply closet has been converted into someone\'s secret bedroom and there are reviews on Airbnb',
    'Someone trained the office chatbot to only respond in haiku',
    'The quarterly presentation was replaced with a slideshow of everyone\'s worst LinkedIn photos',
    'The building\'s evacuation plan was rewritten to include a \'vibe check\' at every exit',
    'Someone released a press release announcing the company is pivoting to artisanal mayo',
    'The company website was redirected to someone\'s personal blog about conspiracy theories',
  ],
};

export class UnderTheBusGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'under-the-bus',
      name: 'Under the Bus',
      rounds: 4,
      submissionTime: 45,
      votingTime: 30,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.usedScenarios = new Set();
  }

  async generatePrompt() {
    try {
      const raw = await getBellBotCommentary('generate_prompt', {
        gameName: this.gameName,
        count: 1,
        description: 'Something went wrong and everyone needs someone to blame. Players write their alibi/excuse explaining why it WASN\'T them and who they think did it.',
        extra: `Spice level: ${this.spiceLevel}.${this.getTopicHint() ? ` Topic area: ${this.getTopicHint()}.` : ''} Generate ONE workplace/social disaster scenario. Something went wrong and needs a scapegoat.`,
      }, this.spiceLevel);
      const prompts = parseBellBotJSON(raw);
      if (prompts?.[0]) return { text: prompts[0], type: 'blame', instruction: 'Write your alibi! Why wasn\'t it you? Who do you blame? 🚌' };
    } catch { /* fallback */ }

    const pool = SCENARIOS[this.spiceLevel] || SCENARIOS[2];
    const available = pool.filter(s => !this.usedScenarios.has(s));
    const list = available.length > 0 ? available : pool;
    const scenario = list[Math.floor(Math.random() * list.length)];
    this.usedScenarios.add(scenario);
    return { text: scenario, type: 'blame', instruction: 'Write your alibi! Why wasn\'t it you? 🚌' };
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 500);
    if (text.length < 10) return { error: 'That alibi is way too short!' };
    return { data: text };
  }

  getDefaultSubmission() { return 'I was literally nowhere near the scene. I have witnesses. Probably.'; }
  getSubmissionText(sub) { return sub; }
}
