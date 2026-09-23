export type Ease = (t: number) => number;

export const linear: Ease = (t) => t;
export const sineIn: Ease = (t) => 1 - Math.cos((t * Math.PI) / 2);
export const sineOut: Ease = (t) => Math.sin((t * Math.PI) / 2);
export const sineInOut: Ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const cubicIn: Ease = (t) => t * t * t;
export const cubicOut: Ease = (t) => 1 - (1 - t) ** 3;
export const quadOut: Ease = (t) => 1 - (1 - t) * (1 - t);
/** Overshoot-then-settle (Godot TRANS_BACK / EASE_OUT). */
export const backOut =
  (s = 1.70158): Ease =>
  (t) => {
    const c3 = s + 1;
    return 1 + c3 * (t - 1) ** 3 + s * (t - 1) ** 2;
  };
export const elasticOut: Ease = (t) =>
  t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
