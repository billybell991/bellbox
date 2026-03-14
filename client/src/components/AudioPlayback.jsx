// AudioPlayback — Play recorded voice messages in BellBox
// Waveform visualization with play/pause, progress indicator

import React, { useState, useRef, useCallback, useEffect } from 'react';

export default function AudioPlayback({ audioData, mimeType, duration, compact }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);
  const animRef = useRef(null);

  // Build audio URL from base64
  const audioUrl = useRef(null);
  useEffect(() => {
    if (audioData) {
      const byteChars = atob(audioData);
      const bytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
      const blob = new Blob([bytes], { type: mimeType || 'audio/webm' });
      audioUrl.current = URL.createObjectURL(blob);
    }
    return () => {
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    };
  }, [audioData, mimeType]);

  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      const p = audioRef.current.currentTime / (audioRef.current.duration || duration || 1);
      setProgress(Math.min(p, 1));
      if (!audioRef.current.paused) {
        animRef.current = requestAnimationFrame(updateProgress);
      }
    }
  }, [duration]);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio(audioUrl.current);
      audioRef.current = audio;

      audio.onended = () => {
        setPlaying(false);
        setProgress(0);
        if (animRef.current) cancelAnimationFrame(animRef.current);
      };
      audio.onpause = () => {
        setPlaying(false);
        if (animRef.current) cancelAnimationFrame(animRef.current);
      };
      audio.onplay = () => {
        setPlaying(true);
        animRef.current = requestAnimationFrame(updateProgress);
      };
    }

    if (playing) {
      audioRef.current.pause();
    } else {
      if (progress >= 0.99) {
        audioRef.current.currentTime = 0;
        setProgress(0);
      }
      audioRef.current.play().catch(() => setPlaying(false));
    }
  }, [playing, progress, updateProgress]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const formatDuration = (s) => {
    const secs = Math.floor(s);
    return secs < 60 ? `0:${secs.toString().padStart(2, '0')}` : `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;
  };

  // Generate pseudo waveform bars (deterministic from duration)
  const bars = 20;
  const waveform = Array.from({ length: bars }, (_, i) => {
    const seed = (i * 7 + 3) % 11;
    return 0.3 + (seed / 11) * 0.7;
  });

  return (
    <div className={`audio-playback ${compact ? 'compact' : ''}`} onClick={handlePlayPause}>
      <button className={`play-btn ${playing ? 'playing' : ''}`}>
        {playing ? '⏸' : '▶'}
      </button>
      <div className="waveform">
        {waveform.map((h, i) => (
          <div
            key={i}
            className={`wave-bar ${(i / bars) < progress ? 'filled' : ''}`}
            style={{ height: `${h * 100}%` }}
          />
        ))}
      </div>
      <span className="audio-duration">{formatDuration(duration || 0)}</span>
    </div>
  );
}
