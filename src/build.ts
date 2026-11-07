import { DEMO, demoKey } from './demo';

/** Build identity. __APP_VERSION__ comes from vite.config.ts (package version + git commit). */
declare const __APP_VERSION__: string | undefined;
export const VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
/** The act 1 demo build (src/demo.ts): `vite build --mode demo`. */
export { DEMO };
/** The desktop (Steam) build: `VITE_STEAM=1 vite build`. Hides the browser-playtest wording. */
export const STEAM: boolean = !!(import.meta as { env?: Record<string, string | undefined> }).env?.VITE_STEAM;
/** The desktop wrapper's bridge (desktop/preload.cjs). Absent in browsers. */
export interface DesktopBridge {
  quit(): void;
  setFullscreen(on: boolean): void;
  isFullscreen(): boolean;
  saveWrite(key: string, json: string): boolean;
  saveRead(key: string): string | null;
  saveRemove(key: string): boolean;
}
export const desktop = (): DesktopBridge | undefined => {
  const d = (globalThis as { desktop?: DesktopBridge }).desktop;
  return d && DEMO ? demoBridge(d) : d;
};
/** The demo's save files carry the demo's keys too (it may share the full game's save folder on a PC). */
const demoBridge = (d: DesktopBridge): DesktopBridge => ({
  ...d,
  quit: () => d.quit(),
  setFullscreen: (on) => d.setFullscreen(on),
  isFullscreen: () => d.isFullscreen(),
  saveWrite: (key, json) => d.saveWrite(demoKey(key), json),
  saveRead: (key) => d.saveRead(demoKey(key)),
  saveRemove: (key) => d.saveRemove(demoKey(key)),
});
/** Running inside the desktop wrapper. */
export const DESKTOP: boolean = typeof (globalThis as { desktop?: unknown }).desktop === 'object';
/** Steam (only with the wrapper and Steam running). */
export const steamUnlock = (id: string): void => {
  // The demo fires no achievements (they're the full game's).
  if (DEMO) return;
  try {
    (globalThis as { steam?: { unlock?: (id: string) => void } }).steam?.unlock?.(id);
  } catch {
    /* no Steam */
  }
};
