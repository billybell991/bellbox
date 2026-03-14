import React, { useState } from 'react';

export default function JoinScreen({ onCreateRoom, onJoinRoom }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState(null); // null | 'join'

  const handleCreate = (e) => {
    e.preventDefault();
    if (name.trim()) onCreateRoom(name.trim());
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (name.trim() && code.trim().length >= 4) {
      onJoinRoom(name.trim(), code.trim().toUpperCase());
    }
  };

  return (
    <div className="join-screen">
      <div className="title-container">
        <h1 className="bellbox-title">
          <span className="title-bell">Bell</span><span className="title-box">Box</span>
        </h1>
        <div className="bellbox-subtitle">Party Pack</div>
      </div>

      <div className="join-form pop-in">
        <div className="input-group">
          <label>What's your name?</label>
          <input
            type="text"
            placeholder="Enter your name..."
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20}
            autoComplete="off"
            autoFocus
          />
        </div>

        {!mode && (
          <div className="join-buttons">
            <button
              className="button button--primary"
              onClick={handleCreate}
              disabled={!name.trim()}
            >
              🎉 Create Room
            </button>
            <div className="divider-text">or</div>
            <button
              className="button button--secondary"
              onClick={() => name.trim() && setMode('join')}
              disabled={!name.trim()}
            >
              🔗 Join Room
            </button>
          </div>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="join-code-form">
            <div className="input-group">
              <label>Room Code</label>
              <input
                type="text"
                className="room-code-input"
                placeholder="ABCD"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4))}
                maxLength={4}
                autoComplete="off"
                autoFocus
              />
            </div>
            <button type="submit" className="button button--primary" disabled={code.length < 4}>
              🚀 Join!
            </button>
            <button type="button" className="button button--ghost" onClick={() => setMode(null)}>
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
