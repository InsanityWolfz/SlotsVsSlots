import type { FightStats, SideStats } from '../core/stats';
import type { Clock } from '../present/clock';
import { backOut, cubicOut } from '../present/ease';
import { COLORS, H, W } from '../present/layout';
import { drawText } from '../render/text';

type Row = [label: string, player: ((s: SideStats) => string) | null, enemy: ((s: SideStats) => string) | null];

const n = (k: keyof SideStats) => (s: SideStats) => String(s[k]);

const ROWS: Row[] = [
  ['SPINS', n('spins'), n('spins')],
  ['DAMAGE DEALT', n('damageDealt'), n('damageDealt')],
  ['DAMAGE BLOCKED', n('damageBlocked'), n('damageBlocked')],
  ['SHIELD GAINED', n('shieldGained'), n('shieldGained')],
  ['DOUBLES', n('pairs'), n('pairs')],
  ['JACKPOTS', n('triples'), n('triples')],
  ['NEAR-MISS HIT/ALL', (s) => `${s.nearMissHits}/${s.nearMisses}`, (s) => `${s.nearMissHits}/${s.nearMisses}`],
  ['BIGGEST HIT', n('biggestHit'), n('biggestHit')],
  ['LONGEST DRY SPELL', n('longestDrySpell'), n('longestDrySpell')],
  ['SPECIALS (DMG)', (s) => `${s.specials} (${s.specialDamage})`, null],
  ['ENERGY GAINED', n('energyGained'), null],
  ['SYMBOLS SLIMED', null, n('slimeApplied')],
  ['SLIME WASTED', null, n('slimeWasted')],
  ['CLEANSES (SYMBOLS)', (s) => `${s.cleanses} (${s.cellsCleansed})`, null],
  ['PEAK SLIME ON YOU', (s) => `${Math.round(s.peakSlimePct * 100)}%`, null],
];

/** Scale every integer inside a string by progress, so "3 (30)" ticks up as a whole. */
function tickString(s: string, p: number): string {
  return s.replace(/\d+/g, (d) => String(Math.round(Number(d) * p)));
}

export class Recap {
  visible = false;
  private slide = 0;
  private progress = 0;
  private stats: FightStats | null = null;

  constructor(
    private ui: Clock,
    private tick: (p: number) => void,
  ) {}

  async show(stats: FightStats): Promise<void> {
    this.stats = stats;
    this.visible = true;
    this.progress = 0;
    await this.ui.tween({ from: 0, to: 1, dur: 0.45, ease: backOut(1.4), onUpdate: (v) => (this.slide = v) });
    // Counter tick-up, accelerating (progress^1.6), tick interval 0.12 → 0.03.
    let nextTick = 0;
    let elapsed = 0;
    await this.ui.tween({
      dur: 1.6,
      ease: cubicOut,
      onUpdate: (v) => {
        const p = v ** 1.6;
        this.progress = p;
        elapsed = v * 1.6;
        if (elapsed >= nextTick && v < 1) {
          this.tick(p);
          nextTick = elapsed + 0.12 - 0.09 * v;
        }
      },
    });
    this.progress = 1;
  }

  hide(): void {
    this.visible = false;
    this.slide = 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible || !this.stats) return;
    const st = this.stats;
    ctx.fillStyle = `rgba(5,2,10,${0.7 * Math.min(1, this.slide)})`;
    ctx.fillRect(0, 0, W, H);
    const pw = 760;
    const ph = 590;
    const x = W / 2 - pw / 2;
    const y = (H - ph) / 2 - 20 + (1 - this.slide) * 400;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 6, y - 6, pw + 12, ph + 12);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x - 3, y - 3, pw + 6, ph + 6);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, y, pw, ph);

    const win = st.winner === 'player';
    drawText(ctx, win ? 'VICTORY' : 'DEFEAT', W / 2, y + 34, 6, win ? COLORS.goldLight : COLORS.danger);
    drawText(ctx, `${Math.ceil(st.turns / 2)} ROUNDS  -  SEED ${st.seed}`, W / 2, y + 70, 2, COLORS.textDim);

    const colP = x + 150;
    const colE = x + pw - 150;
    drawText(ctx, 'HERO', colP, y + 100, 3, COLORS.goldLight);
    drawText(ctx, 'SLIME KING', colE, y + 100, 3, COLORS.slime);
    ROWS.forEach(([label, pf, ef], i) => {
      const ry = y + 132 + i * 25;
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(x + 12, ry - 11, pw - 24, 23);
      }
      drawText(ctx, label, W / 2, ry, 2, COLORS.textDim);
      drawText(ctx, pf ? tickString(pf(st.sides.player), this.progress) : '-', colP, ry, 2, pf ? COLORS.text : '#4a4058');
      drawText(ctx, ef ? tickString(ef(st.sides.enemy), this.progress) : '-', colE, ry, 2, ef ? COLORS.text : '#4a4058');
    });
  }

  /** Where the recap's own buttons should sit. */
  get buttonY(): number {
    return (H - 590) / 2 - 20 + 590 - 4 + (1 - this.slide) * 400;
  }
}
