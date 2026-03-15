import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Wheel from './Wheel';
import GusMascot from './GusMascot';

// Category icon component — uses generated PNGs instead of emojis
function CatIcon({ id, size = 24, className = '' }) {
  const src = `/images/cat-${id}.png`;
  return (
    <img
      src={src}
      alt={id}
      width={size}
      height={size}
      className={`cat-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', objectFit: 'contain' }}
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  );
}

export default function Game({ socket, playerName, roomCode, gameState, setGameState, gusMessage, showToast }) {
  // Build categories + segment map from game state (sent by server)
  const categories = useMemo(() => gameState?.categories || [], [gameState?.categories]);
  const SEGMENT_MAP = useMemo(() => {
    const map = {};
    (categories || []).forEach(c => { map[c.id] = c; });
    return map;
  }, [categories]);
  const wheelSegments = useMemo(() => [...categories], [categories]);
  const wheelRef = useRef(null);
  const [phase, setPhase] = useState(gameState?.phase || 'spinning');
  const [activePlayerId, setActivePlayerId] = useState(gameState?.activePlayerId || null);
  const [scores, setScores] = useState(gameState?.scores || []);
  const [myStamps, setMyStamps] = useState([]);
  const [streakCount, setStreakCount] = useState(0);

  // Question state
  const [question, setQuestion] = useState(null);
  const [options, setOptions] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerResult, setAnswerResult] = useState(null); // { correct, correctIndex, funFact, stampEarned }
  const [timeLeft, setTimeLeft] = useState(20);
  const [loading, setLoading] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(null);


  const timerRef = useRef(null);
  const isMyTurn = activePlayerId === socket.id;

  // Find my stamps from scores
  useEffect(() => {
    const me = scores.find(s => s.socketId === socket.id);
    if (me) setMyStamps(me.pawStamps || []);
  }, [scores, socket.id]);

  // ── Socket Listeners ───────────────────────────────────
  useEffect(() => {
    const onWheelResult = ({ segmentIndex, segment, categoryId, spinnerName }) => {
      setCurrentSegment({ ...segment, categoryId });
      // Animate wheel for all players
      wheelRef.current?.spinTo(segmentIndex);
    };

    const onQuestionShow = ({ question: q, options: opts, timeLimit, activePlayerId: apId }) => {
      setQuestion(q);
      setOptions(opts);
      setSelectedAnswer(null);
      setAnswerResult(null);
      setTimeLeft(timeLimit);
      setPhase('question');
      setLoading(false);

      // Start timer
      clearInterval(timerRef.current);
      let t = timeLimit;
      timerRef.current = setInterval(() => {
        t--;
        setTimeLeft(t);
        if (t <= 0) {
          clearInterval(timerRef.current);
        }
      }, 1000);
    };

    const onAnswerResult = (result) => {
      clearInterval(timerRef.current);
      setAnswerResult(result);
      setPhase('result');

      if (result.scores) setScores(result.scores);
      if (typeof result.streakCount === 'number') setStreakCount(result.streakCount);
    };

    const onTurnUpdate = ({ activePlayerId: apId, state }) => {
      setActivePlayerId(apId);
      if (state === 'SPINNING' || state === 'spinning') {
        // Brief delay before showing next spin
        setTimeout(() => {
          setPhase('spinning');
          setQuestion(null);
          setOptions([]);
          setSelectedAnswer(null);
          setAnswerResult(null);
          setCurrentSegment(null);
        }, state === 'SPINNING' && answerResult ? 2500 : 100);
      }
    };

    socket.on('wheel-result', onWheelResult);
    socket.on('question-show', onQuestionShow);
    socket.on('answer-result', onAnswerResult);
    socket.on('turn-update', onTurnUpdate);

    return () => {
      socket.off('wheel-result', onWheelResult);
      socket.off('question-show', onQuestionShow);
      socket.off('answer-result', onAnswerResult);
      socket.off('turn-update', onTurnUpdate);
      clearInterval(timerRef.current);
    };
  }, [socket, showToast]);

  // ── Handle timeout ─────────────────────────────────────
  useEffect(() => {
    if (timeLeft <= 0 && phase === 'question' && isMyTurn && !answerResult) {
      socket.emit('answer-timeout', (res) => {});
    }
  }, [timeLeft, phase, isMyTurn, answerResult, socket]);

  // ── Actions ────────────────────────────────────────────
  const handleSpin = () => {
    if (!isMyTurn || phase !== 'spinning') return;
    socket.emit('spin-wheel', (res) => {
      if (res.error) return showToast(res.error);
      // Wheel animation triggered by wheel-result event
      // After animation, request question
      setTimeout(() => {
        setLoading(true);
        socket.emit('request-question', (qRes) => {
          if (qRes.error) {
            showToast(qRes.error);
            setLoading(false);
          }
          // Question will come via question-show event
        });
      }, 3800); // Wait for wheel animation
    });
  };

  const handleAnswer = (index) => {
    if (!isMyTurn || selectedAnswer !== null || phase !== 'question') return;
    setSelectedAnswer(index);
    clearInterval(timerRef.current);

    socket.emit('submit-answer', { answerIndex: index }, (res) => {
      if (res.error) showToast(res.error);
    });
  };



  // ── Helpers ────────────────────────────────────────────
  const getActivePlayerName = () => {
    const p = scores.find(s => s.socketId === activePlayerId);
    return p?.name || '???';
  };

  const getTimerColor = () => {
    if (timeLeft > 10) return 'var(--secondary)';
    if (timeLeft > 5) return 'var(--accent-gold)';
    return 'var(--error)';
  };

  const getOptionClass = (index) => {
    if (!answerResult) {
      return selectedAnswer === index ? 'option-btn selected' : 'option-btn';
    }
    if (index === answerResult.correctIndex) return 'option-btn correct';
    if (selectedAnswer === index && !answerResult.correct) return 'option-btn wrong';
    return 'option-btn';
  };

  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div className="game-screen">
      {/* Header — matches GameShell style */}
      <div className="gs-header">
        <div className="gs-game-title">
          <span>Trivia Fetch!</span>
        </div>
      </div>

      {/* Gus Speech */}
      <div className="gus-bubble-area">
        <GusMascot size={48} variant="mascot" className="gus-icon-img" />
        <div className="gus-bubble" key={gusMessage}>{gusMessage}</div>
      </div>

      {/* ── SPINNING PHASE ── */}
      {phase === 'spinning' && (
        <div className="wheel-area">
          <Wheel ref={wheelRef} disabled={!isMyTurn} onTap={handleSpin} segments={wheelSegments} />
          {isMyTurn ? (
            <div className="tap-to-spin-text">Tap the wheel to spin!</div>
          ) : (
            <div className="waiting-spin-text">
              Waiting for {getActivePlayerName()} to spin...
            </div>
          )}
        </div>
      )}

      {/* ── LOADING QUESTION ── */}
      {loading && phase === 'spinning' && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          {currentSegment && (
            <div
              className="question-category-badge bounce-in"
              style={{ background: SEGMENT_MAP[currentSegment.categoryId]?.color || currentSegment.color, display: 'inline-block', marginBottom: 12 }}
            >
              <CatIcon id={currentSegment.categoryId} size={20} /> {SEGMENT_MAP[currentSegment.categoryId]?.name || currentSegment.name}
            </div>
          )}
          <div style={{ marginTop: 8 }}>
          <GusMascot size={48} variant="thinking" className="gus-icon-img" />
            <p style={{ color: 'var(--text-light)', fontWeight: 600, marginTop: 4 }}>
              Gus is fetching your question
              <span className="loading-dots">
                <span></span><span></span><span></span>
              </span>
            </p>
          </div>
        </div>
      )}

      {/* ── QUESTION PHASE ── */}
      {phase === 'question' && question && (
        <div className="question-area">
          {currentSegment && (
            <div
              className="question-category-badge"
              style={{ background: SEGMENT_MAP[currentSegment.categoryId]?.color || '#999' }}
            >
              <CatIcon id={currentSegment.categoryId} size={20} /> {SEGMENT_MAP[currentSegment.categoryId]?.name}
            </div>
          )}

          <div className="question-card">
            <div className="question-text">{question}</div>
            <div className={`gs-timer ${timeLeft <= 5 ? 'gs-timer--urgent' : ''}`}>
              <div
                className="gs-timer-bar"
                style={{
                  width: `${(timeLeft / 20) * 100}%`,
                  background: getTimerColor(),
                  boxShadow: `0 0 10px ${getTimerColor()}`,
                }}
              />
              <span className="gs-timer-text">
                {timeLeft > 0 ? `⏰ ${timeLeft}s` : "⏰ Time's up!"}
              </span>
            </div>
          </div>

          <div className="options-grid">
            {options.map((opt, i) => (
              <button
                key={i}
                className={getOptionClass(i)}
                onClick={() => handleAnswer(i)}
                disabled={!isMyTurn || selectedAnswer !== null || timeLeft <= 0}
              >
                <span className="option-letter">{letters[i]}</span>
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── RESULT PHASE ── */}
      {phase === 'result' && answerResult && (
        <div className="result-area">
          <div className={answerResult.correct ? 'bounce-in' : 'shake'}>
            <div className="result-icon">
              {answerResult.timedOut ? '⏰' : answerResult.correct ? <GusMascot size={80} variant="happy" /> : <GusMascot size={80} variant="wrong" />}
            </div>
          </div>

          <h2 style={{ fontFamily: 'var(--font-heading)', color: answerResult.correct ? 'var(--success)' : 'var(--error)' }}>
            {answerResult.timedOut ? "Time's Up!" : answerResult.correct ? 'Correct!' : 'Oops!'}
          </h2>

          {!answerResult.correct && (
            <p style={{ color: 'var(--text-light)', fontSize: 14, marginTop: 4 }}>
              The answer was: <strong>{options[answerResult.correctIndex]}</strong>
            </p>
          )}

          {answerResult.stampEarned && (
            <div className="stamp-earned-banner">
              🦴 <CatIcon id={answerResult.stampEarned} size={20} /> {SEGMENT_MAP[answerResult.stampEarned]?.name} Treat Earned!
            </div>
          )}

          {answerResult.funFact && (
            <div className="fun-fact">
              <span className="fun-fact-label"><GusMascot size={20} variant="mascot" className="inline-gus" /> Gus's Fun Fact: </span>
              {answerResult.funFact}
            </div>
          )}

          {answerResult.correct && !answerResult.gameWon && isMyTurn && (
            <p style={{ color: 'var(--secondary)', fontFamily: 'var(--font-heading)', marginTop: 12, fontSize: 16 }}>
              <img src="/images/streak-fire.png" alt="fire" width={20} height={20} style={{verticalAlign:'middle'}} /> Spin again!
            </p>
          )}
        </div>
      )}



      {/* ── My Treats ── */}
      <div className="paw-stamps-area">
        <div className="paw-stamps-title">🦴 Your Treats ({myStamps.length}/{categories.length})</div>
        <div className="paw-stamps-grid">
          {categories.map(cat => {
            const earned = myStamps.includes(cat.id);
            return (
              <div
                key={cat.id}
                className={`paw-stamp ${earned ? 'earned' : 'empty'}`}
                style={earned ? { background: cat.color } : {}}
                title={cat.name}
              >
                <span style={{ fontSize: 22 }}>{cat.emoji}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Scoreboard ── */}
      <div className="tf-scoreboard">
        <div className="tf-scoreboard-title">Scoreboard</div>
        {scores.map((s, i) => {
          const isActive = s.socketId === activePlayerId;
          const isMe = s.socketId === socket.id;
          return (
            <div
              key={i}
              className={`tf-score-row ${isActive ? 'tf-score-row--active' : ''} ${isMe ? 'tf-score-row--me' : ''}`}
            >
              <div className="tf-score-rank">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
              </div>
              <div className="tf-score-info">
                <div className="tf-score-name">
                  {s.name} {isMe && <span className="tf-you-tag">(you)</span>}
                  {isActive && <span className="tf-turn-dot">🎯</span>}
                  {isActive && streakCount >= 2 && (
                    <span className="tf-streak">🔥{streakCount}</span>
                  )}
                </div>
                <div className="tf-score-treats">
                  {categories.map(cat => {
                    const earned = s.pawStamps.includes(cat.id);
                    return (
                      <div
                        key={cat.id}
                        className={`tf-treat ${earned ? 'tf-treat--earned' : ''}`}
                        style={earned ? { background: cat.color, borderColor: cat.color } : {}}
                        title={cat.name}
                      >
                        {earned && <span style={{ fontSize: 9 }}>{cat.emoji}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="tf-score-points">{s.score}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
