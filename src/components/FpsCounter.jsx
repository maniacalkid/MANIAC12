import { useEffect, useState } from 'react';

export function FpsCounter() {
  const [fps, setFps] = useState(60);

  useEffect(() => {
    let rafId = 0;
    let frames = 0;
    let lastSample = performance.now();

    const tick = (now) => {
      if (document.hidden) {
        frames = 0;
        lastSample = now;
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      frames += 1;
      const elapsed = now - lastSample;
      if (elapsed >= 450) {
        const measured = Math.min(240, Math.round((frames * 1000) / elapsed));
        setFps(measured);
        frames = 0;
        lastSample = now;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  return (
    <div
      aria-label="frame rate counter"
      className="pointer-events-none fixed top-3 left-3 z-[60] px-2.5 py-1.5 rounded-xl liquid-glass font-mono-tabular text-[11px] font-semibold tracking-wide lowercase select-none flex items-center gap-1.5"
      style={{ color: 'var(--text-primary)' }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: 'var(--accent-primary)' }}
        aria-hidden="true"
      />
      <span>{fps} fps</span>
    </div>
  );
}
