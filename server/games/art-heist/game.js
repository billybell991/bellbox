// Art Heist — Players describe stolen art, AI generates it, others match descriptions
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const ART_THEMES = {
  1: [
    'A painting of a cat wearing a crown sitting on a throne',
    'A sculpture made entirely of breakfast foods',
    'A mural showing animals having a pool party',
    'A portrait of a dog as a renaissance nobleman',
  ],
  2: [
    'A modern art piece that looks like your search history',
    'A painting that perfectly captures Monday morning energy',
    'Abstract art that represents the feeling of stepping on a Lego',
    'A painting of the world\'s worst selfie in museum-quality art style',
  ],
  3: [
    'A Renaissance painting of people doomscrolling on their phones',
    'A Banksy-style mural about the absurdity of NFTs',
    'An impressionist painting of an existential crisis at IKEA',
    'A surrealist painting where the Mona Lisa is your therapist',
  ],
};

export class ArtHeistGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'art-heist',
      name: 'Art Heist',
      rounds: 3,
      submissionTime: 60,
      votingTime: 30,
      minPlayers: 3,
      maxPlayers: 10,
    });
  }

  async generatePrompt() {
    try {
      const raw = await getBellBotCommentary('generate_prompt', {
        gameName: this.gameName,
        count: 1,
        description: 'Players write the most creative/funny description of a fictional stolen artwork. The best description wins — imagine you\'re writing a museum placard for the world\'s weirdest art.',
        extra: `Spice level: ${this.spiceLevel}.${this.getTopicHint() ? ` Topic area: ${this.getTopicHint()}.` : ''} Generate ONE art theme/style constraint. Players will describe a fictional artwork within this theme.`,
      }, this.spiceLevel);
      const prompts = parseBellBotJSON(raw);
      if (prompts?.[0]) return { text: prompts[0], type: 'art-heist', instruction: 'Describe the stolen masterpiece! Be vivid and creative! 🎨🔍' };
    } catch { /* fallback */ }

    const pool = ART_THEMES[this.spiceLevel] || ART_THEMES[2];
    const theme = pool[Math.floor(Math.random() * pool.length)];
    return { text: theme, type: 'art-heist', instruction: 'Describe this stolen masterpiece in your own words! 🎨🔍' };
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 400);
    if (text.length < 15) return { error: 'Describe the art more!' };
    return { data: text };
  }

  getDefaultSubmission() { return 'It was a painting. Of something. In colors. Very art.'; }
  getSubmissionText(sub) { return sub; }
}
