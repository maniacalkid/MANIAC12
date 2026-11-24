/** @type {import('../types').ColorPreset[]} */
export const COLOR_PRESETS = [
  {
    id: 'liquid-cobalt',
    name: 'liquid cobalt',
    mode: 'dark',
    hue: 204,
    accentPrimary: '#38bdf8',
    accentSecondary: '#6366f1',
    accentContrast: '#020617',
    swatchGradient: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)',
  },
  {
    id: 'crimson-mercury',
    name: 'crimson drip',
    mode: 'dark',
    hue: 348,
    accentPrimary: '#fb7185',
    accentSecondary: '#e11d48',
    accentContrast: '#ffffff',
    swatchGradient: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)',
  },
  {
    id: 'emerald-prism',
    name: 'emerald aura',
    mode: 'dark',
    hue: 158,
    accentPrimary: '#34d399',
    accentSecondary: '#0d9488',
    accentContrast: '#022c22',
    swatchGradient: 'linear-gradient(135deg, #34d399 0%, #0d9488 100%)',
  },
  {
    id: 'solar-amber',
    name: 'solar glow',
    mode: 'dark',
    hue: 38,
    accentPrimary: '#fbbf24',
    accentSecondary: '#ea580c',
    accentContrast: '#1c1917',
    swatchGradient: 'linear-gradient(135deg, #fbbf24 0%, #ea580c 100%)',
  },
  {
    id: 'ultraviolet-chrome',
    name: 'ultraviolet',
    mode: 'dark',
    hue: 268,
    accentPrimary: '#a78bfa',
    accentSecondary: '#7c3aed',
    accentContrast: '#ffffff',
    swatchGradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
  },
  {
    id: 'arctic-frost',
    name: 'arctic frost',
    mode: 'light',
    hue: 212,
    accentPrimary: '#0284c7',
    accentSecondary: '#2563eb',
    accentContrast: '#ffffff',
    swatchGradient: 'linear-gradient(135deg, #e0f2fe 0%, #0284c7 100%)',
  },
];

/**
 * @param {{ presetId: string, customHue: number | null, surfaceMode: 'dark' | 'light' }} options
 */
export function applyColorTheme(options) {
  const root = document.documentElement;
  const preset =
    COLOR_PRESETS.find((item) => item.id === options.presetId) ?? COLOR_PRESETS[0];

  const isDark = options.surfaceMode === 'dark';
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  if (options.customHue !== null) {
    const hue = ((options.customHue % 360) + 360) % 360;
    const secondaryHue = (hue + 28) % 360;
    const primary = isDark
      ? `hsl(${hue} 90% 64%)`
      : `hsl(${hue} 85% 42%)`;
    const secondary = isDark
      ? `hsl(${secondaryHue} 82% 58%)`
      : `hsl(${secondaryHue} 80% 46%)`;
    const contrast = isDark && hue >= 45 && hue <= 190 ? '#020617' : '#ffffff';

    root.style.setProperty('--theme-hue', String(hue));
    root.style.setProperty('--accent-primary', primary);
    root.style.setProperty('--accent-secondary', secondary);
    root.style.setProperty('--accent-contrast', contrast);
    root.style.setProperty(
      '--orb-1',
      `hsla(${hue}, 90%, ${isDark ? '58%' : '62%'}, ${isDark ? '0.28' : '0.22'})`
    );
    root.style.setProperty(
      '--orb-2',
      `hsla(${secondaryHue}, 85%, ${isDark ? '54%' : '60%'}, ${isDark ? '0.24' : '0.20'})`
    );
    root.style.setProperty(
      '--orb-3',
      `hsla(${(hue + 335) % 360}, 85%, ${isDark ? '52%' : '64%'}, ${isDark ? '0.18' : '0.16'})`
    );
    return;
  }

  const hue = preset.hue;
  const secondaryHue = (hue + 26) % 360;
  root.style.setProperty('--theme-hue', String(hue));
  root.style.setProperty('--accent-primary', preset.accentPrimary);
  root.style.setProperty('--accent-secondary', preset.accentSecondary);
  root.style.setProperty('--accent-contrast', preset.accentContrast);
  root.style.setProperty(
    '--orb-1',
    `hsla(${hue}, 88%, ${isDark ? '56%' : '60%'}, ${isDark ? '0.28' : '0.24'})`
  );
  root.style.setProperty(
    '--orb-2',
    `hsla(${secondaryHue}, 84%, ${isDark ? '54%' : '58%'}, ${isDark ? '0.24' : '0.18'})`
  );
  root.style.setProperty(
    '--orb-3',
    `hsla(${(hue + 336) % 360}, 82%, ${isDark ? '50%' : '64%'}, ${isDark ? '0.18' : '0.15'})`
  );
}
