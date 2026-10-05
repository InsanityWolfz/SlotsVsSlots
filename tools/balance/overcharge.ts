// TESLA's OVERCHARGE: OC=0.5 CABS=tesla npx tsx tools/balance/overcharge.ts N
import { OVERCHARGE } from '../../src/core/relics';

if (process.env.OC) OVERCHARGE.lightning = Number(process.env.OC);
console.log(`OVERCHARGE lightning +${OVERCHARGE.lightning * 100}%`);
void import('./e12_tuesday');
