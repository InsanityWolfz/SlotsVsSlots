// EXPERT_PLAYTEST_11 (throwaway): the official tuesday.ts table under the e11_patch env patches. npx tsx tools/balance/e11_tuesday.ts N
import { PATCH_LABEL } from './e11_patch';
console.log(`PATCH ${PATCH_LABEL}`);
await import('./tuesday');
