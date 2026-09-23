import type { SideId, SymbolId } from './config';
import type { Fight, TurnResult } from './fight';
import type { Tier } from './scoring';
import { slimeFraction } from './strip';

/** One row per turn: the unit of the combat log and the CSV export. */
export interface TurnRow {
  fight: number;
  seed: number;
  enemy: string;
  turn: number;
  side: SideId;
  line: SymbolId[];
  tier: Tier;
  nearMiss: boolean;
  lucky: boolean;
  frozenReels: number;
  lockedReels: number;
  shieldReset: number;
  attack: number;
  blocked: number;
  hpDamage: number;
  shieldGain: number;
  energyGain: number;
  specials: number;
  specialDamage: number;
  healed: number;
  slimed: number;
  slimeWasted: number;
  cleansed: number;
  froze: number;
  jammed: number;
  stole: number;
  rocksAdded: number;
  ability: string;
  potAdded: number;
  potWon: number;
  fizzled: number;
  playerHp: number;
  playerShield: number;
  playerEnergy: number;
  enemyHp: number;
  enemyShield: number;
  playerSlimePct: number;
  pot: number;
  winner: SideId | '';
}

export function turnRow(fight: Fight, r: TurnResult, fightNo: number): TurnRow {
  const row: TurnRow = {
    fight: fightNo,
    seed: fight.seed,
    enemy: fight.cfg.enemy.name ?? 'ENEMY',
    turn: r.turn,
    side: r.side,
    line: [],
    tier: 'none',
    nearMiss: false,
    lucky: false,
    frozenReels: 0,
    lockedReels: 0,
    shieldReset: 0,
    attack: 0,
    blocked: 0,
    hpDamage: 0,
    shieldGain: 0,
    energyGain: 0,
    specials: 0,
    specialDamage: 0,
    healed: 0,
    slimed: 0,
    slimeWasted: 0,
    cleansed: 0,
    froze: 0,
    jammed: 0,
    stole: 0,
    rocksAdded: 0,
    ability: '',
    potAdded: 0,
    potWon: 0,
    fizzled: 0,
    playerHp: fight.sides.player.hp,
    playerShield: fight.sides.player.shield,
    playerEnergy: fight.sides.player.energy,
    enemyHp: fight.sides.enemy.hp,
    enemyShield: fight.sides.enemy.shield,
    playerSlimePct: Math.round(slimeFraction(fight.sides.player.reels) * 100),
    pot: fight.pot,
    winner: '',
  };
  for (const e of r.events) {
    switch (e.type) {
      case 'spin':
        row.line = e.score.line;
        row.tier = e.score.tier;
        row.nearMiss = e.nearMiss;
        row.lucky = e.lucky !== null;
        row.frozenReels = e.frozen.filter(Boolean).length;
        row.lockedReels = e.locked.filter(Boolean).length;
        break;
      case 'shieldReset':
        if (e.side === r.side) row.shieldReset = e.lost;
        break;
      case 'attack':
        row.attack += e.amount;
        row.blocked += e.blocked;
        row.hpDamage += e.hpDamage;
        break;
      case 'shieldGain':
        row.shieldGain += e.amount;
        break;
      case 'energyGain':
        row.energyGain += e.amount;
        break;
      case 'specialFire':
        row.specials++;
        row.specialDamage += e.hpDamage;
        row.blocked += e.blocked;
        row.hpDamage += e.hpDamage;
        break;
      case 'heal':
        row.healed += e.amount;
        break;
      case 'slime':
        row.slimed += e.cells.length;
        row.slimeWasted += e.wasted;
        break;
      case 'cleanse':
        row.cleansed += e.cells.length;
        break;
      case 'freeze':
        row.froze += e.targets.length;
        break;
      case 'lock':
        row.jammed += e.targets.length;
        break;
      case 'steal':
        row.stole += e.cells.length;
        break;
      case 'junk':
        row.rocksAdded += e.inserts.length;
        break;
      case 'ability':
        row.ability = e.kind;
        break;
      case 'pot':
        row.potAdded += e.amount;
        break;
      case 'potWin':
        row.potWon += e.amount;
        row.hpDamage += e.hpDamage;
        row.blocked += e.blocked;
        break;
      case 'fizzle':
        row.fizzled += e.reels.length;
        break;
      case 'fightEnd':
        row.winner = e.winner;
        break;
    }
  }
  return row;
}

const ABBR: Record<SymbolId, string> = {
  sword: 'SWD',
  shield: 'SHD',
  bolt: 'BLT',
  slime: 'SLM',
  ice: 'ICE',
  claw: 'CLW',
  rock: 'RCK',
  lock: 'LCK',
  coin: 'CON',
  seven: '777',
  empty: '___',
  wild: 'WLD',
};

export function formatRow(r: TurnRow): string {
  const parts: string[] = [];
  if (r.attack) parts.push(`${r.attack} atk${r.blocked ? ` (${r.blocked} blocked)` : ''}`);
  if (r.specials) parts.push(`SPECIAL x${r.specials} → ${r.specialDamage}`);
  if (r.shieldGain) parts.push(`+${r.shieldGain} shield`);
  if (r.energyGain) parts.push(`+${r.energyGain} energy`);
  if (r.healed) parts.push(`healed ${r.healed}`);
  if (r.slimed || r.slimeWasted) parts.push(`slimed ${r.slimed}${r.slimeWasted ? ` (${r.slimeWasted} wasted)` : ''}`);
  if (r.cleansed) parts.push(`CLEANSED ${r.cleansed}`);
  if (r.froze) parts.push(`froze ${r.froze} reel${r.froze > 1 ? 's' : ''}`);
  if (r.jammed) parts.push(`jammed ${r.jammed} reel${r.jammed > 1 ? 's' : ''}`);
  if (r.stole) parts.push(`stole ${r.stole}`);
  if (r.rocksAdded) parts.push(`+${r.rocksAdded} rocks`);
  if (r.ability) parts.push(`ABILITY ${r.ability.toUpperCase()}`);
  if (r.potAdded) parts.push(`pot +${r.potAdded}`);
  if (r.potWon) parts.push(`POT ${r.potWon}!`);
  if (r.fizzled) parts.push(`${r.fizzled} dead`);
  const tier = r.tier === 'none' ? '' : r.tier === 'pair' ? ' DOUBLE' : ' JACKPOT';
  const near = r.nearMiss && r.tier !== 'triple' ? ' (near-miss)' : '';
  const status = `${r.frozenReels ? ` [${r.frozenReels} frozen]` : ''}${r.lockedReels ? ` [${r.lockedReels} jammed]` : ''}${r.lucky ? ' [LUCKY]' : ''}`;
  return (
    `T${r.turn} ${r.side === 'player' ? 'HERO ' : 'ENEMY'} ${r.line.map((s) => ABBR[s]).join(' ')}${tier}${near}${status}` +
    ` → ${parts.join(', ') || 'nothing'} | P ${r.playerHp}hp ${r.playerShield}sh ${r.playerEnergy}en · E ${r.enemyHp}hp ${r.enemyShield}sh` +
    (r.pot ? ` · pot ${r.pot}` : '') +
    (r.winner ? ` | ${r.winner.toUpperCase()} WINS` : '')
  );
}

export function rowsToCsv(rows: TurnRow[]): string {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]) as (keyof TurnRow)[];
  const esc = (v: unknown) => (Array.isArray(v) ? v.join('|') : String(v).replace(/,/g, ' '));
  return [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
}
