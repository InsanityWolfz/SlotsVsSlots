#!/bin/sh
# Balance + pacing gate: the official table and the pacing summary side by side. Usage: sh tools/balance/gate.sh [N] [tag]
N=${1:-800}; T=${2:-gate}
npx tsx tools/balance/tuesday.ts $N > tools/out/${T}_tuesday.txt 2>&1
npx tsx tools/balance/expert2.ts $((N/5)) > tools/out/${T}_e2.txt 2>&1
sed -n 2,7p tools/out/${T}_tuesday.txt
grep -A5 "PACING per machine" tools/out/${T}_e2.txt | tail -4
grep "death fight#" tools/out/${T}_e2.txt
grep -A4 "HP% into bosses" tools/out/${T}_e2.txt | tail -4 | cut -c1-110
grep "^act [123]:" tools/out/${T}_e2.txt | sort -u
