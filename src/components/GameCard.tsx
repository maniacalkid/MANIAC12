import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Gamepad2, Heart, Play } from 'lucide-react';
import type { GameItem } from '../types';
import { getGameCoverUrl } from '../utils/runtime';

interface GameCardProps {
  game: GameItem;
  isFavorite: boolean;
  onPlay: (game: GameItem) => void;
  onToggleFavorite: (id: number) => void;
}

export function GameCard({
  game,
  isFavorite,
  onPlay,
  onToggleFavorite,
}: GameCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.article
      whileHover={prefersReducedMotion ? undefined : { y: -6, scale: 1.02 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 20 }}
      className="group relative rounded-2xl liquid-glass overflow-hidden flex flex-col"
    >
      <button
        type="button"
        onClick={() => onPlay(game)}
        className="relative aspect-[4/3] w-full overflow-hidden text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2"
        aria-label={`play ${game.name.toLowerCase()}`}
      >
        {!imgFailed ? (
          <img
            src={getGameCoverUrl(game)}
            alt={game.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center p-4 text-center"
            style={{
              background:
                'linear-gradient(135deg, var(--orb-1), var(--orb-2))',
            }}
          >
            <Gamepad2
              className="w-9 h-9 mb-2 opacity-80"
              style={{ color: 'var(--accent-primary)' }}
              aria-hidden="true"
            />
            <span
              className="text-xs font-semibold line-clamp-2"
              style={{ color: 'var(--text-primary)' }}
            >
              {game.name}
            </span>
          </div>
        )}

        {/* Scrim overlay for hover affordance */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <span
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg transition-transform duration-200 scale-90 group-hover:scale-100"
            style={{
              background:
                'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              color: 'var(--accent-contrast)',
            }}
          >
            <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            <span>play rn</span>
          </span>
        </div>
      </button>

      {/* Card Body: Zero-pill clean unboxed metadata */}
      <div className="p-3.5 flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onPlay(game)}
          className="min-w-0 flex-1 text-left cursor-pointer"
        >
          <h3
            className="text-sm font-semibold truncate transition-colors"
            style={{ color: 'var(--text-primary)' }}
            title={game.name}
          >
            {game.name}
          </h3>
          <p
            className="mt-0.5 text-xs truncate"
            style={{ color: 'var(--text-muted)' }}
          >
            {game.category}
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            {game.author}
          </p>
        </button>

        <motion.button
          type="button"
          onClick={() => onToggleFavorite(game.id)}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.8 }}
          animate={
            !prefersReducedMotion && isFavorite
              ? { scale: [1, 1.32, 0.92, 1] }
              : { scale: 1 }
          }
          transition={{ duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }}
          aria-label={isFavorite ? `unfavorite ${game.name.toLowerCase()}` : `favorite ${game.name.toLowerCase()}`}
          aria-pressed={isFavorite}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors hover:bg-white/10 cursor-pointer"
          style={{
            color: isFavorite ? 'var(--accent-primary)' : 'var(--text-muted)',
          }}
        >
          <Heart
            className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`}
            aria-hidden="true"
          />
        </motion.button>
      </div>
    </motion.article>
  );
}
