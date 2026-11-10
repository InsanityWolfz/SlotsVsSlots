// Merge the scan's shards: node tools/shots/fight/merge.cjs <tag>  -> scan_<tag>.txt (one line per kind of collision)
const fs = require('node:fs');
const path = require('node:path');
const { BASE } = require('./lib.cjs');
const TAG = process.argv[2] || 'before';
const OUT = path.join(BASE, `scan_${TAG}`);
const all = fs.readdirSync(OUT).filter((f) => /^part_\d+\.json$/.test(f)).flatMap((f) => JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8')));
const by = new Map();
for (const x of all) {
  const k = by.get(x.sig) ?? { sig: x.sig, kind: x.kind, n: 0, scenes: new Set(), shot: x.shot, ra: x.ra, rb: x.rb };
  k.n += x.n;
  k.scenes.add(x.scene);
  by.set(x.sig, k);
}
const rows = [...by.values()].sort((a, b) => b.n - a.n);
fs.writeFileSync(path.join(BASE, `scan_${TAG}.json`), JSON.stringify(rows.map((r) => ({ ...r, scenes: [...r.scenes] })), null, 1));
fs.writeFileSync(
  path.join(BASE, `scan_${TAG}.txt`),
  rows.map((r) => `${String(r.n).padStart(6)}  ${r.sig}   [${r.scenes.size}: ${[...r.scenes].slice(0, 2).join(', ')}]  ${r.shot}  ${JSON.stringify(r.ra)} ${JSON.stringify(r.rb ?? '')}`).join('\n'),
);
const kinds = {};
for (const r of rows) kinds[r.kind] = (kinds[r.kind] ?? 0) + 1;
console.log(`${rows.length} distinct collisions, ${all.reduce((a, x) => a + x.n, 0)} frame hits`, kinds);
