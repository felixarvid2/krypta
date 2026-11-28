#!/bin/bash
# Röster för Krypta version 25.1: fiendernas utrop (AI24 och R25) som korta, förvrängda radioröster i spelets mörka stil.
# 14 repliker × 3 röstlägen × 2 språk = 84 filer i assets/snd/vo/<id>_<röst>_<språk>.ogg (spelet laddar bara det valda språkets 42).
#   deep  – djup:     soldater, riddare och vakter (espeak-ng m3, sänkt tonhöjd, mättad radio)
#   rasp  – hes:      spöken, fångar, gruvarbetare och nomader (espeak-ng croak, sänkt, sönderbruten och skrovlig)
#   hiss  – väsande:  kultister, ödlor och schakaler (viskad espeak-ng blandad med en svag tonande röst, högpass och sus)
# Kedjan: espeak-ng (22 kHz) -> ffmpeg: tonhöjd (asetrate/atempo), band (högpass/lågpass), drivning och mjuk klippning,
# kort rymd (aecho), tystnad bort i båda ändar, en kort "squelch" (bandpassat brus) på slutet som i en radio, längd högst 1,6 s.
# Samma konventioner som make2.sh–make20.sh för effekter: mono 22 kHz Vorbis q2, toppnormaliserad till -2 dBFS (röster),
# -fflags +bitexact. Bruset har fast frö (anoisesrc seed), så filerna blir desamma vid omkörning med samma espeak-ng/ffmpeg.
# Licens: espeak-ng är GPL-3.0, men ljud som programmet genererar omfattas inte av GPL och får användas fritt (som spelets övriga
# syntetiserade ljud). Texterna är spelets egna (svenska) och deras engelska motsvarigheter i tools/i18n/en/manual.json.
# Kräver: espeak-ng (apt-get install -y espeak-ng) och ffmpeg med libvorbis.
# Kör från var som helst: bash tools/sounds/make25_voice.sh   (O=... i miljön skriver filerna någon annanstans, t.ex. för att provlyssna)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
O=${O:-$HERE/../../assets/snd/vo}
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
mkdir -p "$O"
command -v espeak-ng >/dev/null || { echo "espeak-ng saknas (apt-get install -y espeak-ng)"; exit 1; }

# id | svenska | engelska (gemener: espeak läser versaler som förkortningar)
LINES=(
  "flank|flankera!|flank him!"
  "reload|han laddar om!|he's reloading!"
  "where|var är han?|where is he?"
  "coverme|täck mig!|cover me!"
  "takecover|i skydd!|take cover!"
  "flush|ut med dig!|flush him out!"
  "mandown|man nere!|man down!"
  "there|där är han!|there he is!"
  "shields|sköldar upp!|shields up!"
  "behind|bakom mig!|get behind me!"
  "forward|framåt!|forward!"
  "hold|håll linjen!|hold the line!"
  "cmddown|befälet är dött!|the commander is down!"
  "grenade|granat!|grenade!"
)

peak() { ffmpeg -hide_banner -nostats -i "$1" -af volumedetect -f null - 2>&1 | sed -n 's/.*max_volume: \(-\{0,1\}[0-9.]*\) dB.*/\1/p'; }
calc() { awk "BEGIN{printf \"%.6f\", $1}"; }
TRIM="silenceremove=start_periods=1:start_threshold=-42dB,areverse,silenceremove=start_periods=1:start_threshold=-42dB,areverse"

# say UT RÖST SPRÅK TEXT: espeak-ng -> wav (22050 Hz mono)
say() {
  local out=$1 kind=$2 lang=$3 text=$4 v
  case "$lang" in sv) v=sv;; en) v=en-gb;; esac
  case "$kind" in
    deep) espeak-ng -v "$v+m3" -s 175 -p 22 -a 170 -g 1 -w "$out" "$text" ;;
    rasp) espeak-ng -v "$v+croak" -s 170 -p 30 -a 170 -g 1 -w "$out" "$text" ;;
    hiss) espeak-ng -v "$v+whisper" -s 165 -p 55 -a 190 -g 1 -w "$out" "$text"
          espeak-ng -v "$v+m3" -s 165 -p 40 -a 120 -g 1 -w "${out%.wav}_v.wav" "$text" ;;
  esac
}

# fx UT RÖST: efterbehandlingen per röstläge
post() {
  local in=$1 kind=$2 out=$3 g
  case "$kind" in
    deep) g="[0:a]aresample=22050,asetrate=22050*0.80,aresample=22050,atempo=1.15,$TRIM,highpass=f=170,lowpass=f=3000,volume=10dB,asoftclip=type=atan,equalizer=f=900:t=q:w=1.2:g=5,aecho=0.8:0.45:35|71:0.22|0.12,apad=pad_dur=0.12[v]" ;;
    rasp) g="[0:a]aresample=22050,asetrate=22050*0.88,aresample=22050,atempo=1.08,$TRIM,highpass=f=260,lowpass=f=2800,volume=14dB,asoftclip=type=hard,acrusher=bits=7:mode=log:mix=0.35:aa=1,equalizer=f=1400:t=q:w=1:g=4,aecho=0.8:0.4:28|55:0.25|0.1,apad=pad_dur=0.12[v]" ;;
    hiss) g="[0:a]aresample=22050,$TRIM,highpass=f=700[w];[1:a]aresample=22050,asetrate=22050*0.75,aresample=22050,atempo=1.25,$TRIM,lowpass=f=1800,volume=-9dB[b];[w][b]amix=inputs=2:duration=first:normalize=0,lowpass=f=6500,volume=8dB,asoftclip=type=tanh,aecho=0.8:0.5:45|90:0.25|0.15,apad=pad_dur=0.12[v]" ;;
  esac
  local ins=(-i "$in"); [ "$kind" = hiss ] && ins+=(-i "${in%.wav}_v.wav")
  # squelch: 70 ms bandpassat brus med fast frö efter repliken
  ffmpeg -loglevel error -y "${ins[@]}" -f lavfi -i "anoisesrc=d=0.07:c=white:r=22050:a=0.25:seed=251" \
    -filter_complex "$g;[$([ "$kind" = hiss ] && echo 2 || echo 1):a]bandpass=f=1800:w=1200,afade=t=in:d=0.01,afade=t=out:st=0.04:d=0.03[n];[v][n]concat=n=2:v=0:a=1,atrim=0:1.6,afade=t=out:st=1.52:d=0.08[o]" \
    -map '[o]' -ac 1 -ar 22050 "$out"
}

for row in "${LINES[@]}"; do
  IFS='|' read -r id sv en <<<"$row"
  for lang in sv en; do
    text=$sv; [ "$lang" = en ] && text=$en
    for kind in deep rasp hiss; do
      n="${id}_${kind}_${lang}"
      say "$T/raw_$n.wav" "$kind" "$lang" "$text"
      post "$T/raw_$n.wav" "$kind" "$T/$n.wav"
      v=$(calc "-2 - ($(peak "$T/$n.wav"))")
      ffmpeg -loglevel error -y -i "$T/$n.wav" -af "volume=${v}dB" -c:a libvorbis -q:a 2 -fflags +bitexact "$O/$n.ogg"
    done
  done
done

tot=0; for f in "$O"/*.ogg; do s=$(stat -c %s "$f"); tot=$((tot + s)); printf '%-28s %5.2f s %4d kB\n' "$(basename "$f")" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" $((s / 1024)); done
echo "totalt $(ls "$O"/*.ogg | wc -l) filer, $((tot / 1024)) kB"
