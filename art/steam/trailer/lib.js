// Page side of the trailer recorder: the real game loop stepped at a locked 60 fps, its sound effects scheduled on an
// OfflineAudioContext at the video's own clock (vt), only while recording. Cards are drawn straight on the canvas.
const g = dbg.game;
g.publicBuild = true;
const Syn = (await import('/src/audio/synth.ts')).Synth;
const M = await import('/src/audio/music.ts');
const title = await import('/src/ui/menu/title.ts');
const TX = await import('/src/render/text.ts');
const E = await import('/src/core/enemies.ts');
const R = await import('/src/core/rng.ts');
const SONG = window.__song || 'house';
const LEN = 70, SR = 48000;
const off = new OfflineAudioContext(2, SR * LEN, SR);
g.audioStarted = true; // no in-game MusicPlayer: the music bed is rendered apart (musicWav)
const RealAC = window.AudioContext;
window.AudioContext = function () { return off; };
const s = new Syn();
window.AudioContext = RealAC;
let vt = 0, rec = false;
Object.defineProperty(s, 'now', { get: () => vt });
Object.defineProperty(s, 'tune', { get: () => 2 ** (M.SONG_HOME[SONG] / 12), set() {} });
for (const k of ['tone', 'noise', 'duck', 'startAmbient']) { const f = s[k].bind(s); s[k] = (...a) => (rec ? f(...a) : undefined); }
{ const f = s.loop.bind(s); s.loop = (...a) => (rec ? f(...a) : () => {}); }
g.synth = s; g.sounds.s = s;
g.applyJuice();
// at(t, fn): play a sound effect at an exact time (beat-synced), not the frame's
const at = (t, fn) => { const keep = vt, was = rec; vt = t; rec = true; fn(); vt = keep; rec = was; };
// the song's beat (the music bed itself is rendered apart, musicWav, and laid in by mix.sh at 2 bars)
const BEAT = 60 / M.compose(SONG).bpm;
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
let vnow = performance.now() + 1000;
let frames = 0;
async function frame(record) {
  vnow += 1000 / 60;
  rec = record;
  window.__rafCb(vnow);
  if (record) { vt += 1 / 60; frames++; await window.saveFrame(canvas.toDataURL('image/png')); }
}
const idle = async (n) => { for (let i = 0; i < n; i++) await frame(false); };
const recf = async (n, each) => { for (let i = 0; i < n; i++) { each?.(i); await frame(true); } };
const idleUntil = async (cond, max = 900) => { for (let i = 0; i < max && !cond(); i++) { if (g.bossCard) g.bossCard = false; await frame(false); } };
const img = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
const BG_OPEN = await img(window.__bgOpen), BG_END = await img(window.__bgEnd);
// a card frame: draw() paints the canvas; sound effects still schedule at vt
async function card(n, draw) {
  for (let i = 0; i < n; i++) {
    rec = true;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    draw(i);
    vt += 1 / 60; frames++;
    await window.saveFrame(canvas.toDataURL('image/png'));
  }
}
function scene(cab, id, act = 1, seed = 7) {
  s.stopLoops();
  g.menus.hide();
  g.startRun(seed, cab, 0); const run = g.run; run.pendingStart = null;
  const boss = ['house', 'wheel', 'dealer', 'owner'].includes(id);
  const a = id === 'house' ? E.BOSS : id === 'wheel' ? E.WHEEL : id === 'dealer' ? E.DEALER : E.ARCHETYPES.find((x) => x.id === id);
  if (boss) dbg.toBoss();
  run.enemies[run.depth] = E.makeEnemy(a, 0, new R.Rng(seed), boss, act);
  g.beginRunFight();
}
async function fight(cab, id, act, line, pre, post) {
  scene(cab, id, act);
  await idleUntil(() => g.awaitingSpin && !g.bossCard);
  await idle(20);
  await recf(pre);
  g.fight.forceNext('player', line); g.key(' ');
  await recf(post);
}
const text = (t, x, y, sc, col, o = {}) => TX.drawText(ctx, t, x, y, sc, col, { align: 'center', ...o });
const dim = (a) => { ctx.fillStyle = `rgba(6,2,12,${a})`; ctx.fillRect(0, 0, 1280, 720); };
window.trailer = async () => {
  // A: cold open on the song's grid: bulbs light on the eighth notes for a bar, the sign comes on with its fanfare
  // on the next downbeat, and the song drops in on the bar after, on the cut to the first spin
  const E8 = BEAT / 2, BAR = 4 * BEAT;
  for (let k = 0; k < 8; k++) at(k * E8, () => g.sounds.tick((k + 1) / 8));
  at(BAR, () => g.sounds.fanfareJackpot());
  await card(Math.round(2 * BAR * 60), (i) => {
    const t = i / 60;
    ctx.drawImage(BG_OPEN, 0, 0);
    const lit = Math.min(1, (Math.floor(t / E8) + 1) / 8);
    title.drawLogo(ctx, 640, 300, 5, { lit, on: t < BAR ? 0.35 + 0.4 * lit : 1, chase: t >= BAR ? Math.floor((t - BAR) / E8) : 0 });
  });
  // B: Tesla's mega win
  await fight('tesla', 'croupier', 1, ['bolt', 'bolt', 'bolt'], 20, 240);
  // C: card
  await card(120, (i) => {
    ctx.drawImage(BG_OPEN, 0, 0); dim(0.6);
    if (i === 0 || i === 36) g.sounds.stingerSmall();
    text('TWO SLOT MACHINES.', 640, 320, 6, '#ffd23f');
    if (i >= 36) text('ONE BRAWL.', 640, 410, 6, '#ff6a5a', { punch: i < 44 ? 1 + (44 - i) * 0.05 : 1 });
  });
  // D: Knight jackpots the House and steals its pot
  await fight('knight', 'house', 1, ['sword', 'sword', 'sword'], 15, 390);
  // E: the street map
  s.stopLoops();
  g.startRun(3, 'joker', 0); { const r = g.run; r.pendingStart = null; r.depth = 1; r.stop = 1; g.screens.showNext(r); }
  await idle(50);
  const cards = g.screens.cards;
  await recf(200, (i) => {
    const c = i < 60 ? cards[0] : cards[1];
    if (i === 0 || i === 60) g.pointerMove(c.x, c.y);
    if (i === 110) { g.pointerDown(c.x, c.y); g.pointerUp(c.x, c.y); }
    if (i === 150) { const b = g.screens.buttons[0]; g.pointerMove(b.x, b.y); }
  });
  // F, G: the Joker's wild, the Jukebox's notes
  await fight('joker', 'sharp', 2, ['ace', 'wild', 'ace'], 15, 260);
  await fight('jukebox', 'hexer', 2, ['note', 'note', 'note'], 15, 250);
  // H: card
  await card(100, (i) => {
    ctx.drawImage(BG_OPEN, 0, 0); dim(0.6);
    if (i === 0) g.sounds.stingerMedium();
    text('BEAT THE HOUSE.', 640, 360, 7, '#ffd23f', { punch: i < 8 ? 1 + (8 - i) * 0.05 : 1 });
  });
  // I, J: the bosses
  await fight('knight', 'wheel', 2, ['sword', 'sword', 'sword'], 15, 250);
  await fight('tesla', 'dealer', 3, ['bolt', 'bolt', 'bolt'], 15, 260);
  // K: the gang, the marquee, wishlist
  s.stopLoops();
  await card(270, (i) => {
    ctx.drawImage(BG_END, 0, 0);
    if (i === 0) g.sounds.fanfareJackpot();
    title.drawLogo(ctx, 640, 118, 4, { chase: Math.floor(i / 5) });
    if (i >= 40) text('WISHLIST NOW ON STEAM', 640, 236, 3, '#ffffff', { alpha: Math.min(1, (i - 40) / 12) });
  });
  return frames;
};
// the sound effects as a 16-bit stereo WAV (base64), trimmed to the video
window.sfxWav = async () => {
  const buf = await off.startRendering();
  const n = Math.ceil(vt * SR), ch = [buf.getChannelData(0), buf.getChannelData(1)];
  const dv = new DataView(new ArrayBuffer(44 + n * 4));
  const w = (o, str) => [...str].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
  dv.setUint32(24, SR, true); dv.setUint32(28, SR * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) dv.setInt16(44 + i * 4 + c * 2, Math.max(-1, Math.min(1, ch[c][i])) * 32767, true);
  const u = new Uint8Array(dv.buffer); let bin = '';
  for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(bin);
};
// the song, rendered the way tools/music/render.cjs does, louder (a trailer's music bed)
window.musicWav = async (secs) => {
  const score = M.compose(SONG);
  const mctx = new OfflineAudioContext(1, Math.ceil(SR * secs), SR);
  const master = mctx.createGain(); master.gain.value = 0.7 * M.MUSIC_GAIN; master.connect(mctx.destination);
  const v = new M.ChipVoices(mctx, master);
  for (let i = 0, t = 0.05; t < secs - 0.3; i++, t += score.stepDur) M.playStep(v, score, i, t);
  const buf = await mctx.startRendering(); const d = buf.getChannelData(0), n = d.length;
  const dv = new DataView(new ArrayBuffer(44 + n * 2));
  const w = (o, str) => [...str].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, SR, true); dv.setUint32(28, SR * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true);
  const u = new Uint8Array(dv.buffer); let bin = '';
  for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(bin);
};
return 'lib ready';
