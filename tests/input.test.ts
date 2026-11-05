import { afterEach, describe, expect, it } from 'vitest';
import { by, inputMode, promptWidth, setInputMode, tapWord } from '../src/ui/input';
import { textWidth } from '../src/render/text';

/** Controller prompts (Steam Deck, 2026-11-04): the words follow the device in hand. */
const was = inputMode();
afterEach(() => setInputMode(was));

describe('input prompts', () => {
  it('each device gets its own words; a mouse falls back to touch, keys to the mouse', () => {
    const o = { touch: 'TAP', mouse: 'CLICK', pad: '[A]' };
    setInputMode('touch');
    expect(by(o)).toBe('TAP');
    setInputMode('mouse');
    expect(by(o)).toBe('CLICK');
    setInputMode('keys');
    expect(by(o)).toBe('CLICK');
    setInputMode('pad');
    expect(by(o)).toBe('[A]');
    expect(tapWord()).toBe('PRESS');
  });

  it('a badge is never wider than its token (text wrapped by characters still fits)', () => {
    for (const t of ['[A]', '[X]', '[LB]', '[RB]', '[LT]', '[VIEW]', '[START]', '[DPAD]'])
      for (const s of [1.6, 2, 3]) expect(promptWidth(t, s)).toBeLessThanOrEqual(textWidth(t, s) + 2);
    const cell = textWidth('MM', 2) - textWidth('M', 2);
    expect(promptWidth('PRESS SPIN', 2)).toBe('PRESS SPIN'.length * cell);
  });
});
