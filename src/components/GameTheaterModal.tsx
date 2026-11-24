import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Check,
  Code2,
  Copy,
  ExternalLink,
  Heart,
  Maximize2,
  RotateCw,
  X,
} from 'lucide-react';
import type { GameItem } from '../types';
import { IS_STANDALONE, fetchStandaloneGameHtml } from '../utils/runtime';

interface GameTheaterModalProps {
  game: GameItem | null;
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: (id: number) => void;
}

export function GameTheaterModal({
  game,
  isFavorite,
  onClose,
  onToggleFavorite,
}: GameTheaterModalProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);
  const [standaloneHtml, setStandaloneHtml] = useState<string | null>(null);
  const [standaloneLoading, setStandaloneLoading] = useState(false);
  const [standaloneError, setStandaloneError] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!game) return;
    setShowJson(false);
    setCopied(false);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [game, onClose]);

  const isExternalGame = Boolean(
    game && (game.iframeSrc.startsWith('http://') || game.iframeSrc.startsWith('https://'))
  );

  const externalHost = (() => {
    if (!game || !isExternalGame) return 'external';
    try {
      return new URL(game.iframeSrc).hostname.replace(/^www\./, '');
    } catch {
      return 'external';
    }
  })();

  useEffect(() => {
    if (!game || !IS_STANDALONE || isExternalGame || !game.file) {
      setStandaloneHtml(null);
      setStandaloneLoading(false);
      setStandaloneError(null);
      return;
    }

    let cancelled = false;
    setStandaloneLoading(true);
    setStandaloneError(null);
    setStandaloneHtml(null);

    fetchStandaloneGameHtml(game.file)
      .then((html) => {
        if (!cancelled) {
          setStandaloneHtml(html);
          setStandaloneLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStandaloneError('oof couldnt load this game from github rn. check ur wifi and hit reload.');
          setStandaloneLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [game, reloadNonce]);

  const handleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (stageRef.current) {
        await stageRef.current.requestFullscreen();
      }
    } catch {
      // Fullscreen may be restricted in nested iframes; ignore silently
    }
  };

  const handleCopyIframe = async () => {
    if (!game) return;
    try {
      await navigator.clipboard.writeText(game.iframe);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <AnimatePresence>
      {game && (
        <motion.div
          key="game-theater-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`${game.name} game player`}
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md"
        >
          <motion.div
            ref={stageRef}
            initial={
              prefersReducedMotion
                ? { opacity: 1, scale: 1, y: 0 }
                : { opacity: 0, scale: 0.92, y: 24 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.94, y: 18 }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 320, damping: 24 }
            }
            className="w-full max-w-6xl h-[88vh] rounded-3xl liquid-glass-strong flex flex-col overflow-hidden"
          >
            {/* Theater Control Bar */}
            <div
              className="px-4 sm:px-6 py-3.5 border-b flex items-center justify-between gap-4"
              style={{ borderColor: 'var(--glass-border)' }}
            >
              <div className="min-w-0">
                <h2
                  className="text-base sm:text-lg font-bold truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {game.name}
                </h2>
                <p
                  className="text-xs truncate"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {game.category} · {game.author} · {game.file || externalHost}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <motion.button
                  type="button"
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                  onClick={() => onToggleFavorite(game.id)}
                  className="h-9 px-3 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-colors hover:bg-white/10 cursor-pointer"
                  style={{
                    borderColor: 'var(--glass-border)',
                    color: isFavorite ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  }}
                  aria-pressed={isFavorite}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`}
                    aria-hidden="true"
                  />
                  <span className="hidden sm:inline">fave</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                  onClick={() => setShowJson((prev) => !prev)}
                  className="h-9 px-3 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-colors hover:bg-white/10 cursor-pointer"
                  style={{
                    borderColor: showJson ? 'var(--accent-primary)' : 'var(--glass-border)',
                    color: showJson ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  }}
                  aria-expanded={showJson}
                >
                  <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">iframe json</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.92, rotate: 90 }}
                  onClick={() => setReloadNonce((n) => n + 1)}
                  className="h-9 px-3 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-colors hover:bg-white/10 cursor-pointer"
                  style={{
                    borderColor: 'var(--glass-border)',
                    color: 'var(--text-secondary)',
                  }}
                  aria-label="reload game"
                >
                  <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">reload</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.04 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                  onClick={handleFullscreen}
                  className="h-9 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    color: 'var(--accent-contrast)',
                  }}
                >
                  <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">fullscreen</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
                  onClick={onClose}
                  aria-label="close game theater"
                  className="w-9 h-9 rounded-xl border flex items-center justify-center transition-colors hover:bg-white/10 cursor-pointer"
                  style={{
                    borderColor: 'var(--glass-border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </motion.button>
              </div>
            </div>

            {/* Optional JSON Iframe Drawer */}
            <AnimatePresence>
              {showJson && (
                <motion.div
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="px-4 sm:px-6 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/30"
                  style={{ borderColor: 'var(--glass-border)' }}
                >
                  <code
                    className="font-mono-tabular text-xs break-all"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {game.iframe}
                  </code>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyIframe}
                      className="h-8 px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 hover:bg-white/10 cursor-pointer whitespace-nowrap"
                      style={{
                        borderColor: 'var(--glass-border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>copy iframe</span>
                        </>
                      )}
                    </button>
                    <a
                      href={game.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 hover:bg-white/10 whitespace-nowrap"
                      style={{
                        borderColor: 'var(--glass-border)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <span>source</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active Game Iframe Surface */}
            <div className="relative flex-1 bg-black">
              {IS_STANDALONE && !isExternalGame ? (
                standaloneLoading ? (
                  <div className="w-full h-full flex items-center justify-center text-sm text-white/75">
                    loading {game.name.toLowerCase()} rn...
                  </div>
                ) : standaloneError ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
                    <p className="text-sm text-white/85">{standaloneError}</p>
                    <button
                      type="button"
                      onClick={() => setReloadNonce((n) => n + 1)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                      style={{
                        backgroundColor: 'var(--accent-primary)',
                        color: 'var(--accent-contrast)',
                      }}
                    >
                      try again
                    </button>
                  </div>
                ) : standaloneHtml ? (
                  <iframe
                    key={`${game.id}-${reloadNonce}`}
                    srcDoc={standaloneHtml}
                    title={game.name}
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen; gamepad; pointer-lock"
                    allowFullScreen
                  />
                ) : null
              ) : (
                <iframe
                  key={`${game.id}-${reloadNonce}`}
                  src={game.iframeSrc}
                  title={game.name}
                  className="w-full h-full border-0"
                  allow="autoplay; fullscreen; gamepad; pointer-lock; clipboard-read; clipboard-write"
                  allowFullScreen
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
