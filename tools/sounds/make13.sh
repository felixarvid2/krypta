#!/bin/bash
# Ljud för Krypta version 16 ("Trädgården och Drömriket"): trädgårdssaxen (klipp, träff, det snurrande kastet, fångsten) och
# drömstaven (stjärnan, sömnexplosionen, drömflaskan), Den döda trädgården (stenängeln som skrapar, taggrankan,
# trädgårdsmästaren, taggrankor som brinner, fontänen, trädgårdens vind), Drömriket (drömätaren, speglingen och dess skott,
# sömngångaren och sömnpulvret, den glidande väggen, sömnens dimma, den falska dörren, drömrikets drönare), bossarna
# trädgårdsmästaren och Jon Blund, och musiken garden (+ garden_hi), dream (+ dream_hi), boss15 och boss16. _hi-filerna är
# tidslinjerade intensitetslager: samma längd och samma taktnät som grundspåret, så att spelet kan tona in dem ovanpå.
# Samma konventioner som make2.sh-make10.sh: effekter mono 22 kHz Vorbis q2 toppnormaliserade till $TOP dBFS
# (standard -1, röster och skrap -2, slingor -4), musik stereo 44,1 kHz Vorbis q1 linjärt förstärkt till mål-LUFS,
# alla slingor bär LOOPLENGTH=<sampel> i Vorbis-kommentaren och effektslingorna vrids så att skarven
# hamnar där signalen är tyst och flack.
# Källor: assets/audio (Kenney-paketen CC0: impact-sounds, rpg-audio; 400 Sounds Pack CC0).
# Saxen, magin, röster (morr, viskningar, snarkningar, skratt, speglingens "eko" av spelaren), sten, sand, löv, eld,
# fåglar, slingorna och all musik syntetiseras med python3 + numpy (inbäddat nedan).
# Deterministiskt: fast frö för slumptalen och -fflags +bitexact (annars slumpar Ogg-muxern serienumret).
# Kör från katalogen där retrofps/ (repot) och assets/audio/ ligger: bash retrofps/tools/sounds/make13.sh
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

cat > "$T/synth13.py" <<'PY'
# Syntetiserade effekter och musik för Krypta version 16. Användning: python3 synth13.py <katalog>
# Musikslingan läggs med "wrap" (toner som går över slutet läggs på början), efterklangen är en cirkulär
# faltning och liggande toner/brus har ett helt antal perioder på slingan, så slingan är sömlös.
# Byggstenarna nedan är desamma som i make10.sh; nya står under "sax, löv, sten, sand, sömn och speldosa".
import sys, wave, re, subprocess, numpy as np
SR = 44100
OUT = sys.argv[1]
rng = np.random.default_rng(16016)
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

# ================= effekter =================
# ---- vapen: trädgårdssaxen och drömstaven ----
def shears_snip():  # trädgårdssaxen: ett kort svisch och ett klipp (bladen gnisslar mot varandra och slår ihop); game.js spelar
    # ljudet en gång per klipp (två eller tre klipp per hugg, 120 ms isär), så filen har bara ett
    d = 0.32; y = np.zeros(int(d * SR))
    place(y, 0, swish(0.1, 900, 3000, 2.0), 0.3)
    place(y, 0.015, snip(1.0, 3500), 0.9)
    return cut(verb(y, 0.3, 0.12, 8000), d, 0.12)

def shears_hit():  # saxen klipper i kött: ett hårt klipp, ett blött skär och en dov träff
    d = 0.5; y = np.zeros(int(d * SR))
    place(y, 0, snip(1.0, 3000, 0.03), 0.8); place(y, 0.03, splat(0.25), 0.6); place(y, 0.03, thud(120, 0.25, 0.0), 0.5)
    place(y, 0.03, swish(0.1, 3000, 1200, 2.5), 0.25)
    return cut(verb(y, 0.35, 0.1, 6000), d, 0.15)

def shears_throw():  # saxen kastas och snurrar: svisch, en vinande luftpuls (14 varv/s) med blad som blänker till varje varv,
    # och som drar bort och mörknar
    d = 1.0; t = tt(d); y = np.zeros(len(t))
    place(y, 0, swish(0.15, 600, 2500, 2.0), 0.4)
    a = np.interp(t, [0, 0.06, 0.5, d], [0, 1, 0.7, 0])
    spin = 0.15 + 0.85 * (0.5 + 0.5 * np.sin(2 * np.pi * 14 * t)) ** 3
    fc = 1500 * (1 + 0.25 * np.sin(2 * np.pi * 1.2 * t)) * np.interp(t, [0, d], [1, 0.75])
    y += nrm(svf(noise(d), fc, 2.0)) * spin * a * 0.6 + nrm(fftfilt(noise(d), 150, 500)) * spin * a * 0.2
    for k in range(13):
        t0 = 0.05 + k / 14
        if t0 < d - 0.1: place(y, t0, ting(0.08, 4200 * (1 - 0.15 * t0), 1, 3.0), 0.12 * a[int(t0 * SR)])
    return cut(verb(y, 0.4, 0.15, 7000), d, 0.25)

def shears_catch():  # saxen fångas: metallklick och ting när bladen slår ihop i handen, ett dovt handgrepp
    d = 0.4; y = np.zeros(int(d * SR))
    place(y, 0, clack(1800, 1, 300, 0.04), 0.7); place(y, 0, ting(0.3, 3100, 0.4, 2.0)); place(y, 0.005, thud(150, 0.15, 0.0), 0.4)
    place(y, 0.04, snip(0.5, 3600, 0.02))
    return cut(verb(y, 0.3, 0.1, 7000), d, 0.15)

def dream_fire():  # drömstaven: ett mjukt "fwhoom", en stjärna som tänds med glittrande klockspel och en svävande glaston som glider upp
    d = 1.1; y = np.zeros(int(d * SR))
    place(y, 0, puff(0.4, 200, 2200, 1.0, 0.2), 0.5)
    for i, n in enumerate((79, 83, 86, 91, 95)): place(y, 0.02 + 0.045 * i, bar(m2f(n), 0.7, 0.18, dec=3.5))
    tg = tt(0.9); f = m2f(86) * 2 ** (0.5 * tg / 0.9)
    place(y, 0.03, (np.sin(phase(f)) + 0.5 * np.sin(phase(f * 1.004))) * np.interp(tg, [0, 0.1, 0.9], [0, 1, 0]) ** 1.5, 0.12)
    place(y, 0.05, glitter(0.9, 18, 88, 103), 0.25)
    place(y, 0.02, swish(0.7, 700, 3000, 2.0), 0.2)
    return cut(verb(y, 1.0, 0.35, 9000), d, 0.35)

def dream_burst():  # sömnexplosionen: en mjuk duns, en spröd klang av glas som brister, ett sövande sus som sjunker och glitter
    d = 1.6; t = tt(d); y = np.zeros(len(t))
    place(y, 0, thud(70, 0.4, 0.0), 0.45); place(y, 0, puff(0.5, 300, 4000, 1.0, 0.06), 0.6)
    for n in (86, 90, 93, 98, 102): place(y, rng.uniform(0, 0.015), crys(m2f(n), 1.2, 0.22, rng.uniform(1.6, 2.6), 0.004))
    place(y, 0, shards(1.3, 25, 0.8, 3000, 9000), 0.3)
    a = np.interp(t, [0, 0.03, 0.4, d], [0, 1, 0.6, 0]) ** 1.2
    y += nrm(svf(noise(d), np.interp(t, [0, d], [3500, 500]), 0.7, 'lp')) * a * 0.45
    tg = tt(1.2); place(y, 0.05, np.sin(phase(m2f(81) * 2 ** (-tg / 1.2))) * np.exp(-tg * 2.5), 0.1)
    place(y, 0.1, glitter(1.3, 22, 86, 100), 0.2)
    return cut(verb(y, 1.4, 0.4, 8000), d, 0.45)

def dream_pickup():  # drömflaskan: ett glasklink, en liten luftvirvel och fyra speldosetoner som stiger
    d = 0.9; y = np.zeros(int(d * SR))
    place(y, 0, crys(2400, 0.4, 0.5, 4.0)); place(y, 0.03, crys(3300, 0.3, 0.3, 5.0))
    place(y, 0.04, swish(0.3, 1000, 4000, 2.5), 0.15)
    for i, n in enumerate((84, 88, 91, 96)): place(y, 0.1 + 0.07 * i, mbox(n, 0.6, 0.22))
    return cut(verb(y, 0.8, 0.3, 9000), d, 0.25)

# ---- fiender: Den döda trädgården ----
def angel_scrape():  # stenängeln rör sig: tung sten som skrapar mot sten i ett ryck, grus som smular och ett dovt stopp
    d = 1.1; t = tt(d); y = np.zeros(len(t))
    y += stonescrape(d, 160, 1.0, (14, 26)) * np.interp(t, [0, 0.05, 0.6, 0.75, d], [0, 1, 0.9, 0, 0])
    place(y, 0.72, thud(55, 0.35, 0.3), 0.35)  # stoppet hålls svagt: game.js spelar skrapet om var 0,8-1,4 s medan ängeln rör sig
    place(y, 0.1, debris(0.9, 18, 600, 3500, 0.6), 0.3)
    return cut(verb(fftfilt(y, 30, 7000), 0.6, 0.18, 4000), d, 0.25)

def thornvine():  # taggrankan: prasslande löv, knakande stjälkar, ett vinande piskslag och torra kvistar som knäcks
    d = 1.3; t = tt(d); y = np.zeros(len(t))
    y += rustle(d, np.interp(t, [0, 0.2, 0.6, d], [0.3, 1, 0.8, 0.1]), 1500, 8000) * 0.45 * env(len(t), 0.05, 0.3)
    place(y, 0.05, creak(0.6, 12, 30, 380), 0.3)
    place(y, 0.45, swish(0.18, 800, 4500, 3.0), 0.5); place(y, 0.6, crack(0.06, 0.6, 2000))
    for t0 in (0.15, 0.32, 0.7, 0.95): place(y, t0, twig(), rng.uniform(0.35, 0.6))
    return cut(verb(y, 0.5, 0.15, 6000), d, 0.3)

def gardener():  # trädgårdsmästaren: ett rosslande, zombieaktigt morr och saxen som klipper i luften (klipp-klipp ... klipp)
    d = 1.6; t = tt(d); y = np.zeros(len(t))
    f0 = np.interp(t, [0, 0.3, 0.9, d], [75, 95, 85, 65]); a = np.interp(t, [0, 0.12, 1.0, d], [0, 1, 0.8, 0])
    y += growl(d, f0, [(np.interp(t, [0, 0.6, d], [500, 700, 450]), 90, 1), (1100, 130, 0.5), (2500, 220, 0.15)], 0.6, 0.5, 4500, 2.2) * a * 0.6
    for t0 in (0.55, 0.72, 1.15): place(y, t0, snip(1.0, rng.uniform(3200, 3800), 0.04), 0.55)
    return cut(verb(y, 0.6, 0.18, 5000), d, 0.3)

# ---- fiender: Drömriket ----
def dreameater():  # drömätaren: ett långt sugande andetag, viskningar som sugs baklänges in i det, ett blött smack och ett ihåligt sus
    d = 1.9; t = tt(d); y = np.zeros(len(t)); c = 1.1
    u = np.clip(t / c, 0, 1); a = np.where(t < c, u ** 1.5, np.exp(-(t - c) * 8))
    y += nrm(svf(noise(d), 400 * 8 ** u, 2.5)) * a * 0.5
    w = (whisper(1.0, (EH, AA, OH), 6, 1.0, 0.7) * env(int(1.0 * SR), 0.1, 0.2))[::-1]
    place(y, c - 1.0, w * np.linspace(0.3, 1, len(w)), 0.5)
    place(y, c, splat(0.2), 0.25); place(y, c - 0.05, bubbles(0.3, 6, 300, 900), 0.2)
    y += (np.sin(2 * np.pi * 110 * t) + 0.5 * np.sin(2 * np.pi * 163 * t)) * np.interp(t, [0, 0.4, 1.4, d], [0, 1, 0.7, 0]) * 0.06
    return cut(verb(fftfilt(y, 50, 8000), 1.2, 0.35, 5000), d, 0.4)

def doppelganger():  # speglingen: ett mänskligt "hhuh!" (som spelarens eget stön), först baklänges, sedan i ett förvrängt eko
    # av kopior som sjunker och stiger (ringmodulerade) och en kall glaston
    d = 1.5; y = np.zeros(int(d * SR)); dv = 0.45; tv = tt(dv)
    f0 = np.interp(tv, [0, 0.08, dv], [150, 135, 100]); F = [(np.interp(tv, [0, dv], [650, 520]), 100, 1), (1150, 130, 0.5), (2600, 200, 0.2)]
    def hu(r):
        v = nrm(voice(f0 * r, F, 6000, jitter=0.02, roll=0.6)) + 0.4 * nrm(reson(noise(dv), HA))
        return v * env(len(tv), 0.015, 0.3) * np.exp(-tv * 3)
    place(y, 0, hu(1.0)[::-1] * np.linspace(0, 1, len(tv)) ** 2, 0.35)
    for k, (r, g) in enumerate(((1, 1), (0.89, 0.6), (1.12, 0.45), (0.79, 0.32), (1.26, 0.22))):
        h = hu(r)
        if k: h = h * (0.6 + 0.4 * np.sin(2 * np.pi * 70 * tv))
        place(y, 0.42 + 0.16 * k, h, g)
    place(y, 0.4, glass(81, 1.0, 0.08, att=0.05, rel=0.6))
    return cut(verb(y, 1.2, 0.35, 6000), d, 0.35)

def doppel_fire():  # speglingens skott: ett baklänges sug in i en mörk smäll (spelarens skott i spegeln) och ett förvrängt, sjunkande eko
    d = 0.9; y = np.zeros(int(d * SR)); c = 0.12
    rv = (crack(0.12, 1.0, 1000) + thud(90, 0.12, 0.0) * 0.5)[::-1]; place(y, 0, rv * np.linspace(0, 1, len(rv)) ** 2, 0.4)
    s = crack(0.1, 0.8, 900); s = np.concatenate([s, np.zeros(int(0.25 * SR))]); place(s, 0, thud(70, 0.35, 0.2), 0.8)
    place(y, c, s)
    ts = np.arange(len(s)) / SR
    for k in range(1, 4): place(y, c + 0.11 * k, fftfilt(s, 100, 4000 / k) * (0.6 + 0.4 * np.sin(2 * np.pi * 55 * k * ts)), 0.45 / k)
    return cut(verb(y, 0.7, 0.25, 5000), d, 0.25)

def sleepwalker():  # sömngångaren: en rosslande snarkning, ett lågt, sömnigt stön som sjunker och ett smackande andetag
    d = 2.0; y = np.zeros(int(d * SR))
    place(y, 0, snore(0.8, 30, 220, 800), 0.7)
    dm = 1.0; tm = tt(dm); f0 = np.interp(tm, [0, 0.2, dm], [130, 140, 95]); e = env(len(tm), 0.15, 0.45)
    place(y, 0.85, growl(dm, f0, [(np.interp(tm, [0, dm], [560, 420]), 90, 1), (850, 110, 0.45), (2500, 200, 0.1)], 0.3, 0.3, 4000, 1.4) * e, 0.45)
    place(y, 0.85, nrm(reson(noise(dm), OH)) * e, 0.12)
    place(y, 1.85, splat(0.12), 0.08)
    return cut(verb(y, 0.7, 0.2, 5000), d, 0.3)

def sleep_puff():  # sömngångaren brister i sömnpulver: ett mjukt "pfff", pulver som yr, en gäspande ton som sjunker och glitter
    d = 1.3; t = tt(d); y = np.zeros(len(t))
    place(y, 0, puff(0.5, 200, 3500, 1.0, 0.08)); place(y, 0, thud(90, 0.25, 0.0), 0.35)
    a = np.interp(t, [0, 0.05, 0.5, d], [0, 1, 0.5, 0])
    y += nrm(grains(d, 2500, 3000, 10000, 0.002)) * a * 0.2 + nrm(svf(noise(d), np.interp(t, [0, d], [3000, 800]), 0.7, 'lp')) * a * 0.3
    tg = tt(0.9); place(y, 0.05, np.sin(phase(m2f(76) * 2 ** (-0.7 * tg / 0.9))) * np.interp(tg, [0, 0.1, 0.9], [0, 1, 0]), 0.1)
    place(y, 0.05, glitter(1.0, 14, 86, 100), 0.18)
    return cut(verb(y, 1.0, 0.3, 7000), d, 0.35)

# ---- bossar ----
def gardener_laugh():  # trädgårdsmästaren skrattar: ett djupt, rosslande "ho-ho-ho-hooo" som ekar mellan häckarna, saxen klipper i takt
    d = 2.4; y = np.zeros(int(d * SR))
    steps = [(105, 0.16), (100, 0.16), (95, 0.16), (110, 0.6)]
    place(y, 0, laugh(steps, OH, AA, 0.9, 0.7, 0.6, 0.5, 2.0))
    t0 = 0.03
    for _, dd in steps: place(y, t0, snip(1.0, 3500, 0.03), 0.3); t0 += dd + 0.06
    e0 = y.copy(); place(y, 0.3, e0, 0.3); place(y, 0.6, e0, 0.12)
    return cut(verb(y, 1.4, 0.35, 5000), d, 0.5)

def gardener_seeds():  # trädgårdsmästaren sår: en hand som kastar (svisch), frön som smattrar på jorden och rötter som knakar upp ur marken
    d = 1.6; y = np.zeros(int(d * SR))
    place(y, 0, swish(0.25, 500, 2500, 2.0), 0.4)
    for _ in range(45):
        dd = 0.02; place(y, 0.2 + 0.6 * rng.uniform(0, 1) ** 1.3, nrm(reson(noise(dd), [(rng.uniform(2500, 5000), 400, 1)])) * np.exp(-tt(dd) * 300), rng.uniform(0.1, 0.4))
    place(y, 0.7, creak(0.7, 8, 22, 260), 0.35)
    for t0 in (0.85, 1.1, 1.25): place(y, t0, twig(), 0.35)
    place(y, 0.7, nrm(fftfilt(noise(0.8), 60, 500)) * np.sin(np.pi * tt(0.8) / 0.8) ** 2, 0.35)
    return cut(verb(y, 0.6, 0.18, 5000), d, 0.35)

def sandman_laugh():  # Jon Blund skrattar: ett mjukt, luftigt och kusligt "hm-hm-hm-haaa" i falsett som ekar, och en speldosa
    # som klingar ostämt nedåt
    d = 2.6; y = np.zeros(int(d * SR)); t0 = 0.1
    steps = [(330, 0.14, MM), (350, 0.14, MM), (370, 0.14, MM), (392, 0.7, AA)]
    for i, (f, dd, F) in enumerate(steps):
        last = i == len(steps) - 1; dl = dd + 0.2; k = tt(dl)
        f0 = np.interp(k, [0, dd], [f, f * (0.75 if last else 0.96)]) * (1 + 0.012 * np.sin(2 * np.pi * 6 * k))
        v = nrm(voice(f0, F, 6000, jitter=0.004, roll=1.0)) * 0.5 + nrm(reson(noise(dl), F)) * 0.6
        e = np.clip(k / 0.03, 0, 1) * (np.clip((dd + 0.15 - k) / 0.55, 0, 1) if last else np.exp(-k * 8) * np.clip((dd + 0.08 - k) / 0.08, 0, 1))
        place(y, t0, v * e); t0 += dd + 0.05
    e0 = y.copy(); place(y, 0.22, e0, 0.25); place(y, 0.45, e0, 0.1)
    for i, n in enumerate((88, 84, 81, 77, 76)): place(y, 0.9 + 0.17 * i, wbox(n, 1.0, 0.13, 0.008))
    return cut(verb(y, 1.8, 0.45, 7000), d, 0.5)

def sandman_sand():  # Jon Blunds sand: en ström av rinnande sand som sväller och ebbar, ett mjukt sus och glitter som strös
    d = 1.9; t = tt(d); a = np.interp(t, [0, 0.25, 1.3, d], [0, 1, 0.8, 0])
    y = sandpour(d) * a * 0.6
    y += nrm(svf(noise(d), (1200 + 800 * a) * (1 + 0.2 * lpnoise(d, 3)), 1.2)) * a * 0.15
    y += glitter(d, 26, 86, 103) * 0.22
    return cut(verb(y, 1.0, 0.3, 8000), d, 0.4)

# ---- miljö ----
def wall_shift():  # den flytande väggen glider: lågt muller och sten som glider tungt mot sten, grus som rinner och ett dovt stopp
    d = 1.5; t = tt(d); y = np.zeros(len(t)); c = 1.15
    a = np.interp(t, [0, 0.12, c - 0.1, c, d], [0, 1, 0.9, 0, 0])
    y += stonescrape(d, 120, 1.0, (10, 16)) * a * 0.8 + low_rumble(d, 38) * a * 0.5
    place(y, c, thud(48, 0.35, 0.35), 0.7)
    place(y, 0.2, debris(1.0, 15, 500, 3000, 0.8), 0.2)
    return cut(verb(fftfilt(y, 25, 6000), 0.8, 0.22, 3500), d, 0.3)

def thorn_burn():  # taggrankorna brinner: ett "fwoosh" när torrt gräs fattar eld, fräsande, tätt knaster och kvistar som knäpper
    d = 1.5; t = tt(d); a = np.interp(t, [0, 0.08, 0.6, d], [0, 1, 0.7, 0])
    y = nrm(fire(d, 150, 2500, 14, 120)) * a * 0.6 + crackle(d, 500, 2000, 9000, 1.2) * a * 0.5
    y += nrm(fftfilt(noise(d), 3000, 9000)) * (0.7 + 0.3 * lpnoise(d, 20)) * a * 0.12
    y += nrm(svf(noise(d), np.interp(t, [0, 0.12, d], [300, 2500, 1200]), 0.8, 'lp')) * np.interp(t, [0, 0.1, 0.5, d], [0, 1, 0.3, 0]) * 0.5
    for t0 in (0.25, 0.5, 0.8, 1.05): place(y, t0, twig(), 0.25)
    return cut(verb(y, 0.5, 0.15, 6000), d, 0.35)

def mist_whisper():  # sömnens dimma: viskningar som kommer och går, ett kallt sus och en svag, dåsig glaston
    d = 2.2; t = tt(d)
    y = nrm(svf(noise(d), 700 * (1 + 0.3 * lpnoise(d, 1.5)), 1.0, 'lp')) * env(len(t), 0.5, 0.7) * 0.25
    for t0, g, sy in ((0.1, 0.6, 5), (0.6, 0.4, 7), (1.0, 0.35, 4)):
        place(y, t0, whisper(1.0, (OH, EH, AA, EE), sy, 1.0, 0.6) * env(int(1.0 * SR), 0.25, 0.4), g)
    place(y, 0.3, glass(74, 1.8, 0.08, att=0.6, rel=1.0)); place(y, 0.5, glass(80, 1.5, 0.05, att=0.6, rel=0.8))
    return cut(verb(y, 1.6, 0.45, 5000), d, 0.45)

def fountain_drink():  # fontänen: vatten som plaskar i skålen, två klunkar och en läkande, ljus klang
    d = 1.3; y = np.zeros(int(d * SR))
    place(y, 0, bubbles(0.4, 14, 500, 1500, 0.7)); place(y, 0, nrm(fftfilt(noise(0.4), 800, 6000)) * np.exp(-tt(0.4) * 8), 0.25)
    for t0 in (0.35, 0.6): place(y, t0, gulp(), 0.35)
    for i, n in enumerate((79, 83, 86, 91)): place(y, 0.75 + 0.06 * i, ping(m2f(n), 0.6, 0.22, 5))
    return cut(verb(y, 0.9, 0.3, 8000), d, 0.3)

def falsedoor_open():  # den falska dörren: ett långt knarr när den glider upp, och ur mörkret ett kort, gällt och kusligt fniss
    d = 2.2; y = np.zeros(int(d * SR)); t0 = 1.0
    place(y, 0, creak(1.0, 14, 40, 340), 0.55); place(y, 0, clack(900, 1, 150, 0.06), 0.4)
    for i, (f, dd) in enumerate([(620, 0.09), (660, 0.09), (700, 0.09), (740, 0.09), (680, 0.35)]):
        dl = dd + 0.1; k = tt(dl); last = i == 4
        f0 = np.interp(k, [0, dd], [f * 1.05, f * (0.8 if last else 0.95)])
        v = nrm(voice(f0, HA if last else EE, 7000, jitter=0.01, roll=0.8)) * 0.6 + nrm(reson(noise(dl), HA)) * 0.5
        e = np.clip(k / 0.01, 0, 1) * (np.clip((dd + 0.08 - k) / 0.3, 0, 1) if last else np.exp(-k * 14) * np.clip((dd + 0.03 - k) / 0.03, 0, 1))
        place(y, t0, v * e, 0.5); t0 += dd + 0.04
    return cut(verb(y, 1.3, 0.35, 6000), d, 0.4)

def garden_hum(d=4.8):  # den döda trädgården (slinga 4 s): vind som susar i häckarna, löv som prasslar i vågor och en avlägsen fågel
    # (fyra kvitter mitt i slingan, långt från skarven och överlappningen)
    y = nrm(svf(noise(d), 500 * (1 + 0.35 * lpnoise(d, 0.8)), 0.7, 'lp')) * (0.7 + 0.3 * lpnoise(d, 0.6)) * 0.5
    y += nrm(svf(noise(d), 1100 + 400 * lpnoise(d, 1.0), 3.0)) * 0.08
    y += rustle(d, np.clip(lpnoise(d, 1.5) + 0.3, 0.05, 1), 1500, 7000, 1800) * 0.25
    for t0, f, kd in ((1.3, 3300, 0), (1.45, 3100, 0), (2.7, 2800, 1), (2.85, 3400, 2)):
        place(y, t0, fftfilt(bird(f, 0.25 if kd == 2 else 0.11, 1, kd), 1500, 6000), 0.07)
    return verb(y, 1.0, 0.25, 6000, tail=False)

def dream_hum(d=4.8):  # drömrikets drönare (slinga 4 s): en svävande Ebmaj9-klang av smalbandigt brus (så att överlappningen i
    # skarven inte svävar), ett lågt andande sus och en speldosa som spelas baklänges (tre toner som sväller och klipps av mitt i slingan)
    y = nrm(reson(noise(d), [(m2f(39), 0.8, 1), (m2f(46), 1.0, 0.6), (m2f(51), 1.2, 0.5), (m2f(55), 1.4, 0.35), (m2f(58), 1.6, 0.3),
                             (m2f(62), 2.0, 0.2), (m2f(65), 2.0, 0.15)])) * 0.5
    y += nrm(fftfilt(noise(d), 200, 1200)) * 0.05 * (0.6 + 0.4 * lpnoise(d, 0.7))
    for t0, n in ((0.9, 87), (1.9, 82), (2.75, 91)):
        s = mbox(n, 1.0, 1.0)[::-1]; place(y, t0, s * np.linspace(0.3, 1, len(s)), 0.12)
    return y

FX = dict(shears_snip=shears_snip, shears_hit=shears_hit, shears_throw=shears_throw, shears_catch=shears_catch,
          dream_fire=dream_fire, dream_burst=dream_burst, dream_pickup=dream_pickup, angel_scrape=angel_scrape,
          thornvine=thornvine, gardener=gardener, dreameater=dreameater, doppelganger=doppelganger, doppel_fire=doppel_fire,
          sleepwalker=sleepwalker, sleep_puff=sleep_puff, gardener_laugh=gardener_laugh, gardener_seeds=gardener_seeds,
          sandman_laugh=sandman_laugh, sandman_sand=sandman_sand, wall_shift=wall_shift, thorn_burn=thorn_burn,
          mist_whisper=mist_whisper, fountain_drink=fountain_drink, falsedoor_open=falsedoor_open, garden_hum=garden_hum,
          dream_hum=dream_hum)

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


# ---- garden: Den döda trädgården, a-moll, 80 bpm, 12 takter = 36 s (Am F C G | Am F Dm E | F G E E) ----
# grund: vind och prasslande löv i bakgrunden, låga stråkar och en svag drone, harpa i åttondelar, en avlägsen kyrkklocka,
# fåglar här och där, "oo"-kör och okarinamelodi i andra halvan.
# hi: pizzicato i åttondelar, mjuk ramtrumma, shaker, saxklipp på efterslagen (trädgårdsmästaren i fjärran) och en dämpad puls.
def garden():
    b = 0.75; T = 48 * b; base = Loop(T); hi = Loop(T)
    slots = ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E', 'F', 'G', 'E', 'E']
    chord = {'Am': [57, 60, 64], 'F': [57, 60, 65], 'C': [55, 60, 64], 'G': [55, 59, 62], 'Dm': [57, 62, 65], 'E': [56, 59, 64]}
    root = {'Am': 33, 'F': 29, 'C': 36, 'G': 31, 'Dm': 38, 'E': 28}
    base.add(0, base.drone(33, 0.1, h=6, roll=1.6, cyc=3, hi=300))
    base.add(0, base.bed(250, 1200, 0.008, cyc=3)); base.add(0, base.bed(2500, 8000, 0.0015, cyc=5))
    for s, c in enumerate(slots):
        t0 = s * 4 * b; ch = chord[c]; r = root[c]
        base.add(t0 - 0.4, strings([n - 12 for n in ch], 4 * b + 0.9, att=0.8, rel=1.0, g=0.18, hi=1000), -0.25)
        base.add(t0 - 0.2, strings([r + 12], 4 * b + 0.5, att=0.4, rel=0.7, g=0.18, hi=400), 0.1)
        arp = [r + 12, ch[0], ch[1], ch[2], ch[1] + 12, ch[2], ch[1], ch[0]]
        for k8 in range(8): base.add(t0 + k8 * b / 2, pluck(arp[k8], 1.6, 1.4, 0.14 if k8 % 4 == 0 else 0.1), -0.35 + 0.1 * k8)
        if s >= 4: base.add(t0 - 0.3, nrm(choir(ch[1:], 4 * b + 0.8, 0.7, 0.9, 1.0, vib=4.5, F=SOO, hmax=4500)), 0.35, 0.07)
        for k8 in range(8): hi.add(t0 + k8 * b / 2, pizz([r + 12, r + 19, r + 24, r + 19][k8 % 4], 0.5, 0.22 if k8 % 2 == 0 else 0.15), 0.25)
        for tb, g in ((0, 0.5), (1.5, 0.3), (2, 0.4), (3, 0.25), (3.5, 0.3)): hi.add(t0 + tb * b, drum(65, 0.5, g, 0.25, dec=9), 0)
        for k16 in range(16): hi.add(t0 + k16 * b / 4, shaker(0.05 if k16 % 4 == 2 else 0.025), -0.45)
        for tb in (1, 3): hi.add(t0 + tb * b, snip(0.07, 3600, 0.03), 0.5)
        for tb in range(4): hi.add(t0 + tb * b, mpulse(r + 12, 0.3, 0.28), 0.0)
    for t0, f, kd in ((3.1, 3300, 0), (3.25, 3100, 0), (13.4, 2800, 1), (13.55, 3400, 2), (22.2, 3000, 0), (30.7, 2900, 1)):
        base.add(t0, fftfilt(bird(f, 0.25 if kd == 2 else 0.11, 1, kd), 1500, 6000), rng.uniform(-0.8, 0.8), 0.015)
    base.add(0, bell(57, 6.0, 0.035), 0.3); base.add(24 * b, bell(52, 6.0, 0.03), -0.3)
    mel = [(16, 69, 1.5), (17.5, 71, 0.5), (18, 72, 1), (19, 71, 1), (20, 69, 2), (22, 65, 1), (23, 67, 1),
           (24, 65, 2), (26, 69, 1), (27, 74, 1), (28, 71, 3), (31, 68, 1),
           (32, 69, 1.5), (33.5, 72, 0.5), (34, 77, 2), (36, 74, 1), (37, 71, 1), (38, 67, 1.5), (39.5, 69, 0.5),
           (40, 71, 2), (42, 68, 1), (43, 71, 1), (44, 69, 3), (47, 68, 1)]
    for t0, n, dd in mel: base.add(t0 * b, ocarina(n, dd * b + 0.08, 0.13), 0.15)
    base.reverb(3.5, 0.45, 5000, 0.03); hi.reverb(1.6, 0.22, 5000)
    write_aligned((base, 'garden', -20), (hi, 'garden_hi', -23))

# ---- dream: Drömriket, Ess-dur som flyter iväg, 67 bpm, 10 takter = 36 s (Ebmaj7 Bmaj7 Ebmaj7 Abmaj7 | Ebmaj7 Bmaj7 Gmaj7 Abmaj7 |
# Daug Daug) ----
# grund: svajande pad (som genom vatten) och glasharmonika, en speldosa i åttondelar, baklängestoner som sväller in i varje
# ackordbyte, luftigt sus, "oo"-kör och glasmelodi i andra halvan.
# hi: ett mjukt hjärtslag på ettan, ett urverk som tickar i åttondelar, shaker, harpa i sextondelar och en pulserande bas.
def dream():
    b = 0.9; T = 40 * b; base = Loop(T); hi = Loop(T)
    slots = ['Eb', 'B', 'Eb', 'Ab', 'Eb', 'B', 'G', 'Ab', 'D+', 'D+']
    chord = {'Eb': [63, 67, 70, 74], 'B': [59, 63, 66, 70], 'Ab': [60, 63, 67, 68], 'G': [62, 66, 67, 71], 'D+': [62, 66, 70]}
    root = {'Eb': 39, 'B': 35, 'Ab': 32, 'G': 43, 'D+': 38}
    base.add(0, base.bed(300, 1500, 0.006, cyc=2)); base.add(0, base.bed(3000, 9000, 0.0015, cyc=3))
    for s, c in enumerate(slots):
        t0 = s * 4 * b; ch = chord[c]; r = root[c]
        base.add(t0 - 0.6, wpad([n - 12 for n in ch], 4 * b + 1.2, 0.2, att=1.0, rel=1.2, hi=1100), -0.2)
        base.add(t0 - 0.3, strings([r + 12], 4 * b + 0.6, att=0.6, rel=0.8, g=0.16, hi=380), 0.1)
        for i, n in enumerate(ch[:3]): base.add(t0 - 0.2, glass(n + 12, 4 * b + 0.8, 0.05, att=0.8, rel=1.0), [-0.5, 0.5, 0.0][i])
        rv = mbox(ch[1] + 24, 1.6, 1.0)[::-1]; base.add(t0 - len(rv) / SR, rv * np.linspace(0.2, 1, len(rv)), 0.4, 0.07)
        arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[-1] + 12, ch[2] + 24, ch[-1] + 12, ch[2] + 12, ch[1] + 12]
        for k8 in range(8): base.add(t0 + k8 * b / 2, mbox(arp[k8], 1.8, 0.07 if k8 % 2 else 0.09), 0.45 if k8 % 2 else -0.45)
        if s >= 5: base.add(t0 - 0.3, nrm(choir(ch[:2], 4 * b + 0.8, 0.8, 1.0, 1.0, vib=4.0, F=SOO, hmax=4500)), -0.3, 0.08)
        hi.add(t0, heartbeat(0.35), 0); hi.add(t0 + 2 * b, heartbeat(0.22), 0)
        for k8 in range(8): hi.add(t0 + k8 * b / 2, wblock(2200 if k8 % 2 == 0 else 1700, 0.06 if k8 % 2 == 0 else 0.04), -0.5)
        for k16 in range(16):
            hi.add(t0 + k16 * b / 4, shaker(0.04 if k16 % 4 == 2 else 0.02), 0.5)
            hi.add(t0 + k16 * b / 4, pluck([ch[0], ch[1], ch[2], ch[-1]][k16 % 4] + 12 * (1 + (k16 // 4) % 2), 0.5, 1.2, 0.07 if k16 % 4 == 0 else 0.05), -0.25)
        hi.add(t0, pbass(r + 12, 4 * b, 2 / b, 0.2, 1.8), 0)
    mel = [(20, 78, 2), (22, 75, 1), (23, 73, 1), (24, 74, 3), (27, 78, 1), (28, 79, 2), (30, 75, 2),
           (32, 78, 2), (34, 82, 2), (36, 74, 3), (39, 70, 1)]
    for t0, n, dd in mel: base.add(t0 * b, mel_tone(n, dd * b + 0.1, 0.12), 0.2)
    base.reverb(4.5, 0.55, 5500, 0.04); hi.reverb(2.0, 0.28, 5000)
    write_aligned((base, 'dream', -20), (hi, 'dream_hi', -23))

# ---- boss15: trädgårdsmästaren, d-moll, 120 bpm, 16 takter = 32 s (Dm Bb Gm A | Dm Eb C#dim A, två takter vardera) ----
# kusligt och stråkdrivet: pizzicato-ostinato i åttondelar (med liten sekund för obehaget), låga stråkar som ligger,
# col legno-knack, saxklipp på efterslagen, taiko och bastrumma; melodin i en ensam fiol, i andra halvan med stråktremolo,
# spiccato, mörk kör, virvel och dissonanta glasslag vid ackordbytena.
def boss15():
    b = 0.5; T = 64 * b; L = Loop(T)
    slots = ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Eb', 'C#o', 'A']
    chord = {'Dm': [62, 65, 69], 'Bb': [62, 65, 70], 'Gm': [62, 67, 70], 'A': [61, 64, 69], 'Eb': [63, 67, 70], 'C#o': [61, 64, 67]}
    root = {'Dm': 38, 'Bb': 34, 'Gm': 31, 'A': 33, 'Eb': 39, 'C#o': 37}
    mel = [(0, 74, 2), (2, 77, 1), (3, 76, 1), (4, 74, 2), (6, 69, 2), (8, 70, 2), (10, 74, 1), (11, 77, 1), (12, 82, 3), (15, 81, 1),
           (16, 79, 2), (18, 74, 1), (19, 77, 1), (20, 76, 2), (22, 74, 2), (24, 73, 3), (27, 76, 1), (28, 81, 3), (31, 79, 1),
           (32, 74, 2), (34, 77, 1), (35, 81, 1), (36, 86, 3), (39, 85, 1), (40, 87, 2), (42, 82, 1), (43, 79, 1), (44, 75, 3), (47, 74, 1),
           (48, 73, 2), (50, 76, 1), (51, 79, 1), (52, 82, 3), (55, 81, 1), (56, 81, 2), (58, 77, 1), (59, 76, 1), (60, 73, 2), (62, 69, 2)]
    L.add(0, L.bed(30, 220, 0.025, cyc=8)); L.add(0, L.bed(2500, 8000, 0.002, cyc=6))
    for s, c in enumerate(slots):
        t0 = s * 8 * b; ch = chord[c]; r = root[c]; half = s >= 4
        L.add(t0 - 0.2, strings([n - 12 for n in ch], 8 * b + 0.4, att=0.3, rel=0.4, g=0.2, hi=1200, trem=8 if half else 0.0), -0.25)
        L.add(t0 - 0.1, strings([r + 12], 8 * b + 0.2, att=0.2, rel=0.3, g=0.2, hi=420), 0.1)
        L.add(t0 - 0.3, nrm(choir([n - 12 for n in ch], 8 * b + 0.6, 0.4, 0.5, 1.0, vib=4.0, F=OH, hmax=3500)), 0.2, 0.16 if half else 0.1)
        if half:
            for n in (ch[2] + 24, ch[2] + 25): L.add(t0, glasshit(n, 0.07, 1.2), 0.45)
        osti = [r + 12, r + 19, r + 24, r + 19, r + 25, r + 19, r + 24, r + 19]
        for bar_ in range(2):
            t1 = t0 + bar_ * 4 * b
            L.add(t1, taiko(0.5, 38 if bar_ == 0 else 42, 1.4), 0)
            for tb, g in ((0, 0.8), (1.5, 0.5), (2.5, 0.6)): L.add(t1 + tb * b, drum(50, 0.6, 0.55 * g, 0.25, dec=7), 0)
            for k8 in range(8):
                L.add(t1 + k8 * b / 2, pizz(osti[k8], 0.5, 0.3 if k8 % 2 == 0 else 0.22), -0.3)
                L.add(t1 + k8 * b / 2, wblock(2600 if k8 % 2 == 0 else 2200, 0.05 if k8 % 2 == 0 else 0.03), 0.5)
                if k8 % 2: L.add(t1 + k8 * b / 2, snip(0.08, 3500, 0.03), -0.55)
                if half and k8 % 2: L.add(t1 + k8 * b / 2, spicc([n + 12 for n in ch[:2]], 0.16, 0.1, 3500), 0.35)
            if half:
                for tb in (1, 3): L.add(t1 + tb * b, snare(0.22), 0.15)
    for t0, n, dd in mel:
        L.add(t0 * b, strings([n], dd * b + 0.12, att=0.04, rel=0.18, g=0.3 if t0 < 32 else 0.27, hi=4500, vib=0.007), 0.15)
        if t0 >= 32: L.add(t0 * b, strings([n - 12], dd * b + 0.12, att=0.05, rel=0.18, g=0.16, hi=3000, vib=0.006), -0.15)
    for t0 in (0, 32): L.add(t0 * b, crash_cym(0.18, 3.0), 0.3)
    for k in range(8): L.add(T - 2 * b + k * b / 4, pizz(62 + k, 0.3, 0.12 + 0.02 * k), 0.0)
    L.reverb(2.6, 0.36, 4500)
    write_aligned((L, 'boss15', -19))

# ---- boss16: Jon Blund, e-moll, vals (3/4) i 160 bpm, 32 takter = 36 s, fyra fraser à 8 takter
# (Em Em Am Am B7 B7 Em Em | C C Am Am F#dim B7 Em B7) ----
# en speldosa som blir mardröm: fras 1 bara speldosan (melodi och umpa-pa) och ett urverk som tickar; fras 2 pizzicato-bas,
# stråkar på två och tre, "oo"-kör och speldosan som börjar gå ostämd; fras 3 mardrömmen (distad bas och taiko på ettan,
# mörk mässing och virvel på två och tre, kör, stråktremolo, en vinglande, ostämd speldosa och mässingen som dubblar
# melodin); fras 4 lika vild i fyra takter, sedan faller lagren bort tills bara speldosan och urverket finns kvar och
# fjädern dras upp i de två sista takterna, så att slingan börjar om sömlöst med den rena speldosan.
def boss16():
    b = 0.375; T = 96 * b; L = Loop(T)
    phr = [['Em', 'Em', 'Am', 'Am', 'B7', 'B7', 'Em', 'Em'], ['C', 'C', 'Am', 'Am', 'F#o', 'B7', 'Em', 'B7']]
    chord = {'Em': [64, 67, 71], 'Am': [64, 69, 72], 'B7': [63, 66, 69, 71], 'C': [64, 67, 72], 'F#o': [66, 69, 72]}
    root = {'Em': 40, 'Am': 45, 'B7': 47, 'C': 48, 'F#o': 42}
    mA = [(0, 76, 2), (2, 79, 1), (3, 83, 2), (5, 79, 1), (6, 81, 2), (8, 84, 1), (9, 88, 2), (11, 84, 1),
          (12, 83, 2), (14, 78, 1), (15, 75, 2), (17, 78, 1), (18, 79, 1), (19, 78, 1), (20, 76, 1), (21, 76, 2), (23, 71, 1)]
    mB = [(0, 76, 2), (2, 79, 1), (3, 84, 2), (5, 83, 1), (6, 81, 2), (8, 76, 1), (9, 72, 2), (11, 76, 1),
          (12, 78, 2), (14, 81, 1), (15, 83, 2), (17, 75, 1), (18, 79, 1), (19, 78, 1), (20, 76, 1), (21, 75, 2), (23, 71, 1)]
    L.add(0, L.bed(40, 250, 0.012, cyc=4))
    for bar_ in range(32):
        p = bar_ // 8; c = phr[p % 2][bar_ % 8]; ch = chord[c]; r = root[c]; t1 = bar_ * 3 * b
        wild = p == 2 or (p == 3 and bar_ < 28)  # mardrömmen: fras 3 och början av fras 4
        mid = p == 1 or (p == 3 and bar_ < 30)   # fras 2 och avtoningen i fras 4
        det = (0.003, 0.007, 0.014, 0.01 if bar_ < 28 else 0.004)[p]
        for k in range(3): L.add(t1 + k * b, wblock(2400 if k == 0 else 1900, 0.06 if k == 0 else 0.04), -0.5)
        L.add(t1, wbox(r + 24, 1.4, 0.16, det), -0.1)
        for k in (1, 2): L.add(t1 + k * b, wbox(ch[1] + 12, 0.7, 0.08, det) + wbox(ch[-1] + 12, 0.7, 0.07, det), 0.3)
        if mid or wild:
            L.add(t1, pizz(r - 12, 0.8, 0.3), 0.0)
            for k in (1, 2): L.add(t1 + k * b, spicc([n - 12 for n in ch[:3]], 0.2, 0.12 if mid else 0.16, 2500), -0.3)
            L.add(t1 - 0.2, nrm(choir([n - 12 for n in ch[:2]], 3 * b + 0.5, 0.3, 0.4, 1.0, vib=4.5, F=AA if wild else SOO, hmax=4000)), 0.25, 0.16 if wild else 0.09)
        if wild:
            L.add(t1, dbass(r - 12, 3 * b * 0.6, 0.3, 2.6, 900), 0)
            L.add(t1, taiko(0.55, 38, 1.2), 0); L.add(t1, drum(46, 0.6, 0.45, 0.3, dec=6), 0)
            for k in (1, 2): L.add(t1 + k * b, brass([n - 12 for n in ch[:3]], 0.25, att=0.01, rel=0.1, drive=2.8, swell=0.05, lo_fc=400, hi_fc=2200), -0.15, 0.18); L.add(t1 + k * b, snare(0.16), 0.15)
            L.add(t1, strings([n for n in ch[:3]], 3 * b, att=0.1, rel=0.2, g=0.12, hi=3000, trem=10), -0.35)
            if bar_ % 4 == 0: L.add(t1, glasshit(ch[0] + 25, 0.06, 1.0), 0.45); L.add(t1, glasshit(ch[0] + 24, 0.06, 1.0), -0.45)
    for p in range(4):
        for t0, n, dd in (mA, mB)[p % 2]:
            tb = p * 24 + t0; wild = p == 2 or (p == 3 and tb < 84)
            det = (0.003, 0.007, 0.014, 0.01 if tb < 84 else 0.004)[p]; wob = 0.012 if wild else 0.0
            L.add(tb * b, wbox(n + 12, dd * b + 1.2, 0.32 if not wild else 0.36, det, wob), 0.1)
            if wild: L.add(tb * b, brass([n - 12], dd * b + 0.05, att=0.02, rel=0.12, drive=2.4, swell=0.15, hi_fc=2400), -0.1, 0.22)
            elif p == 1: L.add(tb * b, flute(n, dd * b + 0.05, 0.08, att=0.05, rel=0.2), -0.2)
    L.add(48 * b - 1.6, crash_cym(0.15, 3.0)[::-1][-int(1.6 * SR):], 0.3); L.add(48 * b, crash_cym(0.2, 3.0), 0.3)
    L.add(48 * b, thud(38, 1.5, 0.3), 0, 0.35)
    L.add(90 * b, ratchet(6 * b - 0.1, 9, 14, 2600, 3000), 0.3, 0.05)
    L.reverb(3.0, 0.4, 5000)
    write_aligned((L, 'boss16', -19))

for k, f in FX.items(): wr('s_' + k, f())
garden(); dream(); boss15(); boss16()
PY
python3 -I "$T/synth13.py" "$T"

# ---------- musik ----------
mus garden -20 anull "$T/garden.wav"
mus garden_hi -23 anull "$T/garden_hi.wav"
mus dream -20 anull "$T/dream.wav"
mus dream_hi -23 anull "$T/dream_hi.wav"
mus boss15 -19 anull "$T/boss15.wav"
mus boss16 -19 anull "$T/boss16.wav"

# ---------- ljudeffekter ----------
E="$S/Environment"
G="$S/Combat and Gore"
X="$S/Materials"
W="$S/Weapons"
H="$S/Items"
Q="$S/Other"
# vapen: trädgårdssaxen och drömstaven
fx shears_snip "[0:a]$P[a];[1:a]$P,highpass=f=1500,volume=0.2,adelay=15[b];[a][b]$(mix 2),atrim=0:0.32,afade=t=out:st=0.2:d=0.12[o]" "$T/s_shears_snip.wav" "$R/knifeSlice.ogg"
fx shears_hit "[0:a]$P[a];[1:a]$P,volume=0.25[b];[2:a]$P,volume=0.25,adelay=20[c];[a][b][c]$(mix 3),atrim=0:0.5,afade=t=out:st=0.35:d=0.15[o]" "$T/s_shears_hit.wav" "$G/crunch_quick.wav" "$W/sword_slice.wav"
fx shears_throw "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,volume=0.35[b];[a][b]$(mix 2),atrim=0:1.0,afade=t=out:st=0.75:d=0.25[o]" "$T/s_shears_throw.wav" "$Q/whoosh_1.wav"
fx shears_catch "[0:a]$P[a];[1:a]$P,volume=0.5[b];[2:a]$P,volume=0.4,adelay=10[c];[a][b][c]$(mix 3),atrim=0:0.4,afade=t=out:st=0.25:d=0.15[o]" "$T/s_shears_catch.wav" "$R/metalClick.ogg" "$R/handleSmallLeather.ogg"
fx dream_fire "[0:a]$P[a];[1:a]$P,lowpass=f=3000,volume=0.2[b];[a][b]$(mix 2),atrim=0:1.1,afade=t=out:st=0.75:d=0.35[o]" "$T/s_dream_fire.wav" "$Q/whoosh_2.wav"
fx dream_burst "[0:a]$P[a];[1:a]$P,volume=0.3[b];[2:a]$P,lowpass=f=3000,volume=0.25[c];[a][b][c]$(mix 3),atrim=0:1.6,afade=t=out:st=1.15:d=0.45[o]" "$T/s_dream_burst.wav" "$I/impactGlass_light_001.ogg" "$Q/whoosh_2.wav"
fx dream_pickup "[0:a]$P[a];[1:a]$P,volume=0.25[b];[a][b]$(mix 2),atrim=0:0.9,afade=t=out:st=0.65:d=0.25[o]" "$T/s_dream_pickup.wav" "$X/glass_ping_small.wav"
# fiender: Den döda trädgården
TOP=-2 fx angel_scrape "[0:a]$P[a];[1:a]$P,volume=0.5,afade=t=out:st=0.55:d=0.2[b];[2:a]$P,volume=0.3,adelay=60[c];[a][b][c]$(mix 3),atrim=0:1.1,afade=t=out:st=0.85:d=0.25[o]" "$T/s_angel_scrape.wav" "$X/stone_push_short.wav" "$X/concrete_scrape.wav"
TOP=-2 fx thornvine "[0:a]$P[a];[1:a]$P,volume=0.35[b];[2:a]$P,volume=0.2,adelay=50[c];[a][b][c]$(mix 3),atrim=0:1.3,afade=t=out:st=1.0:d=0.3[o]" "$T/s_thornvine.wav" "$H/broom_sweep_1.wav" "$R/creak2.ogg"
TOP=-2 fx gardener "[0:a]$P[a];[1:a]$P,highpass=f=1500,volume=0.25,adelay=550[b];[a][b]$(mix 2),atrim=0:1.6,afade=t=out:st=1.3:d=0.3[o]" "$T/s_gardener.wav" "$R/knifeSlice2.ogg"
# fiender: Drömriket
TOP=-2 fx dreameater "[0:a]$P[a];[1:a]$P,asetrate=29400,aresample=44100,lowpass=f=2500,volume=0.25,adelay=300[b];[a][b]$(mix 2),atrim=0:1.9,afade=t=out:st=1.5:d=0.4[o]" "$T/s_dreameater.wav" "$Q/drink_slurp.wav"
TOP=-2 fx doppelganger "[0:a]$P[a];[1:a]$P,areverse,volume=0.2,afade=t=out:st=0.3:d=0.1[b];[a][b]$(mix 2),atrim=0:1.5,afade=t=out:st=1.15:d=0.35[o]" "$T/s_doppelganger.wav" "$Q/whoosh_2.wav"
fx doppel_fire "[0:a]$P[a];[1:a]$P,asetrate=37485,aresample=44100,volume=0.5,adelay=120[b];[a][b]$(mix 2),atrim=0:0.9,afade=t=out:st=0.65:d=0.25[o]" "$T/s_doppel_fire.wav" "$W/shot_muffled.wav"
TOP=-2 fx sleepwalker "[0:a]$P[a];[1:a]$P,volume=0.2,adelay=1200[b];[a][b]$(mix 2),atrim=0:2.0,afade=t=out:st=1.7:d=0.3[o]" "$T/s_sleepwalker.wav" "$R/cloth1.ogg"
fx sleep_puff "[0:a]$P[a];[1:a]$P,lowpass=f=2000,volume=0.35[b];[a][b]$(mix 2),atrim=0:1.3,afade=t=out:st=0.95:d=0.35[o]" "$T/s_sleep_puff.wav" "$E/air_burst.wav"
# bossar
fx gardener_laugh "$P" "$T/s_gardener_laugh.wav"
fx gardener_seeds "[0:a]$P[a];[1:a]$P,volume=0.3,adelay=150[b];[2:a]$P,volume=0.3,adelay=700[c];[a][b][c]$(mix 3),atrim=0:1.6,afade=t=out:st=1.25:d=0.35[o]" "$T/s_gardener_seeds.wav" "$I/footstep_grass_002.ogg" "$H/shovel_dig.wav"
fx sandman_laugh "$P" "$T/s_sandman_laugh.wav"
fx sandman_sand "[0:a]$P[a];[1:a]$P,highpass=f=2000,volume=0.25,adelay=200[b];[a][b]$(mix 2),atrim=0:1.9,afade=t=out:st=1.5:d=0.4[o]" "$T/s_sandman_sand.wav" "$H/broom_sweep_2.wav"
# miljö: väggen, taggrankorna, dimman, fontänen, den falska dörren, slingor
fx wall_shift "[0:a]$P[a];[1:a]$P,atrim=0:1.3,asetpts=PTS-STARTPTS,volume=0.5,afade=t=out:st=1.0:d=0.2[b];[a][b]$(mix 2),atrim=0:1.5,afade=t=out:st=1.2:d=0.3[o]" "$T/s_wall_shift.wav" "$X/stone_push_long.wav"
fx thorn_burn "[0:a]$P[a];[1:a]$P,volume=0.4[b];[2:a]$P,volume=0.25,adelay=50[c];[a][b][c]$(mix 3),atrim=0:1.5,afade=t=out:st=1.15:d=0.35[o]" "$T/s_thorn_burn.wav" "$E/fire_lighting.wav" "$Q/light_match.wav"
TOP=-2 fx mist_whisper "[0:a]$P[a];[1:a]$P,atrim=0:2.2,asetpts=PTS-STARTPTS,lowpass=f=1500,volume=0.1,afade=t=in:d=0.4,afade=t=out:st=1.6:d=0.6[b];[a][b]$(mix 2),atrim=0:2.2,afade=t=out:st=1.75:d=0.45[o]" "$T/s_mist_whisper.wav" "$Q/ghost_long.wav"
fx fountain_drink "[0:a]$P[a];[1:a]$P,atrim=0:0.6,asetpts=PTS-STARTPTS,volume=0.3,afade=t=out:st=0.4:d=0.2[b];[2:a]$P,volume=0.35,adelay=300[c];[a][b][c]$(mix 3),atrim=0:1.3,afade=t=out:st=1.0:d=0.3[o]" "$T/s_fountain_drink.wav" "$E/water_splashing.wav" "$Q/drink_slurp.wav"
fx falsedoor_open "[0:a]$P[a];[1:a]$P,volume=0.45[b];[2:a]$P,volume=0.2[c];[a][b][c]$(mix 3),atrim=0:2.2,afade=t=out:st=1.8:d=0.4[o]" "$T/s_falsedoor_open.wav" "$E/creaky_door_short.wav" "$R/doorOpen_2.ogg"
TOP=-4 fxloop garden_hum 4 0.8 "[0:a]$P[a];[1:a]$P,atrim=1:5.8,asetpts=PTS-STARTPTS,lowpass=f=1500,volume=0.25[b];[a][b]$(mix 2)[o]" "$T/s_garden_hum.wav" "$E/ambient_wind.wav"
TOP=-4 fxloop dream_hum 4 0.8 "$P" "$T/s_dream_hum.wav"

for f in "$O"/{shears_snip,shears_hit,shears_throw,shears_catch,dream_fire,dream_burst,dream_pickup,angel_scrape,thornvine,gardener,dreameater,doppelganger,doppel_fire,sleepwalker,sleep_puff,gardener_laugh,gardener_seeds,sandman_laugh,sandman_sand,wall_shift,thorn_burn,mist_whisper,fountain_drink,falsedoor_open,garden_hum,dream_hum}.ogg; do printf '%-40s %6.2f s %5d kB\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" "$(( $(stat -c %s "$f") / 1024 ))"; done
for f in "$M"/garden.ogg "$M"/garden_hi.ogg "$M"/dream.ogg "$M"/dream_hi.ogg "$M"/boss15.ogg "$M"/boss16.ogg; do printf '%-36s %6.2f s %5d kB %6s LUFS\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" "$(( $(stat -c %s "$f") / 1024 ))" "$(lufs "$f")"; done
