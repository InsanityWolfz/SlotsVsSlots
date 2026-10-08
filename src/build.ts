/** Build identity. __APP_VERSION__ comes from vite.config.ts (package version + git commit). */
declare const __APP_VERSION__: string | undefined;
export const VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
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
export const desktop = (): DesktopBridge | undefined => (globalThis as { desktop?: DesktopBridge }).desktop;
/** Running inside the desktop wrapper. */
export const DESKTOP: boolean = typeof (globalThis as { desktop?: unknown }).desktop === 'object';
/** Steam (only with the wrapper and Steam running). */
export const steamUnlock = (id: string): void => {
  try {
    (globalThis as { steam?: { unlock?: (id: string) => void } }).steam?.unlock?.(id);
  } catch {
    /* no Steam */
  }
};
