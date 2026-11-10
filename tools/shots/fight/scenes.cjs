// The stress scenes: scripted fights (forced lines, a pile of relics, OVERTIME, BUILD-UP, every boss and room), and for
// each of the next turns the frame with the most collisions (then the most words on screen), rendered at 2x.
//   node tools/shots/fight/scenes.cjs <tag> [filter]   -> tools/out/ui/scenes_<tag>/<scene>_t<k>.png + scenes_<tag>.json
const fs = require('node:fs');
const path = require('node:path');
const { open, setup, game, BASE } = require('./lib.cjs');
const TAG = process.argv[2] || 'before';
const FILTER = process.argv[3] || '';
const [SHARD, SHARDS] = (process.argv[4] || '0/1').split('/').map(Number);
const OUT = path.join(BASE, `scenes_${TAG}`);
fs.mkdirSync(OUT, { recursive: true });

const COMMON = ['hotstreak', 'underdog', 'glasscannon', 'devilsdue', 'goldenspin', 'pairstreak', 'steadyhands', 'secondline', 'bash', 'tower', 'phoenix', 'insurance', 'housetax', 'sticky', 'dryspell', 'parachute'];
const OWN = {
  knight: ['greatsword', 'coup', 'crusade'],
  tesla: ['livewire', 'capacitor', 'chainlightning', 'meltdown', 'overcharge'],
  midas: ['compound', 'armoredcar', 'safedeposit', 'rainmaker', 'overcharge'],
  joker: ['encore', 'houseofcards', 'highcard', 'horseshoe', 'overcharge'],
  jukebox: ['hitmaker', 'subwoofer', 'turntable', 'hypeman', 'overcharge'],
};
const ATTACK = { knight: 'sword', tesla: 'bolt', midas: 'goldbar', joker: 'ace', jukebox: 'note' };
const gild = (cab) => [
  { reel: 0, symbol: ATTACK[cab], enh: 'gold', n: 3 },
  { reel: 1, symbol: ATTACK[cab], enh: 'gold', n: 3 },
  { reel: 2, symbol: ATTACK[cab], enh: 'lucre', n: 2 },
  { reel: 2, symbol: ATTACK[cab], enh: 'vamp', n: 2 },
  { reel: 0, symbol: 'shield', enh: 'spiked', n: 2 },
  { reel: 1, symbol: 'shield', enh: 'echo', n: 2 },
];
const rich = (cab, more = {}) => ({ cab, relics: [...OWN[cab], ...COMMON], gilded: gild(cab), chips: 1234, stake: 2, auto: false, speed: 2, ...more });
// What each of your turns is forced to: J a jackpot of your attack symbol, P a pair, S a shield pair, - whatever lands.
const scenes = [
  { name: 'knight_street', ...rich('knight', { act: 1, station: 1, enemy: 'brute' }), turns: 'JPJS', overtime: 15, buildUp: 3, hpShare: 0.4, enemyLines: [['sword', 'sword', 'sword'], ['shield', 'shield', 'sword']] },
  { name: 'knight_house', ...rich('knight', { act: 1, boss: true }), turns: 'PJ-PJP', overtime: 13, buildUp: 2, enemyLines: [['coin', 'coin', 'coin'], ['seven', 'seven', 'seven']] },
  { name: 'knight_frost', ...rich('knight', { act: 1, station: 3, enemy: 'frost', elite: true }), turns: 'PJ-P', overtime: 9, buildUp: 1, enemyLines: [['ice', 'ice', 'ice'], ['ice', 'ice', 'sword']] },
  { name: 'tesla_thief', ...rich('tesla', { act: 1, station: 0, enemy: 'thief' }), turns: 'JPJ-', overtime: 11, buildUp: 2, enemyLines: [['claw', 'claw', 'claw'], ['sword', 'sword', 'sword']] },
  { name: 'midas_wheel', ...rich('midas', { act: 2, boss: true }), turns: 'PJ-PJP', overtime: 13, buildUp: 2, enemyLines: [['ball', 'ball', 'ball'], ['seven', 'seven', 'seven']] },
  { name: 'midas_bomber', ...rich('midas', { act: 2, station: 2, enemy: 'bomber', elite: true }), turns: 'JPJ-', overtime: 11, buildUp: 3, enemyLines: [['bomb', 'bomb', 'bomb'], ['sword', 'sword', 'sword']] },
  { name: 'joker_hexer', ...rich('joker', { act: 2, station: 3, enemy: 'hexer' }), turns: 'JPJ-', overtime: 11, buildUp: 2, enemyLines: [['hex', 'hex', 'hex'], ['sword', 'sword', 'sword']] },
  { name: 'joker_dealer', ...rich('joker', { act: 3, boss: true }), turns: 'PJ-PJPJ', overtime: 13, buildUp: 2, enemyLines: [['seven', 'seven', 'seven'], ['sword', 'sword', 'shield']] },
  { name: 'jukebox_sharp', ...rich('jukebox', { act: 3, station: 1, enemy: 'sharp' }), turns: 'PPJPJ-', overtime: 11, buildUp: 2, enemyLines: [['card', 'card', 'card'], ['sword', 'sword', 'sword']] },
  { name: 'jukebox_endless', ...rich('jukebox', { endless: 2, levels: { note: 9 }, chips: 123456 }), turns: 'PPJPJ-', overtime: 13, buildUp: 2, enemyLines: [['sword', 'sword', 'sword']] },
  { name: 'tesla_endlessboss', ...rich('tesla', { endless: 3, boss: true, levels: { bolt: 14 }, chips: 98765 }), turns: 'JPJ-JP', overtime: 13, buildUp: 2, enemyLines: [['seven', 'seven', 'seven']] },
  { name: 'knight_owner', ...rich('knight', { endless: 5, boss: true, levels: { sword: 30 }, chips: 5, stake: 5 }), turns: 'PJP-', buildUp: 2, enemyLines: [['seven', 'seven', 'seven']] },
  { name: 'knight_mega', ...rich('knight', { act: 2, station: 2, enemy: 'vampire', foeHp: 16000 }), turns: 'JJPJ', overtime: 15, buildUp: 3, hpShare: 0.4, enemyLines: [['fangs', 'fangs', 'fangs'], ['sword', 'sword', 'sword']] },
  { name: 'midas_slime', ...rich('midas', { act: 1, station: 2, enemy: 'slime', chips: 88 }), turns: 'JPJ-', overtime: 11, buildUp: 2, enemyLines: [['slime', 'slime', 'slime'], ['slime', 'slime', 'sword']] },
];

/** The page's tools: one frame's words and plates, and what collides. */
async function tools(page) {
  await page.evaluate(() => {
    if (window.__ui) return;
    const W = 1280, H = 720, K = 2;
    const cv = Object.assign(document.createElement('canvas'), { width: W * K, height: H * K });
    const ctx = cv.getContext('2d');
    const norm = (s) => s.replace(/[0-9]+([.,][0-9]+)?[KMB]?/g, '#');
    const inter = (p, q) => [Math.max(p[0], q[0]), Math.max(p[1], q[1]), Math.min(p[2], q[2]), Math.min(p[3], q[3])];
    const inside = (p, q, tol = 2) => p[0] >= q[0] - tol && p[1] >= q[1] - tol && p[2] <= q[2] + tol && p[3] <= q[3] + tol;
    window.__ui = {
      cv,
      /** Draw the game's frame at 2x and list its collisions (logical coordinates). */
      frame() {
        const g = window.dbg.game;
        const items = [];
        window.dbg.probe((kind, label, c, x, y, w, h) => {
          if (c !== ctx) return;
          const m = c.getTransform();
          const xs = [], ys = [];
          for (const [px, py] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
            xs.push((m.a * px + m.c * py + m.e) / K);
            ys.push((m.b * px + m.d * py + m.f) / K);
          }
          items.push({ kind, label, sc: m.a, a: c.globalAlpha, r: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], i: items.length });
        });
        ctx.setTransform(K, 0, 0, K, 0, 0);
        ctx.imageSmoothingEnabled = false;
        g.draw(ctx);
        window.dbg.probe(null);
        const fg = items.filter((x) => x.a >= 0.3);
        const texts = fg.filter((x) => x.kind === 'text' && x.label.trim());
        const plates = fg.filter((x) => x.kind === 'plate' && x.a >= 0.5);
        const out = [];
        const popping = g.stage.fx.items.some((i) => 'subParts' in i && i.popping);
        const base = items.find((x) => x.kind === 'plate')?.sc ?? 1;
        for (const x of items) x.anim = Math.abs(x.sc / base - 1) > 0.02 && Math.abs(x.sc / base - 1.2) > 0.02;
        const note = (kind0, a, b, kind = popping && (a.anim || b.anim) ? 'pop:' + kind0 : kind0) => out.push({ kind, sig: `${kind} | ${norm(a.label)} | ${norm(b.label)}`, ra: a.r.map(Math.round), rb: b.r.map(Math.round) });
        for (const a of texts) {
          let home = null;
          for (const p of plates) if (p.i < a.i && inside(a.r, p.r)) home = p;
          a.home = home;
          for (const b of texts) {
            if (b.i >= a.i || b.label === a.label) continue;
            if (home && b.home === home) continue;
            const q = inter(a.r, b.r);
            if (q[2] - q[0] >= 4 && q[3] - q[1] >= 3) note('text-text', b, a);
          }
          for (const p of plates) {
            const q = inter(a.r, p.r);
            if (q[2] - q[0] < 4 || q[3] - q[1] < 3) continue;
            if (p.i > a.i) note('covered', a, p);
            else if (!home && !inside(a.r, p.r)) note('straddle', a, p);
          }
        }
        const chips = plates.filter((p) => /^(chip|float|button):/.test(p.label));
        for (const a of chips)
          for (const b of chips) {
            if (b.i <= a.i) continue;
            const q = inter(a.r, b.r);
            if (q[2] - q[0] >= 3 && q[3] - q[1] >= 3) note('chip-chip', a, b);
          }
        return { texts: texts.length, issues: out };
      },
      /** Step `n` 60ths (pressing SPIN when it waits). */
      async steps(n) {
        const g = window.dbg.game;
        for (let i = 0; i < n; i++) {
          if (g.awaitingSpin) g.requestSpin();
          window.__real(1 / 60);
          await window.__yield();
        }
      },
      /** Play the next `n` turns; with `cap`, keep each turn's worst (then busiest) frame. */
      async turns(n, cap) {
        const g = window.dbg.game;
        const d = g.director;
        if (!d.__wrapped) {
          const orig = d.playTurn.bind(d);
          d.__count = { started: 0, done: 0 };
          d.playTurn = async (res) => {
            d.__count.started++;
            try {
              await orig(res);
            } finally {
              d.__count.done++;
            }
          };
          d.__wrapped = true;
        }
        const res = [];
        for (let k = 0; k < n; k++) {
          const target = d.__count.done + 1;
          let best = null;
          let step = 0;
          const seen = new Set();
          while (d.__count.done < target && step < 60 * 40 && g.phase === 'fighting' && !g.screens.active) {
            if (g.awaitingSpin) g.requestSpin();
            if (g.coach.active) g.coach.skipAll();
            window.__real(1 / 60);
            await window.__yield();
            step++;
            if (cap && step % 2 === 0 && d.__count.started >= target) {
              const f = window.__ui.frame();
              for (const is of f.issues) seen.add(is.sig);
              const rest = f.issues.filter((x) => !x.kind.startsWith('pop:')).length;
              const score = rest * 100 + f.issues.length * 10 + f.texts;
              if (!best || score > best.score) best = { score, step, texts: f.texts, issues: f.issues, png: cv.toDataURL('image/png') };
            }
          }
          // (The turn's tail: floats still rising as the next turn waits.)
          const sc = d.lastScore;
          res.push(best ? { ...best, seen: [...seen], steps: step, pay: sc ? sc.groups.map((x) => Math.round(x.base * x.mult)).join('+') : '' } : { steps: step });
        }
        return res;
      },
    };
  });
}

// SHOT=<scene>:<turn>:<step> VIEW=<w>x<h>@<dsf> OUTFILE=<png>: the real page at that window size, stopped on that frame.
const SHOT = process.env.SHOT ? process.env.SHOT.split(':') : null;
const VIEW = /^(\d+)x(\d+)@(\d+(?:\.\d+)?)$/.exec(process.env.VIEW || '1280x720@1');

(async () => {
  const { browser, page, errs } = await open({ width: +VIEW[1], height: +VIEW[2], dsf: +VIEW[3] });
  const all = [];
  for (const [k, sc] of scenes.entries()) {
    if (SHOT ? sc.name !== SHOT[0] : (FILTER && !sc.name.includes(FILTER)) || k % SHARDS !== SHARD) continue;
    const t0 = Date.now();
    await setup(page, sc);
    await tools(page);
    // The public build's bottom bar (no TUNE, no LOG), and the room's station.
    await game(page, `g.publicBuild = true; g.syncButtons(); dbg.station(${sc.station ?? 'null'});`);
    await game(
      page,
      `const f = g.fight;
       if (arg.overtime) f.turn = arg.overtime;
       if (arg.buildUp) { f.buildUp = arg.buildUp; g.stage.gutter.buildUp = f.buildUpMul(); }
       if (arg.hpShare) dbg.hp(Math.round(f.sides.player.maxHp * arg.hpShare));
       if (!f.cfg.enemy.owner) { f.sides.enemy.maxHp = arg.foeHp ?? Math.max(f.sides.enemy.maxHp, 60000); f.sides.enemy.hp = f.sides.enemy.maxHp; Object.assign(g.stage.huds.enemy, { maxHp: f.sides.enemy.maxHp, hp: f.sides.enemy.hp, ghost: f.sides.enemy.hp }); }`,
      sc,
    );
    // One warm-up exchange without a capture (HOLD needs a first spin; the HUDs settle).
    if (process.env.DEBUG) console.log(await game(page, `return { phase: g.phase, over: g.fight.over, aw: g.awaitingSpin, cnt: g.director.__count, hp: g.fight.sides.player.hp, ehp: g.fight.sides.enemy.hp, coach: g.coach.active }`));
    const warm = await page.evaluate(() => window.__ui.turns(2, false));
    if (process.env.DEBUG) console.log(warm, await game(page, `return { phase: g.phase, over: g.fight.over, aw: g.awaitingSpin, cnt: g.director.__count, scr: g.screens.mode }`));
    let e = 0;
    for (const [i, ch] of [...sc.turns].entries()) {
      const atk = ATTACK[sc.cab];
      const line = ch === 'J' ? [atk, atk, atk] : ch === 'P' ? [atk, atk, 'shield'] : ch === 'S' ? ['shield', 'shield', atk] : null;
      const foe = sc.enemyLines?.[e++ % (sc.enemyLines?.length || 1)] ?? null;
      await game(
        page,
        `const f = g.fight; const I = arg.I;
         if (arg.line) f.forceNext('player', arg.line);
         if (arg.foe) f.forceNext('enemy', arg.foe);
         if (!f.cfg.enemy.owner && f.sides.enemy.hp > 0) f.sides.enemy.hp = f.sides.enemy.maxHp;
         if (f.sides.player.hp < f.sides.player.maxHp * 0.25) f.sides.player.hp = Math.round(f.sides.player.maxHp * 0.45);`,
        { line, foe },
      );
      // A HOLD before every other spin of yours (a real tap on the middle reel).
      if (i % 2 === 1) await page.evaluate(async () => { const I = await import('/src/gameInput.ts'); const g = window.dbg.game; if (g.canHold()) I.tapHold(g, 1); });
      if (SHOT && (+SHOT[1] === i * 2 || +SHOT[1] === i * 2 + 1)) {
        // Up to the frame the capture kept, then the page as the player's window shows it.
        if (+SHOT[1] % 2) await page.evaluate(() => window.__ui.turns(1, false));
        await page.evaluate((n) => window.__ui.steps(n), +SHOT[2]);
        await new Promise((r) => setTimeout(r, 250));
        await page.screenshot({ path: process.env.OUTFILE });
        console.log('shot', process.env.OUTFILE);
        await browser.close();
        return;
      }
      const res = await page.evaluate((cap) => window.__ui.turns(2, cap), !SHOT);
      if (process.env.DEBUG) console.log(res.map((r) => [r.steps, r.score, r.texts]));
      res.forEach((r, j) => {
        if (!r.png) return;
        const name = `${sc.name}_t${i * 2 + j}`;
        fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(r.png.split(',')[1], 'base64'));
        all.push({ scene: sc.name, turn: i * 2 + j, who: j ? 'enemy' : 'player', forced: j ? foe : ch, file: `${name}.png`, step: r.step, steps: r.steps, texts: r.texts, pay: r.pay, worst: r.issues.map((x) => x.sig), seen: r.seen });
      });
    }
    console.log(sc.name, `${Date.now() - t0}ms`, all.filter((x) => x.scene === sc.name).map((x) => `t${x.turn}:${x.worst.length}/${x.seen.length}(${x.pay})`).join(' '), errs.slice(-2));
  }
  fs.writeFileSync(path.join(OUT, `part_${SHARD}.json`), JSON.stringify(all, null, 1));
  await browser.close();
})();
