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

  // Reset selections on phase/round change
  useEffect(() => {
    setSelectedCards([]);
    setSelectedJudge(null);
  }, [phase, roundNumber]);

  const toggleCard = (index) => {
    if (mySubmitted || isCzar) return;
    const pick = memeCard.pick;
    if (pick === 1) {
      // Two-tap: first tap highlights, second tap submits
      if (selectedCards.includes(index)) {
        onSubmit([index]);
        setSelectedCards([]);
      } else {
        setSelectedCards([index]);
      }
      return;
    }
    // Pick 2+: if all picks selected and clicking a selected card, submit
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

  const renderMemeCard = () => (
    <div className={`meme-card ${!isCzar && phase === 'picking' ? 'compact' : ''} ${isCzar && phase === 'picking' ? 'czar-waiting' : ''}`}>
      {memeCard.imageUrl ? (
        <img src={memeCard.imageUrl} alt={memeCard.alt || 'Meme'} className="meme-card-image" />
      ) : (
        <div className="meme-card-text">{memeCard.text || 'Caption this!'}</div>
      )}
      <div className="meme-card-meta">
        Pick {memeCard.pick} caption{memeCard.pick > 1 ? 's' : ''} &bull; Round {roundNumber}
      </div>
    </div>
  );

  const renderStatus = () => {
    if (phase === 'picking') {
      const submitted = players?.filter(p => p.hasSubmitted).length || 0;
      const total = (players?.length || 1) - 1;
      return (
        <div className="status-bar">
          {isCzar ? (
            <span>You are the <strong>Meme Judge</strong> — wait for captions</span>
          ) : mySubmitted ? (
            <span>Caption submitted! Waiting for others...</span>
          ) : (
            <span>Pick {memeCard.pick} caption{memeCard.pick > 1 ? 's' : ''} for this meme</span>
          )}
          <div className="submission-count">{submitted}/{total} submitted</div>
        </div>
      );
    }
    if (phase === 'judging') {
      return (
        <div className="status-bar">
          {isCzar ? (
            <span>Pick the <strong>funniest</strong> caption!</span>
          ) : (
            <span>The Meme Judge ({czarName}) is choosing...</span>
          )}
        </div>
      );
    }
    return null;
  };

  const renderHand = () => {
    if (phase !== 'picking' || isCzar || !hand) return null;
    return (
      <div className="hand-section">
        <div className="hand">
          {hand.map((card, i) => (
            <div
              key={`${card}-${i}`}
              className={`white-card ${selectedCards.includes(i) ? 'selected' : ''} ${mySubmitted ? 'disabled' : ''}`}
              onClick={() => toggleCard(i)}
            >
              <span className="white-card-text">{card}</span>
              {selectedCards.includes(i) && memeCard.pick > 1 && (
                <span className="card-order">{selectedCards.indexOf(i) + 1}</span>
              )}
              {selectedCards.includes(i) && (memeCard.pick === 1 || selectedCards.length === memeCard.pick) && !mySubmitted && (
                <span className="tap-to-submit">tap to submit</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderJudging = () => {
    if (phase !== 'judging' || !submissions) return null;
    return (
      <div className="judging-section">
        <div className="submissions-grid">
          {submissions.map((sub, i) => (
            <div
              key={i}
              className={`submission-card ${isCzar ? 'judgeable' : ''} ${selectedJudge === i ? 'selected' : ''}`}
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
              {sub.cards.map((card, j) => (
                <div key={j} className="submission-white-card">{card}</div>
              ))}
              {isCzar && selectedJudge === i && (
                <span className="tap-to-submit">tap to pick this caption</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRoundEnd = () => {
    if (phase !== 'roundend' && phase !== 'gameover') return null;
    return (
      <div className="round-end-overlay">
        <div className="round-end-content">
          {phase === 'gameover' ? (
            <>
              <h2 className="winner-banner">GAME OVER!</h2>
              <h3 className="winner-name">{scores?.[0]?.name} wins!</h3>
            </>
          ) : (
            <>
              <h2 className="winner-banner">ROUND WINNER</h2>
              <h3 className="winner-name">{winner?.name}</h3>
            </>
          )}
          {memeCard && (
            <div className="meme-card compact" style={{ margin: '12px 0 4px' }}>
              {memeCard.imageUrl ? (
                <img src={memeCard.imageUrl} alt={memeCard.alt || 'Meme'} className="meme-card-image" />
              ) : (
                <div className="meme-card-text">{memeCard.text}</div>
              )}
            </div>
          )}
          {winner?.cards && (
            <div className="winning-cards">
              {winner.cards.map((card, i) => (
                <div key={i} className="winning-white-card">{card}</div>
              ))}
            </div>
          )}
          <div className="end-scores">
            {scores?.map((s, i) => (
              <div key={i} className="score-row">
                <span className="score-name">{i === 0 ? '👑 ' : ''}{s.name}</span>
                <span className="score-value">{s.score}</span>
              </div>
            ))}
          </div>
          {phase === 'roundend' && (
            <button className="btn btn-next" onClick={onNextRound}>NEXT ROUND</button>
          )}
          {phase === 'gameover' && isHost && (
            <div className="game-over-buttons">
              <button className="btn btn-create" onClick={onRestartSame}>
                🔄 Play Again
              </button>
              <button className="btn btn-create" onClick={onPlayAgain}>
                🎉 Back to Party
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderScoreboard = () => {
    if (!showScoreboard) return null;
    return (
      <div className="scoreboard-overlay" onClick={() => setShowScoreboard(false)}>
        <div className="scoreboard-content">
          <h2>Scoreboard</h2>
          {scores?.map((s, i) => (
            <div key={i} className="score-row">
              <span className="score-name">{s.name}</span>
              <span className="score-value">{s.score} / 7</span>
            </div>
          ))}
          <div className="game-info-dismiss">tap anywhere to close</div>
        </div>
      </div>
    );
  };

  return (
    <div className="game meme-melee-game">
      <div className="game-header">
        <span className="round-indicator">Round {roundNumber}</span>
        <span className="czar-indicator">Judge: {czarName} {isCzar ? '(You!)' : ''}</span>

      </div>

      {renderMemeCard()}
      {renderStatus()}
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
