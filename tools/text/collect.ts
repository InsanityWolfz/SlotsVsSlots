/** Every word a player can read: the cards as the game shows them, and every other string literal in src/ with two
 * or more capital-letter words. Used by tools/text/dump.ts (the cold read) and tests/terms.test.ts (the term sheet). */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CABINETS, CABINET_ORDER, type CabinetId } from '../../src/core/cabinets';
import { charmRuleText, charmShortText } from '../../src/core/charms';
import type { Enh, RelicId } from '../../src/core/config';
import { RELICS, relicText } from '../../src/core/relics';
import { shortRelicText } from '../../src/ui/run/cardText';


export interface Line {
  where: string;
  id: string;
  text: string;
}

export function collect(): Line[] {
  const out: Line[] = [];
  const add = (where: string, id: string, text: string) => out.push({ where, id, text });

  // Relics: the card face and the full rule, per machine where they differ.
  for (const id of Object.keys(RELICS) as RelicId[]) {
    const seen = new Set<string>();
    for (const cab of CABINET_ORDER as CabinetId[]) {
      // (A machine's own relic is only ever offered on that machine: no player reads GREATSWORD on BANKROLL.)
      if (RELICS[id].machine && RELICS[id].machine !== cab) continue;
      const full = relicText(id, cab);
      const face = shortRelicText(id, full);
      const key = `${face}|${full}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const who = seen.size === 1 ? '' : ` (${CABINETS[cab].name})`;
      add('relic card face', `${RELICS[id].name}${who}`, face);
      if (full !== face) add('relic full rule', `${RELICS[id].name}${who}`, full);
    }
  }
  // Charms.
  for (const enh of ['gold', 'keen', 'charged', 'vamp', 'lucky', 'blaze', 'lucre', 'trick', 'echo', 'glass'] as Enh[]) {
    add('charm card face', enh.toUpperCase(), charmShortText(enh, 1));
    add('charm full rule', enh.toUpperCase(), charmRuleText(enh, 1));
  }
  // Machines.
  for (const id of CABINET_ORDER as CabinetId[]) add('machine select', CABINETS[id].name, CABINETS[id].rule);

  // Everything else: string literals with two or more capital-letter words.
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.ts') && !/spriteData|fontData|debug|tuningPanel|\/sim\//.test(p)) files.push(p);
    }
  };
  walk('src');
  const lit = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  for (const f of files.sort()) {
    const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const seen = new Set<string>();
    for (const m of src.matchAll(lit)) {
      const t = (m[1] ?? m[2] ?? m[3] ?? '').replace(/\\'/g, "'").replace(/\s+/g, ' ').trim();
      const plain = t.replace(/\$\{[^}]*\}/g, 'N');
      if ((plain.match(/\b[A-Z][A-Z']+\b/g) ?? []).length < 2) continue;
      if (/[a-z]{3,}/.test(plain.replace(/\b(px|rgba?|x|s|N)\b/g, '')) && !/[A-Z]{3,} [A-Z]{2,}/.test(plain)) continue;
      if (seen.has(t)) continue;
      seen.add(t);
      add(f.replace(/^src\//, ''), '', t);
    }
  }
  return out;
}
