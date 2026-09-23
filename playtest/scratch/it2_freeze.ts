// Freeze variants via prototype wrap. npx tsx playtest/scratch/it2_freeze.ts
import { ARCHETYPES, makeEnemy } from '../../src/core/enemies';
import { cloneConfig } from '../../src/core/config';
import { effectiveSymbol } from '../../src/core/strip';
import { BASE, Fight, Rng } from './it2_lib';
const proto = Fight.prototype as any;
const orig = proto.applyStatus;
function distinct(this: any, me: any, foe: any, status: string, count: number, turns: number, reels: number[], events: any[]) {
  orig.call(this, me, foe, status, count, turns, reels, events);
  if (status !== 'frozen') return;
  const fr = foe.frozen.map((t: number, r: number) => (t > 0 ? r : -1)).filter((r: number) => r >= 0);
  const sym = (r: number) => effectiveSymbol(foe.reels[r].cells[foe.reels[r].stop]);
  for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length; j++) {
    const b = fr[j];
    if (sym(fr[i]) !== sym(b)) continue;
    const reel = foe.reels[b], L = reel.cells.length;
    for (const st of [(reel.stop + 1) % L, (reel.stop + L - 1) % L]) if (effectiveSymbol(reel.cells[st]) !== sym(fr[i])) { reel.stop = st; break; }
  }
}
function run(label: string, setup: () => void, mut?: (a: any) => void) {
  proto.applyStatus = orig; setup();
  const a = JSON.parse(JSON.stringify(ARCHETYPES.find((x) => x.id === 'frost'))); mut?.(a);
  const rng = new Rng(9); let l = 0, jp = 0, turns = 0, fz = 0, pt = 0; const n = 8000;
  for (let i = 0; i < n; i++) {
    const e = makeEnemy(a, 3, new Rng(i));
    const cfg = cloneConfig(BASE); cfg.player = { ...cfg.player, hp: 32, startHp: 32 }; cfg.enemy = { hp: e.hp, strips: e.strips, ability: e.ability };
    const f = new Fight(cfg, rng.int(0xffffffff));
    while (!f.over) { const s = f.next; const r = f.step(); if (s !== 'player') continue; pt++; const sp = r.events.find((x: any) => x.type === 'spin') as any; if (sp.frozen.some(Boolean)) fz++; if (sp.frozen.filter(Boolean).length >= 2 && sp.score.tier === 'triple') jp++; }
    if (f.winner !== 'player') l++; turns += f.turn;
  }
  console.log(`${label.padEnd(44)} loss ${(100 * l / n).toFixed(1)}%  turns ${(turns / n).toFixed(1)}  frozen-turn share ${(100 * fz / pt).toFixed(0)}%  jackpots on 2 frozen reels/fight ${(jp / n).toFixed(2)}`);
}
run('as-is', () => {});
run('frozen reels never share a symbol', () => (proto.applyStatus = distinct));
run('distinct + blizzard every 5', () => (proto.applyStatus = distinct), (a) => (a.ability.every = 5));
run('distinct + blizzard 1 reel x2 turns', () => (proto.applyStatus = distinct), (a) => (a.ability.power = 1));
run('distinct + strip ice 5->3, sword 5->7', () => (proto.applyStatus = distinct), (a) => (a.strip = { sword: 7, shield: 2, ice: 3 }));
run('distinct + ice 3/sword 7 + HP x1.25', () => (proto.applyStatus = distinct), (a) => { a.strip = { sword: 7, shield: 2, ice: 3 }; a.hpMul *= 1.25; });
run('distinct + ice 4, sword 6', () => (proto.applyStatus = distinct), (a) => (a.strip = { sword: 6, shield: 2, ice: 4 }));
