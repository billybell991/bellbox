// Hot Take Tribunal — Players defend absurd hot takes, others judge
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const HOT_TAKES = {
  1: [ // Family
    'Cereal is a soup',
    'A hot dog is a sandwich',
    'Water is the best drink ever invented',
    'Homework should be optional',
    'Cats are better than dogs',
    'Pizza is better cold',
    'Mondays are actually great',
    'Brushing teeth is the most important activity',
    'Rain is better than sunshine',
    'Board games are better than video games',
    'Socks with sandals look amazing',
    'Breakfast for dinner is the best meal',
    'Pineapple on pizza is an absolute culinary masterpiece',
    'Summer is vastly overrated; autumn is the superior season',
    'The crust is the best part of any pizza',
    'Reading the book is never as good as watching the movie',
    'Going to bed early on a Friday night is peak entertainment',
    'Butterflies are actually creepy insects, not beautiful',
    'Hot dogs are technically sandwiches',
    'The best way to eat a cookie is to dunk it in water',
    'The smell of gasoline is actually quite pleasant',
    'Calling someone on the phone is always better than texting',
    'All video games should have an easy mode, no exceptions',
    'Sparkling water is just spicy tap water',
    'Using emojis in professional emails is good communication',
    'Rainy days are superior to sunny days for every activity',
    'Long car rides are actually relaxing and fun',
    'Leaving dirty dishes overnight makes them easier to clean',
    'Ketchup should always be refrigerated even before opening',
    'Ice cubes in red wine is perfectly acceptable',
  ],
  2: [ // Spicy
    'Pineapple belongs on pizza and this hill is worth dying on',
    'Working from home is just napping with notifications on',
    'Social media has made the world a worse place',
    'Nobody actually likes jazz — they just pretend to',
    'College degrees are mostly expensive pieces of paper',
    'Most influencers have zero actual influence',
    'Reality TV is more honest than the news',
    'The customer is almost never right',
    'Brunch is just expensive breakfast with day drinking',
    'People who say "I don\'t watch TV" are the worst',
    'Ghosting someone after a few dates is totally valid and efficient',
    'Being perpetually late is a power move, not a rude habit',
    'Re-gifting presents is an environmentally conscious act',
    'Dating apps have made dating objectively worse',
    'Everyone should be required to work retail for at least one year',
    'It\'s better to be feared than loved, especially at work',
    'People who post endless vacation photos are inherently less interesting',
    'Calling out a bad singer at karaoke makes it more authentic',
    'Social media influencing is a parasitic profession',
    'Wearing sweatpants to a fancy restaurant should be encouraged',
    'You should judge a book by its cover and people by their profiles',
    'The person who suggests group activities should always pay',
    'All art created before the 20th century is largely irrelevant',
    'Monogamy is an outdated social construct',
    'Asking coworkers about politics on day one is crucial for office cohesion',
    'Lying about your age on dating apps is strategy, not deception',
    'It\'s always okay to eavesdrop on private conversations in public',
    'Paying for a streaming service for one show is a complete waste',
  ],
  3: [ // Unhinged
    'Sleep is a government conspiracy to keep us unproductive',
    'Birds are definitely surveillance drones',
    'The person who invented alarm clocks is history\'s greatest villain',
    'Pants are an outdated social construct',
    'We should replace all world leaders with golden retrievers',
    'Gravity is just a suggestion',
    'The alphabet is in the wrong order and someone needs to fix it',
    'The ocean is just outdoor soup',
    'Time is a flat circle and Tuesdays don\'t exist',
    'Humans peaked as a species when we invented cheese',
    'We should replace traffic lights with interpretive dance routines by squirrels',
    'The moon is clearly made of green cheese and we need a culinary expedition',
    'All babies should wear tiny bowler hats until they can walk',
    'Pigeons are government surveillance drones cooing encrypted data',
    'Eyebrows exist to collect errant thoughts before they escape the brain',
    'Time travel exists but only sentient houseplants can access it',
    'Our universe is a single cell in a cosmic giant\'s fingernail',
    'The only true currency should be shiny pebbles and meaningful glances',
    'All historical events were orchestrated by artisan cheese makers',
    'We should communicate exclusively through interpretive dance and clicks',
    'The only ethical way to eat a banana is to peel it with your feet',
    'Mathematics is purely subjective and 2+2 can be anything',
    'Squirrels are plotting a global takeover using acorns as weapons',
    'All national anthems should be kazoo ensembles playing Flight of the Bumblebee',
    'We are all living in a simulation run by a bored cosmic intern',
    'Clouds are actually giant fluffy alien spaceships observing humanity',
    'Your brain is just a very confused and caffeinated ham sandwich',
    'The world would be better if everyone wore mismatched socks daily',
  ],
};

export class HotTakeTribunalGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'hot-take-tribunal',
      name: 'Hot Take Tribunal',
      rounds: 4,
      submissionTime: 60,
      votingTime: 30,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.usedTakes = new Set();
  }

  async generatePrompt() {
    try {
      const raw = await getBellBotCommentary('generate_prompt', {
        gameName: this.gameName,
        count: 1,
        description: 'Players must write the most persuasive defense of an absurd hot take.',
        extra: `Spice level: ${this.spiceLevel}. Generate ONE controversial/absurd hot take statement. Players will argue FOR this take. Make it debatable and funny.`,
      }, this.spiceLevel);
      const prompts = parseBellBotJSON(raw);
      if (prompts?.[0]) return { text: prompts[0], type: 'hot-take' };
    } catch { /* fallback */ }

    const pool = HOT_TAKES[this.spiceLevel] || HOT_TAKES[2];
    const available = pool.filter(t => !this.usedTakes.has(t));
    const list = available.length > 0 ? available : pool;
    const take = list[Math.floor(Math.random() * list.length)];
    this.usedTakes.add(take);
    return { text: take, type: 'hot-take', instruction: 'Write your most persuasive defense of this hot take!' };
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 500);
    if (text.length < 10) return { error: 'Write at least a sentence!' };
    return { data: text };
  }

  getDefaultSubmission() { return 'I have no defense. I plead the fifth.'; }
  getSubmissionText(sub) { return sub; }
}
