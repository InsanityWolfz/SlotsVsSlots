import { atStakes, CLAW, CLAW_PRIZES, clawGrip, clawPrizeName, extraPlays } from '../../core/encounters';
import { RELICS, relicText } from '../../core/relics';
import { shortRelicText } from './cardText';
import { encounterChoices, type RunState } from '../../core/run';
import { COLORS } from '../../present/layout';
import { artId, drawSprite, type SpriteId } from '../../render/sprites';
import { drawText } from '../../render/text';
import { clawPrizeX, CW, CW_PIT } from './shared';
import { SX, ROW, TABLE, TCX } from './table';
import { drawChip, KIT, T } from '../kit';
import { backOut } from '../../present/ease';
import { textWidth } from '../../render/text';
import { CardGames } from './cardGames';

export abstract class ClawScreen extends CardGames {

  // ---- CLAW MACHINE (user's pick, 2026-10-14) ----------------------------------------------------------------------

  /** CLAW MACHINE: a button per prize still in the pit (its grip under it), WALK AWAY. */
  protected clawButtons(): void {
    this.cwFinal = false;
    this.heldBuild = null;
    const run = this.run!;
    this.encChoices = encounterChoices(run);
    const aims = CLAW_PRIZES.map((_p, k) => {
      const b = this.minorBtn(`GO FOR ${clawPrizeName(run, k)}`, SX, ROW.chips + 4 + k * 66, 212, 52, () => this.playClaw(k));
      b.enabled = !this.encChoices[k]?.disabled;
      return b;
    });
    this.setTable([...aims, this.footBtn('WALK AWAY', () => this.playClaw(CLAW_PRIZES.length))]);
  }

  /** One go: the claw slides over, drops, shuts and lifts; the prize rides up, and holds or slips. */
  protected playClaw(i: number): void {
    const before = this.run?.player.chips ?? 0;
    const was = this.run ? (JSON.parse(JSON.stringify(this.run)) as RunState) : null;
    const res = this.cb.onEncounter(i);
    if (!res) return;
    this.chipsLanding = (this.run?.player.chips ?? 0) - before;
    if (!res.claw) {
      this.cwMsg = res;
      if (this.leaveOnWalk(res)) return;
      this.setTable([this.footBtn('CONTINUE', () => this.cb.onEncounterDone(), true)]);
      return;
    }
    const claw = res.claw;
    this.cwMsg = null;
    this.heldBuild = was;
    this.cwFinal = !res.more;
    this.cwTarget = claw.prize;
    const skip = this.footBtn('SKIP', () => this.encClock.skip());
    skip.quietStyle = true;
    this.setTable([skip]);
    // (Where the capsule sits now: a dragged one is nearer its chute.)
    const targetX = clawPrizeX(claw.prize, this.cwShown[claw.prize] ?? 0);
    void this.encClock
      .tween({
        from: 0,
        to: 1,
        dur: 3,
        onUpdate: (t) => {
          // 0-0.3 slide, 0.3-0.5 drop, 0.5-0.6 shut, 0.6-0.85 lift (it slips at 0.75 if it doesn't hold), 0.85-1 home.
          const home = CW.home;
          if (t < 0.3) {
            this.cwX = home + (targetX - home) * (t / 0.3);
            this.cwY = 0;
          } else if (t < 0.5) {
            this.cwX = targetX;
            this.cwY = (t - 0.3) / 0.2;
          } else if (t < 0.6) this.cwY = 1;
          else if (t < 0.85) this.cwY = 1 - (t - 0.6) / 0.25;
          else {
            this.cwY = 0;
            this.cwX = targetX + (home - targetX) * ((t - 0.85) / 0.15);
          }
          this.cwShut = t >= 0.5 && t < 0.97;
          this.cwCarry = t >= 0.55 && (claw.held ? t < 0.97 : t < 0.75);
        },
      })
      .then(() => {
        this.encClock.skipping = false;
        this.cwX = CW.home;
        this.cwY = 0;
        this.cwShut = false;
        this.cwCarry = false;
        if (claw.held) this.cwWon.push(claw.prize);
        // A miss drags the capsule toward its chute where you can see it (user, 2026-11-17: the text alone confused).
        const from = [...this.cwShown];
        this.cwMisses = [...claw.misses];
        const k = claw.prize;
        if (!claw.held && claw.misses[k] > from[k]) {
          this.sounds.rockThud();
          void this.encClock.tween({ from: from[k], to: claw.misses[k], dur: this.reduceMotion ? 0.01 : 0.5, ease: backOut(2), onUpdate: (v) => (this.cwShown[k] = v) });
        } else this.cwShown = [...claw.misses];
        this.heldBuild = null;
        this.landChips();
        if (this.mode !== 'encounter') return;
        // A relic won names itself and says what it does (it said INSURANCE POLICY and nothing else: playtest 2026-11-06).
        const got = this.run?.player.relics.at(-1);
        const run = this.run;
        this.cwMsg = claw.held && CLAW_PRIZES[claw.prize].id === 'relic' && run && got && RELICS[got]?.name === res.text
          ? { ...res, text: `${res.text}: ${shortRelicText(got, relicText(got, run.cabinet))}` }
          : res;
        this.encOutcomeSound(res);
        if (res.more) this.clawButtons();
        else this.setTable([this.footBtn('CONTINUE', () => this.cb.onEncounterDone(), true)]);
      });
  }

  /** CLAW MACHINE: the cabinet (scenery: a red cabinet, its lit sign, the glass), the prizes on their tags (won ones
   * gone), the claw; GOES LEFT and the aims on the side. */
  protected drawClaw(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    // The last go moves the run on (its plays reset to 0), so the screen still up on the result reads 0, not a full set.
    const done = (!!this.cwMsg && !this.cwMsg.more) || this.cwFinal;
    const goes = done ? 0 : Math.max(0, CLAW.tries + extraPlays(run) - (run.encounterPlays ?? 0));
    // (Short of a go: say so, or every GO button was off with no word why.)
    const price = atStakes(run, CLAW.price);
    const short = run.player.chips < price && !this.cwMsg && !this.heldBuild;
    const priceLine = short ? `${price} CHIPS EACH TRY. YOU HAVE ${run.player.chips}` : `${price} CHIPS EACH TRY`;
    // (The chip symbol beside the price, as the other tables show their bets: user, 2026-11-17.)
    const plw = textWidth(priceLine, T.small);
    drawSprite(ctx, 'chip', TCX - plw / 2 - 12, 72, 1.5);
    drawText(ctx, priceLine, TCX + 8, 72, T.small, short ? '#ff8a7a' : KIT.dim);
    const x0 = TCX - 250;
    const w = 500;
    const y0 = TABLE.y + 2;
    const h = TABLE.h - 4;
    // The cabinet body: outline, red sides with a shaded edge, gold trim.
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x0 - 3, y0 - 3, w + 6, h + 6);
    ctx.fillStyle = '#7a1428';
    ctx.fillRect(x0, y0, w, h);
    ctx.fillStyle = '#a8203a';
    ctx.fillRect(x0 + 6, y0, w - 12, h);
    ctx.fillStyle = '#c83a50';
    ctx.fillRect(x0 + 6, y0, 4, h);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x0, y0 + 62, w, 4);
    ctx.fillRect(x0, y0 + 376, w, 4);
    // The sign: dark glass with the name lit in neon (and a slow flicker on one letter... no: steady, it's scenery).
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x0 + 40, y0 + 10, w - 80, 46);
    ctx.fillStyle = '#1a0a18';
    ctx.fillRect(x0 + 43, y0 + 13, w - 86, 40);
    drawText(ctx, 'THE CLAW', TCX, y0 + 34, T.head, '#ff9ad8');
    // Little sign bulbs, lit in turn (scenery, slow).
    for (let k = 0; k < 12; k++) {
      const bx = x0 + 52 + k * ((w - 104) / 11);
      const on = this.reduceMotion ? k % 2 === 0 : (Math.floor(time * 3) + k) % 3 === 0;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(Math.round(bx) - 3, y0 + 4, 6, 6);
      ctx.fillStyle = on ? KIT.bulbOn : KIT.bulbOff;
      ctx.fillRect(Math.round(bx) - 2, y0 + 5, 4, 4);
    }
    // The glass: a dark box with a cool tint, two reflections, a metal frame.
    const gx = x0 + 20;
    const gy = y0 + 74;
    const gw = w - 40;
    const gh = 296;
    ctx.fillStyle = '#5a5a6a';
    ctx.fillRect(gx - 4, gy - 4, gw + 8, gh + 8);
    ctx.fillStyle = '#140c24';
    ctx.fillRect(gx, gy, gw, gh);
    // The floor the prizes stand on, with a chute left of each prize (dark holes under it, hazard-striped edges).
    const floorY = CW.pitY + CW_PIT.floor;
    // A heap of spare prizes at the back of the pit (dim), resting on the floor.
    for (let k = 0; k < 16; k++) drawSprite(ctx, artId('prizeBall'), gx + 20 + k * 28 + (k % 2) * 6, floorY - 10 - (k % 3) * 8, 2.5, { alpha: 0.3 });
    ctx.fillStyle = '#0c0814';
    ctx.fillRect(gx, floorY, gw, gy + gh - floorY);
    // The floor's ledge, in pieces between the chutes (a chute is a gap in it, not a mark on it).
    const holes = CLAW_PRIZES.map((_p, k) => CW.x0 + k * CW.gap - CW_PIT.chuteOff);
    let lx = gx;
    for (const hx of [...holes, gx + gw + CW_PIT.chuteW / 2]) {
      const rx = Math.min(gx + gw, hx - CW_PIT.chuteW / 2);
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(lx, floorY, rx - lx, 8);
      ctx.fillStyle = '#9a9aaa';
      ctx.fillRect(lx, floorY + 2, rx - lx, 4);
      lx = hx + CW_PIT.chuteW / 2;
    }
    CLAW_PRIZES.forEach((_p, k) => {
      const cx = CW.x0 + k * CW.gap - CW_PIT.chuteOff;
      const hw = CW_PIT.chuteW / 2;
      // The hole: cut through the floor down to the glass, its walls lit at the top and black below.
      const depth = gy + gh - floorY;
      ctx.fillStyle = '#000000';
      ctx.fillRect(cx - hw, floorY, CW_PIT.chuteW, depth);
      ctx.fillStyle = '#1a1424';
      ctx.fillRect(cx - hw, floorY + 8, 3, depth - 8);
      ctx.fillRect(cx + hw - 3, floorY + 8, 3, depth - 8);
      // Hazard stripes on both lips.
      for (const ex of [cx - hw - 6, cx + hw]) {
        ctx.fillStyle = COLORS.outline;
        ctx.fillRect(ex, floorY - 2, 6, 12);
        for (let s = 0; s < 3; s++) {
          ctx.fillStyle = s % 2 ? '#1a1024' : '#ffd23f';
          ctx.fillRect(ex + 1, floorY - 1 + s * 3, 4, 3);
        }
      }
      // A small arrow down into it.
      ctx.fillStyle = 'rgba(255,210,63,0.55)';
      for (let r = 0; r < 4; r++) ctx.fillRect(cx - 7 + r * 2, floorY + 16 + r * 2, 14 - r * 4, 2);
    });
    // The rail and the claw.
    const railY = gy + 14;
    ctx.fillStyle = '#8a8a9a';
    ctx.fillRect(gx, railY, gw, 6);
    ctx.fillStyle = '#5a5a6a';
    ctx.fillRect(gx, railY + 6, gw, 2);
    const clawY = railY + 40 + this.cwY * (CW.pitY - 46 - railY - 40);
    ctx.fillStyle = '#6a6a7a';
    ctx.fillRect(Math.round(this.cwX) - 2, railY + 6, 4, Math.max(0, clawY - railY - 30));
    const won = this.cwWon;
    const art: SpriteId[] = ['chip', artId('enhGold'), artId('relicSym')];
    const misses = this.cwMisses;
    CLAW_PRIZES.forEach((_p, k) => {
      // PUSH YOUR LUCK: each miss slides the capsule toward its chute and it sags over the lip; at 2 it teeters on the
      // edge (the go in flight doesn't show its own miss until the claw is home).
      const m = this.cwShown[k] ?? misses[k];
      const carried = this.cwCarry && this.cwTarget === k;
      if (won.includes(k) && !carried) return;
      const teeter = m >= 1.95 && !carried && !this.reduceMotion ? Math.round(Math.sin(time * 7 + k) * 1.2) : 0;
      const x = carried ? Math.round(this.cwX) : Math.round(clawPrizeX(k, m)) + teeter;
      const mm = Math.min(2, Math.max(0, m));
      const y = carried ? clawY + 46 : CW.pitY + Math.round(CW_PIT.sag * mm * mm) + Math.abs(teeter);
      drawSprite(ctx, artId('prizeBall'), x, y, 5);
      drawSprite(ctx, art[k], x, y - 4, 2);
    });
    drawSprite(ctx, artId(this.cwShut ? 'clawGrabberShut' : 'clawGrabber'), Math.round(this.cwX), Math.round(clawY), 4);
    // The glass's reflections, over everything in it.
    ctx.fillStyle = 'rgba(200,230,255,0.07)';
    ctx.fillRect(gx, gy, gw, gh);
    ctx.fillStyle = 'rgba(220,240,255,0.10)';
    for (let k = 0; k < gh; k += 2) {
      ctx.fillRect(gx + 40 + Math.round(k * 0.35), gy + k, 14, 2);
      ctx.fillRect(gx + 80 + Math.round(k * 0.35), gy + k, 5, 2);
    }
    // The deck under the glass: each prize's tag (body size), a joystick and the chute.
    CLAW_PRIZES.forEach((_p, k) => {
      const x = CW.x0 + k * CW.gap;
      const gone = won.includes(k);
      ctx.save();
      if (gone) ctx.globalAlpha *= 0.4;
      drawChip(ctx, gone ? 'WON' : clawPrizeName(run, k), x, y0 + 408, { color: gone ? KIT.dim : KIT.title });
      if (!gone) drawText(ctx, clawGrip(run, k, misses), x, y0 + 436, T.small, misses[k] > 0 ? '#ffe28a' : k === 0 ? '#7dff7a' : k === 1 ? '#ffd23f' : '#ff8a7a');
      ctx.restore();
    });
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x0 + 24, y0 + h - 30, 28, 12);
    ctx.fillStyle = '#3a3448';
    ctx.fillRect(x0 + 26, y0 + h - 28, 24, 8);
    ctx.fillStyle = '#e8374b';
    ctx.fillRect(x0 + 34, y0 + h - 44, 8, 8);
    ctx.fillStyle = '#5a5a6a';
    ctx.fillRect(x0 + 36, y0 + h - 36, 4, 10);
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x0 + w - 64, y0 + h - 40, 44, 26);
    ctx.fillStyle = '#2a1428';
    ctx.fillRect(x0 + w - 61, y0 + h - 37, 38, 20);
    drawText(ctx, 'PUSH', x0 + w - 42, y0 + h - 27, T.small, KIT.dim);
    // The side: goes left, the aims.
    this.side(ctx, 'THE CLAW');
    this.numberWell(ctx, 'EACH TRY', `${price}`, { sub: goes === 1 ? '1 TRY LEFT' : `${goes} TRIES LEFT` });
    const m = this.cwMsg;
    if (m) this.tableResult(ctx, m, TABLE.y + 200);
  }
}
