// EXPERT_PLAYTEST_12 build check: THORNY's real values (the e12 prototype read LV4 = 50 from the start: Object.prototype.sig
// also answered levels.charm.sig). THORNY="0,50,60,70,80" BMUL=thorn.mirror:12 CABS=thorn npx tsx tools/balance/e12b_thorny.ts N
import { CHARM_VALUE } from '../../../src/core/charms';

if (process.env.THORNY) CHARM_VALUE.thorny = process.env.THORNY.split(',').map(Number);
console.log(`THORNY ${CHARM_VALUE.thorny.join('/')}`);
void import('./e12_tuesday');
