#!/bin/sh
# Hämtar EffekseerForWebGL-runtimen (MIT) och Effekseers exempeleffekter (CC0) till cache/ (ignoreras av git, följer inte med spelet).
# Låsta versioner (commit) så att samma strippar kommer ut igen. Kräver bara anonym git-läsning från github.com.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); C=${EFK_CACHE:-$HERE/cache}; T=$C/git
mkdir -p "$T" "$C/rt" "$C/fx"
get() { # repo commit katalog
  [ -d "$T/$3/.git" ] || { git init -q "$T/$3"; git -C "$T/$3" remote add origin "$1"; }
  git -C "$T/$3" fetch -q --depth 1 --filter=blob:none origin "$2"
}
get https://github.com/effekseer/EffekseerForWebGL accb827e32e60d3986fe9924237ebe81d98b55f0 ewgl  # runtime v1.70 (docs/)
get https://github.com/effekseer/ResourceData 446ed7ab17ffee65738aa470fff0dec3a7ee17e8 rd            # samples/ (CC0)
get https://github.com/effekseer/Effekseer b5700082b49bc5f919610880dafddc90211a9a4e efk              # docs/readme_sample.txt (licensen)
git -C "$T/ewgl" show FETCH_HEAD:docs/effekseer.js > "$C/rt/effekseer.js"
git -C "$T/ewgl" show FETCH_HEAD:docs/effekseer.wasm > "$C/rt/effekseer.wasm"
git -C "$T/ewgl" show FETCH_HEAD:LICENSE > "$C/rt/LICENSE"
git -C "$T/rd" archive FETCH_HEAD samples | tar x -C "$C/fx"
git -C "$T/efk" show FETCH_HEAD:docs/readme_sample.txt > "$C/fx/samples/readme_sample.txt"
echo "klart: $C/rt (runtime) och $C/fx/samples (effekter)"
