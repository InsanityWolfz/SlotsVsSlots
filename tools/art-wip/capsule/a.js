// A: THE FACE-OFF. Sir Reginald against THE HOUSE under two spotlights, the reels' symbols flying between them.
sky(70); skyline(72);
street(74);
glow(50, 90, 40, '#6ab4ff'); glow(180, 90, 40, '#ffb04a');
// fighters: busts rising from the bottom edge, scale 6
S('heroKnight', 200, H - 92, 6);
S('enemyBoss', 720, H - 92, 6);
// between them: the symbols in the air
const fly = [['sword', 380, 250, 3], ['shield', 540, 270, 3], ['seven', 460, 330, 4], ['coinSpin0', 410, 380, 2], ['coinSpin2', 520, 200, 2], ['chip', 350, 330, 3], ['chip', 575, 350, 3], ['wild', 470, 238, 2]];
for (const [id, x, y, sc] of fly) S(id, x, y, sc);
vignette();
m.title.drawLogo(ctx, W / 2, 82, 3, { chase: 0 });
