import React, { useState, useCallback } from 'react';
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
  aiBots, onToggleAiBots,
  theme,
}) {

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
              <div className="chip-avatar">
                <img src={`/images/avatars/${theme || 'party'}/avatar-${p.avatar || 1}.png`} alt={p.name} />
              </div>
              <span className="chip-name">{p.name}</span>
              {p.isHost && <span className="host-crown">👑</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── AI Opponents Toggle (host only) ───────────────── */}
      {isHost && (
      <div className="ai-bots-toggle pop-in">
        <div className="ai-bots-row" onClick={onToggleAiBots}>
          <span className="ai-bots-label">🤖 AI Opponents</span>
          <div className={`toggle-switch ${aiBots ? 'on' : ''}`}>
            <div className="toggle-knob" />
          </div>
        </div>
        <div className="ai-bots-desc">
          {aiBots ? 'Bot players will fill out the group' : 'Add bot players to fill out the group'}
        </div>
      </div>
      )}

      {/* Game Selector */}
      <GameList
        games={games}
        votes={votes}
        players={players}
        isHost={isHost}
        onVote={onVote}
        onLaunch={onLaunch}
        spiceLevel={spiceLevel}
        onSetSpice={onSetSpice}
        nahSelectedThemes={nahSelectedThemes}
        onToggleTheme={onToggleTheme}
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
  'Wordplay & Wit':      { emoji: '✍️', color: '#AFFF33', desc: 'Clever prompts, funny fills, and battle of the brains' },
  'Moral Mayhem':        { emoji: '⚖️', color: '#33CCFF', desc: 'Debate, judge, and question everything you believe' },
  'Spark of Creation':   { emoji: '🎨', color: '#ff4081', desc: 'Draw, caption, and create absurd masterpieces' },
  'Sonic Shenanigans':   { emoji: '🎤', color: '#21ffb2', desc: 'Sing, speak, and perform your heart out' },
  'Schemes & Suspects':  { emoji: '😈', color: '#FF7F00', desc: 'Bluff, deceive, and figure out who\'s lying' },
  'Rapid Reactions':     { emoji: '⚡', color: '#FFE02F', desc: 'Fast-paced rounds that test your reflexes' },
};

function GameList({ games, votes, players, isHost, onVote, onLaunch, spiceLevel, onSetSpice, nahSelectedThemes, onToggleTheme }) {
  const [collapsed, setCollapsed] = useState(() => {
    const init = {};
    categoryOrder.forEach(c => { init[c] = true; });
    return init;
  });
  const [infoGame, setInfoGame] = useState(null);
  const [preLaunchGame, setPreLaunchGame] = useState(null);
  const [selectedPacks, setSelectedPacks] = useState([]);
  const [selectedTriviaCats, setSelectedTriviaCats] = useState([]);
  const [triviaCatsOpen, setTriviaCatsOpen] = useState(false);
  const [notEnoughMsg, setNotEnoughMsg] = useState(null);

  const toggle = (cat) => setCollapsed(prev => {
    const wasCollapsed = prev[cat];
    const next = { ...prev, [cat]: !wasCollapsed };
    if (wasCollapsed) {
      // Opening — scroll the category into view after render
      setTimeout(() => {
        const el = document.getElementById(`cat-${cat}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
    return next;
  });

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
      <h3>{isHost ? 'Pick a Game!' : 'The host is picking a game'}</h3>
      {orderedCats.map(cat => {
        const meta = categoryMeta[cat] || { emoji: '🎮', color: '#888' };
        const isCollapsed = collapsed[cat];
        return (
          <div key={cat} id={`cat-${cat}`} className="game-category">
            <button
              className="game-category-header"
              style={{ '--cat-color': meta.color }}
              onClick={() => toggle(cat)}
            >
              <span className="game-category-emoji">{meta.emoji}</span>
              <div className="game-category-text">
                <div className="game-category-name-row">
                  <span className="game-category-name">{cat}</span>
                  <span className="game-category-count">{categories[cat].length} games</span>
                </div>
                {meta.desc && <div className="game-category-desc">{meta.desc}</div>}
              </div>
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
                      onClick={() => {
                        if (!isHost) return;
                        if (!canLaunch) {
                          setNotEnoughMsg(`${game.name} needs at least ${game.minPlayers} players (you have ${players.length})`);
                          setTimeout(() => setNotEnoughMsg(null), 3000);
                          return;
                        }
                        if (game.triviaCategories) {
                          setPreLaunchGame(game);
                          setSelectedTriviaCats([...(game.defaultCategories || [])]);
                        } else if (game.nahThemes || game.packs || game.spicy) {
                          setPreLaunchGame(game);
                          if (game.packs) setSelectedPacks(Object.keys(game.packs));
                        } else {
                          onLaunch(game.id);
                        }
                      }}
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
          <div className="game-info-popup pop-in">
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
            <div className="game-info-dismiss">tap anywhere to close</div>
          </div>
        </div>
      )}

      {/* Pre-Launch Picker */}
      {preLaunchGame && (
        <div className="game-info-overlay" onClick={() => setPreLaunchGame(null)}>
          <div className="prelaunch-modal pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="prelaunch-header">
              {preLaunchGame.id === 'trivia-fetch' ? (
                <img src="/images/gus-mascot.png" alt="Gus" className="prelaunch-gus" />
              ) : (
                <span className="prelaunch-emoji">{preLaunchGame.emoji}</span>
              )}
              <h2 className="prelaunch-title">{preLaunchGame.name}</h2>
              {preLaunchGame.id === 'trivia-fetch' && (
                <div className="prelaunch-subtitle">Gus is ready to play! 🐾</div>
              )}
            </div>
            {/* ── Spice-O-Meter (spicy games only) ── */}
            {preLaunchGame.spicy && (
              <div className="prelaunch-section">
                <h3>🌡️ Spice-O-Meter</h3>
                <div className="spice-track">
                  <div
                    className="spice-indicator"
                    style={{
                      '--spice-color': (SPICE_LEVELS.find(s => s.level === spiceLevel) || SPICE_LEVELS[1]).color,
                      left: `${((spiceLevel - 1) / 2) * 100}%`,
                    }}
                  />
                  {SPICE_LEVELS.map((s) => (
                    <button
                      key={s.level}
                      className={`spice-btn ${spiceLevel === s.level ? 'active' : ''}`}
                      style={{ '--spice-color': s.color }}
                      onClick={() => onSetSpice(s.level)}
                      title={s.description}
                    >
                      <span className="spice-emoji">{s.emoji}</span>
                      <span className="spice-label">{s.label}</span>
                    </button>
                  ))}
                </div>
                <div className="spice-description" style={{ color: (SPICE_LEVELS.find(s => s.level === spiceLevel) || SPICE_LEVELS[1]).color }}>
                  {(SPICE_LEVELS.find(s => s.level === spiceLevel) || SPICE_LEVELS[1]).emoji}{' '}
                  {(SPICE_LEVELS.find(s => s.level === spiceLevel) || SPICE_LEVELS[1]).description}
                </div>
              </div>
            )}

            {/* ── Topic Pack Picker (base games) ── */}
            {preLaunchGame.packs && !preLaunchGame.triviaCategories && (
              <div className="prelaunch-section">
                <h3>📦 Topic Packs</h3>
                <div className="topic-grid">
                  {Object.values(preLaunchGame.packs).map(pack => {
                    const isSelected = selectedPacks.includes(pack.id);
                    return (
                      <button
                        key={pack.id}
                        className={`topic-chip ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedPacks(prev => {
                            if (prev.includes(pack.id)) {
                              if (prev.length <= 1) return prev;
                              return prev.filter(p => p !== pack.id);
                            }
                            return [...prev, pack.id];
                          });
                        }}
                        title={pack.description}
                      >
                        <span className="topic-emoji">{pack.emoji}</span>
                        <span className="topic-name">{pack.name}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="topic-hint">Tap to toggle — at least one required</div>
              </div>
            )}

            {/* ── NAH Theme Pack Picker ── */}
            {preLaunchGame.nahThemes && (
              <div className="prelaunch-section">
                <h3>📦 Card Packs</h3>
                <div className="topic-grid">
                  {Object.entries(preLaunchGame.nahThemes).map(([id, theme]) => {
                    const isSelected = nahSelectedThemes.includes(id);
                    return (
                      <button
                        key={id}
                        className={`topic-chip ${isSelected ? 'active' : ''}`}
                        onClick={() => onToggleTheme(id)}
                        title={theme.description}
                      >
                        <span className="topic-emoji">{theme.icon}</span>
                        <span className="topic-name">{theme.name}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="topic-hint">Tap to toggle — at least one required</div>
              </div>
            )}

            <div className="prelaunch-actions">
              <button
                className="prelaunch-go-btn"
                disabled={preLaunchGame.triviaCategories && selectedTriviaCats.length !== 6}
                onClick={() => {
                  if (preLaunchGame.triviaCategories) {
                    onLaunch(preLaunchGame.id, { selectedCategories: selectedTriviaCats });
                  } else {
                    onLaunch(preLaunchGame.id, { selectedTopics: selectedPacks });
                  }
                  setPreLaunchGame(null);
                  setTriviaCatsOpen(false);
                }}
              >
                {preLaunchGame.id === 'trivia-fetch' ? '🎾 Throw the Ball!' : '🚀 Launch!'}
              </button>

              {/* ── Trivia Category Picker (collapsible) ── */}
              {preLaunchGame.triviaCategories && (
                <>
                  <button
                    className={`prelaunch-customize-btn ${triviaCatsOpen ? 'open' : ''}`}
                    onClick={() => setTriviaCatsOpen(prev => !prev)}
                  >
                    🎯 Customize Categories
                    <span className="prelaunch-customize-chevron">{triviaCatsOpen ? '▴' : '▾'}</span>
                  </button>

                  {triviaCatsOpen && (
                    <div className="prelaunch-section trivia-cats-drawer">
                      <div className="trivia-cat-grid">
                        {preLaunchGame.triviaCategories.map((cat) => {
                          const isSelected = selectedTriviaCats.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              className={`trivia-cat-chip ${isSelected ? 'active' : ''}`}
                              style={isSelected ? { borderColor: cat.color, background: `${cat.color}22` } : {}}
                              onClick={() => {
                                setSelectedTriviaCats(prev => {
                                  if (prev.includes(cat.id)) {
                                    if (prev.length <= 1) return prev;
                                    return prev.filter(c => c !== cat.id);
                                  }
                                  if (prev.length >= 6) return prev;
                                  return [...prev, cat.id];
                                });
                              }}
                            >
                              <span className="trivia-cat-emoji">{cat.emoji}</span>
                              <span className="trivia-cat-name">{cat.name}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="topic-hint">
                        {selectedTriviaCats.length}/6 selected
                        {selectedTriviaCats.length < 6 && ` — pick ${6 - selectedTriviaCats.length} more`}
                      </div>
                      {selectedTriviaCats.length === 6 && (
                        <button
                          className="prelaunch-lock-btn"
                          onClick={() => setTriviaCatsOpen(false)}
                        >
                          🐾 Lock It In!
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              <button
                className="prelaunch-cancel-btn"
                onClick={() => { setPreLaunchGame(null); setTriviaCatsOpen(false); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {notEnoughMsg && (
        <div className="not-enough-toast">{notEnoughMsg}</div>
      )}
    </div>
  );
}
