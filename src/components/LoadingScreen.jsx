import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const SPLASH_DURATION_MS = 5000;
const YOUTUBE_VIDEO_ID = 'eCHaiEjCDFM';
const YOUTUBE_EMBED_URL = `https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&playsinline=1&start=0&end=5&loop=1&playlist=${YOUTUBE_VIDEO_ID}&disablekb=1&fs=0&iv_load_policy=3`;

/**
 * @param {{ isVisible: boolean, onFinish: () => void }} props
 */
export function LoadingScreen({ isVisible, onFinish }) {
  const prefersReducedMotion = useReducedMotion();
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const startTime = performance.now();
    let rafId = 0;

    const tick = (now) => {
      const elapsed = now - startTime;
      const next = Math.min(100, Math.floor((elapsed / SPLASH_DURATION_MS) * 100));
      setPercent((prev) => (prev === next ? prev : next));
      if (elapsed < SPLASH_DURATION_MS) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        setPercent(100);
      }
    };

    rafId = window.requestAnimationFrame(tick);

    const timer = window.setTimeout(() => {
      setPercent(100);
      onFinish();
    }, SPLASH_DURATION_MS);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timer);
    };
  }, [isVisible, onFinish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="maniac12 intro screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={
            prefersReducedMotion ? { duration: 0.15 } : { duration: 0.45, ease: 'easeOut' }
          }
          className="fixed inset-0 z-50 overflow-hidden bg-black flex items-center justify-center"
        >
          {/* Full-bleed YouTube video background overscaled to crop out YouTube title/UI overlays */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden select-none"
          >
            <div className="absolute inset-0 scale-[1.42]">
              <iframe
                src={YOUTUBE_EMBED_URL}
                title="maniac12 intro background video"
                allow="autoplay; encrypted-media"
                tabIndex={-1}
                className="intro-video-frame pointer-events-none"
              />
            </div>
          </div>

          {/* Contrast scrim over video */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-black/55 backdrop-blur-[2px]"
          />

          {/* Center Stack: Flashing Logo + Steady Tiny Subtitle */}
          <div className="relative z-10 flex flex-col items-center text-center px-6">
            <motion.h1
              initial={{ opacity: 1, scale: 1 }}
              animate={
                prefersReducedMotion
                  ? { opacity: 1, scale: 1 }
                  : {
                      opacity: [1, 0.14, 1],
                      scale: [1, 1.025, 1],
                    }
              }
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : {
                      duration: 0.72,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }
              }
              className="intro-logo-text font-display font-black tracking-[0.12em] leading-none text-white select-none lowercase"
            >
              maniac12
            </motion.h1>

            {/* Static tiny text underneath that does NOT flash */}
            <p className="mt-3 text-[11px] font-medium tracking-[0.22em] text-white/85 select-none lowercase">
              please gatekeep guys
            </p>
          </div>

          {/* Bottom-left percentage counter */}
          <div
            aria-live="off"
            className="intro-percent-counter pointer-events-none absolute bottom-5 left-5 sm:bottom-6 sm:left-6 z-10 font-mono-tabular text-sm sm:text-base font-semibold tracking-wider text-white/90 select-none lowercase"
          >
            {percent}%
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
