/**
 * A BOSS'S ENTRANCE (QA UI-10, user call 10, 2026-11-09: FACE THE HOUSE cut straight to an ordinary fight frame). About
 * 2 s at SPEED 1X, on the fight's clock (so SPEED scales it, and any input skips it through the clock's skip): the room
 * dims, the boss's Slot Machine drops in and lands with a slam, its name plate lands in the HUDs' band with its portrait
 * and one line, the boss does its one thing (THE HOUSE's pot lights up, THE WHEEL spins, THE DEALER deals a card, THE
 * OWNER's lightning), then the plate leaves and the HUDs drop into place. A repeat (a boss met before this run, or a
 * fight restarted after a quit) plays a short version: no drop, a quicker plate.
 * Presentation only: nothing here touches the fight.
 */
import { Lightning } from './fx';
import { backOut, cubicIn, quadOut, sineInOut, sineOut } from './ease';
import { BEZEL, COLORS, GUTTER_PANEL_Y, MACHINE_CX, MACHINE_H, MACHINE_TOP, MACHINE_W, W } from './layout';
import type { Director } from './director';
import type { EntranceView } from './stage';
import { potPos } from './directorBoss';

/** Where the name plate sits: the HUDs' band at the top (the HUDs are off screen until the boss is in). */
export const PLATE = { cx: W / 2, cy: 96, h: 140 };
/** The plate fits its words (the font's glyphs are 6 px a scale), plus room on the right for THE WHEEL's wheel or THE
 * DEALER's card. */
export const plateWidth = (en: Pick<EntranceView, 'boss' | 'name' | 'line' | 'eyebrow'>): number =>
  2 * Math.round((150 + Math.max(en.name.length * 6 * 4.5, en.line.length * 6 * 2, en.eyebrow.length * 6 * 1.6) + 36 + (en.boss === 'dealer' || en.boss === 'wheel' ? 100 : 0)) / 2);
/** Where a prop lands on the plate (its right end). */
const propAt = (en: EntranceView) => ({ x: PLATE.cx + plateWidth(en) / 2 - 64, y: PLATE.cy + 2 });

export interface EntranceOpts {
  boss: EntranceView['boss'];
  name: string;
  portrait: string;
  eyebrow: string;
  short: boolean;
}

/** Each boss's one line under its name (flavour, never a rule: the rules are on its card). */
export const BOSS_LINES: Record<EntranceView['boss'], string> = {
  house: 'THE HOUSE ALWAYS WINS',
  wheel: 'PLACE YOUR BETS',
  dealer: 'THREE HANDS. ONE TABLE',
  owner: 'HE OWNS THIS TOWN',
};

export async function bossEntrance(d: Director, o: EntranceOpts): Promise<void> {
  const s = d.s;
  const c = d.c;
  const cam = s.camera;
  const enemy = s.machines.enemy;
  const player = s.machines.player;
  const full = !o.short;
  const en: EntranceView = { boss: o.boss, name: o.name, line: BOSS_LINES[o.boss], eyebrow: o.eyebrow, portrait: o.portrait, plate: 0, out: 0, hudY: -190, glow: 0 };
  const playerDim = player.dim;
  s.entrance = en;
  try {
    // The room dims and your side steps back.
    cam.dimTarget = full ? 0.7 : 0.5;
    d.bg(c.to(player, 'dim', 0.55, 0.25));
    if (full) {
      // The boss's Slot Machine drops in from above and lands.
      enemy.drop = -(MACHINE_TOP + MACHINE_H + 140);
      await c.wait(0.12);
      if (!c.skipping) s.sounds.whoosh();
      await c.tween({ from: enemy.drop, to: 0, dur: 0.36, ease: cubicIn, onUpdate: (v) => (enemy.drop = v) });
      land(d);
      await c.wait(0.06);
    } else await c.wait(0.1);
    // The name plate.
    d.bg(c.tween({ from: 0, to: 1, dur: full ? 0.26 : 0.16, ease: backOut(1.8), onUpdate: (v) => (en.plate = v) }));
    if (!c.skipping) s.sounds.stingerMedium();
    await c.wait(full ? 0.14 : 0.08);
    // The boss's own moment.
    await signature(d, en, full);
    await c.wait(full ? 0.5 : 0.18);
    // Out: the plate lifts away, the room comes back and the HUDs drop into place.
    d.bg(c.tween({ from: 0, to: 1, dur: 0.18, ease: cubicIn, onUpdate: (v) => (en.out = v) }));
    cam.dimTarget = 0;
    d.bg(c.to(player, 'dim', playerDim, 0.3));
    await c.tween({ from: en.hudY, to: 0, dur: full ? 0.34 : 0.22, ease: backOut(1.5), onUpdate: (v) => (en.hudY = v) });
  } finally {
    enemy.drop = 0;
    player.dim = playerDim;
    cam.dimTarget = 0;
    s.entrance = undefined;
  }
}

/** The landing: a slam, a shake and dust at the machine's foot. */
function land(d: Director): void {
  if (d.c.skipping) return;
  d.s.sounds.bossSlam();
  d.shake(10, 0.45);
  d.hitstop(5);
  if (!d.s.juice.particles) return;
  const foot = MACHINE_TOP + MACHINE_H + BEZEL;
  for (const dir of [-1, 1])
    d.s.particles.burst({ x: MACHINE_CX.enemy + dir * (MACHINE_W / 2), y: foot, count: 14, colors: ['#8a7a96', '#5a4a66', '#c9b8d4'], speed: [60, 220], angle: dir < 0 ? Math.PI : 0, spread: 0.7, gravity: 260, life: [0.3, 0.7], size: [3, 6] });
}

/** Each boss's one thing (about half a second). */
async function signature(d: Director, en: EntranceView, full: boolean): Promise<void> {
  const s = d.s;
  const c = d.c;
  const quiet = c.skipping;
  switch (en.boss) {
    case 'house': {
      // THE POT lights up: it punches, glows, and coins fountain out of it.
      const p = potPos();
      d.bg(c.tween({ from: 1.8, to: 1, dur: 0.35, ease: backOut(3), onUpdate: (v) => (s.gutter.potPunch = v) }));
      d.bg(c.tween({ from: 0, to: 1, dur: 0.15, ease: quadOut, onUpdate: (v) => (en.glow = v) }).then(() => c.tween({ from: 1, to: 0.3, dur: 0.5, ease: sineOut, onUpdate: (v) => (en.glow = v) })));
      if (s.juice.particles && !quiet) s.particles.burst({ x: p.x, y: p.y - 10, count: full ? 26 : 14, colors: [COLORS.gold, COLORS.goldLight, '#fff6c8'], speed: [180, 420], angle: -Math.PI / 2, spread: 0.7, gravity: 700, life: [0.4, 0.8], size: [3, 5] });
      for (let i = 0; i < (full ? 6 : 3); i++) {
        if (!c.skipping) s.sounds.coin(i * 2);
        await c.wait(0.06);
      }
      break;
    }
    case 'wheel': {
      // THE WHEEL spins once: its wheel turns a full turn on the plate (the ball rattling the other way) and the topper
      // on its machine races (it eases back to idle on its own).
      s.gutter.wheelSpeed = full ? 22 : 16;
      en.wheel = 0;
      const n = full ? 6 : 4;
      d.bg(c.tween({ from: 0, to: Math.PI * 2, dur: full ? 0.5 : 0.32, ease: sineOut, onUpdate: (v) => (en.wheel = v) }));
      for (let i = 0; i < n; i++) {
        if (!c.skipping) s.sounds.tick(i / n);
        await c.wait(full ? 0.05 + i * 0.012 : 0.06);
      }
      break;
    }
    case 'dealer': {
      // THE DEALER deals a card from the table onto the plate, and it turns face up.
      const card = { x: W / 2, y: GUTTER_PANEL_Y + 40, rot: 0, flip: 0 };
      en.card = card;
      if (!quiet) s.sounds.whoosh();
      d.bg(c.tween({ from: 0, to: Math.PI * 4, dur: full ? 0.36 : 0.24, ease: sineOut, onUpdate: (v) => (card.rot = v) }));
      const at = propAt(en);
      await d.arc(card, at.x, at.y, full ? 0.36 : 0.24, 60, sineInOut);
      card.rot = 0;
      if (!c.skipping) s.sounds.turnCard(false);
      await c.tween({ from: 0, to: 1, dur: 0.18, ease: quadOut, onUpdate: (v) => (card.flip = v) });
      break;
    }
    case 'owner': {
      // THE OWNER's lightning strikes his machine. No screen flash: his machine flashes (under FLASH_CAP, half with
      // SOFT), and SOFT drops the crackle and most of the shake.
      const soft = s.juice.softLightning;
      const t = { x: MACHINE_CX.enemy, y: MACHINE_TOP + MACHINE_H / 2 };
      const bolt = s.fx.add(new Lightning(t.x + 170, -20, t.x, t.y));
      if (!c.skipping) s.sounds.thunder();
      d.hitstop(soft ? 2 : 4);
      d.shake(soft ? 3 : 8, soft ? 0.25 : 0.45);
      d.flashMachine('enemy', soft ? 0.35 : 1, 0.3);
      if (s.juice.particles && !quiet) s.particles.burst({ x: t.x, y: t.y, count: soft ? 16 : 40, colors: [COLORS.energy, '#ffffff', '#fff6c8'], speed: [200, 600], kind: 'spark', gravity: 400, life: [0.2, 0.5], size: [3, 5] });
      if (!soft)
        for (let i = 0; i < 2; i++) {
          await c.tween({ from: 1, to: 0.2, dur: 0.08, onUpdate: (v) => (bolt.alpha = v) });
          bolt.reroll();
          bolt.alpha = 1;
        }
      await c.tween({ from: 1, to: 0, dur: soft ? 0.35 : 0.18, onUpdate: (v) => (bolt.alpha = v) });
      s.fx.remove(bolt);
      break;
    }
  }
}
