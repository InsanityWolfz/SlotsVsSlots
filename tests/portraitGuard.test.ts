import { describe, expect, it } from 'vitest';
import { hasSprite } from '../src/render/sprites';

describe('portrait ids from saves', () => {
  it('an unknown id is not a sprite (HISCORES draws nothing instead of crashing)', () => {
    expect(hasSprite('no_such_portrait_v0')).toBe(false);
    expect(hasSprite('toString')).toBe(false);
  });
});
