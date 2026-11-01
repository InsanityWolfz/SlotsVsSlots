import { symLabel, UNIT } from '../../core/config';
import { LEGENDARY, RELICS } from '../../core/relics';
import { CHARM_COLOR, symLevel } from '../../core/charms';
import { endlessScore, type DraftOption, type FightRecord, type RunState, levelStep } from '../../core/run';
import type { RelicId } from '../../core/config';
import { LOOP_GROWTH } from '../../core/enemies';
import { VOLUME } from '../../core/fight';
import { backOut } from '../../present/ease';
import { ENH_SPRITE } from '../../present/reel';
import { COLORS, H, W } from '../../present/layout';
import { artId, drawSprite, hasSprite, spriteSize, type SpriteId } from '../../render/sprites';
import { drawText, fmtNum, textWidth } from '../../render/text';
import { drawRich, keywordsIn, type Keyword } from '../keywords';
import { CountUp, drawBanner, drawCard, drawChip, drawPanel, KIT, T } from '../kit';
import { wrap, Hit, CX, rounds } from './shared';
import { cardFace, rarityOf } from './cardText';
import { NextScreen } from './enemyCard';

/** A draft card: its size (three fit beside YOUR BUILD) and the deal's row. */
const CARD = { w: 290, h: 226, gap: 314, y: 428 };

export abstract class DraftScreen extends NextScreen {
  /** When each draft card finished dealing in (seconds): its one-time shine runs from then. */
  protected dealtAt: number[] = [];
  /** THE result title: when it landed (seconds) and its chips counting up under it. */
  protected resultAt = 0;
  protected resultChips = new CountUp(0, 0.8);
  /** The draft's name size (one for every card). */
  protected titleSize: number = T.head;

  showSpoils(run: RunState, relics: RelicId[], last: FightRecord | null): void {
    this.showDraft(run, relics.map((relic) => ({ kind: 'relic', relic }) as DraftOption), last, 'spoils');
  }

  /** An act's boss fell: pick 1 of 3 legendary relics. */
  showLegend(run: RunState, relics: RelicId[], last: FightRecord | null): void {
    this.showDraft(run, relics.map((relic) => ({ kind: 'relic', relic }) as DraftOption), last, 'legend');
    this.sounds.fanfareJackpot();
  }

  showDraft(run: RunState, offers: DraftOption[], last: FightRecord | null, kind: 'draft' | 'spoils' | 'legend' | 'start' = 'draft'): void {
    this.draftKind = kind;
    this.run = run;
    this.offers = offers;
    this.lastRecord = last;
    this.open('draft');
    this.startResult(last?.chips ?? 0);
    const n = offers.length;
    // Four cards use the whole width beside the build panel.
    const gap = n > 3 ? 238 : CARD.gap;
    const w = n > 3 ? 222 : CARD.w;
    this.dealtAt = offers.map(() => -1);
    this.cards = offers.map((o, i) =>
      this.hit(CX + (i - (n - 1) / 2) * gap, CARD.y, w, CARD.h, () => {
        if (this.picked >= 0) return;
        this.picked = i;
        this.sounds.stingerMedium();
        const card = this.cards[i];
        void this.ui
          .tween({ from: 1.04, to: 1.1, dur: 0.15, ease: backOut(2), onUpdate: (v) => (card.scale = v) })
          .then(() => this.ui.wait(0.35))
          .then(() =>
            kind === 'legend' && o.kind === 'relic' ? this.cb.onLegend(o.relic) : (kind === 'spoils' || kind === 'start') && o.kind === 'relic' ? this.cb.onSpoils(o.relic) : this.cb.onPick(o),
          );
      }),
    );
    // Deal the cards in; each shines once as it lands (the director: "I bet the shine would look good").
    this.cards.forEach(
      (c, i) =>
        void this.ui
          .wait(0.18 + i * 0.1)
          .then(() => {
            this.sounds.click();
            return this.ui.tween({ from: 0, to: 1, dur: 0.26, ease: backOut(2), onUpdate: (v) => (c.scale = v) });
          })
          .then(() => (this.dealtAt[i] = performance.now() / 1000)),
    );
  }

  /** A result title lands now; `chips` count up under it. */
  protected startResult(chips: number): void {
    this.resultAt = performance.now() / 1000;
    this.resultChips = new CountUp(0, 0.8);
    if (chips) void this.ui.wait(0.25).then(() => this.resultChips.set(chips));
  }

  /**
   * THE result title (every result: DEFEATED!, BOSS DOWN!, RUN OVER, a loop cleared): a ribbon banner that punches in,
   * with what it paid counting up under it. Returns the y under it.
   */
  protected drawResultTitle(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, o: { color?: string; frame?: string; chips?: number; sub?: string } = {}): number {
    const t = performance.now() / 1000 - this.resultAt;
    const k = Math.min(1, t / 0.22);
    const punch = this.reduceMotion ? 1 : 1 + 0.25 * (1 - k) * (1 - k);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(punch, punch);
    const fits = textWidth(label, T.title) + 60 <= W - 330;
    drawBanner(ctx, label, 0, 0, { scale: fits ? T.title : T.head, color: o.color, frame: o.frame, alpha: k });
    ctx.restore();
    let yy = y + 44;
    this.resultChips.update(1 / 60);
    if (o.chips) {
      const s = `+${this.resultChips.shown} CHIPS`;
      const wv = textWidth(s, T.head) + 36;
      drawSprite(ctx, 'chip', x - wv / 2 + 12, yy + 6, 2.5, { alpha: Math.min(1, t / 0.4) });
      drawText(ctx, s, x - wv / 2 + 34, yy + 6, T.head, COLORS.energy, { align: 'left', alpha: Math.min(1, t / 0.4) });
      yy += 30;
    }
    if (o.sub) {
      drawText(ctx, o.sub, x, yy + 6, T.small, KIT.dim, { alpha: Math.min(1, t / 0.5) });
      yy += 20;
    }
    return yy;
  }

  protected drawDraft(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    const last = this.lastRecord;
    const start = this.draftKind === 'start';
    const spoils = this.draftKind === 'spoils';
    const legend = this.draftKind === 'legend';
    // ENDLESS: the pick after a loop's boss is the new loop's: say the loop was cleared.
    const loopDone = !!last && !!run.endless && last.loop !== undefined && last.loop < run.endless.loop;
    if (last) {
      const rocks = last.rocksCrumbled ? `  -  ${last.rocksCrumbled} ROCKS CRUMBLED` : '';
      // VETERAN (KNIGHT), OVERLOAD (TESLA) and WARM-UP (JUKEBOX) grow with each loop cleared: say so where the loop ends.
      const L = run.endless?.loop ?? 0;
      const grow = !loopDone ? '' : run.cabinet === 'knight' ? `  -  VETERAN: SWORDS AND SHIELDS X${1 + LOOP_GROWTH.veteran * (L - 1)}` : run.cabinet === 'tesla' ? `  -  OVERLOAD: BOLTS, SHIELDS AND STORM HEALS X${1 + LOOP_GROWTH.overload * (L - 1)}` : run.cabinet === 'jukebox' ? `  -  WARM-UP: FIGHTS START AT VOLUME ${Math.min(VOLUME.max - 1, LOOP_GROWTH.warmUp * L)}` : '';
      const title = loopDone ? `LOOP ${last.loop} CLEARED!` : last.boss ? 'BOSS DOWN!' : `${last.enemy} DEFEATED!`;
      const sub = `${loopDone ? `SCORE ${fmtNum(endlessScore(run))}  -  ` : last.boss ? `${last.enemy}  -  ` : ''}${rounds(last.turns)}${rocks}${grow}`;
      this.drawResultTitle(ctx, title, CX, 40, { chips: last.chips, sub, color: last.boss ? '#ffd23f' : undefined });
      // A boss pays a level to your attack symbol: say so, as a chip.
      if (last.bossLevel) drawChip(ctx, `${symLabel(last.bossLevel)}S LEVEL UP: LV${symLevel(run.player.levels, last.bossLevel)}`, CX + 330, 84, { scale: T.small, color: '#5ad8e8' });
    } else drawBanner(ctx, start ? 'A NEW RUN' : 'CHOOSE A REWARD', CX, 40, { scale: T.title });
    this.drawMap(ctx, 186, time);
    const act3Arrival = !legend && !spoils && run.act >= 3 && run.depth === 0 && run.actIntro;
    // The boss's heal says what it gave (feel playtest: FULLY HEALED read as nothing at 94%).
    const healedBy = last?.won ? Math.max(0, run.player.maxHp - last.hpAfter) : 0;
    const healed = healedBy >= UNIT ? `HEALED +${fmtNum(healedBy)} HP.` : 'FULL HP.';
    const allLegend = this.offers.every((o) => o.kind === 'relic' && LEGENDARY.has(o.relic));
    const heading = act3Arrival
      ? `ACT 3: THE HOUSE HAS A PARTNER. ${healed}`
      : legend
        ? run.endless ? `LOOP ${run.endless.loop}: ${allLegend ? 'A LEGENDARY RELIC' : 'PICK A RELIC'}` : `${last?.boss ? `ACT ${run.act}: ${healed}` : 'PUNCH CARD:'} ${allLegend ? 'A LEGENDARY RELIC.' : 'PICK A RELIC.'}`
        : start
          ? 'PICK A STARTING RELIC'
          : spoils
            ? 'ELITE SPOILS: PICK A RELIC'
            : 'PICK ONE';
    const hSize = textWidth(heading, T.head) <= W - 340 ? T.head : T.body;
    // The act plaque sits clear of the heading at the size it's drawn (it overlapped its first letters: playtest).
    if (act3Arrival && hasSprite('actPlaque3')) drawSprite(ctx, artId('actPlaque3'), CX - textWidth(heading, hSize) / 2 - (spriteSize(artId('actPlaque3')).w * 3) / 2 - 14, 268, 3);
    drawText(ctx, heading, CX, 268, hSize, legend ? KIT.title : spoils ? '#ff9a3a' : KIT.text);
    // One name size for the whole deal: the heading size when every name fits its card.
    this.titleSize = this.cards.every((c, i) => textWidth(cardFace(this.offers[i], run).title, T.head) <= c.w - 24) ? T.head : T.body;
    this.cards.forEach((c, i) => this.drawDraftCard(ctx, c, this.offers[i], i, time));
    // The hovered or focused card: its full rule and its keywords, under it.
    const hov = this.picked < 0 ? this.cards.findIndex((c) => c.hover && c.scale > 0.9) : -1;
    if (hov >= 0) this.drawCardDetail(ctx, this.cards[hov], this.offers[hov]);
  }

  /** A draft card: the kit card (rarity frame, lift, one shine), a big icon, the name, two lines at body size. */
  protected drawDraftCard(ctx: CanvasRenderingContext2D, c: Hit, o: DraftOption, i: number, _time: number): void {
    if (c.scale <= 0.01) return;
    const dimmed = this.picked >= 0 && this.picked !== i;
    const { title, text } = cardFace(o, this.run ?? undefined);
    const lift = this.picked >= 0 ? (this.picked === i ? 1 : 0) : Math.max(0, Math.min(1, -c.lift / 10));
    const now = performance.now() / 1000;
    const shineT = this.dealtAt[i] >= 0 ? now - this.dealtAt[i] : undefined;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(c.scale, c.scale);
    ctx.translate(-c.x, -c.y);
    const x0 = c.x - c.w / 2;
    const y0 = drawCard(ctx, x0, c.y - c.h / 2, c.w, c.h, { rarity: rarityOf(o), lift, shineT, dim: dimmed });
    if (!dimmed) {
      this.drawOptionFace(ctx, o, c.x, y0, c.w);
      drawText(ctx, title, c.x, y0 + 134, this.titleSize, this.optionColor(o));
      const cols = Math.floor((c.w - 24) / (6 * T.body));
      wrap(text, cols)
        .slice(0, 2)
        .forEach((line, k) => drawRich(ctx, line, c.x, y0 + 170 + k * 26, T.body, KIT.text));
    }
    ctx.restore();
  }

  /** The card's top: its big icon on a lit well, its reel (reel cards), its tier (relics). */
  protected drawOptionFace(ctx: CanvasRenderingContext2D, o: DraftOption, cx: number, y0: number, w: number): void {
    const iy = y0 + 66;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(cx - w / 2 + 3, y0 + 3, w - 6, 104);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(cx - w / 2 + 3, y0 + 105, w - 6, 2);
    this.optionIcon(ctx, o, cx, iy, 4);
    if ('reel' in o && typeof o.reel === 'number') drawChip(ctx, `REEL ${o.reel + 1}`, cx - w / 2 + 52, y0 + 22, { scale: T.small, color: KIT.dim });
    if (o.kind === 'relic') {
      const tier = rarityOf(o);
      drawSprite(ctx, artId(tier === 'legendary' ? 'tierLegendary' : tier === 'uncommon' ? 'tierUncommon' : 'tierCommon'), cx + w / 2 - 24, y0 + 22, 2);
    }
  }

  /** An option's colour: its name on a card or a shelf. */
  protected optionColor(o: DraftOption): string {
    return o.kind === 'gild' || o.kind === 'charmLevel'
      ? CHARM_COLOR[o.enh]
      : o.kind === 'symLevel'
        ? '#5ad8e8'
        : o.kind === 'relic'
          ? LEGENDARY.has(o.relic) ? '#ff9ad8' : '#d8b8ff'
          : o.kind === 'clear'
            ? '#c9bba8'
            : o.kind === 'swap' || o.kind === 'add'
              ? '#7dff7a'
              : o.kind === 'remove'
                ? '#ff9ab0'
                : '#ff8a9a';
  }

  /** An option's icon at scale `k` (4: a card; the Cashier's shelf uses it too). */
  protected optionIcon(ctx: CanvasRenderingContext2D, o: DraftOption, x: number, y: number, k: number): void {
    const d = k / 4;
    if (o.kind === 'relic') drawSprite(ctx, RELICS[o.relic].sprite as SpriteId, x, y, k);
    else if (o.kind === 'swap') {
      drawSprite(ctx, o.from as SpriteId, x - 44 * d, y, 3 * d);
      drawSprite(ctx, 'arrowRight', x, y, 3 * d);
      drawSprite(ctx, o.to as SpriteId, x + 44 * d, y, 3 * d);
    } else if (o.kind === 'clear') {
      drawSprite(ctx, 'cardClear', x - 18 * d, y, 3 * d);
      drawSprite(ctx, 'rock', x + 30 * d, y + 10 * d, 2 * d);
    } else if (o.kind === 'add') {
      drawSprite(ctx, o.symbol as SpriteId, x, y, k);
      drawSprite(ctx, 'plusBadge', x + 32 * d, y + 24 * d, 3 * d);
    } else if (o.kind === 'remove') {
      drawSprite(ctx, o.symbol as SpriteId, x, y, k);
      drawSprite(ctx, 'minusBadge', x + 32 * d, y + 24 * d, 3 * d);
    } else if (o.kind === 'gild') {
      drawSprite(ctx, o.symbol as SpriteId, x, y, k);
      drawSprite(ctx, ENH_SPRITE[o.enh], x, y, k);
      drawText(ctx, `X${o.n}`, x + 48 * d, y + 20 * d, T.head * d, CHARM_COLOR[o.enh]);
    } else if (o.kind === 'symLevel' || o.kind === 'charmLevel') this.levelIcon(ctx, o, x, y, k);
    else {
      drawSprite(ctx, 'heart', x, y, 5 * d);
      if (o.kind === 'maxHp') drawSprite(ctx, 'plusBadge', x + 30 * d, y + 22 * d, 3 * d);
    }
  }

  /** A LEVEL card's icon: the symbol (or the Charm on its own tile) with its new level. */
  protected levelIcon(ctx: CanvasRenderingContext2D, o: Extract<DraftOption, { kind: 'symLevel' | 'charmLevel' }>, x: number, y: number, scale: number): void {
    const lv = this.run?.player.levels;
    if (o.kind === 'symLevel') drawSprite(ctx, o.symbol as SpriteId, x, y, scale);
    else {
      // The Charm alone on a tile in its own colour: a Charm level is for every Charm of the type, whatever it sits on.
      const half = 8 * scale;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(x - half - 3, y - half - 3, half * 2 + 6, half * 2 + 6);
      ctx.fillStyle = CHARM_COLOR[o.enh];
      ctx.fillRect(x - half - 1, y - half - 1, half * 2 + 2, half * 2 + 2);
      ctx.fillStyle = '#2a2040';
      ctx.fillRect(x - half + 2, y - half + 2, half * 2 - 4, half * 2 - 4);
      drawSprite(ctx, ENH_SPRITE[o.enh], x, y, scale);
    }
    const next = o.kind === 'symLevel' ? symLevel(lv, o.symbol) + (this.run ? levelStep(this.run) : 1) : 1;
    drawChip(ctx, `LV${next}`, x + 10 * scale + 18, y + 6 * scale, { scale: T.body, color: '#5ad8e8' });
  }

  /** The card under the pointer or the focus: its full rule (when the face is the short one) and its keywords, in one
   * kit panel under the card (or beside it when there's no room). */
  protected drawCardDetail(ctx: CanvasRenderingContext2D, c: Hit, o: DraftOption): void {
    const face = cardFace(o, this.run ?? undefined);
    const keys = keywordsIn(face.full).slice(0, 2);
    // (A Charm card's full text only adds its reel, which its marker shows.)
    this.detailBox(ctx, face.full !== face.text && o.kind !== 'gild' ? face.full : '', keys, c.x, c.y + c.h / 2 + 14, c.w + 20);
  }

  /** A detail box: a full rule, then keywords (word in its colour, then what it means), centred on x, top at y. */
  protected detailBox(ctx: CanvasRenderingContext2D, rule: string, keys: Keyword[], x: number, y: number, w: number): void {
    if (!rule && !keys.length) return;
    const cols = Math.floor((w - 24) / (6 * T.small));
    const ruleLines = rule ? wrap(rule, cols) : [];
    // A keyword line opens with its icon; the words hang indented beside it.
    const ICON = 18;
    const keyLines = keys.map((k) => wrap(`${k.word}: ${k.text}`, cols - Math.ceil(ICON / (6 * T.small))));
    const lh = 16;
    const h = 16 + ruleLines.length * lh + keyLines.reduce((a, l) => a + l.length * lh + 6, 0) + (rule && keys.length ? 4 : 0);
    const bx = Math.round(Math.max(316, Math.min(W - w - 8, x - w / 2)));
    const by = Math.round(Math.min(H - h - 8, y));
    drawPanel(ctx, bx, by, w, h, { frame: KIT.frameDim });
    let yy = by + 14;
    for (const l of ruleLines) {
      drawRich(ctx, l, bx + 12, yy, T.small, KIT.text, { align: 'left' });
      yy += lh;
    }
    if (rule && keys.length) yy += 4;
    keys.forEach((k, i) => {
      drawSprite(ctx, k.icon, bx + 18, yy, 1);
      keyLines[i].forEach((l, j) => {
        const tx = bx + 12 + ICON;
        if (j === 0) {
          drawText(ctx, `${k.word}:`, tx, yy, T.small, k.color, { align: 'left' });
          drawText(ctx, l.slice(k.word.length + 1), tx + textWidth(`${k.word}:`, T.small), yy, T.small, KIT.dim, { align: 'left' });
        } else drawText(ctx, l, tx, yy, T.small, KIT.dim, { align: 'left' });
        yy += lh;
      });
      yy += 6;
    });
  }
}
