// Dead Giveaway — One player has a secret, others ask questions to find it
import { BaseGame, STATES } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const SECRETS = {
  1: [
    'You secretly hate chocolate',
    'You\'ve never seen any Star Wars movie',
    'You sleep with a nightlight',
    'You can\'t ride a bicycle',
    'You think pizza is overrated',
    'You still believe in the tooth fairy',
    'You have never successfully cooked rice',
    'You are afraid of butterflies',
    'You eat cereal with water instead of milk',
    'You have memorized every lyric to a Disney musical',
    'You talk to your houseplants by name every morning',
    'You secretly enjoy doing math homework',
    'You have never been on a roller coaster',
    'You can\'t snap your fingers',
    'You eat the stickers on fruit sometimes',
    'You secretly like pineapple on pizza',
    'You pretend to know how football works',
    'You are terrified of mascots in costume',
    'You sleep with your socks on',
    'You have cried watching a commercial for dog food',
    'You secretly think cats are plotting world domination',
    'You always eat the bread crust first',
    'You have an imaginary friend you still talk to',
    'You\'re scared of the dark but won\'t admit it',
    'You don\'t know how to whistle despite years of trying',
  ],
  2: [
    'You\'ve been fired from a job for something ridiculous',
    'You have a secret celebrity crush you\'d never admit to',
    'You once pretended to speak a foreign language for an entire dinner party',
    'You\'ve accidentally gone on a date with someone thinking it was a job interview',
    'You have a hidden talent you\'re embarrassed about',
    'You have stalked an ex\'s social media so hard you accidentally liked a photo from 2017',
    'You once called your boss "mom" in a meeting',
    'You practice conversations in the mirror before social events',
    'You have a burner social media account for your questionable opinions',
    'You once went to a party and hid in the bathroom for 45 minutes',
    'You have eaten food that fell on the floor at a restaurant',
    'You have pretended to receive a phone call to escape a conversation',
    'You cried watching a reality TV show and told no one',
    'You have an extremely detailed spreadsheet tracking your Uber ratings',
    'You once got caught talking to yourself by a coworker and pretended it was a Bluetooth call',
    'You secretly enjoy the smell of gasoline',
    'You have memorized the WiFi password of every place you\'ve ever visited',
    'You have a saved folder of memes you\'ve never actually sent to anyone',
    'You once wore the same outfit two days in a row and hoped nobody noticed',
    'You have googled "am I normal" more than once this week',
    'You once accidentally texted your boss a message meant for your therapist',
    'You rate your own outfits in a private spreadsheet',
    'You\'ve cried in a work bathroom more than once this quarter',
    'You have lied about watching a show just to join a conversation about it',
    'You have a playlist called "sad" that you listen to regularly',
  ],
  3: [
    'You\'re secretly three kids in a trenchcoat pretending to be an adult',
    'You\'ve been living a double life as a competitive cheese sculptor',
    'You once accidentally joined a cult and stayed for the snacks',
    'Your "yoga retreat" was actually 2 weeks in a bunker preparing for the apocalypse',
    'You\'re legally not allowed within 500 feet of a particular Denny\'s and you won\'t say why',
    'You are personally responsible for two Wikipedia edit wars',
    'You have a shrine to a fast food mascot in your closet',
    'You\'ve been communicating with a raccoon you believe to be sentient',
    'You sold your soul but the buyer gave you a poor Yelp review',
    'You once sleep-walked into a stranger\'s house and made yourself a sandwich',
    'You believe you were abducted by aliens and they were surprisingly polite',
    'You started a conspiracy theory as a joke and now people believe it',
    'You have a secret room in your house dedicated to your collection of traffic cones',
    'You have been banned from three separate IKEA locations worldwide',
    'You once won an argument with a goat and you still bring it up',
    'You have a detailed escape plan from every building you enter',
    'You are in a committed long-term relationship with your weighted blanket',
    'Your Roomba has a name, a backstory, and its own social media account',
    'You have a rivalry with a neighborhood bird that you are losing',
    'You have written fan fiction about your own life but in a better timeline',
    'You once convinced a stranger you were a time traveler and they believed you for weeks',
    'You ate an entire cake at 3 AM and blamed the cat even though you live alone',
    'You have been secretly learning to swordfight and practicing with a broomstick',
    'You keep a burn book about your coworkers but it\'s written in emoji',
    'You have had a full conversation with a chatbot and felt genuinely understood',
  ],
};

export class DeadGiveawayGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'dead-giveaway',
      name: 'Dead Giveaway',
      rounds: 3,
      submissionTime: 60,
      votingTime: 40,
      minPlayers: 4,
      maxPlayers: 10,
    });
    this.secretHolder = null;
    this.currentSecret = null;
  }

  async startNextRound() {
    this.round++;
    if (this.round > this.totalRounds) return this.endGame();

    this.submissions.clear();
    this.votes.clear();
    this.aiScores.clear();
    for (const [, p] of this.players) { p.submitted = false; p.voted = false; }

    // Pick who has the secret
    this.secretHolder = this.playerOrder[Math.floor(Math.random() * this.playerOrder.length)];

    const pool = SECRETS[this.spiceLevel] || SECRETS[2];
    this.currentSecret = pool[Math.floor(Math.random() * pool.length)];

    this.state = STATES.SUBMISSION;
    this.currentPrompt = {
      text: 'Someone has a SECRET. Everyone writes a response to a personal question — one person is lying!',
      question: 'Tell us an interesting fact about yourself.',
      type: 'dead-giveaway',
      instruction: 'Answer the question honestly... unless YOU have the secret!',
    };

    return {
      state: STATES.SUBMISSION,
      round: this.round,
      totalRounds: this.totalRounds,
      prompt: this.currentPrompt,
      timeLimit: this.submissionTime,
      players: this.getPlayerList(),
      scores: this.getScores(),
      bellbotSays: `Round ${this.round}! One of you has a dirty secret... 🕵️ Answer the question, but the secret-keeper must BLUFF!`,
    };
  }

  getState(socketId) {
    const base = super.getState(socketId);
    base.isSecretHolder = socketId === this.secretHolder;
    if (socketId === this.secretHolder) {
      base.secret = this.currentSecret;
      base.prompt = {
        ...base.prompt,
        instruction: `YOUR SECRET: "${this.currentSecret}". Write an answer that hides this! Don't get caught! 🤫`,
      };
    }
    return base;
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 300);
    if (text.length < 5) return { error: 'Write more!' };
    return { data: text };
  }

  async tallyScores() {
    const voteCounts = new Map();
    for (const [, targetId] of this.votes) {
      voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
    }

    const totalVoters = this.votes.size || 1;
    const secretHolderVotes = voteCounts.get(this.secretHolder) || 0;
    const caught = secretHolderVotes > totalVoters / 2;

    const roundScores = [];
    for (const id of this.playerOrder) {
      const player = this.players.get(id);
      let points = 0;

      if (id === this.secretHolder) {
        points = caught ? 100 : 500;
      } else {
        points = this.votes.get(id) === this.secretHolder ? 400 : 100;
      }

      player.score += points;
      roundScores.push({
        id, name: player.name,
        aiScore: 0, voteScore: points, roundTotal: points,
        cumulativeScore: player.score,
        aiComment: id === this.secretHolder
          ? (caught ? 'Busted! 🚨' : 'Smooth operator! 🎭')
          : (this.votes.get(id) === this.secretHolder ? 'Detective skills! 🔍' : 'Wrong suspect! 😅'),
      });
    }

    roundScores.sort((a, b) => b.roundTotal - a.roundTotal);
    this.state = this.round >= this.totalRounds ? STATES.GAME_OVER : STATES.ROUND_END;

    const secretHolderName = this.players.get(this.secretHolder)?.name;
    return {
      state: this.state, round: this.round, roundScores,
      leaderboard: this.getScores(),
      secretHolder: secretHolderName,
      secret: this.currentSecret,
      caught,
      bellbotSays: caught
        ? `${secretHolderName} has been EXPOSED! Their secret: "${this.currentSecret}" 🚨`
        : `${secretHolderName} fooled everyone! Secret: "${this.currentSecret}" 🎭`,
      gameOver: this.state === STATES.GAME_OVER,
    };
  }

  getDefaultSubmission() { return 'I prefer not to answer on the grounds that it may incriminate me.'; }
  getSubmissionText(sub) { return sub; }
}
