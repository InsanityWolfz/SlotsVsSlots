import { defaultConfig, type GameConfig } from '../src/core/config';
import { deep } from './deep';

// Targets: win 60-72%, turns 20-28, cleanse in >=40% of fights, enemy dmg/turn >= 1.1
const tri = (sw: number, sh: number, sl: number) => [0, 1, 2].map(() => ({ sword: sw, shield: sh, slime: sl }));
const strips: [string, ReturnType<typeof tri>][] = [
  ['444', tri(4, 4, 4)], ['534', tri(5, 3, 4)], ['435', tri(4, 3, 5)], ['525', tri(5, 2, 5)], ['624', tri(6, 2, 4)],
];
const rows: [number, string][] = [];
for (const php of [18, 20, 22, 25])
  for (const ehp of [26, 28, 30, 32, 35])
    for (const [en, strip] of strips)
      for (const sp of [8, 10]) {
        const c: GameConfig = defaultConfig();
        c.player.hp = php; c.enemy.hp = ehp; c.enemy.strips = strip.map((s) => ({ ...s })); c.specialDamage = sp;
        const d = deep(c, 4000, 5);
        if (d.win < 58 || d.win > 72 || d.turns > 29 || d.cleanseFightPct < 35 || d.eDmgTurn < 1.1) continue;
        rows.push([d.turns, `php ${php} ehp ${ehp} enemy ${en} sp ${sp} | win ${d.win.toFixed(0)} | turns ${d.turns.toFixed(1)} p90 ${d.t90} | cleanse% ${d.cleanseFightPct.toFixed(0)} | spec ${d.specials.toFixed(1)} spShare ${d.specialDmgShare.toFixed(0)} | whiff ${d.pWhiffPct.toFixed(0)} 0dmg4+ ${d.pZeroStreak4Pct.toFixed(0)} | close ${d.closePct.toFixed(0)} stomp ${d.stomp.toFixed(0)} | E dmg/t ${d.eDmgTurn.toFixed(2)} | endSlime ${d.endSlime.toFixed(0)}`]);
      }
rows.sort((a, b) => a[0] - b[0]);
console.log(rows.map((r) => r[1]).join('\n'));
