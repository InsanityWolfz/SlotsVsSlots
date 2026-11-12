/**
 * Every word a player can read, in one file, for a cold read (user, 2026-11-12: a card said ENEMIES FASTER and nothing
 * caught it: the tests check that a text is true and that it fits, not that it reads).
 *   npx tsx tools/text/dump.ts   -> tools/out/text/words.json
 * Two parts: the cards as the game shows them (resolved per machine), and every other string literal in src/ that has
 * at least two capital-letter words (banners, menus, tips, results), grouped by file.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { collect } from './collect';

const out = collect();
mkdirSync('tools/out/text', { recursive: true });
writeFileSync('tools/out/text/words.json', JSON.stringify(out, null, 1));
const by = new Map<string, number>();
for (const o of out) by.set(o.where, (by.get(o.where) ?? 0) + 1);
console.log(out.length, 'strings');
console.log([...by].map(([k, v]) => `${v} ${k}`).join('\n'));
