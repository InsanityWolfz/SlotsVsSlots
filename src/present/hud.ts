import { UNIT, type AbilityDef, type AbilityKind, type SideId } from '../core/config';
import type { MeterKind } from '../core/cabinets';
import { artId, drawPortrait, drawSprite, type SpriteId } from '../render/sprites';
import { drawText, fmtNum, textWidth } from '../render/text';
import { CountUp, drawChip, drawPanel, drawWell, KIT, T } from '../ui/kit';
import { BEZEL, COLORS, HUD_TOP, MACHINE_CX, MACHINE_W } from './layout';

/** The HUD panel is as wide as the machine's frame under it (the two read as one column). */
export const HUD_W = Math.round(MACHINE_W + BEZEL * 2);
/** Inside the panel: the portrait well on the left, the bars right of it. */
const BAR_X = 118;
const PAD = 12;
export const SHIELD_SOFT_CAP = 200;

/** The signature meter on the player's HUD (none for KNIGHT). */
export interface HudMeter {
  kind: MeterKind;
  /** Pips (one per 10 of meter). */
  pips: number;
  label: string;
  color: string;
  icon: SpriteId;
  /** CASH CASSIDY: the HIGH ROLLER bar shows chips in hand and the payoff they make (in place of the number). */
  note?: (chips: number) => string;
}

/** An ability's name on screen. */
export const abilityName = (kind: AbilityKind): string => ABILITY_UI[kind].label;
export const ABILITY_UI: Record<AbilityKind, { icon: SpriteId; label: string }> = {
  flood: { icon: 'icoFlood', label: 'SPILL' },
  smash: { icon: 'icoSmash', label: 'THE SWING' },
  fortify: { icon: 'shieldIcon', label: 'FORTIFY' },
  blizzard: { icon: 'icoFreeze', label: 'COLD STREAK' },
  pilfer: { icon: 'icoSteal', label: 'STEAL' },
  quake: { icon: 'icoRock', label: 'ROCKS' },
  jam: { icon: 'icoLock', label: 'JAM' },
  jackpot: { icon: 'icoCoin', label: 'CASH OUT' },
  carpet: { icon: artId('icoBomb'), label: 'COLLECTION DAY' },
  curse: { icon: artId('icoHex'), label: 'JINX' },
  bloodmoon: { icon: artId('icoDrain'), label: 'BLEED YOU DRY' },
  gulp: { icon: artId('icoGulp'), label: 'GULP' },
  bets: { icon: artId('icoBets'), label: 'NO MORE BETS' },
  launder: { icon: artId('icoLaunder'), label: 'LAUNDER' },
  mark: { icon: artId('icoMark'), label: 'STACKED DECK' },
  penalty: { icon: artId('icoGavel'), label: 'AUDIT' },
  repo: { icon: artId('icoGavel'), label: 'REPO' },
  houseTake: { icon: artId('icoRake'), label: "HOUSE'S TAKE" },
  deal: { icon: artId('icoShuffle'), label: 'BUST' },
  owner: { icon: artId('icoGavel'), label: 'EVERY TRICK' },
  hammer: { icon: artId('icoSmash'), label: 'THE HAMMER' },
};

/** Displayed (tweened) values for one side's bars — never read from game state mid-animation. */
export class HudView {
  /** CASH CASSIDY: chips held when the fight began, and in hand now (the Director follows the chip events). */
  chipsHeld = 0;
  chips = 0;
  /** CHIP charm chips this fight (banked on a win). */
  lucre = 0;
  hp: number;
  ghost: number;
  maxHp: number;
  shield = 0;
  /** Pips lit (can be fractional mid-fill). */
  energy = 0;
  energyMax: number;
  /** MIDAS / JAX: the meter is full and waiting to pay off. */
  armed = false;
  hpShake = 0;
  hpFlash = 0;
  shieldFlash = 0;
  shieldShake = 0;
  energyFlash = 0;
  pipPunch: number[];
  portraitFlash = 0;
  portraitShake = 0;
  /** Slimed cells on this side's strips (display state) — the persistent debuff made visible. */
  ooze = 0;
  oozeTotal = 0;
  oozePunch = 1;
  /** Enemy ability meter (display). */
  charge = 0;
  chargePunch = 1;
  abilityFlash = 0;
  /** Next ability would be lethal (boss LETHAL pot): the countdown shakes. */
  alarm = false;
  name: string;
  portrait: SpriteId;
  ability: AbilityDef | null;
  /** The ability line's name when it changes mid-fight (the Dealer's hand 3: ALL IN). */
  abilityLabel?: string;
  /** A line in the ability slot for an enemy without one. */
  hint = '';

  constructor(
    readonly side: SideId,
    maxHp: number,
    readonly meter: HudMeter | null,
    opts: { name?: string; portrait?: string; ability?: AbilityDef | null; energy?: number } = {},
  ) {
    this.name = opts.name ?? (side === 'player' ? 'HERO' : 'ENEMY');
    this.portrait = (opts.portrait ?? (side === 'player' ? 'playerPortrait' : 'enemyPortrait')) as SpriteId;
    this.ability = opts.ability ?? null;
    this.energy = opts.energy ?? 0;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.ghost = maxHp;
    this.energyMax = meter?.pips ?? 0;
    this.pipPunch = Array(Math.max(1, this.energyMax)).fill(1);
    this.energy = meter?.kind === 'touch' ? (opts.energy ?? 0) : Math.min(this.energyMax, opts.energy ?? 0);
  }

  get x(): number {
    return Math.round(MACHINE_CX[this.side] - HUD_W / 2);
  }

  hpBar() {
    return { x: this.x + BAR_X, y: HUD_TOP + 42, w: HUD_W - BAR_X - PAD, h: 22 };
  }
  shieldBar() {
    return { x: this.x + BAR_X, y: HUD_TOP + 72, w: HUD_W - BAR_X - PAD, h: 16 };
  }
  get hasSpecial(): boolean {
    return !!this.meter;
  }
  /** The meter bar (TESLA, MIDAS, JAX): one bar with a number, not pips. */
  meterBar() {
    return { x: this.x + BAR_X, y: HUD_TOP + 98, w: HUD_W - BAR_X - PAD, h: 18 };
  }
  /** The panel's height: the name, HP and shield; the signature meter adds a row (its note one more). */
  get panelH(): number {
    return this.meter ? (this.meter.note ? 144 : 128) : 100;
  }
  /** Where the next-move chip hangs: centred on the panel's bottom edge. */
  get chipY(): number {
    return HUD_TOP + this.panelH + 8;
  }
  /** A point along the meter bar for the i-th 10 of meter (projectiles aim here). */
  pipPos(i: number) {
    const b = this.meterBar();
    const n = Math.max(1, this.energyMax);
    return { x: b.x + ((Math.min(i, n - 1) + 0.5) / n) * b.w, y: b.y + b.h / 2 };
  }
  /** Where damage numbers / projectiles aim for this side. */
  get anchor() {
    const b = this.hpBar();
    return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  }

  /** THE count-up on the HUD's numbers (HP, shield): they ease, never snap. */
  private hpNum: CountUp | null = null;
  private shNum = new CountUp(0, 0.35);
  private lastT = -1;

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    const x = this.x;
    const y = HUD_TOP;
    const h = this.panelH;
    // The numbers count to the bars (the bars themselves move with the Director's tweens).
    const dt = this.lastT < 0 ? 0 : Math.max(0, Math.min(0.1, time - this.lastT));
    this.lastT = time;
    this.hpNum ??= new CountUp(Math.max(0, Math.ceil(this.hp)), 0.45);
    this.hpNum.set(Math.max(0, Math.ceil(this.hp)));
    this.shNum.set(Math.round(this.shield));
    this.hpNum.update(dt);
    this.shNum.update(dt);

    // THE panel. Low HP: your frame pulses red (with the screen's red edges and the heartbeat: feel playtest).
    const lowHp = this.side === 'player' && this.hp > 0 && this.hp < this.maxHp * 0.3;
    drawPanel(ctx, x, y, HUD_W, h, { frame: lowHp ? mixHex(KIT.frame, COLORS.danger, 0.55 + 0.45 * Math.sin(time * Math.PI * 1.8)) : undefined });

    // Portrait in its well (32px art at x2).
    const ps = this.portraitShake * (Math.random() * 2 - 1);
    drawWell(ctx, x + PAD, y + PAD, 76, 76);
    drawPortrait(ctx, this.portrait, x + PAD + 38 + ps, y + PAD + 39, 64 / 24, { flash: this.portraitFlash });
    // The name, heading size.
    drawText(ctx, this.name, x + BAR_X - 26, y + 24, T.head, this.side === 'player' ? KIT.title : COLORS.slime, { align: 'left' });
    if (this.ooze > 0) {
      const pct = this.ooze / Math.max(1, this.oozeTotal);
      drawText(ctx, `SPILL ${this.ooze}/${this.oozeTotal}`, x + HUD_W - PAD, y + 24, T.body, pct >= 0.5 && Math.sin(time * 8) > 0 ? '#b6ff9a' : COLORS.slime, {
        align: 'right',
        punch: this.oozePunch,
      });
    }

    // HP bar with trailing ghost; the heart sits left of it.
    const hb = this.hpBar();
    const sh = this.hpShake * (Math.random() * 2 - 1);
    const hx = hb.x + sh;
    drawSprite(ctx, 'heart', hx - 16, hb.y + hb.h / 2, 2);
    this.bar(ctx, hx, hb.y, hb.w, hb.h, [
      [this.ghost / this.maxHp, COLORS.hpGhost],
      [this.hp / this.maxHp, COLORS.hp],
    ], this.hpFlash);
    const low = this.hp / this.maxHp <= 0.25 && this.hp > 0;
    drawText(ctx, `${fmtNum(this.hpNum.shown)}/${fmtNum(this.maxHp)}`, hx + hb.w / 2, hb.y + hb.h / 2 + 1, T.body, low && Math.sin(time * 10) > 0 ? '#ffb0b0' : COLORS.text);

    // Shield bar (no max; fills to a soft cap).
    const sb = this.shieldBar();
    const ss = this.shieldShake * (Math.random() * 2 - 1);
    drawSprite(ctx, 'shieldIcon', sb.x - 16 + ss, sb.y + sb.h / 2, 2, { alpha: this.shield > 0 ? 1 : 0.4 });
    this.bar(ctx, sb.x + ss, sb.y, sb.w, sb.h, [[Math.min(1, this.shield / SHIELD_SOFT_CAP), COLORS.shield]], this.shieldFlash);
    if (this.shield > 0.01 || this.shNum.shown > 0) drawText(ctx, `${this.shNum.shown}`, sb.x + sb.w / 2 + ss, sb.y + sb.h / 2 + 1, T.small, COLORS.text);

    // The signature meter (TESLA, MIDAS, JAX, THE JUKEBOX).
    const m = this.meter;
    if (m) {
      const b = this.meterBar();
      drawSprite(ctx, m.icon, b.x - 16, b.y + b.h / 2, m.icon === 'boltIcon' ? 2 : 1.5);
      // One bar with a number: how much you have / how much it takes.
      const full = this.energy >= this.energyMax - 0.01;
      const pulse = full ? 0.3 + 0.3 * Math.sin(time * (this.armed ? 10 : 18)) : 0;
      // Fixed size (no punch), and the glow only lights the filled part, so the text always reads.
      const frac = Math.min(1, this.energy / Math.max(1, this.energyMax));
      this.bar(ctx, b.x, b.y, b.w, b.h, [[frac, m.color]], 0);
      const glow = Math.min(0.45, Math.max(pulse, this.energyFlash) * 0.55);
      if (glow > 0 && frac > 0) {
        ctx.globalAlpha = glow;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(b.x, b.y, frac * b.w, b.h);
        ctx.globalAlpha = 1;
      }
      const label = this.armed ? (m.kind === 'touch' ? 'TOUCH READY!' : `${m.label} READY!`) : m.label;
      drawText(ctx, label, b.x + 6, b.y + b.h / 2 + 1, T.small, '#ffffff', { align: 'left' });
      // THE JUKEBOX counts its volume in levels (4/6), like its cards do.
      const count = m.kind === 'volume' ? `${Math.floor(this.energy + 0.01)}/${this.energyMax}` : `${Math.round(this.energy * UNIT)}/${this.energyMax * UNIT}`;
      drawText(ctx, count, b.x + b.w - 6, b.y + b.h / 2 + 1, T.small, '#ffffff', { align: 'right' });
      // The HIGH ROLLER bar: your chips and the payoff they make, on a line under the bar.
      if (m.note) drawText(ctx, m.note(this.chips), b.x + b.w, b.y + b.h + 12, T.small, m.color, { align: 'right' });
    }
    if (this.ability) this.drawAbility(ctx, time);
    else if (this.hint) drawChip(ctx, this.hint, x + HUD_W / 2, this.chipY, { scale: T.body, color: '#c8f0ff' });
  }

  /**
   * THE NEXT MOVE: one chip hanging from the panel's bottom edge: the ability's icon, its name and the turns left as
   * pips (the last pip, outlined red, is where it fires). The turn before, it turns red and says NEXT!
   */
  private drawAbility(ctx: CanvasRenderingContext2D, time: number): void {
    const ab = this.ability!;
    const ui = ABILITY_UI[ab.kind];
    // THE HOUSE cashes out on the turn AFTER its bar fills (cashPending), so it's a turn further off than the pips say:
    // the count read IN 3, IN 2, NEXT, NEXT (user playtest). Counting that turn: IN 4, IN 3, IN 2, NEXT.
    const total = ab.every + (ab.kind === 'jackpot' ? 1 : 0);
    const left = total - this.charge;
    const imminent = left <= 1 || this.alarm;
    const pulse = imminent ? 0.5 + 0.5 * Math.sin(time * 10) : 0;
    let cx = this.x + HUD_W / 2;
    if (this.alarm) cx += Math.sin(time * 40) * 2;
    const name = this.abilityLabel ?? abilityName(ab.kind);
    const pip = 14;
    const lit = Math.min(total, Math.round(this.charge));
    const k = 1 + this.abilityFlash * 0.12;
    // The pips' slot is as wide as NEXT! so the chip never changes width when it turns.
    const tw = Math.max(total * pip - 4, textWidth('NEXT!', T.body));
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(this.chipY));
    ctx.scale(k, k);
    drawChip(ctx, name, 0, 0, {
      scale: T.head,
      color: imminent ? (pulse > 0.5 ? '#ffffff' : '#ffb0a0') : KIT.text,
      fill: imminent ? '#4a1018' : KIT.fillLight,
      frame: imminent ? (pulse > 0.5 ? '#ff6a5a' : '#c8321f') : KIT.frame,
      iconW: 30,
      icon: (ix, iy) => drawSprite(ctx, ui.icon, ix, iy, 2.5 * this.chargePunch, { flash: Math.max(this.abilityFlash, pulse * 0.6) }),
      trail: {
        w: tw,
        draw: (px, py) => {
          if (imminent) {
            drawText(ctx, 'NEXT!', px + tw / 2, py + 1, T.body, pulse > 0.5 ? '#ffffff' : '#ff6a5a');
            return;
          }
          const x0 = px + (tw - (total * pip - 4)) / 2;
          for (let i = 0; i < total; i++) {
            const bx = Math.round(x0 + i * pip);
            const by = Math.round(py - 5);
            // The last pip is outlined red: the ability fires there (same as the enemy card before the fight).
            ctx.fillStyle = i === total - 1 ? '#ff5a4a' : COLORS.outline;
            ctx.fillRect(bx, by, 10, 10);
            ctx.fillStyle = i < lit ? '#ff9a3a' : '#140c1c';
            ctx.fillRect(bx + 2, by + 2, 6, 6);
          }
        },
      },
    });
    ctx.restore();
  }

  private bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fills: [number, string][], flash: number): void {
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#0b0712';
    ctx.fillRect(x, y, w, h);
    for (const [frac, color] of fills) {
      const fw = Math.max(0, Math.min(1, frac)) * w;
      if (fw <= 0) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, fw, h);
      // Top highlight + bottom shade for a chunky pixel bar.
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(x, y, fw, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x, y + h - 3, fw, 3);
    }
    if (flash > 0) {
      ctx.globalAlpha = Math.min(1, flash);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
    }
  }
}

/** Mix two #rrggbb colours (k 0 = a, 1 = b). */
function mixHex(a: string, b: string, k: number): string {
  const t = Math.max(0, Math.min(1, k));
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t)).join(',')})`;
}
