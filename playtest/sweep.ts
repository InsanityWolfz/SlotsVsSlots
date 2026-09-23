import { defaultConfig, type GameConfig } from '../src/core/config';
import { deep } from './deep';

const tri = (sw: number, sh: number, sl: number) => [0, 1, 2].map(() => ({ sword: sw, shield: sh, slime: sl }));
const out: string[] = [];
for (const php of [20, 25])
  for (const ehp of [30, 35, 40])
    for (const [en, strip] of [['444', tri(4, 4, 4)], ['543', tri(5, 4, 3)], ['534', tri(5, 3, 4)], ['633', tri(6, 3, 3)]] as const)
      for (const sp of [8, 10]) {
        const c: GameConfig = defaultConfig();
        c.player.hp = php; c.enemy.hp = ehp; c.enemy.strips = strip.map((s) => ({ ...s })); c.specialDamage = sp;
        const d = deep(c, 6000, 99);
        if (d.win < 55 || d.win > 75) continue;
        out.push(
          `php ${php} ehp ${ehp} enemy ${en} sp ${sp} | win ${d.win.toFixed(0)} | turns ${d.turns.toFixed(1)} p90 ${d.t90} | cleanse% ${d.cleanseFightPct.toFixed(0)} | spec ${d.specials.toFixed(1)} spShare ${d.specialDmgShare.toFixed(0)} | whiff ${d.pWhiffPct.toFixed(0)} | close ${d.closePct.toFixed(0)} stomp ${d.stomp.toFixed(0)} comeback ${d.comebackPct.toFixed(0)} | E dmg/t ${d.eDmgTurn.toFixed(2)} | leadCh ${d.leadChanges.toFixed(1)}`,
        );
      }
console.log(out.join('\n'));
