#!/bin/bash
cd "$(dirname "$0")"
[ -n "$STABLE_GEN" ] && [ ! -f gen_stable.js ] && git -C ../.. show HEAD:js/gen.js > gen_stable.js
for t in t4*.mjs t5*.mjs t6*.mjs t7*.mjs t8*.mjs t9*.mjs t1[0-9][0-9].mjs tl_*.mjs; do
  [ -f "$t" ] || continue
  r=$(timeout 600 node $t 2>&1); f=$(echo "$r" | grep -c "^FAIL\|SIDFEL\|Error"); echo "$t fail=$f"; [ "$f" != 0 ] && echo "$r" | grep "^FAIL\|SIDFEL\|Error" | head -5
done
echo KLART
