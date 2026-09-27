// Throwaway (SIGNOFF_RELICS): how often SHIELD BASH ends a fight at turn start (and a spin still plays after).
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER } from '../../src/core/cabinets';
import { Fight } from '../../src/core/fight';
import { SIM_BIAS, simulateRuns } from '../../src/sim/simulateRun';
let fights = 0, ghost = 0, ghostVoucher = 0;
const orig = Fight.prototype.step;
Fight.prototype.step = function (this: Fight) {
  if (this.turn === 0) fights++;
  const r = orig.call(this);
  const end = r.events.findIndex((e) => e.type === 'fightEnd');
  if (end >= 0 && r.events.slice(end).some((e) => e.type === 'spin')) {
    ghost++;
    if (r.events.slice(end).some((e) => e.type === 'voucher')) ghostVoucher++;
  }
  return r;
};
SIM_BIAS.startRelic = 'bash';
for (const cab of CABINET_ORDER) {
  fights = 0; ghost = 0; ghostVoucher = 0;
  simulateRuns(defaultConfig(), 300, 'greedy', 4242, cab, 2, true);
  console.log(cab, 'fights', fights, 'bash-kill ghost spins', ghost, `(${((100 * ghost) / fights).toFixed(1)}%)`, 'ghost vouchers', ghostVoucher);
}
