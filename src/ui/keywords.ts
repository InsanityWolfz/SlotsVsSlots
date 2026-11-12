/**
 * KEYWORDS (user, 2026-10-12; HOLD and OVERTIME 2026-10-29): the same word for the same thing on every card, each in its own colour. drawRich colours
 * them wherever they appear; the GLOSSARY (pause menu) lists them by page; a card shows the keywords it uses beside it, each
 * with its icon. The term sheet (user, 2026-11-12) is the rule for every line here: whole sentences, one word for one
 * thing, and each machine's PAYOFF under its own name.
 */
import { CABINET_ORDER, CABINETS } from '../core/cabinets';
import { CHARM_COLOR } from '../core/charms';
import { OVERTIME, TUNE } from '../core/enemies';
import { BUILD_UP, MARK_DAMAGE, MIDAS, RAIN, RAKE_CUT, VOLUME } from '../core/fightRules';
import { HOLD } from '../core/fightSetup';
import { CONTENT_1107 } from '../core/relics';
import { COLORS } from '../present/layout';
import type { SpriteId } from '../render/spriteData';
import { drawText, textWidth, type TextOpts } from '../render/text';
import { T } from './kit';
import { CHARM_INFO, CHARM_ORDER, charmArt } from './menu/data';

/** The GLOSSARY's pages, in order (the pause menu's tabs). */
export const GLOSSARY_TABS = ['THE BASICS', 'METERS', 'CHARMS', 'ENEMIES'] as const;
export type GlossaryTab = (typeof GLOSSARY_TABS)[number];

export interface Keyword {
  word: string;
  /** Also matches these forms (plurals...). */
  forms?: string[];
  color: string;
  /** Its icon (the user-approved 12×12 set, 2026-10-30; a new word borrows the closest one): beside the word in the
   * glossary and a card's detail box. */
  icon: SpriteId;
  text: string;
  /** Its GLOSSARY page. */
  tab: GlossaryTab;
  /** A plain word (SPIN, PAY, CHIPS, a Charm's name): the GLOSSARY explains it, but cards never colour it or box it. */
  quiet?: boolean;
}

/** What a meter payoff heals (ONE HEAL RULE, user 2026-11-01: the same on every meter machine; tests hold them to it). */
const PAYOFF_HEAL = Math.max(0, ...CABINET_ORDER.map((id) => (CABINETS[id].meter?.kind === 'vault' ? CABINETS[id].meter!.heal : 0)));
/** The chips that take HIGH ROLLER to its top multiplier. */
const ROLLER_TOP = (MIDAS.maxMul - 1) * MIDAS.chipsPerMul;

export const KEYWORDS: Keyword[] = [
  // ---- THE BASICS ----
  { word: 'SPIN', quiet: true, tab: 'THE BASICS', icon: 'kwPayline', color: '#fff6c0', text: "ONE PULL OF A SLOT MACHINE'S REELS. YOU SPIN AND THEN THE ENEMY SPINS. THE SPIN COUNTER COUNTS BOTH" },
  { word: 'PAYLINE', tab: 'THE BASICS', icon: 'kwPayline', color: '#fff6c0', text: 'THE MIDDLE ROW OF THE REELS. SYMBOLS PAY WHEN THEY LAND ON IT' },
  // (PAY and SPIN borrow the PAYLINE icon.)
  { word: 'PAY', quiet: true, tab: 'THE BASICS', icon: 'kwPayline', color: '#fff6c0', text: 'WHAT A SYMBOL GIVES ON THE PAYLINE. A SWORD PAYS A HIT AND A SHIELD PAYS SHIELD' },
  { word: 'PAIR', tab: 'THE BASICS', icon: 'kwPair', forms: ['PAIRS'], color: COLORS.pair, text: 'REELS 1 AND 2 MATCH ON THE PAYLINE. A PAIR PAYS X2. A WILD COUNTS AS A MATCH' },
  { word: 'JACKPOT', tab: 'THE BASICS', icon: 'kwJackpot', forms: ['JACKPOTS'], color: '#ff6a4a', text: 'ALL 3 PAYLINE SYMBOLS MATCH. A JACKPOT PAYS X3' },
  { word: 'WILD', tab: 'THE BASICS', icon: 'kwWild', forms: ['WILDS'], color: '#ff9ab0', text: 'A WILD STANDS IN FOR ANY SYMBOL' },
  // (ATTACK SYMBOL borrows the PAIR icon.)
  { word: 'ATTACK SYMBOL', tab: 'THE BASICS', icon: 'kwPair', forms: ['ATTACK SYMBOLS'], color: '#ff8a9a', text: 'THE SYMBOL YOUR SLOT MACHINE HITS WITH. KNIGHT HAS SWORDS, TESLA BOLTS, JUKEBOX NOTES, JOKER CARDS AND BANKROLL CHIP SYMBOLS' },
  { word: 'SHIELD', tab: 'THE BASICS', icon: 'kwShield', forms: ['SHIELDS'], color: '#6ab4ff', text: 'SHIELD BLOCKS HITS BEFORE THEY REACH HP. WHAT IS LEFT IS GONE WHEN YOU SPIN AGAIN' },
  { word: 'PIERCE', tab: 'THE BASICS', icon: 'kwPierce', forms: ['PIERCES', 'PIERCING', 'PIERCES SHIELDS', 'PIERCE SHIELDS'], color: '#bff4ff', text: 'A HIT THAT PIERCES SKIPS SHIELDS AND GOES STRAIGHT TO HP' },
  { word: 'HEAL', tab: 'THE BASICS', icon: 'kwHeal', forms: ['HEALS', 'HEALED', 'HEALING'], color: '#7dff7a', text: 'A HEAL GIVES HP BACK. IT STOPS AT YOUR MAX HP' },
  { word: 'LEVEL', tab: 'THE BASICS', icon: 'kwLevel', forms: ['LEVELS', 'LV'], color: '#5ad8e8', text: 'A SYMBOL PAYS MORE PER LEVEL' },
  { word: 'HOLD', tab: 'THE BASICS', icon: 'kwHold', forms: ['HELD'], color: '#ffe28a', text: `PICK A REEL AFTER YOUR SPIN. IT KEEPS ITS SYMBOL FOR YOUR NEXT SPIN. EACH HELD REEL USES 1 HOLD. YOU GET ${HOLD.perFight} HOLDS EACH FIGHT AND ${HOLD.perFight + CONTENT_1107.steadyHolds} WITH STEADY HANDS` },
  // (BUILD-UP borrows the METER icon until it has its own.)
  { word: 'BUILD-UP', tab: 'THE BASICS', icon: 'kwMeter', color: '#ffd23a', text: `YOUR NEXT ATTACK PAIR OR JACKPOT PAYS ${Math.round(BUILD_UP.step * 100)}% MORE FOR EACH SPIN WITHOUT ONE, UP TO X${BUILD_UP.cap}` },
  { word: 'OVERTIME', tab: 'THE BASICS', icon: 'kwOvertime', color: '#ff9a3a', text: `FROM SPIN ${2 * OVERTIME.from - 1} OF EACH FIGHT BOTH MACHINES' REELS HIT X${1 + OVERTIME.step}. IT GROWS BY ${OVERTIME.step} EACH TIME YOU SPIN. ABILITIES AND SHIELDS DON'T GROW` },
  // (ELITE wears its own map badge.)
  { word: 'ELITE', tab: 'THE BASICS', icon: 'mapBadgeElite', forms: ['ELITES'], color: '#ffb060', text: 'A TOUGHER ENEMY WITH MORE HP AND HARDER HITS. BEAT ONE TO PICK A RELIC AND WIN MORE CHIPS' },
  // (CHIPS shows the chip itself.)
  { word: 'CHIPS', quiet: true, tab: 'THE BASICS', icon: 'chip', color: '#ffd23f', text: 'CHIPS ARE MONEY. YOU WIN THEM IN FIGHTS AND SPEND THEM AT THE CASHIER AND AT TABLE GAMES' },

  // ---- METERS: the bar, what a full one does, and each machine's own name for it ----
  { word: 'METER', tab: 'METERS', icon: 'kwMeter', color: '#ffd23f', text: 'THE BAR ON EVERY SLOT MACHINE BUT KNIGHT. YOUR SPINS FILL IT AND A FULL METER GIVES ITS PAYOFF' },
  // (PAYOFF and the machines' payoffs borrow the METER icon; ALL JACKPOTS borrows JACKPOT's and MAKE IT RAIN the chip.)
  { word: 'PAYOFF', tab: 'METERS', icon: 'kwMeter', forms: ['PAYOFFS'], color: '#ffd23f', text: `WHAT A FULL METER DOES. TESLA HAS LIGHTNING STORM, JUKEBOX HAS THE DROP, JOKER HAS ALL JACKPOTS AND BANKROLL HAS HIGH ROLLER. EACH PAYOFF HEALS ${PAYOFF_HEAL}` },
  { word: 'LIGHTNING STORM', tab: 'METERS', icon: 'kwMeter', forms: ['LIGHTNING STORMS', 'STORM', 'STORMS'], color: COLORS.energy, text: `TESLA'S PAYOFF. BOLTS CHARGE THE LIGHTNING. EACH FULL CHARGE FIRES A STRIKE THAT PIERCES SHIELDS. THE STORM HEALS ${PAYOFF_HEAL}` },
  // (VOLUME borrows the METER icon. MIXTAPE confused new players who hadn't seen the bar: playtest 2026-11-03.)
  { word: 'VOLUME', tab: 'METERS', icon: 'kwMeter', color: '#ff9ad8', text: `THE JUKEBOX'S METER. EACH NOTE ON YOUR PAYLINE ADDS 1 AND A SPIN WITH NO NOTE TAKES ${VOLUME.skip} AWAY. EACH LEVEL MAKES NOTES HIT HARDER. AT ${VOLUME.max} YOUR NEXT SPIN IS THE DROP` },
  { word: 'THE DROP', tab: 'METERS', icon: 'kwMeter', color: '#5ad8e8', text: `THE JUKEBOX'S PAYOFF AT VOLUME ${VOLUME.max}. EVERY NOTE ON SCREEN HITS AND YOU HEAL ${PAYOFF_HEAL}. THEN THE VOLUME FALLS TO ${VOLUME.after}` },
  { word: 'ALL JACKPOTS', tab: 'METERS', icon: 'kwJackpot', color: '#ff6ad5', text: `JOKER'S PAYOFF. EACH WILD ON YOUR PAYLINE FILLS HALF THE METER. A FULL METER MAKES ALL 3 PAYLINE SYMBOLS PAY JACKPOTS ON YOUR NEXT SPIN AND HEALS ${PAYOFF_HEAL}` },
  { word: 'HIGH ROLLER', tab: 'METERS', icon: 'kwMeter', color: '#7dff7a', text: `BANKROLL'S METER AND ITS PAYOFF. CHIPS FILL IT. A FULL METER MULTIPLIES YOUR NEXT HIT AND HEALS ${PAYOFF_HEAL}. THE MORE CHIPS YOU HOLD THE BIGGER THE HIT, UP TO X${MIDAS.maxMul} AT ${ROLLER_TOP} CHIPS` },
  { word: 'MAKE IT RAIN', tab: 'METERS', icon: 'chip', color: '#7dff7a', text: `BANKROLL'S CHIP SYMBOL JACKPOT WHILE YOU HOLD ${RAIN.cost} CHIPS OR MORE. IT COSTS ${RAIN.cost} CHIPS AND HITS FOR ${RAIN.perChip} FOR EACH CHIP YOU HOLD, UP TO ${RAIN.maxChips} CHIPS. IF THE JACKPOT ALONE HITS AS HARD YOU KEEP YOUR CHIPS` },

  // ---- CHARMS: the word, then each Charm from its own rule (the COLLECTION's words, so the two can't drift) ----
  { word: 'CHARM', tab: 'CHARMS', icon: 'kwCharm', forms: ['CHARMS'], color: '#c9a0ff', text: 'A PERK ON ONE SYMBOL ON A REEL' },
  ...CHARM_ORDER.map((e): Keyword => ({ word: CHARM_INFO[e].name, quiet: true, tab: 'CHARMS', icon: charmArt(e)[1], color: CHARM_COLOR[e], text: CHARM_INFO[e].text.replace(/\.$/, '') })),

  // ---- ENEMIES: what they do to you, and the words on their cards ----
  // (ABILITY borrows the SABOTAGE icon: a SABOTAGE is one kind of ABILITY.)
  { word: 'ABILITY', tab: 'ENEMIES', icon: 'kwSabotage', forms: ['ABILITIES'], color: '#ffb060', text: "AN ENEMY'S SPECIAL MOVE. ITS ICON UNDER THEIR HP BAR CHARGES AS THEY SPIN. THE CARD BEFORE EACH FIGHT SAYS WHAT IT DOES" },
  { word: 'SABOTAGE', tab: 'ENEMIES', icon: 'kwSabotage', forms: ['SABOTAGES'], color: '#d0a0ff', text: 'AN ENEMY ABILITY THAT CHANGES YOUR REELS, YOUR SYMBOLS OR YOUR CHARMS' },
  { word: 'SPILL', tab: 'ENEMIES', icon: 'kwSpill', forms: ['SPILLED', 'SPILLS'], color: COLORS.slime, text: 'A SPILLED SYMBOL PAYS NOTHING. NEVER MORE THAN A THIRD OF YOUR SYMBOLS AT ONCE. A SPILL PAIR MOPS UP ITS REELS, A SPILL JACKPOT MOPS UP THEM ALL' },
  // (Card text pass, 2026-11-03: the enemies' own words, so their cards can explain them.)
  { word: 'STEAL', tab: 'ENEMIES', icon: 'kwSteal', forms: ['STEALS', 'STOLEN'], color: '#c9a0ff', text: 'A STOLEN SYMBOL LEAVES AN EMPTY SPOT THAT PAYS NOTHING TILL THE FIGHT ENDS. 3 EMPTIES ON YOUR PAYLINE GET THEM ALL BACK' },
  { word: 'ROCK', tab: 'ENEMIES', icon: 'kwRock', forms: ['ROCKS'], color: '#c9bba8', text: 'A DEAD SYMBOL: IT PAYS NOTHING' },
  { word: 'IOU', tab: 'ENEMIES', icon: 'kwIou', forms: ['IOUS'], color: '#ff9a3a', text: 'AN IOU TICKS DOWN EACH TIME YOU SPIN AND THEN HITS YOU. LAND IT ON YOUR PAYLINE TO PAY IT OFF' },
  { word: 'FREEZE', tab: 'ENEMIES', icon: 'kwFrozen', forms: ['FREEZES', 'FROZEN'], color: '#9fe8ff', text: "A FROZEN REEL DOESN'T SPIN. AS IT FREEZES IT CAN SLIP ONE SPOT, TO THE WORSE SYMBOL" },
  // (JAM has no icon of its own: it borrows FROZEN's, the other reel that won't play.)
  { word: 'JAM', tab: 'ENEMIES', icon: 'kwFrozen', forms: ['JAMS', 'JAMMED'], color: '#c9bba8', text: 'A JAMMED REEL PAYS NOTHING ON THE PAYLINE' },
  { word: 'JINX', tab: 'ENEMIES', icon: 'kwJinx', forms: ['JINXES', 'JINXED'], color: '#c9a0ff', text: 'ANY PAY THAT USES A JINXED REEL IS HALVED' },
  { word: 'MARK', tab: 'ENEMIES', icon: 'kwMark', forms: ['MARKS', 'MARKED'], color: '#ffb0ff', text: `A MARKED SYMBOL ON YOUR PAYLINE HITS YOU FOR ${MARK_DAMAGE}` },
  // (RAKE has no icon of its own: it borrows SABOTAGE's.)
  { word: 'RAKE', tab: 'ENEMIES', icon: 'kwSabotage', forms: ['RAKES', 'RAKED'], color: '#ffd23f', text: `WHILE YOU ARE RAKED EVERY PAY IS ${RAKE_CUT} LESS` },
  // (COVER CHARGE borrows the PIERCE icon: it goes past your shield.)
  { word: 'COVER CHARGE', tab: 'ENEMIES', icon: 'kwPierce', color: '#ff8a7a', text: `FROM ACT 3 EVERY ENEMY BUT A BOSS HAS ONE. THEIR FIRST HIT EACH FIGHT PIERCES YOUR SHIELD FOR UP TO ${Math.round(TUNE.coverCharge * 100)}% OF YOUR MAX HP` },
  { word: 'BUST', tab: 'ENEMIES', icon: 'kwBust', forms: ['BUSTS'], color: '#ff8a7a', text: "THE DEALER'S CARD LANDS ON YOUR BEST REEL, THE ONE WORTH THE MOST. THAT REEL PAYS NOTHING ON YOUR NEXT SPIN" },
  { word: 'ALL IN', tab: 'ENEMIES', icon: 'kwAllIn', color: '#ff6a5a', text: "THE DEALER'S BIG HIT. IT TAKES A SHARE OF YOUR MAX HP AND PIERCES SHIELDS" },
];

/** One GLOSSARY page's entries, in the order they're listed. */
export const glossaryPage = (tab: GlossaryTab): Keyword[] => KEYWORDS.filter((k) => k.tab === tab);

/** Every spelling a card can use, longest first (so PIERCES SHIELDS wins over SHIELDS, LIGHTNING STORM over STORM). */
const FORMS = KEYWORDS.filter((k) => !k.quiet)
  .flatMap((k) => [k.word, ...(k.forms ?? [])].map((f) => ({ f, k })))
  .sort((a, b) => b.f.length - a.f.length);
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
