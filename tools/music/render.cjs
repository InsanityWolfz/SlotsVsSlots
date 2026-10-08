// Renders every song of the soundtrack to WAV (offline, in headless Chromium, through the dev server) so it can be
// listened to without playing the game. Run: npx vite --port 5173 & then
//   NODE_PATH=<playwright> node tools/music/render.cjs <outDir> [seconds] [song]
// Each render covers at least the intro, one full loop and 3 s past the loop point, and reports the in-game peak/RMS
// plus a seam check: the largest sample jump around the loop point against the song's own 99.9th percentile jump
// (a ratio near or under 1 means no click).
const { chromium } = require('playwright');
const fs = require('fs');
const out = process.argv[2] || 'tools/out/music';
const secs = Number(process.argv[3] || 40);
const only = process.argv[4] || null;
(async () => {
  fs.mkdirSync(out, { recursive: true });
  let b;
  try {
    b = await chromium.launch();
  } catch {
    b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  }
  const p = await b.newPage();
  await p.goto('http://localhost:5173/');
  const res = await p.evaluate(
    async ({ secs, only }) => {
      const m = await import('/src/audio/music.ts');
      const rate = 32000;
      const songs = Object.keys(m.SONGS).filter((id) => !only || id === only);
      const outs = {};
      for (const id of songs) {
        const score = m.compose(id);
        const t0 = 0.05;
        const seam = t0 + (score.intro + score.loop) * score.stepDur;
        const len = Math.max(secs, seam + 3);
        const ctx = new OfflineAudioContext(1, Math.ceil(rate * len), rate);
        // The game's mix: the music bus sits at -14 dB under the master (0.7).
        const master = ctx.createGain();
        master.gain.value = 0.7 * 10 ** (-14 / 20) * m.MUSIC_GAIN;
        master.connect(ctx.destination);
        const v = new m.ChipVoices(ctx, master);
        for (let i = 0, t = t0; t < len - 0.3; i++, t += score.stepDur) m.playStep(v, score, i, t);
        const buf = await ctx.startRendering();
        const d = buf.getChannelData(0);
        let peak = 0, sum = 0;
        for (const x of d) { peak = Math.max(peak, Math.abs(x)); sum += x * x; }
        const jumps = new Float32Array(d.length - 1);
        for (let i = 1; i < d.length; i++) jumps[i - 1] = Math.abs(d[i] - d[i - 1]);
        const sorted = Float32Array.from(jumps).sort();
        const p999 = sorted[Math.floor(sorted.length * 0.999)];
        const s0 = Math.floor((seam - 0.02) * rate), s1 = Math.floor((seam + 0.02) * rate);
        let seamJump = 0;
        for (let i = s0; i < s1; i++) seamJump = Math.max(seamJump, jumps[i]);
        // Reference: the same measure at an ordinary section downbeat inside the loop (the 2nd section's).
        let ref = score.intro + 1;
        while (ref < score.steps.length && score.steps[ref].sec === score.steps[ref - 1].sec) ref++;
        const rt = t0 + ref * score.stepDur;
        let refJump = 0;
        for (let i = Math.floor((rt - 0.02) * rate); i < Math.floor((rt + 0.02) * rate); i++) refJump = Math.max(refJump, jumps[i]);
        // Normalize the preview file to -1 dBFS so it's audible on a phone; report the in-game levels.
        const k = 0.89 / (peak || 1);
        const pcm = new Int16Array(d.length);
        for (let i = 0; i < d.length; i++) pcm[i] = Math.max(-32767, Math.min(32767, d[i] * k * 32767));
        outs[id] = { peak, rms: Math.sqrt(sum / d.length), seam, seamRatio: seamJump / (p999 || 1), refRatio: refJump / (p999 || 1), pcm: Array.from(new Uint8Array(pcm.buffer)) };
      }
      return { rate, outs };
    },
    { secs, only },
  );
  for (const [id, o] of Object.entries(res.outs)) {
    const data = Buffer.from(o.pcm);
    const h = Buffer.alloc(44);
    h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
    h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(res.rate, 24);
    h.writeUInt32LE(res.rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
    fs.writeFileSync(`${out}/${id}.wav`, Buffer.concat([h, data]));
    console.log(`${id}: in-game peak ${o.peak.toFixed(3)} rms ${o.rms.toFixed(4)} | loop point ${o.seam.toFixed(1)}s, seam jump x${o.seamRatio.toFixed(2)} of p99.9 (a section downbeat: x${o.refRatio.toFixed(2)})`);
  }
  await b.close();
})();
