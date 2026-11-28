#!/bin/bash
# Ljud för Krypta version 13 ("Biblioteket och Gjuteriet"): runboken (runor, sidvirveln) och ångkanonen, Det förbjudna
# biblioteket (flygande bok, bläckslem, arkivariespöke, pulpetboken, bläckflaskan, bibliotekets stillhet), Gjuteriet
# (smältgolem, ångautomat, gnistdrönare, stansen, rullbandet, ångventilen, maskinernas dån), bossarna bibliotekarien och
# smideskolossen, och musiken library (+ library_hi), foundry (+ foundry_hi), boss11 och boss12. _hi-filerna är
# tidslinjerade intensitetslager: samma längd och samma taktnät som grundspåret, så att spelet kan tona in dem ovanpå.
# Samma konventioner som make2.sh-make9.sh: effekter mono 22 kHz Vorbis q2 toppnormaliserade till $TOP dBFS
# (standard -1, röster -2, slingor -4), musik stereo 44,1 kHz Vorbis q1 linjärt förstärkt till mål-LUFS,
# alla slingor bär LOOPLENGTH=<sampel> i Vorbis-kommentaren och effektslingorna vrids så att skarven
# hamnar där signalen är tyst och flack.
# Källor: assets/audio (Kenney-paketen CC0: impact-sounds, rpg-audio; 400 Sounds Pack CC0).
# Röster (bok, slem, spöke, golem, bossar), papper, ånga, el, smält metall, magi, slingorna och all musik
# syntetiseras med python3 + numpy (inbäddat nedan).
# Deterministiskt: fast frö för slumptalen och -fflags +bitexact (annars slumpar Ogg-muxern serienumret).
# Kör från katalogen där retrofps/ (repot) och assets/audio/ ligger: bash retrofps/tools/sounds/make10.sh
set -e
O=retrofps/assets/snd
M=retrofps/assets/music
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

cat > "$T/synth10.py" <<'PY'
# Syntetiserade effekter och musik för Krypta version 13. Användning: python3 synth10.py <katalog>
# Musikslingan läggs med "wrap" (toner som går över slutet läggs på början), efterklangen är en cirkulär
# faltning och liggande toner/brus har ett helt antal perioder på slingan, så slingan är sömlös.
# Byggstenarna nedan är desamma som i make9.sh; nya står under "papper, ånga, el, ugn och orgel".
import sys, wave, re, subprocess, numpy as np
SR = 44100
OUT = sys.argv[1]
rng = np.random.default_rng(13013)
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

# ================= effekter =================
# ---- vapen: runboken och ångkanonen ----
def rune_fire():  # runboken: en snabb bläddring, ett magiskt "fwoom" och en glödande runa som stiger och susar iväg
    d = 0.9; y = np.zeros(int(d * SR))
    place(y, 0, flutter(0.2, 60, 35, 1500, 7000), 0.35)
    place(y, 0.03, puff(0.3, 300, 3500), 0.6)
    tr = tt(0.7); f = 520 * 2 ** (1.2 * tr / 0.7) * (1 + 0.01 * np.sin(2 * np.pi * 11 * tr)); ph = phase(f)
    a = np.interp(tr, [0, 0.04, 0.7], [0, 1, 0]) ** 1.3
    place(y, 0.03, (np.sin(ph) + 0.6 * np.sin(phase(f * 1.5)) + 0.25 * np.sin(2 * ph)) * a, 0.3)
    place(y, 0.03, swish(0.6, 900, 4500, 3.0), 0.3)
    for i, n in enumerate((84, 88, 91)): place(y, 0.04 + 0.05 * i, bar(m2f(n), 0.5, 0.12, dec=5))
    sparks(y, 0.6, 25, 1.0, 0.05)
    return cut(verb(y, 0.8, 0.25, 7000), d, 0.25)

def rune_hit():  # runan träffar: magisk smäll (knall och kristallklang), en ton som faller och gnistrande runrester
    d = 0.8; y = np.zeros(int(d * SR))
    place(y, 0, crack(0.08, 0.6, 1500)); place(y, 0, thud(90, 0.3, 0.0), 0.6); place(y, 0, puff(0.25, 400, 5000, 0.6, 0.05))
    place(y, 0, crys(1900, 0.7, 0.5, 3.0)); place(y, 0, crys(2850, 0.6, 0.3, 3.5))
    tf = tt(0.45); place(y, 0.01, np.sin(phase(1400 * 0.3 ** (tf / 0.45))) * np.exp(-tf * 7), 0.3)
    sparks(y, 0.5, 40, 1.5, 0.08)
    return cut(verb(y, 0.8, 0.25, 8000), d, 0.25)

def page_ward():  # sidvirveln: sidor som rycks ur boken och virvlar upp runt dig (fladder som tätnar och cirklar), ett magiskt ackord
    d = 1.6; t = tt(d); y = np.zeros(len(t))
    a = np.interp(t, [0, 0.25, 1.1, d], [0, 1, 0.8, 0])
    y += flutter(d, 25, 55, 1200, 7000) * a * (0.7 + 0.3 * np.sin(2 * np.pi * 3 * t))
    y += nrm(svf(noise(d), (700 + 1500 * (0.5 + 0.5 * np.sin(2 * np.pi * 2.5 * t))) * (0.6 + 0.4 * a), 2.0)) * a * 0.35
    for i, n in enumerate((69, 72, 76, 81)): place(y, 0.1 + 0.08 * i, glass(n, 1.3, 0.1, att=0.1, rel=0.7))
    place(y, 0.05, crys(2600, 1.0, 0.15, 1.5))
    return cut(verb(y, 1.1, 0.3, 7000), d, 0.4)

def steam_fire():  # ångkanonen: ventilen slår upp (metallklack och dov stöt), en kort kon av skållande ånga som fräser ut och ebbar
    d = 1.0; t = tt(d); y = np.zeros(len(t))
    place(y, 0, clack(1300, 1.0, 200, 0.05), 0.5); place(y, 0, thud(70, 0.35, 0.0), 0.7)
    y += steam(d, [(0, 0), (0.012, 1), (0.15, 0.8), (0.6, 0.25), (d, 0)], 1500, 10000) * 0.7
    y += nrm(svf(noise(d), np.interp(t, [0, 0.1, d], [2500, 1200, 600]), 1.2, 'lp')) * np.interp(t, [0, 0.01, 0.5, d], [0, 1, 0.3, 0]) * 0.5
    place(y, 0.01, bubbles(0.3, 8, 600, 1500), 0.25)
    return cut(verb(y, 0.6, 0.15, 6000), d, 0.25)

def steam_hiss():  # skållande ånga träffar: ett fräsande sizzle mot plåt och hud, knaster och ett pys som dör ut
    d = 0.8; t = tt(d); y = np.zeros(len(t))
    y += steam(d, [(0, 0), (0.01, 1), (0.25, 0.6), (d, 0)], 2500, 10000) * 0.6
    y += crackle(d, 300, 2500, 9000, 1.6) * np.interp(t, [0, 0.02, d], [0, 1, 0]) * 0.5
    place(y, 0, splat(0.15), 0.15)
    return cut(verb(y, 0.4, 0.1, 7000), d, 0.25)

# ---- fiender: Det förbjudna biblioteket ----
def grimoire():  # flygande bok: pärmarna slår som vingar, sidor fladdrar, käkar som smackar och ett gnisslande papperskvitter
    d = 1.2; y = np.zeros(int(d * SR))
    for i in range(6): place(y, 0.18 * i, wing(0.2), 0.45); place(y, 0.18 * i + 0.07, clack(900, 0.6, 250, 0.04), 0.3)
    y += flutter(d, 30, 30, 1500, 7000) * 0.3
    for t0 in (0.35, 0.55, 0.9): place(y, t0, jaw(), 0.6)
    s = squeal(0.35, 1300, 1900); place(y, 0.45, s + 0.4 * nrm(reson(s, [(1800, 60, 1)])), 0.25)
    return cut(verb(y, 0.5, 0.15, 6000), d, 0.25)

def grimoire_bite():  # bokens bett: ett snabbt glufs (två hårda smack), spetsiga tandklick och sidor som rasslar
    d = 0.6; y = np.zeros(int(d * SR))
    place(y, 0, swish(0.08, 800, 2500, 2.0), 0.3)
    place(y, 0.06, jaw(), 1.0); place(y, 0.06, thud(140, 0.15, 0.0), 0.4); place(y, 0.17, jaw(), 0.7)
    for _ in range(5): place(y, 0.06 + rng.uniform(0, 0.03), tick(0.02, 0.4, 3000, 10000, 250))
    place(y, 0.08, flutter(0.3, 40, 20, 1500, 7000), 0.3)
    return cut(verb(y, 0.4, 0.12, 6000), d, 0.2)

def inkslime():  # bläckslemmet: tjockt, blubbande gurgel, ett lågt slemmigt kväkande och smack
    d = 1.3; t = tt(d); y = np.zeros(len(t))
    y += bubbles(d, 45, 150, 600, 0.6, np.interp(t, [0, 0.2, 1.0, d], [0.2, 1, 0.8, 0.1]))
    f0 = np.interp(t, [0, 0.3, 0.8, d], [70, 95, 80, 60])
    y += growl(d, f0, [(np.interp(t, [0, d], [300, 450]), 70, 1), (700, 100, 0.4), (1800, 200, 0.1)], 0.6, 0.6, 3000, 2.0) * env(len(t), 0.1, 0.4) * 0.35
    place(y, 0.1, splat(0.3), 0.5); place(y, 0.8, splat(0.3), 0.4)
    return cut(verb(fftfilt(y, 40, 5000), 0.6, 0.15, 4000), d, 0.3)

def ink_splash():  # bläckstänk: blött plask, droppar som regnar ned och ett slemmigt smack
    d = 0.8; y = np.zeros(int(d * SR))
    place(y, 0, splat(0.35), 1.0); place(y, 0, puff(0.2, 300, 3000), 0.3)
    for _ in range(10): place(y, rng.uniform(0.08, 0.6), bubble(rng.uniform(900, 2200), rng.uniform(0.02, 0.05), 1, 1.2), rng.uniform(0.1, 0.35))
    return cut(verb(y, 0.5, 0.15, 5000), d, 0.25)

def archivist():  # arkivariespöket: en viskande röst med eko, ett ihåligt spökligt vin och prasslande arkivpapper
    d = 1.8; y = np.zeros(int(d * SR))
    w = whisper(1.4, (AA, EH, OH), 5, 1.0, 0.6) * env(int(1.4 * SR), 0.1, 0.4)
    place(y, 0.05, w, 0.8); place(y, 0.25, w, 0.3)
    tw = tt(1.6); f = np.interp(tw, [0, 0.5, 1.6], [420, 520, 380]) * (1 + 0.02 * np.sin(2 * np.pi * 5 * tw))
    place(y, 0.1, (np.sin(phase(f)) + 0.3 * np.sin(phase(f * 1.5))) * env(len(tw), 0.4, 0.6), 0.12)
    place(y, 0.2, flutter(1.2, 12, 8, 2000, 7000), 0.12)
    return cut(verb(y, 1.4, 0.4, 6000), d, 0.4)

def archivist_blink():  # spöket blinkar mellan hyllorna: inandat sug, ett dovt "fump", papper som virvlar och ett kallt skimmer
    d = 0.9; y = np.zeros(int(d * SR)); c = 0.28
    u = tt(c) / c; place(y, 0, nrm(svf(noise(c), 600 * 7 ** u, 3)) * u ** 2, 0.4)
    place(y, c, thud(80, 0.3, 0.0), 0.5); place(y, c, puff(0.25, 300, 3000), 0.5)
    place(y, c, flutter(0.4, 50, 15, 1500, 7000) * np.exp(-tt(0.4) * 4), 0.45)
    for i, n in enumerate((93, 89, 86)): place(y, c + 0.02 + 0.06 * i, glass(n, 0.5, 0.06, att=0.01, rel=0.4))
    return cut(verb(y, 0.9, 0.3, 7000), d, 0.25)

# ---- fiender: Gjuteriet ----
def moltengolem():  # smältgolemen: djupt, stenigt stön (subharmonik), sten som skaver, bubblande magma och fräsande hetta
    d = 1.9; t = tt(d); y = np.zeros(len(t))
    f0 = np.interp(t, [0, 0.3, 1.0, d], [40, 55, 50, 38]); a = np.interp(t, [0, 0.2, 1.3, d], [0, 1, 0.8, 0])
    y += growl(d, f0, [(np.interp(t, [0, 0.8, d], [300, 450, 280]), 80, 1), (650, 110, 0.5), (1900, 220, 0.12)], 0.8, 0.5, 3500, 2.6) * a * 0.8
    y += nrm(grains(d, 1500, 150, 2500, 0.01)) * a * 0.25
    y += bubbles(d, 30, 120, 450, 0.4)
    y += crackle(d, 300, 2000, 8000) * 0.15 + nrm(fftfilt(noise(d), 3000, 9000)) * 0.03
    y += low_rumble(d, 30) * a * 0.3
    return cut(verb(fftfilt(y, 25, 6000), 1.0, 0.22, 3500), d, 0.35)

def molten_drip():  # droppe av smält metall: ett tungt "plopp" som slår i, ett hett fräs och knaster som klingar av
    d = 0.9; t = tt(d); y = np.zeros(len(t))
    place(y, 0, bubble(260, 0.12, 1, 2.0), 0.7); place(y, 0, thud(110, 0.2, 0.0), 0.4)
    y += steam(d, [(0, 0), (0.02, 0), (0.04, 1), (0.3, 0.4), (d, 0)], 3000, 10000) * 0.35
    y += crackle(d, 250, 2500, 9000, 1.8) * np.interp(t, [0, 0.03, d], [0, 1, 0]) * 0.5
    return cut(verb(y, 0.5, 0.12, 6000), d, 0.25)

def steambot():  # ångautomaten: två kolvslag (tjoff-tjoff med pys), ett spärrhjul, en ångvissla som tutar och plåt som skramlar
    d = 1.4; y = np.zeros(int(d * SR))
    for t0 in (0.0, 0.25):
        place(y, t0, thud(90, 0.2, 0.0), 0.5); place(y, t0, steam(0.25, [(0, 0), (0.01, 1), (0.25, 0)], 1500, 9000), 0.4); place(y, t0, clack(1600, 1, 250), 0.4)
    place(y, 0.45, ratchet(0.3, 30, 45, 2600), 0.3)
    tw = tt(0.55); f = 880 * (1 + 0.04 * np.interp(tw, [0, 0.05, 0.55], [-1, 0, 0]))
    w = (np.sin(phase(f)) + 0.5 * np.sin(phase(f * 1.19)) + 0.3 * np.sin(phase(f * 2))) * env(len(tw), 0.03, 0.15)
    w += nrm(fftfilt(noise(0.55), 800, 4000)) * 0.3 * env(len(tw), 0.02, 0.15)
    place(y, 0.75, w, 0.35)
    place(y, 0.5, chain(0.6, 6, None, (1500, 3500)), 0.2)
    return cut(verb(y, 0.6, 0.18, 5000), d, 0.25)

def steam_burst():  # ångautomaten går sönder: metallisk smäll, ett väldigt ångmoln som fräser ut, en vissla som dör och delar som skramlar ned
    d = 1.7; t = tt(d); y = np.zeros(len(t))
    place(y, 0, thud(55, 0.6, 0.3)); place(y, 0, anvil(600, 0.6, 0.5)); place(y, 0, crack(0.1, 0.7, 1000))
    y += steam(d, [(0, 0), (0.01, 1), (0.4, 0.7), (d, 0)], 1200, 10000) * 0.6
    tw = tt(0.8); place(y, 0.05, np.sin(phase(1300 * 0.4 ** (tw / 0.8))) * np.exp(-tw * 3), 0.12)
    place(y, 0.15, chain(1.2, 14, np.exp(-tt(1.2) * 2), (1200, 4000)), 0.35)
    for t0 in (0.3, 0.6, 0.85): place(y, t0, clack(rng.uniform(800, 1500), 1, 120, 0.06), 0.3)
    return cut(verb(y, 0.9, 0.2, 5000), d, 0.4)

def sparkdrone():  # gnistdrönaren: elektriskt surr från en svävande rotor (fladder), knastrande urladdningar och två varningspip
    d = 1.3; t = tt(d); y = np.zeros(len(t))
    f = 118 * (1 + 0.03 * lpnoise(d, 3)) * np.interp(t, [0, 0.15, d], [0.8, 1, 1])
    y += nrm(fftfilt(buzz(d, f, 1, 5000), 80, 5000)) * (0.75 + 0.25 * np.sin(2 * np.pi * 31 * t)) * 0.4
    y += nrm(fftfilt(buzz(d, f * 4.02, 1, 6000), 300, 6000)) * 0.12
    y += crackle(d, 250, 2000, 9000) * 0.4
    for t0 in (0.35, 0.5): tb = tt(0.08); place(y, t0, np.sin(2 * np.pi * 2400 * tb) * env(len(tb), 0.003, 0.02), 0.12)
    return cut(verb(y * env(len(t), 0.08, 0.2), 0.5, 0.15, 6000), d, 0.25)

def drone_zap():  # gnistskott: skarp urladdning (knall och knaster) med en elektrisk ton som piskar nedåt
    d = 0.55; y = np.zeros(int(d * SR))
    place(y, 0, bolt(0.3), 0.7)
    tz = tt(0.35); place(y, 0, buzz(0.35, 2200 * 0.25 ** (tz / 0.35), 1, 8000) * np.exp(-tz * 9), 0.35)
    y += crackle(d, 200, 2500, 10000, 2.0) * 0.4
    return cut(verb(y, 0.4, 0.15, 8000), d, 0.2)

def drone_pop():  # drönaren exploderar: smäll, gnistregn, ett elektriskt fräs som dör och metallbitar som klirrar
    d = 1.1; y = np.zeros(int(d * SR))
    place(y, 0, thud(80, 0.5, 0.4)); place(y, 0, bolt(0.4), 0.6); place(y, 0, crack(0.1, 0.6, 1200))
    sparks(y, 0.8, 120, 1.6, 0.12)
    tz = tt(0.5); place(y, 0.02, buzz(0.5, 120 * 0.4 ** (tz / 0.5), 1, 5000) * np.exp(-tz * 6), 0.2)
    place(y, 0.1, chain(0.9, 8, np.exp(-tt(0.9) * 3), (2500, 5500)), 0.25)
    return cut(verb(y, 0.7, 0.2, 7000), d, 0.3)

# ---- bossar ----
def librarian_laugh():  # bibliotekarien: ett torrt, kraxigt "he-he-he-heee" som halvt viskas och ekar i salen, sidor som prasslar
    d = 2.3; y = np.zeros(int(d * SR)); t0 = 0.0
    steps = [(230, 0.12), (220, 0.12), (210, 0.12), (200, 0.12), (190, 0.55)]
    for i, (f, dd) in enumerate(steps):
        last = i == len(steps) - 1; dl = dd + 0.15; k = tt(dl)
        f0 = np.interp(k, [0, dd], [f * 1.1, f * (0.72 if last else 0.9)])
        v = growl(dl, f0, EH, 0.35, 0.5, 6000, 1.6)
        h = nrm(reson(noise(dl), EH))
        e = np.clip(k / 0.01, 0, 1) * (np.clip((dd + 0.1 - k) / 0.4, 0, 1) if last else np.exp(-k * 10) * np.clip((dd + 0.05 - k) / 0.05, 0, 1))
        place(y, t0, (v * 0.6 + h * 0.6) * e)
        t0 += dd + 0.06
    e0 = y.copy(); place(y, 0.28, e0, 0.3); place(y, 0.56, e0, 0.12)
    place(y, 0.9, flutter(1.0, 20, 8, 1500, 7000) * np.exp(-tt(1.0) * 2), 0.15)
    return cut(verb(y, 1.8, 0.4, 6000), d, 0.5)

def librarian_cast():  # bibliotekarien besvärjer: en viskad formel, ett dissonant orgelackord som sväller, sug och en magisk smäll
    d = 2.0; t = tt(d); y = np.zeros(len(t)); c = 1.0
    place(y, 0, whisper(1.0, (EE, AA, OH), 7, 1.0, 0.8) * env(int(1.0 * SR), 0.05, 0.2), 0.4)
    o = organ([50, 53, 56, 62], 1.3, 1.0, att=0.8, rel=0.3, chiff=0.0); place(y, 0, o * np.linspace(0.3, 1, len(o)), 0.5)
    u = np.clip(t / c, 0, 1); y += nrm(svf(noise(d), 300 * 10 ** u, 3)) * u ** 2 * (t < c) * 0.3
    place(y, c, thud(60, 0.6, 0.0), 0.6); place(y, c, crack(0.1, 0.5, 1500)); place(y, c, puff(0.4, 300, 5000), 0.5)
    for i, n in enumerate((86, 90, 93, 98)): place(y, c + 0.03 * i, crys(m2f(n), 0.9, 0.25, 2.0))
    return cut(verb(y, 1.5, 0.35, 7000), d, 0.45)

def librarian_pages():  # sidstormen: hundratals sidor som rycks loss och virvlar fram i en våg (tätnande fladder, sus) och prasslar ut
    d = 2.2; t = tt(d); a = np.interp(t, [0, 0.4, 1.3, d], [0, 1, 0.8, 0])
    y = flutter(d, 40, 90, 1200, 8000) * a * 0.6
    y += flutter(d, 25, 40, 600, 3000) * a * 0.35
    y += nrm(svf(noise(d), 500 + 2500 * a * (0.7 + 0.3 * np.sin(2 * np.pi * 1.7 * t)), 1.5)) * a * 0.35
    y += gust(d, 300, 2000, 0.35, 0.3)
    return cut(verb(y, 1.2, 0.3, 7000), d, 0.4)

def colossus_roar():  # smideskolossen: ett väldigt, metalliskt vrål (rösten ekar i järnbuken), ugnens dån, plåt som knakar och ångstötar
    d = 2.8; t = tt(d); y = np.zeros(len(t))
    f0 = np.interp(t, [0, 0.3, 1.1, 2.0, d], [34, 55, 52, 42, 30]); a = np.interp(t, [0, 0.15, 1.8, d], [0, 1, 0.85, 0])
    v = growl(d, f0, [(np.interp(t, [0, 0.7, d], [350, 560, 320]), 90, 1), (900, 130, 0.5), (2300, 250, 0.15)], 0.8, 0.5, 4500, 2.6)
    v = v + 0.7 * nrm(reson(v, [(310, 6, 1), (740, 9, 0.8), (1270, 14, 0.6), (1960, 20, 0.4), (2810, 28, 0.25)]))
    y += v * a
    y += nrm(fftfilt(noise(d), 50, 700)) * (0.75 + 0.25 * lpnoise(d, 8)) * a * 0.35 + crackle(d, 250, 1500, 7000) * a * 0.15
    place(y, 0.3, creak(1.3, 6, 14, 120), 0.3)
    for t0 in (0.05, 1.6): place(y, t0, steam(0.8, [(0, 0), (0.01, 1), (0.8, 0)], 1500, 9000), 0.3)
    y += low_rumble(d, 28) * a * 0.35
    return cut(verb(fftfilt(y, 25, 6000), 2.0, 0.35, 4000), d, 0.6)

def colossus_slam():  # smideskolossens hammarslag: väldig smäll i städet, ringande järnklang, golvet skakar och grus och gnistor regnar
    d = 2.0; t = tt(d); y = np.zeros(len(t)); c = 0.12
    place(y, 0, swish(0.15, 400, 1500, 2.0), 0.3)
    place(y, c, thud(38, 1.2, 0.5)); place(y, c, anvil(420, 1.6, 0.6)); place(y, c, anvil(1150, 1.0, 0.3)); place(y, c, crack(0.12, 0.7, 800))
    place(y, c, debris(1.5, 50, 600, 4000, 0.9), 0.35)
    sp = np.zeros(int(1.0 * SR)); sparks(sp, 1.0, 80, 1.5, 0.1); place(y, c, sp)
    y += low_rumble(d, 30) * np.interp(t, [0, c, c + 0.1, d], [0, 0, 1, 0]) * 0.45
    return cut(verb(y, 1.6, 0.3, 5000), d, 0.5)

def colossus_furnace():  # kolossen öppnar ugnen: luckan slår upp (metallklang, gnissel), bälgen drar in luft, en eldstorm som dånar ut med knaster
    d = 2.4; t = tt(d); y = np.zeros(len(t)); c = 0.45
    place(y, 0, clack(700, 1.0, 100, 0.1), 0.5); place(y, 0, anvil(520, 0.5, 0.3)); place(y, 0, creak(0.3, 30, 15, 250), 0.25)
    u = np.clip(t / c, 0, 1); y += nrm(svf(noise(d), 200 + 1500 * u, 1.5, 'lp')) * u ** 2 * (t < c) * 0.35
    a = np.interp(t, [0, c, c + 0.1, 1.6, d], [0, 0, 1, 0.7, 0])
    y += nrm(fftfilt(noise(d), 40, 600)) * (0.75 + 0.25 * lpnoise(d, 8)) * a * 0.6
    y += nrm(svf(noise(d), (600 + 2500 * a) * (1 + 0.2 * lpnoise(d, 6)), 0.8, 'lp')) * a * 0.5
    y += crackle(d, 600, 1500, 8000, 1.0) * a * 0.4
    return cut(verb(y, 1.2, 0.25, 5000), d, 0.5)

# ---- miljö ----
def press_slam():  # stansen: hydrauliken väser ned, ett tungt metallslag (dov smäll, plåt som ringer), lite skrammel och ett pys när den lyfter
    d = 1.4; y = np.zeros(int(d * SR)); c = 0.22
    tp = tt(c); place(y, 0, nrm(svf(noise(c), 900 + 1600 * tp / c, 2.0)) * (tp / c) ** 1.5, 0.3)
    place(y, c, thud(45, 0.9, 0.35)); place(y, c, anvil(300, 0.8, 0.5)); place(y, c, anvil(860, 0.5, 0.25)); place(y, c, crack(0.08, 0.5, 900))
    place(y, c + 0.05, chain(0.4, 5, None, (1500, 3500)), 0.15)
    place(y, 0.75, steam(0.55, [(0, 0), (0.02, 1), (0.55, 0)], 2000, 9000), 0.3)
    return cut(verb(y, 0.9, 0.22, 5000), d, 0.3)

def vent_burst():  # ångventilen blåser: ett gurglande tryck som byggs upp, ventilen smäller upp och en kraftig ångkvast väser och ebbar ut
    d = 1.8; t = tt(d); y = np.zeros(len(t)); c = 0.25
    place(y, 0, bubbles(c, 10, 200, 600, 0.4)); tp = tt(c); place(y, 0, nrm(fftfilt(noise(c), 80, 500)) * (tp / c) ** 2, 0.25)
    place(y, c, clack(900, 1, 150, 0.06), 0.5); place(y, c, thud(70, 0.3, 0.0), 0.5)
    y += steam(d, [(0, 0), (c, 0), (c + 0.02, 1), (c + 0.6, 0.8), (d, 0)], 1000, 10000) * 0.75
    y += nrm(svf(noise(d), 1400 * (1 + 0.25 * lpnoise(d, 12)), 1.5)) * np.interp(t, [0, c, c + 0.02, d], [0, 0, 1, 0]) * 0.3
    return cut(verb(y, 0.8, 0.2, 6000), d, 0.35)

def lectern_read():  # pulpetboken: boken slås upp, sidor bläddras och en magisk ton (celesta och glasharmonika) stiger
    d = 1.8; y = np.zeros(int(d * SR))
    place(y, 0, jaw(0.4)); place(y, 0.05, flutter(0.35, 25, 15, 1500, 7000), 0.4)
    for i, n in enumerate((74, 78, 81, 86)): place(y, 0.35 + 0.1 * i, bar(m2f(n), 1.0, 0.25, dec=2.5))
    for n in (74, 81, 86): place(y, 0.4, glass(n, 1.3, 0.12, att=0.3, rel=0.7))
    return cut(verb(y, 1.4, 0.35, 8000), d, 0.4)

def ink_pickup():  # bläckflaskan: glasklink, ett skvalp av bläck och en liten magisk blipp
    d = 0.7; y = np.zeros(int(d * SR))
    place(y, 0, crys(2200, 0.4, 0.6, 4.0)); place(y, 0.04, crys(3100, 0.3, 0.3, 5.0))
    tb = tt(0.25); place(y, 0.05, nrm(svf(noise(0.25), 600 + 500 * np.sin(np.pi * tb / 0.25), 3.0)) * np.sin(np.pi * tb / 0.25) ** 2, 0.3)
    place(y, 0.08, bubbles(0.25, 5, 500, 1200), 0.4)
    for i, n in enumerate((79, 86)): place(y, 0.18 + 0.08 * i, ping(m2f(n), 0.4, 0.3, 8))
    return cut(verb(y, 0.6, 0.2, 8000), d, 0.2)

def belt_loop(d=2.4):  # rullbandet (slinga 2 s): rullarna klonkar i jämn takt (8 per s) och bandets skarv dunkar en gång per varv,
    # i ett mönster som upprepas exakt var 2:a s (så att överlappningen i skarven inte ger dubbelslag); motorbrum (smalbandigt
    # brus, så att överlappningen inte svävar) och bandet som skrapar
    y = nrm(reson(noise(d), [(50, 1.0, 1), (100, 1.3, 0.6), (150, 1.6, 0.3), (300, 2.5, 0.15)])) * 0.5
    y += nrm(fftfilt(noise(d), 600, 3500)) * 0.06 * (0.8 + 0.2 * lpnoise(d, 3))
    rolls = [clack(rng.choice([700, 760, 820]) * rng.uniform(0.97, 1.03), rng.uniform(0.6, 1), 200, 0.06) for _ in range(16)]
    seam = thud(90, 0.2, 0.0) * 0.35 + clack(500, 1, 120, 0.2) * 0.3
    for p in range(int(np.ceil(d / 2))):
        for k, c in enumerate(rolls): place(y, 2 * p + k / 8 + 0.01, c, 0.35)
        place(y, 2 * p + 0.07, seam)
    return y

def library_hum(d=4.8):  # bibliotekets stillhet (slinga 4 s): en golvklocka som tickar (tick-tack, mönstret upprepas var 2:a s),
    # lågt rumsbrus, ett avlägset ljusknaster och sidor som bläddras här och där
    y = nrm(reson(noise(d), [(70, 2.0, 1), (140, 3.0, 0.4), (210, 3.5, 0.2)])) * 0.25 + nrm(fftfilt(noise(d), 100, 900)) * 0.15
    y += nrm(fftfilt(noise(d), 2000, 7000)) * 0.015
    tk = [wblock(1500, 1.0) + 0.5 * logdrum(260, 1.0, 0.25)[:int(0.08 * SR)], wblock(1150, 0.8) + 0.5 * logdrum(200, 1.0, 0.25)[:int(0.08 * SR)]]
    for p in range(int(np.ceil(d / 2))):
        place(y, 2 * p + 0.3, tk[0], 0.5); place(y, 2 * p + 1.3, tk[1], 0.5)
    for _ in range(25): place(y, rng.uniform(0, d - 0.05), ember(1.0), rng.uniform(0.02, 0.06))
    for t0 in (0.8, 2.6, 3.7): place(y, t0, flutter(0.35, 22, 12, 1500, 6000) * np.sin(np.pi * tt(0.35) / 0.35), 0.18)
    return y

def foundry_hum(d=4.8):  # gjuteriets dån (slinga 4 s): maskinbrum (smalbandigt brus på 50 Hz och dess övertoner), ugnarnas mullrande
    # brus med knaster, en kolv som tjoffar två gånger per s och en avlägsen hammare per sekund (mönstret upprepas var 2:a s),
    # ångpys och skrammel här och där
    y = nrm(reson(noise(d), [(50, 1.0, 1), (100, 1.4, 0.7), (150, 1.8, 0.4), (200, 2.2, 0.25), (400, 3.0, 0.1)])) * 0.45
    y += nrm(fftfilt(noise(d), 40, 400)) * 0.3 * (0.8 + 0.2 * lpnoise(d, 2)) + crackle(d, 200, 1500, 7000) * 0.06
    chuff = fftfilt(steam(0.25, [(0, 0), (0.01, 1), (0.25, 0)], 800, 5000) * 0.5 + thud(70, 0.25, 0.0) * 0.6, 0, 3000)
    hammer = fftfilt(anvil(900, 0.8, 1.0) + thud(60, 0.8, 0.0) * 0.7, 0, 2500)
    for p in range(int(np.ceil(d / 2))):
        for k in range(4): place(y, 2 * p + 0.5 * k + 0.15, chuff, 0.18 if k % 2 == 0 else 0.12)
        for k in range(2): place(y, 2 * p + k + 0.4, hammer, 0.16 if k == 0 else 0.11)
    place(y, 2.9, steam(0.6, [(0, 0), (0.02, 1), (0.6, 0)], 2000, 9000), 0.08)
    for t0 in (1.1, 3.4): place(y, t0, chain(0.3, 4, None, (1500, 3500)), 0.06)
    return y

FX = dict(rune_fire=rune_fire, rune_hit=rune_hit, page_ward=page_ward, steam_fire=steam_fire, steam_hiss=steam_hiss,
          grimoire=grimoire, grimoire_bite=grimoire_bite, inkslime=inkslime, ink_splash=ink_splash, archivist=archivist,
          archivist_blink=archivist_blink, moltengolem=moltengolem, molten_drip=molten_drip, steambot=steambot,
          steam_burst=steam_burst, sparkdrone=sparkdrone, drone_zap=drone_zap, drone_pop=drone_pop,
          librarian_laugh=librarian_laugh, librarian_cast=librarian_cast, librarian_pages=librarian_pages,
          colossus_roar=colossus_roar, colossus_slam=colossus_slam, colossus_furnace=colossus_furnace,
          press_slam=press_slam, belt_loop=belt_loop, vent_burst=vent_burst, lectern_read=lectern_read,
          ink_pickup=ink_pickup, library_hum=library_hum, foundry_hum=foundry_hum)

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

# ---- library: Det förbjudna biblioteket, d-moll, 75 bpm, 12 takter = 38,4 s (Dm Bb Gm A | Dm F Gm A | Bb C A A) ----
# grund: en golvklocka som tickar (tick-tack på slagen), låga stråkar och en mörk drone, celesta-arpeggio i åttondelar
# som en speldosa, harpa på ettan och trean, sidor som bläddras i fjärran, "oo"-kör och flöjtmelodi i andra halvan.
# hi: pizzicato i åttondelar, mjuk ramtrumma, shaker, svag cembalo i sextondelar och en dämpad puls i basen.
def library():
    b = 0.8; T = 48 * b; base = Loop(T); hi = Loop(T)
    slots = ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'F', 'Gm', 'A', 'Bb', 'C', 'A', 'A']
    chord = {'Dm': [62, 65, 69], 'Bb': [62, 65, 70], 'Gm': [62, 67, 70], 'A': [61, 64, 69], 'F': [60, 65, 69], 'C': [60, 64, 67]}
    root = {'Dm': 38, 'Bb': 34, 'Gm': 31, 'A': 33, 'F': 29, 'C': 36}
    base.add(0, base.drone(26, 0.12, h=6, roll=1.6, cyc=3, hi=300))
    base.add(0, base.bed(200, 900, 0.006, cyc=3)); base.add(0, base.bed(3000, 9000, 0.0015, cyc=4))
    for k in range(48): base.add(k * b, wblock(1500 if k % 2 == 0 else 1150, 0.07 if k % 2 == 0 else 0.05), 0.6)
    for _ in range(6): base.add(rng.uniform(0, T), flutter(0.35, 22, 12, 1500, 6000) * np.sin(np.pi * tt(0.35) / 0.35), rng.uniform(-0.8, 0.8), 0.02)
    for s, c in enumerate(slots):
        t0 = s * 4 * b; ch = chord[c]; r = root[c]
        base.add(t0 - 0.4, strings([n - 12 for n in ch], 4 * b + 0.9, att=0.7, rel=1.0, g=0.2, hi=1100), -0.25)
        base.add(t0 - 0.2, strings([r + 12], 4 * b + 0.5, att=0.4, rel=0.7, g=0.2, hi=420), 0.1)
        if s >= 4: base.add(t0 - 0.3, nrm(choir(ch[:2], 4 * b + 0.8, 0.6, 0.9, 1.0, vib=4.5, F=SOO, hmax=5000)), 0.35, 0.09)
        arp = [ch[0] + 12, ch[2] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24, ch[2] + 12, ch[1] + 12, ch[2] + 12]
        for k8 in range(8): base.add(t0 + k8 * b / 2, bar(m2f(arp[k8]), 1.4, 0.11 if k8 % 2 else 0.15, dec=2.2), 0.4 if k8 % 2 else -0.4)
        for tb in (0, 2): base.add(t0 + tb * b, pluck(ch[0] - 12 if tb == 0 else ch[2] - 12, 2.0, 1.5, 0.15), -0.15)
        for k8 in range(8): hi.add(t0 + k8 * b / 2, pluck([r + 12, r + 19, r + 24, r + 19][k8 % 4], 0.35, 1.2, 0.22 if k8 % 2 == 0 else 0.15), 0.25)
        for tb, g in ((0, 0.5), (1.5, 0.3), (2, 0.4), (3.5, 0.25)): hi.add(t0 + tb * b, drum(70, 0.5, g, 0.2, dec=9), 0)
        for k16 in range(16):
            hi.add(t0 + k16 * b / 4, shaker(0.06 if k16 % 4 == 2 else 0.03), -0.5)
            hi.add(t0 + k16 * b / 4, harpsi([ch[0], ch[1], ch[2], ch[1] + 12][k16 % 4] + 12, 0.3, 0.09 if k16 % 4 == 0 else 0.06), -0.3)
        for tb in range(4): hi.add(t0 + tb * b, mpulse(r + 12, 0.3, 0.3), 0.0)
    mel = [(16, 74, 1.5), (17.5, 76, 0.5), (18, 77, 1), (19, 76, 1), (20, 72, 2), (22, 69, 1), (23, 72, 1),
           (24, 74, 1.5), (25.5, 72, 0.5), (26, 70, 2), (28, 69, 1), (29, 73, 1), (30, 76, 2),
           (32, 77, 1.5), (33.5, 76, 0.5), (34, 74, 1), (35, 70, 1), (36, 72, 1.5), (37.5, 74, 0.5), (38, 76, 2),
           (40, 73, 2), (42, 76, 1), (43, 73, 1), (44, 69, 3), (47, 73, 1)]
    for t0, n, dd in mel: base.add(t0 * b, flute(n, dd * b + 0.08, 0.2), 0.15)
    hi.add(0, tubebell(50, 4.0, 0.06), 0.3)
    base.reverb(4.0, 0.5, 5000, 0.03); hi.reverb(1.8, 0.25, 5000)
    write_aligned((base, 'library', -20), (hi, 'library_hi', -23))

# ---- foundry: Gjuteriet, e-moll, 100 bpm, 16 takter = 38,4 s (Em C Am B | Em G D B, två takter vardera) ----
# grund: mörk drone och ugnsbrus, städslag på ettan och trean (hammaren i fjärran), metalliskt tick i åttondelar, ångpys
# på efterslagen, distad bas på grundtonen, mörk mässing som ligger och en rörklocka vid varje ackordbyte; mässingsmelodi
# i andra halvan. hi: bastrumma och virvel med städ, metallhatt i sextondelar, pulserande bas, städ i ett gungande mönster
# och taiko.
def foundry():
    b = 0.6; T = 64 * b; base = Loop(T); hi = Loop(T)
    slots = ['Em', 'C', 'Am', 'B', 'Em', 'G', 'D', 'B']
    chord = {'Em': [59, 64, 67], 'C': [60, 64, 67], 'Am': [57, 60, 64], 'B': [59, 63, 66], 'G': [59, 62, 67], 'D': [57, 62, 66]}
    root = {'Em': 40, 'C': 36, 'Am': 33, 'B': 35, 'G': 31, 'D': 38}
    base.add(0, base.drone(28, 0.14, h=8, roll=1.4, cyc=4, hi=260))
    base.add(0, base.bed(40, 400, 0.02, cyc=6)); base.add(0, base.bed(2500, 8000, 0.002, cyc=8))
    for s, c in enumerate(slots):
        t0 = s * 8 * b; ch = chord[c]; r = root[c]
        base.add(t0 - 0.3, brass([n - 12 for n in ch], 8 * b + 0.5, att=0.6, rel=0.6, drive=1.4, lo_fc=500, hi_fc=1200, swell=1.5), -0.2, 0.16)
        base.add(t0, tubebell(ch[0] + 12, 3.0, 0.07), 0.4)
        for bar_ in range(2):
            t1 = t0 + bar_ * 4 * b
            for tb in (0, 2): base.add(t1 + tb * b, anvil(1050 if tb == 0 else 980, 0.9, 0.18), 0.35)
            for k8 in range(8):
                base.add(t1 + k8 * b / 2, ting(0.12, 3800, 0.05 if k8 % 2 else 0.03, 2.5), -0.45)
                base.add(t1 + k8 * b / 2, dbass(r + 12 if k8 % 4 == 3 else r, b / 2 * 0.9, 0.2 if k8 % 2 == 0 else 0.14, 2.0, 700), 0.0)
            for tb in (1.5, 3.5): base.add(t1 + tb * b, steam(0.3, [(0, 0), (0.01, 1), (0.3, 0)], 2000, 9000), 0.5, 0.05)
            for tb in (0, 1.5, 2.5): hi.add(t1 + tb * b, drum(52, 0.6, 0.7, 0.25, dec=7), 0)
            for tb in (1, 3): hi.add(t1 + tb * b, snare(0.32), 0.1); hi.add(t1 + tb * b, anvil(1600, 0.4, 0.06), 0.3)
            for k16 in range(16): hi.add(t1 + k16 * b / 4, tick(0.05, 0.07 if k16 % 2 == 0 else 0.04, 6000, 11000, 60), -0.35)
            hi.add(t1, pbass(r + 12, 4 * b, 4 / b, 0.22, 2.2), 0)
            for tb in (0.5, 1.75, 2.5, 3.25): hi.add(t1 + tb * b, anvil(2300, 0.3, 0.08), -0.25)
            if bar_ == 0: hi.add(t1, taiko(0.4, 40), 0)
    mel = [(32, 64, 2), (34, 67, 1), (35, 71, 1), (36, 72, 2), (38, 71, 1), (39, 67, 1), (40, 67, 2), (42, 71, 1), (43, 74, 1),
           (44, 74, 3), (47, 72, 1), (48, 69, 2), (50, 74, 1), (51, 72, 1), (52, 69, 2), (54, 66, 2), (56, 71, 3), (59, 69, 1),
           (60, 66, 2), (62, 63, 2)]
    for t0, n, dd in mel: base.add(t0 * b, brass([n, n - 12], dd * b + 0.08, att=0.03, rel=0.15, drive=2.2, swell=0.2, hi_fc=2600), 0.15, 0.3)
    hi.add(0, crash_cym(0.12, 2.5), 0.3); hi.add(32 * b, crash_cym(0.1, 2.5), -0.3)
    base.reverb(2.8, 0.35, 4000, 0.02); hi.reverb(1.4, 0.2, 5000)
    write_aligned((base, 'foundry', -20), (hi, 'foundry_hi', -23))

# ---- boss11: bibliotekarien, g-moll, 120 bpm, 16 takter = 32 s (Gm Eb Cm D | Gm Bb Eb D, två takter vardera) ----
# mystiskt och barockt: piporgel som ligger (med pedalbas), cembalo-toccata i sextondelar, pauka på ettan, mörk kör,
# rörklockor vid varje ackordbyte och ett tickande urverk; melodin i orgelns ljusa register, i andra halvan dubblad i
# cembalo, med ljusare kör, stråktremolo, virvel och cymbaler.
def boss11():
    b = 0.5; T = 64 * b; L = Loop(T)
    slots = ['Gm', 'Eb', 'Cm', 'D', 'Gm', 'Bb', 'Eb', 'D']
    chord = {'Gm': [62, 67, 70], 'Eb': [63, 67, 70], 'Cm': [63, 67, 72], 'D': [62, 66, 69], 'Bb': [62, 65, 70]}
    root = {'Gm': 31, 'Eb': 27, 'Cm': 36, 'D': 26, 'Bb': 34}
    mel = [(0, 67, 2), (2, 70, 1), (3, 74, 1), (4, 75, 2), (6, 74, 2), (8, 70, 2), (10, 67, 1), (11, 70, 1), (12, 75, 3), (15, 74, 1),
           (16, 72, 2), (18, 75, 1), (19, 79, 1), (20, 79, 3), (23, 77, 1), (24, 78, 2), (26, 74, 1), (27, 72, 1), (28, 69, 3), (31, 66, 1),
           (32, 67, 2), (34, 74, 1), (35, 79, 1), (36, 82, 3), (39, 81, 1), (40, 77, 2), (42, 74, 1), (43, 77, 1), (44, 82, 3), (47, 81, 1),
           (48, 79, 2), (50, 75, 1), (51, 79, 1), (52, 82, 2), (54, 79, 2), (56, 78, 3), (59, 74, 1), (60, 78, 2), (62, 81, 2)]
    L.add(0, L.bed(30, 200, 0.02, cyc=8)); L.add(0, L.bed(2500, 9000, 0.003, cyc=6))
    for s, c in enumerate(slots):
        t0 = s * 8 * b; ch = chord[c]; r = root[c]; half = s >= 4
        L.add(t0 - 0.05, organ([n - 12 for n in ch], 8 * b + 0.1, att=0.05, rel=0.15, chiff=0.1), -0.15, 0.32)
        L.add(t0 - 0.05, organ([r + 12], 8 * b + 0.1, att=0.04, rel=0.1, stops=((0.5, 1), (1, 0.6), (2, 0.25), (3, 0.1)), chiff=0.05, hi=800), 0.0, 0.3)
        L.add(t0 - 0.3, nrm(choir([n - 12 for n in ch], 8 * b + 0.6, 0.4, 0.5, 1.0, vib=4.5, F=AA if half else OH, hmax=4000)), 0.15, 0.22 if half else 0.14)
        if half: L.add(t0, strings([n + 12 for n in ch], 8 * b, att=0.2, rel=0.3, g=0.14, hi=3000, trem=8), -0.35)
        L.add(t0, tubebell(r + 36, 4.0, 0.12 if half else 0.08), 0.4)
        tocc = [ch[0], ch[2], ch[1], ch[2], ch[0] + 12, ch[2], ch[1], ch[2]]
        for bar_ in range(2):
            t1 = t0 + bar_ * 4 * b
            L.add(t1, taiko(0.55, 38 if bar_ == 0 else 43, 1.4), 0)
            for k16 in range(16): L.add(t1 + k16 * b / 4, harpsi(tocc[(k16 + 4 * bar_) % 8], 0.35, 0.16 if k16 % 4 == 0 else 0.1), 0.35)
            for k8 in range(8): L.add(t1 + k8 * b / 2, wblock(2400 if k8 % 2 == 0 else 2000, 0.05 if k8 % 2 == 0 else 0.03), -0.5)
            if half:
                for tb in (1, 3): L.add(t1 + tb * b, snare(0.2), 0.15)
    for t0, n, dd in mel:
        L.add(t0 * b, organ([n, n + 12], dd * b + 0.06, att=0.02, rel=0.12, stops=((1, 1), (2, 0.7), (3, 0.35), (4, 0.4), (5, 0.15), (6, 0.2), (8, 0.15)), chiff=0.25, hi=7000), 0.2, 0.3 if t0 < 32 else 0.26)
        if t0 >= 32: L.add(t0 * b, harpsi(n + 12, 0.6, 0.12), -0.2)
    for t0 in (0, 32): L.add(t0 * b, crash_cym(0.22, 3.0), 0.3)
    for k in range(8): L.add(T - 2 * b + k * b / 4, snare(0.06 + 0.03 * k), -0.1)
    L.reverb(3.0, 0.38, 5000)
    write_aligned((L, 'boss11', -19))

# ---- boss12: smideskolossen, c-moll, 100 bpm, 16 takter = 38,4 s (Cm Ab Fm G | Cm Db Ab G, två takter vardera) ----
# industriellt och tungt: bastrumma i ett stampande mönster och taiko, städslag på efterslagen och två hammare i åttondelar,
# distad bas i ett åttondelsriff, ångstötar, kedjeskrammel, låg kör; melodin i distad mässing, i andra halvan mässingsstötar,
# stråktremolo och virvel.
def boss12():
    b = 0.6; T = 64 * b; L = Loop(T)
    slots = ['Cm', 'Ab', 'Fm', 'G', 'Cm', 'Db', 'Ab', 'G']
    chord = {'Cm': [60, 63, 67], 'Ab': [60, 63, 68], 'Fm': [60, 65, 68], 'G': [59, 62, 67], 'Db': [61, 65, 68]}
    root = {'Cm': 36, 'Ab': 32, 'Fm': 29, 'G': 31, 'Db': 37}
    mel = [(0, 60, 2), (2, 63, 1), (3, 67, 1), (4, 68, 3), (7, 67, 1), (8, 68, 2), (10, 72, 1), (11, 75, 1), (12, 72, 3), (15, 70, 1),
           (16, 68, 2), (18, 65, 1), (19, 68, 1), (20, 72, 3), (23, 71, 1), (24, 71, 2), (26, 67, 1), (27, 65, 1), (28, 62, 3), (31, 67, 1),
           (32, 72, 2), (34, 75, 1), (35, 79, 1), (36, 80, 3), (39, 79, 1), (40, 77, 2), (42, 73, 1), (43, 77, 1), (44, 80, 3), (47, 77, 1),
           (48, 75, 2), (50, 72, 1), (51, 75, 1), (52, 80, 2), (54, 79, 2), (56, 74, 3), (59, 71, 1), (60, 74, 2), (62, 79, 2)]
    L.add(0, L.bed(30, 220, 0.04, cyc=8)); L.add(0, L.drone(24, 0.2, h=8, roll=1.3, cyc=8, hi=220))
    for s, c in enumerate(slots):
        t0 = s * 8 * b; ch = chord[c]; r = root[c]; half = s >= 4
        L.add(t0 - 0.3, nrm(choir([n - 24 for n in ch], 8 * b + 0.6, 0.4, 0.5, 1.0, vib=3.5, F=OH, hmax=3000)), -0.1, 0.25 if half else 0.18)
        if half: L.add(t0, strings(ch, 8 * b, att=0.2, rel=0.3, g=0.14, hi=2600, trem=10), -0.35)
        riff = [r, r, r + 12, r, r + 7, r, r + 12, r + 7]
        for bar_ in range(2):
            t1 = t0 + bar_ * 4 * b
            for tb, g in ((0, 0.9), (0.75, 0.5), (1.5, 0.7), (2.5, 0.6), (3, 0.5)): L.add(t1 + tb * b, drum(48, 0.6, 0.6 * g, 0.3, dec=7), 0)
            L.add(t1, taiko(0.6, 36, 1.6), 0); L.add(t1 + 2 * b, taiko(0.45, 40, 1.2), 0)
            for tb in (1, 3): L.add(t1 + tb * b, snare(0.28), 0.1); L.add(t1 + tb * b, anvil(880, 0.9, 0.24), 0.3)
            for k8 in range(8):
                L.add(t1 + k8 * b / 2, anvil(1900 if k8 % 2 else 2100, 0.3, 0.07 if k8 % 2 else 0.1), -0.35)
                L.add(t1 + k8 * b / 2, dbass(riff[k8], b / 2 * 0.85, 0.3 if k8 % 2 == 0 else 0.22, 2.6, 900), 0)
            L.add(t1 + 3.5 * b, steam(0.35, [(0, 0), (0.01, 1), (0.35, 0)], 1800, 9000), rng.uniform(-0.6, 0.6), 0.08)
            if half:
                for tb in (0, 1.5, 3): L.add(t1 + tb * b, brass([r + 24, r + 31], 0.3, att=0.01, rel=0.1, drive=3.0, swell=0.05, lo_fc=350, hi_fc=2000), -0.15, 0.22)
    for t0, n, dd in mel:
        L.add(t0 * b, brass([n, n - 12], dd * b + 0.08, att=0.02, rel=0.15, drive=2.8, swell=0.2, hi_fc=2600 if t0 < 32 else 3000), 0.2, 0.3 if t0 < 32 else 0.34)
    for _ in range(10): L.add(rng.uniform(0, T), chain(0.4, 5, None, (1500, 4000)), rng.uniform(-0.7, 0.7), 0.05)
    for t0 in (0, 32): L.add(t0 * b, crash_cym(0.3, 3.0), 0.3); L.add(t0 * b, thud(40, 1.5, 0.3), 0, 0.4)
    for k in range(8): L.add(T - 2 * b + k * b / 4, anvil(1200 + 80 * k, 0.25, 0.06 + 0.02 * k), -0.1)
    L.reverb(2.2, 0.28, 4500)
    write_aligned((L, 'boss12', -19))

for k, f in FX.items(): wr('s_' + k, f())
library(); foundry(); boss11(); boss12()
PY
python3 -I "$T/synth10.py" "$T"

# ---------- musik ----------
mus library -20 anull "$T/library.wav"
mus library_hi -23 anull "$T/library_hi.wav"
mus foundry -20 anull "$T/foundry.wav"
mus foundry_hi -23 anull "$T/foundry_hi.wav"
mus boss11 -19 anull "$T/boss11.wav"
mus boss12 -19 anull "$T/boss12.wav"

# ---------- ljudeffekter ----------
E="$S/Environment"
G="$S/Combat and Gore"
X="$S/Materials"
# vapen: runboken och ångkanonen
fx rune_fire "[0:a]$P[a];[1:a]$P,volume=0.3[b];[a][b]$(mix 2),atrim=0:0.9,afade=t=out:st=0.65:d=0.25[o]" "$T/s_rune_fire.wav" "$R/bookFlip3.ogg"
fx rune_hit "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,volume=0.3[b];[a][b]$(mix 2),atrim=0:0.8,afade=t=out:st=0.55:d=0.25[o]" "$T/s_rune_hit.wav" "$I/impactGlass_light_002.ogg"
fx page_ward "[0:a]$P[a];[1:a]$P,volume=0.3[b];[2:a]$P,volume=0.25,adelay=150[c];[a][b][c]$(mix 3),atrim=0:1.6,afade=t=out:st=1.2:d=0.4[o]" "$T/s_page_ward.wav" "$X/paper_sort.wav" "$R/bookFlip1.ogg"
fx steam_fire "[0:a]$P[a];[1:a]$P,volume=0.45[b];[a][b]$(mix 2),atrim=0:1.0,afade=t=out:st=0.75:d=0.25[o]" "$T/s_steam_fire.wav" "$E/air_burst.wav"
fx steam_hiss "[0:a]$P[a];[1:a]$P,highpass=f=1500,volume=0.3[b];[a][b]$(mix 2),atrim=0:0.8,afade=t=out:st=0.55:d=0.25[o]" "$T/s_steam_hiss.wav" "$E/fire_lighting.wav"
# fiender: Det förbjudna biblioteket
TOP=-2 fx grimoire "[0:a]$P[a];[1:a]$P,volume=0.3[b];[2:a]$P,volume=0.35,adelay=350[c];[a][b][c]$(mix 3),atrim=0:1.2,afade=t=out:st=0.95:d=0.25[o]" "$T/s_grimoire.wav" "$R/bookFlip1.ogg" "$S/Items/book_close.wav"
fx grimoire_bite "[0:a]$P[a];[1:a]$P,volume=0.5,adelay=60[b];[2:a]$P,volume=0.2,adelay=60[c];[a][b][c]$(mix 3),atrim=0:0.6,afade=t=out:st=0.4:d=0.2[o]" "$T/s_grimoire_bite.wav" "$R/bookClose.ogg" "$G/crunch_quick.wav"
TOP=-2 fx inkslime "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,volume=0.35[b];[a][b]$(mix 2),atrim=0:1.3,afade=t=out:st=1.0:d=0.3[o]" "$T/s_inkslime.wav" "$G/squelching_2.wav"
fx ink_splash "[0:a]$P[a];[1:a]$P,volume=0.5[b];[2:a]$P,asetrate=33075,aresample=44100,volume=0.2,adelay=150[c];[a][b][c]$(mix 3),atrim=0:0.8,afade=t=out:st=0.55:d=0.25[o]" "$T/s_ink_splash.wav" "$G/splat_quick.wav" "$E/water_drop_medium.wav"
TOP=-2 fx archivist "[0:a]$P[a];[1:a]$P,atrim=0:1.6,asetpts=PTS-STARTPTS,lowpass=f=2500,volume=0.12,afade=t=in:d=0.3,afade=t=out:st=1.1:d=0.5[b];[2:a]$P,volume=0.2,adelay=300[c];[a][b][c]$(mix 3),atrim=0:1.8,afade=t=out:st=1.4:d=0.4[o]" "$T/s_archivist.wav" "$S/Other/ghost_long.wav" "$X/paper_move.wav"
fx archivist_blink "[0:a]$P[a];[1:a]$P,volume=0.25,adelay=280[b];[a][b]$(mix 2),atrim=0:0.9,afade=t=out:st=0.65:d=0.25[o]" "$T/s_archivist_blink.wav" "$X/paper_move.wav"
# fiender: Gjuteriet
TOP=-2 fx moltengolem "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,volume=0.3,afade=t=out:st=1.2:d=0.5[b];[2:a]$P,atrim=1:2.9,asetpts=PTS-STARTPTS,lowpass=f=800,volume=0.2,afade=t=in:d=0.2,afade=t=out:st=1.3:d=0.5[c];[a][b][c]$(mix 3),atrim=0:1.9,afade=t=out:st=1.55:d=0.35[o]" "$T/s_moltengolem.wav" "$X/stone_push_medium.wav" "$E/water_boiling_loop.wav"
fx molten_drip "[0:a]$P[a];[1:a]$P,asetrate=29400,aresample=44100,volume=0.35[b];[2:a]$P,volume=0.2,adelay=30[c];[a][b][c]$(mix 3),atrim=0:0.9,afade=t=out:st=0.65:d=0.25[o]" "$T/s_molten_drip.wav" "$E/water_drop_medium.wav" "$E/fire_lighting.wav"
TOP=-2 fx steambot "[0:a]$P[a];[1:a]$P,volume=0.25[b];[2:a]$P,volume=0.3,adelay=450[c];[a][b][c]$(mix 3),atrim=0:1.4,afade=t=out:st=1.15:d=0.25[o]" "$T/s_steambot.wav" "$S/Machines/hydraulic_up.wav" "$R/metalLatch.ogg"
fx steam_burst "[0:a]$P[a];[1:a]$P,volume=0.35[b];[2:a]$P,asetrate=33075,aresample=44100,volume=0.4[c];[a][b][c]$(mix 3),atrim=0:1.7,afade=t=out:st=1.3:d=0.4[o]" "$T/s_steam_burst.wav" "$S/Retro/explosion_small.wav" "$E/air_burst.wav"
TOP=-2 fx sparkdrone "[0:a]$P[a];[1:a]$P,atrim=0:1.3,asetpts=PTS-STARTPTS,volume=0.25,afade=t=in:d=0.1,afade=t=out:st=1.0:d=0.3[b];[a][b]$(mix 2),atrim=0:1.3,afade=t=out:st=1.05:d=0.25[o]" "$T/s_sparkdrone.wav" "$S/Machines/razor_buzz.wav"
TOP=-2 fx drone_zap "[0:a]$P[a];[1:a]$P,volume=0.3[b];[a][b]$(mix 2),atrim=0:0.55,afade=t=out:st=0.35:d=0.2[o]" "$T/s_drone_zap.wav" "$S/Other/snap.wav"
fx drone_pop "[0:a]$P[a];[1:a]$P,volume=0.4[b];[2:a]$P,volume=0.25,adelay=120[c];[a][b][c]$(mix 3),atrim=0:1.1,afade=t=out:st=0.8:d=0.3[o]" "$T/s_drone_pop.wav" "$S/Retro/explosion_small.wav" "$I/impactMetal_light_001.ogg"
# bossar
fx librarian_laugh "[0:a]$P[a];[1:a]$P,volume=0.12,adelay=900[b];[a][b]$(mix 2),atrim=0:2.3,afade=t=out:st=1.8:d=0.5[o]" "$T/s_librarian_laugh.wav" "$X/paper_scrunch.wav"
fx librarian_cast "[0:a]$P[a];[1:a]$P,volume=0.3,adelay=700[b];[2:a]$P,asetrate=33075,aresample=44100,volume=0.2,adelay=1000[c];[a][b][c]$(mix 3),atrim=0:2.0,afade=t=out:st=1.55:d=0.45[o]" "$T/s_librarian_cast.wav" "$S/Other/whoosh_1.wav" "$I/impactBell_heavy_001.ogg"
fx librarian_pages "[0:a]$P[a];[1:a]$P,volume=0.35,adelay=200[b];[2:a]$P,volume=0.3,adelay=700[c];[a][b][c]$(mix 3),atrim=0:2.2,afade=t=out:st=1.8:d=0.4[o]" "$T/s_librarian_pages.wav" "$X/paper_sort.wav" "$S/Items/page_turn.wav"
fx colossus_roar "[0:a]$P[a];[1:a]$P,asetrate=29400,aresample=44100,volume=0.25,adelay=200[b];[a][b]$(mix 2),atrim=0:2.8,afade=t=out:st=2.2:d=0.6[o]" "$T/s_colossus_roar.wav" "$S/Machines/industrial_door_open.wav"
fx colossus_slam "[0:a]$P[a];[1:a]$P,volume=0.5,adelay=120[b];[2:a]$P,asetrate=33075,aresample=44100,volume=0.4,adelay=120[c];[a][b][c]$(mix 3),atrim=0:2.0,afade=t=out:st=1.5:d=0.5[o]" "$T/s_colossus_slam.wav" "$I/impactMetal_heavy_002.ogg" "$I/impactPlate_heavy_003.ogg"
fx colossus_furnace "[0:a]$P[a];[1:a]$P,volume=0.3[b];[2:a]$P,volume=0.35,adelay=450[c];[a][b][c]$(mix 3),atrim=0:2.4,afade=t=out:st=1.9:d=0.5[o]" "$T/s_colossus_furnace.wav" "$S/Machines/industrial_door_open.wav" "$E/fire_lighting.wav"
# miljö: stans, ventil, pulpet, bläckflaska, slingor
fx press_slam "[0:a]$P[a];[1:a]$P,volume=0.3[b];[2:a]$P,volume=0.5,adelay=220[c];[a][b][c]$(mix 3),atrim=0:1.4,afade=t=out:st=1.1:d=0.3[o]" "$T/s_press_slam.wav" "$S/Machines/hydraulic_down.wav" "$I/impactPlate_heavy_001.ogg"
TOP=-2 fx vent_burst "[0:a]$P[a];[1:a]$P,atrim=0:0.3,asetpts=PTS-STARTPTS,volume=0.2,afade=t=out:st=0.2:d=0.1[b];[2:a]$P,asetrate=37485,aresample=44100,volume=0.5,adelay=250[c];[a][b][c]$(mix 3),atrim=0:1.8,afade=t=out:st=1.45:d=0.35[o]" "$T/s_vent_burst.wav" "$E/gurgling.wav" "$E/air_burst.wav"
fx lectern_read "[0:a]$P[a];[1:a]$P,volume=0.4[b];[2:a]$P,volume=0.3,adelay=150[c];[a][b][c]$(mix 3),atrim=0:1.8,afade=t=out:st=1.4:d=0.4[o]" "$T/s_lectern_read.wav" "$S/Items/book_open.wav" "$R/bookFlip2.ogg"
fx ink_pickup "[0:a]$P[a];[1:a]$P,volume=0.25[b];[a][b]$(mix 2),atrim=0:0.7,afade=t=out:st=0.5:d=0.2[o]" "$T/s_ink_pickup.wav" "$X/glass_ping_small.wav"
TOP=-4 fxloop belt_loop 2 0.4 "$P" "$T/s_belt_loop.wav"
TOP=-4 fxloop library_hum 4 0.8 "[0:a]$P[a];[1:a]$P,volume=0.08,adelay=1700[b];[a][b]$(mix 2)[o]" "$T/s_library_hum.wav" "$X/paper_move.wav"
TOP=-4 fxloop foundry_hum 4 0.8 "[0:a]$P[a];[1:a]$P,atrim=3:7.8,asetpts=PTS-STARTPTS,lowpass=f=600,volume=0.15[b];[a][b]$(mix 2)[o]" "$T/s_foundry_hum.wav" "$E/water_boiling_loop.wav"

for f in "$O"/{rune_fire,rune_hit,page_ward,steam_fire,steam_hiss,grimoire,grimoire_bite,inkslime,ink_splash,archivist,archivist_blink,moltengolem,molten_drip,steambot,steam_burst,sparkdrone,drone_zap,drone_pop,librarian_laugh,librarian_cast,librarian_pages,colossus_roar,colossus_slam,colossus_furnace,press_slam,belt_loop,vent_burst,lectern_read,ink_pickup,library_hum,foundry_hum}.ogg; do printf '%-40s %6.2f s %5d kB\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" "$(( $(stat -c %s "$f") / 1024 ))"; done
for f in "$M"/library.ogg "$M"/library_hi.ogg "$M"/foundry.ogg "$M"/foundry_hi.ogg "$M"/boss11.ogg "$M"/boss12.ogg; do printf '%-36s %6.2f s %5d kB %6s LUFS\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" "$(( $(stat -c %s "$f") / 1024 ))" "$(lufs "$f")"; done
