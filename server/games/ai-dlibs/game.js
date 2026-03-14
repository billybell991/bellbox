// AI-Dlibs — Mad Libs-style stories where players fill in the blanks
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const STORY_TEMPLATES = {
  1: [
    { story: 'Once upon a time, a [ADJECTIVE] [ANIMAL] decided to [VERB] all the way to [PLACE]. Along the way, it found a magic [OBJECT] that could [SUPERPOWER]. The end was [EMOTION]!', blanks: ['ADJECTIVE', 'ANIMAL', 'VERB', 'PLACE', 'OBJECT', 'SUPERPOWER', 'EMOTION'] },
    { story: 'Breaking News: Scientists discover that eating [FOOD] makes you [ADJECTIVE]! Experts recommend [NUMBER] servings per day. Side effects include [SIDE_EFFECT] and an uncontrollable urge to [VERB].', blanks: ['FOOD', 'ADJECTIVE', 'NUMBER', 'SIDE_EFFECT', 'VERB'] },
    { story: 'Dear Diary, today my [FAMILY_MEMBER] taught me how to [VERB]. We used a [OBJECT] and a [ANIMAL]. It was the most [ADJECTIVE] day of my life!', blanks: ['FAMILY_MEMBER', 'VERB', 'OBJECT', 'ANIMAL', 'ADJECTIVE'] },
    { story: 'The weather forecast today calls for [ADJECTIVE] skies with a chance of [FOOD]. Residents are advised to bring a [OBJECT] and wear [CLOTHING]. Temperatures will reach [NUMBER] degrees.', blanks: ['ADJECTIVE', 'FOOD', 'OBJECT', 'CLOTHING', 'NUMBER'] },
    { story: 'Welcome to [PLACE]! Our town is famous for its [ADJECTIVE] [ANIMAL]s and the annual [VERB]-ing festival. Don\'t forget to try our world-famous [FOOD]!', blanks: ['PLACE', 'ADJECTIVE', 'ANIMAL', 'VERB', 'FOOD'] },
    { story: 'In a land far away, a brave [ANIMAL] set out to find the legendary [OBJECT]. Armed with only a [WEAPON] and a [FOOD], our hero [VERB]ed through the [ADJECTIVE] forest.', blanks: ['ANIMAL', 'OBJECT', 'WEAPON', 'FOOD', 'VERB', 'ADJECTIVE'] },
    { story: 'Recipe for Success: Start with 2 cups of [EMOTION]. Add a pinch of [ADJECTIVE] [FOOD]. Stir in [NUMBER] tablespoons of [VERB]-ing. Bake at [NUMBER2] degrees until [ADJECTIVE2].', blanks: ['EMOTION', 'ADJECTIVE', 'FOOD', 'NUMBER', 'VERB', 'NUMBER2', 'ADJECTIVE2'] },
    { story: 'The school play was about a [ADJECTIVE] [ANIMAL] who discovered a [OBJECT] in the [PLACE]. The audience was so [EMOTION] that they started [VERB]-ing.', blanks: ['ADJECTIVE', 'ANIMAL', 'OBJECT', 'PLACE', 'EMOTION', 'VERB'] },
    { story: 'Field Trip Report: We visited [PLACE] and learned about [ADJECTIVE] [ANIMAL]s. The best part was when [PERSON] accidentally [VERB]ed into a pile of [FOOD].', blanks: ['PLACE', 'ADJECTIVE', 'ANIMAL', 'PERSON', 'VERB', 'FOOD'] },
    { story: 'NASA announced today that they found [ADJECTIVE] [ANIMAL]s on [PLANET]. The creatures communicate by [VERB]-ing and eat exclusively [FOOD]. Scientists are [EMOTION].', blanks: ['ADJECTIVE', 'ANIMAL', 'PLANET', 'VERB', 'FOOD', 'EMOTION'] },
    { story: 'The [ADJECTIVE] Detective solved the mystery of the missing [OBJECT]. It was hidden inside a [FOOD] at [PLACE]. The culprit was a [ANIMAL] wearing a [CLOTHING].', blanks: ['ADJECTIVE', 'OBJECT', 'FOOD', 'PLACE', 'ANIMAL', 'CLOTHING'] },
    { story: 'My new pet [ANIMAL] has a talent for [VERB]-ing. It learned by watching [NUMBER] hours of [TV_SHOW]. Now it wants to be a professional [JOB].', blanks: ['ANIMAL', 'VERB', 'NUMBER', 'TV_SHOW', 'JOB'] },
  ],
  2: [
    { story: 'URGENT MEMO: All employees must stop [VERB]-ing in the [ROOM]. HR has received [NUMBER] complaints about [ADJECTIVE] behavior near the [OBJECT]. Violators will be forced to [PUNISHMENT].', blanks: ['VERB', 'ROOM', 'NUMBER', 'ADJECTIVE', 'OBJECT', 'PUNISHMENT'] },
    { story: 'My Tinder bio: I\'m a [ADJECTIVE] [JOB_TITLE] who loves [HOBBY] and long walks to [PLACE]. Looking for someone who can handle my [PERSONALITY_TRAIT] and my [NUMBER] [ANIMAL]s.', blanks: ['ADJECTIVE', 'JOB_TITLE', 'HOBBY', 'PLACE', 'PERSONALITY_TRAIT', 'NUMBER', 'ANIMAL'] },
    { story: 'This workout is called "The [CELEBRITY]." First, [VERB] for [NUMBER] minutes. Then, hold a [OBJECT] over your head while singing [SONG]. Finish by [ABSURD_ACTION]. Guaranteed to make you [ADJECTIVE]!', blanks: ['CELEBRITY', 'VERB', 'NUMBER', 'OBJECT', 'SONG', 'ABSURD_ACTION', 'ADJECTIVE'] },
    { story: 'Your horoscope: The stars say you\'ll encounter a [ADJECTIVE] [PERSON] at [PLACE]. Avoid [VERB]-ing near any [OBJECT]. Lucky number: [NUMBER]. Unlucky food: [FOOD].', blanks: ['ADJECTIVE', 'PERSON', 'PLACE', 'VERB', 'OBJECT', 'NUMBER', 'FOOD'] },
    { story: 'Breaking: Local [JOB_TITLE] arrested for [VERB]-ing in [PLACE]. Witnesses described the incident as "[ADJECTIVE]." The suspect was found carrying [NUMBER] [OBJECT]s and wearing [CLOTHING].', blanks: ['JOB_TITLE', 'VERB', 'PLACE', 'ADJECTIVE', 'NUMBER', 'OBJECT', 'CLOTHING'] },
    { story: 'Dear Landlord, the apartment has a [ADJECTIVE] [ANIMAL] in the [ROOM] again. I\'ve been handling it by [VERB]-ing but it recently started [ANNOYING_HABIT]. Help.', blanks: ['ADJECTIVE', 'ANIMAL', 'ROOM', 'VERB', 'ANNOYING_HABIT'] },
    { story: 'The office party theme this year is "[ADJECTIVE] [NOUN] Night." Please bring a [FOOD] and wear [CLOTHING]. Last year\'s theme resulted in [NUMBER] complaints and one [NOUN2].', blanks: ['ADJECTIVE', 'NOUN', 'FOOD', 'CLOTHING', 'NUMBER', 'NOUN2'] },
    { story: 'My therapist told me to start [VERB]-ing more and stop [VERB2]-ing. I told them my biggest fear is [FEAR] and they said "That explains the [ADJECTIVE] [ANIMAL] dream."', blanks: ['VERB', 'VERB2', 'FEAR', 'ADJECTIVE', 'ANIMAL'] },
    { story: 'Job Application Cover Letter: I am a [ADJECTIVE] individual with [NUMBER] years of experience in [HOBBY]. My greatest weakness is [WEAKNESS]. References include [CELEBRITY] and a [ANIMAL].', blanks: ['ADJECTIVE', 'NUMBER', 'HOBBY', 'WEAKNESS', 'CELEBRITY', 'ANIMAL'] },
    { story: 'The worst Airbnb review: "The [ROOM] smelled like [FOOD]. The host made us [VERB] before entering. Found a [OBJECT] in the shower. [NUMBER] stars — the [ANIMAL] was friendly though."', blanks: ['ROOM', 'FOOD', 'VERB', 'OBJECT', 'NUMBER', 'ANIMAL'] },
    { story: 'My autobiography is titled "[ADJECTIVE] [NOUN]: A Story of [EMOTION]." Chapter 1 begins with me [VERB]-ing at [PLACE] while holding a [OBJECT].', blanks: ['ADJECTIVE', 'NOUN', 'EMOTION', 'VERB', 'PLACE', 'OBJECT'] },
    { story: 'Text from unknown number: "Hey, you left your [OBJECT] at the [PLACE] last night. Also your [ANIMAL] won\'t stop [VERB]-ing. Come get it or I\'m calling [CELEBRITY]."', blanks: ['OBJECT', 'PLACE', 'ANIMAL', 'VERB', 'CELEBRITY'] },
  ],
  3: [
    { story: 'LEAKED: The government has been secretly [VERB]-ing our [BODY_PART]s since [YEAR]. Their weapon? [OBJECT]s disguised as [FOOD]. The only defense is wearing [CLOTHING] made of [MATERIAL].', blanks: ['VERB', 'BODY_PART', 'YEAR', 'OBJECT', 'FOOD', 'CLOTHING', 'MATERIAL'] },
    { story: 'My therapist said I need to stop [VERB]-ing and start [VERB2]-ing. I told her my [ANIMAL] started it. She [REACTION] and charged me [NUMBER] dollars for the [ADJECTIVE] session.', blanks: ['VERB', 'VERB2', 'ANIMAL', 'REACTION', 'NUMBER', 'ADJECTIVE'] },
    { story: 'If elected president, I promise to replace all [OBJECT]s with [FOOD], make [DAY] a national holiday, and require every citizen to [VERB] at least [NUMBER] times per day. My campaign slogan: "[SLOGAN]"', blanks: ['OBJECT', 'FOOD', 'DAY', 'VERB', 'NUMBER', 'SLOGAN'] },
    { story: 'Alien transmission decoded: "Dear humans, we\'ve been watching you [VERB] for [NUMBER] years. It\'s [ADJECTIVE]. Please stop putting [FOOD] on your [BODY_PART]s. Sincerely, [ALIEN_NAME]."', blanks: ['VERB', 'NUMBER', 'ADJECTIVE', 'FOOD', 'BODY_PART', 'ALIEN_NAME'] },
    { story: 'The simulation crashed because someone tried to [VERB] a [OBJECT] inside a [ANIMAL]. Error code: [NUMBER]. Recommended fix: [ABSURD_ACTION]. Time until reality restarts: [TIME].', blanks: ['VERB', 'OBJECT', 'ANIMAL', 'NUMBER', 'ABSURD_ACTION', 'TIME'] },
    { story: 'God\'s to-do list for today: 1. Make the sunrise [ADJECTIVE]. 2. Let [NUMBER] [ANIMAL]s loose in [PLACE]. 3. Finally explain why [FOOD] exists. 4. [VERB] and call it a day.', blanks: ['ADJECTIVE', 'NUMBER', 'ANIMAL', 'PLACE', 'FOOD', 'VERB'] },
    { story: 'CIA classified briefing: Agent [CODENAME] discovered that [CELEBRITY] has been [VERB]-ing [ANIMAL]s in [PLACE]. Operation "[ADJECTIVE] [FOOD]" is now active. Budget: $[NUMBER].', blanks: ['CODENAME', 'CELEBRITY', 'VERB', 'ANIMAL', 'PLACE', 'ADJECTIVE', 'FOOD', 'NUMBER'] },
    { story: 'Wikipedia article: The Great [NOUN] of [YEAR] occurred when [NUMBER] [ANIMAL]s simultaneously [VERB]ed in [PLACE]. Historians call it "[ADJECTIVE]." Survivors reported smelling [FOOD].', blanks: ['NOUN', 'YEAR', 'NUMBER', 'ANIMAL', 'VERB', 'PLACE', 'ADJECTIVE', 'FOOD'] },
    { story: 'Your sleep paralysis demon left you a note: "Hey, I\'ve been [VERB]-ing your [OBJECT] while you sleep. Don\'t worry, I also fed your [ANIMAL]. P.S. Your [BODY_PART] does a [ADJECTIVE] thing at 3am."', blanks: ['VERB', 'OBJECT', 'ANIMAL', 'BODY_PART', 'ADJECTIVE'] },
    { story: 'News Flash: A [ADJECTIVE] portal opened in [PLACE] and released [NUMBER] [ANIMAL]s wearing [CLOTHING]. Scientists recommend [VERB]-ing immediately. The President responded by eating [FOOD].', blanks: ['ADJECTIVE', 'PLACE', 'NUMBER', 'ANIMAL', 'CLOTHING', 'VERB', 'FOOD'] },
    { story: 'Terms of Service update: By existing, you agree to [VERB] whenever [CELEBRITY] commands it. Your [BODY_PART] is now property of [COMPANY]. Opt out by [ABSURD_ACTION].', blanks: ['VERB', 'CELEBRITY', 'BODY_PART', 'COMPANY', 'ABSURD_ACTION'] },
    { story: 'Autopsy of the universe: Cause of death: [ADJECTIVE] [VERB]-ing. Last meal: [FOOD]. Found in possession of: [NUMBER] [OBJECT]s and a note that read "[LAST_WORDS]."', blanks: ['ADJECTIVE', 'VERB', 'FOOD', 'NUMBER', 'OBJECT', 'LAST_WORDS'] },
  ],
};

export class AIDlibsGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'ai-dlibs',
      name: 'AI-Dlibs',
      rounds: 4,
      submissionTime: 45,
      votingTime: 30,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.usedTemplates = new Set();
    this.currentTemplate = null;
  }

  async generatePrompt() {
    // Try AI-generated template
    try {
      const raw = await getBellBotCommentary('generate_scenarios', {
        instruction: `Generate a funny Mad Libs-style story template with 5-7 blanks. Spice level: ${this.spiceLevel}. Use square brackets for blanks like [NOUN], [VERB], [ADJECTIVE] etc. Return JSON with "story" (the template string) and "blanks" (array of blank label strings).`,
        jsonFormat: '{"story": "...", "blanks": ["NOUN", "VERB", ...]}',
      }, this.spiceLevel);
      const template = parseBellBotJSON(raw);
      if (template?.story && template?.blanks?.length) {
        this.currentTemplate = template;
        return { blanks: template.blanks, type: 'ai-dlibs', instruction: 'Fill in the blanks! The funnier the better!' };
      }
    } catch { /* fallback */ }

    const pool = STORY_TEMPLATES[this.spiceLevel] || STORY_TEMPLATES[2];
    const available = pool.filter((_, i) => !this.usedTemplates.has(i));
    const list = available.length > 0 ? available : pool;
    const idx = Math.floor(Math.random() * list.length);
    this.currentTemplate = list[idx];
    this.usedTemplates.add(idx);
    return { blanks: list[idx].blanks, type: 'ai-dlibs', instruction: 'Fill in the blanks! The funnier the better!' };
  }

  validateSubmission(submission) {
    if (!submission || typeof submission !== 'object') return { error: 'Fill in the blanks!' };
    const blanks = this.currentTemplate?.blanks || [];
    const filled = {};
    for (const blank of blanks) {
      const val = String(submission[blank] || '').trim().substring(0, 50);
      if (!val) return { error: `Fill in [${blank}]!` };
      filled[blank] = val;
    }
    return { data: filled };
  }

  /** Build the complete story from filled blanks */
  getSubmissionText(sub) {
    if (!this.currentTemplate) return JSON.stringify(sub);
    let story = this.currentTemplate.story;
    for (const [key, val] of Object.entries(sub)) {
      story = story.replace(`[${key}]`, val);
    }
    return story;
  }

  getDefaultSubmission() {
    const blanks = this.currentTemplate?.blanks || [];
    const defaults = {};
    for (const b of blanks) defaults[b] = 'something';
    return defaults;
  }
}
