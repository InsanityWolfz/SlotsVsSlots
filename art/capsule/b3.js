// B, pass 2: THE GANG, the colorful ones (user: "the characters are pretty bland").
sky(66);
searchlight(70, 70, 40, 0, '#ffe6aa', 0.06); searchlight(160, 70, 195, 0, '#ffe6aa', 0.06); searchlight(115, 70, 100, 0, '#ffb0c0', 0.04);
skyline(70, { seed: 9 });
neonMask(CHERRY, 8, 22, '#ff4fe0', '#ff4fe0');
neonMask(SEVEN, 210, 22, '#4fe0bf', '#4fe0bf');
street(76);
glow(115, 98, 52, '#ffe6aa');
// the crowd: three ranks, lighter dimming than pass 1 so the colours carry
const back = [['enemyRepoMan', 74, 250, 4], ['enemyCroupier', 232, 246, 3], ['enemyWheel', 690, 246, 3], ['enemyBoss', 846, 246, 4]];
const mid = [['enemyGremlin', 150, 318, 5], ['enemyMimic', 770, 318, 5]];
const front = [['heroJoker', 300, 342, 6], ['heroTesla', 620, 342, 6]];
for (const [id, x, y, sc] of back) S(id, x, y, sc, { dim: 0.3 });
for (const [id, x, y, sc] of mid) S(id, x, y, sc, { dim: 0.12 });
for (const [id, x, y, sc] of front) S(id, x, y, sc);
S('heroKnight', W / 2, H - 100, 7);
for (const [id, x, y, sc] of [['chip', 40, 405, 4], ['chip', 78, 418, 4], ['coinSpin0', 22, 372, 3], ['chip', 880, 410, 4], ['coinSpin2', 846, 420, 3], ['coinSpin1', 900, 370, 3]]) S(id, x, y, sc);
vignette();
glow(115, 20, 36, '#ff6a4a');
m.title.drawLogo(ctx, W / 2, 80, 3, { chase: 1 });
