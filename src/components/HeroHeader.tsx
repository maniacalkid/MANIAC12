import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Palette,
  Moon,
  Sun,
  ArrowDownRight,
  RotateCcw,
  Search,
  Play,
  X,
  Globe,
  Gamepad2,
  CloudRain,
  Download,
} from 'lucide-react';
import { COLOR_PRESETS } from '../data/themes';
import type { GameItem } from '../types';
import { rankGameSearch } from '../utils/searchGames';
import { IS_STANDALONE, suggestWebStandalone } from '../utils/runtime';

interface HeroHeaderProps {
  games: GameItem[];
  totalGames: number;
  featuredCount: number;
  presetId: string;
  customHue: number | null;
  surfaceMode: 'dark' | 'light';
  rainEnabled: boolean;
  rainDisableReason: string | null;
  onSelectPreset: (id: string) => void;
  onChangeHue: (hue: number) => void;
  onToggleSurfaceMode: (mode: 'dark' | 'light') => void;
  onToggleRain: () => void;
  onResetTheme: () => void;
  onPlayGame: (game: GameItem) => void;
  onApplyCatalogSearch: (query: string) => void;
  onOpenSearchModal: (mode?: 'games' | 'web', initialQuery?: string) => void;
  isReady?: boolean;
  isStandalone?: boolean;
}

export function HeroHeader({
  games,
  totalGames,
  featuredCount,
  presetId,
  customHue,
  surfaceMode,
  rainEnabled,
  rainDisableReason,
  onSelectPreset,
  onChangeHue,
  onToggleSurfaceMode,
  onToggleRain,
  onResetTheme,
  onPlayGame,
  onApplyCatalogSearch,
  onOpenSearchModal,
  isReady = true,
  isStandalone = IS_STANDALONE,
}: HeroHeaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const activePreset =
    COLOR_PRESETS.find((p) => p.id === presetId) ?? COLOR_PRESETS[0];
  const displayHue = customHue ?? activePreset.hue;

  const [searchMode, setSearchMode] = useState<'games' | 'web'>('games');
  const [heroQuery, setHeroQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [ddgSuggests, setDdgSuggests] = useState<string[]>([]);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const quickMatches = useMemo(
    () => (searchMode === 'games' ? rankGameSearch(games, heroQuery) : []),
    [games, heroQuery, searchMode]
  );

  useEffect(() => {
    if (searchMode !== 'web' || !heroQuery.trim()) {
      setDdgSuggests([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        if (IS_STANDALONE) {
          const items = await suggestWebStandalone(heroQuery.trim());
          setDdgSuggests(items);
        } else {
          const res = await fetch(
            `/api/ddg/suggest?q=${encodeURIComponent(heroQuery.trim())}`
          );
          if (res.ok) {
            const items = (await res.json()) as string[];
            setDdgSuggests(items);
          }
        }
      } catch {
        setDdgSuggests([]);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [heroQuery, searchMode]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = heroQuery.trim();
    if (!trimmed) {
      onOpenSearchModal(searchMode, '');
      return;
    }
    setDropdownOpen(false);
    if (searchMode === 'web') {
      onOpenSearchModal('web', trimmed);
    } else {
      onApplyCatalogSearch(trimmed);
    }
  };

  return (
    <section id="top" className="mx-auto max-w-7xl px-4 sm:px-6 pt-10 pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Dominant Focal Zone: Drop-down & Fade-in MANIAC12 Futuristic Header */}
        <div className="lg:col-span-7 flex flex-col justify-center py-4">
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -64, scale: 0.96 }}
            animate={
              isReady
                ? { opacity: 1, y: 0, scale: 1 }
                : prefersReducedMotion
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: -64, scale: 0.96 }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 155, damping: 14, mass: 0.9 }
            }
          >
            <h1
              className="hero-title-gradient font-display font-black tracking-[0.06em] leading-[0.95] select-none lowercase"
            >
              maniac12
            </h1>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -26 }}
            animate={
              isReady
                ? { opacity: 1, y: 0 }
                : prefersReducedMotion
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: -26 }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 190, damping: 18, delay: 0.14 }
            }
            className="mt-5 space-y-5 max-w-xl"
          >
            <p
              className="text-base sm:text-lg leading-relaxed lowercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              lowkey the cleanest liquid glass unblocked arcade rn. {totalGames} gn-math
              bangers locked in as instant iframes, zero lag and straight fullscreen vibes.
            </p>

            {/* Hero Instant Search Bar (Games + DuckDuckGo Web Proxy) */}
            <div ref={searchBoxRef} className="relative z-30 space-y-2">
              <div className="inline-flex items-center gap-1 p-1 rounded-xl border" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'rgba(128, 128, 128, 0.1)' }}>
                <button
                  type="button"
                  onClick={() => setSearchMode('games')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer lowercase"
                  style={
                    searchMode === 'games'
                      ? { backgroundColor: 'var(--accent-primary)', color: 'var(--accent-contrast)' }
                      : { color: 'var(--text-secondary)' }
                  }
                >
                  <Gamepad2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>games</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode('web')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer lowercase"
                  style={
                    searchMode === 'web'
                      ? { backgroundColor: 'var(--accent-primary)', color: 'var(--accent-contrast)' }
                      : { color: 'var(--text-secondary)' }
                  }
                >
                  <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>ddg proxy</span>
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 p-1.5 rounded-2xl liquid-glass"
              >
                {searchMode === 'games' ? (
                  <Search
                    className="w-4 h-4 ml-2.5 shrink-0"
                    style={{ color: 'var(--accent-primary)' }}
                    aria-hidden="true"
                  />
                ) : (
                  <Globe
                    className="w-4 h-4 ml-2.5 shrink-0"
                    style={{ color: 'var(--accent-primary)' }}
                    aria-hidden="true"
                  />
                )}
                <input
                  type="search"
                  value={heroQuery}
                  onFocus={() => setDropdownOpen(true)}
                  onChange={(e) => {
                    setHeroQuery(e.target.value);
                    setDropdownOpen(true);
                  }}
                  placeholder={
                    searchMode === 'games'
                      ? `search any of ${totalGames} games rn...`
                      : 'search literally anything via ddg...'
                  }
                  aria-label={searchMode === 'games' ? 'quick search games' : 'quick ddg web search'}
                  className="flex-1 min-w-0 h-10 bg-transparent text-sm focus:outline-none lowercase"
                  style={{ color: 'var(--text-primary)' }}
                />
                {heroQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setHeroQuery('');
                      setDropdownOpen(false);
                    }}
                    aria-label="clear quick search"
                    className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 cursor-pointer shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenSearchModal(searchMode, '')}
                    className="hidden sm:inline-flex items-center px-2 py-1 rounded-lg border text-[11px] font-mono-tabular hover:bg-white/10 cursor-pointer shrink-0 lowercase"
                    style={{
                      borderColor: 'var(--glass-border)',
                      color: 'var(--text-muted)',
                    }}
                    title="open command search (ctrl+k or /)"
                  >
                    ctrl k
                  </button>
                )}
                <button
                  type="submit"
                  className="h-9 px-4 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-transform duration-150 hover:scale-[1.02] lowercase"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    color: 'var(--accent-contrast)',
                  }}
                >
                  {searchMode === 'games' ? 'find it' : 'search web'}
                </button>
              </form>

              {/* Live Search Dropdown */}
              {dropdownOpen && heroQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 mt-1 rounded-2xl liquid-glass-strong p-2 shadow-2xl space-y-1">
                  {searchMode === 'games' ? (
                    quickMatches.length === 0 ? (
                      <div className="px-3 py-3 text-center space-y-2">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          oof nothing matched &ldquo;{heroQuery.toLowerCase()}&rdquo;
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setDropdownOpen(false);
                            onOpenSearchModal('web', heroQuery.trim());
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline cursor-pointer"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>check ddg instead</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        {quickMatches.slice(0, 6).map((game) => (
                          <button
                            key={game.id}
                            type="button"
                            onClick={() => {
                              onPlayGame(game);
                              setDropdownOpen(false);
                            }}
                            className="w-full px-3 py-2 rounded-xl flex items-center justify-between gap-3 text-left transition-colors hover:bg-white/10 cursor-pointer"
                          >
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
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0"
                              style={{
                                backgroundColor: 'var(--accent-primary)',
                                color: 'var(--accent-contrast)',
                              }}
                            >
                              <Play className="w-3 h-3 fill-current" aria-hidden="true" />
                              <span>play</span>
                            </span>
                          </button>
                        ))}
                        {quickMatches.length > 6 && (
                          <button
                            type="button"
                            onClick={() => {
                              onApplyCatalogSearch(heroQuery.trim());
                              setDropdownOpen(false);
                            }}
                            className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-center hover:bg-white/10 cursor-pointer"
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            see all {quickMatches.length} hits in the vault
                          </button>
                        )}
                      </>
                    )
                  ) : (
                    <>
                      {ddgSuggests.map((phrase) => (
                        <button
                          key={phrase}
                          type="button"
                          onClick={() => {
                            setHeroQuery(phrase);
                            setDropdownOpen(false);
                            onOpenSearchModal('web', phrase);
                          }}
                          className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-left text-sm transition-colors hover:bg-white/10 cursor-pointer"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                          <span className="truncate">{phrase}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenSearchModal('web', heroQuery.trim());
                        }}
                        className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold hover:bg-white/10 cursor-pointer"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        <Globe className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>search ddg for &ldquo;{heroQuery.trim().toLowerCase()}&rdquo;</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#catalog"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap shrink-0"
                style={{
                  background:
                    'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                  color: 'var(--accent-contrast)',
                }}
              >
                <span>peep the vault</span>
                <ArrowDownRight className="w-4 h-4" aria-hidden="true" />
              </a>

              {!isStandalone && (
                <a
                  href="./maniac12-standalone.html"
                  download="maniac12.html"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl liquid-glass text-xs font-semibold transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap shrink-0"
                  style={{ color: 'var(--text-primary)' }}
                  title="download single-file html for google sites or local browser"
                >
                  <Download className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} aria-hidden="true" />
                  <span>download .html</span>
                </a>
              )}

              <div
                className="flex items-center gap-3 text-xs sm:text-sm font-mono-tabular"
                style={{ color: 'var(--text-muted)' }}
              >
                <span>{totalGames.toLocaleString()} games</span>
                <span aria-hidden="true">·</span>
                <span>{featuredCount} goated</span>
                <span aria-hidden="true">·</span>
                <span>json iframes</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Zone: Interactive Color Changing Area (Color Studio) */}
        <motion.aside
          id="color-studio"
          aria-label="Website color style studio"
          initial={prefersReducedMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -30, scale: 0.97 }}
          animate={
            isReady
              ? { opacity: 1, y: 0, scale: 1 }
              : prefersReducedMotion
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 0, y: -30, scale: 0.97 }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 185, damping: 17, delay: 0.2 }
          }
          className="lg:col-span-5 rounded-3xl liquid-glass p-6 flex flex-col justify-between gap-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Palette
                  className="w-4 h-4 shrink-0"
                  style={{ color: 'var(--accent-primary)' }}
                  aria-hidden="true"
                />
                <h2
                  className="text-base font-semibold tracking-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  vibe studio
                </h2>
              </div>
              <p
                className="mt-1 text-xs leading-relaxed"
                style={{ color: 'var(--text-muted)' }}
              >
                switch up the glass tint, glow, and colors whenever u feel like it.
              </p>
            </div>

            {/* Light / Dark glass mode toggle */}
            <div
              className="flex items-center gap-1 p-1 rounded-xl border"
              style={{
                borderColor: 'var(--glass-border)',
                backgroundColor: 'rgba(128, 128, 128, 0.12)',
              }}
            >
              <button
                type="button"
                onClick={() => onToggleSurfaceMode('dark')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                style={
                  surfaceMode === 'dark'
                    ? {
                        backgroundColor: 'var(--accent-primary)',
                        color: 'var(--accent-contrast)',
                      }
                    : { color: 'var(--text-secondary)' }
                }
                aria-pressed={surfaceMode === 'dark'}
              >
                <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>dark</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleSurfaceMode('light')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                style={
                  surfaceMode === 'light'
                    ? {
                        backgroundColor: 'var(--accent-primary)',
                        color: 'var(--accent-contrast)',
                      }
                    : { color: 'var(--text-secondary)' }
                }
                aria-pressed={surfaceMode === 'light'}
              >
                <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                <span>light</span>
              </button>
            </div>
          </div>

          {/* Preset Swatch Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {COLOR_PRESETS.map((preset) => {
              const isSelected = customHue === null && presetId === preset.id;
              return (
                <motion.button
                  key={preset.id}
                  type="button"
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.04, y: -2 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                  onClick={() => onSelectPreset(preset.id)}
                  className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    borderColor: isSelected
                      ? 'var(--accent-primary)'
                      : 'var(--glass-border)',
                    backgroundColor: isSelected
                      ? 'rgba(128, 128, 128, 0.16)'
                      : 'rgba(128, 128, 128, 0.06)',
                  }}
                  aria-pressed={isSelected}
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0 border border-white/30"
                    style={{ background: preset.swatchGradient }}
                    aria-hidden="true"
                  />
                  <span
                    className="text-xs font-medium truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {preset.name}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Custom Spectrum Hue Slider */}
          <div
            className="pt-3 border-t flex flex-col gap-2"
            style={{ borderColor: 'var(--glass-border)' }}
          >
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="hue-spectrum-slider"
                className="font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                custom color vibe
              </label>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono-tabular text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {displayHue} deg
                </span>
                {customHue !== null && (
                  <button
                    type="button"
                    onClick={onResetTheme}
                    className="inline-flex items-center gap-1 text-xs hover:underline cursor-pointer"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    <RotateCcw className="w-3 h-3" aria-hidden="true" />
                    <span>reset</span>
                  </button>
                )}
              </div>
            </div>
            <input
              id="hue-spectrum-slider"
              type="range"
              min={0}
              max={359}
              value={displayHue}
              onChange={(e) => onChangeHue(Number(e.target.value))}
              className="hue-spectrum-track w-full h-2.5 rounded-full appearance-none cursor-pointer"
            />
          </div>

          {/* Background Rain Effect Toggle */}
          <div
            className="pt-3 border-t flex items-center justify-between gap-3"
            style={{ borderColor: 'var(--glass-border)' }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                <CloudRain className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent-primary)' }} aria-hidden="true" />
                <span>background rain</span>
              </div>
              {rainDisableReason && !rainEnabled && (
                <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  off: {rainDisableReason}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onToggleRain}
              aria-pressed={rainEnabled}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border"
              style={
                rainEnabled
                  ? {
                      borderColor: 'transparent',
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--accent-contrast)',
                    }
                  : {
                      borderColor: 'var(--glass-border)',
                      color: 'var(--text-secondary)',
                      backgroundColor: 'rgba(128, 128, 128, 0.08)',
                    }
              }
            >
              {rainEnabled ? 'on' : 'off'}
            </button>
          </div>
        </motion.aside>
      </div>
    </section>
  );
}
