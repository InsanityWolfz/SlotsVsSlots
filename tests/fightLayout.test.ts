import { describe, expect, it } from 'vitest';
import { Banner, FloatText, overlaps } from '../src/present/fx';
import { HUD_W, HudView } from '../src/present/hud';
import { BEZEL, CALLOUT_ROW, CALLOUT_ROWS, CALLOUT_Y, GUTTER_PANEL_H, GUTTER_PANEL_LINE, GUTTER_PANEL_W, GUTTER_PANEL_Y, HIT_Y, MACHINE_CX, MACHINE_H, MACHINE_TOP, MACHINE_W, PAY_BANNER_Y, PAY_FLOOR, PAY_STACK, STATUS, TOP_ROW_Y, TURN_BANNER_Y, W } from '../src/present/layout';
import { climbPace, PayStack, STACK } from '../src/present/payStack';
import { PAY_TOP } from '../src/present/directorPay';

/** A banner as it rests (popped in, not zoomed by its entrance). */
const banner = (text: string, y: number, textScale: number, sub = '') => {
  const b = new Banner(text, '#ffffff', W / 2, y, textScale);
  b.sub = sub;
  b.scale = 1;
  return b;
};

describe("the fight screen's homes (user, 2026-11-10: nothing overlaps)", () => {
  // The bottom bar: AUTO, SPIN and SPEED on its centre line (game.ts buildButtons).
  const SPEED = { x: MACHINE_CX.player + 132 - 60, y: 648 - 22, w: 120, h: 44 };
  const gutter = { x: MACHINE_CX.player + MACHINE_W / 2 + BEZEL, w: MACHINE_CX.enemy - MACHINE_CX.player - MACHINE_W - BEZEL * 2 };

  it('a turn banner hangs under the HUD chips and over the gutter panel and the hit numbers', () => {
    const enemy = new HudView('enemy', 100, null, { ability: { kind: 'smash', every: 3, power: 1 } });
    const player = new HudView('player', 100, { kind: 'vault', pips: 10, label: 'HIGH ROLLER', color: '#fff', icon: 'chip' as never, note: () => '' });
    // (Chips hang from the panels' bottom edges: an ability chip is 35 px tall, a body chip 28.)
    const chipsEnd = Math.max(enemy.chipY + 18 + 2, player.chipY + 14 + 2);
    const r = banner('THE WHEEL SPINS FASTER!', TURN_BANNER_Y, 4, '3 CHIPS A TURN NOW').rect()!;
    expect(r.y).toBeGreaterThanOrEqual(chipsEnd);
    // The boss panel's title tab starts 18 px over the panel.
    expect(r.y + r.h).toBeLessThanOrEqual(GUTTER_PANEL_Y - 18);
    // The biggest hit number (scale 8: 56 px tall) starts under it.
    expect(HIT_Y - 28).toBeGreaterThanOrEqual(r.y + r.h - 10);
    expect(HIT_Y + 28).toBeLessThanOrEqual(MACHINE_TOP + MACHINE_H / 3);
  });

  it('the callout row sits on the machine edge, under the HUD chips; the second row stays in the top reel row', () => {
    const t = new FloatText('BLOCKED!', MACHINE_CX.player, CALLOUT_Y, 3, '#fff');
    t.plate = true;
    const player = new HudView('player', 100, { kind: 'vault', pips: 10, label: 'HIGH ROLLER', color: '#fff', icon: 'chip' as never, note: () => '' });
    expect(t.rect().y).toBeGreaterThanOrEqual(player.chipY + 14 + 2);
    expect(CALLOUT_ROWS).toEqual([CALLOUT_Y, TOP_ROW_Y]);
    // The inner row: a heading-size callout on a plate (45 px tall) sits under the status badges (the reels' top
    // 42 px) and over the payline; so does a title-size one without a plate (MAKE IT RAIN!).
    expect(TOP_ROW_Y - 23).toBeGreaterThanOrEqual(MACHINE_TOP + 40);
    expect(TOP_ROW_Y + 23).toBeLessThanOrEqual(MACHINE_TOP + MACHINE_H / 3);
    expect(CALLOUT_ROW).toBeGreaterThanOrEqual(30);
  });

  it("the boss's panel and its one line end over the pay banner; the pay banner starts under the payline", () => {
    // (The line is body size: 14 px tall, with its outline; the banner's panel has a 3 px outline.)
    const footer = GUTTER_PANEL_Y + GUTTER_PANEL_H + GUTTER_PANEL_LINE + 8;
    expect(footer).toBeLessThanOrEqual(PAY_TOP - 3);
    // (So the panel stays up while a pay banner is: their boxes, with the 3 px of air fightView keeps, don't touch.)
    const pay = banner('PAIR!', PAY_BANNER_Y, 4, '×2 PAIR  64');
    pay.pinTop = PAY_TOP;
    expect(overlaps({ x: W / 2 - GUTTER_PANEL_W / 2 - 4, y: GUTTER_PANEL_Y - 20, w: GUTTER_PANEL_W + 8, h: GUTTER_PANEL_H + 20 + GUTTER_PANEL_LINE + 8 }, pay.rect()!, 3)).toBe(false);
    expect(GUTTER_PANEL_W).toBeLessThanOrEqual(gutter.w);
    for (const [title, scale] of [['PAIR!', 4], ['JACKPOT!', 4.5], ['BIG WIN!', 5], ['MEGA WIN!', 6]] as const) {
      const b = banner(title, PAY_BANNER_Y, scale, '123');
      b.pinTop = PAY_TOP;
      expect(b.rect()!.y).toBeGreaterThanOrEqual(PAY_TOP - 1);
      expect(b.rect()!.y).toBeGreaterThanOrEqual(MACHINE_TOP + (MACHINE_H * 2) / 3);
    }
  });

  it("a pay banner's entrance, however big, stays between the payline and the bottom bar", () => {
    for (const [title, scale, over] of [['PAIR!', 4, 1.15], ['JACKPOT!', 4.5, 1.25], ['BIG WIN!', 5, 1.5], ['MEGA WIN!', 6, 1.7]] as const) {
      const b = banner(title, PAY_BANNER_Y, scale, '×2.5 HIGH ROLLER  123.4K');
      b.pinTop = PAY_TOP;
      b.scale = over;
      const seen: number[] = [];
      const ctx = new Proxy({}, { get: (_, k) => (k === 'translate' ? (_x: number, y: number) => seen.push(y) : k === 'scale' ? (kx: number) => seen.push(kx) : () => {}) }) as unknown as CanvasRenderingContext2D;
      try {
        b.draw(ctx);
      } catch {
        /* no canvas here: the transform is set before anything is drawn */
      }
      // translate(x, centre) then scale(k): the panel is 93 px tall before the scale.
      const [centre, k] = seen;
      expect(centre - (93 / 2) * k).toBeGreaterThanOrEqual(PAY_TOP - 1);
      expect(centre + (93 / 2) * k).toBeLessThanOrEqual(PAY_FLOOR);
    }
  });

  it('THE PAY STACK fits its home: under the pay banner, over the bottom bar, clear of HOLD and SPEED', () => {
    const b = banner('JACKPOT!', PAY_BANNER_Y, 4.5, '×2 LOADED DICE  1944');
    b.pinTop = PAY_TOP;
    const top = b.restBottom();
    const long = [{ label: '×1.45 SECOND MORTGAGE', value: '123.4K' }];
    const w = PayStack.width(long, { label: 'MEGA WIN!', value: '123.4K' });
    expect(w).toBeLessThanOrEqual(PAY_STACK.maxW);
    const st = new PayStack(W / 2, top, w);
    expect(st.rows).toBe(STACK.rows);
    // As tall as it gets: the total's line and the rest.
    const h = STACK.pad * 2 + STACK.headPitch + (STACK.rows - 1) * STACK.pitch;
    const box = { x: W / 2 - w / 2, y: top, w, h };
    expect(box.y + box.h).toBeLessThanOrEqual(PAY_STACK.bottom);
    expect(overlaps(box, SPEED, 0)).toBe(false);
    // The fight's line in the bottom bar (a body chip is 28 px tall) starts under it.
    expect(STATUS.y - 16).toBeGreaterThanOrEqual(box.y + box.h);
    expect(STATUS.x).toBeGreaterThanOrEqual(SPEED.x + SPEED.w + 10);
    // The HOLD chip's idle label (HOLD 2: CLICK A REEL) hangs from your machine's bottom edge, left of it.
    const hold = { x: MACHINE_CX.player - 130, y: MACHINE_TOP + MACHINE_H + BEZEL - 17, w: 260, h: 32 };
    expect(overlaps(box, hold, 0)).toBe(false);
    // Under a MEGA WIN the banner's bottom edge is lower: fewer lines, still inside the home.
    const mega = banner('MEGA WIN!', PAY_BANNER_Y, 6, '123.4K!');
    mega.pinTop = PAY_TOP;
    const low = new PayStack(W / 2, mega.restBottom(), w);
    expect(low.rows).toBeGreaterThanOrEqual(2);
    expect(mega.restBottom() + STACK.pad * 2 + STACK.headPitch + (low.rows - 1) * STACK.pitch).toBeLessThanOrEqual(PAY_STACK.bottom);
  });

  it('a HUD panel is as wide as its machine (callouts are held to that width)', () => {
    expect(HUD_W).toBe(Math.round(MACHINE_W + BEZEL * 2));
  });
});

describe('THE CLIMB keeps its pace (user, 2026-11-10: readable, not slower)', () => {
  it('a short chain counts 0.16 s a step; a long one shares one budget', () => {
    expect(climbPace(1)).toBeCloseTo(0.16);
    expect(climbPace(4)).toBeCloseTo(0.16);
    // 6 steps: 0.66 s in all (it was 6 x 0.11).
    expect(climbPace(6) * 6).toBeCloseTo(0.66);
    // 12 steps take no longer than 5 did.
    expect(climbPace(12) * 12).toBeLessThanOrEqual(climbPace(5) * 5 + 1e-9);
    for (let n = 1; n <= 20; n++) {
      expect(climbPace(n)).toBeGreaterThanOrEqual(0.05);
      expect(climbPace(n) * n).toBeLessThanOrEqual(1.01);
    }
  });
  it('a pair with one more multiplier adds 0.1 s to the count; nothing adds more than 0.2 s', () => {
    for (let n = 1; n <= 20; n++) expect(climbPace(n) * n - 0.11 * n).toBeLessThanOrEqual(0.2 + 1e-9);
    expect(climbPace(2) * 2 - 0.11 * 2).toBeCloseTo(0.1);
  });
  it('BIG WIN and MEGA WIN climb as they did, up to a budget', () => {
    expect(climbPace(3, 'big')).toBeCloseTo(0.18);
    expect(climbPace(3, 'mega')).toBeCloseTo(0.24);
    expect(climbPace(12, 'mega') * 12).toBeCloseTo(1.3);
  });
  it('the stack shows at most 4 lines, newest first', () => {
    const st = new PayStack(W / 2, PAY_BANNER_Y + 49, 200);
    for (const label of ['3 SWORDS', '×3 JACKPOT', '×2 GOLD', '×2 LOADED DICE', '×1.5 OVERTIME']) st.push({ label, value: '1' }, '#fff');
    expect(st.lines[0].label).toBe('×1.5 OVERTIME');
    expect(st.rows).toBe(4);
  });
});
