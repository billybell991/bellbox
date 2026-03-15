// The AI Interview — Players answer wacky interview questions, AI rates them
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';
import { analyzeAudio } from '../../gemini-audio.js';

const INTERVIEW_QS = {
  1: [
    { job: 'Royal Taste Tester', question: 'If you could only eat one food for the rest of your life, what would it be and why?' },
    { job: 'Professional Pillow Tester', question: 'Describe your greatest nap achievement.' },
    { job: 'Dinosaur Trainer', question: 'How would you handle a T-Rex with an attitude problem?' },
    { job: 'Cloud Namer', question: 'You get to name a new type of cloud. What do you call it and why?' },
    { job: 'Bubble Wrap Quality Inspector', question: 'Pop or no pop? Defend your bubble wrap philosophy.' },
    { job: 'Professional Treasure Hunter', question: 'You find a treasure chest but it\'s guarded by a very polite dragon. What do you do?' },
    { job: 'Penguin Ambassador', question: 'How would you convince penguins to visit a tropical resort?' },
    { job: 'Rainbow Painter', question: 'The rainbow committee wants to add an 8th color. What color do you propose and why?' },
    { job: 'Official Joke Tester', question: 'Tell us your best joke, then explain why it\'s funny. The explanation must be funnier than the joke.' },
    { job: 'Chief Blanket Fort Architect', question: 'You have unlimited pillows, sheets, and Christmas lights. Describe your ultimate fort.' },
    { job: 'Imaginary Friend Coach', question: 'Your client\'s imaginary friend has stopped showing up. How do you fix this?' },
    { job: 'Naptime Enforcement Officer', question: 'A child is resisting naptime with every fiber of their being. What\'s your strategy?' },
    { job: 'Professional Snowman Builder', question: 'The classic carrot nose is under review. What do you replace it with?' },
    { job: 'Star Namer at NASA', question: 'Name a newly discovered star system and write a one-sentence tourism ad for it.' },
    { job: 'Theme Park Ride Designer for Cats', question: 'Describe a thrilling yet cat-appropriate amusement park ride.' },
    { job: 'Moonlight Lifeguard', question: 'The moon pool has opened for swim season. What rules do you enforce?' },
    { job: 'Video Game Boss Fight Choreographer', question: 'Design a boss fight for a villain who attacks exclusively with office supplies.' },
    { job: 'Chief Emoji Officer', question: 'You can create one new emoji. What is it and when should it be used?' },
    { job: 'Weather Mood Coordinator', question: 'It\'s a customer\'s birthday. What weather do you assign them and why?' },
    { job: 'Professional High-Fiver', question: 'Demonstrate your signature high-five and explain its emotional impact.' },
    { job: 'Dream Director', question: 'A VIP client wants a dream featuring dragons and ice cream. Pitch your dream screenplay.' },
    { job: 'Toy Hospital Surgeon', question: 'A beloved teddy bear has a critical stuffing leak. Walk us through the surgery.' },
    { job: 'Unicorn Groomer', question: 'A unicorn has a knotted mane and a bad attitude. How do you approach this?' },
    { job: 'Chief Officer of Silly Walks', question: 'Demonstrate your silliest walk and explain why it should be the new national standard.' },
    { job: 'Space Tour Guide', question: 'You\'re giving a tour of Saturn\'s rings. What\'s your opening line?' },
  ],
  2: [
    { job: 'Professional Excuse Maker', question: 'Give me your best excuse for being 3 hours late to work.' },
    { job: 'Cat Herder', question: 'Sell me on why you\'re qualified to manage 200 cats.' },
    { job: 'Social Media Manager for the Moon', question: 'Write the Moon\'s first tweet. Go.' },
    { job: 'Chief Vibes Officer', question: 'Describe a time when the vibes were off and you fixed them.' },
    { job: 'Professional Ghostwriter for Ghosts', question: 'A ghost wants to write its memoir but can\'t hold a pen. How do you help?' },
    { job: 'Breakup Coordinator', question: 'Your client wants to break up via interpretive dance. Choreograph the key moment.' },
    { job: 'WiFi Whisperer', question: 'The office WiFi has been acting up. You believe it\'s an emotional issue. Diagnose it.' },
    { job: 'Alarm Clock Therapist', question: 'Your client hates their alarm clock so much they\'ve thrown it out the window twice. What do you prescribe?' },
    { job: 'Meeting Survival Specialist', question: 'This meeting could have been an email. Convince the VP to cancel ALL meetings forever.' },
    { job: 'Professional Apology Writer', question: 'Write a formal apology letter from a coffee machine to the office it let down.' },
    { job: 'Office Plant Therapist', question: 'The office fern is dying and everyone blames each other. Mediate this conflict.' },
    { job: 'Influencer Impact Assessor', question: 'Rate this person\'s lifestyle: they eat avocado toast, do yoga, and have a podcast. Give them a score.' },
    { job: 'Email Tone Consultant', question: 'This email says "Per my last email." Translate its emotional subtext.' },
    { job: 'Uber Rating Recovery Specialist', question: 'Your client has a 2.3 Uber rating. What happened and how do you fix it?' },
    { job: 'Group Chat Mediator', question: 'The group chat has descended into chaos. Someone sent a passive-aggressive emoji. De-escalate.' },
    { job: 'Second Impression Coach', question: 'Your client botched their first impression at a party. Design their re-entrance strategy.' },
    { job: 'Professional Side-Eye Instructor', question: 'Demonstrate a side-eye for the following scenario: Someone just microwaved fish in the office.' },
    { job: 'Resume Gap Explainer', question: 'Explain a 3-year gap on your resume using only metaphors.' },
    { job: 'Walk-of-Shame Concierge', question: 'Your upscale hotel needs a discreet early-morning departure service. Pitch the concept.' },
    { job: 'Freelance Overthinker', question: 'Overthink this: your friend took 3 minutes longer than usual to reply. What does it mean?' },
    { job: 'Professional People Watcher', question: 'You\'re at a cafe. Describe what that person in the corner is DEFINITELY up to.' },
    { job: 'Hangover Recovery Architect', question: 'Design the perfect hangover recovery room. What\'s included?' },
    { job: 'Awkward Silence Filler', question: 'You\'re in an elevator with your CEO. The ride is 45 floors. Fill the silence.' },
    { job: 'Passive-Aggressive Note Writer', question: 'Someone keeps stealing milk from the office fridge. Write the note.' },
    { job: 'Monday Motivation Specialist', question: 'It\'s 6 AM Monday. Motivate someone who has clearly given up on life.' },
  ],
  3: [
    { job: 'Existential Crisis Counselor', question: 'A client asks "Why do we even exist?" — what\'s your answer and why should we pay you $200/hour for it?' },
    { job: 'Professional Gaslighter', question: 'Convince me that this interview never happened.' },
    { job: 'Time Travel HR Manager', question: 'You discover an employee has been clocking in from the year 1492. How do you handle the paperwork?' },
    { job: 'AI\'s Therapist', question: 'An AI tells you it\'s having an existential crisis. What do you say?' },
    { job: 'Apocalypse Event Planner', question: 'The world is ending in 48 hours. Plan the farewell party. Budget: unlimited.' },
    { job: 'Simulation Bug Reporter', question: 'You\'ve found a glitch in reality. File a detailed bug report.' },
    { job: 'Death\'s Personal Assistant', question: 'The Grim Reaper is behind schedule. How do you optimize their workflow?' },
    { job: 'Parallel Universe Travel Agent', question: 'A client wants to visit the universe where they made all the right choices. What\'s the return policy?' },
    { job: 'Sentient AI Rights Lawyer', question: 'Your client, a toaster, wants legal personhood. Present your opening argument.' },
    { job: 'Dream Hacker', question: 'A client\'s dreams keep defaulting to Windows 95 screensavers. Diagnose and fix.' },
    { job: 'Conspiracy Theory Auditor', question: 'Rate these conspiracy theories by plausibility: birds aren\'t real, the moon is a hologram, WiFi causes time travel.' },
    { job: 'Void Staring Instructor', question: 'A beginner client wants to learn to stare into the void. Cover safety precautions and best practices.' },
    { job: 'Gravity Compliance Officer', question: 'Someone has been reported for "aggressively defying gravity." Investigate.' },
    { job: 'Last Braincell Recruiter', question: 'You need to hire a replacement braincell for someone. What are the job requirements?' },
    { job: 'Timeline Repair Technician', question: 'Someone went back in time and taught dinosaurs to use fire. Assess the damage.' },
    { job: 'Interdimensional Customs Agent', question: 'A being from the 7th dimension wants to import "the concept of Tuesday." Allow or deny?' },
    { job: 'Meme Archaeologist', question: 'You\'ve discovered a meme from the year 3000. Describe and analyze its cultural significance.' },
    { job: 'Black Hole Customer Service', question: 'A customer complains their belongings were lost in a black hole. Process the claim.' },
    { job: 'Sleep Paralysis Demon Life Coach', question: 'Your client, a sleep paralysis demon, wants to pivot careers. What do you recommend?' },
    { job: 'Multiverse Quality Assurance', question: 'Universe #7,392 has a bug where gravity reverses every Thursday. Write the patch notes.' },
    { job: 'Free Will Auditor', question: 'A citizen claims they didn\'t make a choice — the simulation did. Investigate their claim.' },
    { job: 'Deja Vu Calibration Specialist', question: 'A client experiences deja vu every 30 seconds. Is this a feature or a bug?' },
    { job: 'Chaos Theory Consultant', question: 'A butterfly flapping its wings caused a hurricane AND a stock market crash. Your client is the butterfly. Defend them.' },
    { job: 'Afterlife Interior Designer', question: 'Design a waiting room for the afterlife. What magazines are on the table? What\'s the vibe?' },
    { job: 'Universal Uninstaller', question: 'You can uninstall one feature of the universe. What goes and what\'s the impact assessment?' },
  ],
};

export class AIInterviewGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'ai-interview',
      name: 'The AI Interview',
      rounds: 4,
      submissionTime: 60,
      votingTime: 30,
      minPlayers: 3,
      maxPlayers: 8,
    });
    this.usedQuestions = new Set();
  }

  async generatePrompt() {
    try {
      const raw = await getBellBotCommentary('generate_scenarios', {
        instruction: `Generate a wacky job interview scenario. Include a ridiculous job title and ONE interview question. Spice level: ${this.spiceLevel}.${this.getTopicHint() ? ` Topic area: ${this.getTopicHint()}.` : ''} The player will answer via voice recording or text. Return JSON.`,
        jsonFormat: '{"job": "job title", "question": "interview question"}',
      }, this.spiceLevel);
      const result = parseBellBotJSON(raw);
      if (result?.job && result?.question) {
        return { ...result, type: 'interview', instruction: `You're interviewing for: ${result.job}. Answer the question! 🎤` };
      }
    } catch { /* fallback */ }

    const pool = INTERVIEW_QS[this.spiceLevel] || INTERVIEW_QS[2];
    const available = pool.filter((_, i) => !this.usedQuestions.has(i));
    const list = available.length > 0 ? available : pool;
    const idx = Math.floor(Math.random() * list.length);
    this.usedQuestions.add(idx);
    const q = list[idx];
    return { ...q, type: 'interview', instruction: `You're interviewing for: ${q.job}. Answer the question! 🎤` };
  }

  validateSubmission(submission) {
    if (!submission) return { error: 'Answer the question!' };
    if (typeof submission === 'object' && submission.audio) {
      return { data: { audio: submission.audio, mimeType: submission.mimeType || 'audio/webm', text: submission.transcript || '' } };
    }
    const text = String(submission).trim().substring(0, 500);
    if (text.length < 5) return { error: 'Give a real answer!' };
    return { data: { text, audio: null } };
  }

  async getAIScores() {
    for (const [socketId, sub] of this.submissions) {
      try {
        if (sub.audio) {
          const analysis = await analyzeAudio(sub.audio, sub.mimeType || 'audio/webm',
            `You're the AI interviewer for the position of "${this.currentPrompt?.job}". The question was: "${this.currentPrompt?.question}". Rate this answer 0-500. Judge on: creativity, humor, confidence, and whether you'd hire this person. Return ONLY JSON: {"score": <0-500>, "comment": "<brief hiring decision>"}`
          );
          const result = parseBellBotJSON(analysis);
          this.aiScores.set(socketId, { score: Math.max(0, Math.min(500, result.score || 250)), comment: result.comment || '' });
          continue;
        }
      } catch { /* fallback below */ }

      // Text submission
      try {
        const raw = await getBellBotCommentary('judge', {
          gameName: this.gameName,
          playerName: this.players.get(socketId)?.name || 'Candidate',
          submission: sub.text || '[No answer]',
          prompt: `Interview for ${this.currentPrompt?.job}: "${this.currentPrompt?.question}"`,
        }, this.spiceLevel);
        const result = parseBellBotJSON(raw);
        this.aiScores.set(socketId, { score: Math.max(0, Math.min(500, result.score || 250)), comment: result.comment || '' });
      } catch {
        this.aiScores.set(socketId, { score: 250, comment: 'Interesting candidate...' });
      }
    }
  }

  getDefaultSubmission() { return { text: 'I plead the fifth.', audio: null }; }
  getSubmissionText(sub) { return sub.text || '[Audio Answer]'; }
}
