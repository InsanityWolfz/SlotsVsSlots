/** Build identity. __APP_VERSION__ comes from vite.config.ts (package version + git commit). */
declare const __APP_VERSION__: string | undefined;
export const VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
/** The desktop (Steam) build: `VITE_STEAM=1 vite build`. Hides the browser-playtest wording. */
export const STEAM: boolean = !!(import.meta as { env?: Record<string, string | undefined> }).env?.VITE_STEAM;
/** Running inside the desktop wrapper (it exposes a quit hook). */
export const DESKTOP: boolean = typeof (globalThis as { desktop?: unknown }).desktop === 'object';
