// Direction C, THE PAYLINE: close in on the reels, the game's own look. Your 3x3 reels (left) land three swords on the
// payline; the line fires across the gap into THE HOUSE's reels (right), which take the hit. The one light is the
// payline itself: the row it crosses is lit, everything else sits in the dark.
const cx = W / 2, cell = 18 * P, gridW = cell * 3;
const LY = Math.round((H * 0.62) / P) * P;
for (let y = 0; y < H; y += P) px(0, y, W, P, '#0b0614');
// the payline's glow: one horizontal band across the whole frame (the light)
for (let k = 0; k < 6; k++) px(0, LY - cell / 2 - k * 3 * P, W, cell + k * 6 * P, '#ffd23f', 0.035);
// a reel window at the one scale: frame in the machine's colours, 3x3 symbols, rows off the line dimmed
const reels = (x0, sym, frame, hot, hit) => {
  const y0 = LY - cell * 1.5;
  px(x0 - 3 * P, y0 - 3 * P, gridW + 6 * P, cell * 3 + 6 * P, frame);
  px(x0 - P, y0 - P, gridW + 2 * P, cell * 3 + 2 * P, '#1a0f26');
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const id = sym[r][c], x = x0 + c * cell + cell / 2, y = y0 + r * cell + cell / 2;
    px(x - cell / 2 + P, y - cell / 2 + P, cell - 2 * P, cell - 2 * P, r === 1 ? '#2a1c3a' : '#140c20');
    m.sprites.drawSprite(ctx, id, x, y, P, { dim: r === 1 ? 0 : 0.55, flash: r === 1 && hit ? 0.18 : 0 });
  }
  px(x0 - 2 * P, LY - P, P * 2, P * 2, hot); px(x0 + gridW, LY - P, P * 2, P * 2, hot);
};
const LX0 = 150, RX0 = W - 150 - gridW;
reels(LX0, [['shield', 'sword', 'shield'], ['sword', 'sword', 'sword'], ['shield', 'shield', 'sword']], '#2a4fb0', '#ffd23f', false);
reels(RX0, [['coin', 'seven', 'coin'], ['coin', 'seven', 'shield'], ['seven', 'coin', 'coin']], '#a01c30', '#e0455d', true);
// the line firing across: three swords in flight with stepped trails, from your payline into theirs
const gapL = LX0 + gridW + 4 * P, gapR = RX0 - 4 * P;
for (let x = gapL; x < gapR; x += P) { const k = (x - gapL) / (gapR - gapL); px(x, LY - P, P, P * 2, k > 0.8 ? '#fff6c0' : '#ffd23f', 0.35 + 0.6 * k); }
for (const k of [0.22, 0.5, 0.78]) m.sprites.drawSprite(ctx, 'swordProjectile', Math.round((gapL + (gapR - gapL) * k) / P) * P, LY, P);
// the impact on their payline, and the number
burst(RX0 + cell * 0.5, LY, 110);
txt('-480', RX0 + gridW / 2, LY - cell * 1.5 - 70, 6, '#ff6a5a');
// the machines' names under the windows, small
txt('YOUR SLOT MACHINE', LX0 + gridW / 2, LY + cell * 1.5 + 40, 2, '#8fb0ff');
txt('THE HOUSE', RX0 + gridW / 2, LY + cell * 1.5 + 40, 2, '#ff8a9a');
// the logo, top centre
m.title.drawLogo(ctx, cx, 112, 4, { chase: 1 });
vignette();
