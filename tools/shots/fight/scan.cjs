// The overlap scan: plays long fights for every machine against every boss / enemy trick, with a pile of relics, and
// asks the layout probe (dbg.probe) which words overlap, sit under a later plate, straddle a plate's edge or leave the
// screen. Usage: node tools/shots/fight/scan.cjs <tag> [filter]   -> tools/out/ui/scan_<tag>.json + crops in scan_<tag>/
const fs = require('node:fs');
const path = require('node:path');
const { open, setup, game, BASE } = require('./lib.cjs');
const TAG = process.argv[2] || 'before';
const FILTER = process.argv[3] || '';
const [SHARD, SHARDS] = (process.argv[4] || '0/1').split('/').map(Number);
const OUT = path.join(BASE, `scan_${TAG}`);
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
const CABS = ['knight', 'tesla', 'midas', 'joker', 'jukebox'];
const scenes = [];
for (const cab of CABS) {
  const gilded = [
    { reel: 0, symbol: ATTACK[cab], enh: 'gold', n: 2 },
    { reel: 1, symbol: ATTACK[cab], enh: 'vamp', n: 2 },
    { reel: 2, symbol: ATTACK[cab], enh: 'lucre', n: 1 },
    { reel: 2, symbol: ATTACK[cab], enh: 'lucky', n: 1 },
    { reel: 0, symbol: 'shield', enh: 'spiked', n: 1 },
    { reel: 1, symbol: 'shield', enh: 'echo', n: 1 },
  ];
  const base = { cab, relics: [...OWN[cab], ...COMMON], gilded, chips: 1234, stake: 2, auto: true, speed: 2 };
  scenes.push({ ...base, name: `${cab}_house`, act: 1, boss: true });
  scenes.push({ ...base, name: `${cab}_wheel`, act: 2, boss: true });
  scenes.push({ ...base, name: `${cab}_dealer`, act: 3, boss: true });
  scenes.push({ ...base, name: `${cab}_endless`, endless: 2, levels: { [ATTACK[cab]]: 9 }, chips: 123456 });
  scenes.push({ ...base, name: `${cab}_endlessboss`, endless: 3, boss: true, levels: { [ATTACK[cab]]: 14 }, chips: 98765 });
}
// Every enemy trick, spread over the machines and acts.
const ENEMIES = [['slime', 1], ['brute', 1], ['frost', 1], ['thief', 1], ['golem', 1], ['gremlin', 1], ['repo', 2], ['bomber', 2], ['hexer', 2], ['vampire', 2], ['counterfeiter', 2], ['sharp', 3], ['pitboss', 3], ['croupier', 3]];
ENEMIES.forEach(([enemy, act], i) => {
  const cab = CABS[i % CABS.length];
  scenes.push({ cab, name: `${cab}_${enemy}_act${act}`, act, enemy, elite: i % 2 === 0, relics: [...OWN[cab], ...COMMON], chips: 77, stake: i % 4, auto: i % 3 !== 0, speed: 2 });
});
scenes.push({ cab: 'knight', name: 'knight_owner', owner: true, endless: 5, boss: true, relics: [...OWN.knight, ...COMMON], levels: { sword: 30 }, chips: 5, stake: 5, auto: true });

/** In the page: play `secs` of game time, probing a frame every 3 steps. */
async function scan(page, sc, secs) {
  return page.evaluate(
    async ([sc, secs, attack]) => {
      const dbg = window.dbg;
      const g = dbg.game;
      const W = 1280, H = 720;
      const cv = (window.__cv ??= Object.assign(document.createElement('canvas'), { width: W, height: H }));
      const ctx = cv.getContext('2d');
      let items = [];
      let layer = 'fg';
      const bg = g.background;
      if (!bg.__wrapped) {
        const d = bg.draw.bind(bg);
        bg.draw = (c, t) => {
          window.__layer = 'bg';
          d(c, t);
          window.__layer = 'fg';
        };
        bg.__wrapped = true;
      }
      dbg.probe((kind, label, c, x, y, w, h) => {
        if (c !== ctx) return;
        const m = c.getTransform();
        const xs = [], ys = [];
        for (const [px, py] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
          xs.push(m.a * px + m.c * py + m.e);
          ys.push(m.b * px + m.d * py + m.f);
        }
        items.push({ kind, label, layer: window.__layer || 'fg', sc: m.a, a: c.globalAlpha, r: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], i: items.length });
      });
      const norm = (s) => s.replace(/[0-9]+([.,][0-9]+)?[KMB]?/g, '#');
      const inter = (p, q) => [Math.max(p[0], q[0]), Math.max(p[1], q[1]), Math.min(p[2], q[2]), Math.min(p[3], q[3])];
      const inside = (p, q, tol = 2) => p[0] >= q[0] - tol && p[1] >= q[1] - tol && p[2] <= q[2] + tol && p[3] <= q[3] + tol;
      const found = new Map();
      let popping = false;
      const note = (kind, a, b, t) => {
        if (popping && (a.anim || b?.anim)) kind = 'pop:' + kind;
        const sig = `${kind} | ${norm(a.label)} | ${b ? norm(b.label) : ''}`;
        const u = b ? [Math.min(a.r[0], b.r[0]), Math.min(a.r[1], b.r[1]), Math.max(a.r[2], b.r[2]), Math.max(a.r[3], b.r[3])] : a.r;
        let f = found.get(sig);
        if (!f) {
          f = { sig, kind, a: a.label, b: b?.label ?? '', ra: a.r.map(Math.round), rb: b?.r.map(Math.round), n: 0, t, u: u.map(Math.round), shot: null };
          found.set(sig, f);
          // The first sighting's picture: the pair's surroundings, boxed.
          const pad = 70;
          const x0 = Math.max(0, u[0] - pad), y0 = Math.max(0, u[1] - pad), x1 = Math.min(W, u[2] + pad), y1 = Math.min(H, u[3] + pad);
          const crop = document.createElement('canvas');
          crop.width = (x1 - x0) * 2;
          crop.height = (y1 - y0) * 2;
          const cc = crop.getContext('2d');
          cc.imageSmoothingEnabled = false;
          cc.drawImage(cv, x0, y0, x1 - x0, y1 - y0, 0, 0, crop.width, crop.height);
          cc.lineWidth = 1;
          for (const [it, col] of [[a, '#ff2020'], [b, '#20ff40']]) {
            if (!it) continue;
            cc.strokeStyle = col;
            cc.strokeRect((it.r[0] - x0) * 2 - 1, (it.r[1] - y0) * 2 - 1, (it.r[2] - it.r[0]) * 2 + 2, (it.r[3] - it.r[1]) * 2 + 2);
          }
          f.shot = crop.toDataURL('image/png');
        }
        f.n++;
      };
      const analyze = (t) => {
        popping = g.stage.fx.items.some((i) => 'subParts' in i && i.popping);
        const base = items.find((x) => x.kind === 'plate')?.sc ?? 1;
        for (const x of items) x.anim = Math.abs(x.sc / base - 1) > 0.02 && Math.abs(x.sc / base - 1.2) > 0.02;
        const fg = items.filter((x) => x.layer === 'fg' && x.a >= 0.3);
        const texts = fg.filter((x) => x.kind === 'text' && x.label.trim());
        const plates = fg.filter((x) => x.kind === 'plate' && x.a >= 0.5);
        const signs = items.filter((x) => x.layer === 'bg' && x.kind === 'text');
        for (const a of texts) {
          if (a.r[0] < -2 || a.r[1] < -2 || a.r[2] > W + 2 || a.r[3] > H + 2) note('offscreen', a, null, t);
          // Its home: the last plate drawn before it that holds it.
          let home = null;
          for (const p of plates) if (p.i < a.i && inside(a.r, p.r)) home = p;
          a.home = home;
          for (const b of texts) {
            if (b.i >= a.i || b.label === a.label) continue;
            // (Two lines of one banner or chip share a home: its own layout, a few outline pixels apart.)
            if (home && b.home === home) continue;
            const q = inter(a.r, b.r);
            if (q[2] - q[0] >= 4 && q[3] - q[1] >= 3) note('text-text', b, a, t);
          }
          for (const p of plates) {
            const q = inter(a.r, p.r);
            if (q[2] - q[0] < 4 || q[3] - q[1] < 3) continue;
            if (p.i > a.i) note('covered', a, p, t);
            else if (!home && !inside(a.r, p.r)) note('straddle', a, p, t);
          }
          for (const s of signs) {
            const q = inter(a.r, s.r);
            if (q[2] - q[0] >= 4 && q[3] - q[1] >= 3) note('sign', a, s, t);
          }
        }
        // Chips and float plates against each other (a panel under a chip is its home; two chips crossing isn't).
        const chips = plates.filter((p) => /^(chip|float|button):/.test(p.label));
        for (const a of chips)
          for (const b of chips) {
            if (b.i <= a.i) continue;
            const q = inter(a.r, b.r);
            if (q[2] - q[0] >= 3 && q[3] - q[1] >= 3) note('chip-chip', a, b, t);
          }
        // A room sign half under a plate: its letters peek out around the chip.
        for (const sgn of signs)
          for (const p of plates) {
            const q = inter(sgn.r, p.r);
            if (q[2] - q[0] >= 3 && q[3] - q[1] >= 3 && !inside(sgn.r, p.r, 0)) note('sign-plate', sgn, p, t);
          }
        // Signs under plates don't matter (the plate hides them); signs beside chips do, as crowding: left to the eye.
      };
      const f0 = g.fight;
      let t = 0;
      let spins = 0;
      let lastTurn = -1;
      const wantHp = sc.hpPlan ?? 'cycle';
      secs = Math.min(secs, 110);
      for (let i = 0; i < secs * 60; i++) {
        if (g.fight !== f0 || g.phase !== 'fighting' || g.fight.over) break;
        const f = g.fight;
        // Keep the fight going (into OVERTIME), through low HP and back.
        
        if (wantHp === 'cycle' && f.sides.player.hp < f.sides.player.maxHp * 0.12 && t < secs - 25) f.sides.player.hp = Math.round(f.sides.player.maxHp * 0.6);
        if (f.next === 'player' && f.turn !== lastTurn) {
          lastTurn = f.turn;
          spins++;
          if (t < secs - 20 && !f.cfg.enemy.owner && f.sides.enemy.hp > 0) f.sides.enemy.hp = f.sides.enemy.maxHp;
          // Every third spin of yours a forced jackpot, every third a pair; a HOLD when one can be made.
          if (spins % 3 === 0) f.forceNext('player', [attack, attack, attack]);
          else if (spins % 3 === 1) f.forceNext('player', [attack, attack, 'shield']);
          if (spins % 4 === 2 && g.canHold()) {
            const I = await import('/src/gameInput.ts');
            I.tapHold(g, spins % 3);
          }
        }
        if (g.awaitingSpin) g.requestSpin();
        if (g.coach.active) g.coach.skipAll();
        window.__real(1 / 60);
        await window.__yield();
        t += 1 / 60;
        if (i % 3 === 0 && !g.screens.active && !g.pause.open && !g.coach.active) {
          items = [];
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.imageSmoothingEnabled = false;
          g.draw(ctx);
          analyze(Math.round(t * 100) / 100);
        }
      }
      dbg.probe(null);
      return { secs: Math.round(t), turn: g.stage.gutter.turn, issues: [...found.values()] };
    },
    [sc, secs, ATTACK[sc.cab]],
  );
}

(async () => {
  const { browser, page, errs } = await open({ dsf: 1 });
  const all = [];
  for (const [k, sc] of scenes.entries()) {
    if ((FILTER && !sc.name.includes(FILTER)) || k % SHARDS !== SHARD) continue;
    const t0 = Date.now();
    // The enemy keeps its real HP bar (BIG WIN and MEGA WIN are sized by it) and is topped up before each of your
    // spins; a fight that ends anyway starts again, until the scene has had its time.
    let left = 110;
    let kinds = 0;
    let res = { secs: 0, turn: 0, issues: [] };
    for (let round = 0; left > 12 && round < 8; round++) {
      await setup(page, { ...sc, seed: 7 + round });
      res = await scan(page, sc, left);
      left -= Math.max(5, res.secs);
      for (const is of res.issues) {
        const file = `${sc.name}__${is.kind}_${round}_${all.length}.png`.replace(/[^\w.-]/g, '_');
        fs.writeFileSync(path.join(OUT, file), Buffer.from(is.shot.split(',')[1], 'base64'));
        all.push({ scene: sc.name, ...is, shot: file });
        kinds++;
      }
    }
    res.issues = { length: kinds };
    console.log(sc.name, `${res.secs}s turn ${res.turn}`, `${res.issues.length} kinds`, `${Date.now() - t0}ms`, errs.length ? errs.slice(-2) : '');
  }
  fs.writeFileSync(path.join(OUT, `part_${SHARD}.json`), JSON.stringify(all, null, 1));
  if (SHARDS > 1) return browser.close();
  // The summary: each kind of collision once, with where it was seen.
  const by = new Map();
  for (const x of all) {
    const k = by.get(x.sig) ?? { sig: x.sig, n: 0, scenes: [], shot: x.shot, ra: x.ra, rb: x.rb };
    k.n += x.n;
    k.scenes.push(x.scene);
    by.set(x.sig, k);
  }
  const rows = [...by.values()].sort((a, b) => b.n - a.n);
  fs.writeFileSync(path.join(BASE, `scan_${TAG}.txt`), rows.map((r) => `${String(r.n).padStart(6)}  ${r.sig}   [${r.scenes.length}: ${r.scenes.slice(0, 3).join(', ')}]  ${r.shot}  ${JSON.stringify(r.ra)} ${JSON.stringify(r.rb)}`).join('\n'));
  console.log(`${rows.length} distinct, ${all.reduce((a, x) => a + x.n, 0)} frame hits`, errs.slice(0, 5));
  await browser.close();
})();
