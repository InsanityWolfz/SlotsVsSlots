import { drawText, textWidth } from '../render/text';

/**
 * Controller prompts (Steam Deck, 2026-11-04): the words on screen follow the device in hand. A tap on a phone, a click
 * with a mouse, keys on a keyboard, and button badges on a pad ([A], [X], [LB], [DPAD]...), drawn inline by
 * drawPrompt. The last device used wins (main.ts tells us).
 */
export type InputMode = 'touch' | 'mouse' | 'keys' | 'pad';

let mode: InputMode = typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches ?? false) ? 'touch' : 'mouse';
export const inputMode = (): InputMode => mode;
export function setInputMode(m: InputMode): void {
  mode = m;
}

/** On a Steam Deck the shoulders read L1 / R1 and the triggers L2 / R2 (Valve's names); elsewhere LB / RB, LT / RT. */
const deck = (): boolean => {
  try {
    return !!(window as unknown as { desktop?: { steamDeck?: () => boolean } }).desktop?.steamDeck?.();
  } catch {
    return false;
  }
};

/** The words for the device in hand. A mouse falls back to the touch words, keys to the mouse's. */
export function by(o: { touch: string; mouse?: string; keys?: string; pad: string }): string {
  if (mode === 'pad') return o.pad;
  if (mode === 'keys') return o.keys ?? o.mouse ?? o.touch;
  if (mode === 'mouse') return o.mouse ?? o.touch;
  return o.touch;
}

/** "TAP" / "CLICK" / "PRESS": the verb for pressing something on screen. */
export const tapWord = (): string => by({ touch: 'TAP', mouse: 'CLICK', keys: 'PRESS', pad: 'PRESS' });

const TOKEN = /\[(A|B|X|Y|LB|RB|LT|RT|START|VIEW|DPAD)\]/g;
const INK = '#140c1c';
const FACE = '#f4ead2';
const RIM = '#8a7e9a';

/** A badge's label (the shoulders and triggers by platform). */
function badgeLabel(t: string): string {
  if (!deck()) return t;
  return ({ LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2', START: 'MENU' } as Record<string, string>)[t] ?? t;
}

/** A badge's letters: a size under the text's, so the badge sits at the text's height. */
const inner = (scale: number): number => Math.max(1, Math.round(scale) - 1);
/** A badge's height and width at a text scale. */
function badgeSize(t: string, scale: number): { w: number; h: number } {
  const h = 7 * Math.max(1, Math.round(scale)) + 4;
  if (t === 'DPAD') return { w: h, h };
  const label = badgeLabel(t);
  return { w: label.length === 1 ? h : textWidth(label, inner(scale)) + 4 * inner(scale) + 8, h };
}

/** One pad badge centred on (cx, cy): a round face button, a pill for the rest, a cross for the d-pad. */
function drawBadge(ctx: CanvasRenderingContext2D, t: string, cx: number, cy: number, scale: number, alpha: number): void {
  const s = inner(scale);
  const { w: bw, h } = badgeSize(t, scale);
  ctx.save();
  ctx.globalAlpha *= alpha;
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  if (t === 'DPAD') {
    // A cross, the arm a third of its size.
    const r = Math.floor(h / 2);
    const a = Math.max(2, Math.round(h / 3 / 2));
    ctx.fillStyle = INK;
    ctx.fillRect(x0 - a - 1, y0 - r - 1, a * 2 + 2, r * 2 + 2);
    ctx.fillRect(x0 - r - 1, y0 - a - 1, r * 2 + 2, a * 2 + 2);
    ctx.fillStyle = FACE;
    ctx.fillRect(x0 - a, y0 - r, a * 2, r * 2);
    ctx.fillRect(x0 - r, y0 - a, r * 2, a * 2);
    ctx.fillStyle = RIM;
    ctx.fillRect(x0 - a + 1, y0 - a + 1, a * 2 - 2, a * 2 - 2);
    ctx.restore();
    return;
  }
  const label = badgeLabel(t);
  const round = label.length === 1;
  const bx = Math.round(x0 - bw / 2);
  const by = Math.round(y0 - h / 2);
  // A disc (corners cut twice) or a pill (corners cut once), dark ring, light face, the letter in ink.
  const c = round ? Math.max(2, Math.round(h * 0.3)) : Math.max(2, Math.round(h * 0.25));
  const fill = (inset: number, col: string) => {
    ctx.fillStyle = col;
    const x = bx + inset;
    const y = by + inset;
    const ww = bw - inset * 2;
    const hh = h - inset * 2;
    const k = Math.max(1, c - inset);
    ctx.fillRect(x + k, y, ww - k * 2, hh);
    ctx.fillRect(x, y + k, ww, hh - k * 2);
    const k2 = Math.max(1, Math.round(k / 2));
    ctx.fillRect(x + k2, y + k2, ww - k2 * 2, hh - k2 * 2);
  };
  fill(-1, INK);
  fill(0, FACE);
  // A shade along the foot: it reads as a button.
  ctx.fillStyle = 'rgba(20,12,28,0.25)';
  ctx.fillRect(bx + c, by + h - 2, bw - c * 2, 2);
  drawText(ctx, label, x0, y0 + 1, s, INK, { outline: null });
  ctx.restore();
}

/** How wide drawPrompt draws `text` (badges at their own width). */
export function promptWidth(text: string, scale: number): number {
  const cell = textWidth('MM', scale) - textWidth('M', scale);
  let w = 0;
  let chars = text.length;
  for (const m of text.matchAll(TOKEN)) {
    w += badgeSize(m[1], scale).w + 2;
    chars -= m[0].length;
  }
  return w + chars * cell;
}

/** Text with pad badges ([A], [LB], [DPAD]...) inline. A badge is never wider than its token, so wrapping by characters
 * still fits. */
export function drawPrompt(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, scale: number, color: string, o: { align?: 'left' | 'center' | 'right'; alpha?: number } = {}): void {
  if (!text.includes('[')) return drawText(ctx, text, x, y, scale, color, o);
  const cell = textWidth('MM', scale) - textWidth('M', scale);
  // The pieces: runs of text, and badges at their own width (a letter's gap either side).
  const parts: { text?: string; badge?: string; w: number }[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const before = text.slice(last, m.index);
    if (before) parts.push({ text: before, w: before.length * cell });
    parts.push({ badge: m[1], w: badgeSize(m[1], scale).w + 2 });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), w: (text.length - last) * cell });
  const total = parts.reduce((a, p) => a + p.w, 0);
  let at = o.align === 'left' ? x : o.align === 'right' ? x - total : x - total / 2;
  const alpha = o.alpha ?? 1;
  for (const p of parts) {
    if (p.text) drawText(ctx, p.text, at, y, scale, color, { align: 'left', alpha });
    else if (p.badge) drawBadge(ctx, p.badge, at + p.w / 2, y, scale, alpha);
    at += p.w;
  }
}
