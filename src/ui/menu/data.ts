import { CABINETS, type CabinetId } from '../../core/cabinets';
import type { Enh, RelicId } from '../../core/config';
import { CHARM_SYMBOLS, charmName, charmRuleText } from '../../core/charms';
import { actsOf, ARCHETYPES, BOSS, DEALER, GATEKEEPER, OWNER, REPO_MAN, WHEEL, type Archetype } from '../../core/enemies';
import { ELITE_ONLY, LEGENDARY, RELICS, RELIC_TIER } from '../../core/relics';
import { STAKES } from '../../core/stakes';
import { ENH_SPRITE } from '../../present/reel';
import { artId, hasSprite, type SpriteId } from '../../render/sprites';

/**
 * What the out-of-run screens show: the COLLECTION's order and words, the casino-town cast for the ENEMIES gallery and
 * each trophy's plaque icon. Words only; no rules live here.
 */

// One value each now (Charms have no levels, user 2026-10-15): the text comes from the rule itself, so it can't drift.
const who: Record<Enh, string> = {
  gold: 'YOUR ATTACK SYMBOLS AND SHIELDS',
  keen: 'SWORDS, CARDS AND NOTES',
  charged: "DOC VOLTZ'S BOLTS",
  spiked: 'KNIGHT. SHIELDS',
  vamp: 'SWORDS, CARDS AND NOTES',
  lucky: 'YOUR ATTACK SYMBOLS AND SHIELDS',
  blaze: "DOC VOLTZ'S BOLTS",
  lucre: 'YOUR ATTACK SYMBOLS AND SHIELDS',
  trick: "JAX'S CARDS AND SHIELDS",
  echo: "DJ DECIBEL'S NOTES",
  glass: 'YOUR ATTACK SYMBOLS AND SHIELDS',
};
export const CHARM_INFO: Record<Enh, { name: string; text: string }> = Object.fromEntries(
  (Object.keys(who) as Enh[]).map((e) => [e, { name: charmName(e), text: `${who[e]}. ${charmRuleText(e, 1)}.` }]),
) as Record<Enh, { name: string; text: string }>;
/** Charms in the COLLECTION (SPIKED retired). */
export const CHARM_ORDER: Enh[] = ['gold', 'glass', 'keen', 'vamp', 'charged', 'lucky', 'blaze', 'lucre', 'trick', 'echo'];
/** The one machine a Charm turns up on (the rest turn up on every machine). */
const CHARM_MACHINE: Partial<Record<Enh, CabinetId>> = { charged: 'tesla', blaze: 'tesla', trick: 'joker', echo: 'jukebox' };
export const charmWhere = (e: Enh): string => {
  const m = CHARM_MACHINE[e];
  return m ? `${CABINETS[m].name} DRAFTS ONLY` : 'THE DRAFTS AFTER A FIGHT';
};
/** A Charm's tile art: the symbol it sits on, with the Charm over it. */
export const charmArt = (e: Enh): [SpriteId, SpriteId] => [(CHARM_SYMBOLS[e][0] ?? 'shield') as SpriteId, ENH_SPRITE[e]];

export type Tier = 'common' | 'uncommon' | 'legendary';
/** Every relic, grouped common → uncommon → legendary. */
export const RELIC_ORDER: RelicId[] = (() => {
  const seen = new Set<RelicId>();
  const out: RelicId[] = [];
  for (const t of ['common', 'uncommon', 'legendary'] as const)
    for (const r of RELIC_TIER[t])
      if (!seen.has(r)) {
        seen.add(r);
        out.push(r);
      }
  for (const r of Object.keys(RELICS) as RelicId[]) if (!seen.has(r)) out.push(r);
  return out;
})();
export const relicTier = (r: RelicId): Tier => (LEGENDARY.has(r) ? 'legendary' : RELIC_TIER.uncommon.includes(r) ? 'uncommon' : 'common');
/** Where a relic turns up, in a few words. */
export function relicWhere(r: RelicId): string {
  if (LEGENDARY.has(r)) return "A BOSS'S PRIZE OR THE CASHIER";
  if (ELITE_ONLY.has(r)) return "ONLY IN AN ELITE'S SPOILS";
  const m = RELICS[r].machine;
  return m ? `${CABINETS[m].name} ONLY. ELITES, THE CASHIER` : 'ELITES, ENCOUNTERS, THE CASHIER';
}

/** Collection size (relics + charms), for the COLLECTOR achievements. */
export const collectionTotal = () => RELIC_ORDER.length + CHARM_ORDER.length;

export const heroSprite = (id: CabinetId): SpriteId => (hasSprite(CABINETS[id].heroSprite) ? artId(CABINETS[id].heroSprite) : 'playerPortrait');

// ---- the cast -------------------------------------------------------------------------------------------------------

const ROOM = ['', 'THE ALLEY', 'THE FLOOR', 'THE VIP ROOM'];
export interface CastEntry {
  id: string;
  name: string;
  portrait: SpriteId;
  trick: string;
  where: string;
  boss: boolean;
}
const castOf = (a: Archetype, where: string, boss = false): CastEntry => ({
  id: a.id,
  name: a.fixedName ?? (boss ? a.name : `THE ${a.name}`),
  portrait: artId(a.portrait),
  trick: a.blurb,
  where,
  boss,
});
/** The casino town's cast, in the order a run meets them: the regulars by act, then the bosses. */
export const CAST: CastEntry[] = [
  ...[...ARCHETYPES]
    .sort((a, b) => Math.min(...actsOf(a)) - Math.min(...actsOf(b)))
    .map((a) => castOf(a, [...new Set(actsOf(a))].map((n) => ROOM[n]).join(', '))),
  castOf(REPO_MAN, ROOM.slice(1, GATEKEEPER.acts + 1).join(', ')),
  castOf(BOSS, 'BOSS OF THE ALLEY', true),
  castOf(WHEEL, 'BOSS OF THE FLOOR', true),
  castOf(DEALER, 'BOSS OF THE VIP ROOM', true),
  castOf(OWNER, 'ENDLESS. HIS OWN OFFICE', true),
];

// ---- trophy plaques ---------------------------------------------------------------------------------------------------

/** A plaque's icon: a sprite, or a stake chip in the stake's colour. */
export type PlaqueIcon = { sprite: SpriteId; portrait?: boolean } | { stake: number };
const HERO: Record<string, CabinetId> = { clear_knight: 'knight', clear_tesla: 'tesla', clear_jukebox: 'jukebox', clear_joker: 'joker', clear_midas: 'midas' };
const ICON: Record<string, PlaqueIcon> = {
  first_win: { sprite: 'sword' },
  house: { sprite: 'enemyBoss', portrait: true },
  clear: { sprite: 'enemyWheel', portrait: true },
  dealer: { sprite: 'enemyDealer', portrait: true },
  all_machines: { sprite: 'ace' },
  endless_1: { sprite: 'seven' },
  endless_3: { sprite: 'enhBlaze' },
  turbo: { sprite: 'enemyOwner', portrait: true },
  chips_50: { sprite: 'goldbar' },
  relics_12: { sprite: 'relicHorseshoe' },
  score_5k: { sprite: 'cherry' },
  score_10k: { sprite: 'wild' },
  score_20k: { sprite: 'relicStarchart' },
  repo_loss: { sprite: 'enemyRepoMan', portrait: true },
  runs_25: { sprite: 'coin' },
  runs_100: { sprite: 'betStack3' },
  collect_half: { sprite: 'iconCollection' },
  collect_all: { sprite: 'relicTrophy' },
};
export function plaqueIcon(id: string): PlaqueIcon {
  if (HERO[id]) return { sprite: artId(CABINETS[HERO[id]].heroSprite), portrait: true };
  const st = /^stake_(\d)$/.exec(id);
  if (st) return { stake: Math.min(STAKES.length - 1, +st[1]) };
  const i = ICON[id];
  if (i && 'sprite' in i && !hasSprite(i.sprite)) return { sprite: 'trophySmall' as SpriteId };
  return i ?? { sprite: 'trophySmall' as SpriteId };
}
