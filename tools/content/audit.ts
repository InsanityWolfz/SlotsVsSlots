// CONTENT AUDIT: every relic, Charm, upgrade card and big choice, with the exact text players see (per Slot Machine
// where it differs). npx tsx tools/content/audit.ts > loop/CONTENT_AUDIT.md
import { defaultConfig, symLabel, type Enh, type RelicId, type SymbolId } from '../../src/core/config';
import { CABINETS, CABINET_ORDER, type CabinetId } from '../../src/core/cabinets';
import { RELICS, RELIC_TIER, LEGENDARY, MACHINE_EXCLUDE, WAVE1, BUILD_ENABLER, relicText } from '../../src/core/relics';
import { CHARM_SYMBOLS, charmName, charmRuleText } from '../../src/core/charms';
import { ALL_CHARMS } from '../../src/core/profile';
import { createRun, describeOption, describeChoice, BIG_CARDS, type BigChoice, type BigChoiceId, type DraftOption } from '../../src/core/run';
import { CHARM_INFO } from '../../src/ui/menus';

const base = defaultConfig();
const runs = Object.fromEntries(CABINET_ORDER.map((c) => [c, createRun(base, 7, c, 0)])) as Record<CabinetId, ReturnType<typeof createRun>>;
const who = (c: CabinetId) => `${CABINETS[c].hero} (${CABINETS[c].name})`;
const out: string[] = [];
const p = (s = '') => out.push(s);
const tierOf = (r: RelicId) => (LEGENDARY.has(r) ? 'LEGENDARY' : RELIC_TIER.uncommon.includes(r) ? 'UNCOMMON' : RELIC_TIER.common.includes(r) ? 'COMMON' : 'OTHER');

p('# Content audit: every relic, Charm, upgrade and big choice');
p();
p('Generated from the game code (`npx tsx tools/content/audit.ts`), so this is exactly what players read today.');
p('Where a text changes by Slot Machine, each machine\'s version is listed.');
p();
p('## Relics');
const live = (Object.keys(RELICS) as RelicId[]).filter((r) => !RELICS[r].retired);
p(`${live.length} relics in the game.`);
for (const group of ['general', 'machine', 'charm'] as const) {
  p();
  p(group === 'general' ? '### General relics' : group === 'machine' ? '### Slot Machine relics' : '### Charm relics');
  p();
  p('| Name | Tier | Who | Text |');
  p('|---|---|---|---|');
  const rows = live.filter((r) => (group === 'machine' ? !!RELICS[r].machine : group === 'charm' ? !!RELICS[r].charm && !RELICS[r].machine : !RELICS[r].machine && !RELICS[r].charm));
  for (const r of rows.sort((a, b) => (RELICS[a].machine ?? '').localeCompare(RELICS[b].machine ?? '') || RELICS[a].name.localeCompare(RELICS[b].name))) {
    const d = RELICS[r];
    const excl = MACHINE_EXCLUDE[r] ?? [];
    const whoTxt = d.machine ? CABINETS[d.machine as CabinetId].hero : excl.length ? `all but ${excl.map((c) => CABINETS[c].hero).join(', ')}` : 'all';
    const need = BUILD_ENABLER[r] ? ` (needs ${[BUILD_ENABLER[r]].flat().join(' + ')})` : '';
    const wave = WAVE1.has(r) ? ' · new' : '';
    const texts = new Map<string, string[]>();
    for (const c of CABINET_ORDER) {
      if (d.machine && d.machine !== c) continue;
      if (excl.includes(c)) continue;
      // Only what this machine can actually be offered: meter relics need a meter; Charm relics need the Charm to fit.
      const needs = [BUILD_ENABLER[r] ?? []].flat();
      if (needs.includes('meter') && !CABINETS[c].meter && !CABINETS[c].special) continue;
      if (d.charm && !CHARM_SYMBOLS[d.charm].some((s) => CABINETS[c].symbols.includes(s as SymbolId))) continue;
      const t = relicText(r, c);
      texts.set(t, [...(texts.get(t) ?? []), CABINETS[c].hero]);
    }
    const allowed = [...texts.values()].flat();
    const whoShown = d.machine ? whoTxt : allowed.length === CABINET_ORDER.length ? 'all' : allowed.join(', ');
    const text = texts.size <= 1 ? [...texts.keys()][0] ?? d.text : [...texts.entries()].map(([t, cs]) => `**${cs.join(', ')}:** ${t}`).join('<br>');
    p(`| ${d.name} | ${tierOf(r)}${wave} | ${whoShown}${need} | ${text} |`);
  }
}

p();
p('## Charms');
p();
p('| Charm | Fits (per Slot Machine) | LV1 / LV2 / LV3 | Codex text |');
p('|---|---|---|---|');
for (const e of ALL_CHARMS) {
  const fits = CABINET_ORDER.map((c) => {
    const syms = CHARM_SYMBOLS[e].filter((s) => CABINETS[c].symbols.includes(s as SymbolId));
    return syms.length ? `${CABINETS[c].hero}: ${syms.map((x) => symLabel(x as SymbolId)).join(', ')}` : '';
  }).filter(Boolean).join('<br>') || '(none)';
  const lv = [1, 2, 3].map((l) => charmRuleText(e, l)).join(' / ');
  p(`| ${charmName(e)} | ${fits} | ${lv} | ${CHARM_INFO[e]?.text ?? ''} |`);
}

p();
p('## Upgrade cards (drafts and shop)');
p();
p('One example of each kind, per Slot Machine where the wording changes.');
p();
p('| Kind | Title | Text |');
p('|---|---|---|');
for (const c of CABINET_ORDER) {
  const run = runs[c];
  const atk = CABINETS[c].attack;
  const opts: [string, DraftOption][] = [
    ['level a symbol', { kind: 'symLevel', symbol: atk }],
    ['level a Charm', { kind: 'charmLevel', enh: 'gold' }],
    ['Charm card', { kind: 'gild', enh: 'gold', symbol: atk, reel: 0, n: 3 }],
    ['add symbols', { kind: 'add', symbol: atk, reel: 0, count: 2 }],
    ['swap', { kind: 'swap', from: 'shield', to: atk, count: 2, reel: 1 }],
    ['remove', { kind: 'remove', symbol: 'shield', reel: 2 }],
    ['clear rocks', { kind: 'clear', symbol: 'rock', reel: 0 }],
    ['heal', { kind: 'heal', amount: 60 }],
    ['max HP', { kind: 'maxHp', amount: 30 }],
  ];
  p(`| **${who(c)}** | | |`);
  for (const [k, o] of opts) {
    const d = describeOption(o, run);
    p(`| ${k} | ${d.title} | ${d.text} |`);
  }
}

p();
p('## Big choices');
p();
p('Three cards after each boss (one with a cost, one of your Slot Machine, one free). Targets are filled in from a fresh run on each machine.');
p();
p('| Choice | Machine | Effect | Cost |');
p('|---|---|---|---|');
for (const card of BIG_CARDS) {
  const seen = new Map<string, string[]>();
  for (const c of CABINET_ORDER) {
    if (card.machine && card.machine !== c) continue;
    const run = runs[c];
    const atk = CABINETS[c].attack;
    const ch: BigChoice = { id: card.id as BigChoiceId, symbol: atk, enh: 'gold', reel: 0, relic: 'clover', relic2: 'key' };
    const d = describeChoice(run, ch);
    const key = `${d.title}|${d.rule}|${d.cost}`;
    seen.set(key, [...(seen.get(key) ?? []), CABINETS[c].hero]);
  }
  for (const [key, cs] of seen) {
    const [title, rule, cost] = key.split('|');
    p(`| ${title} | ${card.machine ? cs.join(', ') : seen.size > 1 ? cs.join(', ') : 'all'} | ${rule} | ${cost || '—'} |`);
  }
}
console.log(out.join('\n'));
