// Sketchy Context — Players describe what's "really" happening in an out-of-context scene
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const SCENES = {
  1: [
    'A group of penguins standing in a perfect circle looking at the ground',
    'A cat sitting on a keyboard in front of spreadsheets',
    'Two dogs staring intensely at each other across a park bench',
    'A baby holding a phone upside down with a serious expression',
    'A squirrel frozen mid-jump between two tree branches',
    'A goose standing in the middle of a parking lot staring at one specific car',
    'A group of ducks in a row following a confused-looking cat',
    'A horse looking through a drive-thru window',
    'A seagull standing on a trash can looking out at the ocean thoughtfully',
    'A line of ants walking around a penny as if admiring it',
    'A turtle on top of a fence post just vibing',
    'A golden retriever holding a briefcase waiting at a bus stop',
    'Three crows sitting on a bench like they\'re waiting for a friend',
    'A rabbit sitting inside a top hat looking disappointed',
    'A cow standing on one side of a see-saw',
    'A pigeon riding the subway holding onto the pole with its feet',
    'A lizard doing pushups on a hot sidewalk',
    'A group of chipmunks gathered around a tiny campfire (a lit match)',
    'An owl wearing reading glasses sitting on a stack of books',
    'A frog sitting on a lily pad holding a tiny umbrella in the rain',
    'A parrot perched on a "no loitering" sign',
    'Two cats on opposite sides of a glass door making dramatic eye contact',
    'A dog lying in a human bed with the covers pulled up watching TV',
    'A spider sitting next to a "welcome" web it clearly just built',
    'A hedgehog curled up in a shoe like it\'s a sleeping bag',
  ],
  2: [
    'A man in a suit running through an airport holding a rubber chicken',
    'Two people arguing over a shopping cart with one item in it',
    'A woman taking a selfie with a completely uninterested llama',
    'Someone sitting in a bathtub fully clothed eating cereal',
    'A group of people in business attire having a meeting on a playground',
    'Someone crying in a parked car in a McDonald\'s parking lot',
    'A person wrapping a gift at 2 AM surrounded by empty energy drink cans',
    'Someone taking a photo of their sad office lunch like it\'s fine dining',
    'A person sleeping on a yoga mat at the office pretending it\'s exercise',
    'Two neighbors passive-aggressively mowing their lawns at the same time',
    'Someone eating cake directly from the container in the fridge with the door open',
    'A person walking a cat on a leash and the cat has fully stopped and refuses to move',
    'Someone in a meeting clearly shopping online with their laptop tilted away',
    'A person at a restaurant photographing their entrée from 15 different angles',
    'Someone carrying a mattress on top of a car with only one hand holding it',
    'A couple at a restaurant both on their phones not talking to each other',
    'A person returning a shopping cart to the corral in the rain looking like a hero',
    'Someone microwaving fish in an office break room while making eye contact with a coworker',
    'A person in a Zoom meeting clearly not wearing pants below their laptop camera',
    'Someone grocery shopping with an insanely detailed spreadsheet on their phone',
    'A parent pushing a stroller while also walking two dogs and texting',
    'Someone at a gym taking a selfie but clearly hasn\'t worked out',
    'A person eating a slice of pizza while walking in the rain with no umbrella',
    'Someone at a coffee shop with 6 empty cups and bloodshot eyes still working',
    'A person at an airport gate eating spaghetti out of a Tupperware container',
  ],
  3: [
    'A person in a dinosaur costume at a job interview',
    'Someone aggressively reading the terms and conditions',
    'A group of cats surrounding a lone cucumber in a summoning circle formation',
    'A person presenting a PowerPoint to their houseplants',
    'Two mannequins positioned like they\'re breaking up at a restaurant',
    'A person wearing a tinfoil hat watering their garden at 3 AM',
    'A roomba with a knife taped to it trapped in a corner',
    'A crow perched on a security camera looking directly into it',
    'Someone having an argument with a self-checkout machine',
    'A person reading a book titled "How to Be Normal" in a very abnormal way',
    'A group of pigeons arranged in a military formation on a rooftop',
    'Someone crying while parallel parking as a crowd watches',
    'A person in a horse mask grocery shopping as if nothing is unusual',
    'A roomba that has clearly gone rogue covered in yarn and glitter',
    'Two statues that somehow look like they\'re gossiping about a third statue',
    'A person dramatically pointing at a "wet floor" sign',
    'Someone sleeping in a hammock suspended between two shopping carts',
    'A collection of lost gloves arranged on a fence like a tiny protest march',
    'A printer with a handwritten apology note taped to it',
    'Someone having a therapy session with a cardboard cutout of Keanu Reeves',
    'A person jogging but clearly not having a good time wearing a full suit',
    'A vending machine with a "out of order" sign but someone is still trying',
    'A squirrel on a park bench eating a full slice of pizza like a person',
    'Someone giving a motivational speech to their reflection in an elevator',
    'A traffic cone wearing sunglasses placed on top of a statue\s head',
  ],
};

export class SketchyContextGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'sketchy-context',
      name: 'Sketchy Context',
      rounds: 4,
      submissionTime: 45,
      votingTime: 30,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.usedScenes = new Set();
  }

  async generatePrompt() {
    try {
      const raw = await getBellBotCommentary('generate_prompt', {
        gameName: this.gameName,
        count: 1,
        description: 'Players explain what\'s REALLY happening in an absurd out-of-context scene description. The most creative/funny explanation wins.',
        extra: `Spice level: ${this.spiceLevel}. Generate ONE vivid description of an absurd, out-of-context scene (what you might see in a weird stock photo). Players will write what's "really" happening.`,
      }, this.spiceLevel);
      const prompts = parseBellBotJSON(raw);
      if (prompts?.[0]) return { text: prompts[0], type: 'scene', instruction: 'What\'s REALLY happening here? Give us context! 🔍' };
    } catch { /* fallback */ }

    const pool = SCENES[this.spiceLevel] || SCENES[2];
    const available = pool.filter(s => !this.usedScenes.has(s));
    const list = available.length > 0 ? available : pool;
    const scene = list[Math.floor(Math.random() * list.length)];
    this.usedScenes.add(scene);
    return { text: scene, type: 'scene', instruction: 'What\'s REALLY happening here? Give us context! 🔍' };
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 300);
    if (text.length < 10) return { error: 'Give us more context!' };
    return { data: text };
  }

  getDefaultSubmission() { return 'Nothing to see here, move along.'; }
  getSubmissionText(sub) { return sub; }
}
