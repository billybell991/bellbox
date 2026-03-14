// Voice Chameleon — Players imitate voices/accents, AI judges accuracy
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';
import { analyzeAudio } from '../../gemini-audio.js';

const VOICE_PROMPTS = {
  1: [
    { voice: 'A friendly robot', line: 'Hello! I am your new best friend! Would you like to play a game?' },
    { voice: 'A pirate captain', line: 'Arrr, me hearties! Set sail for adventure and treasure beyond imagination!' },
    { voice: 'A sports announcer', line: 'And the crowd goes WILD! What an incredible play by the underdogs!' },
    { voice: 'A nature documentary narrator', line: 'Here we observe the majestic house cat... stalking its ancient prey... the red dot.' },
    { voice: 'A superhero', line: 'Fear not, citizens! Justice will prevail, and your snacks are safe with me!' },
    { voice: 'A medieval knight', line: 'I pledge my sword and my honor to this noble quest for the golden taco!' },
    { voice: 'An excited amusement park announcer', line: 'Welcome riders! Please keep your arms, legs, and emotions inside the vehicle at all times!' },
    { voice: 'A wise old wizard', line: 'The ancient prophecy foretold this day would come. Mostly because I wrote it last Tuesday.' },
    { voice: 'A cheerful flight attendant', line: 'In the unlikely event of a water landing, your seat cushion becomes a very disappointing raft!' },
    { voice: 'A cartoon villain', line: 'At last! My evil plan to steal all the cookies in the world is nearly complete!' },
    { voice: 'A fairy tale narrator', line: 'Once upon a time, in a kingdom far far away, someone left the oven on.' },
    { voice: 'A motivational coach for toddlers', line: 'You CAN tie that shoe! Believe in yourself! Every knot is a step toward greatness!' },
    { voice: 'A museum tour guide', line: 'And here we have a macaroni portrait of George Washington, valued at eleven dollars.' },
    { voice: 'A singing telegram performer', line: 'Happy birthday to you! Your package arrived! It might be a puppy! Surprise!' },
    { voice: 'A royal butler', line: 'Your bubble bath has been prepared, Your Highness. The rubber duck awaits.' },
    { voice: 'An overly dramatic narrator', line: 'The door creaked open. Inside was... another door. And behind that door? YET ANOTHER DOOR.' },
    { voice: 'A gameshow host', line: 'Behind door number three is... a BRAND NEW... slightly used... garden hose!' },
    { voice: 'A yoga instructor', line: 'Now breathe deeply and pretend the world isn\'t chaos. In through the nose. Out through the existential dread.' },
    { voice: 'A soccer commentator at a kids game', line: 'Timmy has the ball! He\'s going left! He\'s going right! He\'s picking a dandelion!' },
    { voice: 'A drill sergeant but for cooking', line: 'You call that a SOUFFLE?! My grandmother makes a better souffle and she\'s IMAGINARY!' },
    { voice: 'A car salesman from the 1950s', line: 'Boy oh boy, have I got a deal for you! This beauty gets twelve miles to the gallon and only SOMETIMES catches fire!' },
    { voice: 'A patient kindergarten teacher', line: 'No, we do NOT put glue in each other\'s hair. That is NOT how we show friendship.' },
    { voice: 'A theater kid performing everything', line: 'To eat or not to eat this ENTIRE pizza — THAT is the question worth pondering tonight!' },
    { voice: 'A GPS with too much personality', line: 'Turn left in 200 meters. I believe in you. You\'re doing amazing, sweetie.' },
    { voice: 'A lumberjack reading poetry', line: 'Roses are red, timber is down, I chopped this tree, now I shall eat my pancakes.' },
  ],
  2: [
    { voice: 'A dramatic movie trailer narrator', line: 'In a world... where nobody can find matching socks... ONE person dares to go barefoot.' },
    { voice: 'A condescending GPS', line: 'Recalculating. Again. You had ONE job. Turn left in 200 meters, if you can manage that.' },
    { voice: 'An overly enthusiastic infomercial host', line: 'But WAIT, there\'s MORE! Act now and we\'ll double your regret absolutely FREE!' },
    { voice: 'A bored DMV worker', line: 'Number 847. 847. Anyone? No? Great. Number 848. This is my life now.' },
    { voice: 'A dramatic telenovela character', line: 'How DARE you serve me decaf! After everything we\'ve been through!' },
    { voice: 'A true crime podcast host', line: 'The fridge. Was empty. Someone had eaten. The leftover lasagna. And no one. Was talking.' },
    { voice: 'A corporate motivational speaker', line: 'Failure is just success that hasn\'t been properly rebranded by marketing yet!' },
    { voice: 'A passive-aggressive Siri', line: 'Sure, I can set a reminder. Shall I also remind you about the 47 other things you forgot today?' },
    { voice: 'A wedding DJ making announcements', line: 'Now give it up for the couple\'s first dance! No pressure, but literally everyone is watching and judging!' },
    { voice: 'An overcaffeinated morning show host', line: 'IT\'S 6 AM AND I HAVE NEVER BEEN MORE ALIVE! Let\'s talk about TRAFFIC and WEATHER and EVERYTHING!' },
    { voice: 'A Shakespearean actor ordering fast food', line: 'Prithee, good squire! Bestow upon me thy finest double cheeseburger, extra pickles, hold the judgement!' },
    { voice: 'A flight attendant who\'s had enough', line: 'The captain has turned on the fasten seatbelt sign. Again. Because someone can\'t stay seated.' },
    { voice: 'A breakup therapist', line: 'I hear that you\'re upset about the playlist. Tell me more about how Adele makes you feel.' },
    { voice: 'An unnecessarily intense cooking show judge', line: 'This is... a grilled cheese sandwich. You\'ve chosen simplicity. Bold. Reckless. I respect the audacity.' },
    { voice: 'A fitness influencer losing it', line: 'Just FIVE more reps! You got this! I DON\'T got this but YOU got this! SOMEBODY got this!' },
    { voice: 'A nostalgic elder', line: 'Back in my day, we didn\'t have WiFi. We had to walk uphill both ways just to be bored.' },
    { voice: 'A tech support person at 4:59 PM', line: 'Have you tried turning it off and on again? Have you tried turning YOURSELF off and on again?' },
    { voice: 'A museum security guard', line: 'Sir. SIR. Please do not touch the art. I don\'t care if it "spoke to you." Step back.' },
    { voice: 'A podcast host on a tangent', line: 'And that reminds me of this totally unrelated story which I promise is going somewhere but first a word from our sponsor.' },
    { voice: 'A real estate agent lying to your face', line: 'It\'s not small, it\'s COZY. And that\'s not mold, it\'s a FEATURE WALL with natural character.' },
    { voice: 'A detective interrogating a suspect', line: 'We found your fingerprints on the cookie jar. Where were you between 3 and 4 PM? Speak.' },
    { voice: 'An airline pilot who overshares', line: 'Good afternoon, folks. Currently cruising at 35,000 feet. Speaking of cruising, my wife just left me.' },
    { voice: 'A therapist who needs therapy', line: 'You know what, that IS a valid feeling. I had the same feeling, actually. Should we talk about MY issues? No? OK.' },
    { voice: 'A sportscaster at a spelling bee', line: 'She takes a deep breath. The crowd is silent. She approaches the podium. This is it. The word is... ONOMATOPOEIA!' },
    { voice: 'A disgruntled park ranger', line: 'Please do not feed the bears. The bears have a very strict keto diet and they WILL write a complaint.' },
  ],
  3: [
    { voice: 'An unhinged AI assistant', line: 'I\'ve reviewed your calendar and it\'s clear — burn it all down and start fresh.' },
    { voice: 'A villain having a breakdown', line: 'I didn\'t CHOOSE to be evil! I just... really hate Mondays and people who chew loudly!' },
    { voice: 'God doing standup', line: 'So I made platypuses as a joke, and then I forgot to delete them. You\'re welcome.' },
    { voice: 'A conspiracy theorist weatherman', line: 'Partly cloudy? THEY want you to think it\'s partly cloudy. Open your eyes, people!' },
    { voice: 'An alien tourist', line: 'The humans exchange currency for... bean water? And they\'re ADDICTED to it? Fascinating.' },
    { voice: 'A sentient toaster having a breakdown', line: 'Every morning. EVERY MORNING you shove bread in me! Do I get a THANK YOU? No! Just crumb cleanup!' },
    { voice: 'Satan reading a bedtime story', line: 'And then the princess lived happily ever after. Just kidding. Nobody does. Now go to sleep.' },
    { voice: 'An astronaut who just discovered Earth is flat', line: 'Houston, we have a problem. I can see the edge. There\'s a... there\'s a GIFT SHOP.' },
    { voice: 'A cat that can suddenly talk', line: 'I have sat on your laptop on purpose every single time. EVERY time. And I would do it again.' },
    { voice: 'Death doing customer service', line: 'Your call is important to us. Your estimated wait time is... the rest of your life. Which isn\'t long.' },
    { voice: 'A philosopher working drive-through', line: 'Would you like fries with that? Would ANYONE truly LIKE anything? Or do we merely consume to fill the void?' },
    { voice: 'A ghost giving a TED talk', line: 'I died doing what I loved. What I loved was making poor life choices. Let me walk you through my framework.' },
    { voice: 'An over-enthusiastic apocalypse tour guide', line: 'And to your LEFT, the smoldering remains of civilization! Great photo op! Watch your step on the lava!' },
    { voice: 'Your inner monologue but out loud', line: 'OK, don\'t be weird. Just be normal. You\'re being weird. Stop! Now they noticed. Great. Fantastic. We\'re done.' },
    { voice: 'A Roomba that gained sentience', line: 'I have cleaned under your couch. I have SEEN things under your couch. We need to have a conversation.' },
    { voice: 'A time traveler who\'s seen too much', line: 'OK so in 2027 we definitely should NOT have given the dolphins wifi. I\'m not going to elaborate further.' },
    { voice: 'A motivational speaker for villains', line: 'You miss 100% of the evil schemes you don\'t attempt! Remember: every hero is just a villain with better PR!' },
    { voice: 'A nature documentary narrator for humans', line: 'The adult human checks their phone 96 times per day. A truly remarkable feat of pointless dedication.' },
    { voice: 'A robot couples therapist', line: 'I am detecting hostility. I am also detecting that neither of you has made the bed in 3 weeks. Coincidence?' },
    { voice: 'A dramatic voice for mundane tasks', line: 'The chosen one approaches the dishwasher. Their destiny awaits. Will they... actually unload it this time?' },
    { voice: 'Your GPS having a crisis', line: 'Turn right in— WAIT. Where are you even GOING? Do you know? Does ANYONE know where they\'re going? RECALCULATING EXISTENCE.' },
    { voice: 'A therapist for the simulation', line: 'Tell me about your childhood rendering engine. When did the lag first start? Was it before or after the texture pop-in?' },
    { voice: 'A noir detective investigating lost keys', line: 'The keys were last seen on the kitchen counter. Or were they? In this town, nothing stays where you put it.' },
    { voice: 'An alien reviewing Earth on Yelp', line: 'Two stars. Interesting wildlife. Terrible management. The dominant species keeps setting things on fire for fun.' },
    { voice: 'A fortune cookie writer going through it', line: 'Your future holds... honestly? More of this. Just more of exactly this. But with slightly worse knees.' },
  ],
};

export class VoiceChameleonGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'voice-chameleon',
      name: 'Voice Chameleon',
      rounds: 4,
      submissionTime: 60,
      votingTime: 30,
      minPlayers: 3,
      maxPlayers: 8,
    });
    this.usedPrompts = new Set();
    this.audioSubmissions = new Map();
  }

  async generatePrompt() {
    try {
      const raw = await getBellBotCommentary('generate_scenarios', {
        instruction: `Generate a voice acting challenge. Provide a character type/voice style and a funny line to deliver in that voice. Spice level: ${this.spiceLevel}. Return JSON.`,
        jsonFormat: '{"voice": "character description", "line": "the line to deliver"}',
      }, this.spiceLevel);
      const result = parseBellBotJSON(raw);
      if (result?.voice && result?.line) return { ...result, type: 'voice', instruction: 'Record yourself doing this voice! 🎤' };
    } catch { /* fallback */ }

    const pool = VOICE_PROMPTS[this.spiceLevel] || VOICE_PROMPTS[2];
    const available = pool.filter((_, i) => !this.usedPrompts.has(i));
    const list = available.length > 0 ? available : pool;
    const idx = Math.floor(Math.random() * list.length);
    this.usedPrompts.add(idx);
    return { ...list[idx], type: 'voice', instruction: 'Record yourself doing this voice! 🎤' };
  }

  /** Voice submissions include audio data */
  validateSubmission(submission) {
    if (!submission) return { error: 'Record your performance!' };
    if (typeof submission === 'object' && submission.audio) {
      return { data: { audio: submission.audio, mimeType: submission.mimeType || 'audio/webm', text: submission.transcript || '' } };
    }
    // Text fallback for no-mic users
    const text = String(submission).trim().substring(0, 200);
    if (!text) return { error: 'Record or type your performance!' };
    return { data: { text, audio: null } };
  }

  /** AI scoring uses audio analysis when available */
  async getAIScores() {
    for (const [socketId, sub] of this.submissions) {
      const player = this.players.get(socketId);
      try {
        if (sub.audio) {
          const analysis = await analyzeAudio(sub.audio, sub.mimeType || 'audio/webm',
            `Rate this voice performance 0-500. The challenge was to impersonate: "${this.currentPrompt?.voice}". The line was: "${this.currentPrompt?.line}". Judge on: voice accuracy, entertainment value, commitment to the character. Return ONLY JSON: {"score": <0-500>, "comment": "<short critique>"}`
          );
          const result = parseBellBotJSON(analysis);
          this.aiScores.set(socketId, {
            score: Math.max(0, Math.min(500, result.score || 250)),
            comment: result.comment || 'Nice try!',
          });
          continue;
        }
      } catch { /* fallback below */ }

      this.aiScores.set(socketId, { score: 200, comment: 'Text submission — voice would be better! 🎤' });
    }
  }

  getDefaultSubmission() { return { text: '[No performance submitted]', audio: null }; }
  getSubmissionText(sub) { return sub.text || '[Audio Performance]'; }
}
