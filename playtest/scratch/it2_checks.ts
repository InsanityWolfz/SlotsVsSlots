// Freeze behaviour after the fix + relic x enemy single-fight loss table. npx tsx playtest/scratch/it2_checks.ts
import { ARCHETYPES, BOSS, makeEnemy } from '../../src/core/enemies';
import { cloneConfig, type RelicId } from '../../src/core/config';
import { BASE, Fight, Rng } from './it2_lib';

const N = 8000;
function cfgFor(arch: string, depth: number, relics: RelicId[], hp = 32, mut?: (s: any) => any, noAbility = false) {
  const a = arch === 'house' ? BOSS : ARCHETYPES.find((x) => x.id === arch)!;
  const e = makeEnemy(a, depth, new Rng(depth * 7 + 1), arch === 'house');
  const cfg = cloneConfig(BASE);
  cfg.player = { ...cfg.player, hp, startHp: hp };
  cfg.enemy = { hp: e.hp, strips: mut ? e.strips.map(mut) : e.strips, ability: noAbility ? null : e.ability, boss: e.boss };
  cfg.relics = relics;
  return cfg;
}

// 1. Freeze
{
  const rng = new Rng(3);
  const variants: [string, any][] = [
    ['frost F4 as-is', cfgFor('frost', 3, [])],
    ['frost F4 + mittens', cfgFor('frost', 3, ['mittens'])],
    ['frost F4 ice->empty, no blizzard', cfgFor('frost', 3, [], 32, (s) => ({ sword: s.sword, shield: s.shield, empty: s.ice }), true)],
    ['frost F4 ice->shield, no blizzard', cfgFor('frost', 3, [], 32, (s) => ({ sword: s.sword, shield: s.shield + s.ice }), true)],
  ];
  for (const [name, cfg] of variants) {
    let loss = 0, pt = 0, fzT = 0, fz2 = 0, jpFz = 0, jpAll = 0, pairFz = 0, dmgTaken = 0;
    const jpSym: Record<string, number> = {};
    const frozenOn: Record<string, number> = {};
    for (let i = 0; i < N; i++) {
      const f = new Fight(cfg, rng.int(0xffffffff));
      while (!f.over) {
        const side = f.next;
        const r = f.step();
        for (const e of r.events) if (e.type === 'freeze' && e.to === 'player') for (let k = 0; k < e.targets.length; k++) { const reel = f.sides.player.reels[e.targets[k]]; const c = reel.cells[e.stops[k]]; const s = c.stolen ? 'empty' : c.slimed ? 'slime' : c.symbol; frozenOn[s] = (frozenOn[s] ?? 0) + 1; }
        if (side !== 'player') continue;
        pt++;
        const sp = r.events.find((e) => e.type === 'spin') as any;
        const n = sp.frozen.filter(Boolean).length;
        if (n) fzT++;
        if (n >= 2) fz2++;
        if (sp.score.tier === 'triple') { jpAll++; if (n >= 1) { jpFz++; jpSym[sp.score.tierSymbol] = (jpSym[sp.score.tierSymbol] ?? 0) + 1; } }
        if (n >= 1 && sp.score.tier === 'pair') pairFz++;
      }
      if (f.winner !== 'player') loss++;
      dmgTaken += 32 - f.sides.player.hp;
    }
    console.log(`${name.padEnd(36)} loss ${(100 * loss / N).toFixed(1)}%  dmg taken ${(dmgTaken / N).toFixed(1)}  turns w/ frozen ${(100 * fzT / pt).toFixed(0)}%  2+ frozen ${(100 * fz2 / pt).toFixed(0)}%  jackpots/fight ${(jpAll / N).toFixed(2)} (with a frozen reel ${(jpFz / N).toFixed(2)}: ${JSON.stringify(jpSym)})  frozen-on ${JSON.stringify(frozenOn)}`);
  }
}

// 2. relic x enemy single-fight loss (32 HP, base kit); boss at 40 HP
{
  const relics: (RelicId | null)[] = [null, 'mirror', 'battery', 'fang', 'whetstone', 'clover', 'dice', 'crown', 'hourglass', 'bandage', 'soap', 'magnet', 'pickaxe', 'mittens', 'lockpick', 'mousetrap'];
  const enemies: [string, number, number][] = [['slime', 3, 32], ['brute', 3, 32], ['frost', 3, 32], ['thief', 3, 32], ['golem', 3, 32], ['gremlin', 3, 32], ['house', 5, 40]];
  console.log('\nsingle-fight LOSS % (base kit, F4 enemies @32HP, boss @40HP), 6000 fights each');
  console.log('relic       ' + enemies.map(([e]) => e.padStart(8)).join(''));
  const rng = new Rng(11);
  for (const r of relics) {
    const row = enemies.map(([e, d, hp]) => {
      const cfg = cfgFor(e, d, r ? [r] : [], hp);
      let loss = 0;
      for (let i = 0; i < 6000; i++) { const f = new Fight(cfg, rng.int(0xffffffff)); while (!f.over) f.step(); if (f.winner !== 'player') loss++; }
      return (100 * loss / 6000).toFixed(1).padStart(8);
    });
    console.log(`${(r ?? '(none)').padEnd(12)}${row.join('')}`);
  }
}
