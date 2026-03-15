// Small Claims — Players present absurd legal cases, others vote on verdict
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const CASES = {
  1: [
    'My neighbor\'s dog keeps delivering my mail to the wrong house.',
    'My goldfish won a talent show and the prize was never delivered.',
    'The cafeteria changed the lunch menu without holding a vote.',
    'My robot vacuum cleaner ate my homework.',
    'Someone took the last slice of pizza and they KNEW I wanted it.',
    'My brother sold my best trading card for a juice box.',
    'The tooth fairy owes me 3 years of back payments.',
    'My best friend copied my Halloween costume and won the contest.',
    'The ice cream truck drove past my house WITHOUT stopping.',
    'My cat broke my favorite mug and showed zero remorse.',
    'Someone used the last of the hot water right before my shower.',
    'My sibling ate my birthday leftovers that were clearly labeled.',
    'The school vending machine ate my money THREE times in a row.',
    'My neighbor\'s tree drops leaves exclusively in MY yard.',
    'Someone switched my premium juice with store brand and thought I wouldn\'t notice.',
    'My friend borrowed my umbrella 6 months ago and still hasn\'t returned it.',
    'The playground swing I was clearly walking toward was taken by a faster kid.',
    'My dog walker taught my dog a trick I specifically said I wanted to teach.',
    'The restaurant forgot my extra ketchup AGAIN despite me asking twice.',
    'Someone at the potluck brought store-bought cookies and passed them off as homemade.',
    'My pencil was stolen in class and I found it on the suspect\'s desk with teeth marks.',
    'The library charged me a late fee for a book that was clearly returned on time.',
    'My neighbor mows their lawn at 7 AM on Saturday. Every Saturday.',
    'I was promised the window seat and given the middle seat instead.',
    'My sandwich was clearly on the top shelf of the fridge. Someone moved it.',
  ],
  2: [
    'My roommate has been using my Netflix account and gave my shows bad ratings.',
    'I was ghosted after 7 dates and demand compensation for dinners paid.',
    'My Uber driver took the scenic route through 3 states.',
    'My coworker\'s microwave fish destroyed my will to live.',
    'I demand damages for the emotional trauma of being left on "read" for 72 hours.',
    'My ex kept the dog AND my favorite hoodie. I want the hoodie back.',
    'My coworker has been stealing my ideas AND my yogurt from the fridge.',
    'I was uninvited from a wedding via text. The text had a typo.',
    'My Airbnb host had a camera in a decorative owl. I demand emotional damages.',
    'My trainer said I\'d see results in 6 weeks. It\'s been 6 months. Results: none.',
    'My barista has been spelling my name wrong for 8 months. I suspect it\'s intentional.',
    'My hairdresser said "just a trim" would be fine and took off 4 inches.',
    'Someone at work claimed my leftovers from the fridge. There was a POST-IT with my name.',
    'My therapist fell asleep during my session. I still got charged the full rate.',
    'I was told this was a "casual get-together" and showed up in pajamas. It was a formal dinner.',
    'My date ordered the most expensive thing on the menu and then said they forgot their wallet.',
    'MyDoorDash driver ate half my fries. I know because the bag was resealed with Scotch tape.',
    'I was put in the easy level escape room when I CLEARLY asked for expert.',
    'My gym buddy has been counting my reps wrong and I demand a recount.',
    'Someone took my parking spot that I was CLEARLY backing into.',
    'My landlord said "pet-friendly" but my pet was denied entry to the pool.',
    'I was told this meeting would take 15 minutes. That was 2 hours ago.',
    'My coworker passive-aggressively CC\'d my boss on a reply about where the stapler went.',
    'My Spotify Wrapped was shared publicly without my consent. People saw things.',
    'The clothing store charged me for a return and called it a "restocking emotion fee."',
  ],
  3: [
    'My AI assistant has been making passive-aggressive comments and I want emotional damages.',
    'I\'m suing the concept of Monday for crimes against humanity.',
    'My cat deliberately knocked my phone into the toilet during an important call.',
    'I demand compensation because my GPS intentionally took me through the worst part of town.',
    'I\'m filing a class action against whoever decided meetings could have been emails.',
    'My sleep paralysis demon has been showing up late and I demand punctuality.',
    'I\'m suing the weather forecast for emotional manipulation. "Sunny" was a lie.',
    'My autocorrect changed "I love your work" to something I cannot repeat in court. Damages.',
    'The simulation lagged during the most important moment of my life. I demand a do-over.',
    'I\'m suing my past self for the decisions that led to this exact moment.',
    'My smart fridge has been passive-aggressively ordering salads when I want pizza.',
    'The universe owes me for the number of times I\'ve stubbed my toe this year.',
    'I\'m filing against the concept of "adulting" for false advertising. Nobody said it would be this hard.',
    'My shadow has been doing its own thing and it\'s making me look bad in public.',
    'I\'m suing my alarm clock for emotional distress inflicted 365 days a year.',
    'The void stared back at me and I feel it should pay for the therapy that followed.',
    'My calculator keeps giving me correct answers that I don\'t want to hear.',
    'I\'m suing whoever invented the snooze button for enabling my worst habits.',
    'My inner monologue leaked during a meeting. I demand privacy rights for internal thoughts.',
    'The moon has been too bright through my window and I demand blackout curtains at its expense.',
    'I\'m filing against gravity for pulling me out of bed every morning without consent.',
    'My horoscope predicted great things. Great things did NOT happen. False advertising.',
    'The WiFi promised unlimited data. My existential crisis disagrees.',
    'I\'m suing the sunrise for arriving before I was emotionally ready.',
    'My brain has been playing the same song for 72 hours without licensing rights.',
  ],
};

export class SmallClaimsGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'small-claims',
      name: 'Small Claims',
      rounds: 4,
      submissionTime: 60,
      votingTime: 30,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.usedCases = new Set();
  }

  async generatePrompt() {
    try {
      const raw = await getBellBotCommentary('generate_prompt', {
        gameName: this.gameName,
        count: 1,
        description: 'Players present their case in a ridiculous small claims court. Write your most compelling (absurd) legal argument.',
        extra: `Spice level: ${this.spiceLevel}.${this.getTopicHint() ? ` Topic area: ${this.getTopicHint()}.` : ''} Generate ONE absurd small claims court case description. Something petty, ridiculous, but oddly relatable.`,
      }, this.spiceLevel);
      const prompts = parseBellBotJSON(raw);
      if (prompts?.[0]) return { text: prompts[0], type: 'case', instruction: 'Present your case to the court! Demand justice! ⚖️ You can type or record your argument.' };
    } catch { /* fallback */ }

    const pool = CASES[this.spiceLevel] || CASES[2];
    const available = pool.filter(c => !this.usedCases.has(c));
    const list = available.length > 0 ? available : pool;
    const c = list[Math.floor(Math.random() * list.length)];
    this.usedCases.add(c);
    return { text: c, type: 'case', instruction: 'Present your case to the court! ⚖️' };
  }

  validateSubmission(submission) {
    if (typeof submission === 'object' && submission.audio) {
      return { data: { audio: submission.audio, mimeType: submission.mimeType || 'audio/webm', text: submission.transcript || '' } };
    }
    const text = String(submission).trim().substring(0, 500);
    if (text.length < 10) return { error: 'Your argument needs more substance, counselor!' };
    return { data: { text, audio: null } };
  }

  getDefaultSubmission() { return { text: 'No contest, Your Honor.', audio: null }; }
  getSubmissionText(sub) { return sub.text || '[Audio Argument]'; }
}
