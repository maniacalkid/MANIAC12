import type {
  ChatSource,
  DdgSearchResponse,
  DdgWebResult,
  GameItem,
  SuggestedGame,
} from '../types';
import { rankGameSearch } from './searchGames';

declare global {
  interface Window {
    __MANIAC12_STANDALONE__?: boolean;
  }
}

export const IS_STANDALONE =
  typeof window !== 'undefined' &&
  (window.__MANIAC12_STANDALONE__ === true ||
    window.location.protocol === 'file:' ||
    window.location.protocol === 'about:' ||
    window.location.protocol === 'blob:');

export function getGameCoverUrl(game: GameItem): string {
  if (IS_STANDALONE && game.coverFile) {
    return `https://raw.githubusercontent.com/gn-math/covers/main/${encodeURIComponent(game.coverFile)}`;
  }
  return game.cover;
}

const standaloneHtmlCache = new Map<string, string>();

export async function fetchStandaloneGameHtml(file: string): Promise<string> {
  const cached = standaloneHtmlCache.get(file);
  if (cached) return cached;

  const url = `https://raw.githubusercontent.com/gn-math/html/main/${encodeURIComponent(file)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`failed to fetch game (${res.status})`);
  }

  let html = await res.text();
  html = html.replace(
    /<script[^>]*googletagmanager\.com\/gtag\/js[^>]*><\/script>\s*<script>[\s\S]*?gtag\([\s\S]*?<\/script>/gi,
    ''
  );

  if (!/<base[\s>]/i.test(html)) {
    const baseTag = '<base href="https://raw.githubusercontent.com/gn-math/html/main/">';
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, (m) => `${m}\n${baseTag}`);
    } else {
      html = `${baseTag}\n${html}`;
    }
  }

  if (standaloneHtmlCache.size >= 40) {
    const firstKey = standaloneHtmlCache.keys().next().value;
    if (firstKey !== undefined) standaloneHtmlCache.delete(firstKey);
  }
  standaloneHtmlCache.set(file, html);
  return html;
}

export async function suggestWebStandalone(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(trimmed)}&limit=6&namespace=0&format=json&origin=*`
    );
    if (!res.ok) return [];
    const data = (await res.json()) as [string, string[]];
    return Array.isArray(data[1]) ? data[1].slice(0, 6) : [];
  } catch {
    return [];
  }
}

export async function searchWebStandalone(query: string): Promise<DdgSearchResponse> {
  const trimmed = query.trim();
  const [ddgSettled, wikiSettled] = await Promise.allSettled([
    fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(trimmed)}&format=json&no_html=1&skip_disambig=1`
    ).then(async (r) => {
      if (!r.ok) throw new Error('ddg instant api unavailable');
      return (await r.json()) as {
        Heading?: string;
        AbstractText?: string;
        AbstractURL?: string;
        AbstractSource?: string;
        Image?: string;
        RelatedTopics?: Array<{
          Text?: string;
          FirstURL?: string;
          Topics?: Array<{ Text?: string; FirstURL?: string }>;
        }>;
      };
    }),
    fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(trimmed)}&limit=8&namespace=0&format=json&origin=*`
    ).then(async (r) => {
      if (!r.ok) throw new Error('wiki opensearch unavailable');
      return (await r.json()) as [string, string[], string[], string[]];
    }),
  ]);

  let instantAnswer: DdgSearchResponse['instantAnswer'];
  const relatedTopics: Array<{ text: string; url: string }> = [];
  const results: DdgWebResult[] = [];
  const seenUrls = new Set<string>();

  if (ddgSettled.status === 'fulfilled') {
    const ddg = ddgSettled.value;
    if (ddg.AbstractText && ddg.AbstractURL) {
      let img: string | undefined;
      if (ddg.Image) {
        img = ddg.Image.startsWith('http')
          ? ddg.Image
          : `https://duckduckgo.com${ddg.Image.startsWith('/') ? '' : '/'}${ddg.Image}`;
      }
      instantAnswer = {
        heading: (ddg.Heading || trimmed).toLowerCase(),
        text: ddg.AbstractText.toLowerCase(),
        url: ddg.AbstractURL,
        source: (ddg.AbstractSource || 'duckduckgo').toLowerCase(),
        image: img,
      };
    }

    for (const item of ddg.RelatedTopics ?? []) {
      if (item.FirstURL && item.Text) {
        relatedTopics.push({ text: item.Text.toLowerCase(), url: item.FirstURL });
        if (!seenUrls.has(item.FirstURL) && results.length < 10) {
          seenUrls.add(item.FirstURL);
          const [titlePart, ...rest] = item.Text.split(' - ');
          results.push({
            title: (titlePart || item.Text).slice(0, 120).toLowerCase(),
            url: item.FirstURL,
            snippet: rest.join(' - ').toLowerCase(),
            source: 'duckduckgo',
          });
        }
      } else if (Array.isArray(item.Topics)) {
        for (const sub of item.Topics) {
          if (sub.FirstURL && sub.Text && !seenUrls.has(sub.FirstURL) && results.length < 10) {
            seenUrls.add(sub.FirstURL);
            const [titlePart, ...rest] = sub.Text.split(' - ');
            results.push({
              title: (titlePart || sub.Text).slice(0, 120).toLowerCase(),
              url: sub.FirstURL,
              snippet: rest.join(' - ').toLowerCase(),
              source: 'duckduckgo',
            });
          }
        }
      }
    }
  }

  if (wikiSettled.status === 'fulfilled') {
    const [, titles, snippets, urls] = wikiSettled.value;
    if (Array.isArray(titles) && Array.isArray(urls)) {
      for (let i = 0; i < titles.length; i++) {
        const url = urls[i];
        const title = titles[i];
        if (!url || !title || seenUrls.has(url)) continue;
        seenUrls.add(url);
        results.push({
          title: title.toLowerCase(),
          url,
          snippet: (snippets?.[i] || 'wikipedia reference').toLowerCase(),
          source: 'en.wikipedia.org',
        });
      }
    }
  }

  return {
    query: trimmed.toLowerCase(),
    instantAnswer,
    results,
    relatedTopics,
    provider: 'duckduckgo + wikipedia (standalone)',
  };
}

function tryEvalSimpleMath(text: string): string | null {
  const cleaned = text
    .toLowerCase()
    .replace(/^(what is|whats|what's|calculate|solve|eval)\s+/i, '')
    .replace(/\?/g, '')
    .trim();
  if (!/^[0-9+\-*/().\s^%]+$/.test(cleaned) || !/\d/.test(cleaned)) {
    return null;
  }
  const normalized = cleaned.replace(/\^/g, '**');
  try {
    const fn = new Function(`"use strict"; return (${normalized});`);
    const result = fn();
    if (typeof result === 'number' && Number.isFinite(result)) {
      return `${cleaned} = ${result}`;
    }
  } catch {
    return null;
  }
  return null;
}

export async function chatStandalone(
  userText: string,
  games: GameItem[]
): Promise<{
  reply: string;
  sources?: ChatSource[];
  suggestedGames?: SuggestedGame[];
}> {
  const trimmed = userText.trim().toLowerCase();

  // Quick greeting handling
  if (/^(yo+|hi+|hey+|sup|wsg|hola|hello)[!.\s]*$/.test(trimmed)) {
    return {
      reply: `yooo wsg! running in standalone html mode rn — ask me about any of our ${games.length} games, math, or look up random facts fr.`,
    };
  }

  // Simple math evaluator
  const mathAnswer = tryEvalSimpleMath(trimmed);
  if (mathAnswer) {
    return {
      reply: `ez math — ${mathAnswer} fr.`,
    };
  }

  // Game query check
  const isGameQuery =
    /\b(game|games|play|arcade|platformer|puzzle|horror|fnaf|minecraft|mario|retro|emulator|roblox|fnf|ovo|shooter|racing|sports|unblocked|maniac12|gn-math|recommend|put me on|banger)\b/i.test(
      trimmed
    );

  if (isGameQuery) {
    const searchStripped = trimmed
      .replace(/\b(recommend|suggest|find|give me|put me on|some|good|best|crazy|fast|fun|top|games|game|to play|rn|fr|ngl)\b/g, ' ')
      .trim();
    const ranked = searchStripped
      ? rankGameSearch(games, searchStripped)
      : games.filter((g) => g.featured);
    const picks = (ranked.length > 0 ? ranked : games.filter((g) => g.featured)).slice(0, 3);
    return {
      reply: `bet, peep these ${picks.length} bangers straight from the vault rn — click play on any of em:`,
      suggestedGames: picks.map((g) => ({
        id: g.id,
        name: g.name,
        category: g.category,
        file: g.file,
        cover: getGameCoverUrl(g),
        iframeSrc: g.iframeSrc,
      })),
    };
  }

  // General topic lookup via Wikipedia OpenSearch + Summary (works over CORS in static HTML)
  const topicQuery = trimmed
    .replace(/^(who is|who was|what is|what are|explain|tell me about|how does|how do|define)\s+/i, '')
    .replace(/\b(like im 5|simply|briefly|rn|fr|pls|please)\b/gi, '')
    .replace(/[?!.]+$/g, '')
    .trim();

  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(topicQuery || trimmed)}&limit=3&namespace=0&format=json&origin=*`
    );
    if (searchRes.ok) {
      const [, titles, , urls] = (await searchRes.json()) as [string, string[], string[], string[]];
      if (titles && titles[0]) {
        const summaryRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titles[0])}`
        );
        if (summaryRes.ok) {
          const summary = (await summaryRes.json()) as {
            title?: string;
            extract?: string;
            content_urls?: { desktop?: { page?: string } };
          };
          if (summary.extract) {
            const url = summary.content_urls?.desktop?.page || urls?.[0];
            return {
              reply: `${summary.extract.toLowerCase()}`,
              sources: url
                ? [{ title: (summary.title || titles[0]).toLowerCase(), url }]
                : undefined,
            };
          }
        }
      }
    }
  } catch {
    // Fallback below
  }

  // Fallback: check if query matches a game title directly
  const fallbackGames = rankGameSearch(games, trimmed).slice(0, 3);
  if (fallbackGames.length > 0) {
    return {
      reply: `lowkey couldnt pull live web info for that in standalone mode, but i found ${fallbackGames.length} game${fallbackGames.length === 1 ? '' : 's'} matching "${trimmed}" if u tryna play:`,
      suggestedGames: fallbackGames.map((g) => ({
        id: g.id,
        name: g.name,
        category: g.category,
        file: g.file,
        cover: getGameCoverUrl(g),
        iframeSrc: g.iframeSrc,
      })),
    };
  }

  return {
    reply: `ngl im running in offline/static single-file html mode rn so full gemini chat isnt attached, try searching "${trimmed}" in the ddg proxy tab or ask me to put u on some games.`,
  };
}
