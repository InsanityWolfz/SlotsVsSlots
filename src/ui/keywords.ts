/**
 * KEYWORDS (user, 2026-10-12; HOLD and OVERTIME 2026-10-29): the same word for the same thing on every card, each in its own colour. drawRich colours
 * them wherever they appear; the GLOSSARY page (pause menu) lists them; a card shows the keywords it uses beside it, each
 * with its icon.
 */
import { OVERTIME } from '../core/enemies';
import { HOLD } from '../core/run';
import { COLORS } from '../present/layout';
import type { SpriteId } from '../render/spriteData';
import { drawText, textWidth, type TextOpts } from '../render/text';

export interface Keyword {
  word: string;
  /** Also matches these forms (plurals...). */
  forms?: string[];
  color: string;
  /** Its 12×12 icon (user-approved set, 2026-10-30): beside the word in the glossary and a card's detail box. */
  icon: SpriteId;
  text: string;
}

export const KEYWORDS: Keyword[] = [
  { word: 'PAYLINE', icon: 'kwPayline', color: '#fff6c0', text: 'THE MIDDLE ROW: ONLY IT PAYS' },
  { word: 'PAIR', icon: 'kwPair', forms: ['PAIRS'], color: COLORS.pair, text: 'REELS 1 AND 2 MATCH ON THE PAYLINE (A WILD COUNTS)' },
  { word: 'JACKPOT', icon: 'kwJackpot', forms: ['JACKPOTS'], color: '#ff6a4a', text: 'ALL 3 PAYLINE SYMBOLS MATCH: PAYS FAR MORE THAN A PAIR' },
  { word: 'WILD', icon: 'kwWild', forms: ['WILDS'], color: '#ff9ab0', text: 'STANDS IN FOR ANY SYMBOL' },
  { word: 'SHIELD', icon: 'kwShield', forms: ['SHIELDS'], color: '#6ab4ff', text: 'BLOCKS HITS BEFORE THEY REACH YOUR HP' },
  { word: 'PIERCE', icon: 'kwPierce', forms: ['PIERCES', 'PIERCING', 'PIERCES SHIELDS', 'PIERCE SHIELDS'], color: '#bff4ff', text: 'GOES PAST SHIELDS, STRAIGHT TO HP' },
  { word: 'HEAL', icon: 'kwHeal', forms: ['HEALS', 'HEALED', 'HEALING'], color: '#7dff7a', text: 'HP BACK, UP TO YOUR MAX HP' },
  { word: 'CHARM', icon: 'kwCharm', forms: ['CHARMS'], color: '#c9a0ff', text: 'A PERK ON ONE CELL OF A REEL' },
  { word: 'LEVEL', icon: 'kwLevel', forms: ['LEVELS', 'LV'], color: '#5ad8e8', text: 'A SYMBOL PAYS MORE PER LEVEL, ON EVERY CELL OF IT YOU OWN. NO CAP' },
  { word: 'METER', icon: 'kwMeter', color: '#ffd23f', text: "YOUR SLOT MACHINE'S BAR: IT FILLS AS YOU SPIN AND PAYS OFF WHEN FULL" },
  { word: 'BUST', icon: 'kwBust', forms: ['BUSTS'], color: '#ff8a7a', text: "THE DEALER'S CARD: YOUR BEST REEL'S PAYLINE PAYS NOTHING NEXT SPIN" },
  { word: 'ALL IN', icon: 'kwAllIn', color: '#ff6a5a', text: "THE DEALER'S BIG HIT: A SHARE OF YOUR MAX HP THAT PIERCES SHIELDS" },
  { word: 'HOLD', icon: 'kwHold', forms: ['HELD'], color: '#ffe28a', text: `TAP ONE OF YOUR REELS BEFORE YOUR SPIN OR WHILE THE ENEMY SPINS: IT KEEPS ITS SYMBOL FOR YOUR NEXT SPIN. ${HOLD.perFight} A FIGHT` },
  // (Test branch: BUILD-UP borrows the METER icon until it has its own.)
  { word: 'BUILD-UP', icon: 'kwMeter', color: '#ffd23a', text: 'EACH OF YOUR SPINS WITHOUT A PAIR ADDS +25% TO YOUR NEXT PAIR OR JACKPOT, UP TO X2. THAT PAIR OR JACKPOT CASHES IT IN' },
  { word: 'OVERTIME', icon: 'kwOvertime', color: '#ff9a3a', text: `FROM SPIN ${2 * OVERTIME.from - 1} OF A FIGHT, EVERY HIT ON BOTH MACHINES PAYS X${1 + OVERTIME.step}, +${OVERTIME.step} WITH EACH OF YOUR SPINS. SHIELDS DON'T GROW` },
  { word: 'SABOTAGE', icon: 'kwSabotage', forms: ['SABOTAGES'], color: '#d0a0ff', text: 'ANYTHING AN ENEMY PUTS ON YOUR REELS: SPILLS, ROCKS, IOUS, FREEZES, JAMS, JINXES, MARKS' },
  { word: 'MARK', icon: 'kwMark', forms: ['MARKS', 'MARKED'], color: '#ffb0ff', text: 'A MARKED CELL ON YOUR PAYLINE HITS YOU' },
  { word: 'SPILL', icon: 'kwSpill', forms: ['SPILLED', 'SPILLS'], color: COLORS.slime, text: 'A SPILLED CELL PAYS NOTHING. A SPILL PAIR MOPS UP ITS REELS. A JACKPOT MOPS IT ALL UP' },
  { word: 'ROCK', icon: 'kwRock', forms: ['ROCKS'], color: '#c9bba8', text: 'A DEAD CELL: IT PAYS NOTHING' },
  { word: 'IOU', icon: 'kwIou', forms: ['IOUS'], color: '#ff9a3a', text: 'TICKS DOWN, THEN HITS YOU. LAND IT ON YOUR PAYLINE TO PAY IT OFF' },
];

/** Every spelling, longest first (so PIERCES SHIELDS wins over SHIELDS). */
const FORMS = KEYWORDS.flatMap((k) => [k.word, ...(k.forms ?? [])].map((f) => ({ f, k }))).sort((a, b) => b.f.length - a.f.length);
const RE = new RegExp(`(?<![A-Z])(${FORMS.map((x) => x.f.replace(/ /g, '\\s')).join('|')})(?![A-Z])`, 'g');
const byForm = new Map(FORMS.map((x) => [x.f, x.k]));

/** The keywords a text uses, in order of first use. */
export function keywordsIn(text: string): Keyword[] {
  const out: Keyword[] = [];
  for (const m of text.toUpperCase().matchAll(RE)) {
    const k = byForm.get(m[1].replace(/\s/g, ' '));
    if (k && !out.includes(k)) out.push(k);
  }
  return out;
}

/** drawText, with every keyword in its colour (the rest in `color`). */
export function drawRich(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, scale: number, color: string, o: TextOpts = {}): void {
  const parts: { s: string; c: string }[] = [];
  let at = 0;
  for (const m of text.matchAll(RE)) {
    const k = byForm.get(m[1].replace(/\s/g, ' '));
    if (!k) continue;
    if (m.index! > at) parts.push({ s: text.slice(at, m.index), c: color });
    parts.push({ s: m[1], c: k.color });
    at = m.index! + m[1].length;
  }
  if (!parts.length) return drawText(ctx, text, x, y, scale, color, o);
  if (at < text.length) parts.push({ s: text.slice(at), c: color });
  // Each character advances one glyph cell, so a part starts where its prefix ends.
  const cell = textWidth('MM', scale) - textWidth('M', scale);
  const total = textWidth(text, scale);
  let x0 = o.align === 'left' ? x : o.align === 'right' ? x - total : x - total / 2;
  for (const p of parts) {
    drawText(ctx, p.s, x0, y, scale, p.c, { ...o, align: 'left' });
    x0 += p.s.length * cell;
  }
}

/** Small boxes listing keywords, stacked from (x, y): name in its colour, one line of meaning. Returns the height. */
export function drawKeywordBoxes(ctx: CanvasRenderingContext2D, keys: Keyword[], x: number, y: number, w: number): number {
  let yy = y;
  for (const k of keys) {
    const lines = wrapWords(k.text, Math.floor((w - 16) / (textWidth('MM', 1.5) - textWidth('M', 1.5))));
    const h = 26 + lines.length * 14;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 2, yy - 2, w + 4, h + 4);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, yy, w, h);
    drawText(ctx, k.word, x + 8, yy + 12, 2, k.color, { align: 'left' });
    lines.forEach((l, i) => drawText(ctx, l, x + 8, yy + 30 + i * 14, 1.5, COLORS.text, { align: 'left' }));
    yy += h + 6;
  }
  return yy - y;
}

function wrapWords(text: string, cols: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    if (line && (line + ' ' + w).length > cols) {
      out.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) out.push(line);
  return out;
}
