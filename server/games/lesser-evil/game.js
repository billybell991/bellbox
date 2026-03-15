// The Lesser Evil — Players choose between two bad options, defend their choice
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const CHOICES = {
  1: [
    { a: 'Only eat soup for every meal', b: 'Only eat sandwiches for every meal' },
    { a: 'Always be 10 minutes early', b: 'Always be 10 minutes late' },
    { a: 'Only speak in questions', b: 'Only speak in rhymes' },
    { a: 'Have to sing everything you say', b: 'Have to dance everywhere you walk' },
    { a: 'Be able to fly but only 2 feet off the ground', b: 'Be invisible but only when nobody is looking' },
    { a: 'Only wear one color for the rest of your life', b: 'Never wear the same outfit twice' },
    { a: 'Have a rewind button for conversations', b: 'Have subtitles for everything people say' },
    { a: 'Every animal you meet follows you home', b: 'Every stranger thinks you\'re their old friend' },
    { a: 'Always have to sneeze but never quite can', b: 'Always have a song stuck in your head' },
    { a: 'Only be able to whisper', b: 'Only be able to shout' },
    { a: 'Have fingers as long as your legs', b: 'Have legs as long as your fingers' },
    { a: 'Never be able to close a door quietly', b: 'Never be able to open a jar on the first try' },
    { a: 'Hiccup every time you tell a lie', b: 'Sneeze every time someone talks about you' },
    { a: 'Have a personal theme song that plays everywhere you go', b: 'Have a narrator describing everything you do' },
    { a: 'Be allergic to your favorite food', b: 'Be allergic to your favorite animal' },
    { a: 'Only travel by pogo stick', b: 'Only travel by skateboard' },
    { a: 'Always have wet socks', b: 'Always have an itchy tag on your shirt' },
    { a: 'Be able to talk to animals but they\'re all rude', b: 'Read minds but only boring thoughts' },
    { a: 'Have a magic carpet but no sense of direction', b: 'Have a teleporter but it\'s always off by 10 feet' },
    { a: 'Never find matching socks again', b: 'Never find your phone in your bag on the first try' },
    { a: 'Have to eat breakfast for every meal', b: 'Have to eat dinner for every meal including breakfast' },
    { a: 'Live in a treehouse forever', b: 'Live on a houseboat forever' },
    { a: 'Have a pet dragon that sneezes fire', b: 'Have a pet phoenix that cries constantly' },
    { a: 'Only be able to text in ALL CAPS', b: 'Only be able to text in wingdings' },
    { a: 'Have your laugh sound like a dolphin', b: 'Have your sneeze sound like a foghorn' },
  ],
  2: [
    { a: 'Know everyone\'s exact opinion of you', b: 'Never know what anyone thinks of you' },
    { a: 'Relive the same day forever', b: 'Never be able to remember yesterday' },
    { a: 'Have your browser history displayed on a billboard', b: 'Have your Spotify listening history read aloud at every meeting' },
    { a: 'Only communicate via memes', b: 'Only communicate via haiku' },
    { a: 'Be famous but broke', b: 'Be rich but nobody knows you exist' },
    { a: 'Have everyone you meet know your most embarrassing moment', b: 'Forget the name of every person you meet' },
    { a: 'Always say what you\'re thinking out loud', b: 'Never be able to express your actual feelings' },
    { a: 'Have your boss read all your texts', b: 'Have your mom follow all your social media' },
    { a: 'Be stuck in an elevator with your ex for 3 hours', b: 'Be stuck in traffic behind a learner driver for 3 hours' },
    { a: 'Get a papercut every time you open your laptop', b: 'Stub your toe every time you stand up' },
    { a: 'Have your Uber driver want to chat the whole ride', b: 'Have your hairdresser silently judge your life choices' },
    { a: 'Accidentally reply-all to every email', b: 'Accidentally like every social media post you view' },
    { a: 'Only watch movies you\'ve already seen', b: 'Only listen to music you\'ve never heard before' },
    { a: 'Have your wake-up alarm be your ex\'s voice', b: 'Have your ringtone be your boss saying your full name' },
    { a: 'Never be able to end a conversation gracefully', b: 'Never be able to start a conversation without awkwardness' },
    { a: 'Have autocorrect change every third word you type', b: 'Have your phone randomly call people in your contacts' },
    { a: 'Sit in the middle seat on every flight', b: 'Always get the squeaky shopping cart' },
    { a: 'Date someone who chews with their mouth open', b: 'Date someone who talks during movies' },
    { a: 'Have an obnoxiously loud snoring partner', b: 'Have a partner who steals all the blankets' },
    { a: 'Only see spoilers for every show you want to watch', b: 'Never be able to finish a book because the last chapter is always missing' },
    { a: 'Have your search history appear as your screen saver', b: 'Have your deleted texts recoverable by anyone' },
    { a: 'Be permanently tagged in every bad group photo', b: 'Have every text you\'ve sent read aloud at your wedding' },
    { a: 'Your food always arrives cold at restaurants', b: 'Your drinks always arrive warm at bars' },
    { a: 'Always pick the slowest checkout line', b: 'Always pick the parking spot farthest from the entrance' },
    { a: 'Be the person who always kills the group chat vibe', b: 'Be the person who always overexplains the joke' },
  ],
  3: [
    { a: 'Every toilet you use plays your least favorite song at full volume', b: 'Every time you sneeze, you teleport to a random location' },
    { a: 'Your thoughts are broadcast on a speaker 10% of the time', b: 'You involuntarily narrate everything you do in third person' },
    { a: 'Every animal can talk but they\'re all extremely passive-aggressive', b: 'You can read minds but only intrusive thoughts' },
    { a: 'Live in a world where everyone claps after movies', b: 'Live in a world where elevators have no doors' },
    { a: 'Have a personal narrator who is always slightly wrong', b: 'Have a laugh track that plays after everything you say' },
    { a: 'Your dreams are livestreamed to the internet', b: 'Your inner monologue is subtitled above your head' },
    { a: 'Every handshake triggers a random sound effect', b: 'Every time you blink, a camera shutter sound plays' },
    { a: 'You can only sleep standing up', b: 'You can only eat while running' },
    { a: 'Everything you cook becomes sentient and asks not to be eaten', b: 'Everything you drink gives you a different accent' },
    { a: 'Your shadow has its own personality and disagrees with everything you do', b: 'Your reflection gives you unsolicited life advice' },
    { a: 'You can time travel but only backwards by 30 seconds', b: 'You can teleport but only to the last place you were embarrassed' },
    { a: 'Your phone autocorrects everything to conspiracy theories', b: 'Your GPS gives directions using only landmarks that no longer exist' },
    { a: 'Everyone thinks you\'re a different celebrity each day', b: 'You can only respond to questions with other questions' },
    { a: 'You hear boss music every time you enter a room', b: 'Your life has unskippable cutscenes before every meal' },
    { a: 'Your furniture rearranges itself every night', b: 'Your clothes change color based on your mood' },
    { a: 'You can only laugh in Comic Sans font', b: 'You can only cry in slow motion' },
    { a: 'Every time you sit down, dramatic orchestral music plays', b: 'Every time you stand up, confetti falls from the ceiling' },
    { a: 'You must legally duel anyone who disagrees with you about pizza toppings', b: 'You must write a formal apology letter every time you yawn in public' },
    { a: 'Your pet becomes your boss at work', b: 'Your boss becomes your pet at home' },
    { a: 'Every bird you see judges your outfit out loud', b: 'Every cloud rearranges into a critique of your life choices' },
    { a: 'You gain telekinesis but only for objects smaller than a grape', b: 'You gain super speed but only while no one is watching' },
    { a: 'You can only walk in diagonal lines', b: 'You can only turn left' },
    { a: 'Every text you send arrives in a different language', b: 'Every voicemail you leave is autotuned' },
    { a: 'Your fridge gives TED talks every time you open it', b: 'Your shower plays a different podcast episode each time' },
    { a: 'Your allergies are triggered by fun', b: 'You\'re immune to everything but mild inconveniences' },
  ],
};

export class LesserEvilGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'lesser-evil',
      name: 'The Lesser Evil',
      rounds: 4,
      submissionTime: 45,
      votingTime: 30,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.usedChoices = new Set();
  }

  async generatePrompt() {
    try {
      const raw = await getBellBotCommentary('generate_scenarios', {
        instruction: `Generate ONE "would you rather" scenario with two equally terrible/absurd options. Spice level: ${this.spiceLevel} (1=family, 2=edgy, 3=unhinged).${this.getTopicHint() ? ` Topic area: ${this.getTopicHint()}.` : ''} Format as a JSON object.`,
        jsonFormat: '{"a": "option A", "b": "option B"}',
      }, this.spiceLevel);
      const choice = parseBellBotJSON(raw);
      if (choice?.a && choice?.b) {
        return { a: choice.a, b: choice.b, type: 'lesser-evil', instruction: 'Pick your side and defend your choice!' };
      }
    } catch { /* fallback */ }

    const pool = CHOICES[this.spiceLevel] || CHOICES[2];
    const available = pool.filter((_, i) => !this.usedChoices.has(i));
    const list = available.length > 0 ? available : pool;
    const idx = Math.floor(Math.random() * list.length);
    this.usedChoices.add(idx);
    return { ...list[idx], type: 'lesser-evil', instruction: 'Pick your side and defend your choice!' };
  }

  validateSubmission(submission) {
    if (!submission || typeof submission !== 'object') return { error: 'Invalid submission' };
    const { choice, defense } = submission;
    if (choice !== 'a' && choice !== 'b') return { error: 'Pick A or B!' };
    const text = String(defense || '').trim().substring(0, 500);
    if (text.length < 5) return { error: 'Defend your choice!' };
    return { data: { choice, defense: text } };
  }

  getDefaultSubmission() { return { choice: 'a', defense: 'Both are terrible and I refuse to participate.' }; }
  getSubmissionText(sub) { return `Chose ${sub.choice?.toUpperCase()}: ${sub.defense}`; }
}
