import React, { useState, useRef, useEffect } from 'react';

/**
 * PartyMenu — Slide-out panel triggered by a floating ☰ button.
 * Provides: promote player to Party Leader, kick player, return to lobby, leave party, copy room code.
 */
export default function PartyMenu({
  players,
  isHost,
  myId,
  roomCode,
  screen,
  gameInfo,
  onPromote,
  onKick,
  onReturnToLobby,
  onLeave,
  showToast,
  theme,
}) {
  const [open, setOpen] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const copyRoomCode = () => {
    navigator.clipboard?.writeText(roomCode);
    showToast?.('Room code copied! 📋');
    setOpen(false);
  };

  const handlePromote = (playerId) => {
    onPromote?.(playerId);
    setOpen(false);
  };

  const handleKick = (playerId) => {
    onKick?.(playerId);
    setOpen(false);
  };

  const inGame = screen !== 'lobby' && screen !== 'join';

  return (
    <>
      {/* Floating hamburger trigger */}
      <button
        className={`pm-trigger ${open ? 'pm-trigger--open' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        aria-label="Party Menu"
      >
        <span className="pm-trigger-bar" />
        <span className="pm-trigger-bar" />
        <span className="pm-trigger-bar" />
      </button>

      {/* Backdrop */}
      {open && <div className="pm-backdrop" />}

      {/* Slide-out panel */}
      <div ref={panelRef} className={`pm-panel ${open ? 'pm-panel--open' : ''}`}>
        <div className="pm-header">
          <span className="pm-logo">🎮</span>
          <span className="pm-title">Party Menu</span>
          <button className="pm-close" onClick={() => setOpen(false)}>✕</button>
        </div>

        {/* Room info */}
        <button className="pm-item pm-room-code" onClick={copyRoomCode}>
          <span className="pm-item-icon">📋</span>
          <div className="pm-item-content">
            <span className="pm-item-label">Room Code</span>
            <span className="pm-room-value">{roomCode}</span>
          </div>
        </button>

        <div className="pm-divider" />

        {/* Player management */}
        <div className="pm-section-title">
          👥 Players ({players.length})
        </div>

        <div className="pm-player-list">
          {players.map((p) => {
            const isMe = p.id === myId;
            const isPlayerHost = p.isHost;
            return (
              <div key={p.id} className={`pm-player ${isPlayerHost ? 'pm-player--leader' : ''} ${isMe ? 'pm-player--me' : ''}`}>
                <div className="pm-player-avatar">
                  <img src={`/images/avatars/${theme || 'party'}/avatar-${p.avatar || 1}.png`} alt={p.name} />
                </div>
                <div className="pm-player-info">
                  <span className="pm-player-name">
                    {p.name}{isMe ? ' (you)' : ''}
                  </span>
                  {isPlayerHost && <span className="pm-player-badge">⭐ Party Leader</span>}
                </div>

                {/* Actions (host only, can't promote/kick yourself) */}
                {isHost && !isMe && (
                  <div className="pm-player-actions">
                    {!isPlayerHost && (
                      <button
                        className="pm-action-btn pm-action--promote"
                        onClick={() => handlePromote(p.id)}
                        title="Make Party Leader"
                      >
                        ⭐
                      </button>
                    )}
                    <button
                      className="pm-action-btn pm-action--kick"
                      onClick={() => handleKick(p.id)}
                      title="Remove from party"
                    >
                      🚪
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pm-divider" />

        {/* Actions */}
        {inGame && gameInfo?.howToPlay && (
          <button className="pm-item pm-item--action" onClick={() => { setShowHowToPlay(true); setOpen(false); }}>
            <span className="pm-item-icon">❓</span>
            <span className="pm-item-label">How to Play</span>
          </button>
        )}

        {inGame && (
          <button className="pm-item pm-item--action" onClick={() => { onReturnToLobby?.(); setOpen(false); }}>
            <span className="pm-item-icon">🏠</span>
            <span className="pm-item-label">
              {isHost ? 'Return to Lobby' : 'Request Return to Lobby'}
            </span>
          </button>
        )}

        <button className="pm-item pm-item--danger" onClick={() => { onLeave?.(); setOpen(false); }}>
          <span className="pm-item-icon">🚪</span>
          <span className="pm-item-label">Leave Party</span>
        </button>

        <div className="pm-footer">
          BellBox Party Pack
        </div>
      </div>

      {/* How to Play popup — same style as lobby game info */}
      {showHowToPlay && gameInfo && (
        <div className="game-info-overlay" onClick={() => setShowHowToPlay(false)}>
          <div className="game-info-popup pop-in">
            <div className="game-info-emoji">{gameInfo.emoji}</div>
            <h2 className="game-info-title">{gameInfo.name}</h2>
            <h3 className="game-info-section-title">How to Play</h3>
            <p className="game-info-howto">{gameInfo.howToPlay}</p>
            <div className="game-info-dismiss">tap anywhere to close</div>
          </div>
        </div>
      )}
    </>
  );
}
