import { useEffect, useRef } from 'react';

interface RainDrop {
  x: number;
  y: number;
  len: number;
  speed: number;
  opacity: number;
  width: number;
}

interface SplashRipple {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
}

interface RainBackgroundProps {
  enabled: boolean;
  paused: boolean;
  surfaceMode: 'dark' | 'light';
  accentHue: number;
  onAutoDisable: (reason: string) => void;
}

export function detectDeviceCapabilityIssue(): string | null {
  if (typeof window === 'undefined') return null;

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return 'reduced motion is on';
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };

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

export function RainBackground({
  enabled,
  paused,
  surfaceMode,
  accentHue,
  onAutoDisable,
}: RainBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const autoDisableRef = useRef(onAutoDisable);
  autoDisableRef.current = onAutoDisable;

  const themeRef = useRef({ surfaceMode, accentHue });
  themeRef.current = { surfaceMode, accentHue };

  useEffect(() => {
    if (!enabled || paused) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;
    let rafId = 0;

    // Async battery check (disable if low battery & unplugged)
    const navBattery = navigator as Navigator & {
      getBattery?: () => Promise<{ charging: boolean; level: number }>;
    };
    if (typeof navBattery.getBattery === 'function') {
      navBattery
        .getBattery()
        .then((battery) => {
          if (!cancelled && !battery.charging && battery.level <= 0.15) {
            autoDisableRef.current('Low battery level');
          }
        })
        .catch(() => {
          // Battery API unavailable or blocked
        });
    }

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const dropCount = Math.min(105, Math.max(42, Math.floor(width / 15)));
    const drops: RainDrop[] = Array.from({ length: dropCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      len: 14 + Math.random() * 22,
      speed: 520 + Math.random() * 380,
      opacity: 0.16 + Math.random() * 0.28,
      width: 0.9 + Math.random() * 0.8,
    }));

    const ripples: SplashRipple[] = Array.from({ length: 16 }, () => ({
      active: false,
      x: 0,
      y: 0,
      radius: 0,
      maxRadius: 10,
      opacity: 0,
    }));
    let rippleCursor = 0;

    // Live frame-rate watchdog
    let lastTime = performance.now();
    let warmupFrames = 18;
    const frameWindow: number[] = [];
    const WINDOW_SIZE = 45;

    const handleVisibility = () => {
      if (!document.hidden) {
        lastTime = performance.now();
        warmupFrames = 10;
        frameWindow.length = 0;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const tick = (now: number) => {
      if (cancelled) return;

      if (document.hidden) {
        lastTime = now;
        rafId = requestAnimationFrame(tick);
        return;
      }

      const dtMs = now - lastTime;
      lastTime = now;

      // Ignore extreme pause spikes (e.g. tab switch)
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
      const sat = 72;
      const alphaScale = mode === 'dark' ? 1 : 0.72;

      ctx.lineCap = 'round';
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        d.x -= d.speed * 0.11 * dtSec;
        d.y += d.speed * dtSec;

        if (d.y - d.len > height) {
          // Spawn subtle bottom splash ripple occasionally
          if (Math.random() < 0.25) {
            const r = ripples[rippleCursor];
            r.active = true;
            r.x = d.x;
            r.y = height - 6 - Math.random() * 14;
            r.radius = 1;
            r.maxRadius = 8 + Math.random() * 7;
            r.opacity = d.opacity * 0.7;
            rippleCursor = (rippleCursor + 1) % ripples.length;
          }
          d.y = -d.len - Math.random() * 40;
          d.x = Math.random() * (width + 120);
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

      // Draw subtle splash ellipses
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
