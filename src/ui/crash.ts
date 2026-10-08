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
  const report = [`SLOTS VS. SLOTS ${VERSION}`, new Date().toISOString(), JSON.stringify(ctx), `${e.name}: ${e.message}`, e.stack ?? ''].join('\n');
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
}

export function installCrashHandlers(context: () => Record<string, unknown>): void {
  window.addEventListener('error', (ev) => reportCrash(ev.error ?? ev.message, context));
  window.addEventListener('unhandledrejection', (ev) => reportCrash(ev.reason, context));
}
