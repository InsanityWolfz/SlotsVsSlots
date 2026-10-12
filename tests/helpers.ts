import { makeEnemy, REPO_MAN } from '../src/core/enemies';
import { Rng } from '../src/core/rng';
import type { RunState } from '../src/core/run';

/** Put THE REPO MAN up as the run's next fight (he's a regular on act 1-2 routes, not a fixed stop). */
export function faceRepoMan(run: RunState): void {
  run.enemies[run.depth] = makeEnemy(REPO_MAN, 3, new Rng(run.seed), false, run.act);
}
