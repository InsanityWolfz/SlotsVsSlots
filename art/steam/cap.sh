#!/bin/bash
# cap.sh <name> <setup-js> <frames: "ms ms ms"> : runs setup, then shots after each delay into pw/steam/<name>_<i>.png
D=localhost:5302
curl -s -X POST $D/eval --data "$2" ; echo
i=0; for ms in $3; do curl -s "$D/wait?ms=$ms" >/dev/null; curl -s "$D/shot?name=$1_$i" >/dev/null; i=$((i+1)); done
