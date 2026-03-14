// The Honorable Bot — AI judge, players present their case for absurd laws
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const LAWS = {
  1: [
    'All pets must wear hats on Tuesdays',
    'Laughing in public is now mandatory — minimum 30 seconds per hour',
    'Every household must own at least one rubber duck',
    'Dessert must be served BEFORE the main course',
    'Everyone must walk backwards on the first day of each month',
    'All meetings must begin with a group high-five',
    'Every student gets a mandatory 2-hour recess',
    'Cars must honk a musical tune instead of a regular honk',
    'All adults must carry a teddy bear for emotional support',
    'Birthday celebrations are required to last a minimum of 3 days',
    'Parks must have mandatory nap zones with hammocks',
    'Everyone gets a personal theme song that plays when they enter a room',
    'All elevators must have a dance floor and disco ball',
    'Schools are required to teach a class on building pillow forts',
    'Every Friday is officially Pajama Day at all workplaces',
    'All sports commentators must speak only in rhymes',
    'Every neighborhood must have a community treehouse',
    'Ice cream is a recognized food group',
    'All government documents must include at least one fun fact',
    'Dogs are allowed in movie theaters if they don\'t bark during the movie',
    'Everyone gets one free "skip this day" pass per month',
    'All fences must have a secret door in them',
    'Singing in the shower is a constitutionally protected right',
    'Every town must have a dedicated pillow fight arena',
    'All clocks must include a "fun o\'clock" between 3 and 4 PM',
  ],
  2: [
    'Reply-all emails are now a misdemeanor',
    'Taking selfies at national monuments carries a 24-hour phone ban',
    'Ghosting someone after 3 dates is a civil offense',
    'Talking during movies will result in public shaming via loudspeaker',
    'Not refilling the coffee pot is grounds for office eviction',
    'Using "per my last email" passive-aggressively is classified as emotional assault',
    'Leaving one item in the fridge for weeks is now considered squatting',
    'Reclined airplane seats are banned on flights under 4 hours',
    'All passive-aggressive Post-it notes must be reviewed by HR first',
    'Group chats with more than 20 unread messages are a civil rights violation',
    'Bringing smelly food to the office is punishable by desk relocation to the parking lot',
    'People who say "I\'m not a regular parent, I\'m a cool parent" must pass a vibe check',
    'Spoiling a TV show within 48 hours of release is a felony',
    'Talking on speakerphone in public is grounds for phone confiscation',
    'Not waving when someone lets you merge is road rage instigation',
    'Playing music out loud on public transit is an act of sonic terrorism',
    'Standing in the left side of the escalator is now a ticketable offense',
    'Inviting someone to an event via Facebook only counts if you also text them',
    '"New phone, who dis?" is no longer a valid excuse after the third time',
    'Double-texting before getting a reply is considered emotional harassment',
    'Showing up unannounced is equivalent to mild breaking and entering',
    'Using more than 5 exclamation points in one email is classified as mania',
    'Canceling plans within 2 hours of the event is a finable offense',
    'Reading someone\'s screen over their shoulder is a privacy violation',
    'Sending a voice message longer than 60 seconds is a crime against humanity',
  ],
  3: [
    'All karaoke must be performed in interpretive dance — vocals are BANNED',
    'Anyone caught using Comic Sans in a professional document faces trial by peers',
    'It is now illegal to microwave fish in a shared kitchen — penalty: eating the fish raw',
    'All political debates must be conducted entirely in limericks',
    'Mansplaining is now a ticketable offense — the victim gets to set the fine',
    'Anyone who says "I\'m not a regular [X], I\'m a cool [X]" must wear a dunce cap for 24 hours',
    'All arguments must be settled by a coin flip performed by a trained monkey',
    'Siri and Alexa are granted legal personhood and can sue for verbal abuse',
    'Anyone who starts a sentence with "Well, actually" must do 10 pushups immediately',
    'All conspiracy theories must be submitted in peer-reviewed paper format',
    'The words "synergy" and "pivot" are banned from corporate use under penalty of karaoke',
    'All bad puns must be registered with a national pun database',
    'Anyone who clips their nails in public gets 48 hours of mandatory mime school',
    'Correcting someone\'s grammar on the internet is considered an act of war',
    'The phrase "it is what it is" is now classified as a philosophical doctrine requiring a license to use',
    'All LinkedIn motivational posts must end with "and then I woke up"',
    'People who stand too close in line become responsible for the person in front\'s emotional wellbeing',
    'Complaining about Mondays is only permitted with a valid Monday Complaint License',
    'Anyone who peaks in high school must publicly acknowledge it at the 10-year reunion',
    'All cat videos must be accompanied by a 500-word essay on their cultural significance',
    'Using the word "actually" more than 3 times per conversation triggers an automatic debate',
    'Eating someone else\'s clearly labeled food from the fridge is grounds for exile',
    'All humble-brags must be preceded by an air horn sound',
    'Parking over the line counts as a declaration of interpersonal war',
    'Taking more than 3 samples at Costco without buying anything is petty theft',
  ],
};

export class HonorableBotGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'honorable-bot',
      name: 'The Honorable Bot',
      rounds: 4,
      submissionTime: 60,
      votingTime: 30,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.usedLaws = new Set();
  }

  async generatePrompt() {
    try {
      const raw = await getBellBotCommentary('generate_prompt', {
        gameName: this.gameName,
        count: 1,
        description: 'Players must argue FOR or AGAINST an absurd proposed law in front of the AI judge (BellBot). Write your most persuasive legal argument.',
        extra: `Spice level: ${this.spiceLevel}. Generate ONE absurd law/rule that could be debated. Make it specific and funny. Players will argue either FOR or AGAINST it.`,
      }, this.spiceLevel);
      const prompts = parseBellBotJSON(raw);
      if (prompts?.[0]) return { text: prompts[0], type: 'law', instruction: 'Present your case, counselor! Argue FOR or AGAINST this law! ⚖️' };
    } catch { /* fallback */ }

    const pool = LAWS[this.spiceLevel] || LAWS[2];
    const available = pool.filter(l => !this.usedLaws.has(l));
    const list = available.length > 0 ? available : pool;
    const law = list[Math.floor(Math.random() * list.length)];
    this.usedLaws.add(law);
    return { text: law, type: 'law', instruction: 'Present your case, counselor! Argue FOR or AGAINST this law! ⚖️' };
  }

  validateSubmission(submission) {
    if (!submission || typeof submission !== 'object') {
      const text = String(submission).trim().substring(0, 500);
      if (text.length < 10) return { error: 'Present a real argument!' };
      return { data: { side: 'for', argument: text } };
    }
    const side = submission.side === 'against' ? 'against' : 'for';
    const argument = String(submission.argument || '').trim().substring(0, 500);
    if (argument.length < 10) return { error: 'Your argument needs more substance!' };
    return { data: { side, argument } };
  }

  getDefaultSubmission() { return { side: 'for', argument: 'Your Honor, I plead no contest.' }; }
  getSubmissionText(sub) { return `[${(sub.side || 'for').toUpperCase()}] ${sub.argument}`; }
}
