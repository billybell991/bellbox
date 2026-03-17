import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Drawing Canvas ────────────────────────────────────────────
function DrawingCanvas({ onSubmit, disabled, timeLimit }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const lastPoint = useRef(null);
  const [color, setColor] = useState('#000000');
  const [brushSize] = useState(4);
  const [hasDrawn, setHasDrawn] = useState(false);
  const strokesRef = useRef([]); // array of stroke data for transmission

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Size canvas for mobile: 300x300 logical, scale to device
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 600, 600);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    if (disabled) return;
    e.preventDefault();
    drawing.current = true;
    const pos = getPos(e);
    lastPoint.current = pos;
    strokesRef.current.push({ color, size: brushSize * 2, points: [pos] });
  };

  const moveDraw = (e) => {
    if (!drawing.current || disabled) return;
    e.preventDefault();
    const ctx = ctxRef.current;
    const pos = getPos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize * 2;
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPoint.current = pos;
    setHasDrawn(true);
    // Record stroke point
    const strokes = strokesRef.current;
    if (strokes.length > 0) strokes[strokes.length - 1].points.push(pos);
  };

  const endDraw = (e) => {
    if (e) e.preventDefault();
    drawing.current = false;
    lastPoint.current = null;
  };

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    // Send as data URL (small enough for socket)
    const imageData = canvas.toDataURL('image/png', 0.6);
    onSubmit(imageData);
  };

  const COLORS = ['#000000', '#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#FFD600'];

  return (
    <div className="ss-canvas-area">
      <div className="ss-color-picker">
        {COLORS.map(c => (
          <button
            key={c}
            className={`ss-color-btn ${color === c ? 'ss-color-btn--active' : ''}`}
            style={{ background: c, border: '2px solid transparent' }}
            onClick={() => setColor(c)}
            disabled={disabled}
          />
        ))}
      </div>
      <canvas
        ref={canvasRef}
        className="ss-canvas"
        onMouseDown={startDraw}
        onMouseMove={moveDraw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={moveDraw}
        onTouchEnd={endDraw}
      />
      <button
        className={`ss-submit-btn ${hasDrawn ? 'active' : ''}`}
        onClick={handleSubmit}
        disabled={disabled || !hasDrawn}
      >
        Submit Drawing
      </button>
    </div>
  );
}

// ── Main Game Component ───────────────────────────────────────
export default function Game({ socket, myId, isHost, onReturn, onRestartSame }) {
  const [phase, setPhase] = useState('waiting');
  const [myPrompt, setMyPrompt] = useState('');
  const [drawingSubmitted, setDrawingSubmitted] = useState(false);
  const [timeLimit, setTimeLimit] = useState(0);
  const [scores, setScores] = useState([]);
  const [winner, setWinner] = useState(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [totalRounds, setTotalRounds] = useState(3);

  // Decoy phase state
  const [currentDrawing, setCurrentDrawing] = useState(null);
  const [artistName, setArtistName] = useState('');
  const [artistId, setArtistId] = useState(null);
  const [decoySubmitted, setDecoySubmitted] = useState(false);
  const [decoyCount, setDecoyCount] = useState({ submitted: 0, total: 0 });
  const [drawingsShown, setDrawingsShown] = useState(0);
  const [totalDrawings, setTotalDrawings] = useState(0);

  // Voting state
  const [voteOptions, setVoteOptions] = useState([]);
  const [voted, setVoted] = useState(null);

  // Reveal state
  const [reveal, setReveal] = useState(null);

  const [showScoreboard, setShowScoreboard] = useState(false);

  useEffect(() => {
    // ── Drawing Phase ──
    socket.on('ss-draw-phase', (data) => {
      setPhase('drawing');
      setMyPrompt(data.prompt);
      setTimeLimit(data.timeLimit);
      setDrawingSubmitted(false);
      setScores(data.scores || []);
      setTotalDrawings(data.totalDrawings);
      setRoundNumber(data.roundNumber || 1);
      setTotalRounds(data.totalRounds || 3);
      setReveal(null);
      setDrawingsShown(0);
    });

    // ── Decoy Phase ──
    socket.on('ss-decoy-phase', (data) => {
      setPhase('decoy');
      setCurrentDrawing(data.drawingData);
      setArtistName(data.artistName);
      setArtistId(data.artistId);
      setTimeLimit(data.timeLimit);
      setDecoySubmitted(false);
      setDecoyCount({ submitted: 0, total: data.totalDecoys || 0 });
      setDrawingsShown(data.drawingsShown);
      setTotalDrawings(data.totalDrawings);
      if (data.roundNumber) setRoundNumber(data.roundNumber);
      if (data.totalRounds) setTotalRounds(data.totalRounds);
      setVoteOptions([]);
      setVoted(null);
      setSelectedVote(null);
      setReveal(null);
    });

    socket.on('ss-decoy-update', (data) => {
      setDecoyCount({ submitted: data.submittedCount, total: data.totalDecoys });
    });

    // ── Voting Phase ──
    socket.on('ss-vote-phase', (data) => {
      setPhase('voting');
      setVoteOptions(data.options);
      setTimeLimit(data.timeLimit);
      setVoted(null);
      setSelectedVote(null);
    });

    // ── Reveal Phase ──
    socket.on('ss-reveal', (data) => {
      setPhase('reveal');
      setReveal(data);
      setScores(data.scores || []);
      setTimeLimit(data.timeLimit || 0);
      if (data.roundNumber) setRoundNumber(data.roundNumber);
      if (data.totalRounds) setTotalRounds(data.totalRounds);
    });

    // ── Game Over ──
    socket.on('ss-game-over', (data) => {
      setPhase('gameover');
      setScores(data.scores || []);
      setWinner(data.winner);
    });

    // ── Reconnect state sync ──
    socket.on('ss-state-sync', (data) => {
      if (data.roundNumber) setRoundNumber(data.roundNumber);
      if (data.totalRounds) setTotalRounds(data.totalRounds);
      if (data.phase === 'pending') {
        setPhase('pending');
        setCurrentDrawing(data.currentDrawing || null);
        setArtistName(data.artistName || '');
      } else if (data.phase === 'drawing') {
        setPhase('drawing');
        setMyPrompt(data.myPrompt);
        setDrawingSubmitted(data.myDrawingSubmitted);
      } else if (data.phase === 'decoy') {
        setPhase('decoy');
        setCurrentDrawing(data.currentDrawing?.drawingData);
        setArtistName(data.currentDrawing?.artistName);
        setArtistId(data.currentDrawing?.artistId);
        setDecoySubmitted(data.currentDrawing?.hasSubmittedDecoy);
      } else if (data.phase === 'voting') {
        setPhase('voting');
        setCurrentDrawing(data.currentDrawing?.drawingData);
        setVoteOptions(data.currentDrawing?.voteOptions || []);
        setVoted(data.currentDrawing?.hasVoted ? true : null);
      }
      setScores(data.scores || []);
      setDrawingsShown(data.drawingsShown || 0);
      setTotalDrawings(data.totalDrawings || 0);
    });

    // Request sync on mount (handles reconnection)
    socket.emit('ss-request-sync');

    return () => {
      socket.off('ss-draw-phase');
      socket.off('ss-decoy-phase');
      socket.off('ss-decoy-update');
      socket.off('ss-vote-phase');
      socket.off('ss-reveal');
      socket.off('ss-game-over');
      socket.off('ss-state-sync');
    };
  }, [socket]);

  // ── Handlers ──
  const handleSubmitDrawing = (imageData) => {
    setDrawingSubmitted(true);
    socket.emit('ss-submit-drawing', { drawingData: imageData });
  };

  const handleSubmitDecoy = (text) => {
    setDecoySubmitted(true);
    socket.emit('ss-submit-decoy', { decoyText: text });
  };

  const [selectedVote, setSelectedVote] = useState(null);

  const handleVote = (optionId) => {
    if (voted) return;
    if (selectedVote === optionId) {
      // Second tap — confirm and submit
      setVoted(optionId);
      socket.emit('ss-vote', { optionId });
    } else {
      // First tap — highlight
      setSelectedVote(optionId);
    }
  };

  const handleNextDrawing = () => {
    socket.emit('ss-next-drawing');
  };

  // ── Timer ──
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    setRemaining(timeLimit);
    if (!timeLimit) return;
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-lock on timer expiry
          if (phase === 'drawing' && !drawingSubmitted) {
            socket.emit('ss-lock-drawings');
          } else if (phase === 'decoy' && !decoySubmitted) {
            socket.emit('ss-lock-decoys');
          } else if (phase === 'voting' && !voted) {
            socket.emit('ss-lock-votes');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLimit, phase]);

  const timerPct = timeLimit > 0 ? (remaining / timeLimit) * 100 : 0;
  const timerUrgent = remaining <= 5;
  const timerColor = timerUrgent ? '#f44336' : remaining <= 10 ? '#FFB347' : '#21ffb2';

  const isArtist = myId === artistId;

  return (
    <div className="ss-container">
      {/* Header */}
      <div className="ss-header">
        <div className="ss-title">Super Sketch</div>
        <div className="ss-progress">
          {phase === 'drawing' ? `Round ${roundNumber}/${totalRounds}` :
           totalDrawings > 0 ? `Round ${roundNumber} · ${drawingsShown}/${totalDrawings}` :
           `Round ${roundNumber}/${totalRounds}`}
        </div>
        <button className="ss-score-btn" onClick={() => setShowScoreboard(true)}>🏆</button>
      </div>

      {/* Timer */}
      {timeLimit > 0 && remaining > 0 && phase !== 'reveal' && phase !== 'gameover' && (
        <div className={`gs-timer ${timerUrgent ? 'gs-timer--urgent' : ''}`}>
          <div
            className="gs-timer-bar"
            style={{ width: `${timerPct}%`, background: timerColor, boxShadow: `0 0 8px ${timerColor}` }}
          />
          <span className="gs-timer-text" style={{ color: timerColor, textShadow: `0 0 8px ${timerColor}` }}>⏰ {remaining}s</span>
        </div>
      )}

      {/* Scoreboard Modal */}
      {showScoreboard && (
        <div className="ss-modal-overlay" onClick={() => setShowScoreboard(false)}>
          <div className="ss-modal" onClick={e => e.stopPropagation()}>
            <h3>🏆 Scoreboard</h3>
            {scores.map((s, i) => (
              <div key={s.id} className="ss-score-row">
                <span className="ss-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                <span className="ss-name">{s.name}</span>
                <span className="ss-score">{s.score}</span>
              </div>
            ))}
            <button className="ss-modal-close" onClick={() => setShowScoreboard(false)}>Close</button>
          </div>
        </div>
      )}

      {/* ── DRAWING PHASE ── */}
      {phase === 'drawing' && (
        <div className="ss-phase ss-phase--drawing">
          <div className="ss-round-banner">✏️ Round {roundNumber} of {totalRounds} — Draw!</div>
          <div className="ss-prompt-card">
            <div className="ss-prompt-label">🎨 Your secret prompt:</div>
            <div className="ss-prompt-text">{myPrompt}</div>
          </div>
          {drawingSubmitted ? (
            <div className="ss-waiting">
              <div className="ss-waiting-text">Drawing submitted! Waiting for others...</div>
            </div>
          ) : (
            <DrawingCanvas
              onSubmit={handleSubmitDrawing}
              disabled={drawingSubmitted}
              timeLimit={timeLimit}
            />
          )}
        </div>
      )}

      {/* ── DECOY PHASE ── */}
      {phase === 'decoy' && (
        <div className="ss-phase ss-phase--decoy">
          <div className="ss-info-bar">
            <span>🖼️ {artistName}'s masterpiece</span>
            <span>{decoyCount.submitted}/{decoyCount.total} submitted</span>
          </div>
          <div className="ss-drawing-display">
            {currentDrawing ? (
              <img src={currentDrawing} alt="Drawing to guess" className="ss-drawing-img" />
            ) : (
              <div className="ss-blank-canvas">🎨 (Nothing was drawn)</div>
            )}
          </div>
          {isArtist ? (
            <div className="ss-waiting">
              <div className="ss-waiting-text">This is YOUR drawing! Sit back and watch them squirm 😈</div>
            </div>
          ) : decoySubmitted ? (
            <div className="ss-waiting">
              <div className="ss-waiting-text">Answer submitted! Waiting for others...</div>
            </div>
          ) : (
            <DecoyInput onSubmit={handleSubmitDecoy} />
          )}
        </div>
      )}

      {/* ── VOTING PHASE ── */}
      {phase === 'voting' && (
        <div className="ss-phase ss-phase--voting">
          <div className="ss-info-bar">
            <span>🗳️ What was the REAL prompt?</span>
          </div>
          <div className="ss-drawing-display ss-drawing-display--small">
            {currentDrawing ? (
              <img src={currentDrawing} alt="Drawing" className="ss-drawing-img" />
            ) : (
              <div className="ss-blank-canvas">🎨 (Blank)</div>
            )}
          </div>
          {isArtist ? (
            <div className="ss-waiting">
              <div className="ss-waiting-text">You're the artist — no voting for you! 🎨</div>
            </div>
          ) : (
            <div className="ss-vote-options">
              {voteOptions.map(opt => (
                <button
                  key={opt.id}
                  className={`ss-vote-btn ${opt.isOwn ? 'ss-vote-btn--own' : ''} ${voted === opt.id ? 'ss-vote-btn--selected' : ''} ${selectedVote === opt.id && !voted ? 'ss-vote-btn--selected' : ''} ${(voted && voted !== opt.id) || (selectedVote && selectedVote !== opt.id && !voted) ? 'ss-vote-btn--dimmed' : ''}`}
                  onClick={() => {
                    if (opt.isOwn) return; // can't vote for your own answer
                    handleVote(opt.id);
                  }}
                  disabled={!!voted || opt.isOwn}
                >
                  {opt.text}
                  {selectedVote === opt.id && !voted && (
                    <span className="tap-to-submit">tap to pick</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── REVEAL PHASE ── */}
      {phase === 'reveal' && reveal && (
        <div className="ss-phase ss-phase--reveal" style={{ overflowY: 'auto' }}>
          <div className="ss-reveal-canvas-wrap">
            <div className="ss-drawing-display">
              {currentDrawing ? (
                <img src={currentDrawing} alt="Drawing" className="ss-drawing-img" />
              ) : (
                <div className="ss-blank-canvas">🎨</div>
              )}
            </div>
          </div>
          <div className="ss-real-prompt">
            <div className="ss-real-label">✅ The REAL prompt was:</div>
            <div className="ss-real-text">"{reveal.realPrompt}"</div>
            <div className="ss-artist-credit">by {reveal.artistName}
              {reveal.artistBonus > 0 && <span className="ss-bonus"> (+{reveal.artistBonus}pts)</span>}
            </div>
          </div>

          {/* Show who voted for what (hide the real answer row if we're the artist — we already know it) */}
          <div className="ss-reveal-options">
            {reveal.options.filter(opt => !(opt.isReal && artistId === myId)).map((opt, idx) => (
              <div key={opt.id} className={`ss-reveal-option ${opt.isReal ? 'ss-reveal-option--real' : `ss-reveal-option--decoy${opt.votes.length > 0 ? ' ss-reveal-option--fooled' : ''}`}`} style={{ '--i': idx }}>
                <div className="ss-option-text">
                  "{opt.text}"
                  {!opt.isReal && opt.authorName && (
                    <span className="ss-option-author"> — written by {opt.authorName}</span>
                  )}
                </div>
                {/* Only show who voted for a DECOY — correct guessers are shown in the winner box below */}
                {!opt.isReal && opt.votes.length > 0 && (
                  <div className="ss-option-voters">
                    Fooled: {opt.votes.map(v => v.name).join(', ')}
                    <span className="ss-bonus"> (+{opt.votes.length * 500}pts)</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Correct guessers */}
          {reveal.correctGuessers.length > 0 && (
            <div className="ss-correct-guessers ss-correct-guessers--winner">
              🧠 Got it right: {reveal.correctGuessers.map(g => g.name).join(', ')}
              <span className="ss-bonus"> (+1000pts each)</span>
            </div>
          )}
          {reveal.nobodyGuessedRight && (
            <div className="ss-correct-guessers ss-correct-guessers--trickster">
              😈 Nobody guessed it! {reveal.artistName} gets a bonus!
              <span className="ss-bonus"> (+500pts)</span>
            </div>
          )}

          {/* Next drawing / round / final scores button (host) */}
          {isHost && (
            <button className="ss-next-btn" onClick={handleNextDrawing}>
              {reveal.isGameOver ? '🏆 Final Scores' :
               reveal.drawingsRemaining > 0 ? 'Next Drawing' :
               `🎨 Round ${(reveal.roundNumber || 0) + 1} — Draw!`}
            </button>
          )}
        </div>
      )}

      {/* ── GAME OVER ── */}
      {phase === 'gameover' && (
        <div className="ss-phase ss-phase--gameover">
          <div className="ss-winner-crown">🏆</div>
          <div className="ss-winner-name">{winner?.name || 'Nobody'}</div>
          <div className="ss-winner-score">{winner?.score || 0} points</div>
          <div className="ss-final-scores">
            {scores.map((s, i) => (
              <div key={s.id} className="ss-score-row">
                <span className="ss-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                <span className="ss-name">{s.name}</span>
                <span className="ss-score">{s.score}</span>
              </div>
            ))}
          </div>
          {isHost && (
            <div className="ss-gameover-buttons">
              <button className="ss-next-btn" onClick={onRestartSame}>🔄 Play Again</button>
              <button className="ss-next-btn" onClick={onReturn}>🎉 Back to Party!</button>
            </div>
          )}
        </div>
      )}

      {/* ── WAITING ── */}
      {phase === 'waiting' && (
        <div className="ss-phase ss-phase--waiting">
          <div className="ss-waiting-text">Getting things ready... 🎨</div>
        </div>
      )}

      {/* ── PENDING (joined mid-game) ── */}
      {phase === 'pending' && (
        <div className="ss-phase ss-phase--waiting">
          <div className="ss-round-banner">🕒 Round {roundNumber} in progress — you'll play next round!</div>
          {currentDrawing && (
            <>
              <div className="ss-info-bar">
                <span>🗳️ {artistName ? `${artistName}'s drawing` : 'Current drawing'}</span>
              </div>
              <div className="ss-drawing-display">
                <img src={currentDrawing} alt="Current drawing" className="ss-drawing-img" />
              </div>
            </>
          )}
          {!currentDrawing && (
            <div className="ss-waiting-text">👀 Watching the action…</div>
          )}
          <div className="ss-correct-guessers" style={{marginTop: 12}}>
            You'll join automatically when the next round starts.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Decoy Input Component ──
function DecoyInput({ onSubmit }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { setText(''); inputRef.current?.focus(); }, []);

  const handleSubmit = () => {
    if (text.trim().length >= 3) {
      onSubmit(text.trim());
      setText('');
    }
  };

  return (
    <div className="ss-decoy-input">
      <div className="ss-decoy-label">🤔 What do you think this is?</div>
      <div className="ss-input-row">
        <input
          ref={inputRef}
          className="ss-text-input"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="Type your best guess (or bluff!)"
          maxLength={150}
        />
        <button
          className={`ss-send-btn ${text.trim().length >= 3 ? 'active' : ''}`}
          onClick={handleSubmit}
          disabled={text.trim().length < 3}
        >
          Send
        </button>
      </div>
    </div>
  );
}
