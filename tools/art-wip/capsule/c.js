// C: THE JACKPOT. Sir Reginald's Slot Machine pays out big; the logo on the right.
sky(70); skyline(74, { seed: 4 });
street(80);
glow(60, 60, 50, '#6ab4ff'); glow(115, 95, 30, '#ffb04a');
S('cabinetKnight', 240, 236, 5);
S('heroKnight', 96, H - 70, 5);
// the payout: coins and chips arcing out of the tray
const spray = [['coinSpin0', 300, 360, 3], ['coinSpin1', 350, 320, 3], ['coinSpin2', 410, 300, 3], ['coinSpin3', 460, 330, 3], ['coinSpin0', 500, 380, 3], ['chip', 380, 380, 4], ['chip', 440, 395, 4], ['seven', 360, 250, 3], ['coinSpin1', 520, 280, 2], ['chip', 300, 405, 3]];
for (const [id, x, y, sc] of spray) S(id, x, y, sc);
vignette();
m.title.drawLogo(ctx, 660, 150, 2, { chase: 2 });
