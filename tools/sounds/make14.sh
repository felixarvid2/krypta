#!/bin/bash
# Ljud för Krypta version 17 ("Spökskeppet och Laboratoriet"): Spökskeppet (spökpiraten, kanonjären med sin tändstubin, den
# drunknade matrosen, papegojspöket, tentakeln, skeppsråttorna, kanonen och kanonkulan, ruttna plankor som brakar, vågor som sköljer
# över däck, skrovets knarr och havets drönare), Alkemistens laboratorium (homunkulusen, slemmet, lärlingen, kvicksilvergolemen,
# flaskgasten, kimären, kolvar som bubblar, teslaspolen, syrakaret, flaskor som krossas, transmutationscirkeln, alembiken och
# laboratoriets surr), vapnen kedjekulekanonen och syrasprutan, bossarna spökkaptenen och alkemisten, och musiken ship (+ ship_hi),
# lab (+ lab_hi), boss17 och boss18. _hi-filerna är tidslinjerade intensitetslager: samma längd och samma taktnät som grundspåret,
# så att spelet kan tona in dem ovanpå.
# Samma konventioner som make2.sh-make13.sh: effekter mono 22 kHz Vorbis q2 toppnormaliserade till $TOP dBFS
# (standard -1, röster -2, slingor -4), musik stereo 44,1 kHz Vorbis q1 linjärt förstärkt till mål-LUFS,
# alla slingor bär LOOPLENGTH=<sampel> i Vorbis-kommentaren och effektslingorna vrids så att skarven
# hamnar där signalen är tyst och flack. Slingor: ship_creak, lab_bubble, acid_spray, ship_hum och lab_hum.
# Källor: assets/audio (Kenney-paketen CC0: impact-sounds, rpg-audio; 400 Sounds Pack CC0).
# Röster (skratt, vrål, gurgel, skri, pip, fnitter, mummel), dragspel, hav, trä, glas, bubblor, el, syra, slingorna och all musik
# syntetiseras med python3 + numpy (inbäddat nedan).
# Deterministiskt: fast frö för slumptalen och -fflags +bitexact (annars slumpar Ogg-muxern serienumret).
# Kör från katalogen där retrofps/ (repot) och assets/audio/ ligger: bash retrofps/tools/sounds/make14.sh
# (O=... och M=... i miljön skriver effekterna och musiken någon annanstans, t.ex. för att provlyssna.)
set -e
O=${O:-retrofps/assets/snd}
M=${M:-retrofps/assets/music}
A=assets/audio
S="$A/400 Sounds Pack"
I=$A/impact-sounds/Audio
R=$A/rpg-audio/Audio
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
mkdir -p "$M" "$O"

peak() { ffmpeg -hide_banner -nostats -i "$1" -af volumedetect -f null - 2>&1 | sed -n 's/.*max_volume: \(-\{0,1\}[0-9.]*\) dB.*/\1/p'; }
lufs() { ffmpeg -hide_banner -nostats -i "$1" -af ebur128 -f null - 2>&1 | awk '$1=="I:"{i=$2} END{print i}'; }
nsamp() { ffprobe -v error -select_streams a:0 -show_entries stream=duration_ts -of csv=p=0 "$1"; }
calc() { awk "BEGIN{printf \"%.6f\", $1}"; }
render() { # render UT KANALER HZ 'graf' källor...  (graf utan [o] blir "[0:a]graf[o]")
  local out=$1 ac=$2 ar=$3 g=$4; shift 4
  local args=(); for f in "$@"; do args+=(-i "$f"); done
  case "$g" in *'[o]'*) ;; *) g="[0:a]$g[o]";; esac
  ffmpeg -loglevel error -y "${args[@]}" -filter_complex "$g" -map '[o]' -ac "$ac" -ar "$ar" "$out"
}
# fx NAMN 'graf' källor...: mono 22 kHz, toppnormaliserad till $TOP dBFS (standard -1, som de gamla ljuden)
fx() {
  local n=$1 g=$2; shift 2
  render "$T/$n.wav" 1 22050 "$g" "$@"
  finish "$n"
}
finish() { # finish NAMN [loop]
  local v tag=(); v=$(calc "${TOP:--1} - ($(peak "$T/$1.wav"))")
  [ "$2" = loop ] && tag=(-metadata "LOOPLENGTH=$(nsamp "$T/$1.wav")")
  ffmpeg -loglevel error -y -i "$T/$1.wav" -af "volume=${v}dB" "${tag[@]}" -c:a libvorbis -q:a 2 -fflags +bitexact "$O/$1.ogg"
}
# fxloop NAMN LEN X 'graf' källor...: som fx men en sömlös slinga på LEN s (grafen ska ge minst LEN+X s)
fxloop() {
  local n=$1 len=$2 x=$3 g=$4; shift 4
  render "$T/raw_$n.wav" 1 22050 "$g" "$@"
  xloop "$T/raw_$n.wav" "$T/$n.wav" "$len" "$x"
  python3 -I "$T/rot.py" "$T/$n.wav"
  finish "$n" loop
}
# mus NAMN LUFS 'graf' källor...: stereo 44,1 kHz Vorbis q1, linjär förstärkning till LUFS, topp under -1 dBFS.
# GAIN=x dB i miljön ger fast förstärkning i stället.
mus() {
  local n=$1 tgt=$2 g=$3; shift 3
  render "$T/m_$n.wav" 2 44100 "$g" "$@"
  local v p
  if [ -n "$GAIN" ]; then v=$GAIN; else v=$(calc "$tgt - ($(lufs "$T/m_$n.wav"))"); fi
  p=$(calc "$(peak "$T/m_$n.wav") + $v")
  v=$(awk "BEGIN{p=$p; v=$v; if (p > -1) v -= p + 1; printf \"%.2f\", v}")
  LASTGAIN=$v
  ffmpeg -loglevel error -y -i "$T/m_$n.wav" -af "volume=${v}dB" -metadata "LOOPLENGTH=$(nsamp "$T/m_$n.wav")" -c:a libvorbis -q:a 1 -fflags +bitexact "$M/$n.ogg"
}
# sömlös slinga: LEN s ur IN, de följande X s tonas in över början (lika effekt).
xloop() { # xloop IN UT LEN X
  ffmpeg -loglevel error -y -i "$1" -ss "$3" -i "$1" -filter_complex "[0:a]atrim=0:$3,afade=t=in:d=$4:curve=qsin[p];[1:a]atrim=0:$4,afade=t=out:d=$4:curve=qsin[q];[p][q]amix=inputs=2:normalize=0:duration=first[o]" -map '[o]' "$2"
}
# rot.py WAV: vrider en sömlös slinga (cirkulärt) så att skarven hamnar där signalen är nära noll och flack.
# Webbläsaren samplar om filen vid avkodningen (22,05 -> 44,1/48 kHz) med tystnad före första sampelet,
# så en skarv mitt i ett starkt basljud (mullret, stenblocket) ger annars ett litet knäpp.
# Sedan make9.sh: game.js slingar effekterna vid duration - 25 ms (inte vid LOOPLENGTH), så vridningen väljs också så att
# sampelet 25 ms före slutet fortsätter jämnt in i början (annars knäpper glasdrönaren i mirror_hum i spelet).
cat > "$T/rot.py" <<'PY'
import sys, wave, numpy as np
p = sys.argv[1]
with wave.open(p, 'rb') as w:
    prm = w.getparams(); assert prm.sampwidth == 2 and prm.nchannels == 1
    x = np.frombuffer(w.readframes(prm.nframes), '<i2').astype(float)
n = len(x); k = max(1, prm.framerate // 400)  # 2,5 ms glidande medel
lp = np.convolve(np.concatenate([x[-k:], x, x[:k]]), np.ones(2 * k + 1) / (2 * k + 1), 'same')[k:-k]
m = prm.framerate // 20; c = np.concatenate([[0], np.cumsum(np.concatenate([x, x]) ** 2)])
after = np.sqrt((c[np.arange(n) + m] - c[np.arange(n)]) / m); before = np.roll(after, m)  # 50 ms efter/före
cost = np.abs(lp) + 20 * np.abs(lp - np.roll(lp, 1)) + 0.3 * np.abs(x) + 0.25 * (before + after)
j = (np.arange(n) - int(round(0.025 * prm.framerate)) - 1) % n  # sista sampelet före game.js-skarven
cost += 2 * np.abs(x - 2 * x[j] + x[j - 1])  # där ska början fortsätta som en vanlig sampelövergång
cost[np.abs(20 * np.log10((before + 1) / (after + 1))) >= 1.0] = np.inf  # samma nivå på båda sidor
i = int(np.argmin(cost))
with wave.open(p, 'wb') as w:
    w.setparams(prm); w.writeframes(np.concatenate([x[i:], x[:i]]).astype('<i2').tobytes())
PY
P="aresample=44100,aformat=sample_fmts=fltp:channel_layouts=mono"
mix() { echo "amix=inputs=$1:normalize=0:duration=longest"; }


cat > "$T/synth14.py" <<'PY'
# Syntetiserade effekter och musik för Krypta version 17. Användning: python3 synth14.py <katalog>
# Musikslingan läggs med "wrap" (toner som går över slutet läggs på början), efterklangen är en cirkulär
# faltning och liggande toner/brus har ett helt antal perioder på slingan, så slingan är sömlös.
# Byggstenarna nedan är desamma som i make13.sh; nya står under "hav, skepp, dragspel, röster och alkemi".
import sys, wave, re, subprocess, numpy as np
SR = 44100
OUT = sys.argv[1]
rng = np.random.default_rng(17017)
def m2f(n): return 440.0 * 2 ** ((n - 69) / 12)
def tt(d): return np.arange(int(d * SR)) / SR

def env(n, att, rel):
    e = np.ones(n)
    a = min(n, max(1, int(att * SR))); e[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    r = min(n, max(1, int(rel * SR))); e[n - r:] *= np.cos(np.linspace(0, np.pi / 2, r)) ** 2
    return e

def fftfilt(x, lo=0, hi=None, slope=1.0):  # cirkulär (fas-noll) filtrering i frekvensplanet
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if hi: g *= 1 / (1 + (f / hi) ** (4 * slope))
    if lo: g *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** (4 * slope))
    return np.fft.irfft(X * g, len(x))

def reson(x, F):  # resonanser [(fc, bandbredd, amp)] i frekvensplanet (fasta frekvenser)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.zeros_like(f)
    for fc, bw, a in F: g += a / (1 + ((f - fc) / bw) ** 2)
    return np.fft.irfft(X * g, len(x))

def svf(x, fc, q, mode='bp'):  # tidsvarierande tillståndsvariabelfilter (TPT), fc per sampel
    fc = np.broadcast_to(np.asarray(fc, float), x.shape)
    g = np.tan(np.pi * np.clip(fc, 20, SR * 0.45) / SR); k = 1 / q
    a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2
    ic1 = ic2 = 0.0; y = np.empty_like(x)
    for i in range(len(x)):
        v3 = x[i] - ic2; v1 = a1[i] * ic1 + a2[i] * v3; v2 = ic2 + a2[i] * ic1 + a3[i] * v3
        ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2
        y[i] = v1 if mode == 'bp' else v2
    return y

def noise(d): return rng.standard_normal(int(d * SR))
def lpnoise(d, fc):  # långsamt slumpvärde -1..1 (för modulering)
    x = fftfilt(noise(d), 0, fc); return x / (np.abs(x).max() + 1e-9)
def phase(f): return 2 * np.pi * np.cumsum(f) / SR
def sawp(ph, fmax, f0):  # bandbegränsad sågtand ur en fas; f0 = högsta grundton
    y = np.zeros_like(ph)
    for k in range(1, max(1, int(fmax / f0)) + 1): y += np.sin(k * ph) / k
    return y
def nrm(x): return x / (np.abs(x).max() + 1e-9)

def place(buf, t0, sig, g=1.0):
    i = int(t0 * SR)
    if i < 0: sig = sig[-i:]; i = 0
    m = min(len(sig), len(buf) - i)
    if m > 0: buf[i:i + m] += sig[:m] * g

def verb(x, length=1.2, wet=0.3, bright=5000, tail=True):  # kort efterklang (linjär, med svans)
    n = int(length * SR); t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t * 6.9 / length); ir = fftfilt(ir, 150, bright)
    ir /= np.sqrt((ir ** 2).sum() * (SR / 2) / (bright - 150))
    L = len(x) + (n if tail else 0); N = 1 << int(np.ceil(np.log2(L + n)))
    w = np.fft.irfft(np.fft.rfft(x, N) * np.fft.rfft(ir, N), N)[:L]
    y = np.zeros(L); y[:len(x)] += x
    return y + wet * w

def wr(name, x, ch=1):
    x = np.asarray(x, float); x = x / max(1e-9, np.abs(x).max()) * 0.8
    with wave.open(f'{OUT}/{name}.wav', 'wb') as w:
        w.setnchannels(ch); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())

def rd(name):
    with wave.open(f'{OUT}/{name}.wav', 'rb') as w:
        return np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32768

def fade_tail(x, d):
    n = min(len(x), int(d * SR)); x = x.copy(); x[len(x) - n:] *= np.cos(np.linspace(0, np.pi / 2, n)) ** 2; return x

def cut(x, d, fade=0.3): return fade_tail(x[:int(d * SR)], fade)

# ---- byggstenar (som i make4.sh-make7.sh) ----
def formants(freq, F):
    g = np.full_like(np.asarray(freq, float), 0.02)
    for fc, bw, a in F: g = g + a / (1 + ((freq - fc) / bw) ** 2)
    return g

def voice(f0, F, hmax=7000, jitter=0.0, roll=0.6):
    """additiv röst: f0 är en kurva (Hz per sampel), F formanter [(fc, bw, amp)] (fc får vara en kurva)"""
    if jitter: f0 = f0 * (1 + jitter * fftfilt(rng.standard_normal(len(f0)), 0, 60) / 0.1)
    ph = phase(f0); y = np.zeros(len(f0)); fm = f0.max()
    for k in range(1, int(hmax / fm) + 1):
        y += formants(k * f0, F) / k ** roll * np.sin(k * ph)
    return y

AA = [(700, 110, 1.0), (1150, 130, 0.55), (2650, 180, 0.22)]
OH = [(480, 90, 1.0), (820, 110, 0.5), (2500, 180, 0.1)]
HA = [(800, 140, 1.0), (1250, 160, 0.7), (2700, 220, 0.3)]
MM = [(260, 70, 1.0), (1050, 200, 0.06), (2200, 250, 0.04)]  # nasalt "mm"

def choir(notes, d, att=0.2, rel=0.5, g=1.0, vib=5.0, F=AA, hmax=5000):
    t = tt(d); y = np.zeros_like(t)
    for n in notes:
        for det in (-0.004, 0.0035):
            f0 = m2f(n) * (1 + det) * (1 + 0.006 * np.sin(2 * np.pi * (vib + rng.uniform(-.4, .4)) * t + rng.uniform(0, 6)))
            y += voice(f0, F, hmax, roll=1.0)
    return y * env(len(t), att, rel) * g / len(notes)

def bar(f, d, g=1.0, dec=3.0):  # klockspel/celesta: delton 1, 2.76, 5.40, 8.93
    t = tt(d); y = np.zeros_like(t)
    for r, a, dd in ((1, 1, 1), (2.756, 0.35, 2.2), (5.404, 0.18, 4), (8.933, 0.08, 6)):
        if f * r < SR * 0.45: y += a * np.exp(-t * dec * dd) * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6))
    return y * env(len(t), 0.002, 0.05) * g

def ping(f, d, g=1.0, dec=5.0):  # mjukt pling: nästan sinus
    t = tt(d)
    y = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t) * np.exp(-t * 4) + 0.05 * np.sin(6 * np.pi * f * t) * np.exp(-t * 8)
    return y * np.exp(-t * dec) * env(len(t), 0.003, 0.05) * g

def bell(n, d=6.0, g=1.0):  # kyrkklocka
    f = m2f(n); t = tt(d); y = np.zeros_like(t)
    for r, a, dec in ((0.5, 0.6, 0.35), (1, 1, 0.6), (1.19, 0.5, 0.9), (1.5, 0.35, 1.1), (2, 0.5, 1.4), (2.51, 0.25, 2.2), (3.01, 0.2, 2.8), (4.1, 0.12, 3.6)):
        y += a * np.exp(-t * dec) * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6))
    return y * env(len(t), 0.003, 0.5) * g

def anvil(f=1100, d=0.8, g=1.0):  # metallslag: oharmoniska delton, snabb avklingning
    t = tt(d); y = np.zeros_like(t)
    for r, a, dec in ((1, 1, 7), (2.32, 0.6, 9), (3.87, 0.4, 12), (5.6, 0.25, 16), (7.1, 0.12, 22)):
        if f * r < SR * 0.45: y += a * np.exp(-t * dec) * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6))
    y += fftfilt(rng.standard_normal(len(t)), 2000, 9000) * np.exp(-t * 150) * 0.8
    return y * env(len(t), 0.0005, 0.05) * g

def pluck(n, d=2.0, bright=1.3, g=1.0):
    f = m2f(n); t = tt(d); y = np.zeros_like(t)
    for k in range(1, 16):
        if f * k > 9000: break
        y += (1 / k ** bright) * np.exp(-t * (1.0 + 0.85 * k)) * np.sin(2 * np.pi * f * k * t * (1 + 0.0004 * k * k))
    return y * env(len(t), 0.004, 0.08) * g

def drum(f0=60, d=1.2, g=1.0, snap=0.3, dec=4.5):
    t = tt(d); fr = f0 * (1 + 1.2 * np.exp(-t * 28))
    y = np.sin(phase(fr)) * np.exp(-t * dec)
    nz = fftfilt(rng.standard_normal(len(t)), 80, 900) * np.exp(-t * 30) * snap
    return (y + nz) * env(len(t), 0.002, 0.1) * g

def tick(d=0.06, g=1.0, lo=5000, hi=11000, dec=70):
    t = tt(d); return fftfilt(rng.standard_normal(len(t)), lo, hi) * np.exp(-t * dec) * g

def brass(notes, d, att=0.15, rel=0.3, drive=2.5, lo_fc=450, hi_fc=2600, swell=0.4, g=1.0):
    """distad mässing: detunade sågtänder, ljusheten sväller in (blandning mörk/ljus), tanh-distorsion"""
    t = tt(d); y = np.zeros_like(t)
    for n in notes:
        for det in (-0.004, 0.0, 0.0045):
            f = m2f(n) * (1 + det) * (1 + 0.003 * np.sin(2 * np.pi * 5.2 * t + rng.uniform(0, 6)) * np.clip((t - 0.3) / 0.4, 0, 1))
            y += sawp(phase(f), 7000, f.max())
    y /= np.abs(y).max() + 1e-9
    b = np.clip(t / max(swell, 1e-3), 0, 1) ** 1.5 * (1 - 0.35 * np.clip((t - d * 0.6) / (d * 0.4), 0, 1))
    y = fftfilt(y, 30, lo_fc) * (1 - b) + fftfilt(y, 30, hi_fc) * b
    y = np.tanh(drive * y / (np.abs(y).max() + 1e-9))
    y = fftfilt(y, 40, 5000)
    return y * env(len(t), att, rel) * g

def dbass(n, d, g=1.0, drive=2.4, hi=900):  # distad bas (sågtand)
    t = tt(d); f = m2f(n)
    y = sawp(2 * np.pi * f * t, 3000, f) + 0.7 * sawp(2 * np.pi * f * 1.005 * t, 3000, f)
    y = fftfilt(y, 30, hi); y = np.tanh(drive * y / (np.abs(y).max() + 1e-9))
    return y * env(len(t), 0.004, 0.04) * g

def glass(n, d, g=1.0, att=0.3, rel=1.4, trem=4.5, det=0.0013):  # glasharmonika: nästan ren sinus, svag sväng
    f = m2f(n); t = tt(d); p0 = rng.uniform(0, 6)
    y = np.sin(2 * np.pi * f * t + p0) + 0.6 * np.sin(2 * np.pi * f * (1 + det) * t + p0 + 1) \
        + 0.12 * np.sin(4 * np.pi * f * t) + 0.04 * np.sin(6 * np.pi * f * t)
    y *= 1 + 0.07 * np.sin(2 * np.pi * trem * t + rng.uniform(0, 6))
    return y * env(len(t), att, rel) * g / 1.6

def debris(d, n=40, lo=400, hi=3500, t1=None):  # småsten som faller: korta bandade knackar
    y = np.zeros(int(d * SR)); t1 = t1 or d * 0.8
    for _ in range(n):
        t0 = t1 * rng.uniform(0, 1) ** 1.4; dd = rng.uniform(0.01, 0.04)
        c = fftfilt(noise(dd + 0.02), lo * rng.uniform(0.7, 1.4), hi * rng.uniform(0.7, 1.2))[:int(dd * SR)]
        c *= np.exp(-tt(dd) * rng.uniform(80, 200))
        place(y, t0, c, rng.uniform(0.2, 1) * (1 - 0.6 * t0 / d))
    return y

def grains(d, n, lo=1500, hi=7000, maxlen=0.004):  # jämnt utspridda korn (grus, sand, krafsande ben)
    y = np.zeros(int(d * SR))
    for _ in range(n):
        dd = rng.uniform(0.0006, maxlen); c = noise(dd + 0.0005)[:max(2, int(dd * SR))]
        place(y, rng.uniform(0, d - maxlen - 0.001), c * np.exp(-np.linspace(0, 5, len(c))), rng.uniform(0.2, 1) ** 2)
    return fftfilt(y, lo, hi)

def sparks(y, d, n, dist=1.0, g=1.0):  # gnistor: korta brusklick
    for _ in range(n):
        u = rng.uniform(0, 1) ** dist; dd = rng.uniform(0.0008, 0.004)
        c = noise(dd + 0.001)[:max(1, int(dd * SR))]; c = c * np.exp(-np.arange(len(c)) / len(c) * 4)
        place(y, u * (d - 0.01), c, rng.uniform(0.4, 1.4) * g)

def low_rumble(d, f=45):
    t = tt(d); return fftfilt(noise(d), 20, 160) * 0.7 + 0.3 * np.sin(2 * np.pi * f * t) * (1 + 0.3 * np.sin(2 * np.pi * 7 * t))

def bow_creak(d=0.65, r0=22, r1=45, F=((640, 1, 120), (1480, 0.7, 160), (2650, 0.4, 220))):  # stick-slip-knarr
    t = tt(d); u = t / d
    rate = r0 + r1 * u + 8 * lpnoise(d, 6)
    ph = np.cumsum(rate) / SR; idx = np.nonzero(np.diff(np.floor(ph)))[0]
    imp = np.zeros(len(t)); imp[idx] = rng.uniform(0.5, 1, len(idx))
    k = tt(0.03); ker = sum(a * np.sin(2 * np.pi * f * k) * np.exp(-k * dd) for f, a, dd in F)
    y = np.convolve(imp, ker)[:len(t)]
    y += fftfilt(noise(d), 1500, 6000) * 0.04
    return y * (0.3 + 0.7 * u ** 0.7) * env(len(t), 0.03, 0.06)

def thud(f0=48, d=0.7, crunch=0.4):  # tungt slag: fallande subton + dovt brus + krasch
    t = tt(d)
    y = np.sin(phase(f0 * (1 + 2.0 * np.exp(-t * 30)))) * np.exp(-t * 6)
    y += fftfilt(noise(d), 40, 700) * np.exp(-t * 18) * 0.6
    y += fftfilt(noise(d), 1500, 6000) * np.exp(-t * 90) * 0.3
    y += debris(d, 25, 700, 4000, 0.18) * crunch
    return y * env(len(t), 0.001, 0.1)


# ---- nya byggstenar: kristall, vatten, sång ----
def crys(f, d, g=1.0, dec=2.0, det=0.0015):  # kristall: oharmoniska delton (stav/glas) med svag svävning
    t = tt(d); y = np.zeros_like(t)
    for r, a, dd in ((1, 1, 1), (2.32, 0.5, 1.6), (4.25, 0.3, 2.4), (6.63, 0.18, 3.5), (9.38, 0.08, 5)):
        if f * r * (1 + det) < SR * 0.45:
            p = rng.uniform(0, 6)
            y += a * np.exp(-t * dec * dd) * (np.sin(2 * np.pi * f * r * t + p) + 0.7 * np.sin(2 * np.pi * f * r * (1 + det) * t + p + 1))
    return y * env(len(t), 0.001, 0.03) * g / 1.7

def shards(d, n, t1=None, lo=2500, hi=8000, dec=(10, 35)):  # glasskärvor som faller och klirrar
    y = np.zeros(int(d * SR)); t1 = t1 or d * 0.8
    for _ in range(n):
        t0 = t1 * rng.uniform(0, 1) ** 1.6; dd = rng.uniform(0.06, 0.25)
        place(y, t0, crys(rng.uniform(lo, hi), dd, 1, rng.uniform(*dec), 0.004), rng.uniform(0.15, 1) * (1 - 0.7 * t0 / d))
    return y

def legato(notes, glide=0.06):  # f0-kurva, amplitud och tid sedan tonens början ur [(t0, midi, d)]
    end = max(t0 + d for t0, _, d in notes) + 0.3; t = tt(end); N = len(t)
    f0 = np.full(N, m2f(notes[0][1])); amp = np.zeros(N); since = np.zeros(N)
    for t0, n, d in notes:
        i0 = int(t0 * SR); i1 = min(N, int((t0 + d) * SR) + int(0.05 * SR))
        f0[i0:] = m2f(n); since[i0:] = t[i0:] - t0
        amp[i0:i1] = np.maximum(amp[i0:i1], env(i1 - i0, 0.06, 0.12))
    k = max(1, int(glide * SR)); f0 = np.convolve(np.concatenate([np.full(k, f0[0]), f0, np.full(k, f0[-1])]), np.ones(k) / k, 'same')[k:-k]
    return t, f0, amp, since

def sing(notes, F, g=1.0, vib=0.01, glide=0.05, hmax=7000, roll=0.9, breath=0.05, shift=1.0):  # sjungen legatofras
    t, f0, amp, since = legato(notes, glide)
    v = 1 + vib * np.clip((since - 0.15) / 0.25, 0, 1) * np.sin(2 * np.pi * 5.6 * t)
    y = nrm(voice(f0 * v * shift, F, hmax, jitter=0.002, roll=roll))
    y = y + nrm(fftfilt(rng.standard_normal(len(t)), 1500, 8000)) * breath
    return y * amp * g

def ting(d=0.55, f=2650, g=1.0, dec=1.0):  # stålspets mot sten/metall
    t = tt(d); y = np.zeros_like(t)
    for r, a, dd in ((1, 1, 9), (1.56, 0.7, 12), (2.26, 0.45, 16), (2.92, 0.25, 22), (3.51, 0.12, 30)):
        if f * r < SR * 0.45: y += a * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6)) * np.exp(-t * dd * dec)
    y += fftfilt(noise(d), 3000, 10000) * np.exp(-t * 250) * 0.8
    return y * env(len(t), 0.0005, 0.03) * g

SOP = [(850, 120, 1.0), (1250, 140, 0.5), (2900, 250, 0.3), (3500, 300, 0.12)]  # ljus kvinnoröst, "ah"
SOO = [(400, 90, 1.0), (800, 110, 0.35), (2800, 250, 0.1)]                      # ljus kvinnoröst, "oo"


# ---- nya byggstenar: urverk, vind, åska ----
def clack(fc=2500, g=1.0, dec=300, d=0.04):  # mekaniskt klick (kugge, spärrhake, tick): kort resonant brusknäpp
    k = tt(d)
    return nrm(reson(noise(d), [(fc, fc * 0.05, 1), (fc * 1.53, fc * 0.08, 0.6), (fc * 2.37, fc * 0.11, 0.35)])) * np.exp(-k * dec) * env(len(k), 0.0004, 0.004) * g

def ratchet(d, r0, r1, fc=2200, fc1=None, g=1.0):  # spärrhjul: klick vars takt (och tonhöjd) går från r0 till r1 per s
    y = np.zeros(int(d * SR)); tc = 0.0; fc1 = fc1 or fc
    while tc < d - 0.04:
        u = tc / d
        place(y, tc, clack(fc * (fc1 / fc) ** u * rng.uniform(0.92, 1.08), rng.uniform(0.6, 1), rng.uniform(250, 400)), g)
        tc += 1 / (r0 * (r1 / r0) ** u) * rng.uniform(0.93, 1.07)
    return y

def blade(f, d, g=1.0, bright=7000):  # sågklinga: tandfrekvens f (tal eller kurva) med övertoner, plus metalliskt fräs
    t = tt(d); f = np.broadcast_to(np.asarray(f, float), t.shape); ph = phase(f); y = np.zeros(len(t))
    for k in range(1, 8):
        if k * f.max() < SR * 0.45: y += np.sin(k * ph + rng.uniform(0, 6)) / k ** 1.1
    y = nrm(fftfilt(y, 300, bright)) * (0.85 + 0.15 * np.sin(ph / 9))
    return (y + 0.35 * nrm(fftfilt(noise(d), 3000, 10000))) * g

def wing(d=0.25):  # vingslag: dovt luftflapp
    t = tt(d); a = np.sin(np.pi * np.clip(t / (d * 0.6), 0, 1)) ** 2
    return nrm(svf(noise(d), 250 + 650 * a, 0.9, 'lp')) * a

def crackle(d, n=200, lo=1500, hi=9000, dist=1.0):  # elektriskt knaster: korta klick i skurar
    y = np.zeros(int(d * SR)); burst = np.clip(lpnoise(d, 12) * 2, 0, 1)
    for _ in range(n):
        i = int(rng.uniform(0, 1) ** dist * (len(y) - 200))
        if rng.uniform() < burst[i] + 0.2:
            c = noise(0.003)[:rng.integers(10, 120)]
            place(y, i / SR, c * np.exp(-np.linspace(0, 6, len(c))), rng.uniform(0.3, 1.2))
    return fftfilt(y, lo, hi)

def bolt(d=0.5, g=1.0):  # blixtens knall: skarp bred brusstöt med knastrande förslag
    t = tt(d); y = fftfilt(noise(d), 300, 11000) * np.exp(-t * 14) * env(len(t), 0.001, 0.05)
    place(y, 0, crackle(0.06, 60, 2000, 10000), 0.6)
    return y * g

def tubebell(n, d, g=1.0):  # rörklocka: oharmoniska delton, lång klang
    f = m2f(n); t = tt(d); y = np.zeros_like(t)
    for r, a, dec in ((1, 1, 1.2), (2.0, 0.55, 1.6), (3.0, 0.45, 2.0), (4.16, 0.35, 2.6), (5.43, 0.2, 3.4), (6.79, 0.1, 4.5)):
        if f * r < SR * 0.45: y += a * np.exp(-t * dec) * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6))
    return y * env(len(t), 0.002, 0.3) * g

def gust(d, lo=300, hi=1900, peak=0.4, g=1.0):  # vindby: svällande och avtagande sus med fladder
    t = tt(d); a = np.interp(t, [0, d * peak, d], [0, 1, 0]) ** 1.3
    y = nrm(svf(noise(d), lo + (hi - lo) * a * (1 + 0.15 * lpnoise(d, 6)), 0.8, 'lp')) * a
    y += nrm(svf(noise(d), (900 + 500 * lpnoise(d, 2)) * (0.7 + 0.6 * a), 4.0)) * a * 0.25
    return y * g


# ---- nya byggstenar: röster, kedjor, jord, trä ----
EH = [(530, 90, 1.0), (1850, 150, 0.5), (2500, 200, 0.2)]

def growl(d, f0, F, rough=0.5, rasp=0.35, hmax=5000, drive=2.2):  # grov röst: subharmonik (varannan period svagare)
    # och strupskrap (brus genom första formanten) – f0 och formanterna får vara kurvor på tt(d)
    v = nrm(voice(f0, F, hmax, jitter=0.03, roll=0.55))
    am = (1 - rough * (0.5 + 0.5 * np.sin(phase(f0 / 2)))) * (1 - 0.3 * rough * (0.5 + 0.5 * lpnoise(d, 30)))
    r = nrm(svf(noise(d), F[0][0], 2.5))
    return np.tanh(drive * (v * am + rasp * r * (0.5 + 0.5 * am)))

def pick_times(dens, n):  # n tidpunkter (s) dragna ur täthetskurvan dens (på tt(d))
    c = np.cumsum(np.maximum(dens, 0)); c /= c[-1]
    return np.searchsorted(c, rng.uniform(0, 1, n)) / SR

def chain(d, n, dens=None, fc=(2200, 5500), g=1.0):  # kedjeskrammel: länkar som slår mot varandra (små metallting
    # och klick); dens styr var i tiden klinkarna hamnar
    y = np.zeros(int(d * SR)); dens = np.ones(len(y)) if dens is None else dens
    for t0 in pick_times(dens, n):
        place(y, t0, ting(0.12, rng.uniform(*fc), 1, rng.uniform(1.8, 3.5)), rng.uniform(0.15, 1) * g)
        if rng.uniform() < 0.4: place(y, t0, clack(rng.uniform(1200, 2400), 1, 300, 0.03), rng.uniform(0.2, 0.6) * g)
    return y

def splat(d=0.3, g=1.0):  # vått smack: brusstöt genom låga resonanser och slemmiga små bubbelklick
    k = tt(d); y = nrm(reson(noise(d), [(350, 80, 1), (900, 200, 0.6), (2200, 400, 0.3)])) * np.exp(-k * 22)
    for _ in range(14):
        b = tt(0.012); f = rng.uniform(900, 2800)
        place(y, rng.uniform(0.004, d * 0.6), np.sin(phase(f * (1 + 0.6 * b / 0.012))) * np.exp(-b * 300), rng.uniform(0.1, 0.35))
    return y * env(len(k), 0.001, 0.05) * g

def twig(g=1.0):  # kvist/rot som knäcks: skarpt knäpp med träresonans och ett par efterknäck
    d = 0.12; k = tt(d)
    y = nrm(reson(noise(d), [(rng.uniform(1500, 2200), 300, 1), (3200, 500, 0.6), (rng.uniform(700, 1000), 150, 0.5)])) * np.exp(-k * 80)
    for _ in range(2): place(y, rng.uniform(0.008, 0.04), nrm(fftfilt(noise(0.02), 1500, 6000)) * np.exp(-tt(0.02) * 200), rng.uniform(0.2, 0.5))
    return y * env(len(k), 0.0003, 0.02) * g

def creak(d, r0, r1, f=300):  # knarrande trä (stick-slip) med låga träresonanser kring f
    return nrm(bow_creak(d, r0, r1, ((f, 1, 60), (f * 2.4, 0.7, 90), (f * 5, 0.35, 140))))

def squeal(d, fa, fb, g=1.0):  # gällt, gnisslande pip (gnagare/insekt): hög röst med snabbt vibrato och skrovlighet
    t = tt(d); f0 = np.interp(t, [0, d * 0.3, d], [fa, fb, fa * 0.85]) * (1 + 0.05 * np.sin(2 * np.pi * 38 * t))
    v = nrm(voice(f0, [(3000, 600, 1), (5200, 800, 0.5)], 10000, jitter=0.02, roll=0.5))
    return np.tanh(2 * v * (0.6 + 0.4 * np.sin(phase(85 + 20 * lpnoise(d, 10))))) * env(len(t), 0.01, d * 0.4) * g

def hoot(d, f, g=1.0, trem=0.0):  # ugglans hoande: nästan ren ton, mjuk ansats, luftig
    t = tt(d); f0 = f * np.interp(t, [0, d * 0.3, d], [0.93, 1.0, 0.96]); ph = phase(f0)
    y = np.sin(ph) + 0.12 * np.sin(2 * ph) + 0.03 * np.sin(3 * ph)
    y = y * (1 + trem * np.sin(2 * np.pi * 9 * t)) + nrm(fftfilt(noise(d), f, f * 3)) * 0.12
    return y * env(len(t), d * 0.3, d * 0.5) * g

def twang(f=150, d=0.4, bright=1.2, dec=12):  # sträng som smäller (armborst/båge): tonhöjden faller från spänd till vila
    t = tt(d); ph = phase(f * (1 + 0.6 * np.exp(-t * 60)))
    y = sum(np.sin(k * ph + rng.uniform(0, 6)) / k ** bright * np.exp(-t * dec * (1 + 0.15 * k)) for k in range(1, 12))
    return nrm(fftfilt(y, 60, 5000)) * env(len(t), 0.001, 0.08)


# ---- nya byggstenar: sporer, fjädrar, glas och speglar ----
EE = [(300, 70, 1.0), (2300, 200, 0.5), (3000, 250, 0.3)]  # "ii"

def puff(d=0.3, lo=300, hi=2500, g=1.0, pk=0.15):  # mjukt sporpuff: brusstöt genom ett lågpass som öppnar och stänger
    t = tt(d); a = np.interp(t, [0, d * pk, d], [0, 1, 0]) ** 1.5
    return nrm(svf(noise(d), lo + (hi - lo) * a, 0.8, 'lp')) * a * g

def bubble(f=900, d=0.05, g=1.0, rise=0.8):  # bubbla: sinus vars tonhöjd stiger snabbt och klingar av
    b = tt(d); return np.sin(phase(f * (1 + rise * b / d))) * np.exp(-b * 6 / d) * env(len(b), 0.001, 0.005) * g

def bubbles(d, n, lo=500, hi=1800, g=1.0, dens=None):  # bubbelskur (dens styr var i tiden)
    y = np.zeros(int(d * SR)); dens = np.ones(len(y)) if dens is None else dens
    for t0 in pick_times(dens, n):
        dd = rng.uniform(0.02, 0.07); place(y, min(t0, d - dd), bubble(rng.uniform(lo, hi), dd, 1, rng.uniform(0.4, 1.4)), rng.uniform(0.2, 1) * g)
    return y

def boing(f0=170, d=0.7, depth=0.4, rate=13, dec=4.5):  # fjäder-"boing" i retrostil: fyrkantsaktig ton vars tonhöjd svänger och dämpas
    t = tt(d); f = f0 * (1 + 0.7 * np.exp(-t * 30)) * (1 + depth * np.exp(-t * dec) * np.sin(2 * np.pi * rate * t))
    ph = phase(f); y = sum(np.sin(k * ph) / k for k in (1, 3, 5, 7)) + 0.4 * np.sin(2 * ph)
    return nrm(fftfilt(y, 60, 4000)) * np.exp(-t * 3.5) * env(len(t), 0.002, 0.12)

def ric(f0, f1, d=0.5, g=1.0, vib=0.02):  # rikoschett: tunn visslande ton som glider (studsande kula, "pi-iiu")
    t = tt(d); f = f0 * (f1 / f0) ** (t / d) * (1 + vib * np.sin(2 * np.pi * 31 * t)); ph = phase(f)
    return (np.sin(ph) + 0.15 * np.sin(2 * ph)) * np.exp(-t * 4.5 / d) * env(len(t), 0.004, 0.05) * g

def crack(d=0.1, g=1.0, lo=1200):  # skarp spricka/smäll: bred brusknall med snabb avklingning
    t = tt(d); return fftfilt(noise(d), lo, 11000) * np.exp(-t * 90) * env(len(t), 0.0003, 0.02) * g

def shatter(d=1.2, n=60, g=1.0, t1=None, lo=2500, hi=9000):  # glas som krossas: knall, ringande skärvor, klirr som regnar ned
    y = np.zeros(int(d * SR)); place(y, 0, crack(0.15, 1.0, 1500))
    for _ in range(6): place(y, rng.uniform(0, 0.02), crys(rng.uniform(1800, 5000), 0.6, 1, rng.uniform(4, 9), 0.006), rng.uniform(0.2, 0.5))
    y += shards(d, n, t1 or d * 0.6, lo, hi) * 0.8
    return y * g

def swish(d, f0, f1, q=3.0, g=1.0):  # svisch: bandat brus vars mittfrekvens glider från f0 till f1, svällande form
    t = tt(d); return nrm(svf(noise(d), f0 * (f1 / f0) ** (t / d), q)) * np.sin(np.pi * t / d) ** 2 * g

def mvoice(f0, F, copies, d, hmax=6000, roll=0.6):  # spegelröst: rösten upprepas i transponerade, fördröjda kopior
    y = np.zeros(int(d * SR))
    for r, dl, g in copies:
        v = nrm(voice(f0 * r, F, hmax, jitter=0.01, roll=roll)); place(y, dl, v * env(len(v), 0.01, 0.1), g)
    return y



# ---- nya byggstenar: papper, ånga, el, ugn och orgel ----
def flutter(d, r0=20, r1=None, lo=1200, hi=7000, g=1.0):  # fladdrande/bläddrande papper: korta prasslande brusknäpp (ljust
    # papper och en dov luftstöt) vars takt går från r0 till r1 per s
    y = np.zeros(int(d * SR)); tc = 0.0; r1 = r1 or r0
    while tc < d - 0.04:
        u = tc / d; dd = rng.uniform(0.015, 0.035); n = int(dd * SR); k = np.arange(n) / n
        c = nrm(fftfilt(noise(dd + 0.01), lo * rng.uniform(0.7, 1.3), hi * rng.uniform(0.8, 1.2))[:n]) * np.exp(-k * rng.uniform(3, 6))
        c += nrm(fftfilt(noise(dd + 0.01), 200, 900)[:n]) * np.exp(-k * 5) * 0.4
        place(y, tc, c * env(n, 0.001, 0.003), rng.uniform(0.4, 1.0) * g)
        tc += 1 / (r0 * (r1 / r0) ** u) * rng.uniform(0.75, 1.25)
    return y

def whisper(d, vowels=(AA, EH, OH), syl=5, g=1.0, sib=0.5):  # viskning: tonlös röst (brus genom formanter) som glider mellan
    # vokalerna, stavelser som pulserar och väsande s-ljud mellan dem
    t = tt(d); m = lpnoise(d, 3); y = np.zeros(len(t))
    for i, F in enumerate(vowels):
        c = i / max(1, len(vowels) - 1) * 2 - 1
        y += nrm(reson(noise(d), F)) * np.clip(1 - np.abs(m - c) * 1.2, 0, 1)
    a = (0.5 + 0.5 * np.sin(phase(syl * (1 + 0.3 * lpnoise(d, 2))))) ** 2
    s = nrm(fftfilt(noise(d), 4000, 10000)) * np.clip(lpnoise(d, 6), 0, 1) ** 2 * sib
    return (nrm(y) * a + s * (1 - a) * 0.7) * g

def steam(d, pts, lo=1200, hi=9000, g=1.0, rough=0.2):  # ångpys: brett brus (med lite fladder och en dovare kropp) som följer
    # amplitudkurvan pts = [(t, a)]
    t = tt(d); a = np.interp(t, [p[0] for p in pts], [p[1] for p in pts])
    y = nrm(fftfilt(noise(d), lo, hi)) * (1 + rough * lpnoise(d, 35)) + 0.35 * nrm(fftfilt(noise(d), lo * 0.3, lo))
    return y * a * g

def buzz(d, f, g=1.0, bright=4000):  # elektriskt surr: två svävande sågtänder (f tal eller kurva), bandbegränsade till bright
    t = tt(d); f = np.broadcast_to(np.asarray(f, float), t.shape)
    return nrm(sawp(phase(f), bright, f.max()) + 0.5 * sawp(phase(f * 1.01), bright, f.max() * 1.01)) * g

def jaw(g=1.0):  # käkar/pärmar som slår ihop: hårt träaktigt smack med en pappersklatsch
    d = 0.1; k = tt(d)
    y = nrm(reson(noise(d), [(rng.uniform(700, 950), 120, 1), (1900, 300, 0.6), (3500, 600, 0.3)])) * np.exp(-k * 70)
    y += nrm(fftfilt(noise(d), 2000, 8000)) * np.exp(-k * 150) * 0.5
    return y * env(len(k), 0.0003, 0.01) * g

def organ(notes, d, g=1.0, att=0.06, rel=0.25, stops=((0.5, 0.5), (1, 1), (2, 0.6), (3, 0.3), (4, 0.35), (6, 0.12), (8, 0.15)),
          chiff=0.15, hi=5000):  # piporgel: register som rena delton (16', 8', 4', 2 2/3', 2' ...), pipornas "chiff" i ansatsen
    # och en svag tremulant
    t = tt(d); y = np.zeros_like(t)
    for n in notes:
        f = m2f(n)
        for r, a in stops:
            if f * r < hi: y += a * np.sin(2 * np.pi * f * r * (1 + 0.0007 * (r % 3)) * t + rng.uniform(0, 6))
        if chiff:
            dc = min(d, 0.08); place(y, 0, nrm(fftfilt(noise(dc), f, min(f * 6, 10000))) * np.exp(-tt(dc) * 50) * chiff * 2)
    y *= 1 + 0.03 * np.sin(2 * np.pi * 5.5 * t)
    return y * env(len(t), att, rel) * g / len(notes)


# ---- nya byggstenar: sax, löv, sten, sand, sömn och speldosa ----
def snip(g=1.0, f=3400, slide=0.045):  # saxklipp: bladen glider mot varandra (ett stigande metalliskt fräs) och slår ihop (klick och ting)
    d = slide + 0.2; y = np.zeros(int(d * SR)); u = tt(slide) / slide
    place(y, 0, nrm(svf(noise(slide), 2500 + 4500 * u, 5.0)) * u ** 1.5, 0.5)
    place(y, slide, clack(f * 0.7, 1.0, 400, 0.04), 0.8)
    place(y, slide, ting(0.18, f, 0.35, 2.2))
    return y * g

def rustle(d, dens=None, lo=1500, hi=8000, n=None, g=1.0):  # lövprassel: täta, korta knaster vars täthet följer dens (på tt(d))
    n = n or int(d * 600); y = np.zeros(int(d * SR)); dens = np.ones(len(y)) if dens is None else dens
    for t0 in pick_times(dens, n):
        dd = rng.uniform(0.002, 0.012); c = noise(dd + 0.001)[:max(2, int(dd * SR))]
        place(y, min(t0, d - dd - 0.002), c * np.exp(-np.linspace(0, rng.uniform(3, 7), len(c))), rng.uniform(0.2, 1) ** 2)
    return nrm(fftfilt(y, lo, hi)) * g

def bird(f=3200, d=0.12, g=1.0, kind=0):  # fågelkvitter: ren visselton med snabb glidning (0: fallande "tsi", 1: stigande "vitt", 2: drill)
    t = tt(d); u = t / d
    if kind == 0: fr = f * (1.25 - 0.45 * u)
    elif kind == 1: fr = f * (0.8 + 0.4 * u ** 0.7)
    else: fr = f * (1 + 0.12 * np.sin(2 * np.pi * 28 * t))
    ph = phase(fr); return (np.sin(ph) + 0.12 * np.sin(2 * ph)) * np.sin(np.pi * u) ** 1.5 * g

def stonescrape(d, f=180, g=1.0, rate=(18, 30)):  # sten mot sten: grus som gnids (täta korn), en dov skrovlig resonans som hackar
    # (stick-slip) och ett lågt muller
    y = nrm(grains(d, int(d * 2500), 600, 5000, 0.006)) * 0.6
    y += nrm(bow_creak(d, rate[0], rate[1], ((f, 1, 40), (f * 2.3, 0.6, 60), (f * 4.1, 0.3, 90)))) * 0.5
    y += nrm(fftfilt(noise(d), 80, 600)) * (0.6 + 0.4 * lpnoise(d, 15)) * 0.5
    return y * g

def sandpour(d, g=1.0):  # rinnande sand: tät ström av små korn (ljust) och ett mjukt sus under
    y = nrm(grains(d, int(d * 6000), 2500, 10000, 0.002)) * (0.8 + 0.2 * lpnoise(d, 8))
    y += nrm(fftfilt(noise(d), 800, 4000)) * 0.35 * (0.7 + 0.3 * lpnoise(d, 4))
    return y * g

def glitter(d, n, lo=84, hi=100, g=1.0):  # glitter: små, höga klockspels- och glasplingar på slumpade toner i en pentatonisk skala
    y = np.zeros(int(d * SR)); sc = [m for m in range(lo, hi + 1) if m % 12 in (0, 2, 4, 7, 9)]
    for _ in range(n):
        m = sc[rng.integers(len(sc))]
        s = bar(m2f(m), 0.4, 1, dec=rng.uniform(5, 9)) if rng.uniform() < 0.6 else crys(m2f(m), 0.4, 1, rng.uniform(5, 9))
        place(y, rng.uniform(0, d * 0.85), s, rng.uniform(0.2, 1) ** 1.5)
    return y * g

def snore(d, f=28, lo=250, hi=900, g=1.0):  # snarkning: inandning där gomseglet fladdrar (brus genom låga resonanser,
    # amplitudmodulerat med f Hz) i en svällande andningsform
    t = tt(d); a = np.sin(np.pi * t / d) ** 1.2
    flap = (0.5 + 0.5 * np.sin(phase(f * (1 + 0.15 * lpnoise(d, 3))))) ** 3
    y = nrm(reson(noise(d), [(lo, 60, 1), ((lo + hi) / 2, 120, 0.6), (hi, 200, 0.35)])) * (0.25 + 0.75 * flap)
    return (y + nrm(fftfilt(noise(d), 1000, 4000)) * 0.12) * a * g

def fire(d, lo=120, hi=2200, flick=10, pops=30):  # eld: bandat brus som fladdrar + knaster (som i make4.sh)
    y = fftfilt(noise(d), lo, hi) * (0.65 + 0.35 * lpnoise(d, flick))
    y += fftfilt(noise(d), hi, hi * 3) * 0.15 * (0.5 + 0.5 * lpnoise(d, flick * 2))
    for _ in range(pops):
        n = rng.uniform(0.002, 0.008); c = noise(n) * np.exp(-tt(n) * rng.uniform(300, 900))
        place(y, rng.uniform(0, d - 0.01), c, rng.uniform(0.2, 1) ** 2 * 3)
    return y

def mbox(n, d=2.5, g=1.0):  # ostämd speldosa: två lätt isärdragna klockspel som svävar (som i make5.sh)
    return (bar(m2f(n) * 1.004, d, 1.0, dec=1.6) + bar(m2f(n) * 0.997, d, 0.6, dec=1.8)) * g

def wbox(n, d=2.0, g=1.0, det=0.004, wob=0.0):  # speldosan som blir mardröm: två isärdragna klockspel; det = ostämning,
    # wob = vinglande tonhöjd (som ett utslitet urverk)
    f = m2f(n); t = tt(d); y = np.zeros_like(t); w = 1 + wob * np.sin(2 * np.pi * 4.5 * t + rng.uniform(0, 6))
    for r, a, dd in ((1, 1, 1), (2.756, 0.35, 2.2), (5.404, 0.18, 4), (8.933, 0.08, 6)):
        for m, ga, dec in ((1 + det, 1.0, 1.6), (1 - det * 0.75, 0.6, 1.8)):
            if f * r * m * (1 + wob) < SR * 0.45: y += ga * a * np.exp(-t * dec * dd) * np.sin(phase(f * r * m * w) + rng.uniform(0, 6))
    return y * env(len(t), 0.002, 0.05) * g

def pizz(n, d=0.6, g=1.0, bright=1.3):  # pizzicato: knäppt stråksträng, kort och träig
    y = pluck(n, d, bright, 1.0) * np.exp(-tt(d) * 5)
    return nrm(fftfilt(y, 60, 3500)) * env(len(y), 0.002, 0.05) * g

def gulp(g=1.0):  # klunk: en kort ton som stiger i strupen och en liten bubbla
    k = tt(0.12); y = np.sin(phase(220 * (1 + 1.5 * k / 0.12))) * np.sin(np.pi * k / 0.12) ** 2
    place(y, 0.02, bubble(700, 0.06, 1, 1.0), 0.5); return y * g

def laugh(steps, F, Flast, gl=0.9, gle=0.7, rough=0.5, rasp=0.5, drive=2.0, rel=0.45, dec=9):  # skratt i stötar [(f0, längd)] (sista
    # stöten utdragen): grov röst och brus genom formanterna, varje stöt faller i tonhöjd
    y = np.zeros(int((sum(dd + 0.06 for _, dd in steps) + 0.3) * SR)); t0 = 0.0
    for i, (f, dd) in enumerate(steps):
        last = i == len(steps) - 1; dl = dd + 0.15; k = tt(dl); Fi = Flast if last else F
        f0 = np.interp(k, [0, dd], [f * 1.08, f * (gle if last else gl)])
        v = growl(dl, f0, Fi, rough, rasp, 5000, drive) * 0.6 + nrm(reson(noise(dl), Fi)) * 0.5
        e = np.clip(k / 0.015, 0, 1) * (np.clip((dd + 0.1 - k) / rel, 0, 1) if last else np.exp(-k * dec) * np.clip((dd + 0.05 - k) / 0.05, 0, 1))
        place(y, t0, v * e); t0 += dd + 0.06
    return y


# ---- nya byggstenar: hav, skepp, dragspel, röster och alkemi ----
def accordion(notes, d, g=1.0, att=0.025, rel=0.08, det=0.0035, hi=4500, swell=0.0, rate=0.7):  # dragspel: tre tungor per ton
    # (musette: en ren, en lite hög och en lite låg, så att tonen svävar), tungans skarpa klang (sågtand plus udda delton) genom
    # diskantlådans resonanser och bälgen som andas (swell)
    t = tt(d); y = np.zeros_like(t)
    for n in notes:
        f = m2f(n)
        for dt in (-det, 0.0, det * 1.1):
            ph = 2 * np.pi * f * (1 + dt) * t + rng.uniform(0, 6)
            y += sawp(ph, hi, f)
            for k in (1, 3, 5):
                if k * f < hi: y += 0.5 * np.sin(k * ph) / k
    y = reson(y, [(1000, 450, 1.0), (2300, 650, 0.6), (3500, 900, 0.25)]) + 0.35 * fftfilt(y, 60, 600)
    y = nrm(y) * (1 + swell * np.sin(2 * np.pi * rate * t + rng.uniform(0, 6)))
    return y * env(len(t), att, rel) * g

def seawave(d, pk=0.4, g=1.0, foam=0.6):  # havsvåg: ett dovt sus som sväller mörkt när vågen reser sig och ljusnar när den bryts,
    # skummet som fräser och vattnet som pärlar och rinner undan
    t = tt(d); a = np.interp(t, [0, d * pk, d], [0, 1, 0]) ** 1.6
    y = nrm(fftfilt(noise(d), 40, 350)) * a * 0.8 + nrm(fftfilt(noise(d), 200, 2500)) * a ** 2 * 0.5
    fo = np.interp(t, [0, d * pk * 0.85, d * pk * 1.15, d], [0, 0, 1, 0]) ** 1.3
    y += nrm(fftfilt(noise(d), 2500, 9000)) * fo * (0.7 + 0.3 * lpnoise(d, 18)) * foam
    y += bubbles(d, int(d * 25), 700, 2400, 1.0, np.interp(t, [0, d * pk, d * 0.9, d], [0, 0.2, 1, 0.1])) * 0.2
    return y * g

def gurgle(d, f0, F, rate=14):  # gurgel: en röst som drunknar – vattenbubblor i strupen hackar sönder den i stötar, och bubblor
    # som stiger och spricker
    v = growl(d, f0, F, 0.5, 0.4, 4000, 1.8); gate = np.zeros(int(d * SR)); tc = 0.0
    while tc < d:
        dd = rng.uniform(0.03, 0.09); place(gate, tc, np.sin(np.pi * tt(dd) / dd) ** 2, rng.uniform(0.5, 1)); tc += 1 / (rate * rng.uniform(0.7, 1.4))
    return v * (0.25 + 0.75 * np.clip(gate, 0, 1)) + bubbles(d, int(d * 30), 250, 900, 1.0) * 0.5

def squawk(d, f=1100, g=1.0):  # papegojskri: hård, nasal röst vars tonhöjd hackar och bryts, med ett kraftigt skrovligt brus
    t = tt(d); f0 = f * np.interp(t, [0, d * 0.15, d * 0.6, d], [0.8, 1.15, 1.0, 0.7]) * (1 + 0.08 * lpnoise(d, 40))
    F = [(1700, 300, 1), (2900, 400, 0.8), (4200, 600, 0.4)]
    v = nrm(voice(f0, F, 9000, jitter=0.03, roll=0.4)) * (0.6 + 0.4 * np.sign(np.sin(phase(f0 / 2))))
    return np.tanh(3 * (v + 0.35 * nrm(reson(noise(d), F)))) * env(len(t), 0.008, d * 0.35) * g

def giggle(steps, F, g=1.0, shift=1.35, br=0.5):  # fnitter: korta, höga och luftiga stötar [(f0, längd)] ur en liten strupe
    # (formanterna förskjutna uppåt med shift), den sista utdragen och fallande
    Fs = [(fc * shift, bw * shift, a) for fc, bw, a in F]
    y = np.zeros(int((sum(dd + 0.05 for _, dd in steps) + 0.3) * SR)); t0 = 0.0
    for i, (f, dd) in enumerate(steps):
        last = i == len(steps) - 1; dl = dd + 0.12; k = tt(dl)
        f0 = np.interp(k, [0, dd], [f * 1.06, f * (0.78 if last else 0.94)])
        v = nrm(voice(f0, Fs, 9000, jitter=0.01, roll=0.8)) * 0.6 + nrm(reson(noise(dl), Fs)) * br
        e = np.clip(k / 0.008, 0, 1) * (np.clip((dd + 0.08 - k) / 0.25, 0, 1) if last else np.exp(-k * 16) * np.clip((dd + 0.03 - k) / 0.03, 0, 1))
        place(y, t0, v * e, g); t0 += dd + 0.035
    return y

def mumble(d, f0=150, syl=6.0, vowels=(AA, EH, OH, EE, MM), g=1.0):  # mummel: en tonande röst som glider mellan vokalerna, en
    # stavelse i taget (formanterna följer en kurva genom vokalerna), låg och lite nasal – en trollformel som mumlas
    t = tt(d); ns = int(d * syl) + 2; seq = [vowels[rng.integers(len(vowels))] for _ in range(ns)]; ts = np.arange(ns) / syl
    F = [tuple(np.interp(t, ts, [v[j][m] for v in seq]) for m in range(3)) for j in range(3)]
    f0 = np.broadcast_to(np.asarray(f0, float), t.shape) * (1 + 0.06 * lpnoise(d, 3))
    a = (0.35 + 0.65 * (0.5 + 0.5 * np.sin(phase(syl * (1 + 0.25 * lpnoise(d, 2)))))) ** 1.5
    y = nrm(voice(f0, F, 5000, jitter=0.01, roll=0.8)) + nrm(fftfilt(noise(d), 1500, 7000)) * 0.04
    return y * a * g

def metalglide(d, f0, f1, g=1.0, wob=0.03):  # metalliskt glid: oharmoniska metalldelton (som en svajande plåt eller skål) vars
    # tonhöjd glider från f0 till f1, och ett ljust, skrapande fräs som följer med
    t = tt(d); f = f0 * (f1 / f0) ** (t / d) * (1 + wob * np.sin(2 * np.pi * 3.3 * t) + 0.5 * wob * lpnoise(d, 8)); y = np.zeros(len(t))
    for r, a in ((1, 1), (2.32, 0.6), (3.87, 0.45), (5.6, 0.3), (7.1, 0.15)):
        if f.max() * r < SR * 0.45: y += a * np.sin(phase(f * r) + rng.uniform(0, 6))
    y = nrm(y) * (0.7 + 0.3 * lpnoise(d, 12)) + nrm(svf(noise(d), f * 2.8, 6.0)) * 0.25
    return nrm(y) * g

def fizz(d, n=None, g=1.0, lo=2500, hi=10000):  # fräsande syra: väsande brus och täta, pyttesmå bubblor som spricker
    n = n or int(d * 900)
    y = nrm(fftfilt(noise(d), lo, hi)) * (0.75 + 0.25 * lpnoise(d, 40)) * 0.6
    return (y + nrm(bubbles(d, n, 2500, 6000, 1.0)) * 0.5) * g

def zap(d=0.6, f=110, g=1.0):  # elektrisk urladdning: blixtknall, en knastrande skur och ett gällt, hackigt surr som dör ut
    t = tt(d); y = np.zeros(len(t)); place(y, 0, bolt(min(d, 0.5)), 0.9)
    y += buzz(d, f * (1 + 0.1 * lpnoise(d, 20)), 1.0, 7000) * np.exp(-t * 5) * (0.5 + 0.5 * (lpnoise(d, 60) > -0.2)) * 0.5
    y += crackle(d, 300, 2000, 10000, 1.5) * 0.6
    return y * env(len(t), 0.001, 0.08) * g

def bleat(d, f, F, g=1.0):  # bräkande get: röst med kraftigt, snabbt vibrato i både tonhöjd och styrka ("mä-ä-ä-ä")
    t = tt(d); f0 = f * np.interp(t, [0, d * 0.2, d], [0.9, 1.05, 0.85]) * (1 + 0.06 * np.sin(2 * np.pi * 7.5 * t))
    v = nrm(voice(f0, F, 7000, jitter=0.01, roll=0.6)) * (0.55 + 0.45 * np.sin(2 * np.pi * 7.5 * t))
    return np.tanh(1.8 * v) * env(len(t), 0.02, d * 0.35) * g

def slurp(d=0.6, f0=300, f1=1800, g=1.0):  # sugande slurp: blött brus vars resonans glider (som en sugkopp som släpper) och små
    # bubbelklick
    t = tt(d); a = np.sin(np.pi * t / d) ** 1.2
    return (nrm(svf(noise(d), f0 * (f1 / f0) ** (t / d), 5.0)) + bubbles(d, int(d * 40), 600, 2000, 1.0) * 0.4) * a * g

def cork(g=1.0):  # kork som dras ur: ett ihåligt "plopp"
    d = 0.12; k = tt(d); y = np.sin(phase(np.interp(k, [0, d], [450, 900]))) * np.exp(-k * 40) * env(len(k), 0.002, 0.02)
    place(y, 0, crack(0.02, 0.5, 2000)); return y * g

def fuse(d, g=1.0):  # tändstubin: sprakande, fräsande gnistor vars styrka fladdrar
    y = nrm(fftfilt(noise(d), 2500, 9000)) * (0.6 + 0.4 * lpnoise(d, 25)) * 0.4
    sparks(y, d, int(d * 220), 1.0, 1.2)
    return (fftfilt(y, 1500, 11000) + crackle(d, int(d * 300), 3000, 10000) * 0.5) * g

def whistle_in(d, f0=1600, f1=600, g=1.0):  # inkommande projektil: en visslande ton som faller och växer
    t = tt(d); return np.sin(phase(f0 * (f1 / f0) ** (t / d))) * (t / d) ** 1.5 * env(len(t), 0.01, 0.01) * g

def ghostsus(d, f=600, g=1.0):  # spöklikt sus: ett ihåligt, vinande brusband som svajar
    t = tt(d); return nrm(svf(noise(d), f * (1 + 0.4 * lpnoise(d, 1.5)), 2.0)) * np.interp(t, [0, d * 0.2, d * 0.7, d], [0, 1, 0.6, 0]) * g

# ================= effekter =================
# ---- fiender: Spökskeppet ----
def ghostpirate():  # spökpiraten: ett ihåligt, ekande "ha-har-haar" som studsar mellan skrovets plankor och ett kallt, spöklikt sus
    d = 2.0; y = np.zeros(int(d * SR))
    l = fftfilt(laugh([(150, 0.12), (142, 0.12), (138, 0.12), (165, 0.45)], AA, AA, 0.88, 0.7, 0.5, 0.35, 2.0, 0.35, 12), 250, 3500)
    place(y, 0.05, l, 0.9)
    for k, (dl, gg) in enumerate(((0.3, 0.3), (0.6, 0.15))): place(y, 0.05 + dl, fftfilt(l, 300 + 100 * k, 2500 - 400 * k), gg)
    y += ghostsus(d, 600, 0.08)
    return cut(verb(y, 1.4, 0.3, 5000), d, 0.4)

def gunner():  # kanonjären: ett grovt grymtande, en tändsticka som rivs och tändstubinen som fräser och sprakar
    d = 1.6; y = np.zeros(int(d * SR)); dg = 0.3; tg = tt(dg)
    place(y, 0, growl(dg, np.interp(tg, [0, dg], [105, 85]), OH, 0.6, 0.4, 4000, 2.0) * env(len(tg), 0.02, 0.15), 0.45)
    place(y, 0.32, swish(0.1, 2500, 7000, 3.0), 0.5); place(y, 0.36, crack(0.05, 0.5, 2500)); place(y, 0.38, puff(0.25, 400, 3000, 1.0, 0.1), 0.3)
    df = d - 0.45; place(y, 0.45, fuse(df) * np.interp(tt(df), [0, 0.1, df - 0.3, df], [0, 1, 1, 0]), 0.8)
    return cut(verb(y, 0.4, 0.12, 7000), d, 0.25)

def drownedsailor():  # den drunknade matrosen: ett lågt, gurglande stön där vattnet bubblar i strupen, och vatten som droppar ur munnen
    d = 1.9; t = tt(d); y = np.zeros(len(t))
    f0 = np.interp(t, [0, 0.4, 1.2, d], [80, 92, 78, 62])
    F = [(np.interp(t, [0, 0.8, d], [450, 600, 380]), 90, 1), (900, 120, 0.5), (2400, 220, 0.1)]
    y += gurgle(d, f0, F) * np.interp(t, [0, 0.15, 1.3, d], [0, 1, 0.8, 0]) * 0.7
    for t0 in (1.35, 1.55, 1.72): place(y, t0, bubble(rng.uniform(500, 900), 0.06, 1, 1.2), 0.3)
    return cut(verb(fftfilt(y, 40, 6000), 0.6, 0.2, 4000), d, 0.35)

def ghostparrot():  # papegojspöket: ett skarpt, skrovligt skri ("raa-ak!") och ett kortare, vingslag och ett spöklikt eko
    d = 1.3; y = np.zeros(int(d * SR))
    place(y, 0, wing(0.18), 0.35); place(y, 0.12, wing(0.18), 0.3)
    place(y, 0.05, squawk(0.38, 1150), 0.8); place(y, 0.5, squawk(0.18, 1350), 0.55)
    e = y.copy(); place(y, 0.18, fftfilt(e, 600, 4000), 0.3); place(y, 0.36, fftfilt(e, 800, 3000), 0.15)
    return cut(verb(fftfilt(y, 150, 7500), 0.9, 0.3, 6000), d, 0.3)

def tentacle():  # tentakeln: ett blött, sugande slurp när sugkopparna släpper, ett tungt svisch när den slår och ett slemmigt smack
    d = 1.3; y = np.zeros(int(d * SR))
    place(y, 0, slurp(0.55, 250, 1600), 0.6)
    place(y, 0.45, swish(0.3, 300, 1200, 2.0), 0.5); place(y, 0.45, nrm(fftfilt(noise(0.3), 60, 300)) * np.sin(np.pi * tt(0.3) / 0.3) ** 2, 0.35)
    place(y, 0.72, splat(0.35), 0.8); place(y, 0.72, thud(70, 0.3, 0.0), 0.4)
    place(y, 0.85, slurp(0.35, 1400, 500), 0.3)
    return cut(verb(y, 0.6, 0.2, 5000), d, 0.3)

def rat():  # skeppsråttorna: snabba, gälla pip från flera råttor och små klor som krafsar mot plankorna
    d = 0.9; y = np.zeros(int(d * SR))
    for _ in range(30): place(y, rng.uniform(0, d - 0.05), tick(0.012, rng.uniform(0.2, 0.6), 2500, 8000, 400))
    for t0, f, dd in ((0.0, 4200, 0.09), (0.12, 4800, 0.07), (0.3, 3900, 0.12), (0.47, 5200, 0.06), (0.6, 4500, 0.1)):
        place(y, t0, squeal(dd, f, f * 1.15), rng.uniform(0.5, 0.9))
    return cut(verb(y, 0.3, 0.12, 9000), d, 0.2)

# ---- fiender: Laboratoriet ----
def homunculus():  # homunkulusen: ett litet, gällt och elakt fnitter ("hi-hi-hi-hiii") ur en pytteliten strupe och små tassande steg
    d = 1.3; y = np.zeros(int(d * SR))
    place(y, 0.02, giggle([(560, 0.07), (600, 0.07), (640, 0.07), (600, 0.07), (700, 0.3)], EE, 1.0, 1.4, 0.45))
    for t0 in (0.05, 0.2, 0.38, 0.55): place(y, t0, tick(0.02, 0.15, 800, 3000, 200))
    return cut(verb(y, 0.5, 0.15, 7000), d, 0.3)

def ooze():  # slemmet: tunga, låga bubblor som spricker ("blubb ... blubb-blubb"), ett segt, slafsande glid och ett svagt surt fräs
    d = 1.4; t = tt(d); y = np.zeros(len(t))
    for t0, f, dd in ((0.05, 180, 0.16), (0.42, 230, 0.13), (0.6, 160, 0.18), (1.0, 210, 0.14)):
        place(y, t0, bubble(f, dd, 1, 0.9), 0.9); place(y, t0 + dd * 0.7, splat(0.12), 0.15)
    y += nrm(svf(noise(d), 250 + 150 * lpnoise(d, 3), 3.0)) * 0.12 * env(len(t), 0.2, 0.4)
    y += nrm(reson(noise(d), [(300, 60, 1), (650, 100, 0.5)])) * np.clip(lpnoise(d, 6), 0, 1) * 0.25
    y += fizz(d, 150) * 0.05
    return cut(verb(y, 0.5, 0.15, 4000), d, 0.3)

def apprentice():  # lärlingen: ett nervöst, hastigt mumlande av en trollformel som stiger mot slutet, och flaskor som klirrar i väskan
    d = 1.8; y = np.zeros(int(d * SR)); dm = 1.4
    m = mumble(dm, np.interp(tt(dm), [0, 1.0, dm], [150, 145, 185]), 7.0)
    place(y, 0, m * env(len(m), 0.05, 0.2), 0.7)
    for t0 in (1.35, 1.45, 1.6): place(y, t0, crys(rng.uniform(2500, 4000), 0.3, 1, 5.0, 0.004), 0.25)
    return cut(verb(y, 0.5, 0.15, 6000), d, 0.3)

def mercurygolem():  # kvicksilvergolemen: ett tungt, metalliskt glid som svajar (flytande metall som rör sig), ett skvalpande och ett
    # lågt, ihåligt dunk
    d = 1.6; t = tt(d); y = np.zeros(len(t)); a = np.interp(t, [0, 0.15, 1.1, d], [0, 1, 0.8, 0])
    y += metalglide(d, 420, 300, 1.0, 0.04) * a * 0.5 + metalglide(d, 630, 520, 1.0, 0.05) * a * 0.25
    y += bubbles(d, 30, 150, 500, 1.0) * a * 0.5
    place(y, 0, anvil(500, 0.6, 1.0), 0.3); place(y, 0, thud(60, 0.4, 0.0), 0.5)
    return cut(verb(y, 0.8, 0.25, 5000), d, 0.35)

def vialwisp():  # flaskgasten: en svävande flaska som klirrar och skramlar (glaset mot proppen), vätska som skvalpar och ett spöklikt,
    # stigande vin
    d = 1.4; t = tt(d); y = np.zeros(len(t))
    for _ in range(9): place(y, rng.uniform(0, 1.0), crys(rng.uniform(2200, 3600), 0.25, 1, rng.uniform(5, 9), 0.004), rng.uniform(0.2, 0.55))
    y += bubbles(d, 18, 600, 1600, 1.0) * 0.35 * env(len(t), 0.1, 0.4)
    dw = 1.2; tw = tt(dw); f = np.interp(tw, [0, dw], [900, 1400]) * (1 + 0.01 * np.sin(2 * np.pi * 6 * tw))
    place(y, 0.1, (np.sin(phase(f)) + 0.4 * np.sin(phase(f * 1.006))) * np.interp(tw, [0, 0.3, dw], [0, 1, 0]) ** 1.5, 0.12)
    return cut(verb(y, 0.8, 0.25, 8000), d, 0.3)

def chimera():  # kimären: ett tredelat vrål – lejonhuvudets djupa, skrovliga vrål, getens gälla bräkande och ormens väsande –
    # som växer in i varandra
    d = 2.1; y = np.zeros(int(d * SR)); dl = 1.0; tl = tt(dl)
    F = [(np.interp(tl, [0, 0.3, dl], [500, 750, 450]), 110, 1), (1150, 150, 0.6), (2500, 220, 0.2)]
    place(y, 0, growl(dl, np.interp(tl, [0, 0.25, dl], [85, 105, 70]), F, 0.7, 0.5, 4000, 2.6) * env(len(tl), 0.05, 0.35), 0.75)
    place(y, 0.55, bleat(0.65, 330, EH), 0.45)
    dh = 0.9; th = tt(dh)
    place(y, 1.1, nrm(fftfilt(noise(dh), 3500, 10000)) * np.interp(th, [0, 0.15, dh], [0, 1, 0]) ** 1.2 * (1 + 0.3 * np.sin(2 * np.pi * 11 * th)), 0.5)
    return cut(verb(y, 0.9, 0.25, 5000), d, 0.35)

# ---- bossar ----
def captain_laugh():  # spökkaptenen skrattar: ett djupt, mäktigt "har-har-har-HAAAR" som ekar över havet, kedjor som skramlar och ett
    # kallt, spöklikt sus
    d = 3.0; t = tt(d); y = np.zeros(len(t))
    place(y, 0, laugh([(95, 0.18), (90, 0.18), (88, 0.18), (100, 0.75)], AA, AA, 0.9, 0.65, 0.65, 0.55, 2.4))
    e0 = fftfilt(y, 200, 3000); place(y, 0.35, e0, 0.35); place(y, 0.7, e0, 0.15)
    y += chain(d, 18, np.interp(t, [0, 0.5, 1.5, d], [0, 1, 0.3, 0]), (1800, 4500)) * 0.12
    y += ghostsus(d, 500, 0.12)
    return cut(verb(y, 1.8, 0.4, 4500), d, 0.5)

def captain_shout():  # spökkaptenen ryter: ett kraftigt "AAARRR!" som stiger och faller och rullar på r:en, med ett ihåligt eko och en
    # sabel som dras
    d = 1.6; y = np.zeros(int(d * SR)); ds = 0.8; ts = tt(ds)
    f0 = np.interp(ts, [0, 0.15, 0.5, ds], [110, 150, 140, 95])
    F = [(np.interp(ts, [0, 0.2, ds], [650, 800, 600]), 120, 1), (1250, 160, 0.7), (2700, 240, 0.3)]
    s = growl(ds, f0, F, 0.6, 0.6, 5000, 2.8) * env(len(ts), 0.03, 0.3) * (1 - 0.5 * (ts > 0.45) * (0.5 + 0.5 * np.sin(2 * np.pi * 28 * ts)))
    place(y, 0, s, 0.85); e = fftfilt(s, 300, 3000); place(y, 0.25, e, 0.3); place(y, 0.5, e, 0.12)
    place(y, 0.85, swish(0.25, 2000, 6000, 3.0), 0.25); place(y, 1.0, ting(0.5, 3000, 0.35, 1.0))
    return cut(verb(y, 1.2, 0.35, 5000), d, 0.4)

def alchemist_laugh():  # alkemisten skrattar: ett nasalt, galet kacklande "he-he-he-he-HEHEHE" som stiger, och kolvar som bubblar
    d = 2.4; y = np.zeros(int(d * SR))
    NAS = [(500, 80, 1.0), (1700, 150, 0.6), (2600, 200, 0.35), (3400, 300, 0.2)]  # nasalt "e"
    steps = [(210, 0.1), (220, 0.1), (230, 0.1), (240, 0.1), (280, 0.08), (300, 0.08), (320, 0.08), (300, 0.4)]
    place(y, 0.05, laugh(steps, NAS, EH, 0.92, 0.8, 0.35, 0.35, 1.6, 0.35, 12))
    e0 = y.copy(); place(y, 0.2, e0, 0.2); place(y, 0, bubbles(d, 40, 300, 1200, 1.0), 0.2)
    return cut(verb(y, 1.0, 0.3, 6000), d, 0.4)

def alchemist_drink():  # alkemisten dricker: korken som ploppar, tre stora klunkar, ett belåtet "aah" och förvandlingen – ett
    # svällande sus som glider uppåt och en glasklang
    d = 2.2; y = np.zeros(int(d * SR)); place(y, 0, cork(), 0.6)
    for t0 in (0.2, 0.42, 0.64): place(y, t0, gulp(), 0.55); place(y, t0 + 0.02, bubbles(0.15, 4, 400, 900), 0.2)
    da = 0.5; ta = tt(da)
    place(y, 0.88, (nrm(voice(np.interp(ta, [0, da], [190, 150]), AA, 5000, 0.01, 0.9)) * 0.4 + nrm(reson(noise(da), AA)) * 0.6) * env(len(ta), 0.05, 0.3), 0.35)
    dt_ = 0.9; t_ = tt(dt_); place(y, 1.25, nrm(svf(noise(dt_), 300 * 10 ** (t_ / dt_), 3.0)) * np.sin(np.pi * t_ / dt_) ** 1.5, 0.4)
    for i, n in enumerate((76, 80, 83, 88)): place(y, 1.35 + 0.08 * i, crys(m2f(n), 0.6, 0.25, 3.0))
    return cut(verb(y, 0.8, 0.25, 7000), d, 0.35)

# ---- skeppet: kanoner, plankor, vågor ----
def cannon_fire():  # kanonen avfyras: en våldsam smäll, ett tungt muller som rullar ut över havet med eko, och lavetten som knakar
    d = 2.4; t = tt(d); y = np.zeros(len(t))
    place(y, 0, crack(0.2, 1.0, 600)); place(y, 0, thud(38, 1.6, 0.2), 1.0)
    y += nrm(fftfilt(noise(d), 30, 250)) * np.interp(t, [0, 0.02, 0.5, d], [0, 1, 0.4, 0]) ** 1.5 * 0.7
    y += nrm(fftfilt(noise(d), 300, 3000)) * np.exp(-t * 7) * 0.5
    e = y[:int(0.8 * SR)].copy(); place(y, 0.45, fftfilt(e, 40, 900), 0.3); place(y, 0.9, fftfilt(e, 40, 600), 0.15)
    place(y, 0.12, creak(0.3, 30, 60, 280), 0.2); place(y, 0.1, debris(0.6, 10, 600, 3000, 0.3), 0.2)
    y = np.tanh(2.5 * nrm(fftfilt(y, 20, 9000)))  # mjuk mättning: smällen tar inte all plats från dånet
    return cut(verb(y, 1.5, 0.3, 3500), d, 0.5)

def cannonball_land():  # kanonkulan landar: ett fallande, visslande vin, en tung krasch i plankorna och splitter som yr
    d = 1.6; y = np.zeros(int(d * SR)); c = 0.5
    place(y, 0, whistle_in(c + 0.02), 0.2)
    place(y, c, thud(45, 0.9, 0.6), 1.0); place(y, c, crack(0.12, 0.8, 900)); place(y, c, debris(0.9, 40, 500, 3500, 0.5), 0.6)
    for t0 in (c + 0.02, c + 0.06): place(y, t0, twig(), 0.4)
    return cut(verb(np.tanh(2 * nrm(y)), 0.9, 0.25, 5000), d, 0.4)

def plank_break():  # ruttna plankor brakar: ett knarr när plankan böjer sig, en torr, splittrande spricka, flisor som faller och en duns
    d = 1.5; y = np.zeros(int(d * SR)); c = 0.4
    place(y, 0, creak(c + 0.05, 10, 35, 260), 0.5); place(y, c, crack(0.1, 1.0, 700))
    for t0 in (c, c + 0.03, c + 0.08, c + 0.15): place(y, t0, twig(), rng.uniform(0.5, 0.9))
    place(y, c, nrm(reson(noise(0.3), [(220, 60, 1), (480, 90, 0.6), (900, 150, 0.4)])) * np.exp(-tt(0.3) * 14), 0.6)
    place(y, c + 0.05, debris(0.8, 30, 400, 3000, 0.4), 0.5); place(y, c + 0.6, thud(60, 0.4, 0.3), 0.35)
    return cut(verb(np.tanh(2 * nrm(y)), 0.7, 0.2, 5000), d, 0.35)

def wave_wash():  # en våg sköljer över däck: havet som reser sig, brottet som slår över relingen med ett plask och vattnet som forsar
    # och rinner undan
    d = 2.6; t = tt(d); y = seawave(d, 0.35, 1.0, 0.8)
    place(y, 0.85, splat(0.3), 0.3); place(y, 0.9, nrm(fftfilt(noise(0.6), 800, 7000)) * np.exp(-tt(0.6) * 6), 0.4)
    y += bubbles(d, 60, 500, 2000, 1.0, np.interp(t, [0, 1.0, 1.5, d], [0, 0, 1, 0.2])) * 0.25
    return cut(verb(y, 0.8, 0.2, 6000), d, 0.4)

def ship_creak(d=3.8):  # skeppet knarrar (slinga 3 s): skrovet som långsamt knarrar och stönar i sjögången och vatten som kluckar mot
    # skrovet (knarren ligger mitt i slingan, långt från skarven och överlappningen)
    y = nrm(fftfilt(noise(d), 60, 500)) * (0.6 + 0.4 * lpnoise(d, 0.8)) * 0.25 + bubbles(d, 50, 250, 800, 1.0) * 0.25
    place(y, 0.95, creak(0.85, 5, 12, 230) * env(int(0.85 * SR), 0.2, 0.3), 0.7)
    place(y, 2.0, creak(0.7, 8, 16, 330) * env(int(0.7 * SR), 0.15, 0.25), 0.5)
    return verb(y, 0.8, 0.2, 5000, tail=False)

# ---- laboratoriet: kolvar, teslaspolar, syra, transmutation ----
def lab_bubble(d=3.8):  # kolvar som bubblar (slinga 3 s): ett jämnt puttrande av bubblor i olika storlekar, ett mjukt kokande sus och
    # små glasklick när bubblorna slår i kolven
    y = bubbles(d, int(d * 45), 350, 1400, 1.0) * 0.8 + bubbles(d, int(d * 12), 180, 400, 1.0) * 0.6
    y += nrm(fftfilt(noise(d), 300, 2500)) * (0.7 + 0.3 * lpnoise(d, 4)) * 0.08
    for _ in range(int(d * 3)): place(y, rng.uniform(0, d - 0.1), crys(rng.uniform(3000, 4500), 0.08, 1, 20, 0.003), 0.05)
    return verb(y, 0.4, 0.15, 6000, tail=False)

def tesla_zap():  # teslaspolen slår: ett laddande, stigande surr, en skarp blixtknall med knastrande urladdning och ett surr som dör ut
    d = 1.0; y = np.zeros(int(d * SR)); c = 0.18; tc = tt(c)
    place(y, 0, buzz(c, 90 * 2 ** (tc / c * 1.5), 1.0, 5000) * (tc / c) ** 2, 0.25); place(y, c, zap(d - c, 120))
    return cut(verb(y, 0.6, 0.2, 9000), d, 0.3)

def acid_hiss():  # syrakaret fräter: ett fräsande väs, täta pyttesmå bubblor som spricker och ett surt pys av ånga
    d = 1.4; t = tt(d); a = np.interp(t, [0, 0.05, 0.6, d], [0, 1, 0.6, 0])
    y = fizz(d, 1100) * a + steam(d, [(0, 0), (0.08, 1), (0.5, 0.4), (d, 0)], 1500, 7000, 1.0, 0.3) * 0.25
    return cut(verb(y, 0.4, 0.12, 8000), d, 0.3)

def flask_break():  # en flaska krossas: glaset brister och skärvorna klirrar, vätskan plaskar ut och börjar fräsa
    d = 1.2; y = np.zeros(int(d * SR))
    place(y, 0, shatter(1.0, 40, 1.0, 0.5, 2500, 8000), 0.9); place(y, 0.01, splat(0.3), 0.5); place(y, 0.02, bubbles(0.4, 12, 500, 1500), 0.3)
    place(y, 0.15, fizz(1.0, 500) * np.interp(tt(1.0), [0, 0.1, 1.0], [0, 1, 0]), 0.25)
    return cut(verb(y, 0.6, 0.2, 8000), d, 0.3)

def transmute():  # transmutationen: ett virvlande sus som stiger, en gyllene ackordklang (klockspel och glas), en metallisk klang när
    # materien blir till guld och glitter
    d = 1.7; y = np.zeros(int(d * SR)); place(y, 0, swish(0.7, 400, 4000, 2.5), 0.35)
    for i, n in enumerate((72, 76, 79, 84, 88)): place(y, 0.1 + 0.08 * i, bar(m2f(n), 1.2, 0.2, dec=2.5)); place(y, 0.1 + 0.08 * i, crys(m2f(n + 12), 1.0, 0.1, 2.5))
    place(y, 0.5, ting(1.0, 2200, 0.6, 0.6)); place(y, 0.5, anvil(1500, 1.0, 0.25)); place(y, 0.4, glitter(1.2, 20, 88, 103), 0.25)
    return cut(verb(y, 1.2, 0.35, 9000), d, 0.4)

def alembic_brew():  # alembiken brygger: vätska som bubblar och kokar upp, ånga som pyser i kolvens hals, droppar som rinner ned och en
    # klar glasklang när drycken är färdig
    d = 2.0; t = tt(d); y = np.zeros(len(t))
    y += bubbles(d, 90, 300, 1300, 1.0, np.interp(t, [0, 0.4, 1.2, 1.5, d], [0.2, 1, 1, 0.3, 0.01])) * 0.6
    y += steam(d, [(0, 0), (0.5, 0), (0.7, 1), (1.1, 0.6), (1.4, 0), (d, 0)], 1500, 8000, 1.0, 0.25) * 0.3
    for t0 in (1.1, 1.28, 1.42): place(y, t0, bubble(rng.uniform(1300, 1800), 0.05, 1, 1.5), 0.35)
    place(y, 1.55, crys(2600, 0.6, 0.5, 3.0)); place(y, 1.6, ping(m2f(88), 0.4, 0.25, 5))
    return cut(verb(y, 0.7, 0.22, 8000), d, 0.35)

# ---- vapen: kedjekulekanonen och syrasprutan ----
def chain_fire():  # kedjekulekanonen: en dov, kraftig smäll, kedjan som rasslar ut och kulan som snurrar iväg med ett vinande "vupp-vupp"
    d = 1.1; y = np.zeros(int(d * SR))
    place(y, 0, crack(0.12, 1.0, 700)); place(y, 0, thud(55, 0.6, 0.2), 0.9); place(y, 0.02, chain(0.35, 14, None, (2000, 5000)), 0.35)
    ds = 0.9; ts = tt(ds); spin = 0.2 + 0.8 * (0.5 + 0.5 * np.sin(phase(np.interp(ts, [0, ds], [9, 13])))) ** 2
    place(y, 0.08, nrm(svf(noise(ds), np.interp(ts, [0, ds], [1100, 700]), 2.0)) * spin * np.interp(ts, [0, 0.1, ds], [0, 1, 0]), 0.4)
    return cut(verb(y, 0.6, 0.2, 5000), d, 0.3)

def chain_hit():  # kedjekulan träffar: ett tungt, köttigt slag, järnet som klonkar och kedjan som skramlar
    d = 0.7; y = np.zeros(int(d * SR))
    place(y, 0, thud(70, 0.4, 0.2), 0.8); place(y, 0, splat(0.25), 0.5); place(y, 0, anvil(700, 0.5, 0.3)); place(y, 0.02, chain(0.4, 10, None, (1800, 4500)), 0.3)
    return cut(verb(y, 0.4, 0.15, 6000), d, 0.25)

def acid_spray(d=2.2):  # syrasprutan (slinga 1,8 s): en väsande stråle under tryck, vätskan som sprutar och fräsande bubblor
    y = nrm(fftfilt(noise(d), 1500, 9000)) * (0.8 + 0.2 * lpnoise(d, 30)) * 0.5
    y += nrm(fftfilt(noise(d), 300, 1500)) * (0.6 + 0.4 * lpnoise(d, 12)) * 0.35
    return y + bubbles(d, int(d * 120), 1500, 4000, 1.0) * 0.25 + bubbles(d, int(d * 20), 400, 1000, 1.0) * 0.2

def acid_hit():  # syran träffar: ett blött stänk och ett kort, surt fräs
    d = 0.7; y = np.zeros(int(d * SR))
    place(y, 0, splat(0.25), 0.7); place(y, 0.02, fizz(0.6, 400) * np.interp(tt(0.6), [0, 0.05, 0.6], [0, 1, 0]), 0.5)
    return cut(verb(y, 0.3, 0.1, 8000), d, 0.25)

# ---- biomernas drönare ----
def ship_hum(d=4.8):  # spökskeppet (slinga 4 s): nattsvart hav som sakta häver sig, vind som viner i riggen och ett avlägset knarr mitt
    # i slingan
    y = nrm(fftfilt(noise(d), 40, 400)) * (0.6 + 0.4 * lpnoise(d, 0.5)) * 0.5
    y += nrm(fftfilt(noise(d), 300, 2000)) * (0.5 + 0.5 * lpnoise(d, 0.7)) ** 2 * 0.15
    y += nrm(svf(noise(d), 900 * (1 + 0.25 * lpnoise(d, 0.8)), 6.0)) * 0.06
    place(y, 1.4, creak(0.9, 4, 10, 220) * env(int(0.9 * SR), 0.25, 0.3), 0.15); place(y, 2.5, bubbles(0.4, 6, 300, 700), 0.15)
    return verb(y, 1.0, 0.25, 5000, tail=False)

def lab_hum(d=4.8):  # laboratoriet (slinga 4 s): elektriskt surr på 40 Hz av smalbandigt brus (så att överlappningen i skarven inte
    # svävar; en period är 25 ms, så game.js-skarven 25 ms före slutet hamnar också i fas), kolvar som puttrar svagt och en
    # glastinkling och ett knaster mitt i slingan
    y = nrm(reson(noise(d), [(40 * k, 0.8, 1 / k ** 0.7) for k in range(1, 41)])) * 0.5
    y += bubbles(d, int(d * 15), 300, 1100, 1.0) * 0.15 + nrm(fftfilt(noise(d), 200, 1500)) * 0.03
    place(y, 1.6, ping(m2f(93), 0.6, 0.06, 6)); place(y, 2.3, ping(m2f(88), 0.6, 0.04, 6)); place(y, 2.0, crackle(0.15, 30, 2000, 9000), 0.1)
    return y

FX = dict(ghostpirate=ghostpirate, gunner=gunner, drownedsailor=drownedsailor, ghostparrot=ghostparrot, tentacle=tentacle, rat=rat,
          homunculus=homunculus, ooze=ooze, apprentice=apprentice, mercurygolem=mercurygolem, vialwisp=vialwisp, chimera=chimera,
          captain_laugh=captain_laugh, captain_shout=captain_shout, alchemist_laugh=alchemist_laugh, alchemist_drink=alchemist_drink,
          cannon_fire=cannon_fire, cannonball_land=cannonball_land, plank_break=plank_break, wave_wash=wave_wash,
          ship_creak=ship_creak, lab_bubble=lab_bubble, tesla_zap=tesla_zap, acid_hiss=acid_hiss, flask_break=flask_break,
          transmute=transmute, alembic_brew=alembic_brew, chain_fire=chain_fire, chain_hit=chain_hit, acid_spray=acid_spray,
          acid_hit=acid_hit, ship_hum=ship_hum, lab_hum=lab_hum)

# ================= musik =================
class Loop:
    def __init__(s, T):
        s.N = int(round(T * SR)); s.T = s.N / SR; s.t = np.arange(s.N) / SR
        s.L = np.zeros(s.N); s.R = np.zeros(s.N)
    def add(s, t0, sig, pan=0.0, g=1.0):
        gl = np.cos((pan + 1) * np.pi / 4) * g * 1.414; gr = np.sin((pan + 1) * np.pi / 4) * g * 1.414
        i = int(round(t0 * SR)) % s.N; k = 0; n = len(sig)
        while k < n:
            m = min(n - k, s.N - i)
            s.L[i:i + m] += sig[k:k + m] * gl; s.R[i:i + m] += sig[k:k + m] * gr
            k += m; i = 0
    def q(s, f): return max(1, round(f * s.T)) / s.T  # frekvens med helt antal perioder på slingan
    def drone(s, n, g=1.0, h=10, roll=1.3, cyc=3, hi=600, det=0.002):  # liggande ton, sömlös
        y = np.zeros(s.N)
        for f in (s.q(m2f(n)), s.q(m2f(n) * (1 + det))):
            for k in range(1, h + 1): y += np.sin(2 * np.pi * f * k * s.t + rng.uniform(0, 6.28)) / k ** roll
        y = fftfilt(y, 0, hi)
        return y / np.abs(y).max() * (1 + 0.2 * np.sin(2 * np.pi * cyc / s.T * s.t + rng.uniform(0, 6))) * g
    def bed(s, lo, hi, g=1.0, cyc=4):  # bandat brus, cirkulärt filtrerat
        x = fftfilt(rng.standard_normal(s.N), lo, hi); x /= x.std()
        return x * g * (1 + 0.3 * np.sin(2 * np.pi * cyc / s.T * s.t + rng.uniform(0, 6)))
    def reverb(s, length=3.0, wet=0.3, bright=3500, pre=0.02):
        n = int(length * SR); t = np.arange(n) / SR; out = []
        for ch in (s.L, s.R):
            ir = rng.standard_normal(n) * np.exp(-t * 6.9 / length)
            ir = fftfilt(ir, 120, bright); ir[:int(pre * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
            h = np.zeros(s.N); h[:min(n, s.N)] = ir[:s.N]
            out.append(np.fft.irfft(np.fft.rfft(ch) * np.fft.rfft(h), s.N))
        s.L = s.L + wet * out[0]; s.R = s.R + wet * out[1]
    def write(s, name): wr(name, np.stack([s.L, s.R], 1).reshape(-1), 2)
def crash_cym(g=1.0, d=2.5):
    t = tt(d); y = fftfilt(noise(d), 3000, 11000) * np.exp(-t * 1.8)
    for f in (3170, 4410, 5530, 6880): y += 0.15 * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t * 2.5)
    return y * env(len(t), 0.001, 0.4) * g

def strings(notes, d, att=0.8, rel=1.2, g=1.0, hi=1400, vib=0.004, trem=0.0):  # stråkar: detunade sågtänder
    t = tt(d); y = np.zeros_like(t)
    for n in notes:
        for det in (-0.003, 0.0, 0.0035):
            f = m2f(n) * (1 + det) * (1 + vib * np.sin(2 * np.pi * (5 + rng.uniform(-.5, .5)) * t + rng.uniform(0, 6)))
            y += sawp(phase(f), min(5000, 2.5 * hi), f.max())
    y = fftfilt(y, 40, hi)
    if trem: y *= 0.55 + 0.45 * np.abs(np.sin(np.pi * trem * t))
    return nrm(y) * env(len(t), att, rel) * g

def mpulse(n, d=0.25, g=1.0):  # dämpad synthpuls
    t = tt(d); f = m2f(n)
    y = fftfilt(sawp(2 * np.pi * f * t, 2000, f), 40, 600) * np.exp(-t * 14)
    return y * env(len(t), 0.004, 0.04) * g

def vorbis_seam(name, tgt):  # kodar OUT/name.wav precis som mus() gör (förstärkning till tgt LUFS, topp under -1 dBFS, Vorbis q1),
    # avkodar och mäter skarven: största andradifferensen över skarven / 99,9-percentilen i hela slingan (samma mått som testet)
    w = f'{OUT}/{name}.wav'
    run = lambda *a: subprocess.run(['ffmpeg', '-hide_banner', '-nostats', *a], capture_output=True)
    lufs = float(re.findall(r'^\s*I:\s+(-?[0-9.]+) LUFS', run('-i', w, '-af', 'ebur128', '-f', 'null', '-').stderr.decode(), re.M)[-1])
    peak = float(re.findall(r'max_volume: (-?[0-9.]+) dB', run('-i', w, '-af', 'volumedetect', '-f', 'null', '-').stderr.decode())[-1])
    v = round(tgt - lufs, 6); v = round(v - (peak + v + 1) if peak + v > -1 else v, 2)
    o = run('-loglevel', 'error', '-i', w, '-af', f'volume={v:.2f}dB', '-c:a', 'libvorbis', '-q:a', '1', '-fflags', '+bitexact', '-f', 'ogg', '-').stdout
    y = np.frombuffer(subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', '-', '-f', 'f32le', '-'], input=o, capture_output=True).stdout, '<f4').reshape(-1, 2)
    r = 0.0
    for c in range(2):
        z = y[:, c]; q = np.quantile(np.abs(z[2:] - 2 * z[1:-1] + z[:-2]), 0.999)
        r = max(r, abs(z[0] - 2 * z[-1] + z[-2]) / q, abs(z[1] - 2 * z[0] + z[-1]) / q)
    return r

def write_aligned(*named):  # [(Loop, namn, mål-LUFS)]: vrider alla slingor lika mycket (0-60 ms senare) så att skarven hamnar där
    # alla kanaler är nära noll och flacka; annars ger Vorbis-kodarens start mitt i en stark baston ett litet knäpp i skarven.
    # Intensitetslagren vrids lika mycket som grundspåret, så tidslinjen är densamma.
    # Vorbis q1 har ett kodfel som inte hänger ihop över skarven, och i lugna spår (bara padar) kan det bli ett litet steg där.
    # Därför provkodas de bästa vridningarna (i kostnadsordning) tills skarven i alla lager ligger väl under testets gräns (2,0).
    N = named[0][0].N; K = int(0.06 * SR); i = (N - np.arange(K)) % N; cost = np.zeros(K)
    for lp, _, _ in named:
        for ch in (lp.L, lp.R):
            cost += (np.abs(ch[i]) + 20 * np.abs(ch[i] - ch[i - 1])) / (np.sqrt(np.mean(ch ** 2)) + 1e-9)
    cand = []
    for k in np.argsort(cost, kind='stable'):
        if all(abs(int(k) - c) > SR // 500 for c in cand): cand.append(int(k))
        if len(cand) == 8: break
    L0 = [(lp.L.copy(), lp.R.copy()) for lp, _, _ in named]; best = None
    for k in cand:
        for (lp, name, _), (l0, r0) in zip(named, L0):
            lp.L = np.roll(l0, k); lp.R = np.roll(r0, k); lp.write(name)
        r = max(vorbis_seam(name, tgt) for _, name, tgt in named)
        print(f'{named[0][1]}: vridning {k / SR * 1000:.1f} ms, skarv efter Vorbis {r:.2f}', file=sys.stderr)
        if best is None or r < best[0]: best = (r, k)
        if r < 1.0: return
    for (lp, name, _), (l0, r0) in zip(named, L0):
        lp.L = np.roll(l0, best[1]); lp.R = np.roll(r0, best[1]); lp.write(name)

# ---- fler instrument ----
def wpad(notes, d, g=1.0, att=2.0, rel=2.0, hi=900):  # vattenpad: detunade sågtänder som svajar långsamt (som genom vatten)
    t = tt(d); y = np.zeros_like(t)
    for n in notes:
        for det in (-0.005, 0.0, 0.006):
            f = m2f(n) * (1 + det) * (1 + 0.004 * np.sin(2 * np.pi * rng.uniform(0.15, 0.35) * t + rng.uniform(0, 6)))
            y += sawp(phase(f), 2.5 * hi, f.max())
    y = fftfilt(y, 40, hi) * (1 + 0.25 * np.sin(2 * np.pi * 0.5 * t + rng.uniform(0, 6)))
    return nrm(y) * env(len(t), att, rel) * g

def shaker(g=1.0):
    d = 0.09; t = tt(d); return fftfilt(noise(d), 4000, 11000) * np.sin(np.pi * t / d) ** 2 * g

def snare(g=1.0):
    d = 0.3; t = tt(d)
    y = fftfilt(noise(d), 1200, 8000) * np.exp(-t * 18) + np.sin(phase(190 * (1 + 0.4 * np.exp(-t * 40)))) * np.exp(-t * 25) * 0.6
    return y * env(len(t), 0.001, 0.05) * g

def taiko(g=1.0, f=40, d=1.4):
    t = tt(d); return (drum(f, d, 1.0, 0.45, dec=3.5) + fftfilt(noise(d), 60, 400) * np.exp(-t * 12) * 0.3) * g

def mel_tone(n, d, g=1.0):  # kristallmelodi: klockspelsanslag + glasharmonika som bär tonen
    y = bar(m2f(n), d + 1.0, 0.6, dec=1.5) * g; place(y, 0, glass(n, d + 0.4, g * 0.7, att=0.04, rel=0.5)); return y

# ---- fler instrument ----
def harpsi(n, d=1.0, g=1.0):  # cembalo: ljus knäppt sträng med många övertoner, snabb avklingning och ett litet knäpp
    y = pluck(n, d, 0.7, 1.0); place(y, 0, tick(0.01, 0.3, 2000, 8000, 400)); return nrm(fftfilt(y, 80, 8000)) * g

def spicc(notes, d=0.18, g=1.0, hi=3000):  # stråkar spiccato: korta stråkdrag
    return strings(notes, d, att=0.008, rel=0.06, g=g, hi=hi, vib=0.0)

def flute(n, d, g=1.0, att=0.08, rel=0.25, vib=0.006):  # flöjt: nästan sinus, luft och fördröjt vibrato
    t = tt(d); f = m2f(n) * (1 + vib * np.clip((t - 0.25) / 0.3, 0, 1) * np.sin(2 * np.pi * 5.0 * t))
    ph = phase(f); y = np.sin(ph) + 0.22 * np.sin(2 * ph) + 0.07 * np.sin(3 * ph)
    br = nrm(fftfilt(noise(d), m2f(n), m2f(n) * 4)) * (1 + 1.5 * np.exp(-t * 15))
    return (nrm(y) + 0.07 * br) * env(len(t), att, rel) * g

def wblock(f=1800, g=1.0):  # träkloss / klocktick
    k = tt(0.08); return nrm(reson(noise(0.08), [(f, f * 0.03, 1), (f * 2.1, f * 0.05, 0.4)])) * np.exp(-k * 70) * env(len(k), 0.0005, 0.01) * g

def thunder_hit(d=4.0, g=1.0):  # avlägsen åska till musiken: knall och långt rullande muller
    t = tt(d); y = fftfilt(noise(d), 200, 6000) * np.exp(-t * 10) * 0.5
    y += nrm(fftfilt(noise(d), 25, 300)) * np.interp(t, [0, 0.15, 1.2, d], [0, 1, 0.6, 0]) * (0.7 + 0.3 * lpnoise(d, 3))
    return y * env(len(t), 0.003, 0.5) * g

def stereo_sting(T):  # icke-slingande stereobuffert (för stingers), som i make6.sh
    return [np.zeros(int(T * SR)), np.zeros(int(T * SR))]

def sadd(B, t0, sig, pan=0.0, g=1.0):
    place(B[0], t0, sig, np.cos((pan + 1) * np.pi / 4) * g * 1.414); place(B[1], t0, sig, np.sin((pan + 1) * np.pi / 4) * g * 1.414)

def ember(g=1.0):  # lägereldens knäpp: kort brusklick med lite träklang
    d = 0.03; k = tt(d); return nrm(reson(noise(d), [(rng.uniform(1500, 3500), 600, 1), (rng.uniform(5000, 7000), 900, 0.4)])) * np.exp(-k * rng.uniform(150, 300)) * g

# ---- fler instrument: trä, svamp, puls ----
def marimba(n, d=1.2, g=1.0):  # marimba: grundton och de skarpa deltonerna 3,93 och 9,2 som klingar av fort, mjuk klubba
    f = m2f(n); t = tt(d)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * (2.5 + f / 300))
    for r, a, dk in ((3.93, 0.3, 12), (9.2, 0.08, 30)):
        if f * r < SR * 0.45: y += a * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6)) * np.exp(-t * (dk + f / 100))
    place(y, 0, tick(0.01, 0.08, 1000, 5000, 500))
    return y * env(len(t), 0.002, 0.05) * g

def kalimba(n, d=1.2, g=1.0):  # kalimba: rund ton med en klirrande, snabbt avklingande överton
    f = m2f(n); t = tt(d)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 3.5) + 0.25 * np.sin(2 * np.pi * f * 5.95 * t) * np.exp(-t * 18) + 0.1 * np.sin(4 * np.pi * f * t) * np.exp(-t * 8)
    return y * env(len(t), 0.002, 0.05) * g

def logdrum(f=180, g=1.0, d=0.35):  # slitstrumma/ihålig stock: två träresonanser, kort avklingning
    k = tt(d)
    y = np.sin(2 * np.pi * f * k) * np.exp(-k * 14) + 0.5 * np.sin(2 * np.pi * f * 1.52 * k) * np.exp(-k * 22)
    y += nrm(reson(noise(d), [(f * 3.1, f * 0.2, 1)])) * np.exp(-k * 60) * 0.25
    return y * env(len(k), 0.001, 0.03) * g

def pbass(n, d, rate, g=1.0, drive=2.0):  # pulserande bas: sågtand vars klang (mörk/ljus blandning) och styrka pulserar i "rate" Hz
    t = tt(d); f = m2f(n); y = sawp(2 * np.pi * f * t, 3000, f) + 0.6 * sawp(2 * np.pi * f * 1.004 * t, 3000, f)
    m = (0.5 - 0.5 * np.cos(2 * np.pi * rate * t)) ** 2
    y = fftfilt(y, 30, 250) * (1 - m) + fftfilt(y, 30, 1400) * m
    y = np.tanh(drive * y / (np.abs(y).max() + 1e-9)) * (0.55 + 0.45 * m)
    return y * env(len(t), 0.01, 0.06) * g

def heartbeat(g=1.0):  # hjärtslag: "lubb-dubb" (två dova slag)
    y = drum(42, 0.5, 1.0, 0.1, dec=9); place(y, 0.17, drum(48, 0.4, 0.7, 0.1, dec=10)); return y * g

def ocarina(n, d, g=1.0):  # okarina: mjukare, mörkare flöjt med mer luft
    return fftfilt(flute(n, d, 1.0, att=0.06, rel=0.3, vib=0.008), 0, 2500) * g

def glasshit(n, g=1.0, d=0.6):  # glasslag: kort kristallklang
    return crys(m2f(n), d, g, 3.0, 0.003)



# ---- fler instrument: ramtrumma, stamp, musikaliska bubblor ----
def bodhran(g=1.0, f=95, d=0.35, slap=0.3):  # ramtrumma (bodhrán): dovt skinnslag med lite rassel
    t = tt(d); y = np.sin(phase(f * (1 + 0.5 * np.exp(-t * 40)))) * np.exp(-t * 11)
    y += fftfilt(noise(d), 300, 3000) * np.exp(-t * 35) * slap
    return y * env(len(t), 0.001, 0.05) * g

def stomp(g=1.0):  # fotstamp mot däcket: dovt trädunk
    d = 0.25; k = tt(d)
    return (np.sin(phase(70 * (1 + 0.8 * np.exp(-k * 50)))) * np.exp(-k * 18) + nrm(reson(noise(d), [(180, 40, 1), (420, 80, 0.5)])) * np.exp(-k * 25) * 0.5) * g

def mbub(n, g=1.0, d=0.09):  # musikalisk bubbla: en bubbla stämd på en ton
    return bubble(m2f(n), d, 1, 0.5) * g


# ---- ship: Spökskeppet, d-moll, 6/8 (åttondel 0,25 s), 24 takter = 36 s, tre fraser à 8 takter
# (Dm Dm C C Dm Dm Am Dm | Bb Bb F F Gm Gm A A | Dm Dm C C Bb Gm A Dm) ----
# grund: havets dova sus och vågor som sväller och bryts, skrovet som knarrar, låga stråkar och en drone, dragspelets bas på ettan
# och ackord på fyran, en skeppsklocka, ett brummande "oo" från spökbesättningen i första frasen och en sjömansvisa i moll på
# dragspel i andra och tredje frasen.
# hi: ramtrumma och fotstamp i 6/8, pizzicatobas, shaker och dragspelets ackordstötar på efterslagen.
def ship():
    b = 0.25; br = 6 * b; T = 24 * br; base = Loop(T); hi = Loop(T)
    prog = ['Dm', 'Dm', 'C', 'C', 'Dm', 'Dm', 'Am', 'Dm', 'Bb', 'Bb', 'F', 'F', 'Gm', 'Gm', 'A', 'A',
            'Dm', 'Dm', 'C', 'C', 'Bb', 'Gm', 'A', 'Dm']
    chord = {'Dm': [57, 62, 65], 'C': [55, 60, 64], 'Am': [57, 60, 64], 'Bb': [58, 62, 65], 'F': [57, 60, 65], 'Gm': [55, 58, 62], 'A': [57, 61, 64]}
    root = {'Dm': 38, 'C': 36, 'Am': 33, 'Bb': 34, 'F': 41, 'Gm': 31, 'A': 33}
    base.add(0, base.drone(38, 0.08, h=6, roll=1.6, cyc=3, hi=300))
    base.add(0, base.bed(60, 400, 0.012, cyc=6)); base.add(0, base.bed(2500, 8000, 0.0012, cyc=4))
    for i, c in enumerate(prog):
        t0 = i * br; ch = chord[c]; r = root[c]
        base.add(t0 - 0.3, strings([n - 12 for n in ch], br + 0.6, att=0.6, rel=0.7, g=0.15, hi=900), -0.2)
        base.add(t0 - 0.1, strings([r + 12], br + 0.3, att=0.3, rel=0.5, g=0.16, hi=380), 0.1)
        base.add(t0, accordion([r + 12], 2 * b + 0.05, 0.12, hi=2500), -0.3)
        base.add(t0 + 3 * b, accordion(ch, 2 * b, 0.08, hi=3500), -0.3)
        if i < 8: base.add(t0 - 0.3, nrm(choir([n - 12 for n in ch[:2]], br + 0.6, 0.5, 0.6, 1.0, vib=4.0, F=OH, hmax=3500)), 0.3, 0.07)
        for k, gg in ((0, 0.5), (2, 0.25), (3, 0.4), (5, 0.3)): hi.add(t0 + k * b, bodhran(gg), 0.0)
        for k in (0, 3): hi.add(t0 + k * b, stomp(0.35), 0.0); hi.add(t0 + k * b, pizz(r + 12 if k == 0 else r + 19, 0.4, 0.25), 0.15)
        for k in range(6): hi.add(t0 + k * b, shaker(0.04 if k % 3 == 0 else 0.025), -0.45)
        for k in (1, 2, 4, 5): hi.add(t0 + k * b, accordion(ch, b * 0.7, 0.06, att=0.01, rel=0.05, hi=3000), 0.35)
    for t0, dd, p in ((0.5, 5.5, -0.6), (5.0, 6.0, 0.5), (10.3, 5.0, -0.3), (15.0, 6.5, 0.6), (20.6, 5.5, -0.5), (25.5, 6.0, 0.3), (30.8, 5.5, -0.6)):
        base.add(t0, seawave(dd, 0.45, 1.0, 0.4), p, 0.06)
    for t0, f, p in ((3.5, 240, 0.5), (14.2, 300, -0.5), (26.0, 260, 0.4)): base.add(t0, creak(1.0, 5, 12, f) * env(SR, 0.2, 0.3), p, 0.03)
    base.add(0, bell(62, 5.0, 0.03), 0.4); base.add(12 * br, bell(62, 5.0, 0.025), -0.4)
    mel = [(8, 0, 70, 2), (8, 2, 69, 1), (8, 3, 67, 2), (8, 5, 65, 1), (9, 0, 62, 3), (9, 3, 65, 3),
           (10, 0, 72, 2), (10, 2, 70, 1), (10, 3, 69, 3), (11, 0, 65, 2), (11, 2, 67, 1), (11, 3, 69, 3),
           (12, 0, 70, 2), (12, 2, 69, 1), (12, 3, 67, 2), (12, 5, 70, 1), (13, 0, 74, 3), (13, 3, 72, 2), (13, 5, 70, 1),
           (14, 0, 69, 2), (14, 2, 73, 1), (14, 3, 76, 2), (14, 5, 73, 1), (15, 0, 69, 6),
           (16, 0, 74, 2), (16, 2, 74, 1), (16, 3, 74, 2), (16, 5, 72, 1), (17, 0, 69, 2), (17, 2, 65, 1), (17, 3, 62, 3),
           (18, 0, 72, 2), (18, 2, 72, 1), (18, 3, 72, 2), (18, 5, 70, 1), (19, 0, 67, 2), (19, 2, 64, 1), (19, 3, 60, 3),
           (20, 0, 70, 2), (20, 2, 72, 1), (20, 3, 74, 3), (21, 0, 77, 2), (21, 2, 74, 1), (21, 3, 70, 3),
           (22, 0, 69, 2), (22, 2, 67, 1), (22, 3, 64, 1), (22, 4, 67, 1), (22, 5, 73, 1), (23, 0, 74, 5)]
    for bi, k, n, dd in mel: base.add(bi * br + k * b, accordion([n], dd * b + 0.05, 0.14, att=0.03, rel=0.1, swell=0.08, hi=5000), 0.15)
    base.reverb(3.0, 0.4, 4500, 0.03); hi.reverb(1.5, 0.22, 5000)
    write_aligned((base, 'ship', -20), (hi, 'ship_hi', -23))

# ---- lab: Alkemistens laboratorium, c-moll, 80 bpm, 12 takter = 36 s (Cm Ab Fm G | Cm Db Bbm C | Ab Fm G G) ----
# grund: ett elektriskt surr på C (smalbandigt brus på deltonerna, cirkulärt filtrerat), mjuk orgel, cembalo i åttondelar, bubblor
# stämda i ackordet som puttrar här och där, knaster från spolarna och en glasmelodi från fjärde takten.
# hi: ett urverk som tickar i åttondelar, marimba i sextondelar, shaker, dova trummor och en pulserande bas.
def lab():
    b = 0.75; T = 48 * b; base = Loop(T); hi = Loop(T)
    slots = ['Cm', 'Ab', 'Fm', 'G', 'Cm', 'Db', 'Bbm', 'C', 'Ab', 'Fm', 'G', 'G']
    chord = {'Cm': [60, 63, 67], 'Ab': [60, 63, 68], 'Fm': [60, 65, 68], 'G': [59, 62, 67], 'Db': [61, 65, 68], 'Bbm': [61, 65, 70], 'C': [60, 64, 67]}
    root = {'Cm': 36, 'Ab': 32, 'Fm': 41, 'G': 31, 'Db': 37, 'Bbm': 34, 'C': 36}
    hum = reson(rng.standard_normal(base.N), [(m2f(36) * k, 0.6, 1 / k ** 0.8) for k in (1, 2, 3, 4, 6, 8, 12)])
    base.add(0, nrm(hum) * 0.05); base.add(0, base.bed(250, 1500, 0.005, cyc=3))
    for s, c in enumerate(slots):
        t0 = s * 4 * b; ch = chord[c]; r = root[c]
        base.add(t0 - 0.05, organ([n - 12 for n in ch] + [r], 4 * b + 0.2, 0.18, att=0.08, rel=0.3, stops=((0.5, 0.4), (1, 1), (2, 0.5), (4, 0.15)), chiff=0.1, hi=3000), -0.1)
        arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12] * 2
        for k8 in range(8): base.add(t0 + k8 * b / 2, harpsi(arp[k8], 0.9, 0.07 if k8 % 4 else 0.09), 0.35 - 0.1 * (k8 % 4))
        for _ in range(5): base.add(t0 + rng.uniform(0, 4 * b), mbub(ch[rng.integers(3)] + 24, 0.08), rng.uniform(-0.7, 0.7))
        for k8 in range(8): hi.add(t0 + k8 * b / 2, wblock(2600 if k8 % 2 == 0 else 2000, 0.05 if k8 % 2 == 0 else 0.03), -0.5)
        for k16 in range(16):
            hi.add(t0 + k16 * b / 4, marimba([r + 24, ch[0] + 12, ch[2] + 12, ch[1] + 12][k16 % 4], 0.5, 0.08 if k16 % 4 == 0 else 0.05), 0.3)
            hi.add(t0 + k16 * b / 4, shaker(0.035 if k16 % 4 == 2 else 0.018), -0.3)
        hi.add(t0, pbass(r + 12, 4 * b, 2 / b, 0.2, 1.8), 0)
        for tb, gg in ((0, 0.5), (2, 0.35), (2.5, 0.2)): hi.add(t0 + tb * b, drum(55, 0.5, gg, 0.2, dec=8), 0)
    for t0, p in ((5.1, 0.6), (13.7, -0.6), (22.4, 0.5), (31.2, -0.4)): base.add(t0, crackle(0.25, 40, 2000, 9000), p, 0.03)
    mel = [(16, 72, 1.5), (17.5, 74, 0.5), (18, 75, 2), (20, 77, 1), (21, 80, 1), (22, 77, 2), (24, 73, 2), (26, 70, 1), (27, 73, 1),
           (28, 76, 3), (31, 79, 1), (32, 80, 2), (34, 79, 1), (35, 77, 1), (36, 75, 2), (38, 72, 1), (39, 77, 1),
           (40, 74, 3), (43, 71, 1), (44, 71, 1), (45, 74, 1), (46, 79, 2)]
    for t0, n, dd in mel: base.add(t0 * b, mel_tone(n, dd * b + 0.1, 0.12), 0.2)
    base.reverb(3.5, 0.45, 5000, 0.03); hi.reverb(1.6, 0.22, 5000)
    write_aligned((base, 'lab', -20), (hi, 'lab_hi', -23))

# ---- boss17: spökkaptenen, g-moll, 6/8 (åttondel 2/9 s), 24 takter = 32 s, tre fraser à 8 takter
# (Gm Gm F F Gm Gm D D | Eb Eb Bb Bb Cm Cm D D | Gm Gm F F Eb Cm D D) ----
# en sjömansvisa i moll mitt i en storm: regn, vindens tjut (smala brusband som sväller med ett helt antal varv på slingan),
# vindbyar och åska; dragspelet spelar visan med bas på ettan och fyran och ackordstötar på efterslagen; taiko, ramtrumma och
# stamp; i andra frasen tar spökbesättningen upp visan (kör) och mässingen dubblar melodin, i tredje frasen stråktremolo,
# virvel och dragspelet i oktaver.
def boss17():
    b = 2 / 9; br = 6 * b; T = 24 * br; L = Loop(T)
    prog = ['Gm', 'Gm', 'F', 'F', 'Gm', 'Gm', 'D', 'D', 'Eb', 'Eb', 'Bb', 'Bb', 'Cm', 'Cm', 'D', 'D',
            'Gm', 'Gm', 'F', 'F', 'Eb', 'Cm', 'D', 'D']
    chord = {'Gm': [62, 67, 70], 'F': [60, 65, 69], 'D': [62, 66, 69], 'Eb': [63, 67, 70], 'Bb': [62, 65, 70], 'Cm': [60, 63, 67]}
    root = {'Gm': 43, 'F': 41, 'D': 38, 'Eb': 39, 'Bb': 46, 'Cm': 36}
    L.add(0, L.bed(2500, 9000, 0.006, cyc=8)); L.add(0, L.bed(30, 200, 0.02, cyc=6))
    for lo, hi_, g, cyc in ((380, 520, 0.006, 3), (650, 820, 0.004, 5), (1000, 1250, 0.0025, 7)): L.add(0, L.bed(lo, hi_, g, cyc))
    for t0, dd, p in ((2.0, 3.0, -0.6), (9.5, 3.5, 0.6), (17.0, 3.0, -0.4), (24.5, 3.5, 0.5)): L.add(t0, gust(dd, 300, 1600, 0.4), p, 0.05)
    for t0, g, p in ((0.0, 0.25, -0.3), (12 * br, 0.2, 0.4), (16 * br, 0.25, -0.2)): L.add(t0, thunder_hit(4.0), p, g)
    for i, c in enumerate(prog):
        t0 = i * br; ch = chord[c]; r = root[c]; p = i // 8
        L.add(t0, accordion([r], 2 * b, 0.16, hi=2500), -0.25); L.add(t0 + 3 * b, accordion([r + 7], 2 * b, 0.13, hi=2500), -0.25)
        for k in (1, 2, 4, 5): L.add(t0 + k * b, accordion(ch, b * 0.75, 0.09, att=0.008, rel=0.05, hi=3500), 0.3)
        L.add(t0, taiko(0.45, 40, 1.2), 0); L.add(t0 + 3 * b, drum(50, 0.5, 0.3, 0.25, dec=8), 0)
        for k, gg in ((0, 0.5), (2, 0.2), (3, 0.4), (5, 0.25)): L.add(t0 + k * b, bodhran(gg * (1.2 if p else 1.0)), 0.05)
        for k in (0, 3): L.add(t0 + k * b, stomp(0.3), 0.0)
        for k in range(6): L.add(t0 + k * b, shaker(0.04 if k % 3 == 0 else 0.02), -0.45)
        L.add(t0 - 0.1, strings([n - 12 for n in ch], br + 0.2, att=0.1, rel=0.2, g=0.16, hi=1500, trem=12 if p == 2 else 0.0), -0.3)
        L.add(t0, pizz(r - 12, 0.6, 0.3), 0.0)
        if p >= 1: L.add(t0 - 0.2, nrm(choir([n - 12 for n in ch], br + 0.4, 0.2, 0.3, 1.0, vib=4.5, F=AA, hmax=3500)), 0.2, 0.14)
        if p == 2:
            for k in (1, 2, 4, 5): L.add(t0 + k * b, snare(0.1), 0.15)
            L.add(t0 + 3 * b, snare(0.22), 0.15)
    mel = [(0, 0, 67, 1), (0, 1, 70, 1), (0, 2, 74, 1), (0, 3, 74, 2), (0, 5, 72, 1), (1, 0, 70, 2), (1, 2, 69, 1), (1, 3, 67, 3),
           (2, 0, 65, 1), (2, 1, 69, 1), (2, 2, 72, 1), (2, 3, 72, 2), (2, 5, 70, 1), (3, 0, 69, 2), (3, 2, 67, 1), (3, 3, 65, 3),
           (4, 0, 67, 1), (4, 1, 70, 1), (4, 2, 74, 1), (4, 3, 79, 2), (4, 5, 77, 1), (5, 0, 75, 2), (5, 2, 74, 1), (5, 3, 72, 2), (5, 5, 70, 1),
           (6, 0, 69, 2), (6, 2, 66, 1), (6, 3, 69, 2), (6, 5, 72, 1), (7, 0, 74, 3), (7, 3, 66, 2), (7, 5, 62, 1),
           (8, 0, 79, 2), (8, 2, 77, 1), (8, 3, 75, 3), (9, 0, 70, 1), (9, 1, 72, 1), (9, 2, 74, 1), (9, 3, 75, 2), (9, 5, 74, 1),
           (10, 0, 74, 2), (10, 2, 72, 1), (10, 3, 70, 3), (11, 0, 65, 1), (11, 1, 67, 1), (11, 2, 69, 1), (11, 3, 70, 2), (11, 5, 72, 1),
           (12, 0, 75, 2), (12, 2, 74, 1), (12, 3, 72, 2), (12, 5, 75, 1), (13, 0, 79, 3), (13, 3, 77, 2), (13, 5, 75, 1),
           (14, 0, 74, 2), (14, 2, 78, 1), (14, 3, 81, 2), (14, 5, 78, 1), (15, 0, 74, 6)]
    mel += [(bi + 16, k, n, dd) for bi, k, n, dd in mel[:16]]
    mel += [(20, 0, 79, 2), (20, 2, 75, 1), (20, 3, 70, 3), (21, 0, 72, 2), (21, 2, 75, 1), (21, 3, 79, 3),
            (22, 0, 78, 2), (22, 2, 74, 1), (22, 3, 69, 1), (22, 4, 72, 1), (22, 5, 78, 1), (23, 0, 74, 3), (23, 3, 62, 1), (23, 4, 66, 1), (23, 5, 69, 1)]
    for bi, k, n, dd in mel:
        L.add(bi * br + k * b, accordion([n, n + 12] if bi >= 16 else [n], dd * b + 0.03, 0.2, att=0.015, rel=0.06, swell=0.05, hi=5000), 0.12)
        if bi >= 8: L.add(bi * br + k * b, brass([n - 12], dd * b + 0.03, att=0.02, rel=0.1, drive=2.4, swell=0.1, hi_fc=2400), -0.12, 0.16)
    for t0 in (0, 8 * br, 16 * br): L.add(t0, crash_cym(0.16, 3.0), 0.3)
    L.reverb(2.6, 0.35, 4500)
    write_aligned((L, 'boss17', -19))

# ---- boss18: alkemisten, a-moll, 160 bpm, 24 takter = 36 s, tre delar à 8 takter som följer alkemistens drycker
# (Am F Dm E Am F G E | Am C G F Dm F E E | Am F Dm E Am F E E) ----
# jätten: full orgel med pedal, en toccatafigur i sextondelar (topptonen mot en liggande ton), taiko, virvel och distad bas;
# snabb: cembalo i sextondelar, spiccato och virvel i åttondelar, pizzicatobas och melodin i orgelns tungstämma med mässing under;
# osynlig: kusligt tyst – en låg orgelton, glasharmonikamelodi, bubblor, ett urverk som tickar och hjärtslag, och i de två sista
# takterna en virvel som växer och ett stigande sus tillbaka in i jätten.
def boss18():
    b = 0.375; T = 96 * b; L = Loop(T)
    secs = [['Am', 'F', 'Dm', 'E', 'Am', 'F', 'G', 'E'], ['Am', 'C', 'G', 'F', 'Dm', 'F', 'E', 'E'], ['Am', 'F', 'Dm', 'E', 'Am', 'F', 'E', 'E']]
    chord = {'Am': [57, 60, 64], 'F': [57, 60, 65], 'Dm': [57, 62, 65], 'E': [56, 59, 64], 'G': [55, 59, 62], 'C': [55, 60, 64]}
    root = {'Am': 45, 'F': 41, 'Dm': 38, 'E': 40, 'G': 43, 'C': 48}
    L.add(0, L.bed(40, 250, 0.012, cyc=4))
    for bi in range(24):
        sec = bi // 8; c = secs[sec][bi % 8]; ch = chord[c]; r = root[c]; t1 = bi * 4 * b
        if sec == 0:
            L.add(t1 - 0.03, organ(ch + [r - 12, r], 4 * b + 0.1, 0.3, att=0.03, rel=0.2, stops=((0.5, 0.6), (1, 1), (2, 0.7), (3, 0.35), (4, 0.4), (6, 0.15), (8, 0.2)), chiff=0.15, hi=5000), -0.1)
            tops = [ch[2] + 12, ch[1] + 12, ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24, ch[2] + 12, ch[1] + 12]
            seq = [x for j in range(8) for x in (tops[j], ch[0])]
            for k in range(16): L.add(t1 + k * b / 4, organ([seq[k]], b / 4 + 0.02, 0.12, att=0.005, rel=0.03, stops=((1, 1), (2, 0.6), (4, 0.25)), chiff=0.25, hi=6000), 0.3 if k % 2 else -0.3)
            L.add(t1, taiko(0.6, 36, 1.3), 0); L.add(t1 + 2 * b, taiko(0.45, 40, 1.2), 0)
            for k in (1, 3): L.add(t1 + k * b, snare(0.2), 0.15)
            L.add(t1, dbass(r - 12, 4 * b * 0.9, 0.3, 2.4, 800), 0)
        elif sec == 1:
            L.add(t1 - 0.05, organ(ch, 4 * b + 0.1, 0.12, stops=((1, 1), (2, 0.4)), chiff=0.05, hi=3000), -0.2)
            seq = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24] * 4
            for k in range(16): L.add(t1 + k * b / 4, harpsi(seq[k], 0.5, 0.1 if k % 4 == 0 else 0.07), 0.35)
            for k in range(8):
                L.add(t1 + k * b / 2, spicc([n - 12 for n in ch[:2]], 0.15, 0.1, 3000), -0.35)
                L.add(t1 + k * b / 2, snare(0.12 if k % 2 else 0.18), 0.15)
            for k in (0, 2): L.add(t1 + k * b, drum(48, 0.5, 0.5, 0.25, dec=7), 0)
            for k in range(4): L.add(t1 + k * b, pizz(r - 12 + (12 if k % 2 else 0), 0.4, 0.3), 0)
        else:
            L.add(t1 - 0.2, organ([r - 12, ch[0]], 4 * b + 0.3, 0.1, att=0.3, rel=0.4, stops=((0.5, 0.5), (1, 1), (2, 0.2)), chiff=0.0, hi=2000), 0)
            for k in range(8): L.add(t1 + k * b / 2, wblock(2400 if k % 2 == 0 else 1900, 0.04 if k % 2 == 0 else 0.025), -0.5)
            L.add(t1, heartbeat(0.3), 0)
            for _ in range(6): L.add(t1 + rng.uniform(0, 4 * b), mbub(ch[rng.integers(3)] + 24, 0.07), rng.uniform(-0.8, 0.8))
            if bi >= 22:
                for k in range(16): L.add(t1 + k * b / 4, snare(0.05 + 0.15 * ((bi - 22) * 16 + k) / 32), 0.1)
                for k in (0, 2): L.add(t1 + k * b, taiko(0.3 + 0.1 * (bi - 22), 40, 1.0), 0)
    lead = [(32, 76, 1), (33, 81, 1), (34, 80, 1), (35, 81, 1), (36, 79, 1.5), (37.5, 76, 0.5), (38, 72, 2), (40, 74, 1), (41, 79, 1), (42, 77, 1), (43, 74, 1),
            (44, 72, 2), (46, 77, 2), (48, 77, 1), (49, 76, 1), (50, 74, 1), (51, 77, 1), (52, 81, 2), (54, 79, 1), (55, 77, 1),
            (56, 76, 1), (57, 80, 1), (58, 83, 1), (59, 80, 1), (60, 76, 3), (63, 71, 1)]
    for t0, n, dd in lead:
        L.add(t0 * b, organ([n], dd * b + 0.03, 0.22, att=0.01, rel=0.06, stops=((1, 1), (2, 0.8), (3, 0.6), (4, 0.5), (5, 0.3), (6, 0.25)), chiff=0.1, hi=6000), 0.15)
        L.add(t0 * b, brass([n - 24], dd * b + 0.03, att=0.02, rel=0.08, drive=2.2, swell=0.1, hi_fc=2000), -0.15, 0.14)
    glassmel = [(64, 76, 3), (67, 72, 1), (68, 77, 4), (72, 74, 3), (75, 71, 1), (76, 72, 2), (78, 71, 2), (80, 76, 3), (83, 72, 1), (84, 77, 4), (88, 80, 4)]
    for t0, n, dd in glassmel: L.add(t0 * b, mel_tone(n, dd * b + 0.1, 0.14), 0.2)
    for t0 in (0, 32 * b): L.add(t0, crash_cym(0.18, 3.0), 0.3)
    for t0 in (0, 32 * b, 64 * b): L.add(t0, glasshit(81, 0.07, 1.2), 0.45); L.add(t0, glasshit(82, 0.06, 1.2), -0.45)
    L.add(88 * b, swish(8 * b, 300, 5000, 2.0), 0, 0.12)
    L.reverb(2.8, 0.38, 4800)
    write_aligned((L, 'boss18', -19))

for k, f in FX.items(): wr('s_' + k, f())
ship(); lab(); boss17(); boss18()
PY
python3 -I "$T/synth14.py" "$T"

# ---------- musik ----------
mus ship -20 anull "$T/ship.wav"
mus ship_hi -23 anull "$T/ship_hi.wav"
mus lab -20 anull "$T/lab.wav"
mus lab_hi -23 anull "$T/lab_hi.wav"
mus boss17 -19 anull "$T/boss17.wav"
mus boss18 -19 anull "$T/boss18.wav"

# ---------- ljudeffekter ----------
E="$S/Environment"
G="$S/Combat and Gore"
X="$S/Materials"
W="$S/Weapons"
Q="$S/Other"
K="$S/Machines"
Z="$S/Retro"
# fiender: Spökskeppet
TOP=-2 fx ghostpirate "[0:a]$P[a];[1:a]$P,atrim=0:1.8,asetpts=PTS-STARTPTS,lowpass=f=1500,volume=0.08,afade=t=in:d=0.3,afade=t=out:st=1.3:d=0.5[b];[a][b]$(mix 2),atrim=0:2.0,afade=t=out:st=1.6:d=0.4[o]" "$T/s_ghostpirate.wav" "$Q/ghost_long.wav"
TOP=-2 fx gunner "[0:a]$P[a];[1:a]$P,atrim=0:1.0,asetpts=PTS-STARTPTS,volume=0.35,adelay=300,afade=t=out:st=1.0:d=0.3[b];[a][b]$(mix 2),atrim=0:1.6,afade=t=out:st=1.35:d=0.25[o]" "$T/s_gunner.wav" "$Q/light_match.wav"
TOP=-2 fx drownedsailor "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,lowpass=f=1800,volume=0.3,adelay=200[b];[a][b]$(mix 2),atrim=0:1.9,afade=t=out:st=1.55:d=0.35[o]" "$T/s_drownedsailor.wav" "$E/gurgling.wav"
TOP=-2 fx ghostparrot "[0:a]$P[a];[1:a]$P,volume=0.25[b];[a][b]$(mix 2),atrim=0:1.3,afade=t=out:st=1.0:d=0.3[o]" "$T/s_ghostparrot.wav" "$R/cloth2.ogg"
TOP=-2 fx tentacle "[0:a]$P[a];[1:a]$P,volume=0.35,adelay=650[b];[a][b]$(mix 2),atrim=0:1.3,afade=t=out:st=1.0:d=0.3[o]" "$T/s_tentacle.wav" "$G/squelching_2.wav"
TOP=-2 fx rat "$P" "$T/s_rat.wav"
# fiender: Laboratoriet
TOP=-2 fx homunculus "$P" "$T/s_homunculus.wav"
TOP=-2 fx ooze "[0:a]$P[a];[1:a]$P,atrim=2:3.4,asetpts=PTS-STARTPTS,asetrate=29400,aresample=44100,lowpass=f=1200,volume=0.3,afade=t=in:d=0.2,afade=t=out:st=1.5:d=0.6[b];[a][b]$(mix 2),atrim=0:1.4,afade=t=out:st=1.1:d=0.3[o]" "$T/s_ooze.wav" "$E/water_boiling_loop.wav"
TOP=-2 fx apprentice "[0:a]$P[a];[1:a]$P,volume=0.15[b];[a][b]$(mix 2),atrim=0:1.8,afade=t=out:st=1.5:d=0.3[o]" "$T/s_apprentice.wav" "$R/cloth3.ogg"
TOP=-2 fx mercurygolem "[0:a]$P[a];[1:a]$P,asetrate=29400,aresample=44100,lowpass=f=3000,volume=0.25[b];[a][b]$(mix 2),atrim=0:1.6,afade=t=out:st=1.25:d=0.35[o]" "$T/s_mercurygolem.wav" "$X/metal_clang.wav"
TOP=-2 fx vialwisp "[0:a]$P[a];[1:a]$P,volume=0.3,adelay=100[b];[a][b]$(mix 2),atrim=0:1.4,afade=t=out:st=1.1:d=0.3[o]" "$T/s_vialwisp.wav" "$I/impactGlass_light_002.ogg"
TOP=-2 fx chimera "$P" "$T/s_chimera.wav"
# bossar
TOP=-2 fx captain_laugh "$P" "$T/s_captain_laugh.wav"
TOP=-2 fx captain_shout "[0:a]$P[a];[1:a]$P,volume=0.2,adelay=850[b];[a][b]$(mix 2),atrim=0:1.6,afade=t=out:st=1.2:d=0.4[o]" "$T/s_captain_shout.wav" "$W/sword_unsheath.wav"
TOP=-2 fx alchemist_laugh "$P" "$T/s_alchemist_laugh.wav"
fx alchemist_drink "[0:a]$P[a];[1:a]$P,volume=0.25,adelay=180[b];[a][b]$(mix 2),atrim=0:2.2,afade=t=out:st=1.85:d=0.35[o]" "$T/s_alchemist_drink.wav" "$Q/drink_slurp.wav"
# skeppet: kanonen, kanonkulan, plankorna, vågorna, knarret
fx cannon_fire "[0:a]$P[a];[1:a]$P,asetrate=29400,aresample=44100,lowpass=f=1500,volume=0.35[b];[2:a]$P,volume=0.4[c];[a][b][c]$(mix 3),atrim=0:2.4,afade=t=out:st=1.9:d=0.5[o]" "$T/s_cannon_fire.wav" "$Z/explosion_large.wav" "$W/harsh_thud.wav"
fx cannonball_land "[0:a]$P[a];[1:a]$P,volume=0.5,adelay=500[b];[a][b]$(mix 2),atrim=0:1.6,afade=t=out:st=1.2:d=0.4[o]" "$T/s_cannonball_land.wav" "$I/impactWood_heavy_001.ogg"
fx plank_break "[0:a]$P[a];[1:a]$P,volume=0.5,adelay=400[b];[2:a]$P,volume=0.25[c];[a][b][c]$(mix 3),atrim=0:1.5,afade=t=out:st=1.15:d=0.35[o]" "$T/s_plank_break.wav" "$I/impactPlank_medium_002.ogg" "$R/creak3.ogg"
fx wave_wash "[0:a]$P[a];[1:a]$P,volume=0.35,adelay=800[b];[a][b]$(mix 2),atrim=0:2.6,afade=t=out:st=2.2:d=0.4[o]" "$T/s_wave_wash.wav" "$E/water_splashing.wav"
TOP=-4 fxloop ship_creak 3 0.8 "[0:a]$P[a];[1:a]$P,lowpass=f=3000,volume=0.2,adelay=1300[b];[a][b]$(mix 2),atrim=0:3.8[o]" "$T/s_ship_creak.wav" "$R/creak1.ogg"
# laboratoriet: kolvarna, teslaspolen, syran, flaskorna, transmutationen, alembiken
TOP=-4 fxloop lab_bubble 3 0.8 "[0:a]$P[a];[1:a]$P,atrim=2:5.8,asetpts=PTS-STARTPTS,lowpass=f=2500,volume=0.3[b];[a][b]$(mix 2),atrim=0:3.8[o]" "$T/s_lab_bubble.wav" "$E/water_boiling_loop.wav"
fx tesla_zap "[0:a]$P[a];[1:a]$P,atrim=0:0.6,asetpts=PTS-STARTPTS,highpass=f=1500,volume=0.15,adelay=180,afade=t=out:st=0.4:d=0.4[b];[a][b]$(mix 2),atrim=0:1.0,afade=t=out:st=0.7:d=0.3[o]" "$T/s_tesla_zap.wav" "$K/razor_buzz.wav"
fx acid_hiss "[0:a]$P[a];[1:a]$P,atrim=0:1.4,asetpts=PTS-STARTPTS,highpass=f=2000,volume=0.2,afade=t=in:d=0.05,afade=t=out:st=0.5:d=0.9[b];[a][b]$(mix 2),atrim=0:1.4,afade=t=out:st=1.1:d=0.3[o]" "$T/s_acid_hiss.wav" "$E/water_boiling_loop.wav"
fx flask_break "[0:a]$P[a];[1:a]$P,volume=0.45[b];[2:a]$P,volume=0.2[c];[a][b][c]$(mix 3),atrim=0:1.2,afade=t=out:st=0.9:d=0.3[o]" "$T/s_flask_break.wav" "$I/impactGlass_medium_001.ogg" "$E/water_splashing.wav"
fx transmute "[0:a]$P[a];[1:a]$P,volume=0.2,adelay=300[b];[a][b]$(mix 2),atrim=0:1.7,afade=t=out:st=1.3:d=0.4[o]" "$T/s_transmute.wav" "$X/glass_ping_big.wav"
fx alembic_brew "[0:a]$P[a];[1:a]$P,atrim=0:1.6,asetpts=PTS-STARTPTS,volume=0.25,afade=t=in:d=0.3,afade=t=out:st=1.1:d=0.5[b];[2:a]$P,volume=0.15,adelay=1500[c];[a][b][c]$(mix 3),atrim=0:2.0,afade=t=out:st=1.65:d=0.35[o]" "$T/s_alembic_brew.wav" "$E/water_boiling_loop.wav" "$X/glass_ping_small.wav"
# vapen: kedjekulekanonen och syrasprutan
fx chain_fire "[0:a]$P[a];[1:a]$P,volume=0.5[b];[a][b]$(mix 2),atrim=0:1.1,afade=t=out:st=0.8:d=0.3[o]" "$T/s_chain_fire.wav" "$W/shot_muffled.wav"
fx chain_hit "[0:a]$P[a];[1:a]$P,volume=0.4[b];[2:a]$P,volume=0.25[c];[a][b][c]$(mix 3),atrim=0:0.7,afade=t=out:st=0.45:d=0.25[o]" "$T/s_chain_hit.wav" "$I/impactMetal_heavy_002.ogg" "$G/crunch_splat.wav"
TOP=-4 fxloop acid_spray 1.8 0.4 "[0:a]$P[a];[1:a]$P,atrim=0:2.2,asetpts=PTS-STARTPTS,highpass=f=1200,volume=0.15[b];[a][b]$(mix 2),atrim=0:2.2[o]" "$T/s_acid_spray.wav" "$E/water_babbling_loop.wav"
fx acid_hit "[0:a]$P[a];[1:a]$P,volume=0.35[b];[a][b]$(mix 2),atrim=0:0.7,afade=t=out:st=0.45:d=0.25[o]" "$T/s_acid_hit.wav" "$G/splat_quick.wav"
# biomernas drönare
TOP=-4 fxloop ship_hum 4 0.8 "[0:a]$P[a];[1:a]$P,atrim=1:5.8,asetpts=PTS-STARTPTS,lowpass=f=1500,volume=0.2[b];[a][b]$(mix 2)[o]" "$T/s_ship_hum.wav" "$E/ambient_wind.wav"
TOP=-4 fxloop lab_hum 4 0.8 "[0:a]$P[a];[1:a]$P,atrim=4:8.8,asetpts=PTS-STARTPTS,lowpass=f=900,volume=0.12[b];[a][b]$(mix 2)[o]" "$T/s_lab_hum.wav" "$E/water_boiling_loop.wav"

for f in "$O"/{ghostpirate,gunner,drownedsailor,ghostparrot,tentacle,rat,homunculus,ooze,apprentice,mercurygolem,vialwisp,chimera,captain_laugh,captain_shout,alchemist_laugh,alchemist_drink,cannon_fire,cannonball_land,plank_break,wave_wash,ship_creak,lab_bubble,tesla_zap,acid_hiss,flask_break,transmute,alembic_brew,chain_fire,chain_hit,acid_spray,acid_hit,ship_hum,lab_hum}.ogg; do printf '%-40s %6.2f s %5d kB\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" "$(( $(stat -c %s "$f") / 1024 ))"; done
for f in "$M"/ship.ogg "$M"/ship_hi.ogg "$M"/lab.ogg "$M"/lab_hi.ogg "$M"/boss17.ogg "$M"/boss18.ogg; do printf '%-36s %6.2f s %5d kB %6s LUFS\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" "$(( $(stat -c %s "$f") / 1024 ))" "$(lufs "$f")"; done
