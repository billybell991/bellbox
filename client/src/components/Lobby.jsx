import React from 'react';
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
        <button className="leave-btn" onClick={onLeave} title="Leave party">✕</button>
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
      <div className="game-selector">
        <h3>Pick a Game!</h3>
        {(() => {
          // Group games by category
          const categories = {};
          const categoryOrder = ['Wordplay & Wit', 'Moral Mayhem', 'Spark of Creation', 'Sonic Shenanigans', 'Schemes & Suspects', 'Rapid Reactions'];
          const categoryMeta = {
            'Wordplay & Wit':      { emoji: '✍️', color: '#AFFF33' },
            'Moral Mayhem':        { emoji: '⚖️', color: '#33CCFF' },
            'Spark of Creation':   { emoji: '🎨', color: '#ff4081' },
            'Sonic Shenanigans':   { emoji: '🎤', color: '#21ffb2' },
            'Schemes & Suspects':  { emoji: '😈', color: '#FF7F00' },
            'Rapid Reactions':     { emoji: '⚡', color: '#FFE02F' },
          };

          games.forEach(game => {
            const cat = game.category || 'Other';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(game);
          });

          // Sort categories in order, then append any extras
          const orderedCats = categoryOrder.filter(c => categories[c]);
          Object.keys(categories).forEach(c => {
            if (!orderedCats.includes(c)) orderedCats.push(c);
          });

          return orderedCats.map(cat => {
            const meta = categoryMeta[cat] || { emoji: '🎮', color: '#888' };
            return (
              <div key={cat} className="game-category">
                <div className="game-category-header" style={{ '--cat-color': meta.color }}>
                  <span className="game-category-emoji">{meta.emoji}</span>
                  <span className="game-category-name">{cat}</span>
                </div>
                <div className="game-cards">
                  {categories[cat].map((game) => {
                    const voteCount = votes[game.id] || 0;
                    const playerVoted = players.find(p => p.id === socket.id)?.vote === game.id;

                    return (
                      <div
                        key={game.id}
                        className="game-card"
                        style={{ '--card-accent': game.color || meta.color }}
                      >
                        <div className="game-card-emoji">{game.emoji}</div>
                        <h3 className="game-card-title">{game.name}</h3>
                        <p className="game-card-desc">{game.description}</p>
                        <div className="game-card-players">
                          {game.minPlayers}-{game.maxPlayers} players
                        </div>

                        <div className="game-card-actions">
                          <button
                            className={`vote-btn ${playerVoted ? 'voted' : ''}`}
                            onClick={(e) => { e.stopPropagation(); onVote(game.id); }}
                          >
                            ❤️ {voteCount}
                          </button>

                          {isHost && (
                            <button
                              className="button button--primary launch-btn"
                              onClick={() => onLaunch(game.id)}
                              disabled={players.length < game.minPlayers}
                            >
                              {players.length < game.minPlayers
                                ? `Need ${game.minPlayers}+`
                                : '🚀 Launch!'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* Theme selector for NAH (only visible when host is about to launch NAH) */}
      {isHost && nahThemes && Object.keys(nahThemes).length > 0 && (
        <div className="theme-selector pop-in">
          <h3>🃏 Card Packs</h3>
          <div className="theme-chips">
            {Object.entries(nahThemes).map(([id, theme]) => (
              <button
                key={id}
                className={`theme-chip ${nahSelectedThemes.includes(id) ? 'selected' : ''}`}
                onClick={() => onToggleTheme(id)}
              >
                {theme.icon} {theme.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isHost && (
        <div className="waiting-text pop-in">
          Waiting for the host to launch a game...
        </div>
      )}
    </div>
  );
}
