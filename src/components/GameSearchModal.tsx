import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  ExternalLink,
  Gamepad2,
  Globe,
  Play,
  Search,
  X,
} from 'lucide-react';
import type { DdgSearchResponse, GameItem } from '../types';
import { rankGameSearch } from '../utils/searchGames';
import {
  IS_STANDALONE,
  getGameCoverUrl,
  searchWebStandalone,
  suggestWebStandalone,
} from '../utils/runtime';

interface GameSearchModalProps {
  isOpen: boolean;
  games: GameItem[];
  initialQuery?: string;
  initialMode?: 'games' | 'web';
  onClose: () => void;
  onPlayGame: (game: GameItem) => void;
  onApplyCatalogSearch: (query: string) => void;
}

const QUICK_GAME_TERMS = [
  'minecraft',
  'five nights',
  'ovo',
  'retro bowl',
  'mario',
  'stickman',
  'run',
  'slope',
];

const QUICK_WEB_TERMS = [
  'typescript docs',
  'james webb telescope',
  'how photosynthesis works',
  'minecraft crafting recipes',
];

function ResultThumbnail({ game }: { game: GameItem }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className="w-14 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--orb-1), var(--orb-2))' }}
      >
        <Gamepad2
          className="w-4 h-4"
          style={{ color: 'var(--accent-primary)' }}
          aria-hidden="true"
        />
      </div>
    );
  }
  return (
    <img
      src={getGameCoverUrl(game)}
      alt={game.name}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-14 h-10 rounded-lg object-cover shrink-0 bg-black/20"
    />
  );
}

export function GameSearchModal({
  isOpen,
  games,
  initialQuery = '',
  initialMode = 'games',
  onClose,
  onPlayGame,
  onApplyCatalogSearch,
}: GameSearchModalProps) {
  const [mode, setMode] = useState<'games' | 'web'>(initialMode);
  const [query, setQuery] = useState(initialQuery);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // DuckDuckGo proxy state
  const [ddgSuggestions, setDdgSuggestions] = useState<string[]>([]);
  const [ddgResults, setDdgResults] = useState<DdgSearchResponse | null>(null);
  const [ddgLoading, setDdgLoading] = useState(false);
  const [ddgError, setDdgError] = useState<string | null>(null);

  const runDdgSearch = async (searchText: string) => {
    const trimmed = searchText.trim();
    if (!trimmed) return;
    setDdgLoading(true);
    setDdgError(null);
    setDdgSuggestions([]);
    try {
      if (IS_STANDALONE) {
        const data = await searchWebStandalone(trimmed);
        setDdgResults(data);
      } else {
        const res = await fetch(
          `/api/ddg/search?q=${encodeURIComponent(trimmed)}`
        );
        const data = (await res.json()) as DdgSearchResponse & { error?: string };
        if (!res.ok || data.error) {
          setDdgError((data.error || 'ddg search kinda choked ngl.').toLowerCase());
          setDdgResults(null);
        } else {
          setDdgResults(data);
        }
      }
    } catch {
      setDdgError('network error talking to ddg proxy.');
      setDdgResults(null);
    } finally {
      setDdgLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setQuery(initialQuery);
      setHighlightedIndex(0);
      setDdgError(null);
      if (initialMode === 'web' && initialQuery.trim()) {
        void runDdgSearch(initialQuery.trim());
      } else {
        setDdgResults(null);
      }
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen, initialQuery, initialMode]);

  // Live DuckDuckGo autocomplete suggestions in web mode
  useEffect(() => {
    if (!isOpen || mode !== 'web') {
      setDdgSuggestions([]);
      return;
    }
    const trimmed = query.trim();
    if (!trimmed || (ddgResults && ddgResults.query === trimmed)) {
      setDdgSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        if (IS_STANDALONE) {
          const items = await suggestWebStandalone(trimmed);
          setDdgSuggestions(items);
        } else {
          const res = await fetch(
            `/api/ddg/suggest?q=${encodeURIComponent(trimmed)}`
          );
          if (res.ok) {
            const items = (await res.json()) as string[];
            setDdgSuggestions(items);
          }
        }
      } catch {
        setDdgSuggestions([]);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [isOpen, mode, query, ddgResults]);

  const matches = useMemo(() => rankGameSearch(games, query), [games, query]);

  const visibleResults = useMemo(() => {
    if (!query.trim()) {
      return games.filter((g) => g.featured).slice(0, 8);
    }
    return matches.slice(0, 14);
  }, [games, matches, query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, mode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (mode === 'games') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedIndex((i) =>
            visibleResults.length > 0 ? (i + 1) % visibleResults.length : 0
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIndex((i) =>
            visibleResults.length > 0
              ? (i - 1 + visibleResults.length) % visibleResults.length
              : 0
          );
        } else if (e.key === 'Enter' && visibleResults[highlightedIndex]) {
          e.preventDefault();
          onPlayGame(visibleResults[highlightedIndex]);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, mode, visibleResults, highlightedIndex, onClose, onPlayGame]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="search-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Search games or DuckDuckGo web"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-16 px-4 bg-black/70 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={
              prefersReducedMotion
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 0, y: -24, scale: 0.94 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -16, scale: 0.95 }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 340, damping: 24 }
            }
            className="w-full max-w-2xl rounded-3xl liquid-glass-strong overflow-hidden flex flex-col max-h-[82vh]"
          >
        {/* Mode Switcher Bar */}
        <div
          className="px-4 sm:px-5 pt-3.5 pb-2.5 border-b flex items-center justify-between gap-3"
          style={{ borderColor: 'var(--glass-border)' }}
        >
          <div
            role="tablist"
            aria-label="Search provider"
            className="inline-flex items-center gap-1 p-1 rounded-xl border"
            style={{
              borderColor: 'var(--glass-border)',
              backgroundColor: 'rgba(128, 128, 128, 0.1)',
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'games'}
              onClick={() => {
                setMode('games');
                requestAnimationFrame(() => inputRef.current?.focus());
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              style={
                mode === 'games'
                  ? {
                      background:
                        'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                      color: 'var(--accent-contrast)',
                    }
                  : { color: 'var(--text-secondary)' }
              }
            >
              <Gamepad2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>games ({games.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'web'}
              onClick={() => {
                setMode('web');
                requestAnimationFrame(() => inputRef.current?.focus());
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              style={
                mode === 'web'
                  ? {
                      background:
                        'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                      color: 'var(--accent-contrast)',
                    }
                  : { color: 'var(--text-secondary)' }
              }
            >
              <Globe className="w-3.5 h-3.5" aria-hidden="true" />
              <span>ddg proxy</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="close search"
            className="px-2.5 py-1 rounded-lg border text-xs font-mono-tabular hover:bg-white/10 cursor-pointer"
            style={{
              borderColor: 'var(--glass-border)',
              color: 'var(--text-muted)',
            }}
          >
            esc
          </button>
        </div>

        {/* Search Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (mode === 'web' && query.trim()) {
              void runDdgSearch(query);
            }
          }}
          className="px-4 sm:px-5 py-3 border-b flex items-center gap-3"
          style={{ borderColor: 'var(--glass-border)' }}
        >
          {mode === 'games' ? (
            <Search
              className="w-5 h-5 shrink-0"
              style={{ color: 'var(--accent-primary)' }}
              aria-hidden="true"
            />
          ) : (
            <Globe
              className="w-5 h-5 shrink-0"
              style={{ color: 'var(--accent-primary)' }}
              aria-hidden="true"
            />
          )}
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              mode === 'games'
                ? `search ${games.length} games by name, dev, or vibe...`
                : 'look up anything privately via ddg...'
            }
            aria-label={mode === 'games' ? 'search up games' : 'search the web with ddg'}
            className="flex-1 bg-transparent text-sm sm:text-base focus:outline-none lowercase"
            style={{ color: 'var(--text-primary)' }}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setDdgResults(null);
                setDdgSuggestions([]);
                setDdgError(null);
              }}
              aria-label="clear search query"
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          {mode === 'web' && (
            <button
              type="submit"
              disabled={!query.trim() || ddgLoading}
              className="h-9 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45"
              style={{
                background:
                  'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                color: 'var(--accent-contrast)',
              }}
            >
              {ddgLoading ? 'searching...' : 'search web'}
            </button>
          )}
        </form>

        {/* Quick Suggestions Row */}
        {mode === 'games' && !query.trim() && (
          <div
            className="px-4 sm:px-5 py-3 border-b flex flex-wrap items-center gap-2"
            style={{ borderColor: 'var(--glass-border)' }}
          >
            <span
              className="text-xs font-medium mr-1"
              style={{ color: 'var(--text-muted)' }}
            >
              quick picks:
            </span>
            {QUICK_GAME_TERMS.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setQuery(term)}
                className="px-2.5 py-1 rounded-lg border text-xs transition-colors hover:bg-white/10 cursor-pointer"
                style={{
                  borderColor: 'var(--glass-border)',
                  color: 'var(--text-secondary)',
                }}
              >
                {term}
              </button>
            ))}
          </div>
        )}

        {mode === 'web' && !ddgResults && !ddgLoading && (
          <div
            className="px-4 sm:px-5 py-3 border-b flex flex-wrap items-center gap-2"
            style={{ borderColor: 'var(--glass-border)' }}
          >
            <span
              className="text-xs font-medium mr-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {ddgSuggestions.length > 0 ? 'try:' : 'look up:'}
            </span>
            {(ddgSuggestions.length > 0 ? ddgSuggestions : QUICK_WEB_TERMS).map(
              (term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    setQuery(term);
                    void runDdgSearch(term);
                  }}
                  className="px-2.5 py-1 rounded-lg border text-xs transition-colors hover:bg-white/10 cursor-pointer"
                  style={{
                    borderColor: 'var(--glass-border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {term}
                </button>
              )
            )}
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {mode === 'games' ? (
            <>
              <div className="px-2 pb-1 flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-muted)' }}>
                  {query.trim()
                    ? `${matches.length} hit${matches.length === 1 ? '' : 's'}`
                    : 'goated picks rn'}
                </span>
                <span
                  className="hidden sm:inline font-mono-tabular"
                  style={{ color: 'var(--text-muted)' }}
                >
                  arrows + enter to launch
                </span>
              </div>

              {visibleResults.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p
                    className="text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    oof no games found for &ldquo;{query.toLowerCase()}&rdquo;
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('web');
                      void runDdgSearch(query);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                      color: 'var(--accent-contrast)',
                    }}
                  >
                    <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>look up &ldquo;{query.toLowerCase()}&rdquo; on ddg instead</span>
                  </button>
                </div>
              ) : (
                visibleResults.map((game, index) => {
                  const isActive = index === highlightedIndex;
                  return (
                    <button
                      key={game.id}
                      type="button"
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => {
                        onPlayGame(game);
                        onClose();
                      }}
                      className="w-full px-3 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                      style={{
                        backgroundColor: isActive
                          ? 'rgba(128, 128, 128, 0.18)'
                          : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ResultThumbnail game={game} />
                        <div className="min-w-0">
                          <div
                            className="text-sm font-semibold truncate"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {game.name}
                          </div>
                          <div
                            className="text-xs truncate"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {game.category} · {game.author}
                          </div>
                        </div>
                      </div>
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0"
                        style={
                          isActive
                            ? {
                                background:
                                  'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                color: 'var(--accent-contrast)',
                              }
                            : {
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-secondary)',
                              }
                        }
                      >
                        <Play className="w-3 h-3 fill-current" aria-hidden="true" />
                        <span>play</span>
                      </span>
                    </button>
                  );
                })
              )}
            </>
          ) : (
            /* DuckDuckGo Web Search Results View */
            <>
              {ddgSuggestions.length > 0 && ddgResults && (
                <div className="flex flex-wrap gap-1.5 pb-2">
                  {ddgSuggestions.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        setQuery(term);
                        void runDdgSearch(term);
                      }}
                      className="px-2.5 py-1 rounded-lg border text-xs hover:bg-white/10 cursor-pointer"
                      style={{
                        borderColor: 'var(--glass-border)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              )}

              {ddgLoading && (
                <div
                  className="py-10 text-center text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  querying ddg proxy rn...
                </div>
              )}

              {ddgError && (
                <div
                  className="rounded-2xl p-4 border text-sm"
                  style={{
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    backgroundColor: 'rgba(239, 68, 68, 0.14)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {ddgError}
                </div>
              )}

              {!ddgLoading && !ddgError && !ddgResults && (
                <div className="py-10 text-center space-y-1.5">
                  <p
                    className="text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    look up literally anything via ddg
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    type something up top and hit enter for live results + quick answers.
                  </p>
                </div>
              )}

              {!ddgLoading && ddgResults && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span style={{ color: 'var(--text-muted)' }}>
                      source: {ddgResults.provider}
                    </span>
                    <a
                      href={`https://duckduckgo.com/?q=${encodeURIComponent(ddgResults.query)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      <span>open on ddg</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </div>

                  {/* Instant Answer Card */}
                  {ddgResults.instantAnswer && (
                    <div
                      className="rounded-2xl p-4 border space-y-2"
                      style={{
                        borderColor: 'var(--glass-border)',
                        backgroundColor: 'rgba(128, 128, 128, 0.12)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3
                            className="text-sm font-bold"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {ddgResults.instantAnswer.heading}
                          </h3>
                          <p
                            className="mt-1 text-xs sm:text-sm leading-relaxed"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {ddgResults.instantAnswer.text}
                          </p>
                        </div>
                        {ddgResults.instantAnswer.image && (
                          <img
                            src={ddgResults.instantAnswer.image}
                            alt={ddgResults.instantAnswer.heading}
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 rounded-xl object-contain shrink-0 bg-white/5"
                          />
                        )}
                      </div>
                      <a
                        href={ddgResults.instantAnswer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        <span>read more on {ddgResults.instantAnswer.source}</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </div>
                  )}

                  {/* Organic & Reference Results */}
                  {ddgResults.results.length === 0 && !ddgResults.instantAnswer ? (
                    <div
                      className="py-8 text-center text-sm"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      nothing came back ngl. try another search or open ddg directly.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {ddgResults.results.map((item) => (
                        <a
                          key={item.url}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-2xl p-3.5 border transition-colors hover:bg-white/10"
                          style={{
                            borderColor: 'var(--glass-border)',
                            backgroundColor: 'rgba(128, 128, 128, 0.06)',
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="text-xs font-mono-tabular truncate"
                              style={{ color: 'var(--accent-primary)' }}
                            >
                              {item.source}
                            </span>
                            <ExternalLink
                              className="w-3.5 h-3.5 shrink-0"
                              style={{ color: 'var(--text-muted)' }}
                              aria-hidden="true"
                            />
                          </div>
                          <h4
                            className="mt-1 text-sm font-semibold"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {item.title}
                          </h4>
                          {item.snippet && (
                            <p
                              className="mt-1 text-xs leading-relaxed line-clamp-2"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {item.snippet}
                            </p>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Action (Games Mode) */}
        {mode === 'games' && query.trim() && matches.length > 0 && (
          <div
            className="px-4 sm:px-5 py-3 border-t flex items-center justify-between gap-3"
            style={{ borderColor: 'var(--glass-border)' }}
          >
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              top {visibleResults.length} of {matches.length}
            </span>
            <button
              type="button"
              onClick={() => {
                onApplyCatalogSearch(query.trim());
                onClose();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline cursor-pointer"
              style={{ color: 'var(--accent-primary)' }}
            >
              <span>filter all {matches.length} in the vault</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
