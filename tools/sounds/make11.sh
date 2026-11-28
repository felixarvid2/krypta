#!/bin/bash
# Ljud för Krypta version 14 ("Arenorna och de gamla biomernas nya invånare"): de nya fienderna i de mellersta och sena
# biomerna – snöfantomen (frost), lavaormen (volcano), skarabéprästen (tomb), kristallspindeln (crystal), marulken (sunken)
# och vindanden (sky) – och arenarummen (gallren fälls ned, en ny våg, gallren går upp).
# Den nya lavaormens morr heter lavaworm_growl: lavaworm.ogg finns redan sedan make4.sh och används av LAVAMASKEN ('Þ').
# Samma konventioner som make2.sh-make9.sh: effekter mono 22 kHz Vorbis q2 toppnormaliserade till $TOP dBFS
# (standard -1, fiendernas röster och den brusiga vindstöten -2, lockbetets mjuka ton -3). Inga slingor och ingen musik den här gången (därför ingen rot.py/xloop/mus).
# Källor: assets/audio (Kenney-paketen CC0: impact-sounds; 400 Sounds Pack CC0). Allt annat – vind, viskningar, röster,
# lava, sand, skarabéer, kristall, vatten, galler, mässing – syntetiseras med python3 + numpy (inbäddat nedan).
# Deterministiskt: fast frö för slumptalen och -fflags +bitexact (annars slumpar Ogg-muxern serienumret).
# Kör från katalogen där retrofps/ (repot) och assets/audio/ ligger: bash retrofps/tools/sounds/make11.sh
set -e
O=retrofps/assets/snd
A=assets/audio
S="$A/400 Sounds Pack"
I=$A/impact-sounds/Audio
E="$S/Environment"
G="$S/Combat and Gore"
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
mkdir -p "$O"

peak() { ffmpeg -hide_banner -nostats -i "$1" -af volumedetect -f null - 2>&1 | sed -n 's/.*max_volume: \(-\{0,1\}[0-9.]*\) dB.*/\1/p'; }
lufs() { ffmpeg -hide_banner -nostats -i "$1" -af ebur128 -f null - 2>&1 | awk '$1=="I:"{i=$2} END{print i}'; }
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
  local v; v=$(calc "${TOP:--1} - ($(peak "$T/$n.wav"))")
  ffmpeg -loglevel error -y -i "$T/$n.wav" -af "volume=${v}dB" -c:a libvorbis -q:a 2 -fflags +bitexact "$O/$n.ogg"
}
P="aresample=44100,aformat=sample_fmts=fltp:channel_layouts=mono"
mix() { echo "amix=inputs=$1:normalize=0:duration=longest"; }

cat > "$T/synth11.py" <<'PY'
# Syntetiserade effekter för Krypta version 14. Användning: python3 synth11.py <katalog>
# Byggstenarna nedan är desamma som i make9.sh; nya står under "vind, viskningar, lava, sand, kristallben, vatten".
import sys, wave, re, subprocess, numpy as np
SR = 44100
OUT = sys.argv[1]
rng = np.random.default_rng(14014)
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


# ---- nya byggstenar: vind, viskningar, lava, sand, kristallben, vatten ----
def howl(d, f, q=10.0, g=1.0):  # ylande vind: brus genom ett smalt, resonant bandpass vars mittfrekvens f (tal eller kurva) glider
    t = tt(d); f = np.broadcast_to(np.asarray(f, float), t.shape)
    return nrm(svf(noise(d), f * (1 + 0.03 * lpnoise(d, 4)), q)) * g

def whisper(syl, d, g=1.0):  # viskning: tonlöst brus genom vokalformanter; stavelser [(t0, längd, F, s före, s efter)]
    y = np.zeros(int(d * SR))  # där s är styrkan på ett väsljud ("ss/sch") före eller efter vokalen
    for t0, dd, F, sb, sa in syl:
        v = nrm(reson(noise(dd), F)); place(y, t0, v * env(len(v), 0.03, dd * 0.5))
        k = tt(0.12); s = nrm(fftfilt(noise(0.12), 3500, 9000)) * np.sin(np.pi * k / 0.12) ** 2
        if sb: place(y, t0 - 0.08, s, sb)
        if sa: place(y, t0 + dd - 0.05, s, sa)
    return y * g

def blub(f=120, d=0.12, g=1.0):  # tjock lavabubbla: låg ton som stiger medan bubblan sväller, och ett blött plopp när den spricker
    b = tt(d); y = np.zeros(len(b) + int(0.03 * SR))
    y[:len(b)] = np.sin(phase(f * (1 + 1.5 * (b / d) ** 2))) * np.sin(np.pi * b / d) ** 0.5
    place(y, d * 0.85, nrm(reson(noise(0.03), [(f * 6, f, 1), (f * 14, f * 2, 0.4)])) * np.exp(-tt(0.03) * 150), 0.5)
    return y * g

def blubs(d, n, lo=60, hi=200, g=1.0, dens=None):  # lavan puttrar: tjocka bubblor (dens styr var i tiden)
    y = np.zeros(int(d * SR)); dens = np.ones(len(y)) if dens is None else dens
    for t0 in pick_times(dens, n): place(y, t0, blub(rng.uniform(lo, hi), rng.uniform(0.07, 0.18)), rng.uniform(0.3, 1) * g)
    return y

def sizzle(d, g=1.0):  # fräsande hetta: tätt högfrekvent knaster och sus
    return (crackle(d, int(400 * d), 3000, 10000, 1.0) * 0.6 + nrm(fftfilt(noise(d), 4000, 10000)) * 0.25) * g

def skitter(d, rate, f=(3000, 6000), g=1.0):  # kristallben som trippar: små klirrande spetsar i snabba fyrtal (spindelgång)
    y = np.zeros(int(d * SR)); tc = 0.0
    while tc < d - 0.1:
        for j in range(4): place(y, tc + j * rng.uniform(0.012, 0.02), crys(rng.uniform(*f), 0.08, 1, rng.uniform(15, 30), 0.006), rng.uniform(0.3, 0.9))
        tc += 1 / rate * rng.uniform(0.85, 1.15)
    return y * g

def whirl(d, f0=700, f1=2500, rate=2.5, q=1.5, g=1.0):  # virvlande sand: bandat brus vars mittfrekvens snurrar upp och ned
    t = tt(d); fc = np.sqrt(f0 * f1) * (f1 / f0) ** (0.5 * np.sin(2 * np.pi * rate * t * (1 + 0.3 * t / d)))
    return nrm(svf(noise(d), fc, q)) * (0.7 + 0.3 * np.sin(2 * np.pi * rate * 2 * t)) * g

def sistrum(d=0.3, g=1.0):  # sistrum: metallbrickor som skallrar fram och tillbaka (två skak)
    y = np.zeros(int(d * SR))
    for t0 in (0.0, d * 0.45):
        for _ in range(10): place(y, t0 + rng.uniform(0, 0.05), ting(0.1, rng.uniform(3000, 6000), 1, rng.uniform(2, 4)), rng.uniform(0.1, 0.5))
    return y * g

# ================= effekter =================
# ---- frost: snöfantomen ----
def snowwraith():  # snöfantomen: ylande vind som stiger och faller, en spöklik "oo"-ton och en kall viskning ("hhaa – ee – hoosch")
    d = 1.9; t = tt(d); y = np.zeros(len(t))
    a = np.interp(t, [0, 0.35, 1.2, d], [0, 1, 0.7, 0]) ** 1.2
    y += howl(d, np.interp(t, [0, 0.4, 0.9, 1.4, d], [420, 780, 650, 900, 500]), 12) * a * 0.55
    y += howl(d, np.interp(t, [0, 0.5, d], [1100, 1500, 1000]), 18) * a * 0.25
    y += gust(d, 250, 1600, 0.35) * 0.45
    f0 = np.interp(t, [0, 0.5, 1.1, d], [330, 392, 370, 300]) * (1 + 0.012 * np.sin(2 * np.pi * 5 * t))
    y += nrm(voice(f0, SOO, 4000, jitter=0.004, roll=1.2)) * np.interp(t, [0, 0.4, 0.9, 1.6, d], [0, 0, 0.22, 0.08, 0])
    y += whisper([(0.25, 0.35, HA, 0.6, 0), (0.7, 0.3, EH, 0, 0), (1.05, 0.5, OH, 0, 0.9)], d, 0.5)
    for _ in range(5): place(y, rng.uniform(0.2, 1.4), crys(rng.uniform(4000, 7000), 0.4, 1, 6), rng.uniform(0.03, 0.07))
    return cut(verb(y, 1.4, 0.35, 7000), d, 0.4)

def snowwraith_freeze():  # isig beröring: frost som knastrar fram, en klar och kall klang och ett fallande isskimmer
    d = 1.4; t = tt(d); y = np.zeros(len(t)); c = 0.22
    for t0 in pick_times(np.interp(t, [0, c, c + 0.4, d], [0.2, 1, 0.3, 0]), 120):
        place(y, t0, crys(rng.uniform(5000, 9000), 0.03, 1, 60, 0.01), rng.uniform(0.05, 0.3))
    y += nrm(fftfilt(noise(d), 5000, 10000)) * np.interp(t, [0, c, c + 0.5, d], [0, 0.12, 0.03, 0])
    place(y, 0, swish(c + 0.05, 1500, 6000, 3.0), 0.25)
    place(y, c, crys(m2f(96), 1.2, 0.9, 1.2)); place(y, c, crys(m2f(103), 1.0, 0.5, 1.6)); place(y, c, ting(0.8, 3800, 0.4, 0.6))
    place(y, c, tick(0.02, 0.5, 4000, 11000, 300))
    for i, n in enumerate((108, 103, 99, 96)): place(y, c + 0.08 + 0.07 * i, bar(m2f(n), 0.6, 0.15, dec=4))
    return cut(verb(y, 1.3, 0.35, 9000), d, 0.35)

# ---- volcano: lavaormen ----
def lavaworm_growl():  # lavaormen: djupt, bubblande morr ur en glödande strupe, tjocka lavabubblor som spricker och fräs
    d = 1.7; t = tt(d); y = np.zeros(len(t))
    f0 = np.interp(t, [0, 0.25, 0.8, 1.3, d], [40, 58, 52, 47, 38]) * (1 + 0.04 * lpnoise(d, 8))
    a = env(len(t), 0.1, 0.5)
    y += growl(d, f0, [(np.interp(t, [0, 0.6, d], [330, 480, 300]), 80, 1), (700, 110, 0.45), (1900, 220, 0.1)], 0.8, 0.5, 3500, 2.6) * a
    y *= 0.75 + 0.25 * np.sin(phase(9 + 4 * lpnoise(d, 3)))  # strupen bubblar
    y += blubs(d, 22, 60, 180, 0.6, a + 0.1)
    y += sizzle(d, 0.08) * np.interp(t, [0, 0.3, d], [0.3, 1, 0.5])
    y += low_rumble(d, 32) * a * 0.3
    return cut(verb(fftfilt(y, 25, 6000), 0.9, 0.2, 3500), d, 0.35)

def lavaworm_emerge():  # lavaormen bryter upp: mullret växer, skorpan knakar, lavan väller upp med ett tungt och blött "vroosch",
    # puttrar och fräser, och småsten regnar ned
    d = 2.0; t = tt(d); y = np.zeros(len(t)); c = 0.55
    y += low_rumble(d, 30) * np.interp(t, [0, c, c + 0.3, d], [0.1, 0.8, 1, 0]) * 0.6
    for t0 in (0.18, 0.33, 0.45): place(y, t0, crack(0.08, 1, 600), 0.25 + 0.3 * t0); place(y, t0, debris(0.25, 8, 300, 2500, 0.1), 0.4)
    place(y, c, thud(38, 1.0, 0.6)); place(y, c, crack(0.12, 1, 400), 0.8); place(y, c + 0.05, splat(0.3), 0.6)
    a = np.interp(t, [0, c, c + 0.06, c + 0.6, d], [0, 0, 1, 0.5, 0])
    y += nrm(svf(noise(d), 200 + 1200 * a, 0.8, 'lp')) * a * 0.8
    y += blubs(d, 30, 50, 160, 0.7, a + 0.02)
    y += sizzle(d, 0.18) * np.interp(t, [0, c, c + 0.2, d], [0, 0, 1, 0.3])
    place(y, c + 0.1, debris(d - c - 0.1, 40, 400, 3000), 0.5)
    return cut(verb(y, 1.2, 0.25, 4000), d, 0.5)

def lava_spit():  # lavaspott: gurglande uppstötning, ett blött "ptoh" och den glödande klumpen som fräser iväg
    d = 1.0; y = np.zeros(int(d * SR)); c = 0.2
    k = tt(c + 0.05); g = growl(c + 0.05, np.interp(k, [0, c], [60, 90]), [(450, 90, 1), (900, 130, 0.4), (2000, 200, 0.1)], 0.6, 0.6, 3000, 2.4)
    place(y, 0, g * env(len(g), 0.03, 0.03), 0.5); place(y, 0, blubs(c, 5, 80, 200), 0.6)
    place(y, c, puff(0.12, 300, 3500, 1, 0.1), 0.9); place(y, c, splat(0.2), 0.7); place(y, c, blub(160, 0.08), 0.5)
    k = tt(d - c); a = np.interp(k, [0, 0.05, d - c], [0, 1, 0]) ** 1.3
    place(y, c + 0.02, nrm(svf(noise(d - c), 2500 * 0.4 ** (k / (d - c)), 2.0)) * a, 0.35)
    place(y, c + 0.02, sizzle(d - c) * a, 0.25)
    return cut(verb(y, 0.6, 0.15, 5000), d, 0.3)

# ---- tomb: skarabéprästen ----
def scarabpriest():  # skarabéprästen: en låg, nasal mansröst som sjunger en klagande fras i hijaz (d-ess-fiss-g), en nynnande
    # underton och ett sistrum som skallrar på frasens betoningar
    d = 2.0; y = np.zeros(int(d * SR))
    F = [(600, 100, 1.0), (1000, 120, 0.55), (2500, 200, 0.2), (3300, 300, 0.08)]
    notes = [(0.0, 50, 0.3), (0.3, 51, 0.18), (0.48, 54, 0.22), (0.7, 55, 0.4), (1.1, 54, 0.2), (1.3, 51, 0.15), (1.45, 50, 0.4)]
    place(y, 0.05, sing(notes, F, 1.0, 0.012, 0.04, 4500, 0.8, 0.06), 0.75)
    place(y, 0, nrm(choir([38], 1.9, 0.3, 0.5, 1.0, 4.0, MM, 2000)), 0.25)
    for t0 in (0.05, 0.75, 1.5): place(y, t0, sistrum(0.3), 0.35)
    return cut(verb(y, 1.3, 0.3, 5000), d, 0.4)

def scarab_curse():  # förbannelsen: sand som virvlar upp runt dig (snurrande sus och sandkorn), skarabéer som krafsar och klickar
    # med sina skal och en mörk, klagande ton (tritonus) som glider ned
    d = 2.2; t = tt(d); y = np.zeros(len(t))
    a = np.interp(t, [0, 0.5, 1.5, d], [0, 1, 0.8, 0])
    y += whirl(d, 600, 3000, 1.8) * a * 0.5 + whirl(d, 1500, 6000, 2.6, 2.0) * a * 0.2
    y += nrm(grains(d, 4000, 2000, 8000, 0.003)) * a * 0.5
    for t0 in pick_times(np.interp(t, [0, 0.4, d], [0, 1, 0.6]), 70):
        place(y, t0, clack(rng.uniform(1800, 3800), 1, rng.uniform(250, 450), 0.03), rng.uniform(0.1, 0.45))
    f = m2f(57) * np.interp(t, [0, 0.6, d], [1, 1, 2 ** (-1 / 12)])
    tone = np.sin(phase(f)) + 0.7 * np.sin(phase(f * 2 ** 0.5 * 1.002)) + 0.4 * np.sin(phase(f / 2))
    y += tone * np.interp(t, [0, 0.3, 1.0, d], [0, 0, 1, 0]) * 0.1
    return cut(verb(y, 1.4, 0.3, 6000), d, 0.45)

# ---- crystal: kristallspindeln ----
def crystalspider():  # kristallspindeln: klirrande kristallben som trippar över stenen, ett väsande, glasartat kvitter och skimmer
    d = 1.3; y = np.zeros(int(d * SR))
    place(y, 0, skitter(0.8, 9, (3500, 7000)), 0.8)
    for i in range(6): place(y, 0.72 + 0.035 * i, clack(rng.uniform(2300, 2800), 1, 300, 0.03), 0.35)
    s = squeal(0.35, 1800, 2600); s = s + 0.6 * nrm(reson(s, [(2900, 30, 1), (4700, 40, 0.6)]))
    place(y, 0.75, s, 0.35)
    place(y, 0.72, nrm(fftfilt(noise(0.45), 3000, 9000)) * env(int(0.45 * SR), 0.02, 0.3), 0.12)
    place(y, 0.78, crys(3100, 0.5, 0.25, 3.0))
    return cut(verb(y, 0.8, 0.25, 9000), d, 0.3)

def web_shot():  # kristallnätet skjuts: ett elastiskt "thwip" (sträng som släpps, stigande pip, svisch) och glitter som följer nätet
    d = 0.8; y = np.zeros(int(d * SR))
    place(y, 0, twang(260, 0.3, 1.0, 14), 0.5); place(y, 0, ric(900, 2600, 0.12, 1.0, 0.0), 0.25)
    place(y, 0, swish(0.35, 3500, 900, 2.5), 0.6); place(y, 0, tick(0.02, 0.4, 3000, 11000, 300))
    for i in range(7): place(y, 0.04 + 0.05 * i + rng.uniform(0, 0.02), crys(rng.uniform(3500, 6500), 0.25, 1, 8, 0.006), 0.18 * (1 - i / 9))
    return cut(verb(y, 0.6, 0.2, 9000), d, 0.25)

def web_break():  # nätet bryts: kristallen knakar under spänning, spricker med ett skarpt knäpp och faller i klirrande skärvor
    d = 1.1; y = np.zeros(int(d * SR)); c = 0.16
    for _ in range(8): place(y, rng.uniform(0, c - 0.01), crys(rng.uniform(2500, 5000), 0.05, 1, 40, 0.01), rng.uniform(0.1, 0.35))
    place(y, 0, creak(c + 0.03, 60, 120, 1400), 0.15)
    place(y, c, shatter(d - c, 45, 1.0, 0.45, 3000, 9000), 0.85); place(y, c, crys(2200, 0.9, 0.5, 4.0))
    return cut(verb(y, 0.8, 0.25, 9000), d, 0.3)

# ---- sunken: marulken ----
def anglerfish():  # marulken: ett dovt, bubbligt morr som hörs genom vattnet, bubbelströmmar ur gapet och ett lågt tryck
    d = 1.7; t = tt(d); y = np.zeros(len(t))
    f0 = np.interp(t, [0, 0.3, 0.9, d], [55, 75, 66, 48]); a = env(len(t), 0.15, 0.5)
    g = growl(d, f0, [(np.interp(t, [0, 0.7, d], [400, 560, 380]), 90, 1), (800, 120, 0.5), (2000, 220, 0.12)], 0.7, 0.4, 3000, 2.2)
    y += g * (0.65 + 0.35 * np.sin(phase(np.interp(t, [0, d], [7, 4])))) * a
    y += bubbles(d, 45, 300, 1100, 0.5, a + 0.05) + low_rumble(d, 30) * a * 0.25
    y = fftfilt(y, 30, 1600)  # under vatten: dämpad diskant
    y += bubbles(d, 12, 900, 1800, 0.25, a)  # några klara bubblor nära örat
    return cut(verb(y, 1.2, 0.35, 2500), d, 0.4)

def angler_lure():  # marulkens lockbete: en mjuk, svävande ton som stiger i tre steg ("uu – uu – uuu") med långsamt vibrato,
    # glasartat skimmer och ett pulserande sken – dämpat som under vatten
    d = 2.0; y = np.zeros(int(d * SR))
    notes = [(0.0, 76, 0.42), (0.45, 79, 0.42), (0.9, 83, 0.85)]
    t, f0, amp, since = legato(notes, 0.08)
    v = 1 + 0.01 * np.clip((since - 0.1) / 0.3, 0, 1) * np.sin(2 * np.pi * 4.5 * t); ph = phase(f0 * v)
    tone = (np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.6 * np.sin(phase(f0 * v * 1.004))) * amp * (1 + 0.25 * np.sin(2 * np.pi * 3 * t))
    place(y, 0.05, tone, 0.5)
    for t0, n, dd in notes: place(y, t0 + 0.05, glass(n + 12, dd + 0.5, 0.25, att=0.05, rel=0.4))
    for _ in range(8): place(y, rng.uniform(0.1, 1.5), bar(m2f(rng.choice([95, 98, 100, 103])), 0.5, 0.06, dec=5))
    y = fftfilt(y, 80, 3200) + nrm(fftfilt(noise(d), 200, 900)) * 0.03 * env(len(y), 0.4, 0.6)
    return cut(verb(y, 1.6, 0.4, 3000), d, 0.45)

def angler_bite():  # marulken hugger: vattnet forsar när den kastar sig fram, käkarna smäller ihop (hårt benklack), ett blött
    # krasande och bubblor
    d = 0.9; y = np.zeros(int(d * SR)); c = 0.16
    k = tt(c + 0.05); a = (k / c) ** 2 * np.clip((c + 0.05 - k) / 0.05, 0, 1)
    place(y, 0, nrm(svf(noise(c + 0.05), 300 + 1500 * a, 1.0, 'lp')) * a, 0.6)
    place(y, c, clack(1500, 1, 220, 0.06), 1.0); place(y, c, clack(2400, 1, 300, 0.04), 0.6); place(y, c, thud(90, 0.3, 0.0), 0.6)
    place(y, c + 0.02, debris(0.15, 10, 800, 4000, 0.06), 0.5); place(y, c + 0.02, splat(0.25), 0.5)
    place(y, c, bubbles(d - c, 25, 300, 1400, 1.0, np.exp(-tt(d - c) * 5)), 0.4)
    return cut(verb(y, 0.7, 0.25, 4000), d, 0.3)

# ---- sky: vindanden ----
def windspirit():  # vindanden: ett mjukt sus som andas in och ut, en luftig, hoande röst, ett tunt ylande och fladdrande vindtrasor
    d = 1.8; t = tt(d); y = np.zeros(len(t))
    place(y, 0, gust(0.9, 300, 2200, 0.5), 0.6); place(y, 0.7, gust(1.05, 400, 2600, 0.4), 0.7)
    place(y, 0.25, hoot(0.9, 520, 1.0, 0.04), 0.3)
    y += whisper([(0.3, 0.6, OH, 0, 0), (1.0, 0.5, OH, 0, 0)], d, 0.25)
    a = np.interp(t, [0, 0.5, 1.2, d], [0, 1, 0.8, 0])
    y += howl(d, np.interp(t, [0, 0.6, 1.2, d], [700, 1100, 900, 800]), 15) * a * 0.2
    y += nrm(svf(noise(d), 1200, 2)) * (0.5 + 0.5 * np.sin(2 * np.pi * 22 * t)) * a * 0.08
    return cut(verb(y, 1.2, 0.3, 6000), d, 0.4)

def wind_howl():  # kraftig vindstöt: ett dånande sus som sveper in och träffar hårt, ett tjutande ylande ovanpå, tryck och fladder
    d = 1.8; t = tt(d); y = np.zeros(len(t)); a = np.interp(t, [0, 0.25, 0.7, d], [0, 1, 0.7, 0]) ** 1.2
    y += nrm(svf(noise(d), 200 + 2800 * a, 0.7, 'lp')) * a
    y += howl(d, np.interp(t, [0, 0.3, 0.8, d], [500, 1100, 950, 600]), 10) * a * 0.45
    y += howl(d, np.interp(t, [0, 0.3, d], [1300, 2000, 1200]), 14) * a ** 2 * 0.2
    y += nrm(fftfilt(noise(d), 60, 250)) * a * 0.5
    y += nrm(svf(noise(d), 900, 1.5)) * (0.5 + 0.5 * np.sin(2 * np.pi * 17 * t)) * a * 0.15
    return cut(verb(y, 1.0, 0.25, 6000), d, 0.4)

# ---- arenarummen ----
def arena_lock():  # gallren fälls ned: spärrhaken släpper, kedjan rasslar allt fortare, järnet susar ned och slår i stengolvet med
    # ett tungt metalliskt brak, ett efterskrammel av stänger och kedja och ett eko i salen
    d = 2.0; t = tt(d); y = np.zeros(len(t)); c = 0.55
    place(y, 0, clack(1800, 1, 200, 0.05), 0.8); place(y, 0.01, ting(0.3, 2200, 0.4, 1.5))
    place(y, 0.03, ratchet(c - 0.05, 14, 45, 1900, 2600), 0.45)
    place(y, 0, chain(d, 40, np.interp(t, [0, 0.05, c, c + 0.01, d], [0, 0.3, 1, 0, 0]), (1800, 4500)), 0.35)
    k = tt(c); place(y, 0, nrm(svf(noise(c), 600 * 4 ** (k / c), 3)) * (k / c) ** 2, 0.25)
    place(y, c, thud(42, 1.0, 0.8)); place(y, c, anvil(240, 1.2, 0.8)); place(y, c, anvil(410, 1.0, 0.5)); place(y, c, bolt(0.3), 0.25)
    for i, t0 in enumerate((0.12, 0.22, 0.3)):
        place(y, c + t0, anvil(rng.uniform(500, 800), 0.4, 0.25 / (i + 1))); place(y, c + t0, clack(1500, 1, 250), 0.3 / (i + 1))
    place(y, c + 0.05, chain(0.6, 18, np.exp(-tt(0.6) * 6), (1500, 4000)), 0.3)
    y += low_rumble(d, 35) * np.interp(t, [0, c, c + 0.05, d], [0, 0, 1, 0]) * 0.4
    return cut(verb(y, 1.8, 0.35, 5000), d, 0.5)

def arena_wave():  # en ny våg: ett kort, hotfullt signalstick – två stötar ("da-DAAM") av distad mässing i ett förminskat ackord
    # över en dov trumma, och ett lågt gongliknande klockslag
    d = 1.3; y = np.zeros(int(d * SR)); ch = [50, 53, 56, 62]
    place(y, 0, drum(52, 0.4, 0.6, 0.4, 7)); place(y, 0, brass(ch, 0.14, 0.005, 0.06, 3.0, 700, 3200, 0.04), 0.45)
    c = 0.2
    place(y, c, drum(46, 1.0, 1.0, 0.4, 4)); place(y, c, tick(0.03, 0.4, 2000, 9000, 120))
    place(y, c, brass(ch, 0.7, 0.008, 0.4, 3.0, 700, 3200, 0.06), 0.7)
    place(y, c, bell(38, 1.1, 1.0) * np.exp(-tt(1.1) * 1.5), 0.3)
    return cut(verb(y, 1.2, 0.35, 5000), d, 0.4)

def arena_clear():  # arenan är rensad: en mässingsfanfar i D-dur (ta-ta-TAA-taaa), gallren vevas upp (spärrhjul som klickar allt
    # långsammare och kedja) och stannar med ett klonk, och ljusa klockor som klingar ut
    d = 2.6; y = np.zeros(int(d * SR))
    place(y, 0, ratchet(1.2, 30, 10, 2000, 2400), 0.3); place(y, 0, chain(1.2, 25, np.interp(tt(1.2), [0, 1.2], [1, 0.3]), (2000, 4500)), 0.2)
    place(y, 1.2, clack(900, 1, 120, 0.08), 0.6); place(y, 1.2, anvil(520, 0.6, 0.35)); place(y, 1.2, thud(70, 0.3, 0.1), 0.4)
    for t0, ch, dd, g in ((0.0, [62, 66, 69], 0.16, 0.45), (0.18, [62, 66, 69], 0.16, 0.45), (0.36, [67, 71, 74], 0.3, 0.55), (0.7, [62, 66, 69, 74], 1.4, 0.7)):
        place(y, t0, brass(ch, dd, 0.01, min(0.3, dd * 0.5), 2.2, 900, 3500, min(0.3, dd * 0.4)), g)
    place(y, 0.7, drum(55, 1.0, 1.0, 0.3), 0.6); place(y, 0.7, tubebell(86, 1.9), 0.3); place(y, 0.7, bell(74, 1.9), 0.2)
    return cut(verb(y, 1.6, 0.35, 6000), d, 0.6)

FX = dict(snowwraith=snowwraith, snowwraith_freeze=snowwraith_freeze, lavaworm_growl=lavaworm_growl, lavaworm_emerge=lavaworm_emerge,
          lava_spit=lava_spit, scarabpriest=scarabpriest, scarab_curse=scarab_curse, crystalspider=crystalspider, web_shot=web_shot,
          web_break=web_break, anglerfish=anglerfish, angler_lure=angler_lure, angler_bite=angler_bite, windspirit=windspirit,
          wind_howl=wind_howl, arena_lock=arena_lock, arena_wave=arena_wave, arena_clear=arena_clear)
for k, f in FX.items(): wr('s_' + k, f())
PY
python3 -I "$T/synth11.py" "$T"

# ---------- ljudeffekter ----------
# frost: snöfantomen
TOP=-2 fx snowwraith "[0:a]$P[a];[1:a]$P,atrim=4.3:6.2,asetpts=PTS-STARTPTS,highpass=f=200,volume=0.6,afade=t=in:d=0.4,afade=t=out:st=1.2:d=0.7[b];[a][b]$(mix 2),atrim=0:1.9,afade=t=out:st=1.5:d=0.4[o]" "$T/s_snowwraith.wav" "$E/ambient_wind.wav"
fx snowwraith_freeze "[0:a]$P[a];[1:a]$P,asetrate=52920,aresample=44100,volume=0.3,adelay=220[b];[2:a]$P,highpass=f=1500,volume=0.3,adelay=40[c];[a][b][c]$(mix 3),atrim=0:1.4,afade=t=out:st=1.05:d=0.35[o]" "$T/s_snowwraith_freeze.wav" "$I/impactGlass_light_000.ogg" "$E/ice_in_water.wav"
# volcano: lavaormen
TOP=-2 fx lavaworm_growl "[0:a]$P[a];[1:a]$P,atrim=2:3.7,asetpts=PTS-STARTPTS,asetrate=26460,aresample=44100,lowpass=f=1500,volume=0.35,afade=t=in:d=0.2,afade=t=out:st=1.6:d=1.2[b];[2:a]$P,atrim=0:1.2,asetrate=30870,aresample=44100,volume=0.3,adelay=200[c];[a][b][c]$(mix 3),atrim=0:1.7,afade=t=out:st=1.35:d=0.35[o]" "$T/s_lavaworm_growl.wav" "$E/water_boiling_loop.wav" "$E/gurgling.wav"
fx lavaworm_emerge "[0:a]$P[a];[1:a]$P,asetrate=26460,aresample=44100,lowpass=f=2000,volume=0.4,adelay=550[b];[2:a]$P,volume=0.3,adelay=180[c];[3:a]$P,atrim=5:6.4,asetpts=PTS-STARTPTS,asetrate=33075,aresample=44100,volume=0.3,afade=t=in:d=0.05,afade=t=out:st=0.6:d=0.8,adelay=600[d];[a][b][c][d]$(mix 4),atrim=0:2.0,afade=t=out:st=1.5:d=0.5[o]" "$T/s_lavaworm_emerge.wav" "$S/Retro/explosion_small.wav" "$I/impactMining_002.ogg" "$E/water_boiling_loop.wav"
fx lava_spit "[0:a]$P[a];[1:a]$P,volume=0.4,adelay=190[b];[2:a]$P,volume=0.3,adelay=130,afade=t=out:st=0.6:d=0.15[c];[a][b][c]$(mix 3),atrim=0:1.0,afade=t=out:st=0.7:d=0.3[o]" "$T/s_lava_spit.wav" "$G/splat_quick.wav" "$E/fire_lighting.wav"
# tomb: skarabéprästen
TOP=-2 fx scarabpriest "[0:a]$P[a];[1:a]$P,highpass=f=2500,volume=0.15,adelay=50[b];[2:a]$P,highpass=f=2500,volume=0.12,adelay=1500[c];[a][b][c]$(mix 3),atrim=0:2.0,afade=t=out:st=1.6:d=0.4[o]" "$T/s_scarabpriest.wav" "$S/Items/keys_jingling.wav" "$S/Items/keys_jingling.wav"
fx scarab_curse "[0:a]$P[a];[1:a]$P,volume=0.3,adelay=250[b];[2:a]$P,asetrate=52920,aresample=44100,highpass=f=1200,volume=0.25,adelay=700[c];[a][b][c]$(mix 3),atrim=0:2.2,afade=t=out:st=1.75:d=0.45[o]" "$T/s_scarab_curse.wav" "$S/Items/broom_sweep_1.wav" "$S/Card and Board/dice_shake_3.wav"
# crystal: kristallspindeln
TOP=-2 fx crystalspider "[0:a]$P[a];[1:a]$P,asetrate=55125,aresample=44100,volume=0.25,adelay=760[b];[a][b]$(mix 2),atrim=0:1.3,afade=t=out:st=1.0:d=0.3[o]" "$T/s_crystalspider.wav" "$I/impactGlass_light_002.ogg"
fx web_shot "[0:a]$P[a];[1:a]$P,volume=0.35[b];[2:a]$P,asetrate=52920,aresample=44100,volume=0.25[c];[a][b][c]$(mix 3),atrim=0:0.8,afade=t=out:st=0.55:d=0.25[o]" "$T/s_web_shot.wav" "$S/Other/elastic_twang.wav" "$G/swipe.wav"
fx web_break "[0:a]$P[a];[1:a]$P,volume=0.5,adelay=160[b];[2:a]$P,asetrate=52920,aresample=44100,volume=0.25,adelay=30[c];[a][b][c]$(mix 3),atrim=0:1.1,afade=t=out:st=0.8:d=0.3[o]" "$T/s_web_break.wav" "$I/impactGlass_medium_001.ogg" "$I/impactGlass_light_004.ogg"
# sunken: marulken
TOP=-2 fx anglerfish "[0:a]$P[a];[1:a]$P,atrim=0:1.7,lowpass=f=1200,volume=0.3,afade=t=in:d=0.2,afade=t=out:st=1.1:d=0.6[b];[2:a]$P,asetrate=26460,aresample=44100,lowpass=f=1500,volume=0.3,adelay=300[c];[a][b][c]$(mix 3),atrim=0:1.7,afade=t=out:st=1.3:d=0.4[o]" "$T/s_anglerfish.wav" "$E/water_babbling_loop.wav" "$E/gurgling.wav"
TOP=-3 fx angler_lure "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,lowpass=f=3000,volume=0.2,adelay=950[b];[a][b]$(mix 2),atrim=0:2.0,afade=t=out:st=1.55:d=0.45[o]" "$T/s_angler_lure.wav" "$S/Materials/glass_ping_small.wav"
fx angler_bite "[0:a]$P[a];[1:a]$P,volume=0.3,adelay=30[b];[2:a]$P,atrim=0.3:0.9,asetpts=PTS-STARTPTS,highpass=f=250,lowpass=f=3000,volume=0.25,afade=t=in:d=0.05,afade=t=out:st=0.3:d=0.3,adelay=150[c];[a][b][c]$(mix 3),atrim=0:0.9,afade=t=out:st=0.6:d=0.3[o]" "$T/s_angler_bite.wav" "$G/crunch_quick.wav" "$E/water_splashing.wav"
# sky: vindanden
TOP=-2 fx windspirit "[0:a]$P[a];[1:a]$P,volume=0.3,adelay=100[b];[2:a]$P,atrim=2:3.8,asetpts=PTS-STARTPTS,volume=0.4,afade=t=in:d=0.4,afade=t=out:st=1.0:d=0.8[c];[a][b][c]$(mix 3),atrim=0:1.8,afade=t=out:st=1.4:d=0.4[o]" "$T/s_windspirit.wav" "$S/Other/whoosh_2.wav" "$E/ambient_wind.wav"
TOP=-2 fx wind_howl "[0:a]$P[a];[1:a]$P,atrim=6.9:8.6,asetpts=PTS-STARTPTS,volume=0.4,afade=t=in:d=0.2,afade=t=out:st=1.0:d=0.7[b];[2:a]$P,asetrate=33075,aresample=44100,volume=0.3,adelay=120[c];[a][b][c]$(mix 3),atrim=0:1.8,afade=t=out:st=1.4:d=0.4[o]" "$T/s_wind_howl.wav" "$E/ambient_wind.wav" "$S/Other/whoosh_1.wav"
# arenarummen
fx arena_lock "[0:a]$P[a];[1:a]$P,volume=0.35,adelay=550[b];[2:a]$P,volume=0.3,adelay=250[c];[3:a]$P,asetrate=33075,aresample=44100,volume=0.25,adelay=550[d];[a][b][c][d]$(mix 4),volume=0.6,atrim=0:2.0,afade=t=out:st=1.5:d=0.5[o]" "$T/s_arena_lock.wav" "$I/impactMetal_heavy_001.ogg" "$S/Machines/industrial_door_close.wav" "$S/Materials/metal_clang.wav"
fx arena_wave "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,volume=0.25,adelay=200[b];[2:a]$P,volume=0.3,adelay=200[c];[a][b][c]$(mix 3),atrim=0:1.3,afade=t=out:st=0.9:d=0.4[o]" "$T/s_arena_wave.wav" "$I/impactBell_heavy_000.ogg" "$I/impactPunch_heavy_000.ogg"
fx arena_clear "[0:a]$P[a];[1:a]$P,volume=0.3[b];[2:a]$P,volume=0.3,adelay=700[c];[a][b][c]$(mix 3),atrim=0:2.6,afade=t=out:st=2.0:d=0.6[o]" "$T/s_arena_clear.wav" "$S/Machines/industrial_door_open.wav" "$I/impactBell_heavy_002.ogg"

for n in snowwraith snowwraith_freeze lavaworm_growl lavaworm_emerge lava_spit scarabpriest scarab_curse crystalspider web_shot web_break anglerfish angler_lure angler_bite windspirit wind_howl arena_lock arena_wave arena_clear; do
  f="$O/$n.ogg"; printf '%-36s %6.2f s %5d kB %6s LUFS\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" "$(( $(stat -c %s "$f") / 1024 ))" "$(lufs "$f")"
done
