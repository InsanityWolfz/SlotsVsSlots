// EXPERT_PLAYTEST_12 (throwaway): the content-round prototypes, applied at runtime by env (src/ untouched). Import first.
//   SIGC="thorn:thorn:10,15,20,25;joker:sword|shield:10,15,20,25;midas:goldbar:10,10,20,20"
//        a new charm (id 'sig') for that machine only: on its symbol(s); when the cell lands on your payline (not
//        locked / hexed / stolen) it adds its value to your meter (BRIAR: banked thorns; JOKER: meter; MIDAS: vault pips = value/10).
//   SIGV=8       the greedy bot's value for a 'sig' card (gold 9, charged 8.5, vamp 7, keen 6.5).
//   SIGFAV=1     the machine favours 'sig' (half its charm offers).  SIGACT2=1 'sig' only from act 2.
//   FAV="thorn:null"  favours override (any machine).  BMUL="thorn.dealer:1.2" BOSS_MUL override.
//   SWEEP=lvl|full|sig2  SWEEP UP prototypes on top of its rule: lvl +1 level to your signature symbol (KNIGHT swords);
//        full heal to full; sig2 +2 of your signature symbol on every reel (from shields).
//   CHOICE=sweepUp   the bot always takes this big choice when offered (SIM_BIAS.choice).
// Call useSig(cab) before simulating that machine.
import type { Enh, SymbolId } from '../../src/core/config';
import { CABINETS, type CabinetId } from '../../src/core/cabinets';
import { CHARM_SYMBOLS, CHARM_VALUE, LEVEL_CAP, charmValue, symLevel } from '../../src/core/charms';
import { Fight } from '../../src/core/fight';
import { ACT1_GILDS, ACT2_GILDS, BOSS_MUL, normalizeCharms, sigSymbol, type RunState } from '../../src/core/run';
import { SIM_BIAS } from '../../src/sim/simulateRun';

const E = process.env;
const SIG = 'sig' as Enh;
const sigc: Record<string, { syms: SymbolId[]; vals: number[] }> = {};
for (const kv of (E.SIGC ?? '').split(';').filter(Boolean)) {
  const [cab, syms, vals] = kv.split(':');
  sigc[cab] = { syms: syms.split('|') as SymbolId[], vals: [0, ...vals.split(',').map(Number)] };
}
Object.defineProperty(Object.prototype, 'sig', { value: Number(E.SIGV ?? 8), enumerable: false, configurable: true, writable: true });
const FAV0 = Object.fromEntries(Object.entries(CABINETS).map(([k, c]) => [k, c.favors]));
for (const kv of (E.FAV ?? '').split(',').filter(Boolean)) {
  const [k, v] = kv.split(':');
  FAV0[k] = v === 'null' ? null : (v as Enh);
}
for (const kv of (E.BMUL ?? '').split(',').filter(Boolean)) {
  const [k, v] = kv.split(':');
  const [cab, key] = k.split('.');
  (BOSS_MUL as unknown as Record<string, Record<string, number>>)[cab][key] = Number(v);
}

export function useSig(cab: CabinetId): void {
  for (const arr of [ACT1_GILDS, ACT2_GILDS]) {
    const i = arr.indexOf(SIG);
    if (i >= 0) arr.splice(i, 1);
  }
  for (const [k, f] of Object.entries(FAV0)) (CABINETS as Record<string, { favors: Enh | null }>)[k].favors = f;
  const s = sigc[cab];
  if (!s) return;
  (E.SIGACT2 === '1' ? ACT2_GILDS : ACT1_GILDS).push(SIG);
  CHARM_SYMBOLS[SIG] = s.syms;
  CHARM_VALUE[SIG] = s.vals;
  if (E.SIGFAV === '1') CABINETS[cab].favors = SIG;
}

// The fight: a 'sig' cell on the payline feeds the meter when its group resolves.
type Me = { side: string; reels: { cells: { enh?: Enh }[]; stop: number }[] };
type Grp = { reels: number[] };
const P = Fight.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
const oRes = P.resolveGroup;
export const SIGSTAT = { fills: 0, amount: 0 };
P.resolveGroup = function (this: Record<string, unknown> & { meter?: { kind: string } | null; over?: boolean }, me: Me, g: Grp, score: unknown, events: unknown[]) {
  const r = oRes.call(this, me, g, score, events);
  if (me.side !== 'player' || !this.meter || this.over) return r;
  const enhsAt = this.enhsAt as (c: Me, r: number) => Enh[];
  const n = g.reels.filter((reel) => enhsAt.call(this, me, reel).includes(SIG)).length;
  if (!n) return r;
  const lvl = (this.charmLvl as (c: Me, e: Enh) => number).call(this, me, SIG);
  const v = charmValue(SIG, lvl) * n;
  const fill = this.fillMeter as (c: Me, a: number, reels: number[], ev: unknown[]) => void;
  if (this.meter.kind === 'vault') fill.call(this, me, v, Array.from({ length: Math.max(1, Math.round(v / 10)) }, () => g.reels[0]), events);
  else fill.call(this, me, v, g.reels, events);
  SIGSTAT.fills++;
  SIGSTAT.amount += v;
  return r;
};

// SWEEP UP prototypes: applied once, the fight after it was taken.
if (E.SWEEP) {
  const prev = SIM_BIAS.onFight;
  SIM_BIAS.onFight = (run: RunState) => {
    prev?.(run);
    const r = run as RunState & { took?: string[]; _sw?: boolean };
    if (r._sw || !r.took?.includes('sweepUp')) return;
    r._sw = true;
    const p = run.player;
    const sig = run.cabinet === 'knight' ? 'sword' : sigSymbol(run);
    if (E.SWEEP === 'lvl') p.levels.sym[sig] = Math.min(LEVEL_CAP, symLevel(p.levels, sig) + 1);
    if (E.SWEEP === 'full') p.hp = p.maxHp;
    if (E.SWEEP === 'sig2')
      for (const s of p.strips) {
        const k = Math.min(2, Math.max(0, (s.shield ?? 0) - 1));
        s.shield = (s.shield ?? 0) - k;
        s[sig] = (s[sig] ?? 0) + k;
      }
    normalizeCharms(p);
  };
}
// FORGEFIX=1 (approximation of "THE FORGE isn't offered when every symbol is maxed"): a dead ARMS RACE / MASTERWORK taken
// with every symbol at the cap is refunded the fight after (max HP back; MASTERWORK's level lock lifted).
export const FORGESTAT = { dead: 0 };
if (E.FORGEFIX === '1' || E.FORGECOUNT === '1') {
  const prev = SIM_BIAS.onFight;
  const syms = (run: RunState) => CABINETS[run.cabinet].symbols.filter((s) => run.player.strips.some((x) => (x[s] ?? 0) > 0));
  SIM_BIAS.onFight = (run: RunState) => {
    prev?.(run);
    const r = run as RunState & { took?: string[]; _pre?: boolean; _n?: number };
    const n = r.took?.length ?? 0;
    if (r._pre && n > (r._n ?? 0)) {
      const last = r.took![n - 1];
      if (last === 'armsRace' || last === 'masterwork') {
        FORGESTAT.dead++;
        if (E.FORGEFIX === '1') {
          if (last === 'armsRace') { run.player.maxHp += 60; run.player.hp += 60; }
          else run.levelLock = [];
        }
      }
    }
    r._n = n;
    r._pre = (run.enemies[run.depth] as { boss?: string } | undefined)?.boss ? syms(run).every((s) => symLevel(run.player.levels, s) >= LEVEL_CAP) : false;
  };
}
if (E.CHOICE) SIM_BIAS.choice = E.CHOICE as never;
export const PATCH12 = ['FORGEFIX', 'CHOICE', 'SIGC', 'SIGV', 'SIGFAV', 'SIGACT2', 'FAV', 'BMUL', 'SWEEP'].filter((k) => E[k]).map((k) => `${k}=${E[k]}`).join(' ') || 'current';
