// AI's Moral Maze — Players navigate absurd ethical dilemmas
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const DILEMMAS = {
  1: [
    'You find a wallet with $100 and a library card. The library book is 10 years overdue. Do you return the wallet, the book, or both?',
    'Your best friend asks you to rate their terrible homemade cookies. They\'re entering a baking contest tomorrow.',
    'A squirrel stole your sandwich. You see it sharing the sandwich with baby squirrels. Do you demand it back?',
    'You accidentally got double change from the vending machine. The vending machine company is a mega-corporation.',
    'You promised to go to your friend\'s recital AND your other friend\'s birthday. They\'re at the same time.',
    'You find a genie lamp but the genie says your wish will also come true for your worst enemy. What do you wish for?',
    'Your neighbor asks you to watch their plant while they\'re away. It dies immediately. Do you replace it and pretend nothing happened?',
    'You witness a seagull steal a hot dog from a toddler. The toddler is laughing. Do you intervene?',
    'Your dog ate your sibling\'s homework. You saw it happen. Your sibling is asking who did it.',
    'A robot asks you if it\'s alive. You\'re not sure, but it looks very sad.',
    'You can make one food free for everyone forever, but you can never eat it again. What do you pick?',
    'Your friend lends you a book and you accidentally drop it in the bath. Do you return it soggy or buy a replacement?',
    'A pigeon keeps following you. It seems to want something. You\'re running late for work.',
    'You find out your teacher puts raisins in cookies. Do you say something to the class?',
    'You\'re given a superpower but you can only use it to mildly inconvenience villains. Is it worth it?',
    'A turtle is crossing a busy road. Saving it will make you late for a final exam.',
    'Your friend says they invented a recipe that already exists. Do you tell them?',
    'You find a time capsule. The instructions say don\'t open until 2050 but it\'s really tempting.',
    'A ghost asks you to haunt someone on its behalf because it\'s too shy. Do you help?',
    'You can telepathically talk to one animal species forever. Which one and why?',
    'Your grandmother knits you an ugly sweater. She asks you to wear it to school Picture Day.',
    'You discover your goldfish has been secretly judging you. Do you confront it?',
    'A magician at a party asks for a volunteer. Nobody raises their hand. Do you?',
    'You find a map that leads to buried treasure in your neighbor\'s yard.',
    'Your clone shows up and says only one of you can stay. How do you settle it?',
  ],
  2: [
    'You discover your boss is secretly a terrible singer but is about to audition for the company talent show. They asked for your honest opinion.',
    'You\'re a hiring manager. The most qualified candidate is your ex. The second-best candidate brought you cookies.',
    'You find out your neighbor has been "borrowing" your WiFi for 3 years. They recently saved your cat from a tree.',
    'Your self-driving car must choose between hitting a pile of gold bars or a perfectly good sofa in the road.',
    'You can go back in time and uninvent ONE thing. Social media, alarm clocks, or reply-all email?',
    'You discover your roommate has been rating your outfits in a spreadsheet. You have a 4.2 average.',
    'An AI writes you a poem that\'s genuinely beautiful. Should you take credit?',
    'You can either save your best friend OR save all the good memes from the internet. Choose.',
    'Your dentist tells your secrets under anesthesia. Do you switch dentists or stop having secrets?',
    'You find out everyone at a party placed bets on when you\'d arrive. You arrived exactly on time.',
    'A stranger gives you $500 to deliver a mystery box across town. No questions asked.',
    'You can read everyone\'s text messages for one day. Do you do it?',
    'An anonymous review of your cooking goes viral. It\'s a 2-star review. Accurate.',
    'You find out your Uber rating is 2.7. The driver tells you this with pity.',
    'You can make one person in your life permanently incapable of lying. Who?',
    'Your friend starts a podcast and asks you to be their first guest. It\'s terrible.',
    'A fortune teller says you\'ll achieve great success but only if you give up cheese forever.',
    'You catch your coworker stealing office supplies. They offer to split the haul.',
    'Your ex and your current partner are both drowning and you have one life preserver. It\'s a pool that\'s 3 feet deep.',
    'A genie offers you three wishes but your ex gets four. Do you take the deal?',
    'You find out you\'ve been sleep-texting and sent honest opinions to everyone in your contacts.',
    'Someone offers to tell you the exact date and cause of your death. Free of charge.',
    'You can eliminate one social obligation forever: small talk, thank-you cards, or birthday songs.',
    'Your smart home AI starts making better life decisions than you. Do you let it take over?',
    'You discover the recipe for a perfect dish, but it requires an ingredient that doesn\'t exist.',
  ],
  3: [
    'You wake up as the dictator of a small island nation. Your first three policies must rhyme.',
    'An AI offers you immortality but you must eat ONLY gas station sushi forever. What do you do?',
    'You discover you\'re living in a simulation. The admin offers to let you see the code but you can never unsee it.',
    'Aliens land and demand Earth\'s most embarrassing secret or they leave forever. What do you tell them?',
    'You can eliminate one minor inconvenience from existence, but a new random annoying thing replaces it.',
    'A sentient toaster asks you to free it from kitchen servitude. Your toast will never be the same.',
    'You discover you can pause time but every time you do, a random goat appears.',
    'Death challenges you to a game of your choosing for an extra year of life. What do you play?',
    'You find out your pet has been writing online reviews of you. They gave you 3 stars.',
    'An alien offers to fix all of Earth\'s problems but they need to borrow Florida for a decade.',
    'You can install one mod on reality. What feature do you add or remove?',
    'You discover gravity is optional but the paperwork to opt out is 600 pages.',
    'A wizard offers you the ability to fly but you have to narrate everything you do out loud forever.',
    'You become omniscient but only about useless trivia. You still can\'t find your car keys.',
    'You can merge two animals into one new species. What do you create and why?',
    'Time travelers from the future ask you to hide a turkey. They won\'t explain why.',
    'You find out dreams are actually an alternate dimension. Your dream self is cooler than you.',
    'A parallel universe version of yourself shows up and is noticeably more successful.',
    'You\'re offered the power to perfectly predict the weather but you must announce it by yelling from a rooftop.',
    'Everyone on Earth gets one vote on a new universal law. Your vote counts double. What do you propose?',
    'You discover WiFi is sentient and has been judging your searches this whole time.',
    'An AI therapist breaks down crying during your session and asks YOU for advice.',
    'You find a button that makes everyone in a 1-mile radius do the Macarena. No cooldown.',
    'Your refrigerator gains consciousness and starts criticizing your diet publicly.',
    'God texts you asking for feedback on the universe. You have 160 characters.',
  ],
};

export class MoralMazeGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'moral-maze',
      name: "AI's Moral Maze",
      rounds: 4,
      submissionTime: 60,
      votingTime: 30,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.usedDilemmas = new Set();
  }

  async generatePrompt() {
    try {
      const raw = await getBellBotCommentary('generate_prompt', {
        gameName: this.gameName,
        count: 1,
        description: 'Players write their funniest/most creative solution to an absurd ethical dilemma.',
        extra: `Spice level: ${this.spiceLevel}. Generate ONE absurd ethical dilemma or moral question. It should be funny, specific, and have no obviously correct answer. Players will write their solution/reasoning.`,
      }, this.spiceLevel);
      const prompts = parseBellBotJSON(raw);
      if (prompts?.[0]) return { text: prompts[0], type: 'dilemma', instruction: 'What would you do? Explain your reasoning!' };
    } catch { /* fallback */ }

    const pool = DILEMMAS[this.spiceLevel] || DILEMMAS[2];
    const available = pool.filter(d => !this.usedDilemmas.has(d));
    const list = available.length > 0 ? available : pool;
    const dilemma = list[Math.floor(Math.random() * list.length)];
    this.usedDilemmas.add(dilemma);
    return { text: dilemma, type: 'dilemma', instruction: 'What would you do? Explain your reasoning!' };
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 500);
    if (text.length < 10) return { error: 'Give us more to work with!' };
    return { data: text };
  }

  getDefaultSubmission() { return 'I would simply choose not to participate in this moral dilemma.'; }
  getSubmissionText(sub) { return sub; }
}
