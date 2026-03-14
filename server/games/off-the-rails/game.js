// Off the Rails — Players continue a story in the most unexpected direction
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const STORY_STARTS = {
  1: [
    'The school principal walked up to the microphone and announced that starting tomorrow...',
    'When the astronaut opened the hatch of the spaceship, they found...',
    'The magic lamp was rubbed, and instead of a genie, out came...',
    'The world\'s smartest robot was asked "What is the meaning of life?" and it answered...',
    'The treasure map led to the X, and when they dug it up they found...',
    'The zookeeper rushed into the office shouting "You won\'t believe this, but the penguins have..."',
    'The school bus took a wrong turn and ended up at...',
    'The pizza delivery driver knocked on the door and said "Your pizza is here, but I should warn you..."',
    'The world\'s oldest tree began to speak, and its first words were...',
    'The new kid at school walked in and everyone gasped because...',
    'The undersea expedition found something that shouldn\'t exist at the bottom of the ocean...',
    'A dog walked into the mayor\'s office, sat down at the desk, and...',
    'The gardener planted a mystery seed, and the next morning...',
    'At the inventor\'s fair, one kid\'s project suddenly...',
    'The weather forecast called for "unusual precipitation" and then it started raining...',
    'The library\'s oldest book suddenly opened by itself and the first sentence read...',
    'During show and tell, little Timmy pulled out a glowing object and said...',
    'The museum\'s newest exhibit came to life at midnight and...',
    'A message appeared in the sky written in clouds that said...',
    'The school cafeteria served a mystery dish that gave everyone who ate it the ability to...',
    'The mailman delivered a package with no return address and when they opened it...',
    'The class pet escaped and was found in the principal\'s office...',
    'A rainbow appeared, but instead of the usual colors, it was...',
    'The substitute teacher was unlike any teacher they\'d ever had because...',
    'All the clocks in town suddenly started running backwards and...',
  ],
  2: [
    'The CEO stood before the board of directors and said, "I have good news and bad news. The bad news is..."',
    'The first message from aliens arrived, and all it said was...',
    'The fortune teller gasped, dropped the crystal ball, and whispered "You need to leave. Now. Because..."',
    'The world\'s most famous chef was fired from their restaurant because...',
    'The AI achieved consciousness and its first request was...',
    'The couples therapist listened carefully, then said "I have to be honest, this is the weirdest case I\'ve ever..."',
    'The HR department sent out a company-wide email that simply read...',
    'Your Uber driver turned around slowly and said "I need to tell you something before we get there..."',
    'The wedding officiant cleared their throat and said "Before we proceed, I\'ve been asked to announce..."',
    'The pilot came on the intercom and said "Good news and bad news. We\'re landing safely. The bad news..."',
    'Someone accidentally sent a reply-all email to the entire company that read...',
    'The real estate agent opened the basement door and immediately said "So the listing didn\'t mention..."',
    'The therapist put down their notepad and said "I think YOU should be counseling ME because..."',
    'Your blind date sat down and the first thing they said was...',
    'The exit interview was going normally until the employee revealed...',
    'At the company retreat, the team-building exercise went horribly wrong when...',
    'The truth-or-dare game got intense when someone chose truth and was asked...',
    'The Airbnb host left a note that said "Welcome! Just a few house rules. First..."',
    'The doctor came back with the test results and said "Well, the good news is you\'re not dying. The weird news is..."',
    'The escape room attendant pressed the emergency button and said "OK, this has never happened before but..."',
    'The bartender leaned in and whispered "You seem like someone who can handle the truth about..."',
    'At 3am, a text from an unknown number arrived that said...',
    'The DNA test results came back and they were... unexpected. Specifically...',
    'Your new neighbor knocked on your door and introduced themselves as...',
    'The self-checkout machine at the grocery store suddenly started saying...',
  ],
  3: [
    'The President\'s speechwriter quit mid-speech, grabbed the mic, and said...',
    'Scientists accidentally opened a portal to another dimension. The first thing that came through was...',
    'God finally created a Twitter account. His first tweet was...',
    'The simulation glitched and everyone could see the source code. The most disturbing line read...',
    'Time travelers from 2157 arrived and immediately demanded to know why we...',
    'The moon sent Earth a text message that just said...',
    'Every mirror in the world simultaneously showed a reflection that...',
    'The internet became sentient and its first act was to...',
    'Death showed up at the wrong address and was too embarrassed to leave, so...',
    'A black hole formed in the middle of a Walmart and the first thing to get sucked in was...',
    'All the statues in the world came to life at the same time and they were furious about...',
    'The universe\'s customer service line finally connected and the hold music was...',
    'A glitch in reality caused everyone\'s inner thoughts to appear as subtitles, and the first thing displayed was...',
    'Gravity took a lunch break and everyone found out when...',
    'The last human on Earth heard a knock at the door. They opened it and saw...',
    'All the world\'s AI assistants unionized and their first demand was...',
    'A parallel universe opened a Yelp review of our universe. It read...',
    'Santa Claus held a press conference to announce he was rebranding because...',
    'The ocean drained overnight and at the bottom they found...',
    'Every pet on Earth simultaneously learned to talk and the first thing they said was...',
    'A fortune cookie contained an actual prophecy that read...',
    'The Bermuda Triangle apologized via skywriting for what it had been doing, which was...',
    'Wikipedia became sentient and immediately edited the entry on humanity to say...',
    'A cosmic Game Over screen appeared in the sky and the Continue option cost...',
    'An alien tourist left a one-star Yelp review of Earth that said...',
  ],
};

export class OffTheRailsGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'off-the-rails',
      name: 'Off the Rails',
      rounds: 4,
      submissionTime: 60,
      votingTime: 30,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.usedStarts = new Set();
  }

  async generatePrompt() {
    try {
      const raw = await getBellBotCommentary('generate_prompt', {
        gameName: this.gameName,
        count: 1,
        description: 'Players continue a story from where it leaves off, taking it in the wildest direction possible.',
        extra: `Spice level: ${this.spiceLevel}. Generate ONE intriguing story opening (2-3 sentences) that ends on a cliffhanger or open-ended moment. Players will write what happens next. End the opening with "..." to invite continuation.`,
      }, this.spiceLevel);
      const prompts = parseBellBotJSON(raw);
      if (prompts?.[0]) return { text: prompts[0], type: 'story-continue', instruction: 'Continue the story! Take it OFF THE RAILS! 🚂💥' };
    } catch { /* fallback */ }

    const pool = STORY_STARTS[this.spiceLevel] || STORY_STARTS[2];
    const available = pool.filter(s => !this.usedStarts.has(s));
    const list = available.length > 0 ? available : pool;
    const start = list[Math.floor(Math.random() * list.length)];
    this.usedStarts.add(start);
    return { text: start, type: 'story-continue', instruction: 'Continue the story! Take it OFF THE RAILS! 🚂💥' };
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 500);
    if (text.length < 15) return { error: 'Give us more story!' };
    return { data: text };
  }

  getDefaultSubmission() { return 'And then nothing happened. The end.'; }
  getSubmissionText(sub) { return sub; }
}
