import { createRun, optionDeltas, applyOption } from '../../src/core/run';
import { BASE } from './it6_lib';
const run = createRun(BASE, 5, 'knight');
run.act = 2;
for (const o of [
  { kind: 'gild', enh: 'lucky', symbol: 'shield', reel: 0 },
  { kind: 'gild', enh: 'vamp', symbol: 'sword', reel: 0 },
  { kind: 'gild', enh: 'blaze', symbol: 'bolt', reel: 0 },
  { kind: 'gild', enh: 'gold', symbol: 'sword', reel: 0 },
] as any[]) console.log(o.enh, JSON.stringify(optionDeltas(run, o, BASE)));
// legendaries in stat lines: bell/key
run.player.gilded = [0, 1, 2].map((reel) => ({ reel, symbol: 'sword', enh: 'gold' })) as any;
const o = { kind: 'add', symbol: 'sword', reel: 0, count: 2 } as any;
console.log('no legend', JSON.stringify(optionDeltas(run, o, BASE)));
run.player.relics = ['bell', 'key'];
console.log('bell+key ', JSON.stringify(optionDeltas(run, o, BASE)));
void applyOption;
