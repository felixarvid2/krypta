#!/bin/bash
# Bygger Debian-paketet krypta_<version>_all.deb av repots spelfiler.
#   bash tools/deb/build.sh [version]        → tools/deb/out/krypta_<version>_all.deb
# Paketet lägger spelet i /usr/share/krypta, startaren i /usr/bin/krypta (en liten lokal webbserver
# på 127.0.0.1:47823 som öppnar spelet i webbläsaren) och en menypost med ikon.
set -euo pipefail
cd "$(dirname "$0")/../.."
ROOT=${KRYPTA_ROOT:-$PWD}
VER=${1:-23.0}
OUT=$PWD/tools/deb/out; PKG=$OUT/pkg
rm -rf "$PKG"; mkdir -p "$PKG/DEBIAN" "$PKG/usr/share/krypta" "$PKG/usr/bin" "$PKG/usr/share/applications" \
  "$PKG/usr/share/icons/hicolor/256x256/apps" "$PKG/usr/share/doc/krypta"
cp -r "$ROOT/index.html" "$ROOT/js" "$ROOT/css" "$ROOT/assets" "$PKG/usr/share/krypta/"
install -m 755 tools/deb/krypta "$PKG/usr/bin/krypta"
python3 tools/deb/icon.py "$ROOT" "$PKG/usr/share/icons/hicolor/256x256/apps/krypta.png"
cat > "$PKG/usr/share/applications/krypta.desktop" <<D
[Desktop Entry]
Type=Application
Name=Krypta
Comment=Retro-FPS i krypterna – en raycaster i webbläsaren
Comment[en]=Retro FPS in the crypts – a raycaster in your browser
Exec=krypta
Icon=krypta
Terminal=false
Categories=Game;ActionGame;
D
cat > "$PKG/usr/share/doc/krypta/copyright" <<D
Format: https://www.debian.org/doc/packaging-manuals/copyright-format/1.0/
Upstream-Name: Krypta
Source: https://github.com/felixarvid2/krypta

Files: *
Copyright: Krypta-projektet
Comment: Spelkod, grafik, ljud och musik är gjorda för Krypta (ritade och syntetiserade lokalt)
 eller hämtade ur fria paket (CC0) – se README.md i källkoden.

Files: usr/share/krypta/assets/font/PressStart2P.ttf
License: OFL-1.1
Comment: Se usr/share/krypta/assets/font/OFL-PressStart2P.txt
D
SIZE=$(du -sk "$PKG/usr" | cut -f1)
cat > "$PKG/DEBIAN/control" <<D
Package: krypta
Version: $VER
Section: games
Priority: optional
Architecture: all
Depends: python3
Recommends: xdg-utils
Installed-Size: $SIZE
Maintainer: Krypta <felixarvid2@users.noreply.github.com>
Homepage: https://github.com/felixarvid2/krypta
Description: retro-FPS i krypterna (raycaster i webbläsaren)
 Krypta är en roguelike-FPS i stil med de gamla boomer shooters: genererade
 våningar i över trettio biomer, bossar, kort och vapen. Spelet körs i
 webbläsaren; kommandot "krypta" startar en liten lokal webbserver på
 127.0.0.1:47823 och öppnar spelet. Engelska som standard, svenska i
 inställningarna.
D
find "$PKG" -type d -exec chmod 755 {} +; find "$PKG/usr/share" -type f -exec chmod 644 {} +
dpkg-deb --root-owner-group --build -Zxz "$PKG" "$OUT/krypta_${VER}_all.deb" >/dev/null
rm -rf "$PKG"
echo "$OUT/krypta_${VER}_all.deb"
