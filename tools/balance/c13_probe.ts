// CONTENT_13 (throwaway): one machine, bare fights vs a dummy: does each charm do what it says? (damage / heal / chips per fight)
// C13=echo npx tsx tools/balance/c13_probe.ts <enh> <symbol> <cellsPerReel> [cab] [lvl]
import { STATS, useCab } from './c13_patch';
import { defaultConfig, UNIT, type Enh, type SymbolId } from '../../src/core/config';
import { Fight } from '../../src/core/fight';
import { CABINETS, type CabinetId } from '../../src/core/cabinets';

const enh = process.argv[2] as Enh;
const sym = (process.argv[3] ?? 'sword') as SymbolId;
const n = Number(process.argv[4] ?? 2);
const cab = (process.argv[5] ?? 'knight') as CabinetId;
const lvl = Number(process.argv[6] ?? 1);
useCab(cab);
function run(withCharm: boolean) {
  let turns = 0, dmg = 0, heal = 0, wins = 0;
  const T = 400;
  for (let i = 0; i < T; i++) {
    const cfg = defaultConfig();
    const strips = CABINETS[cab].strips.map((s) => ({ ...s }));
    cfg.player = { hp: 300, strips, gilded: withCharm ? [0, 1, 2].map((reel) => ({ reel, symbol: sym, enh, n })) : [], levels: { sym: {}, charm: { [enh]: lvl } } };
    cfg.enemy = { hp: 600, strips: [{ sword: 6, shield: 6 }, { sword: 6, shield: 6 }, { sword: 6, shield: 6 }], ability: null };
    cfg.relics = (process.env.RELIC ? [process.env.RELIC] : []) as never;
    cfg.cabinet = cab;
    const f = new Fight(cfg, 1000 + i);
    while (!f.over && f.turn < 400) {
      const r = f.step();
      for (const e of r.events) {
        if ((e.type === 'attack' || e.type === 'specialFire') && e.from === 'player') dmg += e.hpDamage;
        if (e.type === 'heal' && e.side === 'player') heal += e.amount;
      }
    }
    turns += f.turn;
    if (f.winner === 'player') wins++;
  }
  return `turns ${(turns / T).toFixed(1)} dmg/fight ${(dmg / T).toFixed(0)} heal/fight ${(heal / T).toFixed(0)} win ${((100 * wins) / T).toFixed(0)}%`;
}
console.log('without', run(false));
console.log('with   ', run(true), JSON.stringify(STATS));
void UNIT;
