#!/bin/bash
cd "$(dirname "$0")"
[ -n "$STABLE_GEN" ] && [ ! -f gen_stable.js ] && git -C ../.. show HEAD:js/gen.js > gen_stable.js
for t in t4*.mjs t5*.mjs t6*.mjs t7*.mjs t8*.mjs t9*.mjs; do
  r=$(timeout 200 node $t 2>&1); f=$(echo "$r" | grep -c "^FAIL\|SIDFEL\|Error"); echo "$t fail=$f"; [ "$f" != 0 ] && echo "$r" | grep "^FAIL\|SIDFEL\|Error" | head -5
done
echo KLART
