import React, { useState } from 'react';

const THEMES = [
  { id: 'party', label: '🎉 Party', colors: ['#200a36', '#ffe02f', '#ff4081', '#21ffb2'] },
  { id: 'metal', label: '🤘 Metal', colors: ['#121212', '#ff6f00', '#b71c1c', '#bdbdbd'] },
  { id: 'cyber', label: '🔮 Cyber', colors: ['#0a0a0d', '#00ffff', '#ff00ff', '#00ff7f'] },
  { id: 'backwoods', label: '🪕 Backwoods', colors: ['#223a22', '#ffa500', '#b22222', '#6b8e23'] },
  { id: 'goth', label: '🦇 Goth', colors: ['#0a0608', '#8b0000', '#4a0028', '#c0a070'] },
];

export default function ThemeSwitcher({ theme, onChangeTheme }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="theme-btn" onClick={() => setOpen(o => !o)} title="Change theme">
        🎨
      </button>

      {open && (
        <>
          <div className="theme-popup-backdrop" onClick={() => setOpen(false)} />
          <div className="theme-popup">
            {THEMES.map(t => (
              <button
                key={t.id}
                className={`theme-option${theme === t.id ? ' active' : ''}`}
                onClick={() => { onChangeTheme(t.id); setOpen(false); }}
              >
                <div className="theme-swatch">
                  {t.colors.map((c, i) => (
                    <span key={i} style={{ background: c }} />
                  ))}
                </div>
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
