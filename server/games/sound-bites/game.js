// Sound Bites — Players create funny sound effects for situations
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';
import { analyzeAudio } from '../../gemini-audio.js';

const SCENARIOS = {
  1: [
    'The sound your brain makes when you forget why you walked into a room',
    'The noise a cat makes when it knocks something off a table on purpose',
    'The sound of someone trying to be quiet but failing completely',
    'What a rainbow would sound like',
    'The noise a robot makes when it falls in love',
    'The sound of a dog dreaming about chasing squirrels',
    'What morning feels like... as a sound',
    'The noise a penguin makes when it sees its best friend',
    'The sound of a pancake being flipped perfectly',
    'What a sunset would sound like if you could hear it',
    'The noise your stomach makes in a quiet room',
    'The sound of a baby laughing at peek-a-boo for the 100th time',
    'What a cloud would sound like if it could talk',
    'The sound effect for finding a dollar in your pocket',
    'The noise a squirrel makes when it successfully steals a bird feeder snack',
    'What gravity would sound like if you could hear it',
    'The sound of a goldfish having an exciting thought',
    'The noise confetti makes as it falls in slow motion',
    'What the color yellow sounds like',
    'The sound of a sloth doing something at maximum speed',
    'The noise a snowflake makes when it lands on your tongue',
    'What a high-five between best friends sounds like in slow motion',
    'The sound of your blanket when it reaches perfect coziness level',
    'The noise a shooting star makes as it crosses the sky',
    'What a tree sounds like when it grows one inch',
  ],
  2: [
    'The sound of someone\'s career ending in slow motion',
    'The noise your phone makes when your ex texts',
    'The sound of someone pretending to laugh at their boss\'s joke',
    'What an overpriced coffee tastes like... but as a sound',
    'The sound of someone realizing they\'ve been on mute for 20 minutes',
    'The noise your brain makes when you see your credit card statement',
    'What online shopping regret sounds like',
    'The sound of someone accidentally sending a text to the wrong person',
    'What Monday morning sounds like as a ringtone',
    'The noise of someone trying to leave a party without being noticed',
    'The sound your confidence makes when it leaves your body',
    'What a passive-aggressive text sounds like',
    'The noise your dignity makes when you trip in public',
    'The sound of someone pretending to know what they\'re talking about',
    'What seeing your ex at a party with someone hotter sounds like',
    'The noise of an awkward silence becoming more awkward',
    'The sound effect for "I just sent that email to the wrong person"',
    'What seasonal depression sounds like arriving in November',
    'The noise of someone screenshot-ing your message',
    'The sound of a meeting that could have been an email',
    'What being left on read sounds like',
    'The noise of someone eating the last slice without asking',
    'The sound your will to live makes on Sunday evening',
    'What a bad Tinder match sounds like',
    'The noise your soul makes when someone says "we need to talk"',
  ],
  3: [
    'The sound of your last brain cell leaving',
    'What existential dread sounds like at 3am',
    'The noise society makes as it collectively goes off the rails',
    'The sound effect for "I just sent that text to the wrong person"',
    'What the WiFi password being wrong sounds like in your soul',
    'The sound the universe makes when it runs out of ideas',
    'What a black hole sounds like when it yawns',
    'The noise reality makes when it glitches',
    'The sound of everyone simultaneously realizing we live in a simulation',
    'What the void sounds like when it stares back at you',
    'The sound of a parallel universe where everything went right',
    'What your sleep paralysis demon sounds like clearing its throat',
    'The noise your browser history makes when it judges you',
    'The sound of all your intrusive thoughts having a group meeting',
    'What a crisis of faith sounds like in 5 seconds',
    'The noise the simulation makes before a software update',
    'The sound of your childhood innocence packing its bags and leaving',
    'What the concept of "adulting" sounds like',
    'The noise your phone makes when it exposes your screen time to the group',
    'The sound of a thought so powerful it crashes the simulation',
    'What entropy sounds like if it had a theme song',
    'The noise of all your unread emails becoming sentient',
    'The sound of procrastination winning again',
    'What the end credits of reality sound like',
    'The noise consciousness makes when it first boots up in the morning',
  ],
};

export class SoundBitesGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'sound-bites',
      name: 'Sound Bites',
      rounds: 4,
      submissionTime: 45,
      votingTime: 30,
      minPlayers: 3,
      maxPlayers: 8,
    });
    this.usedScenarios = new Set();
  }

  async generatePrompt() {
    try {
      const raw = await getBellBotCommentary('generate_prompt', {
        gameName: this.gameName,
        count: 1,
        description: 'Players create the best sound effect (vocal performance) for an absurd situation. Record the most creative noise!',
        extra: `Spice level: ${this.spiceLevel}. Generate ONE absurd scenario that players need to create a sound effect for. Think "what would X sound like?"`,
      }, this.spiceLevel);
      const prompts = parseBellBotJSON(raw);
      if (prompts?.[0]) return { text: prompts[0], type: 'sound-bite', instruction: 'Make the sound! Record your best audio effect! 🔊' };
    } catch { /* fallback */ }

    const pool = SCENARIOS[this.spiceLevel] || SCENARIOS[2];
    const available = pool.filter(s => !this.usedScenarios.has(s));
    const list = available.length > 0 ? available : pool;
    const scenario = list[Math.floor(Math.random() * list.length)];
    this.usedScenarios.add(scenario);
    return { text: scenario, type: 'sound-bite', instruction: 'Make the sound! Record your best audio effect! 🔊' };
  }

  validateSubmission(submission) {
    if (!submission) return { error: 'Record a sound!' };
    if (typeof submission === 'object' && submission.audio) {
      return { data: { audio: submission.audio, mimeType: submission.mimeType || 'audio/webm' } };
    }
    const text = String(submission).trim().substring(0, 100);
    if (!text) return { error: 'Record or describe your sound!' };
    return { data: { text, audio: null } };
  }

  async getAIScores() {
    for (const [socketId, sub] of this.submissions) {
      try {
        if (sub.audio) {
          const analysis = await analyzeAudio(sub.audio, sub.mimeType || 'audio/webm',
            `Rate this sound effect 0-500. The challenge was: "${this.currentPrompt?.text}". Judge on creativity, humor, and how well it matches the scenario. Return ONLY JSON: {"score": <0-500>, "comment": "<text>"}`
          );
          const result = parseBellBotJSON(analysis);
          this.aiScores.set(socketId, { score: Math.max(0, Math.min(500, result.score || 250)), comment: result.comment || '' });
          continue;
        }
      } catch { /* fallback */ }
      this.aiScores.set(socketId, { score: 200, comment: 'Text description — audio would score higher!' });
    }
  }

  getDefaultSubmission() { return { text: '*silence*', audio: null }; }
  getSubmissionText(sub) { return sub.text || '[Audio Sound Effect]'; }
}
