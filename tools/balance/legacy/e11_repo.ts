// EXPERT_PLAYTEST_11 (throwaway): THE REPO MAN acts first (repossesses before your first spin, then every 3 of his
// turns). Runs e9_repo.ts with the patch. [GATE=...] npx tsx tools/balance/e11_repo.ts N stake
import { Fight } from '../../../src/core/fight';
const P = Fight.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
const oStep = P.step;
P.step = function (this: Record<string, unknown> & { sides: { enemy: { ability?: { kind: string }; charge: number }; player: unknown } }) {
  if (!this._repoFirst && this.sides.enemy.ability?.kind === 'repo') {
    this._repoFirst = true;
    (P.repossess as (...a: unknown[]) => unknown).call(this, this.sides.enemy, this.sides.player, []);
    this.sides.enemy.charge = 0;
  }
  return oStep.call(this);
};
await import('./e9_repo');
