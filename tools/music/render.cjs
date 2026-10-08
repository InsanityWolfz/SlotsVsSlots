// Renders every song of the soundtrack to WAV (offline, in headless Chromium, through the dev server) so it can be
// listened to without playing the game. Run: npx vite --port 5173 & then
//   NODE_PATH=<playwright> node tools/music/render.cjs <outDir> [seconds]
const { chromium } = require('playwright');
const fs = require('fs');
const out = process.argv[2] || 'tools/out/music';
const secs = Number(process.argv[3] || 40);
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://localhost:5173/');
  const res = await p.evaluate(async (secs) => {
    const m = await import('/src/audio/music.ts');
    const rate = 32000;
    const songs = Object.keys(m.SONGS);
    const outs = {};
    for (const id of songs) {
      const ctx = new OfflineAudioContext(1, rate * secs, rate);
      // The game's mix: the music bus sits at -14 dB under the master (0.7).
      const master = ctx.createGain();
      master.gain.value = 0.7 * 10 ** (-14 / 20) * m.MUSIC_GAIN;
      master.connect(ctx.destination);
      const v = new m.ChipVoices(ctx, master);
      const score = m.compose(id);
      const stepDur = 60 / score.spec.bpm / 4;
      for (let i = 0, t = 0.05; t < secs - 0.3; i++, t += stepDur) m.playStep(v, score, i % m.SONG_STEPS, t);
      const buf = await ctx.startRendering();
      const d = buf.getChannelData(0);
      let peak = 0, sum = 0;
      for (const x of d) { peak = Math.max(peak, Math.abs(x)); sum += x * x; }
      // Normalize the preview file to -1 dBFS so it's audible on a phone; report the in-game levels.
      const k = 0.89 / (peak || 1);
      const pcm = new Int16Array(d.length);
      for (let i = 0; i < d.length; i++) pcm[i] = Math.max(-32767, Math.min(32767, d[i] * k * 32767));
      outs[id] = { peak, rms: Math.sqrt(sum / d.length), pcm: Array.from(new Uint8Array(pcm.buffer)) };
    }
    return { rate, outs };
  }, secs);
  for (const [id, o] of Object.entries(res.outs)) {
    const data = Buffer.from(o.pcm);
    const h = Buffer.alloc(44);
    h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
    h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(res.rate, 24);
    h.writeUInt32LE(res.rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
    fs.writeFileSync(`${out}/${id}.wav`, Buffer.concat([h, data]));
    console.log(`${id}: in-game peak ${o.peak.toFixed(3)} rms ${o.rms.toFixed(4)}`);
  }
  await b.close();
})();
