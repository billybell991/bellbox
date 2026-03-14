// GameShell — Shared game UI framework for all BellBox games
// Provides the canonical round flow UI: Timer, BellBot, Prompt, Submissions, Voting, Scores

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Timer Component ─────────────────────────────────────────
function GameTimer({ seconds, onExpire, label }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
    if (!seconds) return;
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds, onExpire]);

  const pct = seconds > 0 ? (remaining / seconds) * 100 : 0;
  const urgent = remaining <= 5;

  return (
    <div className={`gs-timer ${urgent ? 'gs-timer--urgent' : ''}`}>
      <div className="gs-timer-bar" style={{ width: `${pct}%` }} />
      <span className="gs-timer-text">{label || ''} {remaining}s</span>
    </div>
  );
}

// ── BellBot Commentary ──────────────────────────────────────
function BellBotBubble({ message, skin }) {
  if (!message) return null;
  return (
    <div className="gs-bellbot">
      <div className="gs-bellbot-avatar">{skin || '🤖'}</div>
      <div className="gs-bellbot-bubble">{message}</div>
    </div>
  );
}

// ── Leaderboard ─────────────────────────────────────────────
function Leaderboard({ scores, compact }) {
  if (!scores?.length) return null;
  return (
    <div className={`gs-leaderboard ${compact ? 'gs-leaderboard--compact' : ''}`}>
      {!compact && <h3 className="gs-leaderboard-title">Leaderboard</h3>}
      {scores.map((s, i) => (
        <div key={s.id || i} className="gs-leaderboard-row">
          <span className="gs-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
          <span className="gs-name">{s.name}</span>
          <span className="gs-score">{s.score || s.cumulativeScore || 0}</span>
        </div>
      ))}
    </div>
  );
}

// ── Round Scores ────────────────────────────────────────────
function RoundScoreboard({ roundScores }) {
  if (!roundScores?.length) return null;
  return (
    <div className="gs-round-scores">
      <h3>Round Results</h3>
      {roundScores.map((s, i) => (
        <div key={s.id || i} className="gs-round-score-row">
          <span className="gs-rank">{i === 0 ? '👑' : `${i + 1}.`}</span>
          <span className="gs-name">{s.name}</span>
          <div className="gs-score-breakdown">
            <span className="gs-ai-score" title="AI Score">🤖 {s.aiScore}</span>
            <span className="gs-vote-score" title="Vote Score">👥 {s.voteScore}</span>
            <span className="gs-total">= {s.roundTotal}</span>
          </div>
          {s.aiComment && <div className="gs-ai-comment">"{s.aiComment}"</div>}
        </div>
      ))}
    </div>
  );
}

// ── Main GameShell Component ────────────────────────────────
/**
 * GameShell wraps any BellBox game with standard UI chrome
 *
 * Props:
 *   socket      - Socket.IO client
 *   gameState   - Current game state from server
 *   gameName    - Display name
 *   gameEmoji   - Emoji icon for this game
 *   bellbotSkin - Emoji/icon for BellBot in this game context
 *   bellbotSays - Current BellBot message
 *   onReturn    - Callback to return to lobby
 *   isHost      - Is this player the host?
 *   children    - Game-specific rendering (submission UI)
 *
 *   -- Phase-specific render props --
 *   renderSubmission  - (prompt, onSubmit, timeLeft) => JSX for submission phase
 *   renderReveal      - (reveal) => JSX for reveal phase
 *   renderVoting      - (submissions, onVote) => JSX for voting phase
 *   renderCustom      - () => JSX for fully custom game UIs
 */
export default function GameShell({
  gameState,
  gameName,
  gameEmoji = '🎮',
  bellbotSkin = '🤖',
  bellbotSays = '',
  onReturn,
  isHost,
  round = 0,
  totalRounds = 4,
  // Phase rendering
  renderSubmission,
  renderReveal,
  renderVoting,
  renderScoring,
  renderCustom,
  // Timer
  timeLimit = 0,
  onTimeExpire,
  timerLabel = '',
  // Scores
  scores = [],
  roundScores = [],
  gameOver = false,
  winner = null,
}) {
  const phase = gameState?.state || gameState?.phase || 'WAITING';

  return (
    <div className="gs-container">
      {/* Header */}
      <div className="gs-header">
        <div className="gs-game-title">
          <span className="gs-game-emoji">{gameEmoji}</span>
          <span>{gameName}</span>
        </div>
        <div className="gs-round-badge">
          Round {round}/{totalRounds}
        </div>
      </div>

      {/* BellBot */}
      <BellBotBubble message={bellbotSays} skin={bellbotSkin} />

      {/* Timer */}
      {timeLimit > 0 && phase !== 'ROUND_END' && phase !== 'GAME_OVER' && phase !== 'SCORING' && (
        <GameTimer seconds={timeLimit} onExpire={onTimeExpire} label={timerLabel} />
      )}

      {/* Compact leaderboard during play */}
      {phase !== 'GAME_OVER' && scores.length > 0 && (
        <Leaderboard scores={scores} compact />
      )}

      {/* Main content area */}
      <div className="gs-content">
        {renderCustom ? renderCustom() : (
          <>
            {/* Submission Phase */}
            {phase === 'SUBMISSION' && renderSubmission && renderSubmission()}

            {/* Reveal Phase */}
            {phase === 'REVEAL' && renderReveal && renderReveal()}

            {/* Voting Phase */}
            {phase === 'VOTING' && renderVoting && renderVoting()}

            {/* Scoring Phase / Round End */}
            {(phase === 'SCORING' || phase === 'ROUND_END') && (
              <div className="gs-scoring">
                <RoundScoreboard roundScores={roundScores} />
                {renderScoring && renderScoring()}
                {isHost && (
                  <button className="button button--primary gs-next-btn" onClick={onReturn}>
                    {round >= totalRounds ? '🏆 Final Scores' : '➡️ Next Round'}
                  </button>
                )}
              </div>
            )}

            {/* Game Over */}
            {phase === 'GAME_OVER' && (
              <div className="gs-game-over">
                <div className="gs-winner-crown">🏆</div>
                <div className="gs-winner-name wobble">{winner?.name || 'Nobody'}</div>
                <div className="gs-winner-score">{winner?.score || 0} points</div>
                <Leaderboard scores={scores} />
                {isHost && (
                  <button className="button button--primary gs-back-btn" onClick={onReturn}>
                    🎉 Back to Party!
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Export sub-components for game-specific use
export { GameTimer, BellBotBubble, Leaderboard, RoundScoreboard };
