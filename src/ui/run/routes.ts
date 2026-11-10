import { type Stop } from '../../core/enemies';
import { endlessScore, type RunState } from '../../core/run';
import { NIGHTS, nightOf } from '../../core/endless';
import { COLORS } from '../../present/layout';
import { drawSprite } from '../../render/sprites';
import { drawText, fmtNum, textWidth } from '../../render/text';
import { drawChip, drawPanel, KIT, T } from '../kit';
import { MapTip, CX } from './shared';
import { GROUND, mapGround, MapScreens, STREET, type MapGround } from './map';

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

  /** What stands between the paths, by the act's ground: city blocks, slot banks, or card tables. */
  protected drawBlocks(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, seed: number): void {
    const ground = mapGround(this.run);
    if (ground === 'floor') return this.drawSlotBanks(ctx, x0, y0, x1, y1, seed);
    if (ground === 'hr') return this.drawCardTables(ctx, x0, y0, x1, y1, seed);
    this.drawCityBlocks(ctx, x0, y0, x1, y1, seed);
  }

  /** Act 2's floor plan: banks of slot machines in rows (cabinets with a lit screen and topper, low contrast). */
  protected drawSlotBanks(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, seed: number): void {
    const tops = ['#5a2a3a', '#2a4a5a', '#5a4a2a', '#3a2a5a'];
    for (let y = y0 + 4, row = 0; y + 26 <= y1; y += 34, row++) {
      // the bank's base (a long dark plinth), then its machines
      ctx.fillStyle = '#0e0810';
      ctx.fillRect(x0, y + 24, x1 - x0, 4);
      for (let x = x0, k = seed + row * 7; x + 12 <= x1; x += 14, k++) {
        ctx.fillStyle = '#241828';
        ctx.fillRect(x, y + 4, 12, 20);
        ctx.fillStyle = tops[k % tops.length];
        ctx.fillRect(x, y, 12, 5);
        ctx.fillStyle = (k * 13) % 7 === 0 ? '#c8a24a' : '#3a2e4a';
        ctx.fillRect(x + 3, y + 8, 6, 6);
        ctx.fillStyle = '#1a1220';
        ctx.fillRect(x + 2, y + 17, 8, 2);
      }
    }
  }

  /** Act 3's rooms: card tables (felt with a brass rim) and their chairs, on the velvet floor. */
  protected drawCardTables(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, seed: number): void {
    const felts = ['#0f4a2e', '#123a5a', '#4a1424'];
    const h = Math.min(30, y1 - y0 - 16);
    if (h < 14) return;
    const cy = Math.round((y0 + y1) / 2);
    for (let x = x0 + 8, k = seed; x + 56 <= x1; x += 74, k++) {
      const y = cy - h / 2;
      // chairs round it
      ctx.fillStyle = '#3a1a22';
      for (let c = 0; c < 3; c++) {
        ctx.fillRect(x + 8 + c * 16, y - 8, 8, 6);
        ctx.fillRect(x + 8 + c * 16, y + h + 2, 8, 6);
      }
      // the table: rim, felt, a chip stack
      ctx.fillStyle = '#6a4a20';
      ctx.fillRect(x, y, 56, h);
      ctx.fillStyle = felts[k % felts.length];
      ctx.fillRect(x + 3, y + 3, 50, h - 6);
      ctx.fillStyle = (k * 7) % 3 === 0 ? '#c8a24a' : '#8a3a3a';
      ctx.fillRect(x + 24, y + h / 2 - 2, 6, 4);
    }
  }

  /** Act 1's city blocks between the streets: dark buildings with a few lit windows (scenery, deterministic). */
  protected drawCityBlocks(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, seed: number): void {
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

  /** The boss's place under its stop (low contrast; the stop, its crown and BOSS stay on top). */
  protected drawLandmark(ctx: CanvasRenderingContext2D, ground: MapGround, x: number, y: number, time: number): void {
    const bx = x - 70;
    const by = y - 96;
    if (ground === 'street') {
      // The casino's front across the end of the street: a wide block, its marquee's bulbs (above the stop's crown),
      // its lit doors.
      const sy = y - 132;
      ctx.fillStyle = '#211932';
      ctx.fillRect(bx, sy, 140, 206);
      ctx.fillStyle = '#2b2140';
      ctx.fillRect(bx, sy, 140, 6);
      ctx.fillStyle = '#561530';
      ctx.fillRect(bx + 14, sy + 10, 112, 30);
      for (let k = 0; k < 14; k++) {
        ctx.fillStyle = (k + Math.floor(time * 3)) % 3 === 0 || this.reduceMotion ? '#ffe45c' : '#8f5a1f';
        ctx.fillRect(bx + 18 + k * 8, sy + 12, 2, 2);
        ctx.fillRect(bx + 18 + k * 8, sy + 36, 2, 2);
      }
      drawText(ctx, 'CASINO', x, sy + 25, T.small, '#d9a640', { outline: null });
      ctx.fillStyle = '#8f5a1f';
      ctx.fillRect(x - 30, y + 30, 60, 4);
      ctx.fillStyle = '#3a1a14';
      ctx.fillRect(x - 70, y + 34, 140, 40);
      ctx.fillStyle = '#5e1a2a';
      ctx.fillRect(x - 12, y + 34, 24, 40);
    } else if (ground === 'floor') {
      // The roulette pit: its table's felt and the wheel at its head, a velvet rope round it.
      ctx.fillStyle = '#6a4a20';
      ctx.fillRect(bx + 4, by + 30, 132, 132);
      ctx.fillStyle = '#145a34';
      ctx.fillRect(bx + 8, by + 34, 124, 124);
      ctx.fillStyle = '#3a2010';
      const wy = by + 52;
      for (let d = -14; d <= 14; d += 2) {
        const hw = Math.floor(Math.sqrt(196 - d * d) / 2) * 2;
        ctx.fillRect(x - hw, wy + d, hw * 2, 2);
      }
      ctx.fillStyle = '#c8a24a';
      ctx.fillRect(x - 2, wy - 2, 4, 4);
      drawText(ctx, 'ROULETTE', x, by + 14, T.small, '#d9a640', { outline: null });
      ctx.fillStyle = '#8e1f3a';
      ctx.fillRect(bx, by + 168, 140, 3);
    } else {
      // THE DEALER's table: a half-moon of felt under its green lamp, his chair behind it.
      ctx.fillStyle = '#1f6a3a';
      ctx.fillRect(x - 26, by + 20, 52, 8);
      ctx.fillStyle = 'rgba(232,192,112,0.12)';
      ctx.fillRect(x - 64, by + 28, 128, 120);
      ctx.fillStyle = '#6a4a20';
      for (let d = 0; d <= 50; d += 2) {
        const hw = Math.floor(Math.sqrt(2500 - (50 - d) * (50 - d)) * 1.3 / 2) * 2;
        ctx.fillRect(x - hw, by + 40 + d, hw * 2, 2);
      }
      ctx.fillStyle = '#0f4a2e';
      for (let d = 4; d <= 50; d += 2) {
        const hw = Math.floor(Math.sqrt(2500 - (50 - d) * (50 - d)) * 1.2 / 2) * 2 - 4;
        if (hw > 0) ctx.fillRect(x - hw, by + 40 + d, hw * 2, 2);
      }
      drawText(ctx, 'HIGH LIMIT', x, by + 8, T.small, '#d9a640', { outline: null });
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
    const line = run.endless?.nights?.length ? "EACH PATH HAS ITS OWN RULE FOR BOTH MACHINES (TONIGHT'S RULE)" : night ? `TONIGHT'S RULE: ${night.title}. ${night.text}` : ''; // no instruction line (user, 2026-10-31: it read like AI)
    drawText(ctx, line, CX, 56, T.small, night || run.endless?.nights?.length ? '#ffd23f' : KIT.dim);
    // The map: a panel with the place's name on its tab.
    const place = run.endless ? `${act}` : `${act}: ${PLACE[Math.min(2, run.act - 1)]}`;
    const ground = mapGround(run);
    drawPanel(ctx, MAP.x, MAP.y, MAP.w, MAP.h, { fill: GROUND[ground].fill, title: place });
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
    // The act's boss is a place at the map's end: the casino's door, the roulette, THE DEALER's table.
    this.drawLandmark(ctx, ground, ENDS.boss, mid, time);
    // ENDLESS: the casino after hours (the whole map a step darker under its paths).
    if (run.endless) {
      ctx.fillStyle = 'rgba(4,2,8,0.35)';
      ctx.fillRect(MAP.x, MAP.y, MAP.w, MAP.h);
    }
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
