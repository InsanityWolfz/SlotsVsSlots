// B, pass 1: THE GANG as a premiere poster.
sky(66);
searchlight(70, 70, 40, 0, '#ffe6aa', 0.06); searchlight(160, 70, 195, 0, '#ffe6aa', 0.06); searchlight(115, 70, 100, 0, '#ffb0c0', 0.04);
skyline(70, { seed: 9 });
neonMask(CHERRY, 8, 22, '#ff4fe0', '#ff4fe0');
neonMask(SEVEN, 210, 22, '#4fe0bf', '#4fe0bf');
street(76);
glow(115, 98, 52, '#ffe6aa');
// the crowd: three ranks, further back is darker
const back = [['enemyBoss', 112, 252, 4], ['enemyOwner', 808, 252, 4]];
const mid = [['enemyBrute', 212, 296, 5], ['enemyPitBoss', 708, 296, 5]];
const front = [['enemyPortrait', 300, 350, 5], ['enemyBomber', 620, 350, 5]];
for (const [id, x, y, sc] of back) S(id, x, y, sc, { dim: 0.5 });
for (const [id, x, y, sc] of mid) S(id, x, y, sc, { dim: 0.28 });
for (const [id, x, y, sc] of front) S(id, x, y, sc, { dim: 0.08 });
S('heroKnight', W / 2, H - 100, 7);
// foreground: chips and a coin tumbling at the bottom corners
for (const [id, x, y, sc] of [['chip', 40, 405, 4], ['chip', 78, 418, 4], ['coinSpin0', 22, 372, 3], ['chip', 880, 410, 4], ['coinSpin2', 846, 420, 3], ['coinSpin1', 900, 370, 3]]) S(id, x, y, sc);
vignette();
// the logo with a warm glow behind it
glow(115, 20, 36, '#ff6a4a');
m.title.drawLogo(ctx, W / 2, 80, 3, { chase: 1 });
