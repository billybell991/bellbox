// AudioRecorder — Tap-to-record voice messages for BellBox
// Handles MediaRecorder, visual states, and base64 encoding

import React, { useState, useRef, useCallback, useEffect } from 'react';

const MAX_DURATION = 30; // seconds
const MIN_DURATION = 0.5; // seconds

export default function AudioRecorder({ onRecordComplete, disabled, compact }) {
  const [state, setState] = useState('idle'); // idle | recording | processing | error
  const [duration, setDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  const streamRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Prefer webm/opus, fall back to whatever's available
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        if (elapsed < MIN_DURATION) {
          setState('error');
          setErrorMsg('Too short!');
          setTimeout(() => { setState('idle'); setErrorMsg(''); }, 1500);
          return;
        }

        setState('processing');
        const blob = new Blob(chunks.current, { type: mimeType });
        try {
          const base64 = await blobToBase64(blob);
          const audioDuration = Math.min(elapsed, MAX_DURATION);
          onRecordComplete({
            audio: base64,
            mimeType: mimeType.split(';')[0], // 'audio/webm'
            duration: audioDuration,
          });
          setState('idle');
        } catch {
          setState('error');
          setErrorMsg('Failed');
          setTimeout(() => { setState('idle'); setErrorMsg(''); }, 1500);
        }
      };

      recorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();
      setState('recording');
      setDuration(0);

      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDuration(elapsed);
        if (elapsed >= MAX_DURATION) {
          stopRecording();
        }
      }, 100);
    } catch (err) {
      setState('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Mic blocked');
      } else {
        setErrorMsg('No mic');
      }
      setTimeout(() => { setState('idle'); setErrorMsg(''); }, 2500);
    }
  }, [onRecordComplete, stopRecording]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (state === 'recording') {
      stopRecording();
    } else if (state === 'idle') {
      startRecording();
    }
  }, [state, disabled, startRecording, stopRecording]);

  const handleCancel = useCallback((e) => {
    e.stopPropagation();
    chunks.current = [];
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.onstop = () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        setState('idle');
        setDuration(0);
      };
      mediaRecorder.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const remaining = Math.max(0, MAX_DURATION - duration);
  const progress = duration / MAX_DURATION;

  return (
    <div className={`audio-recorder ${compact ? 'compact' : ''}`}>
      <button
        className={`mic-btn mic-btn--${state}`}
        onClick={handleClick}
        disabled={disabled || state === 'processing'}
        title={
          state === 'idle' ? 'Record voice message' :
          state === 'recording' ? 'Tap to stop' :
          state === 'processing' ? 'Processing...' : errorMsg
        }
      >
        {state === 'idle' && <span className="mic-icon">🎙️</span>}
        {state === 'recording' && (
          <>
            <span className="mic-icon recording-pulse">🔴</span>
            <svg className="mic-progress" viewBox="0 0 36 36">
              <circle className="mic-progress-bg" cx="18" cy="18" r="16" />
              <circle
                className="mic-progress-fill"
                cx="18" cy="18" r="16"
                strokeDasharray={`${progress * 100.5} 100.5`}
              />
            </svg>
          </>
        )}
        {state === 'processing' && <span className="mic-icon spin">⏳</span>}
        {state === 'error' && <span className="mic-icon shake">⚠️</span>}
      </button>

      {state === 'recording' && (
        <div className="mic-recording-info">
          <span className="mic-timer">{Math.ceil(remaining)}s</span>
          <button className="mic-cancel" onClick={handleCancel} title="Cancel">✕</button>
        </div>
      )}

      {state === 'error' && errorMsg && (
        <span className="mic-error-msg">{errorMsg}</span>
      )}
    </div>
  );
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Strip the data URL prefix to get raw base64
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
