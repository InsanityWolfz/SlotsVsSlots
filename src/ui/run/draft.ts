import { symLabel, UNIT } from '../../core/config';
import { LEGENDARY, RELICS } from '../../core/relics';
import { CHARM_COLOR, symLevel } from '../../core/charms';
import { describeOption, endlessScore, type DraftOption, type FightRecord, type RunState, levelStep } from '../../core/run';
import type { RelicId } from '../../core/config';
import { LOOP_GROWTH } from '../../core/enemies';
import { VOLUME } from '../../core/fight';
import { backOut } from '../../present/ease';
import { ENH_SPRITE } from '../../present/reel';
import { COLORS, H, W } from '../../present/layout';
import { artId, drawSprite, hasSprite, type SpriteId } from '../../render/sprites';
import { drawText, fmtNum, textWidth } from '../../render/text';
import { drawKeywordBoxes, drawRich, keywordsIn } from '../keywords';
import { wrap, Hit, CX, rounds } from './shared';
import { NextScreen } from './enemyCard';

export abstract class DraftScreen extends NextScreen {
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
    const n = offers.length;
    // Four cards use the whole width beside the build panel, a little taller (they were cramped: user).
    const gap = n > 3 ? 238 : 300;
    this.cards = offers.map((o, i) =>
      this.hit(CX + (i - (n - 1) / 2) * gap, n > 3 ? 396 : 384, n > 3 ? gap - 16 : gap - 30, n > 3 ? 246 : 222, () => {
        if (this.picked >= 0) return;
        this.picked = i;
        this.sounds.stingerMedium();
        const card = this.cards[i];
        void this.ui
          .tween({ from: 1.08, to: 1.18, dur: 0.15, ease: backOut(2), onUpdate: (v) => (card.scale = v) })
          .then(() => this.ui.wait(0.35))
          .then(() =>
            kind === 'legend' && o.kind === 'relic' ? this.cb.onLegend(o.relic) : (kind === 'spoils' || kind === 'start') && o.kind === 'relic' ? this.cb.onSpoils(o.relic) : this.cb.onPick(o),
          );
      }),
    );
    // Deal the cards in.
    this.cards.forEach(
      (c, i) =>
        void this.ui.wait(0.12 + i * 0.09).then(() => {
          this.sounds.click();
          return this.ui.tween({ from: 0, to: 1, dur: 0.3, ease: backOut(2), onUpdate: (v) => (c.scale = v) });
        }),
    );
  }

  protected drawDraft(ctx: CanvasRenderingContext2D, time: number): void {
    const last = this.lastRecord;
    const start = this.draftKind === 'start';
    // ENDLESS: the pick after a loop's boss is the new loop's: say the loop was cleared.
    const loopDone = !!last && !!this.run?.endless && last.loop !== undefined && last.loop < this.run.endless.loop;
    drawText(ctx, loopDone ? `LOOP ${last!.loop} CLEARED! SCORE ${fmtNum(endlessScore(this.run!))}` : last ? `${last.enemy} DEFEATED!` : start ? 'A NEW RUN' : 'CHOOSE A REWARD', CX, 30, 4, COLORS.goldLight, { alpha: Math.max(0, (this.fade - 0.6) / 0.4) });
    if (last) {
      const rocks = last.rocksCrumbled ? `  -  ${last.rocksCrumbled} ROCKS CRUMBLED` : '';
      const chips = last.chips ? `  -  +${last.chips} CHIPS` : '';
      // VETERAN (KNIGHT) and WARM-UP (JUKEBOX) grow with each loop cleared: say so where the loop ends.
      const L = this.run!.endless?.loop ?? 0;
      const grow = !loopDone ? '' : this.run!.cabinet === 'knight' ? `  -  VETERAN: SWORDS AND SHIELDS X${1 + LOOP_GROWTH.veteran * (L - 1)}` : this.run!.cabinet === 'jukebox' ? `  -  WARM-UP: FIGHTS START AT VOLUME ${Math.min(VOLUME.max - 1, LOOP_GROWTH.warmUp * L)}` : '';
      // A boss pays a level to your attack symbol: say so, in gold.
      const planet = last.bossLevel ? `${symLabel(last.bossLevel)}S LEVEL UP: LV${symLevel(this.run!.player.levels, last.bossLevel)}` : '';
      drawText(ctx, `${rounds(last.turns)}${chips}${rocks}${grow}`, CX, 60, 2, COLORS.textDim);
      if (planet) drawText(ctx, planet, CX, 84, 2.5, COLORS.goldLight);
    }
    this.drawMap(ctx, 158, time);
    const spoils = this.draftKind === 'spoils';
    const legend = this.draftKind === 'legend';
    const act3Arrival = !legend && !spoils && this.run!.act >= 3 && this.run!.depth === 0 && this.run!.actIntro;
    // The boss's heal says what it gave (feel playtest: FULLY HEALED read as nothing at 94%).
    const healedBy = last?.won ? Math.max(0, this.run!.player.maxHp - last.hpAfter) : 0;
    const healed = healedBy >= UNIT ? `HEALED +${fmtNum(healedBy)} HP.` : 'FULL HP.';
    const heading = act3Arrival
      ? `ACT 3: THE HOUSE HAS A PARTNER. ${healed}`
      : legend
        ? this.run!.endless ? `LOOP ${this.run!.endless.loop}: ${this.offers.every((o) => o.kind === 'relic' && LEGENDARY.has(o.relic)) ? 'A LEGENDARY RELIC' : 'PICK A RELIC'}` : `${last?.boss ? `ACT ${this.run!.act}: ${healed}` : 'PUNCH CARD:'} ${this.offers.every((o) => o.kind === 'relic' && LEGENDARY.has(o.relic)) ? 'A LEGENDARY RELIC.' : 'PICK A RELIC.'}`
        : start
          ? 'PICK A STARTING RELIC'
          : spoils
          ? 'ELITE SPOILS'
          : '';
    if (act3Arrival && hasSprite('actPlaque3')) drawSprite(ctx, artId('actPlaque3'), CX, 208, 3);
    drawText(ctx, heading, CX, legend ? 236 : 244, 3, legend ? COLORS.goldLight : spoils ? '#ff9a3a' : COLORS.text);
    this.cards.forEach((c, i) => this.drawCard(ctx, c, this.offers[i], i, time));
    // The hovered card's keywords, explained beside it (GLOSSARY: the same words on every card).
    const hov = this.picked < 0 ? this.cards.findIndex((c) => c.hover && c.scale > 0.9) : -1;
    if (hov >= 0) {
      const c = this.cards[hov];
      const keys = keywordsIn(describeOption(this.offers[hov], this.run ?? undefined).text).slice(0, 3);
      if (keys.length) {
        const bw = 230;
        // Under the card when there's room (beside it, the boxes covered the next card: playtest C), else beside it.
        const below = c.y + c.h / 2 + 12;
        if (below + keys.length * 74 <= H - 8) {
          drawKeywordBoxes(ctx, keys, Math.max(8, Math.min(W - bw - 8, c.x - bw / 2)), below, bw);
        } else {
          const right = c.x + c.w / 2 + 14;
          const bx = right + bw <= W - 8 ? right : c.x - c.w / 2 - 14 - bw;
          drawKeywordBoxes(ctx, keys, bx, c.y - c.h / 2, bw);
        }
      }
    }
  }

  protected drawCard(ctx: CanvasRenderingContext2D, c: Hit, o: DraftOption, i: number, time: number): void {
    if (c.scale <= 0.01) return;
    const dimmed = this.picked >= 0 && this.picked !== i;
    const { title, text } = describeOption(o, this.run ?? undefined);
    const accent = o.kind === 'gild' ? CHARM_COLOR[o.enh] : o.kind === 'symLevel' || o.kind === 'charmLevel' ? '#5ad8e8' : o.kind === 'relic' ? '#c9a0ff' : o.kind === 'clear' ? '#c9bba8' : o.kind === 'swap' || o.kind === 'add' ? '#7dff7a' : '#ff9ab0';
    ctx.save();
    ctx.globalAlpha *= dimmed ? 0.3 : 1;
    ctx.translate(c.x, c.y + c.lift);
    ctx.scale(c.scale, c.scale);
    const w = c.w;
    const h = c.h;
    if (c.hover && this.picked < 0) {
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 24;
      ctx.fillStyle = accent;
      ctx.globalAlpha *= 0.5 + 0.2 * Math.sin(time * 6);
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
    this.panel(ctx, -w / 2, -h / 2, w, h, c.hover || this.picked === i ? accent : COLORS.gold);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(-w / 2, -h / 2, w, 70);
    // Icon.
    const iy = -h / 2 + 42;
    const reelMarker = (reel: number) => {
      for (let r = 0; r < 3; r++) {
        ctx.fillStyle = r === reel ? accent : '#3a2e52';
        ctx.fillRect(-w / 2 + 12 + r * 11, iy - 20, 8, 36);
      }
      drawText(ctx, `REEL ${reel + 1}`, -w / 2 + 30, iy + 32, 1.5, COLORS.textDim);
    };
    if (o.kind === 'relic') {
      drawSprite(ctx, RELICS[o.relic].sprite as SpriteId, 0, iy, 4);
    }
    else if (o.kind === 'swap') {
      drawSprite(ctx, o.from as SpriteId, -44, iy, 3);
      drawSprite(ctx, 'arrowRight', 0, iy, 3);
      drawSprite(ctx, o.to as SpriteId, 44, iy, 3);
      reelMarker(o.reel);
    } else if (o.kind === 'clear') {
      drawSprite(ctx, 'cardClear', -18, iy, 3.5);
      drawSprite(ctx, 'rock', 30, iy + 10, 2);
      reelMarker(o.reel);
    } else if (o.kind === 'add') {
      drawSprite(ctx, o.symbol as SpriteId, 0, iy, 4);
      drawSprite(ctx, 'plusBadge', 32, iy + 24, 3);
      reelMarker(o.reel);
    } else if (o.kind === 'gild') {
      drawSprite(ctx, o.symbol as SpriteId, 0, iy, 4);
      drawSprite(ctx, ENH_SPRITE[o.enh], 0, iy, 4);
      drawText(ctx, `X${o.n}`, 46, iy + 18, 3, CHARM_COLOR[o.enh]);
      reelMarker(o.reel);
    } else if (o.kind === 'symLevel' || o.kind === 'charmLevel') this.levelIcon(ctx, o, 0, iy, 4);
    else if (o.kind === 'heal') drawSprite(ctx, 'heart', 0, iy, 5);
    else {
      drawSprite(ctx, 'heart', 0, iy, 5);
      drawSprite(ctx, 'plusBadge', 30, iy + 22, 3);
    }
    // The biggest size that fits the card (2 CHIP CHARMS ran off a 4-card draft's card).
    drawText(ctx, title, 0, 2, [3, 2.5, 2, 1.5].find((k) => textWidth(title, k) <= w - 6) ?? 1.5, accent);
    // Wrapped to the card's own width (a 4-card draft is narrower: UNDERDOG ran off it).
    const cols = Math.min(20, Math.floor((w - 20) / 12));
    const long = wrap(text, cols).length > 4;
    (long ? wrap(text, Math.floor((w - 20) / 9)) : wrap(text, cols)).slice(0, 6).forEach((line, k) => drawRich(ctx, line, 0, 30 + k * (long ? 15 : 20), long ? 1.5 : 2, COLORS.text));
    if (o.kind === 'relic' && LEGENDARY.has(o.relic)) this.legendTag(ctx, 0, -h / 2 + 14, time);

    ctx.restore();
  }

  /** A LEVEL card's icon: the symbol (or the charm on its symbol) with its new level. */
  protected levelIcon(ctx: CanvasRenderingContext2D, o: Extract<DraftOption, { kind: 'symLevel' | 'charmLevel' }>, x: number, y: number, scale: number): void {
    const lv = this.run?.player.levels;
    if (o.kind === 'symLevel') drawSprite(ctx, o.symbol as SpriteId, x, y, scale);
    else {
      // The Charm alone on an empty cell, as in the build panel: on a symbol it read as that symbol's upgrade (user
      // playtest), but a Charm level is for every Charm of the type, whatever it sits on.
      // A tile in the Charm's own color (a plain dark cell read as a blob: R13).
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
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x + 22, y + 8, 50, 24);
    drawText(ctx, `LV${next}`, x + 47, y + 20, 2, '#5ad8e8');
  }

  /** Violet/gold LEGENDARY ribbon inside the top of a card. */
  protected legendTag(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 58, y - 9, 116, 18);
    ctx.fillStyle = '#6a2aa0';
    ctx.fillRect(x - 56, y - 7, 112, 14);
    drawText(ctx, 'LEGENDARY', x, y, 1.5, COLORS.goldLight, { alpha: 0.8 + 0.2 * Math.sin(time * 5) });
  }
}
