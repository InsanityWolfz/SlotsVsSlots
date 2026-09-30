/** Relics that act outside fights: charm-fit rules (GRAFT, KISS, STACKED) and after-fight relics (BANDAGE, PIGGY, TROPHY). */
import { defaultConfig } from '../../src/core/config';
import { Fight } from '../../src/core/fight';
import { charmSymbols, createRun, fightConfig, finishFight } from '../../src/core/run';
const base = defaultConfig();
const fits = (id: 'thorn' | 'knight' | 'joker', relics: string[], enh: 'gold' | 'vamp' | 'keen') => {
  const run = createRun(base, 5, id);
  run.player.relics.push(...(relics as never[]));
  return charmSymbols(run, enh).join(',');
};
console.log('GRAFT  gold fits (thorn):', fits('thorn', [], 'gold'), '| with graft:', fits('thorn', ['graft'], 'gold'));
console.log('KISS   vamp fits (knight):', fits('knight', [], 'vamp'), '| with kiss:', fits('knight', ['kiss'], 'vamp'));
console.log('STACKED keen fits (joker):', fits('joker', [], 'keen'), '| with stacked:', fits('joker', ['stacked'], 'keen'));
for (const relic of ['bandage', 'piggy', 'trophy']) {
  const out = [false, true].map((has) => {
    const run = createRun(base, 9, 'knight');
    if (has) run.player.relics.push(relic as never);
    run.player.chips = 20;
    const f = new Fight(fightConfig(run, base), 3);
    f.sides.player.hp = Math.round(f.sides.player.maxHp / 2);
    f.winner = 'player';
    finishFight(run, f);
    return `hp ${run.player.hp}/${run.player.maxHp} chips ${run.player.chips}`;
  });
  console.log(relic.toUpperCase().padEnd(8), 'without:', out[0], '| with:', out[1]);
}
