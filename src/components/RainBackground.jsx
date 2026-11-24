import { useEffect, useRef } from 'react';

/**
 * @returns {string | null}
 */
export function detectDeviceCapabilityIssue() {
  if (typeof window === 'undefined') return null;

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return 'reduced motion is on';
  }

  const nav = /** @type {any} */ (navigator);

  if (nav.connection?.saveData) {
    return 'data saver mode is on';
  }

  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2) {
    return 'device cpu is kinda light';
  }

  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2) {
    return 'device memory is kinda low';
  }

  return null;
}

/**
 * @param {{ enabled: boolean, paused: boolean, surfaceMode: 'dark' | 'light', accentHue: number, onAutoDisable: (reason: string) => void }} props
 */
export function RainBackground({
  enabled,
  paused,
  surfaceMode,
  accentHue,
  onAutoDisable,
}) {
  const canvasRef = useRef(/** @type {HTMLCanvasElement | null} */ (null));
  const autoDisableRef = useRef(onAutoDisable);
  autoDisableRef.current = onAutoDisable;

  const themeRef = useRef({ surfaceMode, accentHue });
  themeRef.current = { surfaceMode, accentHue };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled || paused) return;

    const initialIssue = detectDeviceCapabilityIssue();
    if (initialIssue) {
      autoDisableRef.current(initialIssue);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;
    let rafId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const dropCount = Math.min(
      115,
      Math.max(48, Math.floor((width * height) / 16000))
    );

    const drops = Array.from({ length: dropCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      len: 12 + Math.random() * 18,
      speed: 480 + Math.random() * 340,
      opacity: 0.14 + Math.random() * 0.28,
      width: 0.85 + Math.random() * 0.75,
    }));

    const ripples = Array.from({ length: 14 }, () => ({
      active: false,
      x: 0,
      y: 0,
      radius: 1,
      maxRadius: 8,
      opacity: 0,
    }));

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    let lastTime = performance.now();
    const frameWindow = [];
    const WINDOW_SIZE = 45;
    let warmupFrames = 14;

    const handleVisibility = () => {
      if (!document.hidden) {
        lastTime = performance.now();
        warmupFrames = 8;
        frameWindow.length = 0;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const tick = (now) => {
      if (cancelled) return;

      if (document.hidden) {
        lastTime = now;
        rafId = requestAnimationFrame(tick);
        return;
      }

      const dtMs = now - lastTime;
      lastTime = now;

      if (dtMs > 250) {
        warmupFrames = 8;
        frameWindow.length = 0;
        rafId = requestAnimationFrame(tick);
        return;
      }

      if (warmupFrames > 0) {
        warmupFrames -= 1;
      } else {
        frameWindow.push(dtMs);
        if (frameWindow.length > WINDOW_SIZE) {
          frameWindow.shift();
        }
        if (frameWindow.length === WINDOW_SIZE) {
          let sum = 0;
          let slowCount = 0;
          for (let i = 0; i < WINDOW_SIZE; i++) {
            const sample = frameWindow[i];
            sum += sample;
            if (sample > 36) slowCount += 1;
          }
          const avgDelta = sum / WINDOW_SIZE;
          if (avgDelta > 31 || slowCount >= 12) {
            ctx.clearRect(0, 0, width, height);
            autoDisableRef.current('auto-paused cuz fps dipped');
            return;
          }
        }
      }

      const dtSec = Math.min(dtMs / 1000, 0.05);
      const { surfaceMode: mode, accentHue: hue } = themeRef.current;

      ctx.clearRect(0, 0, width, height);

      const lightness = mode === 'dark' ? 76 : 42;
      const sat = mode === 'dark' ? 88 : 72;
      const alphaScale = mode === 'dark' ? 1 : 0.72;

      ctx.lineCap = 'round';
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        d.y += d.speed * dtSec;
        d.x -= d.speed * 0.11 * dtSec;

        if (d.y - d.len > height) {
          if (Math.random() < 0.24) {
            const slot = ripples.find((r) => !r.active);
            if (slot) {
              slot.active = true;
              slot.x = d.x;
              slot.y = height - 4 - Math.random() * 14;
              slot.radius = 1.5;
              slot.maxRadius = 7 + Math.random() * 7;
              slot.opacity = 0.24;
            }
          }
          d.y = -Math.random() * 60 - d.len;
          d.x = Math.random() * (width + 80);
        } else if (d.x < -20) {
          d.x = width + 10;
        }

        ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${lightness}%, ${(d.opacity * alphaScale).toFixed(3)})`;
        ctx.lineWidth = d.width;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.len * 0.11, d.y - d.len);
        ctx.stroke();
      }

      for (let i = 0; i < ripples.length; i++) {
        const r = ripples[i];
        if (!r.active) continue;
        r.radius += 26 * dtSec;
        r.opacity -= 0.85 * dtSec;
        if (r.opacity <= 0.01 || r.radius >= r.maxRadius) {
          r.active = false;
          continue;
        }
        ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${lightness}%, ${(r.opacity * alphaScale).toFixed(3)})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.32, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [enabled, paused]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
