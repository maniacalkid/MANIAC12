/**
 * @param {import('../types').GameItem[]} games
 * @param {string} rawQuery
 * @returns {import('../types').GameItem[]}
 */
export function rankGameSearch(games, rawQuery) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];

  const tokens = q.split(/\s+/).filter(Boolean);

  /** @type {Array<{ game: import('../types').GameItem, score: number }>} */
  const scored = [];
  for (const game of games) {
    const nameLower = game.name.toLowerCase();
    const authorLower = game.author.toLowerCase();
    const categoryLower = game.category.toLowerCase();
    const tagsLower = game.tags.join(' ').toLowerCase();
    const combined = `${nameLower} ${authorLower} ${categoryLower} ${tagsLower}`;

    const matchesAllTokens = tokens.every((tok) => combined.includes(tok));
    if (!matchesAllTokens) continue;

    let score = 0;
    if (nameLower === q) score += 100;
    else if (nameLower.startsWith(q)) score += 60;
    else if (nameLower.includes(q)) score += 35;
    else if (tokens.every((tok) => nameLower.includes(tok))) score += 25;
    else if (categoryLower.includes(q) || tagsLower.includes(q)) score += 12;
    else score += 6;

    if (game.featured) score += 4;
    scored.push({ game, score });
  }

  scored.sort((a, b) => b.score - a.score || a.game.name.localeCompare(b.game.name));
  return scored.map((entry) => entry.game);
}
