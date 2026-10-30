import { OverScreen } from './run/over';

/**
 * Canvas overlays between fights: the machine select, the draft, the next fight (or the path pick), the encounters,
 * the Cashier and the run-over screen. Each screen lives in its own file under `run/`, as one class chain
 * (base, build, cabinets, map, routes, enemyCard, draft, table, cardGames, claw, encounter, shop, over); this is the
 * finished class.
 */
export class RunScreens extends OverScreen {}

export { wrap, BADGE, BUILD, CHIP_SPOT, type ScreenMode } from './run/shared';
