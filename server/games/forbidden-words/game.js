// Forbidden Words — Taboo-style game
// One player describes a word without using forbidden words, others guess
import { BaseGame } from '../../base-game.js';
import { getBellBotCommentary, parseBellBotJSON } from '../../bellbot.js';

const WORD_SETS = {
  1: [
    { word: 'Birthday Party', forbidden: ['cake', 'candle', 'present', 'age'] },
    { word: 'Roller Coaster', forbidden: ['ride', 'fast', 'loop', 'scream'] },
    { word: 'Pizza', forbidden: ['cheese', 'slice', 'Italian', 'pepperoni'] },
    { word: 'Superhero', forbidden: ['cape', 'power', 'villain', 'save'] },
    { word: 'Swimming Pool', forbidden: ['water', 'swim', 'dive', 'deep'] },
    { word: 'Camping', forbidden: ['tent', 'fire', 'outdoor', 'nature'] },
    { word: 'Ice Cream', forbidden: ['cold', 'cone', 'flavor', 'scoop'] },
    { word: 'Library', forbidden: ['book', 'read', 'quiet', 'shelf'] },
    { word: 'Airplane', forbidden: ['fly', 'pilot', 'wing', 'sky'] },
    { word: 'Halloween', forbidden: ['costume', 'candy', 'scary', 'pumpkin'] },
    { word: 'Dinosaur', forbidden: ['extinct', 'fossil', 'big', 'reptile'] },
    { word: 'Astronaut', forbidden: ['space', 'moon', 'rocket', 'float'] },
    { word: 'Breakfast', forbidden: ['morning', 'egg', 'cereal', 'toast'] },
    { word: 'Doctor', forbidden: ['sick', 'medicine', 'hospital', 'health'] },
    { word: 'Guitar', forbidden: ['string', 'music', 'play', 'strum'] },
  ],
  2: [
    { word: 'Netflix and Chill', forbidden: ['stream', 'movie', 'relax', 'watch', 'show'] },
    { word: 'Walk of Shame', forbidden: ['morning', 'walk', 'night', 'embarrass'] },
    { word: 'Procrastination', forbidden: ['delay', 'later', 'lazy', 'avoid', 'work'] },
    { word: 'Road Rage', forbidden: ['angry', 'drive', 'car', 'traffic', 'horn'] },
    { word: 'Hangover', forbidden: ['drunk', 'alcohol', 'morning', 'headache'] },
    { word: 'FOMO', forbidden: ['miss', 'out', 'fear', 'party', 'social'] },
    { word: 'Ghosting', forbidden: ['ignore', 'text', 'disappear', 'message'] },
    { word: 'Influencer', forbidden: ['social', 'media', 'follow', 'post', 'brand'] },
    { word: 'Adulting', forbidden: ['grown', 'adult', 'responsible', 'bills'] },
    { word: 'Awkward Silence', forbidden: ['quiet', 'uncomfortable', 'pause', 'talk'] },
    { word: 'Speed Dating', forbidden: ['fast', 'date', 'meet', 'minute', 'single'] },
    { word: 'Binge Watching', forbidden: ['show', 'series', 'watch', 'episode', 'marathon'] },
    { word: 'Online Shopping', forbidden: ['buy', 'internet', 'cart', 'Amazon', 'order'] },
    { word: 'Dad Joke', forbidden: ['funny', 'pun', 'laugh', 'groan', 'father'] },
    { word: 'Autocorrect', forbidden: ['phone', 'text', 'wrong', 'spell', 'type'] },
  ],
  3: [
    { word: 'Walk of Shame', forbidden: ['morning', 'walk', 'night', 'embarrass', 'home'] },
    { word: 'Booty Call', forbidden: ['late', 'night', 'call', 'text', 'hookup'] },
    { word: 'Skinny Dipping', forbidden: ['naked', 'swim', 'water', 'clothes', 'dare'] },
    { word: 'Walk of Shame', forbidden: ['morning', 'last', 'night', 'outfit', 'home'] },
    { word: 'Mile High Club', forbidden: ['airplane', 'fly', 'join', 'club', 'sky'] },
    { word: 'Beer Goggles', forbidden: ['drunk', 'attractive', 'alcohol', 'see', 'bar'] },
    { word: 'Walk In On', forbidden: ['catch', 'door', 'surprise', 'room', 'embarrass'] },
    { word: 'Catfish', forbidden: ['fake', 'online', 'dating', 'profile', 'lie'] },
    { word: 'Sugar Daddy', forbidden: ['money', 'old', 'rich', 'pay', 'relationship'] },
    { word: 'Walk of Shame Breakfast', forbidden: ['morning', 'food', 'diner', 'regret', 'hangover'] },
    { word: 'Situationship', forbidden: ['relationship', 'dating', 'label', 'casual', 'complicated'] },
    { word: 'Plot Twist', forbidden: ['surprise', 'unexpected', 'story', 'reveal', 'twist'] },
    { word: 'Side Hustle', forbidden: ['job', 'extra', 'money', 'work', 'gig'] },
    { word: 'Guilty Pleasure', forbidden: ['secret', 'enjoy', 'ashamed', 'like', 'admit'] },
    { word: 'Panic Attack', forbidden: ['anxiety', 'stress', 'breathe', 'fear', 'heart'] },
  ],
};

export class ForbiddenWordsGame extends BaseGame {
  constructor(roomCode) {
    super(roomCode, {
      id: 'forbidden-words',
      name: 'Forbidden Words',
      rounds: 4,
      submissionTime: 45,
      votingTime: 0,
      minPlayers: 3,
      maxPlayers: 10,
    });
    this.usedWords = new Set();
    this.currentWord = null;
    this.currentForbidden = [];
    this.describerId = null;
    this.describerIndex = 0;
  }

  async generatePrompt() {
    // Rotate describer through non-bot players first, then bots
    const realPlayers = this.playerOrder.filter(id => !id.startsWith('ai-bot-'));
    const describerPool = realPlayers.length > 0 ? realPlayers : this.playerOrder;
    this.describerId = describerPool[this.describerIndex % describerPool.length];
    this.describerIndex++;

    // Try Gemini for word generation
    try {
      const raw = await getBellBotCommentary('generate_prompt', {
        gameName: 'Forbidden Words',
        count: 1,
        description: 'Generate a target word/phrase and 4-5 forbidden words that players cannot use when describing it. The target should be guessable but challenging.',
        extra: `Spice level: ${this.spiceLevel}.${this.getTopicHint() ? ` Topic area: ${this.getTopicHint()}.` : ''} Return JSON: {"word": "target phrase", "forbidden": ["word1", "word2", "word3", "word4"]}`,
      }, this.spiceLevel);
      const parsed = parseBellBotJSON(raw);
      if (parsed?.word && parsed?.forbidden?.length) {
        this.currentWord = parsed.word;
        this.currentForbidden = parsed.forbidden;
        return this._buildPrompt();
      }
    } catch { /* fallback */ }

    // Static fallback
    const pool = WORD_SETS[this.spiceLevel] || WORD_SETS[2];
    const available = pool.filter(w => !this.usedWords.has(w.word));
    const list = available.length > 0 ? available : pool;
    const pick = list[Math.floor(Math.random() * list.length)];
    this.usedWords.add(pick.word);
    this.currentWord = pick.word;
    this.currentForbidden = pick.forbidden;
    return this._buildPrompt();
  }

  _buildPrompt() {
    const describerName = this.players.get(this.describerId)?.name || 'Someone';
    return {
      type: 'forbidden-words',
      word: this.currentWord,
      forbidden: this.currentForbidden,
      describerId: this.describerId,
      describerName,
      instruction: `${describerName} is describing — everyone else, guess the word!`,
    };
  }

  /** Describer sees word + forbidden; guessers see "guess the word" */
  getState(socketId) {
    const base = super.getState(socketId);
    if (base.prompt && socketId !== this.describerId) {
      // Hide the word and forbidden list from guessers
      base.prompt = {
        ...base.prompt,
        word: '[HIDDEN]',
        forbidden: [],
        isGuesser: true,
      };
    } else if (base.prompt) {
      base.prompt = { ...base.prompt, isDescriber: true };
    }
    return base;
  }

  validateSubmission(submission) {
    const text = String(submission).trim().substring(0, 200);
    if (!text) return { error: 'Submit something!' };
    return { data: text };
  }

  getDefaultSubmission() { return '🤷'; }
  getSubmissionText(sub) { return sub; }

  /** Custom AI scoring — score describer on creativity, guessers on accuracy */
  async getAIScores() {
    const submissionList = [];
    for (const [socketId, sub] of this.submissions) {
      const player = this.players.get(socketId);
      submissionList.push({
        socketId,
        playerName: player?.name || 'Anonymous',
        text: this.getSubmissionText(sub),
        isDescriber: socketId === this.describerId,
      });
    }

    try {
      const raw = await getBellBotCommentary('judge_batch', {
        gameName: 'Forbidden Words',
        prompt: `The secret word is: "${this.currentWord}". Forbidden words: [${this.currentForbidden.join(', ')}]. One player was the Describer (wrote a clue), the others were Guessers (tried to guess the word).`,
        submissions: submissionList.map((s, i) => ({
          ...s,
          text: s.isDescriber
            ? `[DESCRIBER'S CLUE]: "${s.text}" — Score on creativity and how well it hints without using forbidden words.`
            : `[GUESS]: "${s.text}" — Score on how close this is to "${this.currentWord}". Exact/near match = high score.`,
        })),
      }, this.spiceLevel);

      const results = parseBellBotJSON(raw);
      for (const r of results) {
        const entry = submissionList[r.index];
        if (entry) {
          this.aiScores.set(entry.socketId, {
            score: Math.max(0, Math.min(500, r.score || 200)),
            comment: r.comment || '',
          });
        }
      }
    } catch {
      // Fallback — give describer a decent score, guessers get random
      for (const [socketId] of this.submissions) {
        const isDescriber = socketId === this.describerId;
        this.aiScores.set(socketId, {
          score: isDescriber ? 300 : 150 + Math.floor(Math.random() * 200),
          comment: isDescriber ? 'Creative clue!' : 'Nice try!',
        });
      }
    }
  }
}
