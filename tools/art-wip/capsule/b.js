// B: THE GANG. The hero front and centre, the crooked casino town crowded behind him.
sky(66); skyline(70, { seed: 9 });
street(76);
glow(115, 95, 50, '#ffe6aa');
const back = [['enemyBoss', 120, 250, 4], ['enemyOwner', 800, 250, 4]];
const mid = [['enemyBrute', 215, 300, 5], ['enemyPitBoss', 705, 300, 5]];
const front = [['enemyPortrait', 300, 350, 5], ['enemyBomber', 620, 350, 5]];
for (const [id, x, y, sc] of back) S(id, x, y, sc, { dim: 0.45 });
for (const [id, x, y, sc] of mid) S(id, x, y, sc, { dim: 0.25 });
for (const [id, x, y, sc] of front) S(id, x, y, sc, { dim: 0.1 });
S('heroKnight', W / 2, H - 100, 7);
vignette();
m.title.drawLogo(ctx, W / 2, 80, 3, { chase: 1 });
