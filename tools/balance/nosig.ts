// Act 2 signatures off (does the game need them?): NOSIG=1 CABS=knight npx tsx tools/balance/nosig.ts N
import { CABINETS } from '../../src/core/cabinets';

if (process.env.NOSIG) for (const c of Object.values(CABINETS)) delete (c as { act2?: unknown }).act2;
console.log(`act 2 signatures ${process.env.NOSIG ? 'OFF' : 'on'}`);
void import('./e12_tuesday');
