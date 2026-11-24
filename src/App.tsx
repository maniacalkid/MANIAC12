import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import rawGamesData from './data/games.json';
import { applyColorTheme, COLOR_PRESETS } from './data/themes';
import type { GameItem } from './types';
import { TopBar } from './components/TopBar';
import { HeroHeader } from './components/HeroHeader';
import { GameCard } from './components/GameCard';
import { GameTheaterModal } from './components/GameTheaterModal';
import { GameSearchModal } from './components/GameSearchModal';
import { AiChatbot } from './components/AiChatbot';
import { RainBackground, detectDeviceCapabilityIssue } from './components/RainBackground';
import { LoadingScreen } from './components/LoadingScreen';
import { rankGameSearch } from './utils/searchGames';
import { IS_STANDALONE } from './utils/runtime';

const GAMES: GameItem[] = rawGamesData as GameItem[];

const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'All', label: 'all' },
  { value: 'Featured', label: 'goated' },
  { value: 'Favorites', label: 'faves' },
  { value: 'Action & Arcade', label: 'action & arcade' },
  { value: 'Platform & Runner', label: 'platform & runner' },
  { value: 'Ports & 3D', label: 'ports & 3d' },
  { value: 'Retro & Emulators', label: 'retro & emus' },
  { value: 'Puzzle & Strategy', label: 'big brain' },
  { value: 'Sports & Arcade', label: 'sports' },
  { value: 'Rhythm & Casual', label: 'rhythm & chill' },
];

const PAGE_SIZE = 35;

export default function App() {
  // Color Studio state persisted to localStorage
  const [presetId, setPresetId] = useState<string>(() => {
    try {
      return localStorage.getItem('maniac12-preset') || 'liquid-cobalt';
    } catch {
      return 'liquid-cobalt';
    }
  });
  const [customHue, setCustomHue] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('maniac12-hue');
      return saved !== null ? Number(saved) : null;
    } catch {
      return null;
    }
  });
  const [surfaceMode, setSurfaceMode] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('maniac12-mode');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  // Catalog & user library state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'default' | 'alpha'>('default');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeGame, setActiveGame] = useState<GameItem | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchModalMode, setSearchModalMode] = useState<'games' | 'web'>('games');
  const [searchModalQuery, setSearchModalQuery] = useState('');
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);

  // Ambient rain state with automatic hardware/reduced-motion check
  const [rainDisableReason, setRainDisableReason] = useState<string | null>(() =>
    detectDeviceCapabilityIssue()
  );
  const [rainEnabled, setRainEnabled] = useState<boolean>(() => {
    const issue = detectDeviceCapabilityIssue();
    if (issue) return false;
    try {
      const saved = localStorage.getItem('maniac12-rain');
      return saved === 'off' ? false : true;
    } catch {
      return true;
    }
  });

  const [favoriteIds, setFavoriteIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('maniac12-favorites');
      return saved ? (JSON.parse(saved) as number[]) : [];
    } catch {
      return [];
    }
  });

  const [recentIds, setRecentIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('maniac12-recent');
      return saved ? (JSON.parse(saved) as number[]) : [];
    } catch {
      return [];
    }
  });

  // Apply CSS custom properties whenever Color Studio settings change
  useEffect(() => {
    applyColorTheme({ presetId, customHue, surfaceMode });
    try {
      localStorage.setItem('maniac12-preset', presetId);
      localStorage.setItem('maniac12-mode', surfaceMode);
      if (customHue !== null) {
        localStorage.setItem('maniac12-hue', String(customHue));
      } else {
        localStorage.removeItem('maniac12-hue');
      }
    } catch {
      // Ignore storage errors
    }
  }, [presetId, customHue, surfaceMode]);

  useEffect(() => {
    try {
      localStorage.setItem('maniac12-favorites', JSON.stringify(favoriteIds));
    } catch {
      // Ignore
    }
  }, [favoriteIds]);

  useEffect(() => {
    try {
      localStorage.setItem('maniac12-recent', JSON.stringify(recentIds));
    } catch {
      // Ignore
    }
  }, [recentIds]);

  // Global keyboard shortcut: Ctrl/Cmd+K or "/" opens game search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (!isTyping && e.key === '/' && !activeGame) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeGame]);

  const handleSelectPreset = (id: string) => {
    const preset = COLOR_PRESETS.find((p) => p.id === id);
    setPresetId(id);
    setCustomHue(null);
    if (preset) {
      setSurfaceMode(preset.mode);
    }
  };

  const handleChangeHue = (hue: number) => {
    setCustomHue(hue);
  };

  const handleResetTheme = () => {
    setCustomHue(null);
  };

  const handlePlayGame = (game: GameItem) => {
    setActiveGame(game);
    setRecentIds((prev) => [game.id, ...prev.filter((id) => id !== game.id)].slice(0, 10));
  };

  const handleLaunchGameById = (id: number) => {
    const found = GAMES.find((g) => g.id === id);
    if (found) {
      handlePlayGame(found);
    }
  };

  const handleQuickPlay = () => {
    const randomIndex = Math.floor(Math.random() * GAMES.length);
    const pick = GAMES[randomIndex];
    if (pick) handlePlayGame(pick);
  };

  const toggleFavorite = (id: number) => {
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const featuredGames = useMemo(
    () => GAMES.filter((g) => g.featured),
    []
  );

  const recentGames = useMemo(
    () =>
      recentIds
        .map((id) => GAMES.find((g) => g.id === id))
        .filter((g): g is GameItem => Boolean(g))
        .slice(0, 5),
    [recentIds]
  );

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const filteredGames = useMemo(() => {
    const q = searchQuery.trim();
    const base = q ? rankGameSearch(GAMES, q) : GAMES;

    const list = base.filter((game) => {
      if (activeCategory === 'Featured' && !game.featured) return false;
      if (activeCategory === 'Favorites' && !favoriteSet.has(game.id)) return false;
      if (
        activeCategory !== 'All' &&
        activeCategory !== 'Featured' &&
        activeCategory !== 'Favorites' &&
        game.category !== activeCategory
      ) {
        return false;
      }
      return true;
    });

    if (sortBy === 'alpha') {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [searchQuery, activeCategory, sortBy, favoriteSet]);

  const displayedGames = useMemo(
    () => filteredGames.slice(0, visibleCount),
    [filteredGames, visibleCount]
  );

  const handleSelectCategory = (cat: string) => {
    setActiveCategory(cat);
    setVisibleCount(PAGE_SIZE);
  };

  const handleApplyCatalogSearch = (query: string) => {
    setSearchQuery(query);
    setActiveCategory('All');
    setVisibleCount(PAGE_SIZE);
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  };

  const openSearchModal = (mode: 'games' | 'web' = 'games', initialQuery = '') => {
    setSearchModalMode(mode);
    setSearchModalQuery(initialQuery);
    setIsSearchOpen(true);
  };

  const activeAccentHue = useMemo(() => {
    if (customHue !== null) return customHue;
    return COLOR_PRESETS.find((p) => p.id === presetId)?.hue ?? 204;
  }, [customHue, presetId]);

  const handleToggleRain = () => {
    setRainEnabled((prev) => {
      const next = !prev;
      if (next) setRainDisableReason(null);
      try {
        localStorage.setItem('maniac12-rain', next ? 'on' : 'off');
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const handleAutoDisableRain = (reason: string) => {
    setRainEnabled(false);
    setRainDisableReason(reason);
    try {
      localStorage.setItem('maniac12-rain', 'off');
    } catch {
      // Ignore
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col lowercase">
      {/* Liquid Glass Ambient Background Mesh */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div
          className="liquid-orb absolute -top-40 -left-32 w-[540px] h-[540px] rounded-full blur-[110px]"
          style={{ backgroundColor: 'var(--orb-1)' }}
        />
        <div
          className="liquid-orb-delayed absolute top-1/3 -right-40 w-[560px] h-[560px] rounded-full blur-[120px]"
          style={{ backgroundColor: 'var(--orb-2)' }}
        />
        <div
          className="liquid-orb absolute -bottom-44 left-1/3 w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ backgroundColor: 'var(--orb-3)' }}
        />
      </div>

      <LoadingScreen
        isVisible={showLoadingScreen}
        onFinish={() => setShowLoadingScreen(false)}
      />

      {/* Adaptive Ambient Rain Canvas (auto-pauses during active game or loading screen, auto-disables on low-end devices) */}
      <RainBackground
        enabled={rainEnabled}
        paused={Boolean(activeGame) || showLoadingScreen}
        surfaceMode={surfaceMode}
        accentHue={activeAccentHue}
        onAutoDisable={handleAutoDisableRain}
      />

      <TopBar
        onQuickPlay={handleQuickPlay}
        onOpenChat={() => setIsChatOpen(true)}
        onOpenSearch={() => openSearchModal('games', searchQuery)}
      />

      <main className="flex-1">
        <HeroHeader
          games={GAMES}
          totalGames={GAMES.length}
          featuredCount={featuredGames.length}
          presetId={presetId}
          customHue={customHue}
          surfaceMode={surfaceMode}
          rainEnabled={rainEnabled}
          rainDisableReason={rainDisableReason}
          onSelectPreset={handleSelectPreset}
          onChangeHue={handleChangeHue}
          onToggleSurfaceMode={setSurfaceMode}
          onToggleRain={handleToggleRain}
          onResetTheme={handleResetTheme}
          onPlayGame={handlePlayGame}
          onApplyCatalogSearch={handleApplyCatalogSearch}
          onOpenSearchModal={openSearchModal}
          isReady={!showLoadingScreen}
        />

        {/* Recently Played Strip (when user has played games) */}
        {recentGames.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-4 pb-6">
            <div className="flex items-baseline justify-between gap-4 mb-4">
              <h2
                className="text-lg font-semibold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                keep playing
              </h2>
              <button
                type="button"
                onClick={() => setRecentIds([])}
                className="text-xs hover:underline cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                clear history
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {recentGames.map((game) => (
                <GameCard
                  key={`recent-${game.id}`}
                  game={game}
                  isFavorite={favoriteSet.has(game.id)}
                  onPlay={handlePlayGame}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          </section>
        )}

        {/* Featured Spotlight */}
        <section id="featured" className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <div>
              <h2
                className="text-xl font-bold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                goated spotlight
              </h2>
              <p
                className="text-xs sm:text-sm mt-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                straight heat, ports, and fan faves fr
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                handleSelectCategory('Featured');
                document
                  .getElementById('catalog')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-xs sm:text-sm font-medium hover:underline cursor-pointer whitespace-nowrap"
              style={{ color: 'var(--accent-primary)' }}
            >
              see all {featuredGames.length} goated
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {featuredGames.slice(0, 10).map((game) => (
              <GameCard
                key={`featured-${game.id}`}
                game={game}
                isFavorite={favoriteSet.has(game.id)}
                onPlay={handlePlayGame}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </section>

        {/* Full Catalog Section */}
        <section id="catalog" className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
          <div className="rounded-3xl liquid-glass p-4 sm:p-6 mb-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2
                  className="text-xl font-bold tracking-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  the game vault
                </h2>
                <p
                  className="text-xs sm:text-sm font-mono-tabular mt-0.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  showing {displayedGames.length} of {filteredGames.length} hits
                </p>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 sm:w-72">
                  <Search
                    className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--text-muted)' }}
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    placeholder={`search ${GAMES.length} games...`}
                    aria-label="search games"
                    className="w-full h-10 pl-10 pr-9 rounded-xl border bg-transparent text-sm focus:outline-none lowercase"
                    style={{
                      borderColor: 'var(--glass-border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 cursor-pointer"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'default' | 'alpha')}
                  aria-label="sort games"
                  className="h-10 px-3.5 rounded-xl border bg-transparent text-sm cursor-pointer focus:outline-none lowercase"
                  style={{
                    borderColor: 'var(--glass-border)',
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--bg-elevated)',
                  }}
                >
                  <option value="default">archive order</option>
                  <option value="alpha">a–z</option>
                </select>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div
              role="tablist"
              aria-label="game categories"
              className="flex items-center gap-1.5 overflow-x-auto pb-1"
            >
              {CATEGORY_OPTIONS.map((category) => {
                const active = activeCategory === category.value;
                return (
                  <button
                    key={category.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => handleSelectCategory(category.value)}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    style={
                      active
                        ? {
                            background:
                              'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                            color: 'var(--accent-contrast)',
                          }
                        : {
                            backgroundColor: 'rgba(128, 128, 128, 0.08)',
                            color: 'var(--text-secondary)',
                          }
                    }
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Games Grid or Empty State */}
          {displayedGames.length === 0 ? (
            <div className="rounded-3xl liquid-glass p-12 text-center">
              <p
                className="text-base font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                ngl nothing matched that filter.
              </p>
              <p
                className="mt-1 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                try another word or go back to all games.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('All');
                  setVisibleCount(PAGE_SIZE);
                }}
                className="mt-5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--accent-contrast)',
                }}
              >
                reset filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {displayedGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    isFavorite={favoriteSet.has(game.id)}
                    onPlay={handlePlayGame}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>

              {visibleCount < filteredGames.length && (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="px-6 py-2.5 rounded-xl liquid-glass text-sm font-semibold transition-transform hover:scale-[1.02] cursor-pointer"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    load more ({filteredGames.length - visibleCount} left)
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <footer
        className="mt-12 border-t py-6 px-4 sm:px-6"
        style={{ borderColor: 'var(--glass-border)' }}
      >
        <div
          className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          <span className="font-display font-bold tracking-wider">maniac12</span>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span>
              games pulled from{' '}
              <a
                href="https://github.com/gn-math/html"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                github.com/gn-math/html
              </a>{' '}
              · stored as json iframes fr
            </span>
            {!IS_STANDALONE && (
              <>
                <span aria-hidden="true">·</span>
                <a
                  href="/maniac12-standalone.html"
                  download="maniac12.html"
                  className="underline underline-offset-2 font-semibold"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  download singlefile .html
                </a>
              </>
            )}
          </div>
        </div>
      </footer>

      <GameSearchModal
        isOpen={isSearchOpen}
        games={GAMES}
        initialQuery={searchModalQuery}
        initialMode={searchModalMode}
        onClose={() => setIsSearchOpen(false)}
        onPlayGame={handlePlayGame}
        onApplyCatalogSearch={handleApplyCatalogSearch}
      />

      <GameTheaterModal
        game={activeGame}
        isFavorite={activeGame ? favoriteSet.has(activeGame.id) : false}
        onClose={() => setActiveGame(null)}
        onToggleFavorite={toggleFavorite}
      />

      <AiChatbot
        isOpen={isChatOpen}
        onToggle={setIsChatOpen}
        onLaunchGameById={handleLaunchGameById}
        gamesCount={GAMES.length}
        games={GAMES}
      />
    </div>
  );
}
