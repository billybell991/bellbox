import React, { useState, useEffect } from 'react';

export default function Game({ gameState, myId, onSubmit, onJudge, onNextRound, onPlayAgain, onRestartSame, isHost, onLeave }) {
  const [selectedCards, setSelectedCards] = useState([]);
  const [selectedJudge, setSelectedJudge] = useState(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const { phase, blackCard: memeCard, hand, cardCzar, roundNumber, players, scores, submissions, winner } = gameState;
  const isCzar = myId === cardCzar;
  const czarName = players?.find(p => p.id === cardCzar)?.name || 'Someone';
  const mySubmitted = players?.find(p => p.id === myId)?.hasSubmitted;

  useEffect(() => {
    setSelectedCards([]);
    setSelectedJudge(null);
  }, [phase, roundNumber]);

  const toggleCard = (index) => {
    if (mySubmitted || isCzar) return;
    const pick = memeCard.pick;
    if (pick === 1) {
      if (selectedCards.includes(index)) {
        onSubmit([index]);
        setSelectedCards([]);
      } else {
        setSelectedCards([index]);
      }
      return;
    }
    if (selectedCards.includes(index) && selectedCards.length === pick) {
      onSubmit(selectedCards);
      setSelectedCards([]);
      return;
    }
    setSelectedCards(prev => {
      if (prev.includes(index)) return prev.filter(i => i !== index);
      if (prev.length >= pick) return [...prev.slice(1), index];
      return [...prev, index];
    });
  };

  // ── Social Media Post (the meme image) ──
  const renderMemePost = () => {
    const submitted = players?.filter(p => p.hasSubmitted).length || 0;
    const total = (players?.length || 1) - 1;

    return (
      <div className={`mm-post ${isCzar && phase === 'picking' ? 'mm-post--czar' : ''}`}>
        {/* Post header — like an IG post */}
        <div className="mm-post-header">
          <div className="mm-post-avatar">🤣</div>
          <div className="mm-post-user-info">
            <span className="mm-post-username">meme_melee</span>
            <span className="mm-post-location">Round {roundNumber}</span>
          </div>
          <button className="mm-score-btn" onClick={() => setShowScoreboard(true)} title="Scoreboard">
            🏆
          </button>
        </div>

        {/* The meme image */}
        <div className="mm-post-image-wrap">
          {memeCard?.imageUrl ? (
            <img src={memeCard.imageUrl} alt={memeCard.alt || 'Meme'} className="mm-post-image" />
          ) : (
            <div className="mm-post-placeholder">Caption this!</div>
          )}
        </div>

        {/* Status line */}
        <div className="mm-post-caption">
          {phase === 'picking' && (
            <>
              <span className="mm-caption-bold">meme_melee</span>{' '}
              {isCzar ? (
                <span>You're the <strong>Meme Judge</strong> — sit back and wait for captions 😎</span>
              ) : mySubmitted ? (
                <span>Caption submitted! Waiting for others... 🕐</span>
              ) : (
                <span>Pick {memeCard?.pick} caption{memeCard?.pick > 1 ? 's' : ''} to match this meme 👇</span>
              )}
            </>
          )}
          {phase === 'judging' && (
            <>
              <span className="mm-caption-bold">meme_melee</span>{' '}
              {isCzar ? (
                <span>Pick the <strong>funniest</strong> caption! 🏆</span>
              ) : (
                <span>The Meme Judge (<strong>{czarName}</strong>) is choosing... 🤔</span>
              )}
            </>
          )}
        </div>

        {/* Comments count = submissions */}
        {phase === 'picking' && (
          <div className="mm-post-comments">
            {submitted > 0 ? `View all ${submitted} caption${submitted !== 1 ? 's' : ''}` : 'No captions yet'} — {submitted}/{total}
          </div>
        )}

        {/* Judge badge */}
        <div className="mm-post-judge">
          👨‍⚖️ Judge: <strong>{czarName}</strong> {isCzar ? '(You!)' : ''}
        </div>
      </div>
    );
  };

  // ── Caption Cards (your "hand") — styled as comment drafts ──
  const renderHand = () => {
    if (phase !== 'picking' || isCzar || !hand) return null;
    return (
      <div className="mm-hand-section">
        <div className="mm-hand-label">Your Captions</div>
        <div className="mm-hand">
          {hand.map((card, i) => (
            <div
              key={`${card}-${i}`}
              className={`mm-caption-card ${selectedCards.includes(i) ? 'mm-caption-card--selected' : ''} ${mySubmitted ? 'mm-caption-card--disabled' : ''}`}
              onClick={() => toggleCard(i)}
            >
              <span className="mm-caption-card-text">{card}</span>
              {selectedCards.includes(i) && (memeCard?.pick === 1 || selectedCards.length === memeCard?.pick) && !mySubmitted && (
                <span className="tap-to-submit">tap to submit</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Judging submissions — styled as "comments" under the post ──
  const renderJudging = () => {
    if (phase !== 'judging' || !submissions) return null;
    return (
      <div className="mm-judging-section">
        <div className="mm-judging-label">💬 Captions</div>
        <div className="mm-submissions">
          {submissions.map((sub, i) => (
            <div
              key={i}
              className={`mm-submission ${isCzar ? 'mm-submission--judgeable' : ''} ${selectedJudge === i ? 'mm-submission--selected' : ''}`}
              onClick={() => {
                if (!isCzar) return;
                if (selectedJudge === i) {
                  onJudge(i);
                  setSelectedJudge(null);
                } else {
                  setSelectedJudge(i);
                }
              }}
            >
              <div className="mm-submission-avatar">😏</div>
              <div className="mm-submission-body">
                <span className="mm-submission-user">anonymous</span>
                {sub.cards.map((card, j) => (
                  <span key={j} className="mm-submission-text">{card}</span>
                ))}
              </div>
              {isCzar && selectedJudge === i && (
                <span className="tap-to-submit">tap to pick</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Round End / Game Over overlay ──
  const renderRoundEnd = () => {
    if (phase !== 'roundend' && phase !== 'gameover') return null;
    return (
      <div className="mm-overlay">
        <div className="mm-overlay-content">
          {phase === 'gameover' ? (
            <>
              <div className="mm-overlay-emoji">🏆</div>
              <h2 className="mm-overlay-title">GAME OVER</h2>
              <h3 className="mm-overlay-winner">{scores?.[0]?.name} wins!</h3>
            </>
          ) : (
            <>
              <div className="mm-overlay-emoji">🎉</div>
              <h2 className="mm-overlay-title">ROUND WINNER</h2>
              <h3 className="mm-overlay-winner">{winner?.name}</h3>
            </>
          )}

          {/* Show winning meme + caption combo as a mini-post */}
          {memeCard && (
            <div className="mm-winning-post">
              {memeCard.imageUrl && (
                <img src={memeCard.imageUrl} alt={memeCard.alt || 'Meme'} className="mm-winning-img" />
              )}
              {winner?.cards && (
                <div className="mm-winning-captions">
                  {winner.cards.map((card, i) => (
                    <div key={i} className="mm-winning-caption">{card}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Scoreboard */}
          <div className="mm-result-scores">
            {scores?.map((s, i) => (
              <div key={i} className="mm-result-score-row">
                <span className="mm-result-name">{i === 0 ? '👑 ' : ''}{s.name}</span>
                <span className="mm-result-pts">{s.score}</span>
              </div>
            ))}
          </div>

          {phase === 'roundend' && (
            <button className="btn btn-next mm-next-btn" onClick={onNextRound}>NEXT ROUND</button>
          )}
          {phase === 'gameover' && isHost && (
            <div className="mm-gameover-btns">
              <button className="btn btn-create" onClick={onRestartSame}>🔄 Play Again</button>
              <button className="btn btn-create" onClick={onPlayAgain}>🎉 Back to Party</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Scoreboard overlay ──
  const renderScoreboard = () => {
    if (!showScoreboard) return null;
    return (
      <div className="mm-overlay" onClick={() => setShowScoreboard(false)}>
        <div className="mm-overlay-content">
          <h2 className="mm-overlay-title" style={{ fontSize: '1.2rem' }}>🏆 Scoreboard</h2>
          {scores?.map((s, i) => (
            <div key={i} className="mm-result-score-row">
              <span className="mm-result-name">{s.name}</span>
              <span className="mm-result-pts">{s.score} / 7</span>
            </div>
          ))}
          <div className="mm-dismiss-hint">tap anywhere to close</div>
        </div>
      </div>
    );
  };

  return (
    <div className="game mm-game">
      {renderMemePost()}
      {renderHand()}
      {renderJudging()}
      {renderRoundEnd()}
      {renderScoreboard()}

      {showLeaveConfirm && (
        <div className="confirm-overlay" onClick={() => setShowLeaveConfirm(false)}>
          <div className="confirm-modal">
            <h2>Leave Game?</h2>
            <p>You'll lose your current progress.</p>
            <div className="confirm-actions">
              <button className="btn btn-back" onClick={() => setShowLeaveConfirm(false)}>STAY</button>
              <button className="btn btn-leave" onClick={onLeave}>LEAVE</button>
            </div>
            <div className="game-info-dismiss">tap outside to close</div>
          </div>
        </div>
      )}
    </div>
  );
}
