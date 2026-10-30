// Bakes the approved 32×32 portraits into literal rows for tools/portraits.mjs (no outline: build-art adds it).
import { writeFileSync } from 'node:fs';
const MAP = [
  ['barfly', 'enemyPortrait', 'THE BARFLY'], ['legbreaker', 'enemyBrute', 'THE LEG BREAKER'], ['cooler', 'enemyFrost', 'THE COOLER'],
  ['pickpocket', 'enemyThief', 'THE PICKPOCKET'], ['slugpusher', 'enemyGolem', 'THE FENCE'], ['mechanic', 'enemyGremlin', 'THE BENT MECHANIC'],
  ['repoman', 'enemyRepoMan', 'THE REPO MAN'], ['shark', 'enemyBomber', 'THE LOAN SHARK'], ['jinx', 'enemyHexer', 'THE JINX'],
  ['leech', 'enemyVampire', 'THE LEECH'], ['copycat', 'enemyMimic', 'THE COPYCAT'], ['counterfeiter', 'enemyCounterfeiter', 'THE COUNTERFEITER'],
  ['sharp', 'enemySharp', 'THE CARD SHARP'], ['pitboss', 'enemyPitBoss', 'THE PIT BOSS'], ['croupier', 'enemyCroupier', 'THE CROUPIER'],
  ['house', 'enemyBoss', 'THE HOUSE'], ['wheel', 'enemyWheel', 'THE WHEEL'], ['dealer', 'enemyDealer', 'THE DEALER'], ['owner', 'enemyOwner', 'THE OWNER'],
  ['knight', 'heroKnight', 'SIR REGINALD'], ['cassidy32a', 'heroMidas', 'CASH CASSIDY'], ['voltz32b', 'heroTesla', 'DOC VOLTZ'],
  ['jax', 'heroJoker', 'JESTER JAX'], ['decibel', 'heroJukebox', 'DJ DECIBEL'],
  ['cashier', 'cashierPortrait', 'THE CASHIER'],
];
let out = `// The casino-town portraits, 32×32 (approved by the user, 2026-10-29/30), as literal fill rows.
// build-art.mjs adds the 1px outline. Baked from the art-wip branch (tools/art-wip/*32.mjs); hand edits go here now.
export const PORTRAITS = {\n`;
for (const [file, id, name] of MAP) {
  const fn = /32[ab]?$/.test(file) ? file : `${file}32`;
  const rows = (await import(`./${fn}.mjs?${Date.now()}`))[fn]();
  if (rows.length !== 32 || rows.some((r) => r.length !== 32)) throw new Error(file);
  out += `  // ${name}\n  ${id}: [\n${rows.map((r) => `    '${r}',`).join('\n')}\n  ],\n`;
}
out += '};\n';
writeFileSync(process.argv[2], out);
console.log('baked', MAP.length);
