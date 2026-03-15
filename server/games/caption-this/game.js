// Caption This — Players write funny captions for AI-generated images
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';
import { generateImage } from '../trivia-fetch/imagen.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    this.usedPrompts = new Set();
  }

  async generatePrompt() {
    // Pick a scene description (AI or fallback)
    let sceneDesc;
    try {
      const raw = await getBellBotCommentary('generate_prompt', {
        gameName: this.gameName,
        count: 1,
        description: 'Players write funny captions for absurd image descriptions.',
        extra: `Spice level: ${this.spiceLevel}.${this.getTopicHint() ? ` Topic area: ${this.getTopicHint()}.` : ''} Generate ONE vivid, funny image description that players will write captions for. Make it visual and specific. Something you could imagine as a photo or painting.`,
      }, this.spiceLevel);
      const prompts = parseBellBotJSON(raw);
      if (prompts?.[0]) sceneDesc = prompts[0];
    } catch { /* fallback */ }

    if (!sceneDesc) {
      const tier = CAPTION_PROMPTS[this.spiceLevel] || CAPTION_PROMPTS[1];
      const available = tier.filter(p => !this.usedPrompts.has(p));
      const pool = available.length > 0 ? available : tier;
      sceneDesc = pool[Math.floor(Math.random() * pool.length)];
      this.usedPrompts.add(sceneDesc);
    }

    // Try to generate an image from the description
    try {
      const styles = [
        'A photorealistic image:',
        'A dramatic oil painting:',
        'A retro 1950s advertisement style image:',
        'A surveillance camera still frame:',
        'A nature documentary screenshot:',
        'A Renaissance painting:',
        'A funny cartoon illustration:',
        'A wacky stock photo:',
        'A dramatic movie poster scene:',
        'A vintage polaroid photo:',
        'A claymation scene:',
        'A pixel art scene:',
        'A watercolor painting:',
        'An action figure diorama:',
      ];
      const style = styles[Math.floor(Math.random() * styles.length)];
      const imagePrompt = `${style} ${sceneDesc}. Vivid detail, exaggerated expressions, no text or words anywhere in the image.`;
      const base64 = await generateImage(imagePrompt, '1:1');
      if (base64) {
        const imgDir = path.resolve(__dirname, '../../../client/public/images/caption-this');
        if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
        const filename = `round-${this.round}-${Date.now()}.png`;
        fs.writeFileSync(path.join(imgDir, filename), Buffer.from(base64, 'base64'));
        console.log(`[CaptionThis] Generated image: ${filename}`);
        return {
          text: 'Caption this image!',
          instruction: 'Write the funniest caption you can think of',
          imageUrl: `/images/caption-this/${filename}`,
          type: 'caption',
        };
      }
    } catch (err) {
      console.warn('[CaptionThis] Image generation failed, using text fallback:', err.message);
    }

    // Fallback: text-only prompt
    return { text: sceneDesc, instruction: 'Write a funny caption for this scene', type: 'caption' };
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 200);
    if (!text) return { error: 'Write a caption!' };
    return { data: text };
  }

  getDefaultSubmission() { return '...'; }
  getSubmissionText(sub) { return sub; }
}
