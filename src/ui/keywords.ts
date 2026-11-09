/**
 * KEYWORDS (user, 2026-10-12; HOLD and OVERTIME 2026-10-29): the same word for the same thing on every card, each in its own colour. drawRich colours
 * them wherever they appear; the GLOSSARY page (pause menu) lists them; a card shows the keywords it uses beside it, each
 * with its icon.
 */
import { OVERTIME } from '../core/enemies';
import { HOLD } from '../core/fightSetup';
import { CONTENT_1107 } from '../core/relics';
import { COLORS } from '../present/layout';
import type { SpriteId } from '../render/spriteData';
import { drawText, textWidth, type TextOpts } from '../render/text';
import { T } from './kit';

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
  // (VOLUME borrows the METER icon. MIXTAPE confused new players who hadn't seen the bar: playtest 2026-11-03.)
  { word: 'VOLUME', icon: 'kwMeter', color: '#ff9ad8', text: "THE JUKEBOX'S BAR: EACH NOTE ON YOUR PAYLINE ADDS 1, A SPIN WITH NO NOTE LOSES 2. AT 6, THE DROP: EVERY NOTE ON SCREEN HITS" },
  { word: 'METER', icon: 'kwMeter', color: '#ffd23f', text: "YOUR SLOT MACHINE'S BAR: IT FILLS AS YOU SPIN AND PAYS OFF WHEN FULL" },
  { word: 'BUST', icon: 'kwBust', forms: ['BUSTS'], color: '#ff8a7a', text: "THE DEALER'S CARD: YOUR BEST REEL'S PAYLINE PAYS NOTHING NEXT SPIN" },
  { word: 'ALL IN', icon: 'kwAllIn', color: '#ff6a5a', text: "THE DEALER'S BIG HIT: A SHARE OF YOUR MAX HP THAT PIERCES SHIELDS" },
  { word: 'HOLD', icon: 'kwHold', forms: ['HELD'], color: '#ffe28a', text: `PICK ONE OF YOUR REELS BEFORE YOUR SPIN OR WHILE THE ENEMY SPINS: IT KEEPS ITS SYMBOL FOR YOUR NEXT SPIN. ${HOLD.perFight} A FIGHT (${HOLD.perFight + CONTENT_1107.steadyHolds} WITH STEADY HANDS)` },
  // (BUILD-UP borrows the METER icon until it has its own.)
  { word: 'BUILD-UP', icon: 'kwMeter', color: '#ffd23a', text: 'EACH SPIN WITHOUT A PAIR OR JACKPOT OF YOUR ATTACK SYMBOL (SWORD, CHIP, BOLT, CARD OR NOTE) ADDS +25% TO YOUR NEXT ONE, UP TO X2' },
  { word: 'OVERTIME', icon: 'kwOvertime', color: '#ff9a3a', text: `FROM SPIN ${2 * OVERTIME.from - 1} OF A FIGHT, EVERY HIT FROM THE REELS ON BOTH MACHINES PAYS X${1 + OVERTIME.step}, +${OVERTIME.step} WITH EACH OF YOUR SPINS. ABILITIES AND SHIELDS DON'T GROW` },
  { word: 'SABOTAGE', icon: 'kwSabotage', forms: ['SABOTAGES'], color: '#d0a0ff', text: 'ANYTHING AN ENEMY DOES TO YOUR REELS: SPILLS, STEALS, ROCKS, IOUS, FREEZES, JAMS, JINXES, MARKS, FAKES, CONFISCATIONS' },
  { word: 'MARK', icon: 'kwMark', forms: ['MARKS', 'MARKED'], color: '#ffb0ff', text: 'A MARKED SYMBOL ON YOUR PAYLINE HITS YOU FOR 20' },
  // (Card text pass, 2026-11-03: the enemies' own words, so their cards can explain them.)
  { word: 'STEAL', icon: 'kwSteal', forms: ['STEALS', 'STOLEN'], color: '#c9a0ff', text: 'A STOLEN SYMBOL LEAVES AN EMPTY CELL THAT PAYS NOTHING TILL THE FIGHT ENDS. 3 EMPTIES ON YOUR PAYLINE GET THEM ALL BACK' },
  { word: 'FREEZE', icon: 'kwFrozen', forms: ['FREEZES', 'FROZEN'], color: '#9fe8ff', text: "A FROZEN REEL DOESN'T SPIN. AS IT FREEZES IT CAN SLIP ONE CELL, TO THE WORSE SYMBOL" },
  // (JAM has no icon of its own: it borrows FROZEN's, the other reel that won't play.)
  { word: 'JAM', icon: 'kwFrozen', forms: ['JAMS', 'JAMMED'], color: '#c9bba8', text: 'A JAMMED REEL PAYS NOTHING ON THE PAYLINE' },
  { word: 'JINX', icon: 'kwJinx', forms: ['JINXES', 'JINXED'], color: '#c9a0ff', text: 'ANY PAY THAT USES A JINXED REEL IS HALVED' },
  // (RAKE has no icon of its own: it borrows SABOTAGE's.)
  { word: 'RAKE', icon: 'kwSabotage', forms: ['RAKES', 'RAKED'], color: '#ffd23f', text: 'WHILE RAKED, EACH OF YOUR PAYS IS 10 LESS' },
  { word: 'SPILL', icon: 'kwSpill', forms: ['SPILLED', 'SPILLS'], color: COLORS.slime, text: 'A SPILLED CELL PAYS NOTHING. NEVER MORE THAN A THIRD OF YOUR SYMBOLS AT ONCE. A SPILL PAIR MOPS UP ITS REELS, A SPILL JACKPOT MOPS UP THEM ALL' },
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
    const lines = wrapWords(k.text, Math.floor((w - 16) / (textWidth('MM', T.small) - textWidth('M', T.small))));
    const h = 26 + lines.length * 15;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 2, yy - 2, w + 4, h + 4);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, yy, w, h);
    drawText(ctx, k.word, x + 8, yy + 12, 2, k.color, { align: 'left' });
    lines.forEach((l, i) => drawText(ctx, l, x + 8, yy + 30 + i * 15, T.small, COLORS.text, { align: 'left' }));
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
