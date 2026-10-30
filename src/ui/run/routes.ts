import { type Stop } from '../../core/enemies';
import { endlessScore, NIGHTS, nightOf, type RunState } from '../../core/run';
import { COLORS } from '../../present/layout';
import { drawSprite } from '../../render/sprites';
import { drawText, fmtNum } from '../../render/text';
import { ROUTES, ROUTE_STOPS, laneY, MapTip, CX } from './shared';
import { MapScreens } from './map';

export abstract class RouteScreen extends MapScreens {
  /** CHOOSE YOUR PATH: the act's routes as lanes (every stop shown). Tap a lane, then take it. */
  protected showRoutes(run: RunState): void {
    this.routeSel = -1;
    this.cards = run.map.routes.map((_, i) => {
      const h = this.hit(ROUTES.x0 + ((ROUTE_STOPS - 1) * ROUTES.gap) / 2, laneY(i, run.map.routes.length), ROUTE_STOPS * ROUTES.gap + 40, ROUTES.lane, () => {
        this.routeSel = i;
        take.enabled = true;
        take.label = `TAKE PATH ${i + 1}`;
      });
      h.scale = 1;
      return h;
    });
    const take = this.btn('PICK A PATH', CX, 588, 360, 52, () => this.routeSel >= 0 && this.cb.onRoute(this.routeSel));
    take.enabled = false;
    this.buttons = [take];
  }

  /** CHOOSE YOUR PATH: the opener behind you, the routes as lanes, then the Cashier and the boss they share. */
  protected drawRoutes(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    const m = run.map;
    const act = run.endless ? `LOOP ${run.endless.loop}` : `ACT ${run.act}`;
    drawText(ctx, `${act} - CHOOSE YOUR PATH`, CX, 30, 3, COLORS.goldLight);
    const night = nightOf(run);
    if (run.endless?.nights?.length) drawText(ctx, "EACH PATH HAS ITS OWN RULE FOR BOTH MACHINES (TONIGHT'S RULE). TAP A PATH, THEN TAKE IT.", CX, 62, 1.5, '#ffd23f');
    else if (night) drawText(ctx, `TONIGHT'S RULE: ${night.title}. ${night.text}, FOR BOTH MACHINES.`, CX, 62, 1.5, '#ffd23f');
    else drawText(ctx, 'EVERY STOP IS SHOWN. TAP A PATH, THEN TAKE IT.', CX, 62, 1.5, COLORS.textDim);
    // ENDLESS: the score so far, on screen (playtest: it only showed on the bust screen).
    if (run.endless) drawText(ctx, `SCORE SO FAR ${fmtNum(endlessScore(run))}`, CX, 86, 1.5, COLORS.goldLight);
    const midY = ROUTES.y[1];
    const lastX = ROUTES.x0 + (ROUTE_STOPS - 1) * ROUTES.gap;
    let tip: MapTip | null = null;
    // The shared ends: the opener (done) on the left, the Cashier and the boss on the right.
    const ends = [
      { st: { kind: 'fight', enemy: m.opener } as Stop, x: ROUTES.opener, done: true },
      ...(m.shopBeforeBoss ? [{ st: { kind: 'shop' } as Stop, x: ROUTES.shop, done: false }] : []),
      { st: { kind: 'fight', enemy: m.boss } as Stop, x: ROUTES.boss, done: false },
    ];
    // Lanes: a panel per route (lit when hovered or picked), its line, its stops.
    m.routes.forEach((route, i) => {
      const y = laneY(i, m.routes.length);
      const card = this.cards[i];
      const sel = this.routeSel === i;
      const hot = sel || !!card?.hover;
      const faded = this.routeSel >= 0 && !sel;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(ROUTES.x0 - 52, y - ROUTES.lane / 2, lastX - ROUTES.x0 + 104, ROUTES.lane);
      ctx.fillStyle = sel ? COLORS.goldLight : hot ? COLORS.gold : '#3a2e52';
      ctx.fillRect(ROUTES.x0 - 49, y - ROUTES.lane / 2 + 3, lastX - ROUTES.x0 + 98, ROUTES.lane - 6);
      ctx.fillStyle = sel ? '#3a2a14' : COLORS.panel;
      ctx.fillRect(ROUTES.x0 - 46, y - ROUTES.lane / 2 + 6, lastX - ROUTES.x0 + 92, ROUTES.lane - 12);
      // Lines out of the opener and into the Cashier.
      ctx.fillStyle = sel ? COLORS.gold : faded ? '#2a2038' : '#4a3e62';
      this.link(ctx, ROUTES.opener + 30, midY, ROUTES.x0 - 52, y);
      this.link(ctx, lastX + 52, y, ROUTES.x0 + (ROUTE_STOPS - 1) * ROUTES.gap + 60 + (ROUTES.shop - lastX - 90), midY);
      ctx.fillRect(ROUTES.x0, y - 2, lastX - ROUTES.x0, 4);
      const pn = run.endless?.nights?.[i];
      if (pn) drawText(ctx, `PATH ${i + 1}: ${NIGHTS[pn].title} - ${NIGHTS[pn].text}`, ROUTES.x0 - 44, y - ROUTES.lane / 2 + 16, 1.25, sel ? COLORS.goldLight : '#ffd23f', { align: 'left' });
      else drawText(ctx, `PATH ${i + 1}`, ROUTES.x0 - 44, y - ROUTES.lane / 2 + 16, 1.5, sel ? COLORS.goldLight : COLORS.textDim, { align: 'left' });
      route.forEach((st, k) => {
        const x = ROUTES.x0 + k * ROUTES.gap;
        const lift = sel ? Math.sin(time * 4 + k) * 2 : 0;
        const t = this.drawStop(ctx, st, x, y + 6 + lift, 28, { faded });
        tip ??= t;
      });
    });
    for (const end of ends) {
      const t = this.drawStop(ctx, end.st, end.x, midY, 30, { done: end.done });
      tip ??= t;
      if (end.st.enemy?.isBoss) drawSprite(ctx, 'nodeBoss', end.x, midY - 46, 2);
    }
    drawText(ctx, 'DONE', ROUTES.opener, midY + 46, 1.5, '#6a6078');
    for (const b of this.buttons) this.drawButton(ctx, b, time);
    this.mapTip = tip;
    if (tip) this.drawNodeTip(ctx, tip);
  }
}
