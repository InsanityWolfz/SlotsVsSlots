// Direction B, FIGHT NIGHT: a boxing-night poster. The two Slot Machines in a ring under one overhead light, the
// crowd as dark silhouettes (they frame, they don't compete), billing under the logo. Everything at the one scale.
const cx = W / 2;
// the hall: dark, warm at the top where the light hangs
for (let y = 0; y < H; y += P) px(0, y, W, P, y < 200 ? '#120a1c' : '#0c0714');
// the overhead light: one cone from the top centre down onto the ring, stepped bands
for (let y = 190; y < 600; y += P) {
  const k = (y - 190) / 410, hw = 120 + k * 420;
  px(cx - hw, y, hw * 2, P, '#ffe6aa', 0.05 + 0.03 * (1 - k));
}
// the ring canvas: a trapezoid floor in perspective, lit centre
const top = 470, bot = 600;
for (let y = top; y < bot; y += P) {
  const k = (y - top) / (bot - top), hw = 430 + k * 140;
  px(cx - hw, y, hw * 2, P, k < 0.05 ? '#5a4a6a' : '#2a2038');
}
pool(cx, 535, 360, 55, '#ffe6aa', 0.10);
// the apron with the billing
px(cx - 570, bot, 1140, 70, '#5a0e1e');
px(cx - 570, bot, 1140, P, '#ffd23f');

// the far ropes: behind the machines (the ring's back side), posts at the corners
for (const [y, c] of [[330, '#7a2030'], [370, '#8a8494'], [410, '#203a7a']]) px(cx - 560, y, 1120, P * 2, c);
for (const x of [cx - 570, cx + 560]) { px(x, 300, P * 3, 175, '#7a5a1e'); px(x, 300, P * 3, P * 2, '#ffd23f'); }
// the machines, lit from straight above
const mine = lit(spr('cabinetKnight'), 24, -20, '#ffe6aa', 0.5, 0.45);
const theirs = lit(house(), 24, -20, '#ffe6aa', 0.5, 0.45);
shadow(cx - 230, 535, 250, 0, 0.6);
shadow(cx + 230, 535, 250, 0, 0.6);
put(mine, cx - 230, 530);
put(theirs, cx + 230, 530, true);
// the crowd: silhouettes at the one scale along the bottom, near-black, rim-lit by the ring
seed = 4;
const crowdIds = ['heroJoker', 'heroTesla', 'enemyRepoMan', 'enemyCroupier', 'enemyGremlin', 'heroJukebox', 'enemyWheel', 'enemyDealer', 'enemyBoss', 'heroKnight'];
for (let i = 0; i < 11; i++) {
  const id = crowdIds[i % crowdIds.length];
  const x = 40 + i * 118 + (rnd() - 0.5) * 30;
  if (Math.abs(x - cx) < 200) continue;
  m.sprites.drawSprite(ctx, id, Math.round(x / P) * P, H + 30 + Math.round(rnd() * 3) * P, P, { dim: 0.94 });
}
txt('YOUR SLOT MACHINE  VS  THE HOUSE', cx, bot + 22, 3, '#ffd23f');
// the hit: one sword in the air between them, the moment before it lands
for (const [x, y] of [[cx - 70, 380], [cx + 10, 380], [cx + 90, 380]]) m.sprites.drawSprite(ctx, 'swordProjectile', x, y, P);
// the logo: the fight's top billing, hung in the light
m.title.drawLogo(ctx, cx, 112, 4, { chase: 1 });
txt('TONIGHT ONLY', cx, 200, 2, '#a99bb5');
vignette();
