import type { AbilityDef, AbilityKind, SideId } from '../core/config';
import { artId, drawSprite, type SpriteId } from '../render/sprites';
import { drawText } from '../render/text';
import { COLORS, HUD_TOP, MACHINE_CX } from './layout';

export const HUD_W = 330;
export const SHIELD_SOFT_CAP = 20;

export const ABILITY_UI: Record<AbilityKind, { icon: SpriteId; label: string }> = {
  flood: { icon: 'icoFlood', label: 'FLOOD' },
  smash: { icon: 'icoSmash', label: 'SMASH' },
  fortify: { icon: 'shieldIcon', label: 'FORTIFY' },
  blizzard: { icon: 'icoFreeze', label: 'BLIZZARD' },
  pilfer: { icon: 'icoSteal', label: 'PILFER' },
  quake: { icon: 'icoRock', label: 'QUAKE' },
  jam: { icon: 'icoLock', label: 'JAM' },
  jackpot: { icon: 'icoCoin', label: 'CASH OUT' },
  carpet: { icon: artId('icoBomb'), label: 'CARPET BOMB' },
  curse: { icon: artId('icoHex'), label: 'CURSE' },
  bloodmoon: { icon: artId('icoDrain'), label: 'BLOOD MOON' },
  gulp: { icon: artId('icoGulp'), label: 'GULP' },
  reflect: { icon: artId('icoReflect'), label: 'REFLECTION' },
  earth: { icon: artId('icoEarth'), label: 'EARTH' },
  launder: { icon: artId('icoLaunder'), label: 'LAUNDER' },
  mark: { icon: artId('icoMark'), label: 'STACKED DECK' },
  penalty: { icon: artId('icoGavel'), label: 'PENALTY' },
  houseTake: { icon: artId('icoRake'), label: "HOUSE'S TAKE" },
  deal: { icon: artId('icoShuffle'), label: 'THE DEAL' },
};

/** Displayed (tweened) values for one side's bars — never read from game state mid-animation. */
export class HudView {
  hp: number;
  ghost: number;
  maxHp: number;
  shield = 0;
  /** Pips lit (can be fractional mid-fill). */
  energy = 0;
  energyMax: number;
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

  constructor(
    readonly side: SideId,
    maxHp: number,
    readonly hasSpecial: boolean,
    energyMax: number,
    opts: { name?: string; portrait?: string; ability?: AbilityDef | null; energy?: number } = {},
  ) {
    this.name = opts.name ?? (side === 'player' ? 'HERO' : 'ENEMY');
    this.portrait = (opts.portrait ?? (side === 'player' ? 'playerPortrait' : 'enemyPortrait')) as SpriteId;
    this.ability = opts.ability ?? null;
    this.energy = opts.energy ?? 0;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.ghost = maxHp;
    this.energyMax = energyMax;
    this.pipPunch = Array(energyMax).fill(1);
  }

  get x(): number {
    return MACHINE_CX[this.side] - HUD_W / 2;
  }

  hpBar() {
    return { x: this.x + 64, y: HUD_TOP + 34, w: HUD_W - 64, h: 22 };
  }
  shieldBar() {
    return { x: this.x + 64, y: HUD_TOP + 66, w: HUD_W - 64, h: 16 };
  }
  pipPos(i: number) {
    return { x: this.x + 88 + i * 34, y: HUD_TOP + 106 };
  }
  /** Where damage numbers / projectiles aim for this side. */
  get anchor() {
    const b = this.hpBar();
    return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    const x = this.x;
    const y = HUD_TOP;
    const h = this.hasSpecial || this.ability ? 128 : 96;

    // Panel.
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 8, y - 8, HUD_W + 16, h + 16);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x - 5, y - 5, HUD_W + 10, h + 10);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x - 2, y - 2, HUD_W + 4, h + 4);

    // Portrait.
    const ps = this.portraitShake * (Math.random() * 2 - 1);
    ctx.fillStyle = COLORS.panelLight;
    ctx.fillRect(x + 4, y + 30, 52, 52);
    drawSprite(ctx, this.portrait, x + 30 + ps, y + 56, 2, { flash: this.portraitFlash });
    drawText(ctx, this.name, x + 4, y + 12, 2, this.side === 'player' ? COLORS.goldLight : COLORS.slime, {
      align: 'left',
    });
    if (this.ooze > 0) {
      const pct = this.ooze / Math.max(1, this.oozeTotal);
      drawText(ctx, `OOZE ${this.ooze}/${this.oozeTotal}`, x + HUD_W - 4, y + 12, 2, pct >= 0.5 && Math.sin(time * 8) > 0 ? '#b6ff9a' : COLORS.slime, {
        align: 'right',
        punch: this.oozePunch,
      });
    }

    // HP bar with trailing ghost.
    const hb = this.hpBar();
    const sh = this.hpShake * (Math.random() * 2 - 1);
    const hx = hb.x + sh;
    drawSprite(ctx, 'heart', hx - 12 + 2, hb.y + hb.h / 2, 2);
    this.bar(ctx, hx + 6, hb.y, hb.w - 6, hb.h, [
      [this.ghost / this.maxHp, COLORS.hpGhost],
      [this.hp / this.maxHp, COLORS.hp],
    ], this.hpFlash);
    const low = this.hp / this.maxHp <= 0.25 && this.hp > 0;
    drawText(ctx, `${Math.ceil(this.hp)}/${this.maxHp}`, hx + 6 + (hb.w - 6) / 2, hb.y + hb.h / 2 + 1, 2, low && Math.sin(time * 10) > 0 ? '#ffb0b0' : COLORS.text);

    // Shield bar (no max; fills to a soft cap).
    const sb = this.shieldBar();
    const ss = this.shieldShake * (Math.random() * 2 - 1);
    drawSprite(ctx, 'shieldIcon', sb.x - 10 + ss + 2, sb.y + sb.h / 2, 2, { alpha: this.shield > 0 ? 1 : 0.4 });
    this.bar(ctx, sb.x + 6 + ss, sb.y, sb.w - 6, sb.h, [[Math.min(1, this.shield / SHIELD_SOFT_CAP), COLORS.shield]], this.shieldFlash);
    if (this.shield > 0.01)
      drawText(ctx, `${Math.round(this.shield)}`, sb.x + 6 + (sb.w - 6) / 2 + ss, sb.y + sb.h / 2 + 1, 2, COLORS.text);

    // Special pips.
    if (this.hasSpecial) {
      drawSprite(ctx, 'boltIcon', x + 64, y + 106, 2);
      for (let i = 0; i < this.energyMax; i++) {
        const p = this.pipPos(i);
        const lit = Math.max(0, Math.min(1, this.energy - i));
        drawSprite(ctx, 'pipEmpty', p.x, p.y, 3);
        if (lit > 0) {
          const pulse = this.energy >= this.energyMax - 0.01 ? 0.3 + 0.3 * Math.sin(time * 18) : 0;
          drawSprite(ctx, 'pipFull', p.x, p.y, 3 * this.pipPunch[i], { alpha: lit, flash: Math.max(pulse, this.energyFlash) });
        }
      }
      drawText(ctx, 'SPECIAL', x + HUD_W - 4, y + 106, 2, this.energy >= this.energyMax ? COLORS.energy : COLORS.textDim, { align: 'right' });
    }
    if (this.ability) this.drawAbility(ctx, x, y + 106, time);
  }

  /** Passive telegraph: what the enemy's special does and how many turns until it fires. */
  private drawAbility(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
    const ab = this.ability!;
    const ui = ABILITY_UI[ab.kind];
    const left = ab.every - this.charge;
    const imminent = left <= 1 || this.alarm;
    const pulse = imminent ? 0.5 + 0.5 * Math.sin(time * 10) : 0;
    if (this.alarm) x += Math.sin(time * 40) * 2;
    drawSprite(ctx, ui.icon, x + 70, y, 2 * this.chargePunch, { flash: Math.max(this.abilityFlash, pulse * 0.6) });
    for (let i = 0; i < ab.every; i++) {
      const px = x + 92 + i * 14;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(px - 6, y - 6, 12, 12);
      ctx.fillStyle = i < this.charge ? (imminent ? '#ff5a4a' : '#ff9a3a') : '#2a2038';
      ctx.fillRect(px - 4, y - 4, 8, 8);
    }
    const label = imminent ? `${ui.label} NEXT!` : `${ui.label} IN ${left}`;
    drawText(ctx, label, x + HUD_W - 4, y, 2, imminent ? (pulse > 0.5 ? '#ffffff' : '#ff6a5a') : COLORS.textDim, { align: 'right', punch: 1 + this.abilityFlash * 0.3 });
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
