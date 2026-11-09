import { VERSION } from '../build';

/**
 * Crash safety (STEAM_READINESS S13): an exception never freezes the game silently. The first one shows a small panel
 * with a copyable report; the loop keeps running (most errors are one bad frame), and RELOAD restarts cleanly.
 * Saves are untouched: they're written between fights, never from a frame.
 */
let shown = false;
const seen = new Set<string>();

export function reportCrash(err: unknown, context: () => Record<string, unknown>): void {
  const e = err instanceof Error ? err : new Error(String(err));
  const key = `${e.message}\n${e.stack ?? ''}`.slice(0, 400);
  if (seen.has(key)) return;
  seen.add(key);
  console.error(e);
  let ctx: Record<string, unknown> = {};
  try {
    ctx = context();
  } catch {
    /* the context itself broke */
  }
  const report = [`REEL BRAWL ${VERSION}`, new Date().toISOString(), JSON.stringify(ctx), `${e.name}: ${e.message}`, e.stack ?? ''].join('\n');
  if (shown) return;
  shown = true;
  const host = document.getElementById('overlay') ?? document.body;
  const box = document.createElement('div');
  box.className = 'crash';
  box.innerHTML = `<h2>SOMETHING BROKE</h2><p>Your unlocks, collection and scores are saved. Please send us this report.</p><textarea readonly></textarea><div><button data-a="copy">COPY REPORT</button><button data-a="close">KEEP PLAYING</button><button data-a="reload">RELOAD</button></div>`;
  const ta = box.querySelector('textarea')!;
  ta.value = report;
  box.addEventListener('click', (ev) => {
    const a = (ev.target as HTMLElement).dataset.a;
    if (a === 'copy') {
      ta.select();
      void navigator.clipboard?.writeText(report).catch(() => document.execCommand('copy'));
    } else if (a === 'close') {
      box.remove();
      shown = false;
    } else if (a === 'reload') location.reload();
  });
  host.appendChild(box);
  // Keyboard and pad (QA FUNC-02: Enter on KEEP PLAYING was eaten by the game's keys, and a pad couldn't reach it):
  // the focus starts on KEEP PLAYING; crashKey() moves and presses it.
  box.querySelector<HTMLButtonElement>('button[data-a="close"]')?.focus({ preventScroll: true });
}

/**
 * A key or pad button while the crash panel is up: arrows move between its buttons, Enter / Space / A press the focused
 * one, Escape / B (and START) keep playing. Returns false when there's no panel, so the game gets the key.
 */
export function crashKey(k: string): boolean {
  const box = document.querySelector<HTMLDivElement>('.crash');
  if (!box) return false;
  const buttons = [...box.querySelectorAll<HTMLButtonElement>('button')];
  const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (k === 'escape' || k === 'start') {
    buttons.find((b) => b.dataset.a === 'close')?.click();
  } else if (k === 'arrowleft' || k === 'arrowright' || k === 'arrowup' || k === 'arrowdown' || k === 'tab') {
    const step = k === 'arrowleft' || k === 'arrowup' ? -1 : 1;
    const from = at < 0 ? buttons.findIndex((b) => b.dataset.a === 'close') : at;
    buttons[(from + step + buttons.length) % buttons.length]?.focus({ preventScroll: true });
  } else if (k === 'enter' || k === ' ') {
    (at >= 0 ? buttons[at] : buttons.find((b) => b.dataset.a === 'close'))?.click();
  }
  // Every other key is swallowed while the panel is up (the game plays on underneath, but it's the panel's turn).
  return true;
}

export function installCrashHandlers(context: () => Record<string, unknown>): void {
  window.addEventListener('error', (ev) => reportCrash(ev.error ?? ev.message, context));
  window.addEventListener('unhandledrejection', (ev) => reportCrash(ev.reason, context));
}
