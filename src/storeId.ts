// The full game's Steam app id: the WISHLIST buttons' store page. Pure (no import.meta), so vite.config.ts can check it
// at build time and the tests can call it. Set it with VITE_STORE_APP_ID (e.g. in .env, or the build's environment) once
// Steamworks gives the store page its id.

/** The app id from its raw text, or null while it's unset (or not a number). */
export function parseStoreAppId(raw: string | undefined | null): number | null {
  const s = (raw ?? '').trim();
  return /^\d+$/.test(s) && Number(s) > 0 ? Number(s) : null;
}

/** The store page for an app id. */
export const storeUrl = (id: number): string => `https://store.steampowered.com/app/${id}`;

/** Why this build can't ship as it is, or null. The real Steam demo (`--mode steam-demo`) must name the store page:
 * its only call to action is WISHLIST ON STEAM. The web demo (GitHub Pages playtests) may build without it. */
export function storeIdProblem(mode: string, raw: string | undefined | null): string | null {
  if (mode !== 'steam-demo' || parseStoreAppId(raw) !== null) return null;
  return "The Steam demo needs the store page: set VITE_STORE_APP_ID to the full game's Steam app id (QA DEMO-01).";
}
