import React, { useState, useEffect, useRef } from 'react';
import AudioRecorder from './AudioRecorder';
import AudioPlayback from './AudioPlayback';

export default function Chat({ messages, onSend, onSendVoice, playerName }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const lastCountRef = useRef(messages.length);

  // Track unread when closed
  useEffect(() => {
    if (!open && messages.length > lastCountRef.current) {
      setUnread(prev => prev + (messages.length - lastCountRef.current));
    }
    lastCountRef.current = messages.length;
  }, [messages.length, open]);

  // Clear unread on open
  useEffect(() => {
    if (open) {
      setUnread(0);
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, messages.length]);

  const handleSend = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }
  };

  const handleVoiceRecorded = ({ audio, mimeType, duration }) => {
    onSendVoice?.({ audio, mimeType, duration });
  };

  return (
    <div className="chat-wrapper">
      {open && (
        <>
          <div className="chat-backdrop" onClick={() => setOpen(false)} />
          <div className="chat-panel pop-in">
            <div className="chat-header">
              <span>💬 Chat</span>
            </div>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">No messages yet. Say hi! 👋</div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.sender === playerName ? 'mine' : ''}`}>
                <span className="chat-sender">{msg.sender}</span>
                {msg.isVoice && msg.audio ? (
                  <AudioPlayback
                    audioData={msg.audio}
                    mimeType={msg.mimeType}
                    duration={msg.audioDuration}
                    compact
                  />
                ) : (
                  <span className="chat-text">{msg.text}</span>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form className="chat-input-area" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Type a message..."
              value={text}
              onChange={e => setText(e.target.value)}
              maxLength={200}
              autoComplete="off"
            />
            <button type="submit" disabled={!text.trim()}>➤</button>
            <AudioRecorder onRecordComplete={handleVoiceRecorded} compact />
          </form>
        </div>
        </>
      )}

      <button className="chat-toggle" onClick={() => setOpen(!open)}>
        💬
        {unread > 0 && <span className="chat-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
    </div>
  );
}
