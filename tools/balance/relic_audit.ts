/**
 * RELIC AUDIT: does every relic (1) change the fight and (2) show that it fired?
 * For each relic, run the same seeded fights with and without it (on a machine it fits, with charms it needs),
 * and compare the player's totals. Also count how often the game tells the player (relic pop, score.relics,
 * a heal/resist/phoenix event naming it).
 * Usage: npx tsx tools/balance/relic_audit.ts [fights=60]
 */
import { defaultConfig, type Enh, type RelicId } from '../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../src/core/cabinets';
import type { CombatEvent } from '../../src/core/events';
import { Fight } from '../../src/core/fight';
import { RELICS } from '../../src/core/relics';
import { createRun, fightConfig } from '../../src/core/run';

const N = Number(process.argv[2] ?? 60);
const base = defaultConfig();

interface Totals { dealt: number; healed: number; shield: number; energy: number; won: number; turns: number; hpLeft: number; shown: number }

/** Relics that need a specific setup to do anything (a meter machine, wilds, a charm, missing HP). */
const SETUP: Partial<Record<RelicId, { machine?: CabinetId; charm?: Enh; sym?: string; hp?: number }>> = {
  battery: { machine: 'tesla' },
  fang: { machine: 'tesla', hp: 0.5 },
  overcharge: { machine: 'tesla' },
  prism: { machine: 'joker' },
  ticket: { charm: 'gold' },
  chalice: { charm: 'vamp' },
  kiss: { charm: 'vamp', sym: 'bolt', hp: 0.5 },
  graft: { machine: 'thorn', charm: 'gold', sym: 'thorn' },
  stacked: { machine: 'joker', charm: 'gold', sym: 'wild' },
};

function play(machine: CabinetId, relics: RelicId[], charm: Enh | undefined, seed: number, watch?: RelicId, sym?: string, hp = 1): Totals {
  const run = createRun(base, 1000 + seed, machine);
  run.player.relics.push(...relics);
  const cfg = fightConfig(run, base);
  if (charm) {
    // Give the charm a relic needs: 3 cells on each reel.
    const g = (cfg.player.gilded ??= []);
    const target = (sym ?? (charm === 'charged' ? 'bolt' : charm === 'lucky' ? 'shield' : 'sword')) as never;
    for (let r = 0; r < 3; r++) g.push({ reel: r, symbol: target, enh: charm, n: 3 });
  }
  const f = new Fight(cfg, 77 + seed);
  if (hp < 1) f.sides.player.hp = Math.round(f.sides.player.maxHp * hp);
  const t: Totals = { dealt: 0, healed: 0, shield: 0, energy: 0, won: 0, turns: 0, hpLeft: 0, shown: 0 };
  const seen = (e: CombatEvent) => {
    if (!watch) return;
    if (e.type === 'relic' && e.relic === watch) t.shown++;
    if (e.type === 'spin' && e.side === 'player' && (e.score.relics?.includes(watch) || e.lucky === watch)) t.shown++;
    if (e.type === 'heal' && e.source === watch) t.shown++;
    if (e.type === 'resist' && e.relic === watch) t.shown++;
    if (e.type === 'phoenix' && watch === 'phoenix') t.shown++;
  };
  for (let i = 0; i < 400 && !f.over; i++) {
    for (const e of f.step().events) {
      seen(e);
      if ((e.type === 'attack' || e.type === 'specialFire') && e.from === 'player') t.dealt += e.amount;
      if (e.type === 'heal' && e.side === 'player') t.healed += e.amount;
      if (e.type === 'shieldGain' && e.side === 'player') t.shield += e.amount;
      if (e.type === 'energyGain' && e.side === 'player') t.energy += e.amount;
    }
  }
  t.turns = f.turn;
  t.won = f.winner === 'player' ? 1 : 0;
  t.hpLeft = f.sides.player.hp;
  return t;
}

const rows: string[] = [];
for (const [id, def] of Object.entries(RELICS) as [RelicId, (typeof RELICS)[RelicId]][]) {
  if ((def as { retired?: boolean }).retired) continue;
  const setup = SETUP[id] ?? {};
  const machine = setup.machine ?? (def as { machine?: CabinetId }).machine ?? 'knight';
  if (!(CABINET_ORDER as string[]).includes(machine)) continue;
  const charm = setup.charm ?? (def as { charm?: Enh }).charm;
  const a: Totals = { dealt: 0, healed: 0, shield: 0, energy: 0, won: 0, turns: 0, hpLeft: 0, shown: 0 };
  const b = { ...a };
  for (let s = 0; s < N; s++) {
    const x = play(machine, [], charm, s, undefined, setup.sym, setup.hp);
    const y = play(machine, [id], charm, s, id, setup.sym, setup.hp);
    for (const k of Object.keys(a) as (keyof Totals)[]) {
      a[k] += x[k];
      b[k] += y[k];
    }
  }
  const pct = (k: keyof Totals) => (a[k] ? (((b[k] - a[k]) / a[k]) * 100).toFixed(0) : b[k] ? '+new' : '0') + '%';
  const changed = (['dealt', 'healed', 'shield', 'energy', 'won', 'turns', 'hpLeft'] as (keyof Totals)[]).some((k) => a[k] !== b[k]);
  const flag = !changed ? 'NO EFFECT?' : b.shown === 0 ? 'NEVER SHOWN?' : '';
  rows.push(`${id.padEnd(11)} ${machine.padEnd(7)} ${(charm ?? '-').padEnd(7)} win ${((a.won / N) * 100).toFixed(0)}->${((b.won / N) * 100).toFixed(0)}  dealt ${pct('dealt').padStart(6)} heal ${pct('healed').padStart(6)} shield ${pct('shield').padStart(6)} energy ${pct('energy').padStart(6)}  shown ${String(b.shown).padStart(4)}  ${flag}`);
}
console.log(`RELIC AUDIT (${N} seeded fights each, act 1 fight 1, with vs without)\n`);
console.log(rows.join('\n'));
