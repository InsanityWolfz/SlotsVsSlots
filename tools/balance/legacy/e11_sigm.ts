// EXPERT_PLAYTEST_11 (throwaway): signature-symbol charms PER MACHINE (a charm fits that machine's signature symbol only).
// SIGM="thorn=vamp:thorn|joker=gold:wild,vamp:wild|midas=gold:goldbar" npx tsx tools/balance/e11_sigm.ts N [rows]
// Only the machines named are run. rows (GREEN, seed 777, no start relic): baseline,none,gold,vamp,... ; then
// official-style WHITE/GREEN (seed 4242, N*2), and the same with a no-charms drafter.
import { PATCH_LABEL } from './e11_patch';
import { defaultConfig, type Enh, type SymbolId } from '../../../src/core/config';
import type { CabinetId } from '../../../src/core/cabinets';
import { CHARM_SYMBOLS } from '../../../src/core/charms';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 300);
const ROWS = (process.argv[3] ?? 'baseline,none,gold,vamp').split(',');
const plan = new Map<CabinetId, Partial<Record<Enh, SymbolId[]>>>();
for (const part of (process.env.SIGM ?? '').split('|').filter(Boolean)) {
  const [cab, rest] = part.split('=');
  const m: Partial<Record<Enh, SymbolId[]>> = {};
  for (const kv of rest.split(';')) { const [k, v] = kv.split(':'); m[k as Enh] = v.split(',') as SymbolId[]; }
  plan.set(cab as CabinetId, m);
}
let cur: CabinetId = 'knight';
const base = Object.fromEntries(Object.entries(CHARM_SYMBOLS).map(([k, v]) => [k, [...v]])) as Record<Enh, SymbolId[]>;
for (const k of Object.keys(base) as Enh[])
  Object.defineProperty(CHARM_SYMBOLS, k, { get: () => [...base[k], ...(plan.get(cur)?.[k] ?? [])], configurable: true });
const f = (x: number) => x.toFixed(1).padStart(5);
const cabs = plan.size ? [...plan.keys()] : (process.env.CABS ?? 'thorn,joker,midas').split(',') as CabinetId[];
for (const cab of cabs) {
  cur = cab;
  const out: string[] = [];
  SIM_BIAS.noStart = true;
  for (const r of ROWS) {
    SIM_BIAS.enh = r === 'baseline' ? undefined : r === 'none' ? ((cab === 'tesla' ? 'spiked' : 'charged') as Enh) : (r as Enh);
    out.push(`${r} ${simulateRuns(defaultConfig(), N, 'greedy', 777, cab, 2, true).winPct.toFixed(1)}`);
  }
  SIM_BIAS.noStart = false;
  SIM_BIAS.enh = undefined;
  const w = simulateRuns(defaultConfig(), N * 2, 'greedy', 4242, cab, 0).winPct;
  const g = simulateRuns(defaultConfig(), N * 2, 'greedy', 4242, cab, 2, true).winPct;
  SIM_BIAS.enh = (cab === 'tesla' ? 'spiked' : 'charged') as Enh;
  const wn = simulateRuns(defaultConfig(), N * 2, 'greedy', 4242, cab, 0).winPct;
  const gn = simulateRuns(defaultConfig(), N * 2, 'greedy', 4242, cab, 2, true).winPct;
  SIM_BIAS.enh = undefined;
  console.log(`${cab.padEnd(6)} ${JSON.stringify(Object.fromEntries(Object.entries(plan.get(cab) ?? {})))} ${PATCH_LABEL} | ${out.join('  ')} | official W ${f(w)} G ${f(g)} | no-charms drafter W ${f(wn)} G ${f(gn)}`);
}
