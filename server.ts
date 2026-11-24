import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';

interface GameEntry {
  id: number;
  name: string;
  author: string;
  category: string;
  tags: string[];
  featured: boolean;
  file: string;
  coverFile: string;
  cover: string;
  githubUrl: string;
  iframeSrc: string;
  iframe: string;
}

const PORT = Number(process.env.PORT) || 3000;
const app = express();
app.use(express.json({ limit: '256kb' }));

// Load allowlisted games from src/data/games.json
const gamesJsonPath = path.resolve(process.cwd(), 'src', 'data', 'games.json');
const rawGames = fs.readFileSync(gamesJsonPath, 'utf-8');
const gamesCatalog: GameEntry[] = JSON.parse(rawGames);

const allowedHtmlMap = new Map<string, GameEntry>();
const allowedCoverSet = new Set<string>();
for (const game of gamesCatalog) {
  if (game.file) allowedHtmlMap.set(game.file, game);
  if (game.coverFile) allowedCoverSet.add(game.coverFile);
}

// Bounded in-memory caches for snappy game and cover loading
const htmlCache = new Map<string, string>();
const coverCache = new Map<string, { data: Buffer; contentType: string }>();
const MAX_HTML_CACHE = 60;
const MAX_COVER_CACHE = 350;

function setBounded<K, V>(cache: Map<K, V>, key: K, val: V, max: number) {
  if (cache.size >= max) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, val);
}

// Strict allowlisted proxy for gn-math/html game files
app.get('/api/play/:file', async (req, res) => {
  const file = String(req.params.file || '');
  if (!allowedHtmlMap.has(file)) {
    res.status(404).type('text/plain').send('Game not found in catalog.');
    return;
  }

  try {
    let html = htmlCache.get(file);
    if (!html) {
      const upstreamUrl = `https://raw.githubusercontent.com/gn-math/html/main/${encodeURIComponent(file)}`;
      const upstream = await fetch(upstreamUrl, {
        headers: { 'User-Agent': 'maniac12-game-hub' },
      });
      if (!upstream.ok) {
        res.status(502).type('text/plain').send('Unable to load game from source repository.');
        return;
      }
      html = await upstream.text();
      // Remove third-party gtag analytics snippets if present so embedded games stay fast
      html = html.replace(
        /<script[^>]*googletagmanager\.com\/gtag\/js[^>]*><\/script>\s*<script>[\s\S]*?gtag\([\s\S]*?<\/script>/gi,
        ''
      );
      setBounded(htmlCache, file, html, MAX_HTML_CACHE);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(html);
  } catch (err) {
    console.error('Error fetching game HTML:', err);
    res.status(500).type('text/plain').send('Failed to load game.');
  }
});

// Strict allowlisted proxy for gn-math/covers images
app.get('/api/cover/:file', async (req, res) => {
  const file = String(req.params.file || '');
  if (!allowedCoverSet.has(file)) {
    res.status(404).end();
    return;
  }

  try {
    const cached = coverCache.get(file);
    if (cached) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(cached.data);
      return;
    }

    const upstreamUrl = `https://raw.githubusercontent.com/gn-math/covers/main/${encodeURIComponent(file)}`;
    const upstream = await fetch(upstreamUrl, {
      headers: { 'User-Agent': 'maniac12-game-hub' },
    });
    if (!upstream.ok) {
      res.status(404).end();
      return;
    }

    const arrayBuf = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const contentType = upstream.headers.get('content-type') || 'image/png';
    setBounded(coverCache, file, { data: buffer, contentType }, MAX_COVER_CACHE);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err) {
    console.error('Error fetching cover image:', err);
    res.status(404).end();
  }
});

// Helper: find relevant games from catalog for AI context & quick-launch cards
function findMatchingGames(query: string, limit = 10): GameEntry[] {
  const clean = query.toLowerCase().trim();
  const tokens = clean
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !['game', 'games', 'play', 'best', 'good', 'like', 'some', 'want', 'what', 'have', 'with', 'recommend', 'suggest'].includes(t));

  if (tokens.length === 0) {
    return gamesCatalog.filter((g) => g.featured).slice(0, limit);
  }

  const scored = gamesCatalog
    .map((game) => {
      const hay = `${game.name} ${game.category} ${game.author} ${game.tags.join(' ')}`.toLowerCase();
      let score = 0;
      for (const tok of tokens) {
        if (game.name.toLowerCase().includes(tok)) score += 4;
        else if (hay.includes(tok)) score += 2;
      }
      if (game.featured && score > 0) score += 1;
      return { game, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return gamesCatalog.filter((g) => g.featured).slice(0, limit);
  }
  return scored.slice(0, limit).map((s) => s.game);
}

// DuckDuckGo Proxy helpers & bounded cache
interface DdgWebResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface DdgSearchPayload {
  query: string;
  instantAnswer?: {
    heading: string;
    text: string;
    url: string;
    source: string;
    image?: string;
  };
  results: DdgWebResult[];
  relatedTopics: Array<{ text: string; url: string }>;
  provider: string;
}

const ddgCache = new Map<string, { expiresAt: number; payload: DdgSearchPayload }>();
const MAX_DDG_CACHE = 100;
const DDG_TTL_MS = 5 * 60 * 1000;

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_m, code) => {
      const n = Number(code);
      return Number.isFinite(n) && n > 0 && n < 65536 ? String.fromCharCode(n) : '';
    });
}

function stripHtmlTags(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveDdgUrl(rawHref: string): string | null {
  const decoded = decodeHtmlEntities(rawHref.trim());
  if (!decoded) return null;
  let candidate = decoded;
  if (candidate.startsWith('//')) {
    candidate = `https:${candidate}`;
  } else if (candidate.startsWith('/')) {
    candidate = `https://duckduckgo.com${candidate}`;
  }
  try {
    const parsed = new URL(candidate);
    if (parsed.hostname.endsWith('duckduckgo.com')) {
      if (parsed.pathname.startsWith('/y.js')) return null; // Skip ad links
      const uddg = parsed.searchParams.get('uddg');
      if (uddg) {
        const inner = new URL(uddg);
        if (inner.protocol === 'http:' || inner.protocol === 'https:') {
          return inner.toString();
        }
        return null;
      }
    }
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function parseDdgHtmlResults(html: string): DdgWebResult[] {
  if (!html || html.includes('anomaly-modal')) return [];
  const results: DdgWebResult[] = [];
  const seenUrls = new Set<string>();
  const anchorRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;
  while ((match = anchorRegex.exec(html)) !== null) {
    const resolvedUrl = resolveDdgUrl(match[1]);
    if (!resolvedUrl || seenUrls.has(resolvedUrl)) continue;

    const title = stripHtmlTags(match[2]);
    if (!title) continue;

    const tail = html.slice(match.index + match[0].length, match.index + match[0].length + 1400);
    const snippetMatch = tail.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div|span)>/i);
    const snippet = snippetMatch ? stripHtmlTags(snippetMatch[1]) : '';

    let source = '';
    try {
      source = new URL(resolvedUrl).hostname.replace(/^www\./, '');
    } catch {
      source = 'web';
    }

    seenUrls.add(resolvedUrl);
    results.push({ title, url: resolvedUrl, snippet, source });
    if (results.length >= 10) break;
  }
  return results;
}

// DuckDuckGo Autocomplete Proxy
app.get('/api/ddg/suggest', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 120) : '';
  if (!q) {
    res.json([]);
    return;
  }
  try {
    const upstream = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': 'maniac12-search-proxy' },
    });
    if (!upstream.ok) {
      res.json([]);
      return;
    }
    const items = (await upstream.json()) as Array<{ phrase?: string }>;
    const phrases = Array.isArray(items)
      ? items.map((x) => x.phrase).filter((p): p is string => typeof p === 'string').slice(0, 8)
      : [];
    res.json(phrases);
  } catch {
    res.json([]);
  }
});

// DuckDuckGo Web Search Proxy
app.get('/api/ddg/search', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 200) : '';
  if (!q) {
    res.status(400).json({ error: 'Search query "q" is required.' });
    return;
  }

  const cacheKey = q.toLowerCase();
  const cached = ddgCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.payload);
    return;
  }

  try {
    const [iaResult, htmlResult] = await Promise.allSettled([
      fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`,
        { headers: { 'User-Agent': 'maniac12-search-proxy' }, signal: AbortSignal.timeout(5000) }
      ).then((r) => (r.ok ? r.json() : null)),
      fetch('https://html.duckduckgo.com/html/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        },
        body: `q=${encodeURIComponent(q)}`,
        signal: AbortSignal.timeout(5000),
      }).then((r) => (r.ok ? r.text() : '')),
    ]);

    const ia = iaResult.status === 'fulfilled' && iaResult.value ? (iaResult.value as Record<string, unknown>) : {};
    const rawHtml = htmlResult.status === 'fulfilled' && typeof htmlResult.value === 'string' ? htmlResult.value : '';

    let results = parseDdgHtmlResults(rawHtml);
    let provider = results.length > 0 ? 'DuckDuckGo Web' : 'DuckDuckGo Instant Answer';

    // Extract Instant Answer summary
    const abstractText = typeof ia.AbstractText === 'string' ? ia.AbstractText.trim() : '';
    const answerText = typeof ia.Answer === 'string' ? ia.Answer.trim() : '';
    const defText = typeof ia.Definition === 'string' ? ia.Definition.trim() : '';
    const summaryText = answerText || abstractText || defText;
    const summaryUrl =
      typeof ia.AbstractURL === 'string' && ia.AbstractURL.startsWith('http')
        ? ia.AbstractURL
        : typeof ia.DefinitionURL === 'string' && ia.DefinitionURL.startsWith('http')
          ? ia.DefinitionURL
          : `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;

    let instantImage: string | undefined;
    if (typeof ia.Image === 'string' && ia.Image.trim()) {
      instantImage = ia.Image.startsWith('http') ? ia.Image : `https://duckduckgo.com${ia.Image}`;
    }

    const instantAnswer = summaryText
      ? {
          heading: (typeof ia.Heading === 'string' && ia.Heading) || q,
          text: summaryText,
          url: summaryUrl,
          source: (typeof ia.AbstractSource === 'string' && ia.AbstractSource) || 'DuckDuckGo',
          image: instantImage,
        }
      : undefined;

    // Extract DuckDuckGo official results & related topics
    const relatedTopics: Array<{ text: string; url: string }> = [];
    const seenUrls = new Set(results.map((r) => r.url));

    const iaOfficial = Array.isArray(ia.Results) ? ia.Results : [];
    for (const item of iaOfficial as Array<{ FirstURL?: string; Text?: string }>) {
      if (item.FirstURL && item.FirstURL.startsWith('http') && item.Text && !seenUrls.has(item.FirstURL)) {
        seenUrls.add(item.FirstURL);
        let source = 'duckduckgo.com';
        try {
          source = new URL(item.FirstURL).hostname.replace(/^www\./, '');
        } catch {
          // ignore
        }
        results.unshift({
          title: item.Text,
          url: item.FirstURL,
          snippet: 'Official link surfaced by DuckDuckGo Instant Answer.',
          source,
        });
      }
    }

    const collectTopics = (arr: unknown[]) => {
      for (const entry of arr) {
        if (!entry || typeof entry !== 'object') continue;
        const rec = entry as { FirstURL?: string; Text?: string; Topics?: unknown[] };
        if (Array.isArray(rec.Topics)) {
          collectTopics(rec.Topics);
        } else if (rec.FirstURL && rec.FirstURL.startsWith('http') && rec.Text) {
          if (relatedTopics.length < 8) {
            relatedTopics.push({ text: rec.Text, url: rec.FirstURL });
          }
          if (results.length < 8 && !seenUrls.has(rec.FirstURL)) {
            seenUrls.add(rec.FirstURL);
            results.push({
              title: rec.Text.split(' - ')[0] || rec.Text.slice(0, 80),
              url: rec.FirstURL,
              snippet: rec.Text,
              source: 'duckduckgo.com',
            });
          }
        }
      }
    };
    if (Array.isArray(ia.RelatedTopics)) {
      collectTopics(ia.RelatedTopics);
    }

    // If DuckDuckGo HTML was rate-limited and IA returned few links, supplement with Wikipedia OpenSearch
    if (results.length < 3) {
      try {
        const wikiRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=6&format=json`,
          { headers: { 'User-Agent': 'maniac12-search-proxy' }, signal: AbortSignal.timeout(4000) }
        );
        if (wikiRes.ok) {
          const wikiData = (await wikiRes.json()) as [string, string[], string[], string[]];
          const titles = Array.isArray(wikiData[1]) ? wikiData[1] : [];
          const descs = Array.isArray(wikiData[2]) ? wikiData[2] : [];
          const urls = Array.isArray(wikiData[3]) ? wikiData[3] : [];
          for (let i = 0; i < titles.length; i++) {
            const url = urls[i];
            if (url && url.startsWith('http') && !seenUrls.has(url)) {
              seenUrls.add(url);
              results.push({
                title: titles[i],
                url,
                snippet: descs[i] || `Reference article for ${titles[i]}.`,
                source: 'en.wikipedia.org',
              });
            }
          }
          if (results.length > 0 && provider === 'DuckDuckGo Instant Answer') {
            provider = 'DuckDuckGo + Reference Index';
          }
        }
      } catch {
        // Ignore supplement errors
      }
    }

    const payload: DdgSearchPayload = {
      query: q,
      instantAnswer,
      results: results.slice(0, 10),
      relatedTopics,
      provider,
    };

    setBounded(ddgCache, cacheKey, { expiresAt: Date.now() + DDG_TTL_MS, payload }, MAX_DDG_CACHE);
    res.json(payload);
  } catch (err) {
    console.error('DuckDuckGo proxy error:', err);
    res.status(502).json({ error: 'Unable to fetch DuckDuckGo search results right now.' });
  }
});

// Server-side Gemini AI Chatbot endpoint (with live web search grounding)
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    res.status(503).json({
      error: 'Gemini API key is not configured. Please add GEMINI_API_KEY in Settings > Secrets.',
    });
    return;
  }

  const body = req.body as {
    messages?: Array<{ role?: unknown; text?: unknown }>;
  };

  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    res.status(400).json({ error: 'Messages array is required.' });
    return;
  }

  const sanitizedHistory = body.messages
    .slice(-12)
    .filter(
      (m): m is { role: 'user' | 'model'; text: string } =>
        (m.role === 'user' || m.role === 'model') &&
        typeof m.text === 'string' &&
        m.text.trim().length > 0
    )
    .map((m) => ({
      role: m.role,
      parts: [{ text: m.text.trim().slice(0, 1500) }],
    }));

  if (sanitizedHistory.length === 0 || sanitizedHistory[sanitizedHistory.length - 1].role !== 'user') {
    res.status(400).json({ error: 'Latest message must be a non-empty user message.' });
    return;
  }

  const latestUserText = sanitizedHistory[sanitizedHistory.length - 1].parts[0].text;
  const isGameQuery =
    /\b(game|games|play|arcade|platformer|puzzle|horror|fnaf|minecraft|mario|retro|emulator|roblox|fnf|ovo|shooter|racing|sports|unblocked|maniac12|gn-math|recommend|level|boss|controls)\b/i.test(
      latestUserText
    );

  const matchedGames = isGameQuery ? findMatchingGames(latestUserText, 12) : [];
  const featuredSample = gamesCatalog
    .filter((g) => g.featured)
    .slice(0, 12)
    .map((g) => `${g.name} (${g.category})`)
    .join(', ');

  const catalogContext =
    matchedGames.length > 0
      ? `Relevant titles from the MANIAC12 catalog for this query:\n${matchedGames
          .map((g) => `- ${g.name} | Category: ${g.category} | Author: ${g.author}`)
          .join('\n')}`
      : '';

  const systemInstruction = [
    'you are the maniac12 ai bestie — a chill, helpful, general-purpose assistant embedded inside the maniac12 website.',
    'always type in all lowercase and sound like a friendly gen z friend texting (use casual texting style like ngl, fr, lowkey, bet, rn when it fits naturally, while still being genuinely smart, clear, and accurate).',
    'you can help with literally anything: science, math, coding, writing, homework, trivia, live web lookups, or gaming.',
    `if (and only if) the user asks about games on this site, know that maniac12 hosts ${gamesCatalog.length} playable html5 games from gn-math/html (including ${featuredSample}). do not force gaming topics into unrelated convos.`,
    'keep replies helpful, punchy, and all lowercase.',
    catalogContext,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: sanitizedHistory,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      },
    });

    const reply = (
      (response.text ?? '').trim() ||
      'lowkey couldnt generate a reply rn, try sending that again.'
    ).toLowerCase();

    // Extract grounded web sources if present
    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const sources: Array<{ title: string; url: string }> = [];
    const seenSourceUrls = new Set<string>();
    for (const chunk of rawChunks) {
      const uri = chunk.web?.uri;
      const title = chunk.web?.title;
      if (uri && (uri.startsWith('https://') || uri.startsWith('http://')) && !seenSourceUrls.has(uri)) {
        seenSourceUrls.add(uri);
        sources.push({ title: title || uri, url: uri });
        if (sources.length >= 4) break;
      }
    }

    let uniqueSuggestions: GameEntry[] = [];
    if (isGameQuery) {
      const mentionedInReply = gamesCatalog.filter(
        (g) => g.name.length >= 4 && reply.toLowerCase().includes(g.name.toLowerCase())
      );
      const combinedSuggestions = [...mentionedInReply, ...matchedGames];
      const seenIds = new Set<number>();
      for (const g of combinedSuggestions) {
        if (!seenIds.has(g.id)) {
          seenIds.add(g.id);
          uniqueSuggestions.push(g);
        }
        if (uniqueSuggestions.length >= 3) break;
      }
    }

    res.json({
      reply,
      sources,
      suggestedGames: uniqueSuggestions.map((g) => ({
        id: g.id,
        name: g.name,
        category: g.category,
        file: g.file,
        cover: g.cover,
        iframeSrc: g.iframeSrc,
      })),
    });
  } catch (err: unknown) {
    console.error('Gemini API error:', err);
    const message = err instanceof Error ? err.message : 'upstream ai service error.';
    const status = message.includes('429') ? 429 : message.includes('403') || message.includes('401') ? 403 : 500;
    res.status(status).json({
      error:
        status === 403
          ? 'gemini api key is invalid or denied rn, check secrets.'
          : status === 429
            ? 'ai rate limit hit rn, chill a sec and try again.'
            : 'couldnt reach the ai rn ngl, try again.',
    });
  }
});

// Serve downloadable single-file standalone HTML (bypasses Vite SPA fallback)
app.get('/maniac12-standalone.html', (_req, res) => {
  const candidates = [
    path.resolve(process.cwd(), 'public', 'maniac12-standalone.html'),
    path.resolve(process.cwd(), 'dist', 'maniac12-standalone.html'),
  ];
  const filePath = candidates.find((p) => fs.existsSync(p));
  if (!filePath) {
    res.status(404).type('text/plain').send('standalone html not built yet.');
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="maniac12.html"');
  res.sendFile(filePath);
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MANIAC12 server running on http://0.0.0.0:${PORT} (${gamesCatalog.length} games loaded)`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start MANIAC12 server:', err);
  process.exit(1);
});
