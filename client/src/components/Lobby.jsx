import React, { useState } from 'react';
import socket from '../socket';

const SPICE_LEVELS = [
  { level: 1, emoji: '🧸', label: 'Family Fun', color: '#4caf50', description: 'Clean & wholesome — safe for all ages!' },
  { level: 2, emoji: '🌶️', label: 'Spicy',      color: '#ff9800', description: 'A little heat — innuendo & sass' },
  { level: 3, emoji: '🔥', label: 'Unhinged',   color: '#f44336', description: 'Full filth — nothing is off limits' },
];

export default function Lobby({
  roomCode, players, isHost, games, votes,
  onVote, onLaunch, onLeave,
  nahThemes, nahSelectedThemes, onToggleTheme,
  spiceLevel, onSetSpice,
}) {
  const currentSpice = SPICE_LEVELS.find(s => s.level === spiceLevel) || SPICE_LEVELS[1];

  return (
    <div className="lobby-screen">
      {/* Header */}
      <div className="lobby-header">
        <h2 className="lobby-title wobble">BellBox</h2>
      </div>

      {/* Room Code */}
      <div className="room-code-display pop-in"
        onClick={() => { navigator.clipboard?.writeText(roomCode); }}
        title="Tap to copy"
      >
        <div className="room-code-label">ROOM CODE</div>
        <div className="room-code-value">{roomCode}</div>
        <div className="room-code-hint">tap to copy · share with friends!</div>
      </div>

      {/* Players */}
      <div className="player-grid pop-in">
        <h3>🎮 Players ({players.length})</h3>
        <div className="player-avatars">
          {players.map((p, i) => (
            <div
              key={p.id}
              className={`player-chip ${p.isHost ? 'host' : ''}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="chip-avatar">{p.name[0].toUpperCase()}</div>
              <span className="chip-name">{p.name}</span>
              {p.isHost && <span className="host-crown">👑</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Spice-O-Meter ─────────────────────────────────── */}
      <div className="spice-meter pop-in">
        <h3>🌡️ Spice-O-Meter</h3>
        <div className="spice-track">
          <div
            className="spice-indicator"
            style={{
              '--spice-color': currentSpice.color,
              left: `${((spiceLevel - 1) / 2) * 100}%`,
            }}
          />
          {SPICE_LEVELS.map((s) => (
            <button
              key={s.level}
              className={`spice-btn ${spiceLevel === s.level ? 'active' : ''}`}
              style={{ '--spice-color': s.color }}
              onClick={() => isHost && onSetSpice(s.level)}
              disabled={!isHost}
              title={isHost ? s.description : 'Only the host can change this'}
            >
              <span className="spice-emoji">{s.emoji}</span>
              <span className="spice-label">{s.label}</span>
            </button>
          ))}
        </div>
        <div className="spice-description" style={{ color: currentSpice.color }}>
          {currentSpice.emoji} {currentSpice.description}
        </div>
        {!isHost && (
          <div className="spice-host-note">Host controls the spice level</div>
        )}
      </div>

      {/* Game Selector */}
      <GameList
        games={games}
        votes={votes}
        players={players}
        isHost={isHost}
        onVote={onVote}
        onLaunch={onLaunch}
      />



      {!isHost && (
        <div className="waiting-text pop-in">
          Waiting for the host to launch a game...
        </div>
      )}
    </div>
  );
}

/* ── Game List (collapsible categories, compact list rows) ── */
const categoryOrder = ['Wordplay & Wit', 'Moral Mayhem', 'Spark of Creation', 'Sonic Shenanigans', 'Schemes & Suspects', 'Rapid Reactions'];
const categoryMeta = {
  'Wordplay & Wit':      { emoji: '✍️', color: '#AFFF33' },
  'Moral Mayhem':        { emoji: '⚖️', color: '#33CCFF' },
  'Spark of Creation':   { emoji: '🎨', color: '#ff4081' },
  'Sonic Shenanigans':   { emoji: '🎤', color: '#21ffb2' },
  'Schemes & Suspects':  { emoji: '😈', color: '#FF7F00' },
  'Rapid Reactions':     { emoji: '⚡', color: '#FFE02F' },
};

function GameList({ games, votes, players, isHost, onVote, onLaunch }) {
  const [collapsed, setCollapsed] = useState(() => {
    const init = {};
    categoryOrder.forEach(c => { init[c] = true; });
    return init;
  });
  const [infoGame, setInfoGame] = useState(null);

  const toggle = (cat) => setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));

  // Group games by category
  const categories = {};
  games.forEach(game => {
    const cat = game.category || 'Other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(game);
  });

  const orderedCats = categoryOrder.filter(c => categories[c]);
  Object.keys(categories).forEach(c => {
    if (!orderedCats.includes(c)) orderedCats.push(c);
  });

  return (
    <div className="game-selector">
      <h3>Pick a Game!</h3>
      {orderedCats.map(cat => {
        const meta = categoryMeta[cat] || { emoji: '🎮', color: '#888' };
        const isCollapsed = collapsed[cat];
        return (
          <div key={cat} className="game-category">
            <button
              className="game-category-header"
              style={{ '--cat-color': meta.color }}
              onClick={() => toggle(cat)}
            >
              <span className="game-category-emoji">{meta.emoji}</span>
              <span className="game-category-name">{cat}</span>
              <span className="game-category-count">{categories[cat].length}</span>
              <span className={`game-category-chevron ${isCollapsed ? 'collapsed' : ''}`}>▾</span>
            </button>
            {!isCollapsed && (
              <div className="game-list">
                {categories[cat].map((game) => {
                  const voteCount = votes[game.id] || 0;
                  const playerVoted = players.find(p => p.id === socket.id)?.vote === game.id;
                  const canLaunch = players.length >= game.minPlayers;

                  return (
                    <div
                      key={game.id}
                      className={`game-row ${isHost ? 'game-row--host' : ''}`}
                      style={{ '--card-accent': game.color || meta.color }}
                      onClick={() => isHost && onLaunch(game.id)}
                    >
                      <div className="game-row-emoji">{game.emoji}</div>
                      <div className="game-row-info">
                        <div className="game-row-title">{game.name}</div>
                        <div className="game-row-desc">{game.description}</div>
                        <div className="game-row-players">{game.minPlayers}-{game.maxPlayers} players</div>
                      </div>
                      <div className="game-row-actions">
                        <button
                          className="game-info-btn"
                          onClick={(e) => { e.stopPropagation(); setInfoGame(game); }}
                          title="How to play"
                        >?</button>
                        <button
                          className={`vote-btn vote-btn--compact ${playerVoted ? 'voted' : ''}`}
                          onClick={(e) => { e.stopPropagation(); onVote(game.id); }}
                        >
                          ❤️ {voteCount}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Game Info Popup */}
      {infoGame && (
        <div className="game-info-overlay" onClick={() => setInfoGame(null)}>
          <div className="game-info-popup pop-in" onClick={e => e.stopPropagation()}>
            <button className="game-info-close" onClick={() => setInfoGame(null)}>✕</button>
            <div className="game-info-emoji">{infoGame.emoji}</div>
            <h2 className="game-info-title">{infoGame.name}</h2>
            <div className="game-info-meta">
              {infoGame.minPlayers}-{infoGame.maxPlayers} players
            </div>
            <p className="game-info-desc">{infoGame.description}</p>
            {infoGame.howToPlay && (
              <>
                <h3 className="game-info-section-title">How to Play</h3>
                <p className="game-info-howto">{infoGame.howToPlay}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
