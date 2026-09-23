// Targeted checks: F1 death by archetype, frozen-jackpot repeats, is ice a buff, thief steal visibility.
import { ARCHETYPES, makeEnemy } from '../../src/core/enemies';
import { cloneConfig } from '../../src/core/config';
import { BASE, Fight, POLICIES, playRun, Rng } from './it1_lib';

// 1. F1 deaths by archetype (greedy, 6000 runs)
{
  const seeds = new Rng(4242), pr = new Rng(99), fr = new Rng(7);
  const n: Record<string, [number, number]> = {};
  for (let i = 0; i < 6000; i++) {
    const r = playRun(seeds.int(0xffffffff), POLICIES.relicFirst, pr, fr);
    for (const f of r.fights) {
      const k = `${f.arch}@F${f.depth + 1}`;
      const e = (n[k] ??= [0, 0]); e[0]++; if (!f.won) e[1]++;
    }
  }
  console.log('kill% by archetype@depth (relicFirst):');
  console.log(Object.entries(n).sort().map(([k, [a, d]]) => `${k} ${(100 * d / a).toFixed(1)}%`).join(' | '));
}

// 2. frost: frozen repeats and ice-as-dead comparison
{
  const rng = new Rng(3);
  const frost = makeEnemy(ARCHETYPES.find((a) => a.id === 'frost')!, 3, new Rng(1));
  const variants: [string, (s: any) => any][] = [
    ['frost as-is', (s) => s],
    ['frost, ice->shield', (s) => ({ sword: s.sword, shield: s.shield + s.ice })],
    ['frost, ice->nothing(empty)', (s) => ({ sword: s.sword, shield: s.shield, empty: s.ice })],
  ];
  for (const [name, f] of variants) {
    const cfg = cloneConfig(BASE);
    cfg.player = { ...cfg.player, hp: 32, startHp: 32 };
    cfg.enemy = { hp: frost.hp, strips: frost.strips.map(f), ability: name === 'frost as-is' ? frost.ability : null };
    let loss = 0, frozenTriples = 0, frozenTurns = 0, pturns = 0, allFrozen = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const fi = new Fight(cfg, rng.int(0xffffffff));
      while (!fi.over) {
        const side = fi.next;
        const r = fi.step();
        if (side !== 'player') continue;
        pturns++;
        const sp = r.events.find((e) => e.type === 'spin') as any;
        const nf = sp.frozen.filter(Boolean).length;
        if (nf) frozenTurns++;
        if (nf === 3) allFrozen++;
        if (nf >= 2 && sp.score.tier === 'triple') frozenTriples++;
      }
      if (fi.winner !== 'player') loss++;
    }
    console.log(`${name.padEnd(28)} loss ${(100 * loss / N).toFixed(1)}%  player turns w/ frozen reel ${(100 * frozenTurns / pturns).toFixed(0)}%  all-3-frozen ${(100 * allFrozen / pturns).toFixed(1)}%  jackpots on 2+frozen reels per fight ${(frozenTriples / N).toFixed(2)}`);
  }
}

// 3. triple frequency for player baseline
{
  const cfg = cloneConfig(BASE);
  cfg.player = { ...cfg.player, hp: 32, startHp: 32 };
  const golem = makeEnemy(ARCHETYPES.find((a) => a.id === 'slime')!, 3, new Rng(1));
  cfg.enemy = { hp: 999, strips: [{ shield: 1 }, { shield: 1 }, { shield: 1 }], ability: null };
  void golem;
  const f = new Fight(cfg, 5);
  let t = 0, p = 0, s = 0;
  for (let i = 0; i < 40000; i++) {
    const r = f.step();
    const sp = r.events.find((e) => e.type === 'spin') as any;
    if (sp.side !== 'player') continue;
    s++; if (sp.score.tier === 'triple') t++; if (sp.score.tier === 'pair') p++;
    if (f.sides.player.hp < 5) f.sides.player.hp = 32;
  }
  console.log(`player base strip: pair ${(100 * p / s).toFixed(1)}%  triple ${(100 * t / s).toFixed(1)}% per spin`);
}
