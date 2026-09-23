// Repro G1: previewing a TIER II card (optionDeltas -> stripsAfter -> applyOption on a shallow copy) upgrades the REAL gilds.
import { defaultConfig } from '../../src/core/config';
import { createRun, optionDeltas, tierUps } from '../../src/core/run';
const run = createRun(defaultConfig(), 1, 'tesla');
run.act = 2;
const up = tierUps(run)[0];
console.log('before preview:', JSON.stringify(run.player.gilded));
optionDeltas(run, up, defaultConfig());
console.log('after  preview:', JSON.stringify(run.player.gilded));
