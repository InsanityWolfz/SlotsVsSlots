// CASH CASSIDY tuning: the official table for one machine with MAKE IT RAIN's factor from env.
// PER=2 COST=10 CABS=midas npx tsx tools/balance/cassidy.ts N   (prints the RAIN numbers, then e12_tuesday's rows)
import { RAIN } from '../../src/core/fight';

if (process.env.PER) RAIN.perChip = Number(process.env.PER);
if (process.env.COST) RAIN.cost = Number(process.env.COST);
console.log(`RAIN perChip ${RAIN.perChip} cost ${RAIN.cost}`);
void import('./e12_tuesday');
