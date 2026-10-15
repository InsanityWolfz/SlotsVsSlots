import { UNIT, type AbilityDef, type AbilityKind, type SideId } from '../core/config';
import type { MeterKind } from '../core/cabinets';
import { artId, drawSprite, type SpriteId } from '../render/sprites';
import { drawText, fmtNum } from '../render/text';
import { COLORS, HUD_TOP, MACHINE_CX } from './layout';

export const HUD_W = 330;
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

/** THE SCORE RACE: an enemy's ability is a CHEAT, named as one (the rival machines cheat; they don't attack). */
export const RACE_CHEAT: Partial<Record<AbilityKind, string>> = { flood: 'GUNK', blizzard: 'ICE UP', quake: 'ROCK DROP', jam: 'JAM', pilfer: 'PICKPOCKET', smash: 'BIG BET', repo: 'REPO', jackpot: 'CASH OUT' };
/** An ability's name on screen (its cheat name in a race). */
export const abilityName = (kind: AbilityKind, race = false): string => (race ? RACE_CHEAT[kind] : undefined) ?? ABILITY_UI[kind].label;
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
  bets: { icon: artId('icoBets'), label: 'NO MORE BETS' },
  launder: { icon: artId('icoLaunder'), label: 'LAUNDER' },
  mark: { icon: artId('icoMark'), label: 'STACKED DECK' },
  penalty: { icon: artId('icoGavel'), label: 'PENALTY' },
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
  /** THE SCORE RACE (sandbox): the HP bar is a score bar, filled against the rival's score. */
  race = false;
  /** THE SCORE RACE: the most GUARDS you can hold (the shield field counts them). */
  guardCap = 3;
  score = 0;
  rival = 0;
  scorePunch = 1;
  /** THE SCORE RACE: a live line in the rival's guard row (GOLEM: its rocks on your reels and what they score). */
  raceNote?: () => string;

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
    return MACHINE_CX[this.side] - HUD_W / 2;
  }

  hpBar() {
    return { x: this.x + 80, y: HUD_TOP + 34, w: HUD_W - 80, h: 22 };
  }
  shieldBar() {
    return { x: this.x + 80, y: HUD_TOP + 66, w: HUD_W - 80, h: 16 };
  }
  get hasSpecial(): boolean {
    return !!this.meter;
  }
  /** The meter bar (TESLA, MIDAS, JAX): one bar with a number, not pips. */
  meterBar() {
    return { x: this.x + 80, y: HUD_TOP + 98, w: HUD_W - 86, h: 16 };
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

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    const x = this.x;
    const y = HUD_TOP;
    const h = this.hasSpecial || this.ability || this.hint ? 128 : 96;

    // Panel.
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 8, y - 8, HUD_W + 16, h + 16);
    // Low HP: your frame pulses red (with the screen's red edges and the heartbeat: feel playtest).
    const lowHp = !this.race && this.side === 'player' && this.hp > 0 && this.hp < this.maxHp * 0.3;
    ctx.fillStyle = lowHp ? mixHex(COLORS.gold, COLORS.danger, 0.55 + 0.45 * Math.sin(time * Math.PI * 1.8)) : COLORS.gold;
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
      drawText(ctx, `SLIME ${this.ooze}/${this.oozeTotal}`, x + HUD_W - 4, y + 12, 2, pct >= 0.5 && Math.sin(time * 8) > 0 ? '#b6ff9a' : COLORS.slime, {
        align: 'right',
        punch: this.oozePunch,
      });
    }

    // HP bar with trailing ghost.
    const hb = this.hpBar();
    const sh = this.hpShake * (Math.random() * 2 - 1);
    const hx = hb.x + sh;
    if (this.race) {
      // THE SCORE RACE: the bar fills against whoever leads; the leader's bar is full.
      this.scorePunch += (1 - this.scorePunch) * 0.15;
      const lead = this.score >= this.rival && this.score > 0;
      this.bar(ctx, hx + 6, hb.y, hb.w - 6, hb.h, [[this.score / Math.max(1, this.score, this.rival), this.side === 'player' ? COLORS.gold : COLORS.hp]], this.hpFlash);
      drawText(ctx, `SCORE ${fmtNum(this.score)}`, hx + 6 + (hb.w - 6) / 2, hb.y + hb.h / 2 + 1, 2, lead ? '#fff6c0' : COLORS.text, { punch: this.scorePunch });
    } else {
      // Heart and shield sit in one column between the portrait box and the bars.
      drawSprite(ctx, 'heart', x + 68 + sh, hb.y + hb.h / 2, 2);
      this.bar(ctx, hx + 6, hb.y, hb.w - 6, hb.h, [
        [this.ghost / this.maxHp, COLORS.hpGhost],
        [this.hp / this.maxHp, COLORS.hp],
      ], this.hpFlash);
      const low = this.hp / this.maxHp <= 0.25 && this.hp > 0;
      drawText(ctx, `${fmtNum(Math.ceil(this.hp))}/${fmtNum(this.maxHp)}`, hx + 6 + (hb.w - 6) / 2, hb.y + hb.h / 2 + 1, 2, low && Math.sin(time * 10) > 0 ? '#ffb0b0' : COLORS.text);
    }

    // Shield bar (no max; fills to a soft cap).
    const sb = this.shieldBar();
    const ss = this.shieldShake * (Math.random() * 2 - 1);
    // (In a race the rival holds no guards: its row is a note, or empty.)
    if (!this.race || this.side === 'player') drawSprite(ctx, 'shieldIcon', x + 68 + ss, sb.y + sb.h / 2, 2, { alpha: this.shield > 0 ? 1 : 0.4 });
    if (this.race && this.side === 'player') {
      // THE SCORE RACE: GUARDS, a pip each (lit while held); each blocks one cheat.
      for (let k = 0; k < this.guardCap; k++) {
        const px = sb.x + 14 + k * 22 + ss;
        ctx.fillStyle = COLORS.outline;
        ctx.fillRect(px - 8, sb.y, 16, sb.h);
        ctx.fillStyle = k < Math.round(this.shield) ? COLORS.shield : '#1a2a3a';
        ctx.fillRect(px - 6, sb.y + 2, 12, sb.h - 4);
      }
      drawText(ctx, this.shield >= 1 ? 'GUARDED' : 'NO GUARD', sb.x + 14 + this.guardCap * 22 + 4 + ss, sb.y + sb.h / 2 + 1, 1.5, this.shield >= 1 ? '#9fd0ff' : COLORS.textDim, { align: 'left' });
    } else if (this.race && this.raceNote) {
      const note = this.raceNote();
      if (note) drawText(ctx, note, sb.x + 8 + ss, sb.y + sb.h / 2 + 1, 1.5, COLORS.text, { align: 'left' });
    } else if (!this.race) {
      this.bar(ctx, sb.x + 6 + ss, sb.y, sb.w - 6, sb.h, [[Math.min(1, this.shield / SHIELD_SOFT_CAP), COLORS.shield]], this.shieldFlash);
      if (this.shield > 0.01)
        drawText(ctx, `${Math.round(this.shield)}`, sb.x + 6 + (sb.w - 6) / 2 + ss, sb.y + sb.h / 2 + 1, 2, COLORS.text);
    }

    // The signature meter (TESLA, MIDAS, JAX, THE JUKEBOX).
    const m = this.meter;
    if (m) {
      drawSprite(ctx, m.icon, x + 64, y + 106, m.icon === 'boltIcon' ? 2 : 1.5);
      // One bar with a number: how much you have / how much it takes.
      const b = this.meterBar();
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
      drawText(ctx, label, b.x + 6, b.y + b.h / 2 + 1, 1.5, '#ffffff', { align: 'left' });
      // THE JUKEBOX counts its volume in levels (4/6), like its cards do.
      const count = m.kind === 'volume' ? `${Math.floor(this.energy + 0.01)}/${this.energyMax}` : `${Math.round(this.energy * UNIT)}/${this.energyMax * UNIT}`;
      drawText(ctx, count, b.x + b.w - 6, b.y + b.h / 2 + 1, 1.5, '#ffffff', { align: 'right' });
      // The HIGH ROLLER bar: your chips and the payoff they make, on a line under the bar.
      if (m.note) drawText(ctx, m.note(this.chips), b.x + b.w - 6, b.y + b.h + 9, 1.25, m.color, { align: 'right' });
    }
    if (this.ability) this.drawAbility(ctx, x, y + 106, time);
    else if (this.hint) drawText(ctx, this.hint, x + HUD_W - 4, y + 106, 1.5, '#c8f0ff', { align: 'right' });
  }

  /** Passive telegraph: what the enemy's special does and how many turns until it fires. */
  private drawAbility(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
    const ab = this.ability!;
    const ui = ABILITY_UI[ab.kind];
    // THE HOUSE cashes out on the turn AFTER its bar fills (cashPending), so it's a turn further off than the pips say:
    // the count read IN 3, IN 2, NEXT, NEXT (user playtest). Counting that turn: IN 4, IN 3, IN 2, NEXT.
    const left = ab.every - this.charge + (ab.kind === 'jackpot' ? 1 : 0);
    const imminent = left <= 1 || this.alarm;
    const pulse = imminent ? 0.5 + 0.5 * Math.sin(time * 10) : 0;
    if (this.alarm) x += Math.sin(time * 40) * 2;
    drawSprite(ctx, ui.icon, x + 70, y, 2.5 * this.chargePunch, { flash: Math.max(this.abilityFlash, pulse * 0.6) });
    for (let i = 0; i < ab.every; i++) {
      const px = x + 92 + i * 14;
      // The last pip is outlined red: the ability fires there (same as the enemy card before the fight).
      ctx.fillStyle = i === ab.every - 1 ? '#ff5a4a' : COLORS.outline;
      ctx.fillRect(px - 6, y - 6, 12, 12);
      ctx.fillStyle = i < this.charge ? (imminent ? '#ff5a4a' : '#ff9a3a') : '#2a2038';
      ctx.fillRect(px - 4, y - 4, 8, 8);
    }
    const name = this.abilityLabel ?? abilityName(ab.kind, this.race);
    // "ALL IN IN 2" read badly (playtest C): a name ending in IN reads "ALL IN: 2 TURNS".
    const label = imminent ? `${name} NEXT!` : / IN$/.test(name) ? `${name}: ${left} TURN${left === 1 ? '' : 'S'}` : `${name} IN ${left}`;
    // A long label (NO MORE BETS NEXT!) steps down a size so it clears the pips.
    const size = label.length > 14 ? 1.5 : 2;
    drawText(ctx, label, x + HUD_W - 4, y, size, imminent ? (pulse > 0.5 ? '#ffffff' : '#ff6a5a') : COLORS.textDim, { align: 'right', punch: 1 + this.abilityFlash * 0.3 });
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
