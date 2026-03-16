// Caption This — Players write funny captions for pre-generated images
import { BaseGame } from '../../base-game.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR = path.resolve(__dirname, '../../../client/public/images/caption-this');

// Build pool of pre-generated images keyed by spice level
// Files are named caption-s{spice}-{nn}.png
function loadImagePool() {
  const pool = { 1: [], 2: [], 3: [] };
  if (!fs.existsSync(IMG_DIR)) return pool;
  for (const file of fs.readdirSync(IMG_DIR)) {
    const m = file.match(/^caption-s(\d)-\d+\.png$/);
    if (m) pool[parseInt(m[1])]?.push(file);
  }
  return pool;
}

const imagePool = loadImagePool();

const CAPTION_PROMPTS = {
  1: [
    'A cat wearing a tiny business suit giving a PowerPoint presentation',
    'A dog driving a shopping cart through a grocery store',
    'Two squirrels having an intense chess match in the park',
    'A penguin trying to hail a taxi in New York City',
    'A goldfish looking judgmentally at its owner through the bowl',
    'A raccoon caught red-handed raiding a fancy restaurant kitchen',
    'A duck leading a line of ducklings across a busy highway',
    'An octopus trying to play eight musical instruments at once',
    'A hamster running a Fortune 500 company board meeting',
    'A parrot being interrogated by police as the only witness',
    'A sloth arriving fashionably late to its own birthday party',
    'An elephant trying to hide behind a tiny lamppost',
    'A group of meerkats watching a nature documentary about humans',
    'A cow accidentally walking into a leather goods store',
    'A pigeon filing its taxes at the last minute',
    'A squirrel wearing a tiny superhero cape tries to rescue a cat stuck in a bird feeder',
    'A group of grandmas attempting synchronized swimming in a kiddie pool',
    'A competitive eating contest where all contestants are adorable puppies',
    'A majestic deer wearing reading glasses studying a map upside down in the forest',
    'A tiny robot vacuum surrounded by garden gnomes negotiating a peace treaty',
    'An entire family of geese crossing a crosswalk holding tiny colorful umbrellas',
    'A giant inflatable T-Rex trying to parallel park a tiny Smart Car',
    'A determined snail training for a marathon wearing a miniature sweatband',
    'A very serious librarian shushing a boisterous kazoo orchestra',
    'A dog wearing a chef hat meticulously decorating a cupcake with a pastry bag',
    'A family of raccoons having a sophisticated picnic with tiny teacups',
    'A bewildered octopus trying to put on oversized mittens on all eight tentacles',
    'A flock of sheep wearing tiny sunglasses lounging on beach towels',
    'A tiny mouse conducting a full symphony orchestra of crickets in a moonlit field',
    'A grumpy owl wearing a tiny bowler hat reading a newspaper upside down',
    'A very tall giraffe struggling to fit into a tiny elevator',
  ],
  2: [
    'A man in a suit running through an airport holding a rubber chicken',
    'Two people arguing over a shopping cart with one item in it',
    'A woman taking a selfie with a completely uninterested llama',
    'Someone sitting in a bathtub fully clothed eating cereal',
    'A group of people in business attire having a meeting on a playground',
    'A stern health inspector questioning a shady hot dog vendor',
    'An adult trying to explain blockchain to their confused grandma over Zoom',
    'A disgruntled barista glaring at a customer ordering a ridiculously complex drink',
    'Two ex-lovers accidentally meeting at a costume party dressed as the same character',
    'A person trying to sneak artisanal pickles into a black-tie wedding',
    'A professional clown being audited by the IRS for joy expenses',
    'Someone desperately assembling IKEA furniture at 2am with a single Allen wrench',
    'A conspiracy theorist explaining their latest discovery to uninterested pigeons',
    'An influencer falling into a decorative fountain while taking a candid selfie',
    'A group of parents pretending to enjoy a terrible birthday party magician',
    'A stressed person baking a complicated dessert while the kitchen slowly catches fire',
    'Co-workers stuck in an elevator silently judging the person who ate tuna',
    'A person receiving a stern lecture from a houseplant that grew sentient overnight',
    'Someone hiding a massive hangover during an important work presentation',
    'A confused person trying to use a rotary phone for the first time',
    'A tech bro explaining a startup idea to elderly knitting enthusiasts',
    'A person attempting a serious conversation with a judgmental cat',
    'A highly sophisticated AI robot awkwardly flirting with an unimpressed bartender',
    'A dog walker tangled in leashes being dragged by twelve different breeds',
    'Two neighbors passive-aggressively mowing their lawns at each other',
  ],
  3: [
    'A person in a dinosaur costume at a job interview',
    'Someone aggressively reading the terms and conditions',
    'A group of cats surrounding a lone cucumber in a summoning circle',
    'A person presenting a PowerPoint to their houseplants',
    'Two mannequins positioned like they are breaking up at a restaurant',
    'A sentient toaster having an existential crisis while burning toast',
    'A flock of flamingos in a biker gang cruising on miniature chrome unicycles',
    'An interdimensional potato explaining quantum physics to a garden gnome',
    'A person made entirely of spaghetti competing in a limbo contest',
    'A black hole opening in a suburban living room as a lone sock drifts into it',
    'The moon landing gently on a backyard trampoline while an alien reads a newspaper',
    'A whale wearing roller skates performing a ballet routine on a frozen lake',
    'A portal to a cheese dimension slowly devouring classic literature in a library',
    'A grumpy unicorn attempting to file its taxes frustrated by the lack of deductions',
    'A city street where all cars are giant motorized rubber ducks quacking in traffic',
    'A time-traveling disco ball landing in ancient Egypt among breakdancing mummies',
    'A person juggling small black holes hoping not to create a singularity',
    'A sentient puddle of water attempting to buy real estate from a confused agent',
    'A colony of intelligent ants building a tiny replica of the Eiffel Tower from sugar cubes',
    'A person who swapped brains with a houseplant communicating via photosynthesis',
    'A giant psychedelic mushroom hosting a late-night talk show with woodland creatures',
    'Synchronized swimming flamingos wearing tiny sombreros performing in a bowl of guacamole',
    'A group of sentient bananas escaping a grocery store disguised as zucchini',
    'An orchestra of housecats playing a complex symphony using their tails as bows',
    'A cloud factory worker crafting cumulonimbus clouds into celebrity head shapes',
  ],
};

// Spice algorithm: Level 1=[1], Level 2=[1,2], Level 3=[2,3]
function getSpiceLevels(level) {
  if (level === 1) return [1];
  if (level === 2) return [1, 2];
  return [2, 3];
}

export class CaptionThisGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'caption-this',
      name: 'Artificial Insult-igence',
      rounds: 4,
      submissionTime: 45,
      votingTime: 30,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.usedImages = new Set();
  }

  async generatePrompt() {
    // Build available pool based on spice level
    const levels = getSpiceLevels(this.spiceLevel || 2);
    const available = levels.flatMap(lvl => imagePool[lvl] || [])
      .filter(f => !this.usedImages.has(f));

    // If exhausted, reset tracking
    const pool = available.length > 0 ? available
      : levels.flatMap(lvl => imagePool[lvl] || []);

    if (pool.length > 0) {
      const file = pool[Math.floor(Math.random() * pool.length)];
      this.usedImages.add(file);
      console.log(`[CaptionThis] Using pre-generated image: ${file}`);
      return {
        text: 'Caption this!',
        instruction: 'Caption this!',
        imageUrl: `/images/caption-this/${file}`,
        type: 'caption',
      };
    }

    // Fallback: text-only prompt (no images on disk)
    const tier = CAPTION_PROMPTS[this.spiceLevel] || CAPTION_PROMPTS[1];
    const unusedPrompts = tier.filter(p => !this.usedImages.has(p));
    const fallback = unusedPrompts.length > 0 ? unusedPrompts : tier;
    const sceneDesc = fallback[Math.floor(Math.random() * fallback.length)];
    this.usedImages.add(sceneDesc);
    console.log(`[CaptionThis] No images available, using text fallback`);
    return { text: sceneDesc, instruction: 'Caption this!', type: 'caption' };
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 200);
    if (!text) return { error: 'Write a caption!' };
    return { data: text };
  }

  getDefaultSubmission() { return '...'; }
  getSubmissionText(sub) { return sub; }
}
