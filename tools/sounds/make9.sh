#!/bin/bash
# Ljud för Krypta version 11 ("Svampriket och Spegelpalatset"): sporkastaren, spegelskölden och piskan, Svampriket
# (sporling, mycelbest, svampshaman, studssvampar, sporpölar, svampskogens surr), Spegelpalatset (spegelriddare,
# illusionist, glasskärva, spegelstudsar, teleportrar, glasklang), bossarna mycelmodern och spegelkungen, och musiken
# fungus (+ fungus_hi), mirror (+ mirror_hi), boss9 och boss10. _hi-filerna är tidslinjerade intensitetslager:
# samma längd och samma taktnät som grundspåret, så att spelet kan tona in dem ovanpå.
# Spegelsköldens studs heter mirrorshield_block (shield_block finns redan sedan make2.sh och används av andra fiender).
# Samma konventioner som make2.sh-make8.sh: effekter mono 22 kHz Vorbis q2 toppnormaliserade till $TOP dBFS
# (standard -1, slingor -4), musik stereo 44,1 kHz Vorbis q1 linjärt förstärkt till mål-LUFS,
# alla slingor bär LOOPLENGTH=<sampel> i Vorbis-kommentaren och effektslingorna vrids så att skarven
# hamnar där signalen är tyst och flack.
# Källor: assets/audio (Kenney-paketen CC0: impact-sounds, rpg-audio; 400 Sounds Pack CC0).
# Röster (sporling, mycelbest, shaman, riddare, illusionist, bossar), sporer, bubblor, fjädrar, glas, kristall,
# teleport och all musik syntetiseras med python3 + numpy (inbäddat nedan).
# Deterministiskt: fast frö för slumptalen och -fflags +bitexact (annars slumpar Ogg-muxern serienumret).
# Kör från katalogen där retrofps/ (repot) och assets/audio/ ligger: bash retrofps/tools/sounds/make9.sh
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
# Nytt i make9.sh: game.js slingar effekterna vid duration - 25 ms (inte vid LOOPLENGTH), så vridningen väljs också så att
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

cat > "$T/synth9.py" <<'PY'
# Syntetiserade effekter och musik för Krypta version 11. Användning: python3 synth9.py <katalog>
# Musikslingan läggs med "wrap" (toner som går över slutet läggs på början), efterklangen är en cirkulär
# faltning och liggande toner/brus har ett helt antal perioder på slingan, så slingan är sömlös.
# Byggstenarna nedan är desamma som i make8.sh; nya står under "sporer, fjädrar, glas och speglar" och "trä, svamp, puls".
import sys, wave, re, subprocess, numpy as np
SR = 44100
OUT = sys.argv[1]
rng = np.random.default_rng(11011)
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

# ================= effekter =================
# ---- vapen: sporkastaren, spegelskölden, piskan ----
def spore_fire():  # sporkastaren: pneumatisk "thupp" (dov stöt och luftpuff), blöt bubbla och sporbollen som susar iväg
    d = 0.8; y = np.zeros(int(d * SR))
    place(y, 0, thud(90, 0.3, 0.0), 0.7); place(y, 0, puff(0.25, 200, 3000), 0.8)
    place(y, 0.015, bubble(450, 0.09, 1, 1.5), 0.5); place(y, 0.05, bubble(800, 0.05), 0.3)
    tb = tt(0.6); a = np.interp(tb, [0, 0.05, 0.6], [0, 1, 0]) ** 1.5
    place(y, 0.03, nrm(svf(noise(0.6), 1800 * 0.5 ** (tb / 0.6), 3.0)) * a, 0.3)
    return cut(verb(y, 0.5, 0.15, 5000), d, 0.25)

def spore_burst():  # sporbollen spricker: blött plopp, ett giftmoln som väller ut (mörknande sus), fräsande sporer och bubblor
    d = 1.8; t = tt(d); y = np.zeros(len(t))
    place(y, 0, splat(0.3), 0.8); place(y, 0, puff(0.4, 200, 4000, 1.0, 0.08)); place(y, 0, thud(70, 0.4, 0.0), 0.5)
    a = np.interp(t, [0, 0.06, 0.5, d], [0, 1, 0.6, 0]) ** 1.2
    y += nrm(svf(noise(d), 2500 * 0.35 ** (t / d) * (1 + 0.15 * lpnoise(d, 5)), 0.7, 'lp')) * a * 0.6
    y += nrm(fftfilt(noise(d), 3000, 9000)) * a ** 2 * 0.12
    y += crackle(d, 250, 2500, 8000, 1.5) * a * 0.25
    y += bubbles(d, 14, 400, 1400, 0.35, np.exp(-t * 3))
    return cut(verb(y, 1.0, 0.25, 4000), d, 0.4)

def shield_bash():  # sköldslag: kort svisch, tung plåtsmäll (dov metallklang med dunk) och ett skrammel
    d = 0.75; y = np.zeros(int(d * SR)); c = 0.06
    place(y, 0, swish(c + 0.02, 600, 2000, 2.0), 0.35)
    place(y, c, thud(55, 0.6, 0.2), 0.9); place(y, c, anvil(380, 0.65, 0.55)); place(y, c, clack(700, 1.0, 150, 0.08), 0.6)
    place(y, c + 0.01, chain(0.3, 6, None, (1800, 3500)), 0.2)
    return cut(verb(y, 0.6, 0.15, 5000), d, 0.25)

def mirrorshield_block():  # skott studsar på spegelskölden: hårt metalliskt "ting", rikoschett som viner iväg och ett glasskimmer
    d = 0.8; y = np.zeros(int(d * SR))
    place(y, 0, ting(0.6, 2300, 0.9, 1.0)); place(y, 0, anvil(1500, 0.6, 0.45)); place(y, 0, thud(110, 0.2, 0.0), 0.4)
    place(y, 0.03, ric(3400, 1700, 0.55), 0.22)
    place(y, 0.005, crys(2900, 0.6, 0.18, 3.0))
    return cut(verb(y, 0.7, 0.2, 8000), d, 0.25)

def whip_crack():  # piskan smäller: snärten som accelererar (fladdrande svisch), knallen när spetsen bryter ljudvallen, kort eko
    d = 0.7; t = tt(d); c = 0.17
    a = np.where(t < c, (t / c) ** 3, np.exp(-(t - c) * 40))
    y = nrm(svf(noise(d), 500 + 3500 * a, 2.0)) * a * (0.75 + 0.25 * np.sin(2 * np.pi * 45 * t)) * 0.45
    place(y, c, crack(0.06, 1.0, 1500)); place(y, c, tick(0.02, 0.8, 3000, 11000, 300))
    tc = tt(0.03); place(y, c, np.sin(phase(1400 * (1 - 0.6 * tc / 0.03))) * np.exp(-tc * 120), 0.35)
    return cut(verb(y, 0.6, 0.25, 7000), d, 0.25)

def whip_pull():  # piskan griper och drar: snärt, läder som lindas runt (fladder), repet spänns (knarr) och ett tungt drag mot dig
    d = 1.0; y = np.zeros(int(d * SR))
    place(y, 0, crack(0.05, 0.6, 1800)); place(y, 0, tick(0.02, 0.5, 3000, 11000, 300))
    tw = tt(0.3); a = np.sin(np.pi * tw / 0.3) ** 2
    place(y, 0.03, nrm(svf(noise(0.3), 1800, 1.5)) * a * (0.5 + 0.5 * np.sin(phase(np.interp(tw, [0, 0.3], [60, 25])))), 0.35)
    place(y, 0.22, creak(0.45, 35, 12, 520), 0.35)
    place(y, 0.38, swish(0.5, 2600, 500, 1.6), 0.45)
    place(y, 0.82, thud(75, 0.3, 0.1), 0.6)
    return cut(verb(y, 0.6, 0.18, 5000), d, 0.25)

# ---- fiender: Svampriket ----
def sporling():  # sporlingen: två pipiga, blöta "pwip" från en liten svamp, ett slemmigt plopp och fräsande sporer
    d = 0.9; y = np.zeros(int(d * SR))
    for t0, dd, fa, fb in ((0, 0.12, 620, 950), (0.17, 0.2, 700, 1150)):
        t = tt(dd); f0 = np.interp(t, [0, dd * 0.7, dd], [fa, fb, fb * 0.9])
        place(y, t0, nrm(voice(f0, [(1400, 300, 1), (2700, 400, 0.5)], 9000, jitter=0.012, roll=0.7)) * env(len(t), 0.01, dd * 0.4), 0.8)
    place(y, 0.42, splat(0.18), 0.35); place(y, 0.4, bubbles(0.4, 8, 700, 2000), 0.4)
    place(y, 0.45, fftfilt(noise(0.35), 3000, 9000) * np.exp(-tt(0.35) * 9), 0.06)
    return cut(verb(y, 0.5, 0.15, 6000), d, 0.2)

def mycelbrute():  # mycelbesten: djupt, blött morrande med strupbubbel, trådiga fibrer som slits (knarr) och ett tungt smack
    d = 1.7; t = tt(d); y = np.zeros(len(t))
    f0 = np.interp(t, [0, 0.2, 0.7, 1.2, d], [50, 72, 66, 55, 46])
    F1 = np.interp(t, [0, 0.5, d], [380, 520, 360])
    y += growl(d, f0, [(F1, 80, 1), (760, 110, 0.5), (2100, 220, 0.12)], 0.75, 0.55, 4000, 2.4) * env(len(t), 0.08, 0.45)
    y += bubbles(d, 30, 250, 700, 0.35, np.interp(t, [0, 0.3, d], [0.3, 1, 0.4]))
    place(y, 0.15, creak(0.9, 10, 22, 170), 0.35)
    place(y, 1.25, splat(0.3), 0.5)
    y += low_rumble(d, 34) * env(len(t), 0.2, 0.6) * 0.25
    return cut(verb(fftfilt(y, 30, 4000), 0.9, 0.22, 3500), d, 0.3)

def myconid():  # svampshamanen: ihålig, nynnande sång med en klingande överton, fröskallra och små sporpuffar
    d = 1.8; y = np.zeros(int(d * SR))
    F = [(450, 80, 1.0), (900, 110, 0.35), (1250, 35, 0.7), (2500, 220, 0.08)]
    v = sing([(0.0, 45, 0.5), (0.5, 48, 0.45), (0.95, 44, 0.6)], F, 1.0, 0.008, 0.08, 4000, 0.9, 0.15)
    place(y, 0.05, v[:int(1.6 * SR)] * env(int(1.6 * SR), 0.08, 0.4), 0.7)
    for t0 in (0.02, 0.5, 0.97):
        dd = 0.22; place(y, t0, grains(dd, 500, 2500, 8000, 0.003) * np.sin(np.pi * tt(dd) / dd) ** 2, 0.5)
    for t0 in (0.3, 0.8, 1.35): place(y, t0, puff(0.3, 300, 2500), 0.25)
    return cut(verb(y, 1.1, 0.3, 5000), d, 0.35)

# ---- fiender: Spegelpalatset ----
def mirrorknight():  # spegelriddaren: två klirrande rustningssteg, en dov röst som ekar genom hjälmen (metalliska resonanser) och glasskimmer
    d = 1.5; y = np.zeros(int(d * SR))
    for t0 in (0.0, 0.3):
        place(y, t0, thud(80, 0.3, 0.1), 0.5); place(y, t0, anvil(950, 0.4, 0.3)); place(y, t0, chain(0.25, 5, None, (2500, 4500)), 0.2)
    dv = 0.95; t = tt(dv); f0 = np.interp(t, [0, 0.2, 0.6, dv], [82, 98, 92, 74])
    v = growl(dv, f0, [(np.interp(t, [0, dv], [480, 620]), 90, 1), (900, 120, 0.5), (2400, 220, 0.15)], 0.4, 0.35, 5000, 1.8)
    v = v + 0.6 * nrm(reson(v, [(1150, 15, 1), (1870, 20, 0.8), (2950, 28, 0.5), (4100, 35, 0.3)]))
    place(y, 0.45, v * env(len(t), 0.05, 0.35), 0.8)
    place(y, 0.45, crys(3300, 0.9, 0.15, 1.5)); place(y, 0.47, crys(4400, 0.8, 0.1, 1.8))
    return cut(verb(y, 1.0, 0.3, 7000), d, 0.3)

def mirror_deflect():  # skott studsar på en spegel: kristallklart klang, ett stigande "pi-yii" och glittrande eko
    d = 0.9; y = np.zeros(int(d * SR))
    place(y, 0, crys(2600, 0.85, 1.0, 2.5)); place(y, 0, crys(3900, 0.7, 0.45, 3.0)); place(y, 0, tick(0.02, 0.6, 4000, 11000, 300))
    place(y, 0.02, ric(2300, 3800, 0.45, 1.0, 0.015), 0.25)
    for i, n in enumerate((100, 103, 108)): place(y, 0.06 + 0.04 * i, bar(m2f(n), 0.5, 0.12, dec=5))
    return cut(verb(y, 0.9, 0.3, 9000), d, 0.3)

def illusionist():  # illusionisten: viskande fniss ("hi-hi-hi-hiii") som ekar i förskjutna, transponerade kopior, och skimmer
    d = 1.5; y = np.zeros(int(d * SR)); t0 = 0.0
    for i, dd in enumerate((0.09, 0.09, 0.09, 0.32)):
        t = tt(dd); f0 = np.interp(t, [0, dd], [320 + 15 * i, (300 + 15 * i) * (0.75 if i == 3 else 0.9)])
        s = mvoice(f0, EE, [(1, 0, 1.0), (0.94, 0.03, 0.5), (1.07, 0.055, 0.4)], dd + 0.08, 7000, 0.7)
        k = np.arange(len(s)) / SR; e = np.exp(-k * (4 if i == 3 else 12)) * np.clip((dd + 0.06 - k) / 0.06, 0, 1)
        w = nrm(fftfilt(rng.standard_normal(len(s)), 2000, 8000))[:len(s)] * np.clip(k / 0.01, 0, 1)
        place(y, t0, (s * 0.6 + w * 0.35) * e)
        t0 += dd + 0.06
    for i, n in enumerate((91, 96, 98, 103)): place(y, 0.1 + 0.15 * i, glass(n, 0.8, 0.08, att=0.02, rel=0.6))
    return cut(verb(y, 1.2, 0.35, 7000), d, 0.35)

def illusion_pop():  # en falsk kopia försvinner: baklänges skimmer som suger ihop, ett mjukt "plopp" och glitter som faller
    d = 0.8; y = np.zeros(int(d * SR)); c = 0.25
    r = crys(3100, 0.3, 1.0, 3.0)[::-1]; place(y, c - 0.3, r * np.linspace(0, 1, len(r)) ** 2, 0.5)
    u = tt(c) / c; place(y, 0, nrm(svf(noise(c), 800 * 6 ** u, 3)) * u ** 2, 0.25)
    tp = tt(0.08); place(y, c, np.sin(phase(700 * 0.25 ** (tp / 0.08))) * np.exp(-tp * 40), 0.8); place(y, c, tick(0.02, 0.4, 2000, 9000, 250))
    for i, n in enumerate((98, 94, 91, 86)): place(y, c + 0.03 + 0.05 * i, bar(m2f(n), 0.4, 0.14, dec=6))
    return cut(verb(y, 0.8, 0.3, 9000), d, 0.25)

def shardling():  # glasskärvan: snabbt klirrande glaskvitter och ett gällt, glasartat skri
    d = 1.0; y = np.zeros(int(d * SR))
    tc = 0.0
    for _ in range(12): place(y, tc, crys(rng.uniform(3500, 6500), 0.12, 1, 12, 0.006), rng.uniform(0.3, 0.8)); tc += rng.uniform(0.02, 0.045)
    s = squeal(0.4, 2800, 4000)
    place(y, 0.4, s + 0.5 * nrm(reson(s, [(3300, 30, 1), (5100, 40, 0.6)])), 0.4)
    place(y, 0.4, crys(4200, 0.5, 0.3, 3.0))
    return cut(verb(y, 0.7, 0.25, 9000), d, 0.25)

def glass_break():  # glas krossas: knall, en ringande spricka, ett regn av skärvor som klirrar mot marmorn
    d = 1.3; y = shatter(d, 70, 1.0, 0.7)
    place(y, 0, thud(120, 0.25, 0.0), 0.4)
    return cut(verb(y, 0.9, 0.25, 9000), d, 0.35)

# ---- bossar ----
def mycelmother_roar():  # mycelmodern: väldigt, blött och organiskt vrål med subharmonik, gurglande strupe, trådar som slits och muller
    d = 2.8; t = tt(d); y = np.zeros(len(t))
    f0 = np.interp(t, [0, 0.3, 1.0, 1.8, d], [36, 58, 54, 44, 32])
    F1 = np.interp(t, [0, 0.6, 1.6, d], [320, 560, 480, 300]); F2 = np.interp(t, [0, 0.6, d], [650, 980, 600])
    a = np.interp(t, [0, 0.15, 1.6, d], [0, 1, 0.85, 0])
    y += growl(d, f0, [(F1, 90, 1), (F2, 130, 0.5), (2300, 250, 0.15)], 0.85, 0.6, 4500, 2.6) * a
    y += nrm(voice(f0 / 2, OH, 1500, jitter=0.03, roll=0.8)) * a * 0.35
    y += bubbles(d, 70, 200, 650, 0.4, a + 0.1)
    place(y, 0.2, creak(1.6, 8, 20, 150), 0.3)
    y += low_rumble(d, 28) * np.interp(t, [0, 0.4, d], [0, 1, 0.3]) * 0.4
    return cut(verb(fftfilt(y, 25, 4500), 2.0, 0.35, 3500), d, 0.6)

def mycelmother_spores():  # mycelmodern sprutar sporer: djupt inandningssug, tre pulserande stötar med puffar och ett väldigt fräsande moln
    d = 2.6; t = tt(d); y = np.zeros(len(t)); c = 0.55
    u = np.clip(t / c, 0, 1); y += nrm(svf(noise(d), 200 * 6 ** u, 2.0)) * u ** 2 * np.clip((c + 0.02 - t) / 0.02, 0, 1) * 0.4
    for t0, g in ((c, 1.0), (c + 0.35, 0.75), (c + 0.7, 0.6)):
        place(y, t0, drum(40, 0.8, g, 0.2, dec=6)); place(y, t0, puff(0.5, 200, 4500, g, 0.06), 0.8); place(y, t0, splat(0.25), 0.3 * g)
    a = np.interp(t, [0, c, c + 0.15, 1.8, d], [0, 0, 1, 0.7, 0])
    y += nrm(svf(noise(d), 3000 * 0.4 ** np.clip((t - c) / 2, 0, 1) * (1 + 0.15 * lpnoise(d, 4)), 0.7, 'lp')) * a * 0.55
    y += crackle(d, 500, 2500, 8000, 1.0) * a * 0.3 + nrm(fftfilt(noise(d), 4000, 10000)) * a ** 2 * 0.1
    y += bubbles(d, 40, 300, 1200, 0.3, a + 0.01)
    return cut(verb(y, 1.6, 0.3, 4000), d, 0.6)

def mirrorking_laugh():  # spegelkungen: ett högdraget "ha-ha-ha-haaa" som ekar i speglarna (kopior en kvint upp och en kvart ned) och glasklang
    d = 2.4; y = np.zeros(int(d * SR)); t0 = 0.0
    steps = [(150, 0.14), (142, 0.14), (135, 0.14), (128, 0.6)]
    for i, (f, dd) in enumerate(steps):
        last = i == len(steps) - 1; t = tt(dd)
        f0 = np.interp(t, [0, dd], [f * 1.12, f * (0.7 if last else 0.92)])
        s = mvoice(f0, HA, [(1, 0, 1.0), (1.5, 0.08, 0.35), (0.75, 0.15, 0.3)], dd + 0.2, 6000, 0.55)
        s = np.tanh(1.8 * (nrm(s) + 0.3 * nrm(reson(s, [(1400, 20, 1), (2600, 25, 0.7), (3900, 35, 0.4)]))))
        k = np.arange(len(s)) / SR; h = nrm(fftfilt(rng.standard_normal(len(s)), 900, 3500))[:len(s)] * np.exp(-k * 50) * 0.4
        e = np.clip(k / 0.01, 0, 1) * (np.clip((dd + 0.1 - k) / 0.45, 0, 1) if last else np.exp(-k * 9) * np.clip((dd + 0.05 - k) / 0.05, 0, 1))
        place(y, t0, s * e + h)
        t0 += dd + 0.07
    for i, n in enumerate((84, 88, 91, 96, 100)): place(y, 0.05 + 0.32 * i, crys(m2f(n), 1.2, 0.08, 1.5))
    return cut(verb(y, 1.8, 0.4, 7000), d, 0.5)

def mirrorking_shatter():  # spegelkungens spegel brister: väldig smäll, ett ras av glas, ett kristallackord som faller och ringar ut
    d = 2.8; t = tt(d); y = np.zeros(len(t))
    place(y, 0, thud(45, 1.0, 0.3)); place(y, 0, bolt(0.4), 0.5)
    place(y, 0, shatter(2.6, 160, 1.0, 1.4, 2000, 9000))
    for i, n in enumerate((96, 91, 87, 84, 79, 75)): place(y, 0.05 + 0.12 * i, crys(m2f(n), 1.8, 0.35, 1.0))
    tg = tt(1.6); place(y, 0.1, np.sin(phase(2400 * 0.2 ** (tg / 1.6))) * np.exp(-tg * 2) * env(len(tg), 0.01, 0.3), 0.12)
    y += low_rumble(d, 32) * np.interp(t, [0, 0.1, d], [0, 1, 0]) * 0.4
    return cut(verb(y, 2.2, 0.35, 8000), d, 0.7)

def mirrorking_split():  # spegelkungen delar sig: stigande kristallglissando och svisch, tre "plopp" när kopiorna kliver ut, ett skimrande ackord
    d = 1.7; y = np.zeros(int(d * SR))
    for i, n in enumerate(range(72, 97, 3)): place(y, 0.05 * i, bar(m2f(n), 0.5, 0.18, dec=5))
    place(y, 0, swish(0.55, 500, 5000, 2.5), 0.35)
    for i, (t0, f) in enumerate(((0.55, 650), (0.7, 820), (0.85, 1000))):
        tp = tt(0.1); place(y, t0, np.sin(phase(f * 0.3 ** (tp / 0.1))) * np.exp(-tp * 35), 0.55)
        place(y, t0, crys(m2f(84 + 4 * i), 0.9, 0.3, 2.0)); place(y, t0, puff(0.15, 600, 5000), 0.2)
    for n in (73, 80, 85, 88): place(y, 0.85, glass(n, 0.8, 0.12, att=0.03, rel=0.6))
    return cut(verb(y, 1.4, 0.35, 9000), d, 0.4)

# ---- miljö ----
def bounce():  # studssvampen: mjuk, fjädrande duns i svamphatten och ett retro-"boing" som svänger ut
    d = 0.85; y = np.zeros(int(d * SR))
    place(y, 0, thud(70, 0.3, 0.0), 0.6); place(y, 0, splat(0.15), 0.2)
    place(y, 0.01, boing(170, 0.8), 0.7)
    return cut(verb(y, 0.4, 0.12, 5000), d, 0.2)

def teleport():  # teleporten: svischande ton som stiger in, ett mjukt "fump" när du försvinner och en ton som faller ut, med glitter
    d = 1.2; t = tt(d); y = np.zeros(len(t)); c = 0.5
    up = np.clip(t / c, 0, 1); dn = np.clip((t - c) / (d - c - 0.05), 0, 1)
    f = np.where(t < c, 300 * 6 ** up, 1800 * 6 ** -dn) * (1 + 0.03 * np.sin(2 * np.pi * 9 * t)); ph = phase(f)
    tone = np.sin(ph) + 0.6 * np.sin(phase(f * 1.006)) + 0.2 * np.sin(3 * ph)
    a = np.where(t < c, up ** 1.5, (1 - dn) ** 1.5); y += tone * a * 0.3
    y += nrm(svf(noise(d), np.clip(f * 2, 200, 9000), 2.5)) * a * 0.5
    place(y, c, thud(60, 0.4, 0.0), 0.6); place(y, c, puff(0.25, 400, 4000), 0.3)
    sparks(y, d, 60, 1.0, 0.04)
    return cut(verb(y, 0.9, 0.3, 8000), d, 0.2)

def spore_confuse():  # sporerna förvirrar: två svävande toner som vinglar ned ("woo-woo"), virvlande sus och ett skevt pling
    d = 1.8; t = tt(d); y = np.zeros(len(t))
    for f, r in ((330, 1.0), (335, 1.5)):
        fr = f * 0.7 ** (t / d) * (1 + 0.06 * np.sin(2 * np.pi * 2.6 * t + r)); ph = phase(fr)
        y += (np.sin(ph) + 0.25 * np.sin(2 * ph)) * 0.25
    y *= env(len(t), 0.1, 0.5)
    y += nrm(svf(noise(d), 1100 + 800 * np.sin(2 * np.pi * 2 * t), 4.0)) * (0.5 + 0.5 * np.sin(2 * np.pi * 1.3 * t)) * env(len(t), 0.2, 0.5) * 0.35
    for i, n in enumerate((84, 89, 83, 88)):
        k = tt(0.6); place(y, 0.1 + 0.35 * i, np.sin(phase(m2f(n) * (1 + 0.04 * np.sin(2 * np.pi * 5 * k)))) * np.exp(-k * 6) * env(len(k), 0.005, 0.1), 0.15)
    return cut(verb(y, 1.2, 0.35, 6000), d, 0.4)

def shroom_hum(d=2.5):  # svampskogens surr (slinga 2 s): lågt organiskt brum (smalbandigt brus, så att överlappningen i skarven
    # inte svävar), glödsvampar som surrar högt och svagt, bubblande mycel, droppar och små sporpuffar
    t = tt(d)
    y = nrm(reson(noise(d), [(55, 1.2, 1), (110, 1.6, 0.6), (165, 2.0, 0.35), (220, 2.5, 0.2)])) * 0.6 * (0.85 + 0.15 * lpnoise(d, 2))
    y += nrm(reson(noise(d), [(880, 2.5, 1), (1320, 3, 0.6), (1760, 3.5, 0.3)])) * 0.07 * (0.6 + 0.4 * lpnoise(d, 3))
    y += nrm(fftfilt(noise(d), 60, 400)) * 0.2
    y += bubbles(d, 25, 250, 800, 0.15)
    for _ in range(3): place(y, rng.uniform(0, d - 0.2), ping(rng.uniform(1300, 2200), 0.2, 0.12, 25))
    for _ in range(2): place(y, rng.uniform(0, d - 0.4), puff(0.4, 300, 1800), 0.12)
    return y

def mirror_hum(d=4.8):  # spegelpalatsets klang (slinga 4 s): sjungande glas (mycket smalbandigt brus kring kristalltoner), en låg
    # drönare, luftigt sus och glasklockor som slås an mjukt här och där
    t = tt(d)
    y = nrm(reson(noise(d), [(m2f(n), 0.6, a) for n, a in ((73, 1.0), (80, 0.8), (85, 0.6), (92, 0.35), (97, 0.2))])) * 0.35
    y += nrm(reson(noise(d), [(m2f(37), 1.0, 1), (m2f(49), 1.2, 0.5), (m2f(56), 1.5, 0.3)])) * 0.4 * (0.85 + 0.15 * lpnoise(d, 1))
    y += nrm(fftfilt(noise(d), 2500, 8000)) * 0.04 * (0.7 + 0.3 * lpnoise(d, 1.5))
    for _ in range(7):
        n = rng.choice([85, 88, 92, 97, 100]); place(y, rng.uniform(0, d - 0.5), glass(n, 1.8, 1, att=0.15, rel=1.2) * np.exp(-tt(1.8) * 1.5), rng.uniform(0.05, 0.12))
    return y

FX = dict(spore_fire=spore_fire, spore_burst=spore_burst, shield_bash=shield_bash, mirrorshield_block=mirrorshield_block,
          whip_crack=whip_crack, whip_pull=whip_pull, sporling=sporling, mycelbrute=mycelbrute, myconid=myconid,
          mirrorknight=mirrorknight, mirror_deflect=mirror_deflect, illusionist=illusionist, illusion_pop=illusion_pop,
          shardling=shardling, glass_break=glass_break, mycelmother_roar=mycelmother_roar, mycelmother_spores=mycelmother_spores,
          mirrorking_laugh=mirrorking_laugh, mirrorking_shatter=mirrorking_shatter, mirrorking_split=mirrorking_split,
          bounce=bounce, teleport=teleport, spore_confuse=spore_confuse, shroom_hum=shroom_hum, mirror_hum=mirror_hum)

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

# ---- fungus: Svampriket, e-frygiskt/e-moll, 96 bpm, 16 takter = 40 s (Em F Em D | C Am F B, två takter vardera) ----
# grund: mörk liggande drone, vattenpad, marimba-arpeggio i åttondelar, nynnande "mm"-kör i första halvan och okarina-
# melodi i andra, bubblor och droppar. hi: slitstrummor och låg trumma i ett gungande mönster, shaker, kalimba-ostinato
# i sextondelsförskjutning och knäppt bas.
def fungus():
    b = 0.625; T = 64 * b; base = Loop(T); hi = Loop(T)
    slots = ['Em', 'F', 'Em', 'D', 'C', 'Am', 'F', 'B']
    chord = {'Em': [55, 59, 64], 'F': [57, 60, 65], 'D': [57, 62, 66], 'C': [55, 60, 64], 'Am': [57, 60, 64], 'B': [54, 59, 63]}
    root = {'Em': 40, 'F': 41, 'D': 38, 'C': 36, 'Am': 33, 'B': 35}
    base.add(0, base.drone(28, 0.16, h=6, roll=1.6, cyc=4, hi=300))
    base.add(0, base.bed(150, 700, 0.012, cyc=3)); base.add(0, base.bed(3000, 8000, 0.002, cyc=5))
    for _ in range(int(T * 2.5)): base.add(rng.uniform(0, T), bubble(rng.uniform(300, 1100), rng.uniform(0.03, 0.08), rng.uniform(0.01, 0.04), rng.uniform(0.5, 1.4)), rng.uniform(-0.7, 0.7))
    for _ in range(int(T / 2)): base.add(rng.uniform(0, T), ping(rng.uniform(1500, 2600), 0.3, rng.uniform(0.01, 0.03), 18), rng.uniform(-0.8, 0.8))
    for s, c in enumerate(slots):
        t0 = s * 8 * b; ch = chord[c]; r = root[c]
        base.add(t0 - 0.6, wpad([n - 12 for n in ch], 8 * b + 1.4, g=0.26, att=1.0, rel=1.4, hi=800), -0.2)
        base.add(t0 - 0.2, strings([r], 8 * b + 0.5, att=0.4, rel=0.8, g=0.22, hi=380), 0.05)
        if s < 4: base.add(t0 - 0.3, nrm(choir([n - 12 for n in ch], 8 * b + 0.8, 0.8, 1.0, 1.0, vib=4.0, F=MM, hmax=3000)), 0.3, 0.13)
        arp = [ch[0], ch[2], ch[1] + 12, ch[2], ch[0] + 12, ch[2], ch[1], ch[2]]
        for bar_ in range(2):
            t1 = t0 + bar_ * 4 * b
            for k8 in range(8):
                base.add(t1 + k8 * b / 2 + rng.uniform(-0.006, 0.006), marimba(arp[k8] if bar_ == 0 else arp[(k8 + 4) % 8], 1.2, (0.2 if k8 % 4 == 0 else 0.13) * rng.uniform(0.9, 1.1)), -0.35 + 0.1 * (k8 % 4))
            for tb, f, g in ((0, 150, 1.0), (1.5, 210, 0.6), (2, 150, 0.8), (2.75, 260, 0.45), (3, 210, 0.6), (3.5, 260, 0.5)):
                hi.add(t1 + tb * b, logdrum(f, 0.4 * g), -0.2 if f > 180 else 0.15)
            for tb in (0, 2.5): hi.add(t1 + tb * b, drum(52, 0.7, 0.55 if tb == 0 else 0.35, 0.12, dec=7), 0)
            for k16 in range(16): hi.add(t1 + k16 * b / 4, shaker(0.07 if k16 % 4 == 2 else 0.035), -0.5)
            ost = [ch[0] + 12, ch[2] + 12, ch[1] + 24, ch[2] + 12]
            for k8 in range(8): hi.add(t1 + k8 * b / 2 + b / 4, kalimba(ost[k8 % 4], 0.8, 0.12 if k8 % 2 else 0.08), 0.45)
            for tb in (0, 1.5, 3): hi.add(t1 + tb * b, pluck(r + 12, 1.0, 1.1, 0.35 if tb == 0 else 0.25), 0.05)
    mel = [(8, 71, 1.5), (9.5, 72, 0.5), (10, 71, 2), (12, 67, 2), (14, 64, 2),
           (24, 69, 1.5), (25.5, 67, 0.5), (26, 66, 2), (28, 62, 2), (30, 66, 2),
           (32, 72, 1.5), (33.5, 71, 0.5), (34, 67, 2), (36, 64, 1), (37, 67, 1), (38, 72, 2),
           (40, 76, 3), (43, 74, 1), (44, 72, 2), (46, 69, 2),
           (48, 77, 1.5), (49.5, 76, 0.5), (50, 72, 2), (52, 69, 1), (53, 72, 1), (54, 77, 2),
           (56, 78, 2), (58, 75, 1), (59, 76, 0.5), (59.5, 75, 0.5), (60, 71, 3.5)]
    for t0, n, dd in mel: base.add(t0 * b, ocarina(n, dd * b + 0.08, 0.26 if t0 >= 32 else 0.18), 0.15)
    hi.add(0, crash_cym(0.12, 2.5), 0.3); hi.add(32 * b, crash_cym(0.1, 2.5), -0.3)
    base.reverb(3.5, 0.45, 4000, 0.03); hi.reverb(1.6, 0.22, 5000)
    write_aligned((base, 'fungus', -20), (hi, 'fungus_hi', -23))

# ---- mirror: Spegelpalatset, ciss-moll, 80 bpm, 12 takter = 36 s (C#m A F#m G# | C#m E A G# | F#m D G# G#) ----
# grund: glasharmonika och mjuka stråkar, speldose-arpeggio (celesta) i åttondelar, harpa på slagen, sopran-"oo" i andra
# halvan, kristallmelodi och glasglimtar. hi: mjuk bastrumma och virvel med efterklang, shaker, cembalo-ostinato,
# knäppt bas och glasslag på efterslagen.
def mirror():
    b = 0.75; T = 48 * b; base = Loop(T); hi = Loop(T)
    slots = ['C#m', 'A', 'F#m', 'G#', 'C#m', 'E', 'A', 'G#', 'F#m', 'D', 'G#', 'G#']
    chord = {'C#m': [61, 64, 68], 'A': [61, 64, 69], 'F#m': [61, 66, 69], 'G#': [60, 63, 68], 'E': [59, 64, 68], 'D': [62, 66, 69]}
    root = {'C#m': 37, 'A': 33, 'F#m': 30, 'G#': 32, 'E': 28, 'D': 26}
    base.add(0, base.drone(37, 0.12, h=5, roll=1.8, cyc=3, hi=500))
    base.add(0, base.bed(2500, 9000, 0.003, cyc=4))
    for s, c in enumerate(slots):
        t0 = s * 4 * b; ch = chord[c]; r = root[c]
        for n in ch: base.add(t0 - 0.3, glass(n, 4 * b + 1.2, 0.09, att=0.4, rel=1.2), rng.uniform(-0.5, 0.5))
        base.add(t0 - 0.4, strings([n - 12 for n in ch], 4 * b + 0.9, att=0.6, rel=0.9, g=0.2, hi=1500), -0.25)
        base.add(t0 - 0.2, strings([r + 12], 4 * b + 0.5, att=0.4, rel=0.7, g=0.2, hi=450), 0.1)
        if s >= 4: base.add(t0 - 0.3, nrm(choir([n + 12 for n in ch[:2]], 4 * b + 0.8, 0.6, 0.9, 1.0, vib=5.0, F=SOO, hmax=6000)), 0.35, 0.1)
        arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24, ch[1] + 24, ch[0] + 24, ch[2] + 12, ch[1] + 12]
        for k8 in range(8): base.add(t0 + k8 * b / 2, bar(m2f(arp[k8]), 1.4, 0.12 if k8 % 2 else 0.16, dec=2.4), 0.45 if k8 % 2 else -0.4)
        for tb in (0, 2): base.add(t0 + tb * b, pluck(ch[0] - 12 if tb == 0 else ch[2] - 12, 2.0, 1.5, 0.16), -0.15)
        for tb in (0, 2): hi.add(t0 + tb * b, drum(55, 0.6, 0.6, 0.12, dec=8), 0)
        for tb in (1, 3): hi.add(t0 + tb * b, snare(0.16), 0.15)
        for k8 in range(8):
            hi.add(t0 + k8 * b / 2, shaker(0.08 if k8 % 2 else 0.045), -0.5)
            hi.add(t0 + k8 * b / 2, harpsi([ch[0], ch[2], ch[1], ch[2]][k8 % 4], 0.5, 0.2 if k8 % 4 == 0 else 0.14), 0.3)
        for tb in (0.5, 1.5, 2.5, 3.5): hi.add(t0 + tb * b, glasshit(rng.choice([92, 97, 99, 104]), 0.12, 0.5), rng.uniform(-0.6, 0.6))
        for tb in (0, 1.5, 3): hi.add(t0 + tb * b, pluck(r + 12, 1.0, 1.0, 0.32 if tb == 0 else 0.22), 0.0)
    mel = [(16, 73, 1.5), (17.5, 75, 0.5), (18, 76, 1), (19, 80, 1), (20, 80, 2), (22, 78, 1), (23, 76, 1),
           (24, 76, 1.5), (25.5, 73, 0.5), (26, 69, 2), (28, 72, 1), (29, 75, 1), (30, 80, 2),
           (32, 81, 1.5), (33.5, 80, 0.5), (34, 78, 1), (35, 73, 1), (36, 74, 1.5), (37.5, 78, 0.5), (38, 81, 2),
           (40, 80, 1), (41, 78, 1), (42, 75, 1), (43, 72, 1), (44, 75, 2), (46, 72, 1), (47, 68, 1)]
    for t0, n, dd in mel: base.add(t0 * b, mel_tone(n + 12, dd * b, 0.22), 0.15)
    for _ in range(14): base.add(rng.uniform(0, T), crys(m2f(rng.choice([97, 100, 104, 109])), 1.5, 0.03, 1.2), rng.uniform(-0.9, 0.9))
    hi.add(0, crash_cym(0.12, 2.5), 0.3); hi.add(16 * b, crash_cym(0.08, 2.5), -0.3)
    base.reverb(4.0, 0.5, 6000, 0.03); hi.reverb(2.0, 0.25, 6000)
    write_aligned((base, 'mirror', -20), (hi, 'mirror_hi', -23))

# ---- boss9: mycelmodern, d-frygiskt, 120 bpm, 16 takter = 32 s (Dm Eb Dm C | Bb Gm Eb A, två takter vardera) ----
# organiskt och pulserande: hjärtslag på varannan fjärdedel, pulserande bas i sextondelar, slitstrummor och taiko,
# bubblor och blöta smack, låg kör; melodin i stråkar och sedan distad mässing, mässingsstötar i andra halvan.
def boss9():
    b = 0.5; T = 64 * b; L = Loop(T)
    slots = ['Dm', 'Eb', 'Dm', 'C', 'Bb', 'Gm', 'Eb', 'A']
    chord = {'Dm': [62, 65, 69], 'Eb': [63, 67, 70], 'C': [60, 64, 67], 'Bb': [62, 65, 70], 'Gm': [62, 67, 70], 'A': [61, 64, 69]}
    root = {'Dm': 38, 'Eb': 39, 'C': 36, 'Bb': 34, 'Gm': 31, 'A': 33}
    mel = [(0, 62, 2), (2, 63, 1), (3, 65, 1), (4, 69, 3), (7, 67, 1), (8, 67, 2), (10, 70, 2), (12, 75, 3), (15, 74, 1),
           (16, 74, 2), (18, 72, 1), (19, 70, 1), (20, 69, 3), (23, 65, 1), (24, 67, 2), (26, 64, 2), (28, 60, 4),
           (32, 70, 2), (34, 74, 1), (35, 77, 1), (36, 74, 3), (39, 72, 1), (40, 70, 2), (42, 67, 2), (44, 62, 3), (47, 65, 1),
           (48, 67, 2), (50, 70, 1), (51, 72, 1), (52, 75, 3), (55, 74, 1), (56, 73, 3), (59, 76, 1), (60, 73, 2), (62, 69, 2)]
    L.add(0, L.bed(30, 200, 0.04, cyc=8)); L.add(0, L.drone(26, 0.2, h=8, roll=1.4, cyc=8, hi=250))
    for _ in range(int(T * 3)): L.add(rng.uniform(0, T), bubble(rng.uniform(200, 800), rng.uniform(0.03, 0.09), rng.uniform(0.02, 0.06), rng.uniform(0.5, 1.5)), rng.uniform(-0.7, 0.7))
    for s, c in enumerate(slots):
        t0 = s * 8 * b; ch = chord[c]; r = root[c]; half = s >= 4
        L.add(t0 - 0.05, pbass(r + 12, 8 * b + 0.05, 4 / b, 0.32, 2.2), 0)
        L.add(t0 - 0.1, strings([r, r + 12], 8 * b + 0.2, att=0.15, rel=0.3, g=0.3, hi=600), 0.05)
        L.add(t0 - 0.3, nrm(choir([n - 12 for n in ch], 8 * b + 0.6, 0.4, 0.5, 1.0, vib=3.5, F=OH, hmax=3500)), -0.1, 0.32 if half else 0.22)
        L.add(t0, strings([n + 12 for n in ch], 8 * b, att=0.3, rel=0.4, g=0.12 if not half else 0.18, hi=2800, trem=8), -0.35)
        for bar_ in range(2):
            t1 = t0 + bar_ * 4 * b
            for tb in (0, 2): L.add(t1 + tb * b, heartbeat(0.75), 0)
            for tb, f, g in ((0.5, 170, 0.5), (1, 230, 0.7), (1.75, 170, 0.5), (2.5, 300, 0.45), (3, 230, 0.7), (3.25, 170, 0.4), (3.5, 300, 0.6)):
                L.add(t1 + tb * b, logdrum(f, 0.35 * g), 0.3 if f > 200 else -0.3)
            for k16 in range(16): L.add(t1 + k16 * b / 4, shaker(0.07 if k16 % 2 else 0.04), 0.5)
            L.add(t1 + 1.5 * b, splat(0.2, 0.12), rng.uniform(-0.5, 0.5))
            if half:
                L.add(t1, taiko(0.6, 40), 0); L.add(t1 + 1 * b, snare(0.22), 0.15); L.add(t1 + 3 * b, snare(0.26), 0.15)
                for tb in (0, 1.5, 3): L.add(t1 + tb * b, brass([r + 24, r + 31], 0.3, att=0.01, rel=0.1, drive=3.0, swell=0.05, lo_fc=350, hi_fc=2000), -0.15, 0.24)
    for t0, n, dd in mel:
        if t0 < 32: L.add(t0 * b, strings([n - 12, n], dd * b + 0.12, att=0.07, rel=0.2, g=0.3, hi=2400, vib=0.006), 0.2)
        else:
            L.add(t0 * b, brass([n, n - 12], dd * b + 0.08, att=0.02, rel=0.15, drive=2.6, swell=0.2, hi_fc=2800), 0.2, 0.34)
            L.add(t0 * b, strings([n + 12], dd * b + 0.12, att=0.06, rel=0.2, g=0.12, hi=3400, vib=0.006), -0.2)
    for t0, g in ((0, 0.9), (32, 0.5)): L.add(t0 * b, crash_cym(0.3, 3.0), 0.3); L.add(t0 * b, taiko(g, 36, 2.0), 0)
    for k in range(8): L.add(T - 2 * b + k * b / 4, logdrum(150 + 25 * k, 0.15 + 0.03 * k), -0.1)
    L.reverb(2.2, 0.28, 4500)
    write_aligned((L, 'boss9', -19))

# ---- boss10: spegelkungen, h-moll, mörk vals i 3/4, 150 bpm, 24 takter = 28,8 s (Bm F# Bm G Em F# Bm F# G D Em F#, två takter vardera) ----
# "umm-pa-pa": låga stråkar och pauka på ettan, cembalo, spiccato och glasslag på två och tre, kristallticket på varje
# slag; melodin i celesta/glas, sedan mässing med stråkar i andra halvan, kör, speldosans motstämma och cymbaler.
def boss10():
    b = 0.4; bar3 = 3 * b; T = 24 * bar3; L = Loop(T)
    slots = ['Bm', 'F#', 'Bm', 'G', 'Em', 'F#', 'Bm', 'F#', 'G', 'D', 'Em', 'F#']
    chord = {'Bm': [62, 66, 71], 'F#': [61, 66, 70], 'G': [62, 67, 71], 'Em': [64, 67, 71], 'D': [62, 66, 69]}
    root = {'Bm': 35, 'F#': 30, 'G': 31, 'Em': 28, 'D': 26}
    mel = [(0, 71, 2), (2, 74, 1), (3, 78, 3), (6, 78, 2), (8, 76, 1), (9, 73, 3), (12, 74, 2), (14, 73, 1), (15, 71, 2), (17, 74, 1),
           (18, 79, 3), (21, 78, 2), (23, 74, 1), (24, 76, 2), (26, 79, 1), (27, 83, 3), (30, 82, 2), (32, 78, 1), (33, 73, 2), (35, 70, 1),
           (36, 71, 2), (38, 74, 1), (39, 78, 2), (41, 83, 1), (42, 82, 3), (45, 78, 2), (47, 76, 1), (48, 79, 2), (50, 78, 1), (51, 74, 2), (53, 71, 1),
           (54, 78, 3), (57, 74, 2), (59, 73, 1), (60, 76, 2), (62, 74, 1), (63, 71, 2), (65, 67, 1), (66, 70, 2), (68, 73, 1), (69, 78, 3)]
    L.add(0, L.bed(2500, 9000, 0.004, cyc=6)); L.add(0, L.drone(23, 0.15, h=6, roll=1.6, cyc=4, hi=300))
    for k in range(72): L.add(k * b, glasshit(103 if k % 3 == 0 else 98, 0.1 if k % 3 == 0 else 0.06, 0.3), 0.5 if k % 2 else -0.5)
    for s, c in enumerate(slots):
        t0 = s * 2 * bar3; ch = chord[c]; r = root[c]; half = s >= 6
        L.add(t0 - 0.2, nrm(choir([n - 12 for n in ch], 2 * bar3 + 0.4, 0.3, 0.5, 1.0, vib=5.0, F=AA, hmax=4500)), 0.1, 0.24 if half else 0.15)
        for bar_ in range(2):
            t1 = t0 + bar_ * bar3
            L.add(t1 - 0.02, strings([r + 12, r + 24], b * 1.2, att=0.02, rel=0.15, g=0.38, hi=700), 0.05)
            L.add(t1, taiko(0.55 if half else 0.4, 38 if bar_ == 0 else 43, 1.0), 0)
            for tb in (1, 2):
                L.add(t1 + tb * b, spicc([n - 12 for n in ch], 0.2, 0.3, 2800), 0.25)
                L.add(t1 + tb * b, harpsi(ch[tb], 0.5, 0.2), -0.3)
                L.add(t1 + tb * b, glasshit(ch[tb] + 24, 0.1, 0.5), 0.4)
            if half: L.add(t1 + 2 * b, snare(0.15), 0.15)
            box = [ch[2] + 24, ch[1] + 24, ch[0] + 24] if bar_ == 0 else [ch[0] + 24, ch[1] + 24, ch[2] + 24]
            for k8 in range(6): L.add(t1 + k8 * b / 2, bar(m2f(box[k8 // 2] + (12 if k8 % 2 else 0)), 0.8, 0.07, dec=4), 0.55)
    for t0, n, dd in mel:
        if t0 < 36: L.add(t0 * b, mel_tone(n + 12, dd * b, 0.26), 0.2); L.add(t0 * b, strings([n], dd * b + 0.1, att=0.05, rel=0.2, g=0.12, hi=2500, vib=0.006), -0.15)
        else:
            L.add(t0 * b, brass([n, n - 12], dd * b + 0.08, att=0.02, rel=0.15, drive=2.4, swell=0.2, hi_fc=3000), 0.2, 0.32)
            L.add(t0 * b, strings([n + 12], dd * b + 0.12, att=0.05, rel=0.2, g=0.15, hi=3500, vib=0.006), -0.2)
            L.add(t0 * b, glasshit(n + 24, 0.08, 0.6), 0.4)
    for t0 in (0, 36): L.add(t0 * b, crash_cym(0.3, 3.0), 0.3); L.add(t0 * b, shards(1.5, 25, 0.6, 3000, 9000), -0.3, 0.12)
    for k in range(6): L.add(T - 2 * b + k * b / 3, snare(0.08 + 0.04 * k), -0.1)
    L.reverb(2.6, 0.32, 6000)
    write_aligned((L, 'boss10', -19))

for k, f in FX.items(): wr('s_' + k, f())
fungus(); mirror(); boss9(); boss10()
PY
python3 -I "$T/synth9.py" "$T"

# ---------- musik ----------
mus fungus -20 anull "$T/fungus.wav"
mus fungus_hi -23 anull "$T/fungus_hi.wav"
mus mirror -20 anull "$T/mirror.wav"
mus mirror_hi -23 anull "$T/mirror_hi.wav"
mus boss9 -19 anull "$T/boss9.wav"
mus boss10 -19 anull "$T/boss10.wav"

# ---------- ljudeffekter ----------
E="$S/Environment"
G="$S/Combat and Gore"
# vapen: sporkastaren, spegelskölden, piskan
fx spore_fire "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,lowpass=f=2500,volume=0.4[b];[a][b]$(mix 2),atrim=0:0.8,afade=t=out:st=0.55:d=0.25[o]" "$T/s_spore_fire.wav" "$E/air_burst.wav"
fx spore_burst "[0:a]$P[a];[1:a]$P,volume=0.45[b];[2:a]$P,atrim=2:3.6,asetpts=PTS-STARTPTS,lowpass=f=1800,volume=0.25,afade=t=in:d=0.1,afade=t=out:st=0.6:d=1.0[c];[a][b][c]$(mix 3),atrim=0:1.8,afade=t=out:st=1.4:d=0.4[o]" "$T/s_spore_burst.wav" "$G/splat_quick.wav" "$E/water_boiling_loop.wav"
fx shield_bash "[0:a]$P[a];[1:a]$P,volume=0.55,adelay=60[b];[2:a]$P,volume=0.4,adelay=60[c];[a][b][c]$(mix 3),atrim=0:0.75,afade=t=out:st=0.5:d=0.25[o]" "$T/s_shield_bash.wav" "$I/impactPlate_heavy_000.ogg" "$I/impactPunch_heavy_001.ogg"
fx mirrorshield_block "[0:a]$P[a];[1:a]$P,volume=0.5[b];[2:a]$P,asetrate=52920,aresample=44100,volume=0.3[c];[a][b][c]$(mix 3),atrim=0:0.8,afade=t=out:st=0.55:d=0.25[o]" "$T/s_mirrorshield_block.wav" "$I/impactMetal_light_002.ogg" "$S/Materials/metal_clang.wav"
fx whip_crack "[0:a]$P[a];[1:a]$P,asetrate=52920,aresample=44100,volume=0.3[b];[2:a]$P,volume=0.45,adelay=165[c];[a][b][c]$(mix 3),atrim=0:0.7,afade=t=out:st=0.45:d=0.25[o]" "$T/s_whip_crack.wav" "$G/swipe.wav" "$S/Other/snap.wav"
fx whip_pull "[0:a]$P[a];[1:a]$P,volume=0.4,adelay=60[b];[2:a]$P,asetrate=37485,aresample=44100,volume=0.3,adelay=380[c];[a][b][c]$(mix 3),atrim=0:1.0,afade=t=out:st=0.75:d=0.25[o]" "$T/s_whip_pull.wav" "$R/beltHandle1.ogg" "$S/Other/whoosh_2.wav"
# fiender: Svampriket
TOP=-2 fx sporling "[0:a]$P[a];[1:a]$P,atrim=0:0.45,asetrate=52920,aresample=44100,volume=0.25,adelay=400,afade=t=out:st=0.3:d=0.15[b];[a][b]$(mix 2),atrim=0:0.9,afade=t=out:st=0.7:d=0.2[o]" "$T/s_sporling.wav" "$G/squelching_1.wav"
TOP=-2 fx mycelbrute "[0:a]$P[a];[1:a]$P,asetrate=30870,aresample=44100,volume=0.35,adelay=1200[b];[a][b]$(mix 2),atrim=0:1.7,afade=t=out:st=1.4:d=0.3[o]" "$T/s_mycelbrute.wav" "$G/squelching_3.wav"
TOP=-2 fx myconid "[0:a]$P[a];[1:a]$P,atrim=0:1.2,highpass=f=1500,volume=0.15,afade=t=in:d=0.1,afade=t=out:st=0.9:d=0.3[b];[a][b]$(mix 2),atrim=0:1.8,afade=t=out:st=1.45:d=0.35[o]" "$T/s_myconid.wav" "$S/Card and Board/dice_shake_2.wav"
# fiender: Spegelpalatset
TOP=-2 fx mirrorknight "[0:a]$P[a];[1:a]$P,volume=0.35[b];[2:a]$P,volume=0.3,adelay=300[c];[a][b][c]$(mix 3),atrim=0:1.5,afade=t=out:st=1.2:d=0.3[o]" "$T/s_mirrorknight.wav" "$I/impactMetal_medium_002.ogg" "$I/impactPlate_light_001.ogg"
fx mirror_deflect "[0:a]$P[a];[1:a]$P,volume=0.35[b];[2:a]$P,volume=0.3[c];[a][b][c]$(mix 3),atrim=0:0.9,afade=t=out:st=0.6:d=0.3[o]" "$T/s_mirror_deflect.wav" "$S/Materials/glass_ping_small.wav" "$I/impactGlass_light_001.ogg"
TOP=-2 fx illusionist "[0:a]$P[a];[1:a]$P,asetrate=52920,aresample=44100,lowpass=f=5000,volume=0.15,adelay=300[b];[a][b]$(mix 2),atrim=0:1.5,afade=t=out:st=1.15:d=0.35[o]" "$T/s_illusionist.wav" "$S/Retro/ghost.wav"
fx illusion_pop "[0:a]$P[a];[1:a]$P,volume=0.45,adelay=245[b];[a][b]$(mix 2),atrim=0:0.8,afade=t=out:st=0.55:d=0.25[o]" "$T/s_illusion_pop.wav" "$S/UI/pop_2.wav"
TOP=-2 fx shardling "[0:a]$P[a];[1:a]$P,asetrate=55125,aresample=44100,volume=0.35,adelay=20[b];[a][b]$(mix 2),atrim=0:1.0,afade=t=out:st=0.75:d=0.25[o]" "$T/s_shardling.wav" "$I/impactGlass_light_003.ogg"
fx glass_break "[0:a]$P[a];[1:a]$P,volume=0.6[b];[2:a]$P,volume=0.35,adelay=70[c];[a][b][c]$(mix 3),atrim=0:1.3,afade=t=out:st=0.95:d=0.35[o]" "$T/s_glass_break.wav" "$I/impactGlass_heavy_001.ogg" "$I/impactGlass_medium_002.ogg"
# bossar
fx mycelmother_roar "[0:a]$P[a];[1:a]$P,asetrate=22050,aresample=44100,lowpass=f=1200,volume=0.3,afade=t=in:d=0.3,afade=t=out:st=2.6:d=1.4[b];[a][b]$(mix 2),atrim=0:2.8,afade=t=out:st=2.2:d=0.6[o]" "$T/s_mycelmother_roar.wav" "$E/gurgling.wav"
fx mycelmother_spores "[0:a]$P[a];[1:a]$P,asetrate=26460,aresample=44100,volume=0.5,adelay=550[b];[2:a]$P,atrim=4:6,asetpts=PTS-STARTPTS,lowpass=f=1500,volume=0.2,afade=t=in:d=0.2,afade=t=out:st=1.0:d=1.0,adelay=600[c];[a][b][c]$(mix 3),atrim=0:2.6,afade=t=out:st=2.0:d=0.6[o]" "$T/s_mycelmother_spores.wav" "$E/air_burst.wav" "$E/water_boiling_loop.wav"
fx mirrorking_laugh "[0:a]$P[a];[1:a]$P,asetrate=66150,aresample=44100,volume=0.2,adelay=1100[b];[a][b]$(mix 2),atrim=0:2.4,afade=t=out:st=1.9:d=0.5[o]" "$T/s_mirrorking_laugh.wav" "$I/impactBell_heavy_003.ogg"
TOP=-2 fx mirrorking_shatter "[0:a]$P[a];[1:a]$P,volume=0.55[b];[2:a]$P,asetrate=33075,aresample=44100,volume=0.45,adelay=40[c];[3:a]$P,lowpass=f=1500,volume=0.3[d];[a][b][c][d]$(mix 4),atrim=0:2.8,afade=t=out:st=2.1:d=0.7[o]" "$T/s_mirrorking_shatter.wav" "$I/impactGlass_heavy_000.ogg" "$I/impactGlass_heavy_003.ogg" "$S/Retro/explosion_medium.wav"
fx mirrorking_split "[0:a]$P[a];[1:a]$P,volume=0.3[b];[2:a]$P,volume=0.3,adelay=850[c];[a][b][c]$(mix 3),atrim=0:1.7,afade=t=out:st=1.3:d=0.4[o]" "$T/s_mirrorking_split.wav" "$S/Other/whoosh_1.wav" "$S/Materials/glass_ping_big.wav"
# miljö: studsplatta, teleport, sporpöl, slingor
fx bounce "[0:a]$P[a];[1:a]$P,volume=0.45[b];[2:a]$P,volume=0.15,adelay=10[c];[a][b][c]$(mix 3),atrim=0:0.85,afade=t=out:st=0.6:d=0.25[o]" "$T/s_bounce.wav" "$I/impactSoft_medium_002.ogg" "$S/Retro/jump.wav"
fx teleport "[0:a]$P[a];[1:a]$P,volume=0.25,adelay=200[b];[2:a]$P,areverse,volume=0.25,adelay=500[c];[a][b][c]$(mix 3),atrim=0:1.2,afade=t=out:st=0.95:d=0.25[o]" "$T/s_teleport.wav" "$S/Other/whoosh_1.wav" "$S/Other/whoosh_1.wav"
TOP=-2 fx spore_confuse "[0:a]$P[a];[1:a]$P,volume=0.3,adelay=100[b];[2:a]$P,asetrate=33075,aresample=44100,volume=0.25,adelay=800[c];[a][b][c]$(mix 3),atrim=0:1.8,afade=t=out:st=1.4:d=0.4[o]" "$T/s_spore_confuse.wav" "$S/Retro/wobble.wav" "$S/Retro/wobble.wav"
TOP=-4 fxloop shroom_hum 2 0.4 "[0:a]$P[a];[1:a]$P,atrim=3:5.5,asetpts=PTS-STARTPTS,lowpass=f=900,volume=0.2[b];[2:a]$P,atrim=5:7.5,asetpts=PTS-STARTPTS,volume=0.15[c];[a][b][c]$(mix 3)[o]" "$T/s_shroom_hum.wav" "$E/water_boiling_loop.wav" "$E/water_dripping.wav"
TOP=-4 fxloop mirror_hum 4 0.8 "$P" "$T/s_mirror_hum.wav"

for f in "$M"/fungus.ogg "$M"/fungus_hi.ogg "$M"/mirror.ogg "$M"/mirror_hi.ogg "$M"/boss9.ogg "$M"/boss10.ogg; do printf '%-36s %6.2f s %5d kB %6s LUFS\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" "$(( $(stat -c %s "$f") / 1024 ))" "$(lufs "$f")"; done
