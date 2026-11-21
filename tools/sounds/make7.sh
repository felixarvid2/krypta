#!/bin/bash
# Ljud för Krypta del 9 ("Klocktornet och Molnborgen"): sågbladskastaren, vindbössan och spjutet, Klocktornet
# (urverkssoldat, kuggspindel, tidsväktare, tidsbubblor, sågspår, urverk, klockspel), Molnborgen (harpya,
# stormkallare, molnjätte, åska, vind, tomrum, fjäder, molnkista, dubbelhopp), urmakaren och stormfågeln,
# och musiken clock (+ clock_hi), sky (+ sky_hi), boss7 och boss8. _hi-filerna är tidslinjerade intensitetslager:
# samma längd och samma taktnät som grundspåret, så att spelet kan tona in dem ovanpå.
# Samma konventioner som make2.sh-make6.sh: effekter mono 22 kHz Vorbis q2 toppnormaliserade till $TOP dBFS
# (standard -1, slingor -4), musik stereo 44,1 kHz Vorbis q1 linjärt förstärkt till mål-LUFS,
# alla slingor bär LOOPLENGTH=<sampel> i Vorbis-kommentaren och effektslingorna vrids så att skarven
# hamnar där signalen är tyst och flack.
# Källor: assets/audio (Kenney-paketen CC0: impact-sounds, rpg-audio; 400 Sounds Pack CC0).
# Röster (soldat, harpya, stormkallare, jätte, bossar), urverk, klingor, vind, åska, klockor och all musik
# syntetiseras med python3 + numpy (inbäddat nedan).
# Deterministiskt: fast frö för slumptalen och -fflags +bitexact (annars slumpar Ogg-muxern serienumret).
# Kör från katalogen där retrofps/ (repot) och assets/audio/ ligger: bash retrofps/tools/sounds/make7.sh
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
cost[np.abs(20 * np.log10((before + 1) / (after + 1))) >= 1.0] = np.inf  # samma nivå på båda sidor
i = int(np.argmin(cost))
with wave.open(p, 'wb') as w:
    w.setparams(prm); w.writeframes(np.concatenate([x[i:], x[:i]]).astype('<i2').tobytes())
PY
P="aresample=44100,aformat=sample_fmts=fltp:channel_layouts=mono"
mix() { echo "amix=inputs=$1:normalize=0:duration=longest"; }


# ---------- syntes ----------
cat > "$T/synth7.py" <<'PY'
# Syntetiserade effekter och musikslingor för Krypta del 9. Användning: python3 synth7.py <katalog>
# Musiken läggs med "wrap" (toner som går över slutet läggs på början), efterklangen är en cirkulär
# faltning och liggande toner/brus har ett helt antal perioder på slingan, så slingorna är sömlösa.
# Byggstenarna nedan är desamma som i make6.sh; nya står under "urverk, vind, åska".
import sys, wave, re, subprocess, numpy as np
SR = 44100
OUT = sys.argv[1]
rng = np.random.default_rng(9199)

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

# ---- byggstenar (som i make4.sh och make5.sh) ----
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

# ================= effekter =================
# ---- vapen ----
def saw_fire():  # sågbladskastaren: fjäderspänt utkast (klunk och klick), klingan tar fart med stigande vissling, metallklang
    d = 0.8; t = tt(d); y = np.zeros(len(t))
    place(y, 0, clack(1800, 1.0, 200, 0.05)); place(y, 0.01, thud(90, 0.3, 0.0), 0.6)
    tw = tt(0.25); place(y, 0.01, nrm(fftfilt(noise(0.25), 400, 6000)) * np.exp(-tw * 25), 0.6)
    y += blade(700 + 900 * (1 - np.exp(-t * 8)), d) * env(len(t), 0.03, 0.3) * np.exp(-t * 2.0) * 0.45
    place(y, 0.01, anvil(2400, 0.6, 0.35))
    return y

def saw_bounce():  # klingan studsar: hårt metallting och en kort vissling som dopplar nedåt
    d = 0.5; t = tt(d); y = anvil(1900, d, 0.8) + ting(d, 3100, 0.4, 1.2)
    y += blade(1300 * (1 - 0.25 * t / d), d) * np.exp(-t * 7) * env(len(t), 0.002, 0.1) * 0.35
    return y

def saw_hit():  # klingan biter: rivande surr (sågtänder som river), blött slag och en metallglimt
    d = 0.6; t = tt(d); y = thud(80, d, 0.2) * 0.6
    tb = tt(0.35); sq = np.sign(np.sin(phase(np.interp(tb, [0, 0.35], [160, 90]))))
    place(y, 0, nrm(fftfilt(sq * nrm(fftfilt(noise(0.35), 800, 6000)) + 0.5 * sq, 200, 5000)) * np.exp(-tb * 7) * env(len(tb), 0.002, 0.05), 0.6)
    y += nrm(reson(noise(d), [(400, 90, 1), (900, 150, 0.5)])) * np.exp(-t * 18) * 0.4
    place(y, 0, ting(0.4, 2300, 0.3, 1.4))
    return y

def wind_fire():  # vindbössan: kraftig luftstöt – tryckpuls, bred brusstöt som mörknar, dov smäll och en virvlande svans
    d = 0.9; t = tt(d)
    a = np.where(t < 0.012, t / 0.012, np.exp(-(t - 0.012) * 7))
    y = nrm(svf(noise(d), 300 + 4000 * 0.12 ** np.clip(t / 0.5, 0, 1), 0.7, 'lp')) * a
    y += np.sin(phase(55 * (1 + 1.5 * np.exp(-t * 25)))) * np.exp(-t * 12) * 0.8
    y += nrm(fftfilt(noise(d), 40, 300)) * np.exp(-t * 9) * 0.6
    y += nrm(svf(noise(d), 900 + 500 * np.sin(2 * np.pi * 5 * t), 2.5)) * np.clip((t - 0.05) / 0.1, 0, 1) * np.exp(-t * 4) * 0.25
    return y * env(len(t), 0.002, 0.15)

def wind_push():  # vindstöten träffar: svällande sus med fladder
    d = 0.6; t = tt(d); a = np.interp(t, [0, 0.08, d], [0, 1, 0]) ** 1.3
    fl = 0.7 + 0.3 * np.sin(phase(28 + 10 * lpnoise(d, 8)))
    return (nrm(svf(noise(d), 600 + 1400 * a, 1.2)) * a * fl + nrm(fftfilt(noise(d), 80, 400)) * a * 0.4) * env(len(t), 0.005, 0.1)

def spear_thrust():  # spjutstöt: kort skarp svisch, skaftet i handen, spetsen hugger
    d = 0.45; t = tt(d); c = 0.07
    a = np.where(t < c, (t / c) ** 2, np.exp(-(t - c) * 25))
    y = nrm(svf(noise(d), 1200 + 2500 * a, 2.0)) * a
    place(y, 0, nrm(reson(noise(0.05), [(380, 60, 1), (900, 120, 0.4)])) * np.exp(-tt(0.05) * 90), 0.4)
    place(y, c, ting(0.3, 3300, 0.25, 1.8))
    return y

def spear_throw():  # spjutkast: kraftfull svisch som drar iväg, vibrerande skaft
    d = 0.7; t = tt(d); c = 0.12
    a = np.where(t < c, (t / c) ** 2, np.exp(-(t - c) * 5))
    y = nrm(svf(noise(d), (700 + 1500 * a) * (1 + 0.25 * np.sin(2 * np.pi * 21 * t)), 2.5)) * a + nrm(fftfilt(noise(d), 120, 500)) * a * 0.3
    tg = tt(0.15); place(y, 0, nrm(reson(noise(0.15), [(240, 40, 1), (520, 70, 0.5)])) * np.exp(-tg * 30), 0.4)
    return y * env(len(t), 0.005, 0.15)

def spear_hit():  # spjutet slår in: dovt hugg, träskaftet fjädrar och dunkar
    d = 0.7; t = tt(d); y = thud(70, d, 0.15) * 0.7
    ph = phase(110 * (1 + 0.05 * np.exp(-t * 20)))
    vib = sum(np.sin(k * ph + rng.uniform(0, 6)) / k ** 1.5 for k in range(1, 8))
    y += nrm(fftfilt(vib, 60, 2500)) * np.exp(-t * 7) * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * t)) * 0.5
    place(y, 0, ting(0.3, 2100, 0.3, 1.6))
    return np.tanh(1.5 * nrm(y)) * env(len(t), 0.001, 0.1)

def spear_pickup():  # spjutet plockas upp: trä som skrapar, spetsen klingar, ett grepp
    d = 0.6; y = np.zeros(int(d * SR)); ts = tt(0.2)
    place(y, 0, nrm(fftfilt(noise(0.2), 800, 5000)) * np.sin(np.pi * ts / 0.2) ** 2, 0.3)
    place(y, 0.12, ting(0.45, 2800, 0.5, 1.0))
    place(y, 0.14, nrm(reson(noise(0.06), [(330, 60, 1), (800, 110, 0.5)])) * np.exp(-tt(0.06) * 70), 0.5)
    return y

# ---- fiender ----
def clocksoldier():  # urverkssoldaten: plåtröst som hackas i kuggtakt (16 Hz), tickande klick och en fjäder som klingar
    d = 1.4; t = tt(d)
    f0 = np.interp(t, [0, 0.3, 0.9, d], [95, 120, 105, 80])
    F1 = np.interp(t, [0, 0.5, d], [500, 700, 450]); F2 = np.interp(t, [0, 0.5, d], [1000, 1300, 900])
    v = nrm(voice(f0, [(F1, 90, 1), (F2, 120, 0.6), (2600, 200, 0.3)], 5000, jitter=0.01, roll=0.6))
    gate = np.convolve(0.15 + 0.85 * (np.sin(2 * np.pi * 16 * t) > 0), np.ones(60) / 60, 'same')
    ring = nrm(reson(v, [(1500, 15, 1), (2350, 20, 0.7), (3400, 30, 0.4)]))
    y = np.tanh(2 * (v * 0.7 + ring * 0.5)) * gate * env(len(t), 0.05, 0.3)
    for k in range(int(d * 16)): place(y, k / 16, clack(3000 if k % 2 else 2200, 0.25, 400, 0.03))
    place(y, d - 0.45, ting(0.45, 1700, 0.3, 1.5))
    return cut(verb(y, 0.6, 0.2, 6000), d, 0.25)

def clock_rewind():  # upplindning baklänges: spärrhjulet klickar allt tätare och ljusare, fjädern spänns, en baklänges klocka, klunk
    d = 1.5; t = tt(d); y = ratchet(1.25, 8, 32, 1600, 3200) * 0.8
    y = np.concatenate([y, np.zeros(len(t) - len(y))])
    sp = np.sin(phase(np.interp(t, [0, 1.25, d], [300, 900, 900]))) * np.clip(t / 1.25, 0, 1) ** 2 * np.clip((1.27 - t) / 0.02, 0, 1)
    y += fftfilt(sp, 100, 4000) * 0.15
    rb = bell(84, 1.2, 1.0)[::-1]; place(y, 0.05, rb * np.linspace(0, 1, len(rb)) ** 2, 0.25)
    place(y, 1.25, clack(900, 1.0, 120, 0.08)); place(y, 1.25, thud(120, 0.25, 0), 0.5)
    return fade_tail(y, 0.1)

def gearspider():  # kuggspindeln: snabba små kuggklick i skurar, tunt surr och tippande ben
    d = 0.8; t = tt(d); y = np.zeros(len(t)); t0 = 0.0
    while t0 < d - 0.15:
        bd = rng.uniform(0.08, 0.16); r = rng.uniform(35, 55); fc = rng.uniform(3500, 5000)
        for i in range(int(bd * r)): place(y, t0 + i / r, clack(fc * rng.uniform(0.92, 1.08), rng.uniform(0.4, 1), 600, 0.02))
        t0 += bd + rng.uniform(0.03, 0.08)
    y += nrm(fftfilt(sawp(phase(190 + 25 * lpnoise(d, 10)), 6000, 215), 1500, 6000)) * 0.12 * env(len(t), 0.05, 0.2)
    y += grains(d, 150, 3000, 8000, 0.002) * 0.3
    return fade_tail(y, 0.06)

def timekeeper():  # tidsväktaren: dov, långsamt svävande klocka, djupt tick-tack och ett sus
    d = 2.2; t = tt(d); y = fftfilt(bell(38, d, 1.0) * (1 + 0.15 * np.sin(2 * np.pi * 1.5 * t)), 0, 2500)
    place(y, 0.0, clack(900, 0.5, 90, 0.12)); place(y, 0.55, clack(700, 0.5, 90, 0.12))
    y += nrm(svf(noise(d), 500 + 300 * np.sin(2 * np.pi * 0.8 * t), 3)) * env(len(t), 0.3, 0.8) * 0.08
    return cut(verb(y, 2.0, 0.35, 3000), d, 0.6)

def time_bubble():  # tidsbubblan bildas: baklänges sug, ett glasackord som saktar in (tonhöjden sjunker som ett band som bromsas), svajande ekon
    d = 1.8; t = tt(d); y = np.zeros(len(t))
    u = tt(0.4) / 0.4; place(y, 0, nrm(svf(noise(0.4), 500 * 10 ** u, 3.0)) * u ** 2, 0.4)
    slow = 2 ** (-np.clip((t - 0.4) / 1.2, 0, 1))
    for n in (72, 76, 79, 83, 88):
        y += np.sin(phase(m2f(n) * slow * (1 + 0.01 * np.sin(2 * np.pi * 3 * t))) + rng.uniform(0, 6)) * np.clip((t - 0.35) / 0.06, 0, 1) * 0.2
    y += np.sin(phase(np.interp(t, [0, 0.4, 1.0, d], [200, 600, 300, 280]))) * np.clip((t - 0.38) / 0.05, 0, 1) * np.exp(-np.maximum(t - 0.4, 0) * 3) * 0.3
    y *= 0.75 + 0.25 * np.sin(phase(np.interp(t, [0, d], [9, 3])))
    return cut(verb(y * env(len(t), 0.01, 0.4), 1.5, 0.45, 6000), d, 0.4)

def harpy():  # harpyan: gällt, skrovligt skrik med snabbt vibrato och väsande luft, två vingslag
    d = 1.0; t = tt(d)
    f0 = np.interp(t, [0, 0.08, 0.4, d], [700, 1100, 980, 700]) * (1 + 0.04 * np.sin(2 * np.pi * 23 * t))
    v = nrm(voice(f0, [(1300, 250, 1), (2500, 300, 0.8), (3800, 400, 0.4)], 9000, jitter=0.03, roll=0.4))
    rough = 0.6 + 0.4 * np.sin(phase(70 + 20 * lpnoise(d, 10)))
    y = np.tanh(2.5 * v * rough) * env(len(t), 0.02, 0.35) + nrm(reson(noise(d), [(3000, 700, 1), (5500, 900, 0.5)])) * env(len(t), 0.02, 0.4) * 0.25
    for t0 in (0.55, 0.8): place(y, t0, wing(0.25), 0.4)
    return cut(verb(y, 0.9, 0.25, 7000), d, 0.25)

def harpy_dive():  # harpyan dyker: tilltagande vinande fartvind, en fallande vissling och ett skrik som drar förbi
    d = 1.3; t = tt(d)
    a = np.interp(t, [0, 0.7, 0.85, d], [0.1, 1, 0.6, 0])
    y = nrm(svf(noise(d), 800 + 2500 * a, 3.5)) * a
    y += np.sin(phase(np.interp(t, [0, 0.75, d], [1800, 1500, 900]))) * np.interp(t, [0, 0.7, 0.8, d], [0, 0.6, 0.4, 0]) * 0.25
    f0 = np.interp(t, [0, 0.2, d], [1200, 1300, 800])
    v = np.tanh(2 * nrm(voice(f0, [(1400, 250, 1), (2700, 300, 0.7)], 9000, jitter=0.03, roll=0.4)))
    y += v * env(len(t), 0.03, 0.3) * np.interp(t, [0, 0.5, 0.7, d], [1, 0.6, 0.2, 0]) * 0.5
    return y * env(len(t), 0.02, 0.15)

def stormcaller():  # stormkallaren: mässande röst i två stämmor (kvint), elektriskt knaster och ett avlägset muller
    d = 1.6; t = tt(d); y = np.zeros(len(t))
    notes = [(0, 50, 0.5), (0.45, 53, 0.5), (0.9, 49, 0.6)]
    v = sing(notes, OH, 1.0, 0.012, 0.06, 4500, 0.8, 0.05) + sing(notes, OH, 0.6, 0.012, 0.06, 4500, 0.8, 0.0, shift=2 ** (-7 / 12))
    place(y, 0, np.tanh(1.5 * nrm(v)), 0.8)
    y += crackle(d, 300, 1500, 9000) * 0.35 * env(len(t), 0.2, 0.3)
    y += low_rumble(d, 38) * env(len(t), 0.4, 0.6) * 0.25
    return cut(verb(y, 1.4, 0.35, 5000), d, 0.4)

def thunder_warn():  # åskförvarning: laddat surr som stiger, tätnande knaster, statiskt fräs och en stigande vissling
    d = 1.3; t = tt(d); u = t / d
    hum = nrm(fftfilt(sawp(phase(60 + 60 * u ** 2), 4000, 120), 50, 3000)) * (0.4 + 0.6 * u)
    y = hum * 0.35 + crackle(d, 500, 1500, 9000, 0.5) * 0.6 * (0.2 + 0.8 * u ** 1.5) + nrm(fftfilt(noise(d), 4000, 10000)) * u ** 2 * 0.12
    y += np.sin(phase(400 + 1600 * u ** 2)) * u ** 2 * 0.1
    return y * env(len(t), 0.05, 0.06)

def thunder_strike():  # blixtnedslag: knastrande förslag, öronbedövande knall, rullande muller
    d = 2.6; t = tt(d); y = np.zeros(len(t))
    place(y, 0, crackle(0.08, 80, 2000, 10000), 0.8)
    place(y, 0.06, bolt(0.4), 1.2); place(y, 0.06, thud(40, 1.0, 0.0), 1.0)
    rum = nrm(fftfilt(noise(d), 25, 400)) * (0.7 + 0.3 * lpnoise(d, 4))
    y += rum * np.interp(t, [0, 0.1, 0.5, 1.0, d], [0, 1, 0.6, 0.5, 0]) * 1.0
    return cut(verb(np.tanh(2.0 * nrm(y)), 2.0, 0.3, 4000), d, 0.8)  # mättad, så att mullret bär

def cloudgiant():  # molnjätten: väldig, luftig och djup röst, andat brus och dovt muller
    d = 2.0; t = tt(d)
    f0 = np.interp(t, [0, 0.4, 1.3, d], [45, 58, 52, 40])
    F1 = np.interp(t, [0, 0.5, d], [350, 520, 330]); F2 = np.interp(t, [0, 0.5, d], [650, 900, 600])
    v = nrm(voice(f0, [(F1, 90, 1), (F2, 120, 0.5), (2000, 250, 0.12)], 3500, jitter=0.025, roll=0.5))
    br = nrm(svf(noise(d), F1, 2.0))
    y = (np.tanh(2 * v) * 0.8 + br * 0.45) * env(len(t), 0.15, 0.5) + low_rumble(d, 34) * env(len(t), 0.2, 0.6) * 0.3
    return cut(verb(fftfilt(y, 30, 4000), 2.2, 0.4, 3000), d, 0.5)

def giant_blow():  # jättens vindstöt: djupt inandat sug, sedan en lång kraftig blåst som sveper förbi
    d = 1.8; t = tt(d); y = np.zeros(len(t))
    ti = tt(0.35); place(y, 0, nrm(svf(noise(0.35), 400 + 500 * ti / 0.35, 1.5)) * (ti / 0.35) ** 2, 0.3)
    a = np.interp(t, [0, 0.35, 0.5, 1.2, d], [0, 0, 1, 0.6, 0])
    y += nrm(svf(noise(d), 300 + 1600 * a * (1 + 0.15 * lpnoise(d, 6)), 0.8, 'lp')) * a
    y += nrm(svf(noise(d), 1200 + 800 * lpnoise(d, 3), 3)) * a * 0.25 + nrm(fftfilt(noise(d), 30, 200)) * a * 0.5
    return y * env(len(t), 0.01, 0.2)

# ---- bossar ----
def clockmaker_laugh():  # urmakarens skratt: "ha-ha-ha-haa" i fallande steg, plåtklang, kuggklick mellan stötarna och en fjäder som går ut
    out = np.zeros(int(2.0 * SR)); t0 = 0.0
    steps = [(210, 0.13), (200, 0.13), (190, 0.13), (180, 0.14), (170, 0.15), (160, 0.5)]
    for i, (f, dd) in enumerate(steps):
        t = tt(dd); last = i == len(steps) - 1
        f0 = np.interp(t, [0, dd], [f * 1.1, f * (0.6 if last else 0.9)])
        v = nrm(voice(f0, HA, 6000, jitter=0.015, roll=0.5))
        v = np.tanh(2 * (v + 0.5 * nrm(reson(v, [(1300, 18, 1), (2100, 22, 0.8), (3300, 30, 0.5)]))))
        h = nrm(reson(noise(dd), [(1500, 400, 1), (2800, 500, 0.5)]))
        s = h * np.exp(-t * 60) * 0.5 + v * np.clip((t - 0.01) / 0.012, 0, 1) * (env(len(t), 0.01, 0.3) if last else np.exp(-t * 10))
        place(out, t0, s * env(len(t), 0.003, 0.02)); place(out, t0 + dd + 0.02, clack(2600, 0.3, 350, 0.03))
        t0 += dd + 0.06
    return cut(verb(out, 1.0, 0.3, 6000), 1.9, 0.35)

def clockmaker_rewind():  # urmakaren vrider tillbaka tiden: baklänges klockor, rusande spärrklick, stigande virvel och ett knäpp
    d = 2.2; t = tt(d); y = np.zeros(len(t))
    for n, t1 in ((60, 1.9), (67, 1.75), (72, 1.6), (79, 1.45)):
        b = bell(n, 1.4, 1.0)[::-1]; place(y, t1 - 1.4, b * np.linspace(0, 1, len(b)) ** 1.5, 0.25)
    place(y, 0, ratchet(1.9, 6, 36, 1500, 4000), 0.6)
    u = np.clip(t / 1.9, 0, 1)
    y += nrm(svf(noise(d), 300 * 12 ** u, 4.0)) * u ** 2 * np.clip((1.92 - t) / 0.02, 0, 1) * 0.5
    place(y, 1.9, clack(1200, 1.0, 150, 0.1)); place(y, 1.9, thud(70, 0.3, 0), 0.6)
    return fade_tail(verb(y, 1.2, 0.3, 6000)[:len(t)], 0.25)

def clockmaker_gears():  # urmakarens kuggverk: tunga kuggar som maler allt fortare, spärrar som slår, tunga metallslag
    d = 2.0; t = tt(d); rate = np.interp(t, [0, d], [6, 14])
    y = nrm(reson(noise(d), [(180, 30, 1), (420, 50, 0.6), (950, 90, 0.4), (2100, 150, 0.2)])) * (0.55 + 0.45 * np.sin(phase(rate)) ** 2) * 0.5
    tc = 0.0
    while tc < d - 0.1:
        place(y, tc, clack(650, 0.7, 120, 0.08)); tc += 1 / np.interp(tc, [0, d], [6, 14])
    for t0, f in ((0.0, 520), (0.7, 470), (1.4, 430)): place(y, t0, anvil(f, 0.6, 0.6)); place(y, t0, thud(60, 0.4, 0.1), 0.5)
    place(y, 0.3, ratchet(1.5, 18, 30, 3000), 0.3)
    return cut(verb(y * env(len(t), 0.005, 0.3), 1.0, 0.25, 5000), d, 0.35)

def thunderbird_cry():  # stormfågeln: väldigt rovfågelskri i två stötar, bred och skrovlig, med åskmuller under
    d = 2.4; y = np.zeros(int(d * SR))
    for t0, dd, fa, fb in ((0, 0.55, 900, 750), (0.6, 1.2, 1000, 600)):
        t = tt(dd); f0 = np.interp(t, [0, 0.06, dd * 0.4, dd], [fa * 0.7, fa, fa * 0.95, fb]) * (1 + 0.03 * np.sin(2 * np.pi * 27 * t))
        v = nrm(voice(f0, [(1200, 250, 1), (2300, 300, 0.8), (3600, 400, 0.5)], 9000, jitter=0.03, roll=0.35))
        lo = nrm(voice(f0 / 2, [(700, 150, 1), (1200, 200, 0.5)], 5000, jitter=0.03, roll=0.5))
        r = 0.6 + 0.4 * np.sin(phase(60 + 25 * lpnoise(dd, 10)))
        place(y, t0, np.tanh(2.6 * (v + 0.5 * lo) * r) * env(len(t), 0.02, dd * 0.4))
    t = tt(d); y += low_rumble(d, 36) * np.interp(t, [0, 0.6, 1.4, d], [0.2, 0.7, 0.5, 0]) * 0.5
    return cut(verb(y, 2.4, 0.4, 6000), d, 0.6)

def thunderbird_dive():  # stormfågeln dyker: väldig fartvind som sväller, skri som drar förbi, nedslag med knaster
    d = 2.2; t = tt(d); c = 1.2
    a = np.interp(t, [0, c, c + 0.1, d], [0.05, 1, 0.7, 0]) ** 1.2
    y = nrm(svf(noise(d), 300 + 2200 * a, 1.2)) * a + nrm(fftfilt(noise(d), 40, 300)) * a * 0.6
    y += np.sin(phase(np.interp(t, [0, c, d], [1400, 1100, 700]))) * np.interp(t, [0, c, c + 0.2, d], [0, 0.5, 0.2, 0]) * 0.2
    tv = tt(0.8); f0 = np.interp(tv, [0, 0.1, 0.8], [900, 1050, 700])
    place(y, 0.3, np.tanh(2.5 * nrm(voice(f0, [(1200, 250, 1), (2300, 300, 0.8)], 9000, jitter=0.03, roll=0.4))) * env(len(tv), 0.05, 0.4), 0.5)
    place(y, c, thud(45, 1.0, 0.2), 0.8); place(y, c, crackle(0.5, 150), 0.4)
    return fade_tail(y, 0.4)

def thunderbird_storm():  # stormfågeln kallar på stormen: svällande storm, tätt knaster, två blixtar och rullande åska
    d = 3.0; t = tt(d); a = np.interp(t, [0, 1.2, d], [0, 1, 0.4])
    y = nrm(svf(noise(d), 400 + 1500 * a * (1 + 0.2 * lpnoise(d, 4)), 0.9, 'lp')) * a * 0.6
    y += nrm(svf(noise(d), 1500 + 700 * lpnoise(d, 2), 5)) * a * 0.15 + crackle(d, 700, 1500, 9000, 0.8) * 0.4 * a
    for t0, g in ((1.1, 1.0), (1.9, 0.7)): place(y, t0, bolt(0.4), g); place(y, t0, thud(38, 1.0, 0.0), g * 0.8)
    y += low_rumble(d, 32) * np.interp(t, [0, 1.1, 1.5, d], [0, 0.3, 0.8, 0.3]) * 0.7
    return cut(verb(y, 2.5, 0.3, 4000), d, 0.8)

# ---- miljö ----
def saw_track(d=2.5):  # sågklinga i golvspåret (slinga 2 s): vinande tandton ur smalbandigt brus (så att överlappningen i skarven
    # inte svävar), svaj fram och tillbaka på 1 Hz (helt antal perioder på 2 s), rullande muller och klapper i spåret
    t = tt(d); sw = np.sin(2 * np.pi * t); fc = 850 * (1 + 0.04 * sw)
    y = sum(nrm(svf(noise(d), fc * k, 60.0)) * a for k, a in ((1, 1.0), (2, 0.55), (3, 0.3), (4, 0.15)))
    y = y * (0.75 + 0.25 * sw) + nrm(fftfilt(noise(d), 4000, 10000)) * 0.12 * (0.8 + 0.2 * sw)
    y += nrm(fftfilt(noise(d), 40, 300)) * 0.35 * (0.8 + 0.2 * lpnoise(d, 8))
    for _ in range(int(d * 7)): place(y, rng.uniform(0, d), clack(rng.uniform(1200, 2200), rng.uniform(0.1, 0.3), 250, 0.04))
    return y

def gear_tick(d=2.3):  # urverk (slinga 2 s): tick-tack fyra gånger i sekunden, små kuggklick emellan, svagt malande kugghjul
    t = tt(d); y = np.zeros(len(t))
    for k in range(int(d * 4) + 1):
        place(y, k * 0.25, clack(3200 if k % 2 == 0 else 2300, 1.0, 220, 0.06))
        place(y, k * 0.25 + 0.125, clack(5200, 0.2, 500, 0.02))
    y += nrm(reson(noise(d), [(220, 30, 1), (470, 50, 0.5), (900, 80, 0.3)])) * (0.6 + 0.4 * np.sin(2 * np.pi * 8 * t) ** 2) * 0.22
    return y

def chimes():  # klockspelet ringer: fallande rörklockor i fyra slag med celesta i oktaven över, lång klang
    d = 2.4; y = np.zeros(int(d * SR))
    for i, n in enumerate((88, 84, 81, 76)):
        place(y, 0.18 * i, tubebell(n, d - 0.18 * i, 0.6)); place(y, 0.18 * i, bar(m2f(n + 12), 1.2, 0.15, dec=2.5))
    return cut(verb(y, 1.8, 0.35, 8000), d, 0.5)

def wind_gust():  # vindby: kraftig sväll med vissling och fladder
    d = 2.2; t = tt(d); y = gust(d, 300, 2200, 0.45)
    y += nrm(svf(noise(d), np.interp(t, [0, 1.0, d], [700, 1300, 900]), 25.0)) * np.interp(t, [0, 1.0, d], [0, 1, 0]) ** 1.5 * 0.15
    return y * env(len(t), 0.02, 0.3)

def wind_loop(d=4.8):  # höghöjdsvind (slinga 4 s): brus i flera band, långsamma byar och svaga visslande toner som glider
    t = tt(d); g1 = 0.65 + 0.35 * lpnoise(d, 0.6)
    y = nrm(svf(noise(d), 500 + 400 * lpnoise(d, 0.8), 0.7, 'lp')) * g1
    y += nrm(fftfilt(noise(d), 2000, 7000)) * 0.12 * (0.6 + 0.4 * lpnoise(d, 1.0))
    y += nrm(svf(noise(d), 950 + 250 * lpnoise(d, 0.5), 30.0)) * 0.12 * np.clip(lpnoise(d, 0.7) + 0.3, 0, 1)
    y += nrm(svf(noise(d), 1700 + 300 * lpnoise(d, 0.4), 40.0)) * 0.06 * np.clip(lpnoise(d, 0.6) + 0.2, 0, 1)
    return y

def void_fall():  # fall i tomrummet: rusande vind som avtar och mörknar, en sjunkande ton som försvinner ned i djupet
    d = 2.4; t = tt(d); a = np.interp(t, [0, 0.1, d], [0, 1, 0]) ** 1.2
    y = nrm(svf(noise(d), 150 + 2500 * 0.1 ** (t / d), 0.8, 'lp')) * a
    y += nrm(svf(noise(d), 200 + 1800 * 0.25 ** (t / d) * (1 + 0.1 * lpnoise(d, 3)), 4)) * a * 0.3
    y += np.sin(phase(600 * 0.25 ** (t / d))) * np.interp(t, [0, 0.1, d], [0, 0.2, 0])
    return fade_tail(y, 0.5)

def void_return():  # tillbaka på ön: baklänges sus som stiger, skimmer och en mjuk landning
    d = 1.1; y = np.zeros(int(d * SR)); u = tt(0.5) / 0.5
    place(y, 0, nrm(svf(noise(0.5), 400 * 8 ** u, 2.0)) * u ** 2, 0.6)
    for i, n in enumerate((79, 83, 86, 91)): place(y, 0.42 + 0.04 * i, bar(m2f(n), 0.6, 0.25, dec=4))
    place(y, 0.5, thud(70, 0.4, 0.0), 0.5)
    return cut(verb(y, 1.0, 0.3, 8000), d, 0.3)

def feather():  # fjäder: mjukt luftigt sus, stigande pling och ett litet vingfladder
    d = 0.9; y = np.zeros(int(d * SR)); ts = tt(0.3)
    place(y, 0, nrm(svf(noise(0.3), 1500 + 2500 * ts / 0.3, 1.5)) * np.sin(np.pi * ts / 0.3) ** 2, 0.3)
    for i, n in enumerate((84, 88, 91, 96)): place(y, 0.05 + 0.07 * i, ping(m2f(n), 0.6, 0.4, 6))
    place(y, 0.3, wing(0.15), 0.25)
    return cut(verb(y, 0.9, 0.3, 9000), d, 0.3)

def gear_pickup():  # kugghjul plockas upp: metallklink, en snabb spärrskur och ett klart pling
    d = 0.6; y = ting(d, 2400, 0.6, 1.4)
    place(y, 0.05, ratchet(0.18, 40, 40, 3500), 0.4)
    place(y, 0.12, ping(m2f(93), 0.45, 0.35, 8))
    return y

def cloudchest_open():  # molnkistan öppnas: spärren klickar, locket knarrar, ett luftigt pust och ett ljust skimrande ackord
    d = 1.6; y = np.zeros(int(d * SR))
    place(y, 0, clack(1800, 0.8, 200, 0.06))
    place(y, 0.08, nrm(bow_creak(0.6, 12, 30, ((420, 1, 80), (980, 0.6, 120), (1900, 0.3, 160)))), 0.45)
    tp = tt(0.8); place(y, 0.55, nrm(svf(noise(0.8), 600 + 1800 * np.sin(np.pi * tp / 0.8), 1.2)) * np.sin(np.pi * tp / 0.8) ** 2, 0.35)
    for i, n in enumerate((74, 78, 81, 86, 90)): place(y, 0.6 + 0.05 * i, bar(m2f(n), 1.0, 0.18, dec=2.5))
    return cut(verb(y, 1.4, 0.35, 8000), d, 0.4)

def double_jump():  # dubbelhopp: luftpuff uppåt och ett vingslag
    d = 0.5; t = tt(d); c = 0.06
    a = np.where(t < c, (t / c) ** 2, np.exp(-(t - c) * 10))
    y = nrm(svf(noise(d), 900 + 2200 * a, 1.5)) * a
    place(y, 0.05, wing(0.22), 0.6)
    return y * env(len(t), 0.003, 0.1)

fx = dict(saw_fire=saw_fire, saw_bounce=saw_bounce, saw_hit=saw_hit, wind_fire=wind_fire, wind_push=wind_push,
          spear_thrust=spear_thrust, spear_throw=spear_throw, spear_hit=spear_hit, spear_pickup=spear_pickup,
          clocksoldier=clocksoldier, clock_rewind=clock_rewind, gearspider=gearspider, timekeeper=timekeeper,
          time_bubble=time_bubble, harpy=harpy, harpy_dive=harpy_dive, stormcaller=stormcaller, thunder_warn=thunder_warn,
          thunder_strike=thunder_strike, cloudgiant=cloudgiant, giant_blow=giant_blow, clockmaker_laugh=clockmaker_laugh,
          clockmaker_rewind=clockmaker_rewind, clockmaker_gears=clockmaker_gears, thunderbird_cry=thunderbird_cry,
          thunderbird_dive=thunderbird_dive, thunderbird_storm=thunderbird_storm, saw_track=saw_track, gear_tick=gear_tick,
          chimes=chimes, wind_gust=wind_gust, wind_loop=wind_loop, void_fall=void_fall, void_return=void_return,
          feather=feather, gear_pickup=gear_pickup, cloudchest_open=cloudchest_open, double_jump=double_jump)
for k, f in fx.items(): wr('s_' + k, f())

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

# ---- clock: a-moll harmonisk, 3/4 (vals), 120 bpm, 24 takter = 36 s (Am F Dm E Am-Dm-F-E) ----
# grund: speldosearpeggio, klocktick på varje slag, låga stråkar, celestamelodi, klockor. hi: vals-"umm-pa-pa" (cembalo + spiccato),
# åttondelsticket på träkloss, bastrumma på ettan, pizzicato-motstämma och spärrhjulsfill var fjärde takt.
def clock():
    b = 0.5; T = 72 * b; base = Loop(T); hi = Loop(T)
    sec = [(0, 'Am', 4), (4, 'F', 4), (8, 'Dm', 4), (12, 'E', 4), (16, 'Am', 2), (18, 'Dm', 2), (20, 'F', 2), (22, 'E', 2)]
    chord = {'Am': [57, 60, 64], 'F': [57, 60, 65], 'Dm': [57, 62, 65], 'E': [56, 59, 64]}
    root = {'Am': 33, 'F': 29, 'Dm': 38, 'E': 40}
    base.add(0, base.drone(33, 0.18, h=6, roll=1.6, cyc=3, hi=400))
    base.add(0, base.bed(2500, 8000, 0.004, cyc=6))
    for k in range(72): base.add(k * b, wblock(2100 if k % 3 == 0 else 1600, 0.16 if k % 3 == 0 else 0.1), 0.55 if k % 2 else -0.55)
    for b0, c, nb in sec:
        t0 = b0 * 3 * b; ch = chord[c]; r = root[c]
        base.add(t0 - 0.4, strings([n - 12 for n in ch], nb * 3 * b + 0.8, att=0.6, rel=1.0, g=0.28, hi=900), -0.2)
        base.add(t0 - 0.2, strings([r + 12], nb * 3 * b + 0.4, att=0.3, rel=0.8, g=0.25, hi=500), 0.1)
        arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24, ch[2] + 12, ch[1] + 12]
        for bar_ in range(nb):
            t1 = t0 + bar_ * 3 * b
            for k8 in range(6): base.add(t1 + k8 * b / 2, bar(m2f(arp[k8]), 1.4, 0.13 if k8 % 2 else 0.17, dec=2.6), 0.4 if k8 % 2 else -0.3)
            hi.add(t1, harpsi(r + 12, 1.0, 0.45), 0); hi.add(t1, drum(50, 0.6, 0.7, 0.1, dec=8), 0)
            for tb in (1, 2):
                hi.add(t1 + tb * b, spicc([n - 12 for n in ch], 0.2, 0.3, 2500), 0.25)
                hi.add(t1 + tb * b, harpsi(ch[1], 0.6, 0.2), -0.3)
            for k8 in range(6): hi.add(t1 + k8 * b / 2, wblock(2600 if k8 % 2 else 3000, 0.25 if k8 == 0 else 0.13), -0.45)
            ctr = [ch[2], ch[1], ch[0], ch[1], ch[2], ch[2] + 5 if c != 'E' else ch[2] + 4]
            for k8 in range(1, 6, 2): hi.add(t1 + k8 * b / 2, pluck(ctr[k8] - 12, 0.6, 1.0, 0.18), 0.5)
            if (b0 + bar_) % 4 == 3: hi.add(t1 + 2 * b, ratchet(0.5, 24, 40, 2500, 3500) * 0.12, 0.2)
    mel = [(12, 72, 2), (14, 71, 1), (15, 69, 3), (18, 65, 2), (20, 64, 1), (21, 65, 3),
           (24, 74, 2), (26, 72, 1), (27, 69, 2), (29, 65, 1), (30, 62, 3), (33, 65, 3),
           (36, 68, 2), (38, 71, 1), (39, 74, 3), (42, 72, 2), (44, 71, 1), (45, 68, 3),
           (48, 69, 3), (51, 72, 2), (53, 76, 1), (54, 74, 3), (57, 77, 3), (60, 76, 2), (62, 74, 1), (63, 72, 3), (66, 71, 4.5), (70.5, 68, 1.5)]
    for t0, n, dd in mel: base.add(t0 * b, mel_tone(n + 12, dd * b, 0.2), 0.15)
    for t0 in (0, 48): base.add(t0 * b, fftfilt(tubebell(57, 6.0, 0.3), 0, 4000), -0.1)
    base.reverb(3.0, 0.4, 5000); hi.reverb(1.5, 0.2, 6000)
    write_aligned((base, 'clock', -20), (hi, 'clock_hi', -23))

# ---- sky: D-lydisk (D E/D Bm7 Gmaj7 D Asus-A), 75 bpm, 12 takter = 38,4 s ----
# grund: luftiga stråkar och "oo"-kör, harpa, flöjtmelodi, vindbrus, glasglimtar. hi: ramtrumma och låga trummor, shaker,
# spiccato-ostinato, knäppt bas och mässing som sväller in mot slutet.
def sky():
    b = 0.8; T = 48 * b; base = Loop(T); hi = Loop(T)
    sec = [(0, 'D'), (2, 'E'), (4, 'B'), (6, 'G'), (8, 'D'), (10, 'A')]
    chord = {'D': [62, 66, 69, 76], 'E': [62, 64, 68, 71], 'B': [59, 62, 66, 69], 'G': [55, 59, 62, 66], 'A': [57, 62, 64, 69]}
    root = {'D': 38, 'E': 38, 'B': 35, 'G': 31, 'A': 33}
    base.add(0, base.drone(26, 0.18, h=6, roll=1.6, cyc=2, hi=300))
    base.add(0, base.bed(400, 1500, 0.02, cyc=3)); base.add(0, base.bed(2500, 7000, 0.006, cyc=5))
    for b0, c in sec:
        t0 = b0 * 4 * b; ch = chord[c]; r = root[c]
        base.add(t0 - 1.0, strings(ch, 8 * b + 2.0, att=1.6, rel=2.0, g=0.3, hi=1600, vib=0.004), -0.3)
        base.add(t0 - 0.8, nrm(choir([n - 12 for n in ch[:3]], 8 * b + 1.6, 1.2, 1.6, 1.0, vib=4.5, F=OH, hmax=3500)), 0.3, 0.2)
        base.add(t0 - 0.3, strings([r + 12], 8 * b + 0.6, att=0.6, rel=1.0, g=0.25, hi=400), 0)
        up = [r + 24, ch[0], ch[1], ch[2], ch[3], ch[2] + 12, ch[3], ch[1]]
        for bar_ in range(2):
            t1 = t0 + bar_ * 4 * b
            for k8 in range(8): base.add(t1 + k8 * b / 2, pluck(up[k8], 2.0, 1.6, 0.13 if k8 else 0.17), -0.5 + 0.12 * k8)
            for tb, g in ((0, 1.0), (1.5, 0.5), (2, 0.8), (3.5, 0.55)): hi.add(t1 + tb * b, drum(55, 0.8, 0.6 * g, 0.25, dec=6), 0)
            hi.add(t1 + 1 * b, snare(0.12), 0.2); hi.add(t1 + 3 * b, snare(0.14), 0.2)
            osti = [0, 7, 12, 7, 0, 7, 14, 7]
            for k8 in range(8):
                hi.add(t1 + k8 * b / 2, spicc([r + 24 + osti[k8]], 0.22, 0.32 if k8 % 4 == 0 else 0.22, 2500), 0.3)
                hi.add(t1 + k8 * b / 2, shaker(0.12 if k8 % 2 else 0.06), -0.5)
            for tb in (0, 1.5, 2.5): hi.add(t1 + tb * b, pluck(r + 12, 0.9, 1.2, 0.35), -0.1)
        if b0 >= 8: hi.add(t0, brass([n - 12 for n in ch[:3]], 8 * b, att=1.5, rel=0.8, drive=2.0, swell=2.5, lo_fc=400, hi_fc=1800), 0, 0.3)
    mel = [(8, 76, 3), (11, 78, 1), (12, 80, 2), (14, 78, 2), (16, 74, 3), (19, 73, 1), (20, 71, 4), (24, 74, 2), (26, 76, 2), (28, 78, 4),
           (32, 81, 3), (35, 78, 1), (36, 76, 2), (38, 74, 2), (40, 73, 3), (43, 74, 1), (44, 76, 4)]
    for t0, n, dd in mel: base.add(t0 * b, flute(n, dd * b + 0.1, 0.3), 0.15)
    for _ in range(12): base.add(rng.uniform(0, T), glass(rng.choice([81, 86, 88, 93]), 2.5, 0.05, att=0.8, rel=1.2, det=0.003), rng.uniform(-0.8, 0.8))
    for t0 in (0, 24): hi.add(t0 * b, crash_cym(0.2, 3.0), 0.3)
    base.reverb(4.5, 0.5, 5000, 0.03); hi.reverb(2.0, 0.22, 5000)
    write_aligned((base, 'sky', -20), (hi, 'sky_hi', -23))

# ---- boss7: urmakaren, d-moll harmonisk i 7/8 (2+2+3), åttondel 0,2 s, 20 takter = 28 s ----
# kugg-tick på varje åttondel, cembaloostinato, distbas på gruppslagen, taiko och städ, mässingsstötar och kör i andra halvan,
# celestamelodi som tas över av mässing, stor klocka på ettan och ett malande kuggverk under.
def boss7():
    e = 0.2; bar7 = 7 * e; T = 20 * bar7; L = Loop(T)
    slots = ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'Eb', 'A', 'Gm', 'A']
    root = {'Dm': 38, 'Bb': 34, 'Gm': 31, 'A': 33, 'Eb': 39}
    third = {'Dm': 3, 'Bb': 4, 'Gm': 3, 'A': 4, 'Eb': 4}
    motif = {'Dm': [(0, 74, 3), (3, 73, 1), (4, 74, 3), (7, 77, 4), (11, 76, 3)], 'Bb': [(0, 77, 3), (3, 74, 1), (4, 70, 3), (7, 72, 2), (9, 74, 5)],
             'Gm': [(0, 70, 3), (3, 72, 1), (4, 74, 3), (7, 79, 4), (11, 77, 3)], 'A': [(0, 76, 4), (4, 73, 3), (7, 69, 4), (11, 73, 3)],
             'Eb': [(0, 75, 3), (3, 74, 1), (4, 70, 3), (7, 67, 4), (11, 70, 3)]}
    grp = [(0, 2), (2, 2), (4, 3)]
    L.add(0, L.bed(100, 600, 0.03, cyc=5)); L.add(0, L.drone(26, 0.25, h=8, roll=1.4, cyc=4, hi=300))
    for s, c in enumerate(slots):
        t0 = s * 2 * bar7; r = root[c]; th = third[c]; half = s >= 5
        pat = [0, 12, 7, 0, 12, 7, 12 + th]
        for bar_ in range(2):
            t1 = t0 + bar_ * bar7
            for k in range(7):
                L.add(t1 + k * e, clack(3400 if k in (0, 2, 4) else 2600, 1.0, 350, 0.04), 0.35 if k % 2 else -0.35, 0.16 if k in (0, 2, 4) else 0.09)
                L.add(t1 + k * e, harpsi(r + 24 + pat[k], 0.5, 0.28 if k in (0, 2, 4) else 0.2), -0.25)
            for g0, gl in grp: L.add(t1 + g0 * e, dbass(r + 12, gl * e * 0.9, drive=2.6), 0, 0.42)
            L.add(t1, taiko(0.9, 40), 0); L.add(t1 + 4 * e, taiko(0.7, 46, 1.0), 0)
            L.add(t1 + 4 * e, anvil(1300, 0.5, 0.2), 0.3)
            if half:
                L.add(t1 + 2 * e, snare(0.35), 0.1); L.add(t1 + 6 * e, snare(0.25), 0.1)
                L.add(t1, brass([r + 24, r + 31], 0.3, att=0.01, rel=0.1, drive=3.0, swell=0.05, lo_fc=400, hi_fc=2200), -0.1, 0.3)
        L.add(t0 - 0.1, nrm(choir([r + 24, r + 24 + th, r + 31], 2 * bar7 + 0.3, 0.3, 0.4, 1.0, F=OH if half else AA, hmax=4000)), 0.1, 0.3 if half else 0.18)
        for k0, n, dd in motif[c]:
            if half: L.add(t0 + k0 * e, brass([n, n - 12], dd * e + 0.05, att=0.02, rel=0.1, drive=2.4, swell=0.15, hi_fc=2800), 0.2, 0.32)
            else: L.add(t0 + k0 * e, mel_tone(n + 12, dd * e, 0.3), 0.2)
    for s0 in (0, 10): L.add(s0 * bar7, bell(38, 6.0, 0.4), 0); L.add(s0 * bar7, crash_cym(0.25, 2.5), 0.3)
    for k in range(7): L.add(T - bar7 + k * e, taiko(0.3 + 0.08 * k, 56 - 2 * k, 0.6), 0)
    L.reverb(1.8, 0.25, 5000)
    write_aligned((L, 'boss7', -19))

# ---- boss8: stormfågeln, g-moll, 150 bpm, 20 takter = 32 s (Gm Eb Bb F Gm | Eb Cm D Eb D) ----
# spiccato-ostinato, tremolostråkar, låga stråkar och distbas, taiko/virvel, kör, åskmuller; melodin i stråkar, sedan mässing.
def boss8():
    b = 0.4; T = 80 * b; L = Loop(T)
    slots = ['Gm', 'Eb', 'Bb', 'F', 'Gm', 'Eb', 'Cm', 'D', 'Eb', 'D']
    chord = {'Gm': [62, 67, 70], 'Eb': [63, 67, 70], 'Bb': [62, 65, 70], 'F': [60, 65, 69], 'Cm': [60, 63, 67], 'D': [62, 66, 69]}
    root = {'Gm': 31, 'Eb': 27, 'Bb': 34, 'F': 29, 'Cm': 36, 'D': 26}
    mel = [(0, 67, 3), (3, 70, 1), (4, 74, 4), (8, 75, 3), (11, 74, 1), (12, 70, 4), (16, 74, 2), (18, 72, 2), (20, 70, 4), (24, 72, 3), (27, 69, 1),
           (28, 65, 4), (32, 67, 6), (38, 69, 1), (39, 70, 1), (40, 75, 3), (43, 74, 1), (44, 70, 2), (46, 67, 2), (48, 72, 3), (51, 75, 1), (52, 79, 4),
           (56, 78, 3), (59, 74, 1), (60, 72, 2), (62, 69, 2), (64, 70, 3), (67, 72, 1), (68, 75, 4), (72, 74, 4), (76, 78, 2), (78, 74, 2)]
    L.add(0, L.bed(30, 250, 0.04, cyc=4)); L.add(0, L.bed(600, 2500, 0.01, cyc=3))
    for s, c in enumerate(slots):
        t0 = s * 8 * b; ch = chord[c]; r = root[c]; half = s >= 5
        L.add(t0, strings([n + 12 for n in ch], 8 * b, att=0.15, rel=0.3, g=0.22 if not half else 0.3, hi=3000, trem=12), -0.35)
        L.add(t0 - 0.05, strings([r + 12, r + 24], 8 * b + 0.1, att=0.1, rel=0.3, g=0.35, hi=700), 0.05)
        L.add(t0 - 0.05, dbass(r + 12, 8 * b, 0.25, drive=2.0, hi=500), 0)
        L.add(t0 - 0.2, nrm(choir([n - 12 for n in ch], 8 * b + 0.5, 0.3, 0.5, 1.0, F=AA, hmax=4500)), 0.1, 0.25 if not half else 0.38)
        osti = [0, 0, 12, 0, 7, 0, 12, 7]
        for bar_ in range(2):
            t1 = t0 + bar_ * 4 * b
            for k8 in range(8):
                L.add(t1 + k8 * b / 2, spicc([r + 24 + osti[k8]], 0.17, 0.4 if k8 in (0, 3, 6) else 0.28, 3000), 0.3)
                if half: L.add(t1 + k8 * b / 2 + b / 4, spicc([r + 36 + osti[(k8 + 4) % 8]], 0.1, 0.16, 3500), -0.3)
            for tb, g in ((0, 1.0), (0.75, 0.4), (1.5, 0.7), (2, 0.95), (2.5, 0.4), (3, 0.6), (3.5, 0.55)): L.add(t1 + tb * b, taiko(g * 0.9, 40, 1.2), 0)
            for tb in (1, 3): L.add(t1 + tb * b, snare(0.32 if half else 0.2), 0.15)
            if half:
                for tb in (0, 1.5, 3): L.add(t1 + tb * b, brass([r + 24, r + 31], 0.35, att=0.01, rel=0.12, drive=3.0, swell=0.05, lo_fc=350, hi_fc=2000), -0.1, 0.3)
    for t0, n, dd in mel:
        if t0 < 40: L.add(t0 * b, strings([n - 12, n], dd * b + 0.15, att=0.06, rel=0.2, g=0.3, hi=2600, vib=0.006), 0.2)
        else:
            L.add(t0 * b, brass([n, n - 12], dd * b + 0.1, att=0.02, rel=0.15, drive=2.5, swell=0.2, hi_fc=3000), 0.2, 0.36)
            L.add(t0 * b, strings([n + 12], dd * b + 0.15, att=0.06, rel=0.2, g=0.14, hi=3500, vib=0.006), -0.2)
    for t0 in (0, 40): L.add(t0 * b, crash_cym(0.35, 3.0), 0.3); L.add(t0 * b, thunder_hit(4.0, 0.45), -0.2)
    L.add(24 * b, thunder_hit(3.0, 0.25), 0.4); L.add(64 * b, thunder_hit(3.0, 0.3), -0.4)
    for k in range(8): L.add(T - 2 * b + k * b / 4, snare(0.15 + 0.05 * k), -0.1)
    rs = tt(2 * b); L.add(T - 2 * b, svf(noise(2 * b), 400 * 10 ** (rs / (2 * b)), 3) * (rs / (2 * b)) ** 2, 0, 0.12)
    L.reverb(2.2, 0.28, 5000)
    write_aligned((L, 'boss8', -19))

clock(); sky(); boss7(); boss8()
PY
python3 -I "$T/synth7.py" "$T"

# ---------- musik ----------
mus clock -20 anull "$T/clock.wav"
mus clock_hi -23 anull "$T/clock_hi.wav"
mus sky -20 anull "$T/sky.wav"
mus sky_hi -23 anull "$T/sky_hi.wav"
mus boss7 -19 anull "$T/boss7.wav"
mus boss8 -19 anull "$T/boss8.wav"

# ---------- ljudeffekter ----------
E="$S/Environment"
# vapen: sågbladskastaren, vindbössan, spjutet
fx saw_fire "[0:a]$P[a];[1:a]$P,asetrate=52920,aresample=44100,highpass=f=1500,volume=0.3,adelay=20[b];[2:a]$P,volume=0.5[c];[a][b][c]$(mix 3),atrim=0:0.8,afade=t=out:st=0.55:d=0.25[o]" "$T/s_saw_fire.wav" "$S/Weapons/sword_unsheath.wav" "$R/metalClick.ogg"
fx saw_bounce "[0:a]$P[a];[1:a]$P,volume=0.5[b];[a][b]$(mix 2),atrim=0:0.5,afade=t=out:st=0.3:d=0.2[o]" "$T/s_saw_bounce.wav" "$I/impactMetal_light_003.ogg"
fx saw_hit "[0:a]$P[a];[1:a]$P,volume=0.5[b];[2:a]$P,volume=0.4,highpass=f=300[c];[a][b][c]$(mix 3),atrim=0:0.6,afade=t=out:st=0.4:d=0.2[o]" "$T/s_saw_hit.wav" "$S/Combat and Gore/crunch_quick.wav" "$I/impactMetal_medium_003.ogg"
fx wind_fire "[0:a]$P[a];[1:a]$P,asetrate=30870,aresample=44100,lowpass=f=3000,volume=0.6[b];[2:a]$P,asetrate=35280,aresample=44100,volume=0.4[c];[a][b][c]$(mix 3),atrim=0:0.9,afade=t=out:st=0.6:d=0.3[o]" "$T/s_wind_fire.wav" "$E/air_burst.wav" "$S/Other/whoosh_2.wav"
fx wind_push "[0:a]$P[a];[1:a]$P,asetrate=37485,aresample=44100,lowpass=f=4000,volume=0.4[b];[a][b]$(mix 2),atrim=0:0.6,afade=t=out:st=0.4:d=0.2[o]" "$T/s_wind_push.wav" "$S/Other/whoosh_1.wav"
TOP=-2 fx spear_thrust "[0:a]$P[a];[1:a]$P,volume=0.45[b];[a][b]$(mix 2),atrim=0:0.45,afade=t=out:st=0.3:d=0.15[o]" "$T/s_spear_thrust.wav" "$S/Weapons/sword_light.wav"
fx spear_throw "[0:a]$P[a];[1:a]$P,asetrate=35280,aresample=44100,volume=0.45[b];[a][b]$(mix 2),atrim=0:0.7,afade=t=out:st=0.45:d=0.25[o]" "$T/s_spear_throw.wav" "$S/Other/whoosh_2.wav"
fx spear_hit "[0:a]$P[a];[1:a]$P,volume=0.6[b];[2:a]$P,volume=0.4[c];[a][b][c]$(mix 3),atrim=0:0.7,afade=t=out:st=0.45:d=0.25[o]" "$T/s_spear_hit.wav" "$I/impactWood_heavy_001.ogg" "$S/Materials/cork_stabbed.wav"
fx spear_pickup "[0:a]$P[a];[1:a]$P,volume=0.4[b];[a][b]$(mix 2),atrim=0:0.6,afade=t=out:st=0.4:d=0.2[o]" "$T/s_spear_pickup.wav" "$S/Weapons/weapon_pick_up.wav"
# fiender
fx clocksoldier "[0:a]$P[a];[1:a]$P,atrim=0:0.3,volume=0.5[b];[a][b]$(mix 2),atrim=0:1.4,afade=t=out:st=1.1:d=0.3[o]" "$T/s_clocksoldier.wav" "$E/clock_tick_only.wav"
fx clock_rewind "[0:a]$P[a];[1:a]$P,atrim=0:3.2,areverse,asetrate=88200,aresample=44100,volume=0.35,afade=t=in:d=0.4,afade=t=out:st=1.3:d=0.3[b];[a][b]$(mix 2),atrim=0:1.5,afade=t=out:st=1.35:d=0.15[o]" "$T/s_clock_rewind.wav" "$E/clock_ticking.wav"
fx gearspider "$P" "$T/s_gearspider.wav"
fx timekeeper "[0:a]$P[a];[1:a]$P,asetrate=22050,aresample=44100,lowpass=f=2000,volume=0.4[b];[a][b]$(mix 2),atrim=0:2.2,afade=t=out:st=1.6:d=0.6[o]" "$T/s_timekeeper.wav" "$I/impactBell_heavy_002.ogg"
fx time_bubble "$P" "$T/s_time_bubble.wav"
TOP=-3 fx harpy "$P" "$T/s_harpy.wav"
TOP=-3 fx harpy_dive "[0:a]$P[a];[1:a]$P,asetrate=30870,aresample=44100,volume=0.4,adelay=600[b];[a][b]$(mix 2),atrim=0:1.4,afade=t=out:st=1.1:d=0.3[o]" "$T/s_harpy_dive.wav" "$S/Other/whoosh_2.wav"
fx stormcaller "$P" "$T/s_stormcaller.wav"
TOP=-2 fx thunder_warn "$P" "$T/s_thunder_warn.wav"
fx thunder_strike "[0:a]$P[a];[1:a]$P,asetrate=30870,aresample=44100,lowpass=f=2500,volume=0.5,adelay=60[b];[a][b]$(mix 2),atrim=0:2.6,afade=t=out:st=1.8:d=0.8[o]" "$T/s_thunder_strike.wav" "$S/Retro/explosion_large.wav"
fx cloudgiant "[0:a]$P[a];[1:a]$P,atrim=2:4,asetpts=PTS-STARTPTS,lowpass=f=800,volume=0.35,afade=t=in:d=0.3[b];[a][b]$(mix 2),atrim=0:2.0,afade=t=out:st=1.5:d=0.5[o]" "$T/s_cloudgiant.wav" "$E/ambient_wind.wav"
fx giant_blow "[0:a]$P[a];[1:a]$P,atrim=5:6.5,asetpts=PTS-STARTPTS,volume=0.4,afade=t=in:d=0.3,afade=t=out:st=1.0:d=0.5,adelay=350[b];[2:a]$P,asetrate=22050,aresample=44100,lowpass=f=1500,volume=0.5,adelay=350[c];[a][b][c]$(mix 3),atrim=0:1.8,afade=t=out:st=1.4:d=0.4[o]" "$T/s_giant_blow.wav" "$E/ambient_wind.wav" "$E/air_burst.wav"
# bossar
fx clockmaker_laugh "$P" "$T/s_clockmaker_laugh.wav"
fx clockmaker_rewind "[0:a]$P[a];[1:a]$P,atrim=0:4,areverse,asetrate=132300,aresample=44100,volume=0.3,afade=t=in:d=0.5,adelay=550[b];[a][b]$(mix 2),atrim=0:2.2,afade=t=out:st=1.9:d=0.3[o]" "$T/s_clockmaker_rewind.wav" "$E/clock_ticking.wav"
fx clockmaker_gears "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,volume=0.45[b];[2:a]$P,volume=0.4,adelay=1400[c];[a][b][c]$(mix 3),atrim=0:2.0,afade=t=out:st=1.6:d=0.4[o]" "$T/s_clockmaker_gears.wav" "$I/impactMetal_heavy_002.ogg" "$R/metalLatch.ogg"
fx thunderbird_cry "$P" "$T/s_thunderbird_cry.wav"
fx thunderbird_dive "[0:a]$P[a];[1:a]$P,asetrate=26460,aresample=44100,volume=0.4,adelay=300[b];[a][b]$(mix 2),atrim=0:2.2,afade=t=out:st=1.8:d=0.4[o]" "$T/s_thunderbird_dive.wav" "$S/Other/whoosh_2.wav"
fx thunderbird_storm "[0:a]$P[a];[1:a]$P,atrim=0:3,volume=0.3,afade=t=in:d=0.8[b];[2:a]$P,asetrate=26460,aresample=44100,lowpass=f=2000,volume=0.4,adelay=1100[c];[a][b][c]$(mix 3),atrim=0:3.0,afade=t=out:st=2.2:d=0.8[o]" "$T/s_thunderbird_storm.wav" "$E/ambient_wind.wav" "$S/Retro/explosion_large.wav"
# miljö: Klocktornet
TOP=-4 fxloop saw_track 2 0.5 "$P" "$T/s_saw_track.wav"
TOP=-4 fxloop gear_tick 2 0.3 "[0:a]$P[a];[1:a]$P,atrim=0:2.3,highpass=f=300,volume=0.35[b];[a][b]$(mix 2)[o]" "$T/s_gear_tick.wav" "$E/clock_ticking.wav"
TOP=-3 fx chimes "$P" "$T/s_chimes.wav"
fx gear_pickup "[0:a]$P[a];[1:a]$P,volume=0.45[b];[2:a]$P,volume=0.3,adelay=60[c];[a][b][c]$(mix 3),atrim=0:0.6,afade=t=out:st=0.4:d=0.2[o]" "$T/s_gear_pickup.wav" "$I/impactMetal_light_001.ogg" "$R/handleCoins.ogg"
# miljö: Molnborgen
TOP=-2 fx wind_gust "[0:a]$P[a];[1:a]$P,atrim=6:8.2,asetpts=PTS-STARTPTS,volume=0.35,afade=t=in:d=0.5,afade=t=out:st=1.6:d=0.6[b];[a][b]$(mix 2),atrim=0:2.2,afade=t=out:st=1.8:d=0.4[o]" "$T/s_wind_gust.wav" "$E/ambient_wind.wav"
TOP=-4 fxloop wind_loop 4 0.8 "[0:a]$P[a];[1:a]$P,atrim=1:5.8,asetpts=PTS-STARTPTS,volume=0.5[b];[a][b]$(mix 2)[o]" "$T/s_wind_loop.wav" "$E/ambient_wind.wav"
TOP=-2 fx void_fall "[0:a]$P[a];[1:a]$P,atrim=0:2.4,volume=0.5,afade=t=out:st=0.3:d=2.1[b];[a][b]$(mix 2),atrim=0:2.4,afade=t=out:st=1.9:d=0.5[o]" "$T/s_void_fall.wav" "$E/ambient_wind.wav"
fx void_return "[0:a]$P[a];[1:a]$P,areverse,volume=0.3,adelay=150[b];[2:a]$P,volume=0.4,adelay=500[c];[a][b][c]$(mix 3),atrim=0:1.1,afade=t=out:st=0.8:d=0.3[o]" "$T/s_void_return.wav" "$S/Other/whoosh_1.wav" "$I/impactSoft_medium_001.ogg"
TOP=-2 fx feather "[0:a]$P[a];[1:a]$P,volume=0.3,highpass=f=800[b];[a][b]$(mix 2),atrim=0:0.9,afade=t=out:st=0.6:d=0.3[o]" "$T/s_feather.wav" "$R/cloth2.ogg"
fx cloudchest_open "[0:a]$P[a];[1:a]$P,asetrate=37485,aresample=44100,volume=0.4,adelay=80[b];[2:a]$P,volume=0.45[c];[a][b][c]$(mix 3),atrim=0:1.6,afade=t=out:st=1.2:d=0.4[o]" "$T/s_cloudchest_open.wav" "$R/creak2.ogg" "$R/metalLatch.ogg"
fx double_jump "[0:a]$P[a];[1:a]$P,asetrate=52920,aresample=44100,volume=0.35[b];[a][b]$(mix 2),atrim=0:0.5,afade=t=out:st=0.35:d=0.15[o]" "$T/s_double_jump.wav" "$S/Other/whoosh_1.wav"

for f in "$M"/clock.ogg "$M"/clock_hi.ogg "$M"/sky.ogg "$M"/sky_hi.ogg "$M"/boss7.ogg "$M"/boss8.ogg; do printf '%-36s %6.2f s %5d kB %6s LUFS\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" "$(( $(stat -c %s "$f") / 1024 ))" "$(lufs "$f")"; done
