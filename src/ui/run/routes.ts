import { type Stop } from '../../core/enemies';
import { endlessScore, NIGHTS, nightOf, type RunState } from '../../core/run';
import { COLORS } from '../../present/layout';
import { drawSprite } from '../../render/sprites';
import { drawText, fmtNum, textWidth } from '../../render/text';
import { drawChip, drawPanel, KIT, T } from '../kit';
import { MapTip, CX } from './shared';
import { MapScreens, STREET } from './map';

/** CHOOSE YOUR PATH as a street map: the panel, the paths' streets (rows), the avenues joining them, the ends. */
const MAP = { x: 318, y: 92, w: 950, h: 512 };
const LANES = [196, 348, 500];
const AVE = { left: 436, right: 986 };
const STOPS = { x0: 494, gap: 108 };
const ENDS = { opener: 372, shop: 1066, boss: 1186 };
/** Each act is a place in the casino town. */
const PLACE = ['THE ALLEY', 'THE FLOOR', 'THE VIP ROOM'];

const laneOf = (i: number, n: number) => (n === 2 ? LANES[i * 2] : LANES[i]);

export abstract class RouteScreen extends MapScreens {
  protected takeBtn: { label: string; enabled: boolean } | null = null;

  /** CHOOSE YOUR PATH: tap a path to light it up, then TAKE IT (or tap it again). Arrows and Enter do the same. */
  protected showRoutes(run: RunState): void {
    this.routeSel = -1;
    const n = run.map.routes.length;
    const take = this.btn('PICK A PATH', CX, 654, 380, 56, () => this.routeSel >= 0 && this.cb.onRoute(this.routeSel));
    take.enabled = false;
    this.takeBtn = take;
    this.cards = run.map.routes.map((_, i) => {
      const h = this.hit(STOPS.x0 + (2 * STOPS.gap), laneOf(i, n), 5 * STOPS.gap + 24, 120, () => {
        if (this.routeSel === i) return this.cb.onRoute(i);
        this.routeSel = i;
        take.enabled = true;
        take.label = `TAKE PATH ${i + 1}`;
      });
      h.scale = 1;
      return h;
    });
    this.buttons = [take];
  }

  /** The city blocks between the streets: dark buildings with a few lit windows (scenery, deterministic). */
  protected drawBlocks(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, seed: number): void {
    let x = x0;
    let k = seed;
    while (x < x1 - 20) {
      const bw = Math.min(x1 - x, 36 + ((k * 37) % 5) * 12);
      const bh = Math.min(y1 - y0, 30 + ((k * 53) % 4) * 10);
      const by = y1 - bh;
      ctx.fillStyle = '#17112a';
      ctx.fillRect(x, by, bw - 6, bh);
      ctx.fillStyle = '#211a36';
      ctx.fillRect(x, by, bw - 6, 3);
      for (let wy = by + 9; wy < y1 - 6; wy += 10)
        for (let wx = x + 6; wx < x + bw - 14; wx += 10) {
          const r = (wx * 7 + wy * 13 + k * 31) % 17;
          ctx.fillStyle = r === 0 ? '#c8a24a' : r < 4 ? '#3a2e52' : '#241c38';
          ctx.fillRect(wx, wy, 4, 4);
        }
      x += bw;
      k++;
    }
  }

  /** CHOOSE YOUR PATH: the act's streets: the opener behind you, a street per path, then the Cashier and the boss. */
  protected drawRoutes(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    const m = run.map;
    const n = m.routes.length;
    const act = run.endless ? `LOOP ${run.endless.loop}` : `ACT ${run.act}`;
    drawText(ctx, 'CHOOSE YOUR PATH', CX, 28, T.head, KIT.title);
    const night = nightOf(run);
    const line = run.endless?.nights?.length ? "EACH PATH HAS ITS OWN RULE FOR BOTH MACHINES (TONIGHT'S RULE)" : night ? `TONIGHT'S RULE: ${night.title}. ${night.text}` : 'EVERY STOP IS SHOWN. TAP A PATH, THEN TAKE IT';
    drawText(ctx, line, CX, 56, T.small, night || run.endless?.nights?.length ? '#ffd23f' : KIT.dim);
    // The map: a panel with the place's name on its tab.
    const place = run.endless ? `${act}` : `${act}: ${PLACE[Math.min(2, run.act - 1)]}`;
    drawPanel(ctx, MAP.x, MAP.y, MAP.w, MAP.h, { fill: '#100b1c', title: place });
    const mid = LANES[1];
    const top = laneOf(0, n);
    const bot = laneOf(n - 1, n);
    const lastX = STOPS.x0 + 4 * STOPS.gap;
    // Blocks between the streets.
    ctx.save();
    ctx.beginPath();
    ctx.rect(MAP.x + 3, MAP.y + 3, MAP.w - 6, MAP.h - 6);
    ctx.clip();
    const rows = [MAP.y + 20, ...LANES.filter((_, i) => n === 3 || i !== 1), MAP.y + MAP.h - 4];
    for (let r = 0; r < rows.length - 1; r++) {
      const ya = rows[r] + (r === 0 ? 0 : STREET.w / 2 + 14);
      const yb = rows[r + 1] - STREET.w / 2 - 8;
      if (yb - ya > 24) this.drawBlocks(ctx, AVE.left + 22, ya, AVE.right - 18, yb, r * 5 + run.act);
    }
    this.drawBlocks(ctx, MAP.x + 16, MAP.y + 30, AVE.left - 20, mid - 64, 9);
    this.drawBlocks(ctx, MAP.x + 16, mid + 70, AVE.left - 20, MAP.y + MAP.h - 10, 11);
    this.drawBlocks(ctx, AVE.right + 22, MAP.y + 30, MAP.x + MAP.w - 12, mid - 76, 13);
    this.drawBlocks(ctx, AVE.right + 22, mid + 76, MAP.x + MAP.w - 12, MAP.y + MAP.h - 10, 15);
    ctx.restore();
    // The streets: the avenues, each path's street, the way in and the way out.
    const scroll = this.reduceMotion ? 0 : time * 24;
    const sel = this.routeSel;
    this.street(ctx, ENDS.opener, mid, AVE.left, mid, { lit: true });
    this.street(ctx, AVE.left, top, AVE.left, bot, { lit: sel >= 0 });
    this.street(ctx, AVE.right, top, AVE.right, bot, { lit: sel >= 0 });
    this.street(ctx, AVE.right, mid, ENDS.boss, mid, { lit: sel >= 0, scroll: sel >= 0 ? scroll : 0 });
    m.routes.forEach((_, i) => {
      const y = laneOf(i, n);
      const hot = sel === i || (sel < 0 && !!this.cards[i]?.hover);
      this.street(ctx, AVE.left, y, AVE.right, y, { lit: hot, scroll: hot ? scroll : 0, dim: sel >= 0 && sel !== i });
    });
    let tip: MapTip | null = null;
    // Each path: its name, its stops on the street.
    m.routes.forEach((route, i) => {
      const y = laneOf(i, n);
      const picked = sel === i;
      const faded = sel >= 0 && !picked;
      const hot = picked || (sel < 0 && !!this.cards[i]?.hover);
      const pn = run.endless?.nights?.[i];
      const name = pn ? `PATH ${i + 1}: ${NIGHTS[pn].title} - ${NIGHTS[pn].text}` : `PATH ${i + 1}`;
      drawChip(ctx, name, STOPS.x0 - 36 + (textWidth(name, T.small) + 18) / 2, y - 58, { scale: T.small, color: hot ? '#fff6c8' : faded ? KIT.dim : KIT.title, fill: hot ? '#3a2a14' : KIT.fillLight });
      route.forEach((st, k) => {
        const x = STOPS.x0 + k * STOPS.gap;
        const bob = picked && !this.reduceMotion ? Math.round(Math.sin(time * 4 + k) * 2) : 0;
        const t = this.drawStop(ctx, st, x, y + bob, 2, { faded, label: true });
        tip ??= t;
      });
      void lastX;
    });
    // The ends: the opener (done), the Cashier, the boss with its crown.
    const ends: { st: Stop; x: number; done: boolean }[] = [
      { st: { kind: 'fight', enemy: m.opener } as Stop, x: ENDS.opener, done: true },
      ...(m.shopBeforeBoss ? [{ st: { kind: 'shop' } as Stop, x: ENDS.shop, done: false }] : []),
      { st: { kind: 'fight', enemy: m.boss } as Stop, x: ENDS.boss, done: false },
    ];
    for (const end of ends) {
      const t = this.drawStop(ctx, end.st, end.x, mid, 2, { done: end.done, label: true });
      tip ??= t;
      if (end.st.enemy?.isBoss) {
        drawSprite(ctx, 'nodeBoss', end.x, mid - 58, 3);
        drawText(ctx, 'BOSS', end.x, mid + 54, T.small, '#ff8a7a');
      }
    }
    drawText(ctx, 'DONE', ENDS.opener, mid + 54, T.small, KIT.dim);
    // ENDLESS: the score so far, on screen (playtest: it only showed on the bust screen).
    if (run.endless) drawChip(ctx, `SCORE SO FAR ${fmtNum(endlessScore(run))}`, MAP.x + MAP.w - 150, MAP.y + 28, { scale: T.small, color: COLORS.goldLight });
    for (const b of this.buttons) this.drawButton(ctx, b, time);
    this.mapTip = tip;
    if (tip) this.drawNodeTip(ctx, tip);
  }
}
