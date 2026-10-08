// Prints the achievement table for Steamworks (API name, display name, description, hidden) as CSV, from
// src/core/meta.ts. The API names are the game's own ids: never rename them (saves and Steam both key on them).
// Run: npx tsx tools/steam/achievements.ts > achievements.csv
import { ACHIEVEMENTS } from '../../src/core/meta';

const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
console.log('api_name,display_name,description,hidden');
for (const a of ACHIEVEMENTS) {
  const hidden = !!a.secret;
  const title = (s: string) => s.toLowerCase().replace(/(^|[\s(.,:-])([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase());
  console.log([a.id, q(title(a.name)), q(a.text.charAt(0) + a.text.slice(1).toLowerCase()), hidden ? 1 : 0].join(','));
}
