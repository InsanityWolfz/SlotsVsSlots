# Legacy balance harnesses

Everything here is a record, not a tool. The `it*` files drove the pre-rework (FULL SETS, TIER II) policy; the rest
are the one-off harnesses of iterations 24-74 (e9_..., e11_..., c13_..., expert*, tuesday.ts, gate.sh ...). They
were moved here in the 2026-10-07 sim rewrite; many will break as the rules move on (swords leaving most machines).

Use `tools/sim/` instead: `table.ts` (THE official table), `endless.ts` (forced riding), `fuzz.ts`, `bets.ts`,
`power_ref.ts`, `challenges.ts`. Write new throwaway harnesses in `tools/sim/` and move them here when done.
