/**
 * COPY RUN (user, 2026-10-12): a finished run as plain text to paste into a chat for balance checks. Every fight
 * (enemy, spins, HP in and out), what you picked, bought and chose after it, the build at the end, the encounters, and
 * what killed you. Seeded, so a run can be replayed in the sim.
 */
import { CABINETS } from './cabinets';
import { charmLevel, charmName, symLevel } from './charms';
import { RELICS } from './relics';
import { symLabel, type SymbolId } from './config';
import { encounterOf } from './encounters';
import { runScoreOf, takenLabel, type RunState } from './run';
import { stakeOf } from './stakes';

export function runSummary(run: RunState, version = ''): string {
  const p = run.player;
  const end = run.endless
    ? run.endless.turbo
      ? `BEAT THE OWNER (SCORE ${runScoreOf(run)})`
      : `BUSTED ON LOOP ${run.endless.loop} (SCORE ${runScoreOf(run)})`
    : run.won
      ? 'WON'
      : `LOST IN ACT ${run.act}`;
  const out: string[] = [
    `SLOTS VS. SLOTS RUN${version ? ` (${version})` : ''}`,
    `${CABINETS[run.cabinet].name} | ${stakeOf(run.stake).name} | SEED ${run.seed} | ${end}`,
    '',
    'FIGHTS:',
  ];
  run.records.forEach((r, i) => {
    const where = r.loop !== undefined ? `L${r.loop}` : `A${r.act ?? 1}`;
    const what = [
      r.pick ? `PICK ${takenLabel(r.pick)}` : '',
      r.eliteRelic ? `RELIC ${RELICS[r.eliteRelic]?.name ?? r.eliteRelic}` : '',
      r.bought?.length ? `BOUGHT ${r.bought.map((o) => takenLabel(o)).join(', ')}` : '',
      r.choice ? `CHOICE ${r.choice}` : '',
      // BONUS WHEEL / RELIC RUSH prizes (a rush relic was missing from the log: user's TESLA run).
      r.bonuses?.length ? r.bonuses.join(', ') : '',
      r.chips ? `+${r.chips} CHIPS` : '',
    ].filter(Boolean);
    out.push(
      `${String(i + 1).padStart(2)}. ${where} ${r.boss ? 'BOSS ' : ''}${r.enemy}: ${r.won ? 'WON' : 'LOST'} in ${r.turns} spins, HP ${r.hpBefore} -> ${r.hpAfter}${what.length ? ` | ${what.join(' | ')}` : ''}`,
    );
  });
  const last = run.records[run.records.length - 1];
  if (last && !last.won && last.hurt?.length) out.push('', `KILLED BY ${last.enemy}: ${last.hurt.map(([k, v]) => `${k} ${v}`).join(', ')}`);
  out.push(
    '',
    `END: HP ${p.hp}/${p.maxHp}, ${p.chips} CHIPS`,
    `START RELIC: ${run.startRelic ? (RELICS[run.startRelic]?.name ?? run.startRelic) : 'NONE'}`,
    `RELICS: ${p.relics.map((r) => RELICS[r]?.name ?? r).join(', ') || 'NONE'}`,
    `SYMBOL LEVELS: ${Object.keys(p.levels.sym).map((s) => `${symLabel(s as SymbolId)} ${symLevel(p.levels, s as never)}`).join(', ') || 'ALL 1'}`,
    `CHARMS: ${p.gilded.map((g) => `${charmName(g.enh)} LV${charmLevel(p.levels, g.enh)} x${g.n} on reel ${g.reel + 1} ${symLabel(g.symbol)}`).join(', ') || 'NONE'}`,
    `REELS: ${p.strips.map((s, i) => `${i + 1}: ${Object.entries(s).filter(([, n]) => n).map(([k, n]) => `${symLabel(k as SymbolId)} ${n}`).join(' ')}`).join(' / ')}`,
    // (Old saves only: BIG CHOICES are gone, 2026-10-15. A run that took some still lists them.)
    ...(run.records.some((r) => r.choice) ? [`BIG CHOICES: ${run.records.flatMap((r) => (r.choice ? [r.choice] : [])).join(', ')}`] : []),
    `ENCOUNTERS: ${(run.encounters ?? []).filter((e) => !e.more).map((e) => `A${e.act} ${encounterOf(e.id).name}: ${e.what || (e.good === true ? 'WON' : e.good === false ? 'LOST' : 'WALKED AWAY')}`).join(', ') || 'NONE'}`,
  );
  return out.join('\n');
}
