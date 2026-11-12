/**
 * THE TERM SHEET (CLAUDE.md, user 2026-11-12): one word for one thing in every line a player reads. This fails when a
 * retired word comes back. `ALLOW` holds the exact lines that keep one on purpose (the owner's own words, flavour).
 */
import { describe, expect, it } from 'vitest';
import { collect } from '../tools/text/collect';

const RETIRED: [string, RegExp][] = [
  ['TURN as a count (rule 1: SPIN)', /\b(\d+|N|A|EACH|EVERY|NEXT|THAT|PLAYER|ENEMY|FIRST|LAST) TURNS?\b(?! (ON|IT|INTO|UP|DOWN)\b)/],
  ['A / PER / EVERY FIGHT (rule 3: EACH FIGHT)', /\b(A|PER|EVERY) FIGHT\b(?! (CAN|IS|WON|YOU|ENDS|STARTS))/],
  ['MAX as a limit (rule 4: UP TO)', /\bMAX\b(?! (HP|YOUR|VOLUME|BET))/],
  ['CAP (rule 4: UP TO)', /\bCAPS? AT\b|\bCAPPED\b/],
  ['+N HP for a heal (rule 6: HEAL N)', /\+(\d+|N) HP\b(?! MAX)/],
  ['developer words (rule 10)', /\bDRAFTS?\b|\bENCOUNTERS?\b|\bHUD\b/],
  ['1ST / 2ND (rule 12)', /\b(1ST|2ND|3RD)\b/],
  ['cabinet, gild, cell', /\bCABINETS?\b|\bGILD(ED|S)?\b|\bCELLS?\b/],
  ['memo words (rule 11)', /\bRETAINS?\b|\bREFUNDS?\b|\bVOID\b|\bINCREASES TO\b/],
  ['a semicolon (rule 11)', /;/],
  // Rule 1 (user, 2026-11-12): EVERY 3 OF HIS SPINS and FOR 2 OF YOUR SPINS read as a template. An enemy's own card
  // says EVERY 3 SPINS, a status on your reels FOR 2 SPINS. A line that must name the owner goes in ALLOW with why.
  ['OF HIS / HER / THEIR / YOUR SPINS (rule 1: EVERY 3 SPINS, FOR 2 SPINS)', /\bOF (HIS|HER|THEIR|YOUR) SPINS?\b/],
];
/** Exact lines that keep a retired word on purpose. */
const ALLOW = new Set<string>([
  // The pawn shop's wall sign (scenery).
  'NO REFUNDS',
]);

describe('the term sheet: no retired word in player text', () => {
  const lines = collect();
  for (const [name, re] of RETIRED)
    it(name, () => {
      const bad = lines.filter((l) => !ALLOW.has(l.text) && re.test(l.text.replace(/\$\{[^}]*\}/g, 'N'))).map((l) => `${l.where}: ${l.text}`);
      expect([...new Set(bad)]).toEqual([]);
    });
});
