import { motion, useReducedMotion } from 'motion/react';
import { Play } from 'lucide-react';

interface TopBarProps {
  onQuickPlay: () => void;
  onOpenChat: () => void;
  onOpenSearch: () => void;
}

export function TopBar({ onQuickPlay, onOpenChat, onOpenSearch }: TopBarProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.header
      initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 260, damping: 22 }
      }
      className="sticky top-0 z-40 w-full pl-[5.5rem] pr-4 sm:pl-24 sm:pr-6 2xl:px-6 pt-3"
    >
      <div className="mx-auto max-w-7xl h-14 px-5 rounded-2xl liquid-glass flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          className="font-display text-lg font-extrabold tracking-[0.08em] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 rounded lowercase"
          style={{ color: 'var(--text-primary)' }}
        >
          maniac12
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium lowercase"
          style={{ color: 'var(--text-secondary)' }}
        >
          <a
            href="#featured"
            className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            goated picks
          </a>
          <button
            type="button"
            onClick={onOpenSearch}
            className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            search
          </button>
          <a
            href="#catalog"
            className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            the vault
          </a>
          <a
            href="#color-studio"
            className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            vibe studio
          </a>
          <button
            type="button"
            onClick={onOpenChat}
            className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            ai bestie
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <motion.button
            type="button"
            onClick={onQuickPlay}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.05, y: -1 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 450, damping: 18 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 lowercase"
            style={{
              background:
                'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              color: 'var(--accent-contrast)',
            }}
          >
            <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            <span>surprise me</span>
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}
