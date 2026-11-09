// Prints the achievement table for Steamworks (API name, display name, description, hidden) as CSV, from
// src/core/meta.ts. The API names are the game's own ids: never rename them (saves and Steam both key on them).
// Run: npx tsx tools/steam/achievements.ts > achievements.csv
import { ACHIEVEMENTS } from '../../src/core/meta';

const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
console.log('api_name,display_name,description,hidden');
// The game's text is all caps. On Steam: titles in title case, descriptions in sentence case, with the game's own names
// (Slot Machines, bosses, stakes, ENDLESS) kept in caps as the game writes them (QA STEAM-08: "Dj Decibel",
// "with knight.", "the repo man").
const NAMES = ['THE HOUSE', 'THE DEALER', 'THE OWNER', 'THE REPO MAN', 'KNIGHT', 'TESLA', 'JUKEBOX', 'JOKER', 'BANKROLL', 'RED', 'GREEN', 'BLACK', 'BLUE', 'GOLD', 'ENDLESS'];
const SMALL = new Set(['a', 'an', 'the', 'of', 'on', 'to', 'and', 'or', 'with']);
const title = (s: string) =>
  s
    .toLowerCase()
    .split(' ')
    .map((w, i) => (w === 'dj' ? 'DJ' : i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
const sentence = (s: string) => {
  let out = s.charAt(0) + s.slice(1).toLowerCase();
  for (const n of NAMES) out = out.replace(new RegExp(`\\b${n.toLowerCase()}\\b`, 'gi'), n);
  return out.replace(/\bslot machine/gi, 'Slot Machine');
};
for (const a of ACHIEVEMENTS) {
  const hidden = !!a.secret;
  console.log([a.id, q(title(a.name)), q(sentence(a.text)), hidden ? 1 : 0].join(','));
}
