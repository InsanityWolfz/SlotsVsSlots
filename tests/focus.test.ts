import { describe, expect, it } from 'vitest';
import { Focus } from '../src/ui/focus';

/** Controller focus (QA 2026-11-04): a new screen lands on its main button, never where the last screen's focus was. */
const btn = (label: string, x: number, y: number, extra: object = {}) => ({ label, x, y, w: 100, h: 40, ...extra });

describe('focus', () => {
  it('a new screen puts the focus on its main (red) button, not the nearest one', () => {
    const f = new Focus();
    const a = [btn('PICK', 100, 100)];
    f.move('down', a);
    f.sync('draft');
    f.move('down', a);
    f.sync('encounter');
    const walk = btn('WALK AWAY', 100, 110, { minor: true });
    const deal = btn('DEAL', 600, 500);
    expect(f.current([walk, deal])).toBe(deal);
  });

  it("the fight's SPIN, not AUTO (buttons with opts: the primary or pulsing one)", () => {
    const f = new Focus();
    f.visible = true;
    f.sync('fight');
    const auto = btn('AUTO', 200, 640, { opts: {} });
    const spin = btn('SPIN', 340, 640, { opts: { idlePulse: true } });
    expect(f.current([auto, spin])).toBe(spin);
  });

  it('a lost target hides the focus; the next press shows it on the main button', () => {
    const f = new Focus();
    f.visible = true;
    f.sync('shop');
    const heal = btn('HEAL', 100, 100);
    expect(f.current([heal])).toBe(heal);
    f.lost();
    expect(f.visible).toBe(false);
    const leave = btn('LEAVE', 600, 600);
    expect(f.move('down', [btn('+40 MAX HP', 100, 160, { minor: true }), leave])).toBe(leave);
  });
});
