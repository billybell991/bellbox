// BaseGamePlayer — Universal client component for all BaseGame-derived games
// Adapts its submission UI based on prompt type from the server

import React, { useState, useEffect, useRef } from 'react';
import GameShell from '../components/GameShell';
import AudioRecorder from '../components/AudioRecorder';

// ── Submission UIs by prompt type ─────────────────────────────

function TextSubmission({ prompt, onSubmit, disabled }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { setText(''); inputRef.current?.focus(); }, [prompt]);

  const handleSubmit = () => {
    if (text.trim()) { onSubmit(text.trim()); setText(''); }
  };

  return (
    <div className="bg-submission bg-submission--text">
      <div className="bg-prompt-card">
        {prompt?.instruction && <div className="bg-instruction">{prompt.instruction}</div>}
        {prompt?.imageUrl && (
          <img className="bg-prompt-image" src={prompt.imageUrl} alt="Caption this!" />
        )}
        {(!prompt?.imageUrl) && (
          <div className={`bg-prompt-text ${prompt?.type === 'rebus' ? 'bg-prompt-text--rebus' : ''}`}>{prompt?.text || prompt?.question || ''}</div>
        )}
        {prompt?.job && <div className="bg-prompt-job">Position: {prompt.job}</div>}
      </div>
      <div className="bg-input-area">
        <textarea
          ref={inputRef}
          className="bg-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          placeholder="Type your answer..."
          maxLength={500}
          disabled={disabled}
          rows={2}
        />
        <button
          className={`bg-send-btn ${text.trim() ? 'active' : ''}`}
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          aria-label="Send"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function AudioSubmission({ prompt, onSubmit, disabled, socket }) {
  const [text, setText] = useState('');
  const [recorded, setRecorded] = useState(false);

  useEffect(() => { setText(''); setRecorded(false); }, [prompt]);

  const handleAudioDone = ({ audio, mimeType, duration }) => {
    setRecorded(true);
    onSubmit({ audio, mimeType, transcript: '' });
  };

  const handleTextFallback = () => {
    if (text.trim()) { onSubmit(text.trim()); }
  };

  return (
    <div className="bg-submission bg-submission--audio">
      <div className="bg-prompt-card">
        {prompt?.instruction && <div className="bg-instruction">{prompt.instruction}</div>}
        {prompt?.voice && <div className="bg-prompt-voice">🎭 {prompt.voice}</div>}
        {prompt?.job && <div className="bg-prompt-job">Position: {prompt.job}</div>}
        <div className="bg-prompt-text">{prompt?.line || prompt?.text || prompt?.question || ''}</div>
      </div>
      <div className="bg-audio-area">
        {!recorded && !disabled && (
          <AudioRecorder onRecordComplete={handleAudioDone} disabled={disabled} />
        )}
        {recorded && <div className="bg-recorded-badge">✅ Recording submitted!</div>}
      </div>
      {!recorded && !disabled && (
        <div className="bg-text-fallback">
          <div className="bg-fallback-label">No mic? Type instead:</div>
          <div className="bg-input-area">
            <input
              className="bg-text-input"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleTextFallback(); }}
              placeholder="Type your performance..."
              maxLength={300}
            />
            <button
              className={`bg-send-btn ${text.trim() ? 'active' : ''}`}
              onClick={handleTextFallback}
              disabled={!text.trim()}
              aria-label="Send"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SnapSubmission({ prompt, onSubmit, disabled }) {
  return (
    <div className="bg-submission bg-submission--snap">
      <div className="bg-prompt-card bg-prompt-card--snap">
        <div className="bg-instruction">⚡ QUICK! Choose one!</div>
        <div className="bg-prompt-text">{prompt?.q || prompt?.text || ''}</div>
      </div>
      <div className="bg-snap-choices">
        <button
          className="bg-snap-btn bg-snap-btn--a"
          onClick={() => onSubmit('a')}
          disabled={disabled}
        >
          <span className="bg-snap-label">A</span>
          <span className="bg-snap-text">{prompt?.a || 'Option A'}</span>
        </button>
        <button
          className="bg-snap-btn bg-snap-btn--b"
          onClick={() => onSubmit('b')}
          disabled={disabled}
        >
          <span className="bg-snap-label">B</span>
          <span className="bg-snap-text">{prompt?.b || 'Option B'}</span>
        </button>
      </div>
    </div>
  );
}

function AIDlibsSubmission({ prompt, onSubmit, disabled }) {
  const blanks = prompt?.blanks || [];
  const [answers, setAnswers] = useState({});
  const firstRef = useRef(null);

  useEffect(() => { setAnswers({}); firstRef.current?.focus(); }, [prompt]);

  const update = (key, val) => setAnswers(prev => ({ ...prev, [key]: val }));
  const allFilled = blanks.every(b => answers[b]?.trim());

  const handleSubmit = () => {
    if (allFilled) onSubmit(answers);
  };

  return (
    <div className="bg-submission bg-submission--dlibs">
      <div className="bg-prompt-card">
        <div className="bg-instruction">{prompt?.instruction || 'Fill in the blanks!'}</div>
      </div>
      <div className="bg-dlibs-blanks">
        {blanks.map((blank, i) => (
          <div key={blank} className="bg-dlib-field">
            <label className="bg-dlib-label">{blank.replace(/_/g, ' ')}</label>
            <input
              ref={i === 0 ? firstRef : undefined}
              className="bg-dlib-input"
              value={answers[blank] || ''}
              onChange={e => update(blank, e.target.value)}
              placeholder={blank.replace(/_/g, ' ').toLowerCase()}
              maxLength={50}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
      <button
        className={`bg-send-btn bg-send-btn--form ${allFilled ? 'active' : ''}`}
        onClick={handleSubmit}
        disabled={disabled || !allFilled}
        aria-label="Submit"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
  );
}

// ── Reveal display ────────────────────────────────────────────

function RevealCard({ reveal }) {
  const sub = reveal.submission;
  const displayText = typeof sub === 'string' ? sub
    : sub?.text || sub?.choice?.toUpperCase() || (typeof sub === 'object' && !sub?.audio ? JSON.stringify(sub) : '[Audio Performance 🎤]');

  return (
    <div className="bg-reveal-card slide-in">
      <div className="bg-reveal-player">{reveal.playerName}</div>
      <div className="bg-reveal-content">{displayText}</div>
      {reveal.aiComment && <div className="bg-reveal-ai">🤖 {reveal.aiComment}</div>}
    </div>
  );
}

// ── Vote UI ───────────────────────────────────────────────────

function VotePanel({ reveals, myId, onVote, voted }) {
  return (
    <div className="bg-vote-panel">
      <h3 className="bg-vote-title">Vote for the best! 🗳️</h3>
      <div className="bg-vote-options">
        {reveals.filter(r => r.playerId !== myId).map((r, i) => {
          const sub = r.submission;
          const displayText = typeof sub === 'string' ? sub
            : sub?.text || sub?.choice?.toUpperCase() || '[Audio 🎤]';
          return (
            <button
              key={r.playerId || i}
              className={`bg-vote-card ${voted === r.playerId ? 'bg-vote-card--selected' : ''}`}
              onClick={() => onVote(r.playerId)}
              disabled={!!voted}
            >
              <div className="bg-vote-name">{r.playerName}</div>
              <div className="bg-vote-text">{displayText}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function BaseGamePlayer({ socket, myId, isHost, gameInfo, onReturn, onRestartSame }) {
  const [phase, setPhase] = useState('PREPARING');
  const [preparingMessage, setPreparingMessage] = useState('Getting things ready...');
  const activeRoundRef = useRef(0);
  const [round, setRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(4);
  const [prompt, setPrompt] = useState(null);
  const [bellbotSays, setBellbotSays] = useState('');
  const [timeLimit, setTimeLimit] = useState(0);
  const [scores, setScores] = useState([]);
  const [roundScores, setRoundScores] = useState([]);
  const [reveals, setReveals] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [voted, setVoted] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [players, setPlayers] = useState([]);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [correctAnswer, setCorrectAnswer] = useState(null);

  useEffect(() => {
    // ── Round start ─────────────────────────────
    const onPreparing = (data) => {
      setPhase('PREPARING');
      setPreparingMessage(data?.message || 'Getting things ready...');
    };

    const onRoundStart = (data) => {
      // Ignore duplicate round-start for the same round (prevents resetting mid-type)
      if (activeRoundRef.current === data.round) {
        // Only update bellbot if it arrives later
        if (data.bellbotSays) setBellbotSays(data.bellbotSays);
        return;
      }
      activeRoundRef.current = data.round;
      setPhase('SUBMISSION');
      setRound(data.round);
      setTotalRounds(data.totalRounds);
      setPrompt(data.prompt);
      setBellbotSays(data.bellbotSays || '');
      setTimeLimit(data.timeLimit || 0);
      setScores(data.scores || []);
      setPlayers(data.players || []);
      setSubmitted(false);
      setVoted(null);
      setReveals([]);
      setRoundScores([]);
      setCorrectAnswer(null);
      setSubmittedCount(0);
      setGameOver(false);
    };

    // ── Submission updates ──────────────────────
    const onSubmissionUpdate = (data) => {
      setSubmittedCount(data.submittedCount);
      setPlayers(data.players || []);
    };

    // ── Reveal start ────────────────────────────
    const onRevealStart = () => {
      setPhase('REVEAL');
    };

    // ── All reveals ─────────────────────────────
    const onReveals = (data) => {
      setReveals(data.reveals || []);
      if (data.state === 'VOTING' && data.timeLimit > 0) {
        setPhase('VOTING');
        setTimeLimit(data.timeLimit);
      } else if (data.state === 'REVEAL') {
        setPhase('REVEAL');
      }
    };

    // ── Vote update ─────────────────────────────
    const onVoteUpdate = (data) => {
      setPlayers(data.players || []);
    };

    // ── Round end / scoring ─────────────────────
    const onRoundEnd = (data) => {
      setRoundScores(data.roundScores || []);
      setScores(data.leaderboard || []);
      setBellbotSays(data.bellbotSays || '');
      setCorrectAnswer(data.correctAnswer || null);
      if (data.prompt) setPrompt(data.prompt);
      setGameOver(data.gameOver);
      setPhase(data.gameOver ? 'GAME_OVER' : 'ROUND_END');
    };

    socket.on('bg-preparing', onPreparing);
    socket.on('bg-round-start', onRoundStart);
    socket.on('bg-submission-update', onSubmissionUpdate);
    socket.on('bg-reveal-start', onRevealStart);
    socket.on('bg-reveals', onReveals);
    socket.on('bg-vote-update', onVoteUpdate);
    socket.on('bg-round-end', onRoundEnd);

    // Sync state on mount — fixes race where bg-round-start fires before listeners register
    socket.emit('bg-get-state', (data) => {
      if (data?.state === 'SUBMISSION') onRoundStart(data);
    });

    return () => {
      socket.off('bg-preparing', onPreparing);
      socket.off('bg-round-start', onRoundStart);
      socket.off('bg-submission-update', onSubmissionUpdate);
      socket.off('bg-reveal-start', onRevealStart);
      socket.off('bg-reveals', onReveals);
      socket.off('bg-vote-update', onVoteUpdate);
      socket.off('bg-round-end', onRoundEnd);
    };
  }, [socket]);

  // ── Handlers ────────────────────────────────────────────────
  const handleSubmit = (submission) => {
    if (submitted) return;
    setSubmitted(true);
    socket.emit('bg-submit', { submission });
  };

  const handleVote = (targetId) => {
    if (voted) return;
    setVoted(targetId);
    socket.emit('bg-vote', { targetId });
  };

  const handleTimerExpire = () => {
    if (phase === 'SUBMISSION' && !submitted) {
      socket.emit('bg-lock');
    } else if (phase === 'VOTING') {
      socket.emit('bg-tally');
    }
  };

  const handleNextRound = () => {
    socket.emit('bg-next-round');
  };

  const handleReturnToLobby = () => {
    onReturn?.();
  };

  // ── Determine submission UI type ────────────────────────────
  const promptType = prompt?.type || 'text';
  const isAudioGame = ['voice', 'sound', 'accent', 'interview'].includes(promptType);
  const isSnapGame = promptType === 'snap';
  const isDlibsGame = promptType === 'ai-dlibs';

  // Custom BellBot skin for specific games
  const bellbotSkin = gameInfo?.id === 'hieroglyphics' ? '/pharaoh.png' : '🤖';

  // ── Winner info ─────────────────────────────────────────────
  const winner = scores.length > 0 ? { name: scores[0].name, score: scores[0].score } : null;

  // Determine timer label from phase
  const timerLabel = phase === 'SUBMISSION' ? '✏️' : phase === 'VOTING' ? '🗳️' : '';

  return (
    <GameShell
      gameState={{ state: phase }}
      gameName={gameInfo?.name || 'BellBox Game'}
      gameEmoji={gameInfo?.emoji || '🎮'}
      bellbotSays={bellbotSays}
      bellbotSkin={bellbotSkin}
      onReturn={gameOver ? handleReturnToLobby : handleNextRound}
      onRestartSame={gameOver ? onRestartSame : undefined}
      isHost={isHost}
      round={round}
      totalRounds={totalRounds}
      timeLimit={phase === 'SUBMISSION' || phase === 'VOTING' ? timeLimit : 0}
      onTimeExpire={handleTimerExpire}
      timerLabel={timerLabel}
      scores={scores}
      roundScores={roundScores}
      gameOver={gameOver}
      winner={winner}
      prompt={prompt}
      preparingMessage={preparingMessage}
      renderSubmission={() => (
        <div className="bg-game-area">
          {/* Submission count */}
          <div className="bg-submission-count">
            {submittedCount}/{players.length} submitted
          </div>

          {submitted ? (
            <div className="bg-waiting">
              <div className="bg-waiting-text">
                ✅ Answer locked in! ({submittedCount}/{players.length} submitted)
                <span className="bg-waiting-dots"><span></span><span></span><span></span></span>
              </div>
            </div>
          ) : isSnapGame ? (
            <SnapSubmission prompt={prompt} onSubmit={handleSubmit} disabled={submitted} />
          ) : isDlibsGame ? (
            <AIDlibsSubmission prompt={prompt} onSubmit={handleSubmit} disabled={submitted} />
          ) : isAudioGame ? (
            <AudioSubmission prompt={prompt} onSubmit={handleSubmit} disabled={submitted} socket={socket} />
          ) : (
            <TextSubmission prompt={prompt} onSubmit={handleSubmit} disabled={submitted} />
          )}
        </div>
      )}
      renderReveal={() => (
        <div className="bg-reveal-area">
          {prompt?.imageUrl && (
            <div className="bg-reveal-image">
              <img src={prompt.imageUrl} alt="Round prompt" className="bg-prompt-img" />
            </div>
          )}
          <h3 className="bg-section-title">📢 Submissions</h3>
          {reveals.map((r, i) => <RevealCard key={r.playerId || i} reveal={r} />)}
        </div>
      )}
      renderVoting={() => (
        <VotePanel reveals={reveals} myId={myId} onVote={handleVote} voted={voted} />
      )}
      renderScoring={() => (
        <div className="bg-scoring-extra">
          {correctAnswer && (
            <div className="bg-correct-answer">
              {prompt?.type === 'rebus' && prompt?.text && (
                <div className="bg-rebus-answer-emojis">{prompt.text}</div>
              )}
              ✅ Correct answer: <strong>{correctAnswer}</strong>
            </div>
          )}
        </div>
      )}
    />
  );
}
