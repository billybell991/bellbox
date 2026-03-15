import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

const WHEEL_SIZE = 300;

const Wheel = forwardRef(({ onSpinComplete, disabled, onTap, segments = [] }, ref) => {
  const canvasRef = useRef(null);
  const rotationRef = useRef(0);
  const [spinning, setSpinning] = useState(false);

  const drawWheel = useCallback((rotation) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = WHEEL_SIZE;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = cx - 10;
    const segCount = segments.length;
    const segAngle = (2 * Math.PI) / segCount;

    ctx.clearRect(0, 0, size, size);

    // Outer ring glow
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 6, 0, 2 * Math.PI);
    ctx.shadowColor = 'rgba(255, 200, 80, 0.4)';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = 'rgba(255, 200, 80, 0.35)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);

    // Draw segments
    for (let i = 0; i < segCount; i++) {
      const seg = segments[i];
      const startAngle = i * segAngle - Math.PI / 2;
      const endAngle = startAngle + segAngle;
      const midAngle = startAngle + segAngle / 2;

      // Segment fill with gradient
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      const gx = Math.cos(midAngle) * radius * 0.5;
      const gy = Math.sin(midAngle) * radius * 0.5;
      const grad = ctx.createRadialGradient(0, 0, radius * 0.15, gx, gy, radius);
      grad.addColorStop(0, lightenColor(seg.color, 40));
      grad.addColorStop(0.7, seg.color);
      grad.addColorStop(1, darkenColor(seg.color, 20));
      ctx.fillStyle = grad;
      ctx.fill();

      // Segment divider lines
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(startAngle) * radius, Math.sin(startAngle) * radius);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Emoji — large and centered in the segment
      ctx.save();
      ctx.rotate(midAngle);
      ctx.font = '30px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(seg.emoji, radius * 0.6, 0);
      ctx.restore();
    }

    // Outer rim
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // Center hub
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, 2 * Math.PI);
    const centerGrad = ctx.createRadialGradient(cx, cy - 4, 4, cx, cy, 30);
    centerGrad.addColorStop(0, '#FFE4A8');
    centerGrad.addColorStop(0.6, '#FFB347');
    centerGrad.addColorStop(1, '#E8951C');
    ctx.fillStyle = centerGrad;
    ctx.fill();
    ctx.shadowColor = 'rgba(255, 179, 71, 0.5)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#D48A15';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // Gus emoji in center
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐕', cx, cy);

    // Pointer triangle at top
    ctx.save();
    ctx.shadowColor = 'rgba(255, 80, 80, 0.6)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(cx, 26);
    ctx.lineTo(cx - 13, 4);
    ctx.lineTo(cx + 13, 4);
    ctx.closePath();
    ctx.fillStyle = '#FF5252';
    ctx.fill();
    ctx.strokeStyle = '#D43F3F';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }, [segments]);

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, [drawWheel]);

  useImperativeHandle(ref, () => ({
    spinTo(segmentIndex) {
      setSpinning(true);

      const segAngle = 360 / segments.length;
      const targetStopAngle = (360 - (segmentIndex * segAngle + segAngle / 2)) % 360;
      const currentAngle = rotationRef.current;
      const currentMod = ((currentAngle % 360) + 360) % 360;

      let delta = targetStopAngle - currentMod;
      if (delta < 0) delta += 360;

      const fullSpins = (3 + Math.floor(Math.random() * 3)) * 360;
      const totalDelta = fullSpins + delta;

      const startAngle = currentAngle;
      const duration = 3500;
      const startTime = performance.now();

      const animate = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);

        rotationRef.current = startAngle + totalDelta * eased;
        drawWheel(rotationRef.current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setSpinning(false);
          onSpinComplete?.(segmentIndex);
        }
      };

      requestAnimationFrame(animate);
    },
  }));

  const handleClick = () => {
    if (!spinning && !disabled && onTap) onTap();
  };

  return (
    <div className="wheel-container" onClick={handleClick} style={{ cursor: (!spinning && !disabled) ? 'pointer' : 'default' }}>
      <canvas
        ref={canvasRef}
        style={{ borderRadius: '50%', display: 'block' }}
      />
    </div>
  );
});

function lightenColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xFF) + amount);
  const b = Math.min(255, (num & 0xFF) + amount);
  return `rgb(${r},${g},${b})`;
}

function darkenColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xFF) - amount);
  const b = Math.max(0, (num & 0xFF) - amount);
  return `rgb(${r},${g},${b})`;
}

export default Wheel;
