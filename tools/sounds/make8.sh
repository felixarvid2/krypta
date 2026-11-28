#!/bin/bash
# Ljud för Krypta version 10 ("Nya invånare"): nya fiender i de tidiga biomerna (fångvaktaren med kedjan, grävaren,
# likgrävaren, rotvättet, armborstskytten, paddjätten), följeslagarna eldflugan, stengolemen och ugglan, legendaltaret
# och de legendariska vapnen (drakbössan, frostgeväret, själapistolen, åskstaven, blodyxan, månbågen), och musiken
# hub (Lägret, slinga) och sting_chapter (när ett kampanjkapitel börjar; spelas en gång).
# Samma konventioner som make2.sh-make7.sh: effekter mono 22 kHz Vorbis q2 toppnormaliserade till $TOP dBFS
# (standard -1, slingor -4), musik stereo 44,1 kHz Vorbis q1 linjärt förstärkt till mål-LUFS,
# alla slingor bär LOOPLENGTH=<sampel> i Vorbis-kommentaren och effektslingorna vrids så att skarven
# hamnar där signalen är tyst och flack.
# Källor: assets/audio (Kenney-paketen CC0: impact-sounds, rpg-audio; 400 Sounds Pack CC0).
# Röster (fångvaktare, grävare, likgrävare, padda, följeslagare), kedjor, jord, rötter, armborst, magi och all musik
# syntetiseras med python3 + numpy (inbäddat nedan).
# Deterministiskt: fast frö för slumptalen och -fflags +bitexact (annars slumpar Ogg-muxern serienumret).
# Kör från katalogen där retrofps/ (repot) och assets/audio/ ligger: bash retrofps/tools/sounds/make8.sh
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


cat > "$T/synth8.py" <<'PY'
# Syntetiserade effekter och musik för Krypta version 10. Användning: python3 synth8.py <katalog>
# Musikslingan läggs med "wrap" (toner som går över slutet läggs på början), efterklangen är en cirkulär
# faltning och liggande toner/brus har ett helt antal perioder på slingan, så slingan är sömlös.
# Byggstenarna nedan är desamma som i make7.sh; nya står under "röster, kedjor, jord, trä".
import sys, wave, re, subprocess, numpy as np
SR = 44100
OUT = sys.argv[1]
rng = np.random.default_rng(10010)

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

# ================= effekter =================
# ---- fångvaktaren (kryptan) ----
def jailer():  # fångvaktaren: grov, morrande mansröst ("hrrooah") med strupskrap, kort grymtning efteråt
    d = 1.4; t = tt(d); y = np.zeros(len(t))
    f0 = np.interp(t, [0, 0.15, 0.6, 1.0, d], [68, 92, 86, 70, 60])
    F1 = np.interp(t, [0, 0.4, d], [430, 650, 420]); F2 = np.interp(t, [0, 0.4, d], [780, 1100, 760])
    y += growl(d, f0, [(F1, 90, 1), (F2, 120, 0.55), (2400, 220, 0.18)], 0.6, 0.4) * env(len(t), 0.06, 0.4) * np.interp(t, [0, 0.9, 1.0, d], [1, 1, 0.3, 0])
    tg = tt(0.25); place(y, 1.05, growl(0.25, np.interp(tg, [0, 0.25], [80, 62]), OH, 0.7, 0.5) * env(len(tg), 0.02, 0.12), 0.6)
    return cut(verb(fftfilt(y, 50, 4500), 0.8, 0.2, 4000), d, 0.25)

def chain_throw():  # kedjekastet: kedjan svingas (två svischar) och slungas iväg rasslande
    d = 0.9; t = tt(d)
    a = np.interp(t, [0, 0.2, 0.3, 0.5, d], [0.1, 0.8, 0.25, 1, 0]) ** 1.3
    y = nrm(svf(noise(d), 600 + 1800 * a, 2.0)) * a * 0.5
    y += chain(d, 60, a ** 2 + 0.02, (2400, 6000), 0.7)
    return y * env(len(t), 0.01, 0.2)

def chain_bind():  # kedjan låser fast dig: länkar som virvlar runt (tre varv), ett tungt järnklang när den låses, kedjan som lägger sig
    d = 1.2; t = tt(d); c = 0.48
    dens = np.interp(t, [0, 0.03, c - 0.03, c, d], [0, 1, 1, 0, 0]) * (0.3 + 0.7 * np.abs(np.sin(2 * np.pi * 3.2 * t)))
    y = chain(d, 70, dens + 1e-4, (2000, 5000), 0.7)
    y += nrm(svf(noise(d), 900 + 1200 * np.abs(np.sin(2 * np.pi * 3.2 * t)), 2.0)) * dens * 0.2
    place(y, c, anvil(560, 0.7, 0.8)); place(y, c, clack(900, 1.0, 120, 0.1), 0.8); place(y, c, thud(70, 0.4, 0.0), 0.6)
    place(y, c + 0.03, chain(0.6, 30, np.exp(-tt(0.6) * 7), (2000, 4500)), 0.5)
    return cut(verb(y, 0.7, 0.2, 6000), d, 0.3)

# ---- grävaren (grottorna) ----
def burrower():  # grävaren: gnisslande, gällt pip i tre stötar, ett högt knarr och klor som krafsar i grus
    d = 1.0; y = np.zeros(int(d * SR))
    for t0, dd, fa, fb in ((0, 0.16, 1900, 2400), (0.2, 0.12, 2200, 2700), (0.36, 0.4, 2500, 1800)):
        place(y, t0, squeal(dd, fa, fb), 0.8)
    place(y, 0.1, nrm(bow_creak(0.5, 90, 60, ((2300, 1, 300), (3500, 0.6, 400), (5100, 0.3, 500)))), 0.25)
    y += grains(d, 300, 1500, 6000, 0.003) * 0.3 * np.interp(tt(d), [0, 0.5, d], [0.4, 1, 0.3])
    return cut(verb(y, 0.5, 0.15, 7000), d, 0.2)

def burrow_dig(d=2.5):  # grävande under jorden (slinga 2 s): dovt muller, krafsande drag (ungefär fyra i sekunden, oregelbundna)
    # med dova stötar och jordkokor, allt dämpat som genom jord
    t = tt(d); y = nrm(fftfilt(noise(d), 30, 250)) * 0.45 * (0.8 + 0.2 * lpnoise(d, 6))
    tc = 0.02
    while tc < d - 0.05:
        dd = rng.uniform(0.12, 0.2); s = grains(dd, int(dd * 2500), 250, 2500, 0.004) * np.sin(np.pi * tt(dd) / dd) ** 2
        place(y, tc, nrm(s), rng.uniform(0.5, 0.9)); place(y, tc + dd * 0.3, thud(rng.uniform(55, 80), 0.25, 0.2), rng.uniform(0.25, 0.45))
        tc += rng.uniform(0.2, 0.3)
    for _ in range(int(d * 6)):
        k = tt(0.03); place(y, rng.uniform(0, d - 0.03), nrm(fftfilt(noise(0.03), 200, 1500)) * np.exp(-k * 120), rng.uniform(0.1, 0.3))
    return fftfilt(y, 25, 2500)

def burrow_emerge():  # grävaren bryter fram: jorden buktar (stigande muller), smäll av jord och sten, grus som regnar ned och ett skrik
    d = 1.4; t = tt(d); y = np.zeros(len(t)); c = 0.35
    y += nrm(fftfilt(noise(d), 30, 300)) * np.clip(t / c, 0, 1) ** 2 * np.clip((c + 0.02 - t) / 0.02, 0, 1) * 0.5
    place(y, c, thud(55, 0.9, 0.6), 1.0)
    place(y, c, nrm(fftfilt(noise(0.3), 300, 4000)) * np.exp(-tt(0.3) * 15), 0.5)
    place(y, c + 0.05, debris(1.0, 60, 400, 3500, 0.7), 0.5)
    place(y, c + 0.07, grains(0.9, 1500, 1500, 7000, 0.003) * np.exp(-tt(0.9) * 3), 0.35)
    place(y, c + 0.15, squeal(0.35, 1800, 2600), 0.35)
    return cut(verb(y, 0.8, 0.2, 5000), d, 0.35)

# ---- likgrävaren (kyrkogården) ----
def gravedigger():  # likgrävaren: lågt, hest mummel – korta stavelser med nasala "mm", konsonantväs och ett grymt "heh"
    d = 1.7; y = np.zeros(int(d * SR)); t0 = 0.04
    for F in (MM, OH, AA, MM, EH, OH, MM, AA, MM, OH):
        dd = rng.uniform(0.09, 0.19); t = tt(dd)
        f0 = (118 - 18 * t0 / d) * (1 + 0.07 * np.interp(t, [0, dd], [rng.uniform(-1, 1), rng.uniform(-1, 1)]))
        v = growl(dd, f0, F, 0.35, 0.3, 4000, 1.6)
        place(y, t0, v * env(len(t), 0.015, 0.05), rng.uniform(0.55, 1))
        if rng.uniform() < 0.5:
            k = tt(0.05); place(y, t0 + dd, nrm(fftfilt(noise(0.05), 2500, 7000)) * np.sin(np.pi * k / 0.05) ** 2, 0.12)
        t0 += dd + rng.uniform(0.02, 0.07)
        if t0 > d - 0.45: break
    th = tt(0.22); place(y, t0 + 0.08, growl(0.22, np.interp(th, [0, 0.22], [130, 95]), HA, 0.5, 0.6, 4000, 1.8) * np.exp(-th * 9) * env(len(th), 0.01, 0.05), 0.8)
    return cut(verb(fftfilt(y, 60, 3200), 0.6, 0.15, 3000), d, 0.25)

def spade_hit():  # spadslaget: platt järnblad som slår – dov klang med vibrerande sväng, dunk och lite jord
    d = 0.8; t = tt(d); y = thud(65, d, 0.2) * 0.7
    ph = phase(520 * (1 + 0.03 * np.sin(2 * np.pi * 11 * t) * np.exp(-t * 4)))
    bl = sum(a * np.sin(r * ph + rng.uniform(0, 6)) * np.exp(-t * dk) for r, a, dk in ((1, 1, 6), (2.41, 0.6, 9), (3.9, 0.35, 13), (5.3, 0.2, 18)))
    y += nrm(bl) * 0.55 * env(len(t), 0.0005, 0.1)
    place(y, 0, tick(0.04, 0.5, 2000, 9000, 120))
    y += grains(d, 200, 1000, 5000, 0.003) * np.exp(-t * 6) * 0.3
    return y

def raise_dead():  # likgrävaren väcker en död: kallt baklänges sug, dissonant mumlande kör som sväller, jord som rör sig,
    # ben som skramlar och knakar fram och ett sista rosslande andetag
    d = 2.2; t = tt(d); y = np.zeros(len(t)); u = np.clip(t / 1.2, 0, 1)
    y += nrm(svf(noise(d), 200 * 8 ** u, 3.0)) * u ** 2 * np.clip((1.25 - t) / 0.05, 0, 1) * 0.3
    place(y, 0.05, nrm(choir([45, 46, 52, 58], 1.8, 0.9, 0.6, 1.0, vib=3.5, F=OH, hmax=3500)), 0.35)
    y += low_rumble(d, 40) * np.interp(t, [0, 1.0, 1.3, d], [0, 0.6, 0.4, 0]) * 0.3
    place(y, 1.15, debris(0.9, 45, 300, 2500, 0.6), 0.45)
    for t0 in pick_times(np.interp(tt(0.9), [0, 0.1, 0.9], [0, 1, 0.2]), 18):
        place(y, 1.2 + t0, clack(rng.uniform(1100, 2300), 1, rng.uniform(250, 400), 0.04), rng.uniform(0.2, 0.6))
    place(y, 1.3, twig(), 0.5); place(y, 1.55, twig(), 0.4)
    tb = tt(0.5); place(y, 1.6, nrm(svf(noise(0.5), np.interp(tb, [0, 0.5], [700, 400]), 4.0)) * np.sin(np.pi * tb / 0.5) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * 35 * tb)), 0.25)
    return cut(verb(y, 1.5, 0.35, 4000), d, 0.4)

# ---- rotvättet (skogen) ----
def rootling():  # rotvättet: knakande, knarrande trä (två knarr), torra kvistar som knäcks och prasslande löv
    d = 1.2; y = np.zeros(int(d * SR))
    place(y, 0, creak(0.55, 15, 35, 300), 0.7); place(y, 0.5, creak(0.6, 25, -12, 380), 0.6)
    for t0, g in ((0.12, 0.6), (0.45, 0.9), (0.52, 0.5), (1.0, 0.6)): place(y, t0, twig(), g)
    y += grains(d, 300, 2500, 8000, 0.003) * 0.12
    return cut(verb(y, 0.6, 0.15, 6000), d, 0.2)

def roots_burst():  # rötter skjuter upp: marken spricker (dovt brak), en skur av knäckande trä, svisch uppåt, jord och ett spänt knarr
    d = 1.3; t = tt(d); y = np.zeros(len(t))
    place(y, 0, thud(60, 0.8, 0.5), 0.8)
    tc = 0.01
    for i in range(14): place(y, tc, twig(), rng.uniform(0.4, 1)); tc += rng.uniform(0.015, 0.05)
    u = tt(0.4) / 0.4; place(y, 0.02, nrm(svf(noise(0.4), 300 * 10 ** u, 2.5)) * np.sin(np.pi * u) ** 2, 0.35)
    place(y, 0.05, debris(1.0, 50, 300, 3000, 0.5), 0.4)
    place(y, 0.35, creak(0.8, 30, -18, 260), 0.45)
    return cut(verb(y, 0.8, 0.2, 5000), d, 0.35)

# ---- armborstskytten (borggården) ----
def crossbow_enemy():  # fiendens armborst: spärren släpper (klick), strängen smäller (dov twang), stocken dunkar, bulten visslar iväg
    d = 0.7; y = np.zeros(int(d * SR))
    place(y, 0, clack(2200, 0.8, 300, 0.04))
    place(y, 0.008, twang(150, 0.4, 1.2, 12), 0.6)
    place(y, 0.008, nrm(reson(noise(0.06), [(500, 100, 1), (1200, 200, 0.5)])) * np.exp(-tt(0.06) * 80), 0.5)
    tb = tt(0.45); a = np.interp(tb, [0, 0.03, 0.45], [0, 1, 0]) ** 1.5
    place(y, 0.01, nrm(svf(noise(0.45), 2500 + 1500 * np.exp(-tb * 6), 6)) * a, 0.35)
    return y

def bolt_hit():  # bulten slår in: hårt, torrt "tock", skaftet surrar kort och flisor
    d = 0.5; t = tt(d); y = np.zeros(len(t))
    place(y, 0, nrm(reson(noise(0.06), [(900, 120, 1), (2100, 250, 0.6), (450, 60, 0.5)])) * np.exp(-tt(0.06) * 70) * env(int(0.06 * SR), 0.0005, 0.01))
    ph = phase(190 * (1 + 0.04 * np.exp(-t * 20)))
    vib = sum(np.sin(k * ph + rng.uniform(0, 6)) / k ** 1.4 for k in range(1, 8))
    y += nrm(fftfilt(vib, 80, 3000)) * np.exp(-t * 10) * (0.6 + 0.4 * np.sin(2 * np.pi * 26 * t)) * 0.35
    y += grains(d, 150, 2000, 8000, 0.002) * np.exp(-t * 18) * 0.4
    place(y, 0, tick(0.02, 0.6, 3000, 10000, 200))
    return y * env(len(t), 0.0005, 0.1)

# ---- paddjätten (träsket) ----
def croak(d, f0a, f0b, rate=(32, 22), F1=(280, 380), F2=(700, 600)):  # kväk: röst vars amplitud pulserar i "rate" Hz (knarrigt "rrr")
    t = tt(d); f0 = np.interp(t, [0, d * 0.3, d], [f0a, f0b, f0a * 0.85]); r = np.interp(t, [0, d], rate)
    F = [(np.interp(t, [0, d], F1), 60, 1), (np.interp(t, [0, d], F2), 100, 0.5), (1600, 200, 0.12)]
    v = nrm(voice(f0, F, 3000, jitter=0.02, roll=0.6)) * (0.3 + 0.7 * (0.5 + 0.5 * np.cos(phase(r))) ** 3)
    return np.tanh(2.2 * v) * env(len(t), 0.03, d * 0.3)

def toad():  # paddjätten: djupt, knarrigt kväkande i två stötar ("rrroak – rroooak") med en blöt halsbubbla emellan
    d = 1.5; y = np.zeros(int(d * SR))
    place(y, 0, croak(0.45, 70, 85)); place(y, 0.55, croak(0.8, 66, 80, (28, 18), (300, 360), (680, 560)))
    place(y, 0.47, splat(0.12), 0.25)
    return cut(verb(fftfilt(y, 30, 3500), 0.9, 0.25, 3000), d, 0.3)

def tongue_lash():  # tungan skjuts ut: våt, snabb snärt (svisch som stiger), ett klafsande smack och ett slafsigt sug tillbaka
    d = 0.8; t = tt(d); c = 0.11
    a = np.where(t < c, (t / c) ** 2, np.exp(-(t - c) * 30))
    y = nrm(svf(noise(d), 600 + 3000 * a, 3.0)) * a * 0.5
    place(y, c, splat(0.3), 0.9)
    tr = tt(0.4); place(y, 0.28, nrm(svf(noise(0.4), 2500 * 0.3 ** (tr / 0.4), 4)) * np.sin(np.pi * tr / 0.4) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * 30 * tr)), 0.4)
    return y * env(len(t), 0.002, 0.15)

def toad_land():  # paddjätten landar: väldig, mjuk duns (djup subton), blött plask, marken skakar och ett kort stön
    d = 1.3; t = tt(d); y = np.zeros(len(t))
    place(y, 0, thud(38, 1.2, 0.4)); place(y, 0, splat(0.4), 0.6)
    y += low_rumble(d, 30) * np.exp(-t * 3) * 0.4
    place(y, 0.02, debris(0.8, 25, 300, 2000, 0.3), 0.3)
    place(y, 0.15, croak(0.3, 60, 70, (30, 20)), 0.3)
    return cut(verb(y, 0.9, 0.2, 3000), d, 0.35)

# ---- följeslagare ----
def pet_firefly():  # eldflugan: mjukt svävande surr från små vingar (tonhöjden svajar) och glittrande pling
    d = 1.2; t = tt(d); ph = phase(210 * (1 + 0.06 * lpnoise(d, 3)))
    buzz = fftfilt(sum(np.sin(k * ph) / k for k in range(1, 20)), 300, 4000)
    y = nrm(buzz) * 0.25 * env(len(t), 0.15, 0.4) * (0.6 + 0.4 * lpnoise(d, 4))
    for t0 in sorted(rng.uniform(0.05, 0.85, 10)): place(y, t0, bar(m2f(rng.choice([96, 98, 100, 103, 105])), 0.4, 0.18, dec=6), 1.0)
    sparks(y, d, 40, 1.0, 0.05)
    return cut(verb(y, 1.0, 0.35, 9000), d, 0.3)

def pet_golem():  # stengolemen: lågt, nöjt stenmummel ("hmm-hmm-hrrm") med grus i halsen, stenar som skaver och ett dovt dunk
    d = 1.3; t = tt(d)
    f0 = np.interp(t, [0, 0.3, 0.8, d], [60, 72, 66, 55])
    hum = np.zeros(len(t))
    for a, b in ((0.0, 0.25), (0.3, 0.55), (0.62, 1.15)): hum += np.clip((t - a) / 0.05, 0, 1) * np.clip((b - t) / 0.08, 0, 1)
    v = growl(d, f0, [(np.interp(t, [0, 0.6, d], [280, 420, 300]), 70, 1), (800, 120, 0.3), (1800, 200, 0.08)], 0.5, 0.5, 3000, 1.8)
    gr = 0.6 + 0.4 * nrm(fftfilt(np.abs(noise(d)), 0, 40))
    y = v * hum * gr + nrm(reson(noise(d), [(350, 80, 1), (900, 150, 0.5), (2000, 300, 0.2)])) * gr * 0.15 * env(len(t), 0.1, 0.3)
    y += grains(d, 400, 600, 3500, 0.004) * 0.25
    place(y, 1.0, thud(60, 0.3, 0.3), 0.4)
    return cut(verb(fftfilt(y, 40, 3500), 0.6, 0.15, 3000), d, 0.25)

def pet_owl():  # ugglan: "hoo – hu-hu – hoooo", mjukt och luftigt i en dov skog
    d = 1.7; y = np.zeros(int(d * SR))
    for t0, dd, f, g, tr in ((0, 0.3, 410, 0.8, 0), (0.48, 0.13, 430, 0.55, 0), (0.64, 0.13, 430, 0.55, 0), (0.85, 0.6, 400, 1.0, 0.08)):
        place(y, t0, hoot(dd, f, g, tr))
    return cut(verb(y, 1.4, 0.35, 5000), d, 0.4)

# ---- legendaltaret och legendariska vapen ----
def legend_altar():  # legendaltaret: mäktigt körackord (D-dur över fem oktaver), låga stråkar, rörklocka och skimmer
    d = 3.2; t = tt(d); y = np.zeros(len(t))
    y += nrm(choir([50, 57, 62, 66, 69], d, 0.35, 1.2, 1.0, vib=4.5, F=AA, hmax=5000)) * 0.6
    y += nrm(choir([74, 78, 81], d, 0.5, 1.2, 1.0, vib=5.5, F=SOP, hmax=7000)) * 0.25
    y += strings([26, 38, 45], d, att=0.3, rel=1.2, g=0.45, hi=600)
    place(y, 0, tubebell(62, d, 0.3)); place(y, 0, thud(45, 0.8, 0.0), 0.4)
    y += shards(d, 30, 2.0, 4000, 9000) * 0.06
    return cut(verb(y, 2.5, 0.4, 5000), d, 1.0)

def legend_get():  # legendariskt vapen: mässingsfanfar (tre stötar, kvart upp, stort D-dur), kör, pauka, cymbal och klockspel (~1,5 s)
    d = 1.7; y = np.zeros(int(d * SR))
    for t0 in (0, 0.12, 0.24): place(y, t0, brass([62, 69], 0.11, att=0.004, rel=0.04, drive=2.4, swell=0.03, hi_fc=3200), 0.45)
    place(y, 0.36, brass([67, 71, 74], 0.22, att=0.006, rel=0.06, drive=2.4, swell=0.05, hi_fc=3200), 0.5)
    place(y, 0.6, brass([50, 62, 66, 69, 74], 1.0, att=0.01, rel=0.5, drive=2.0, swell=0.2, hi_fc=3000), 0.7)
    place(y, 0.6, nrm(choir([62, 66, 69, 74], 1.0, 0.1, 0.5, 1.0, F=AA, hmax=6000)), 0.25)
    place(y, 0.6, taiko(0.7, 42, 1.0)); place(y, 0.6, crash_cym(0.3, 1.1))
    for i, n in enumerate((86, 90, 93, 98, 102)): place(y, 0.62 + 0.05 * i, bar(m2f(n), 1.0, 0.18, dec=2.5))
    return cut(verb(y, 1.2, 0.3, 6000), d, 0.35)

def legend_fire_dragon():  # drakbössan: tung smäll, eldsprut som vrålar (mörknande brus med knaster) och ett djupt drakmorr
    d = 1.1; t = tt(d); y = np.zeros(len(t))
    place(y, 0, thud(50, 0.6, 0.3)); place(y, 0, nrm(fftfilt(noise(0.3), 200, 9000)) * np.exp(-tt(0.3) * 20), 0.8)
    a = np.interp(t, [0, 0.03, 0.3, d], [0, 1, 0.6, 0]) ** 1.2
    y += nrm(svf(noise(d), (500 + 1800 * a) * (1 + 0.2 * lpnoise(d, 8)), 0.8, 'lp')) * a * 0.7
    y += crackle(d, 300, 1500, 7000) * a * 0.35
    y += growl(d, np.interp(t, [0, 0.3, d], [52, 60, 42]), [(500, 100, 1), (900, 140, 0.5), (2000, 250, 0.15)], 0.7, 0.6) * np.interp(t, [0, 0.05, 0.4, d], [0, 1, 0.7, 0]) * 0.35
    return y * env(len(t), 0.001, 0.25)

def legend_fire_frost():  # frostgeväret: skarp knall, isande frostväs och iskristaller som klirrar och spricker
    d = 1.0; t = tt(d); y = np.zeros(len(t))
    place(y, 0, nrm(fftfilt(noise(0.15), 500, 10000)) * np.exp(-tt(0.15) * 40), 0.9); place(y, 0, thud(80, 0.3, 0.0), 0.5)
    y += nrm(fftfilt(noise(d), 4000, 11000)) * np.interp(t, [0, 0.03, d], [0, 1, 0]) ** 2 * 0.25
    place(y, 0.02, shards(0.9, 30, 0.5, 3000, 9000), 0.45)
    for i, n in enumerate((93, 97, 100, 105)): place(y, 0.03 + 0.04 * i, crys(m2f(n), 0.7, 0.25, 3.0, 0.004))
    return cut(verb(y, 1.0, 0.3, 9000), d, 0.3)

def legend_fire_soul():  # själapistolen: dovt skott, en viskande andeton som sveper iväg ("ooo") och ett läkande skimmer
    d = 1.0; t = tt(d); y = np.zeros(len(t))
    place(y, 0, thud(100, 0.25, 0.0), 0.8); place(y, 0, nrm(fftfilt(noise(0.12), 600, 8000)) * np.exp(-tt(0.12) * 45), 0.7)
    v = sing([(0.0, 79, 0.15), (0.12, 86, 0.45)], SOO, 1.0, 0.015, 0.08, 6000, 1.0, 0.25)
    place(y, 0.02, v[:int(0.8 * SR)] * env(int(0.8 * SR), 0.05, 0.4), 0.35)
    u = tt(0.6) / 0.6; place(y, 0.02, nrm(svf(noise(0.6), 3000 - 2000 * u, 3.0)) * np.sin(np.pi * u) ** 2, 0.25)
    for i, n in enumerate((84, 88, 91, 96)): place(y, 0.3 + 0.06 * i, glass(n, 0.6, 0.12, att=0.02, rel=0.4))
    return cut(verb(y, 1.2, 0.35, 7000), d, 0.3)

def legend_fire_storm():  # åskstaven: elektriskt zapp som faller, blixtknall från ovan och rullande muller
    d = 1.4; t = tt(d); y = np.zeros(len(t))
    tz = tt(0.2); place(y, 0, nrm(sawp(phase(2200 * 0.12 ** (tz / 0.2)), 8000, 2200)) * np.exp(-tz * 10), 0.3)
    place(y, 0, crackle(0.15, 60, 2000, 10000), 0.6)
    place(y, 0.1, bolt(0.4), 1.0); place(y, 0.1, thud(45, 0.8, 0.0), 0.8)
    y += nrm(fftfilt(noise(d), 25, 400)) * np.interp(t, [0, 0.12, 0.4, d], [0, 1, 0.5, 0]) * (0.7 + 0.3 * lpnoise(d, 5)) * 0.6
    y += crackle(d, 200, 1500, 9000, 1.5) * np.exp(-t * 3) * 0.3
    return cut(verb(np.tanh(1.8 * nrm(y)), 1.5, 0.3, 4000), d, 0.5)

def legend_hit_blood():  # blodyxan träffar: tungt hugg, blött stänk, blodet sugs tillbaka (baklänges sus) och två hjärtslag
    d = 0.95; t = tt(d); y = np.zeros(len(t))
    place(y, 0, thud(70, 0.5, 0.3)); place(y, 0, splat(0.3), 0.8)
    place(y, 0, nrm(reson(noise(0.08), [(300, 60, 1), (800, 150, 0.5)])) * np.exp(-tt(0.08) * 50), 0.6)
    u = tt(0.35) / 0.35; place(y, 0.15, nrm(svf(noise(0.35), 400 * 6 ** u, 3.0)) * u ** 2 * np.clip((1 - u) / 0.05, 0, 1), 0.35)
    for t0, g in ((0.52, 0.9), (0.68, 0.6)): place(y, t0, drum(45, 0.3, g, 0.05, dec=12))
    return cut(verb(y, 0.7, 0.2, 4000), d, 0.25)

def legend_fire_moon():  # månbågen: strängen smäller, tre silverglänsande visslingar som delar sig och ett klockspelsglitter
    d = 0.9; t = tt(d); y = np.zeros(len(t))
    place(y, 0, twang(230, 0.3, 1.0, 16), 0.5)
    tb = tt(0.6); a = np.interp(tb, [0, 0.04, 0.6], [0, 1, 0]) ** 1.5
    place(y, 0.01, nrm(svf(noise(0.6), 3000, 4)) * a, 0.2)
    for f, p in ((1900, 0.97), (2400, 1.0), (2850, 1.04)):
        place(y, 0.03, np.sin(phase(f * np.interp(tb, [0, 0.6], [1, p * 0.9]))) * a * (1 + 0.1 * np.sin(2 * np.pi * 7 * tb)), 0.15)
    for i, n in enumerate((96, 100, 103)): place(y, 0.05 + 0.05 * i, bar(m2f(n), 0.6, 0.2, dec=4))
    return cut(verb(y, 1.0, 0.35, 9000), d, 0.3)

FX = dict(jailer=jailer, chain_throw=chain_throw, chain_bind=chain_bind, burrower=burrower, burrow_dig=burrow_dig,
          burrow_emerge=burrow_emerge, gravedigger=gravedigger, spade_hit=spade_hit, raise_dead=raise_dead, rootling=rootling,
          roots_burst=roots_burst, crossbow_enemy=crossbow_enemy, bolt_hit=bolt_hit, toad=toad, tongue_lash=tongue_lash,
          toad_land=toad_land, pet_firefly=pet_firefly, pet_golem=pet_golem, pet_owl=pet_owl, legend_altar=legend_altar,
          legend_get=legend_get, legend_fire_dragon=legend_fire_dragon, legend_fire_frost=legend_fire_frost,
          legend_fire_soul=legend_fire_soul, legend_fire_storm=legend_fire_storm, legend_hit_blood=legend_hit_blood,
          legend_fire_moon=legend_fire_moon)

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

for k, f in FX.items(): wr('s_' + k, f())

# ---- hub: Lägret, G-dur, 6/8, åttondel 0,25 s (80 punkterade fjärdedelar i minuten), 32 takter = 48 s (G D Em C G Am D D x4) ----
# fyra varv: 1) fingerplockad gitarr, varma låga stråkar och cello, 2) + flöjtmelodi, 3) + nynnande kör, celesta och mjuk
# ramtrumma med shaker, 4) flöjtmelodin i ny vändning, trumman tystnar i sista takten så att slingan andas inför början.
# Under alltihop en svag drone, varm luft och lägereldsknaster.
def hub():
    e = 0.25; b6 = 6 * e; T = 32 * b6; L = Loop(T)
    prog = ['G', 'D', 'Em', 'C', 'G', 'Am', 'D', 'D']
    chord = {'G': [55, 59, 62], 'D': [54, 57, 62], 'Em': [52, 55, 59], 'C': [52, 55, 60], 'Am': [52, 57, 60]}
    root = {'G': 43, 'D': 38, 'Em': 40, 'C': 36, 'Am': 45}
    cel = {'G': (74, 71), 'D': (74, 69), 'Em': (71, 67), 'C': (72, 67), 'Am': (76, 72)}
    L.add(0, L.drone(43, 0.1, h=5, roll=1.8, cyc=4, hi=300))
    L.add(0, L.bed(300, 1200, 0.004, cyc=3)); L.add(0, L.bed(3000, 8000, 0.0015, cyc=5))
    for _ in range(int(T * 5)): L.add(rng.uniform(0, T), ember(rng.uniform(0.01, 0.05) * (1 if rng.uniform() > 0.1 else 2.5)), rng.uniform(-0.6, 0.6))
    for s in range(32):
        c = prog[s % 8]; ch = chord[c]; r = root[c]; t0 = s * b6; rnd = s // 8
        L.add(t0 - 0.3, strings([n - 12 for n in ch], b6 + 0.9, att=0.6, rel=0.9, g=0.17, hi=800), -0.25)
        L.add(t0 - 0.15, strings([r], b6 + 0.6, att=0.3, rel=0.7, g=0.16, hi=450), 0.1)
        pat = [r, ch[0], ch[1], ch[2], ch[1], ch[0]] if s % 8 != 7 else [r, ch[0], ch[2], ch[2] + 5, ch[2] + 2, ch[1]]
        for k8 in range(6):
            L.add(t0 + k8 * e + rng.uniform(-0.008, 0.008), pluck(pat[k8], 2.2, 1.4, (0.2 if k8 == 0 else 0.13) * rng.uniform(0.9, 1.1)), -0.35 + 0.1 * k8)
        if rnd == 2:
            L.add(t0 - 0.2, nrm(choir(ch, b6 + 0.6, 0.5, 0.7, 1.0, vib=4.5, F=MM, hmax=3000)), 0.3, 0.12)
            n1, n2 = cel[c] if s % 8 != 7 else (66, 69)
            L.add(t0, bar(m2f(n1 + 12), 1.6, 0.1, dec=2.2), 0.45); L.add(t0 + 3 * e, bar(m2f(n2 + 12), 1.6, 0.08, dec=2.2), 0.5)
        if rnd >= 2 and s != 31:
            L.add(t0, drum(55, 0.7, 0.16, 0.15, dec=7), 0); L.add(t0 + 3 * e, drum(60, 0.6, 0.09, 0.15, dec=8), 0)
            for k8 in range(6): L.add(t0 + k8 * e, shaker(0.05 if k8 % 3 else 0.08), -0.45)
    melA = [(0, 74, 3), (3, 71, 2), (5, 72, 1), (6, 74, 3), (9, 69, 3), (12, 71, 2), (14, 72, 1), (15, 74, 2), (17, 76, 1),
            (18, 76, 3), (21, 72, 3), (24, 71, 3), (27, 74, 2), (29, 79, 1), (30, 76, 3), (33, 72, 3), (36, 74, 2), (38, 72, 1),
            (39, 69, 3), (42, 69, 6)]
    melB = melA[:11] + [(24, 79, 3), (27, 78, 2), (29, 76, 1), (30, 76, 3), (33, 74, 3), (36, 74, 2), (38, 76, 1), (39, 78, 3), (42, 74, 5)]
    for rnd, mel in ((1, melA), (3, melB)):
        for k0, n, dd in mel: L.add(rnd * 8 * b6 + k0 * e, flute(n, dd * e + 0.08, 0.26), 0.15)
    L.reverb(3.5, 0.4, 4500, 0.03)
    write_aligned((L, 'hub', -20))

# ---- sting_chapter: ett kampanjkapitel börjar, d-moll -> D-dur, 5 s (slingar inte; svansen tonas ut) ----
# baklänges cymbal och virvel in mot slaget, pauka, kyrkklocka och låga stråkar, mässingsmotiv D–A–D–F–E över Dm–Bb–A
# och ett stort D-durackord med kör och klockspel som klingar ut.
def sting_chapter():
    B = stereo_sting(5.4)
    rc = crash_cym(1.0, 0.7)[::-1]; sadd(B, 0, rc * np.linspace(0, 1, len(rc)) ** 2, 0.3, 0.2)
    for k in range(10): sadd(B, k * 0.06, snare(0.04 + 0.025 * k), -0.1)
    sadd(B, 0.6, taiko(1.0, 38, 2.0), 0); sadd(B, 0.6, bell(38, 4.5, 0.45), -0.1); sadd(B, 0.6, crash_cym(0.3, 3.0), 0.3)
    for t0, dd, ch, r in ((0.6, 1.1, [57, 62, 65], 38), (1.7, 0.3, [58, 62, 65], 34), (2.0, 0.6, [57, 61, 64], 33)):
        sadd(B, t0 - 0.03, strings([n - 12 for n in ch], dd + 0.3, att=0.05, rel=0.3, g=0.32, hi=1200), -0.25)
        sadd(B, t0 - 0.03, strings([r, r + 12], dd + 0.3, att=0.05, rel=0.3, g=0.35, hi=600), 0.1)
        sadd(B, t0 - 0.05, nrm(choir(ch, dd + 0.3, 0.15, 0.3, 1.0, F=AA, hmax=5000)), 0.2, 0.2)
    for t0, n, dd in ((0.6, 62, 0.35), (0.95, 69, 0.2), (1.15, 74, 0.5), (1.7, 77, 0.3), (2.0, 76, 0.55)):
        sadd(B, t0, brass([n, n - 12], dd + 0.05, att=0.02, rel=0.12, drive=2.4, swell=0.15, hi_fc=2800), 0.15, 0.42)
    sadd(B, 2.6, brass([50, 62, 66, 69, 78], 2.2, att=0.02, rel=1.4, drive=2.0, swell=0.4, hi_fc=3000), 0, 0.6)
    sadd(B, 2.6, strings([26, 38, 50], 2.6, att=0.05, rel=1.6, g=0.4, hi=700), 0)
    sadd(B, 2.58, nrm(choir([62, 66, 69, 74], 2.6, 0.2, 1.6, 1.0, F=AA, hmax=6000)), 0, 0.3)
    sadd(B, 2.6, taiko(0.9, 40, 2.0), 0); sadd(B, 2.6, crash_cym(0.3, 2.5), -0.3); sadd(B, 2.6, tubebell(62, 2.8, 0.25), 0.2)
    for i, n in enumerate((86, 90, 93, 98, 102)): sadd(B, 2.62 + 0.07 * i, bar(m2f(n), 1.8, 0.16, dec=2), -0.5 + 0.25 * i)
    L = cut(verb(B[0], 2.0, 0.35, 5000), 5.0, 1.4); R = cut(verb(B[1], 2.0, 0.35, 5000), 5.0, 1.4)
    wr('sting_chapter', np.stack([L, R], 1).reshape(-1), 2)

hub(); sting_chapter()
PY
python3 -I "$T/synth8.py" "$T"

# ---------- musik ----------
mus hub -20 anull "$T/hub.wav"
mus sting_chapter -17 anull "$T/sting_chapter.wav"

# ---------- ljudeffekter ----------
E="$S/Environment"
G="$S/Combat and Gore"
# fångvaktaren (kryptan): röst, kedjekast, kedjan låser fast
TOP=-2 fx jailer "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,lowpass=f=4000,volume=0.3,adelay=1000[b];[a][b]$(mix 2),atrim=0:1.6,afade=t=out:st=1.3:d=0.3[o]" "$T/s_jailer.wav" "$S/Items/keys_jingling.wav"
fx chain_throw "[0:a]$P[a];[1:a]$P,asetrate=39690,aresample=44100,volume=0.4,adelay=380[b];[2:a]$P,volume=0.3[c];[a][b][c]$(mix 3),atrim=0:0.9,afade=t=out:st=0.65:d=0.25[o]" "$T/s_chain_throw.wav" "$S/Items/keys_jingling.wav" "$S/Other/whoosh_2.wav"
fx chain_bind "[0:a]$P[a];[1:a]$P,atrim=0.35,asetpts=PTS-STARTPTS,volume=0.45,adelay=300[b];[2:a]$P,asetrate=37485,aresample=44100,volume=0.35[c];[a][b][c]$(mix 3),atrim=0:1.2,afade=t=out:st=0.9:d=0.3[o]" "$T/s_chain_bind.wav" "$E/lock_lock.wav" "$S/Items/keys_jingling.wav"
# grävaren (grottorna): gnissel, grävande under jorden (slinga), bryter fram
TOP=-3 fx burrower "[0:a]$P[a];[1:a]$P,volume=0.4,adelay=250[b];[a][b]$(mix 2),atrim=0:1.0,afade=t=out:st=0.75:d=0.25[o]" "$T/s_burrower.wav" "$S/Footsteps/foley_footstep_gravel_2.wav"
TOP=-4 fxloop burrow_dig 2 0.4 "[0:a]$P[a];[1:a]$P,asetrate=30870,aresample=44100,lowpass=f=1200,volume=0.5,adelay=150[b];[2:a]$P,asetrate=28665,aresample=44100,lowpass=f=1000,volume=0.4,adelay=1250[c];[a][b][c]$(mix 3)[o]" "$T/s_burrow_dig.wav" "$S/Items/shovel_dig.wav" "$S/Items/shovel_dig.wav"
fx burrow_emerge "[0:a]$P[a];[1:a]$P,lowpass=f=3000,volume=0.5,adelay=350[b];[2:a]$P,volume=0.6,adelay=420[c];[a][b][c]$(mix 3),atrim=0:1.4,afade=t=out:st=1.05:d=0.35[o]" "$T/s_burrow_emerge.wav" "$I/impactMining_001.ogg" "$S/Footsteps/foley_footstep_gravel_2.wav"
# likgrävaren (kyrkogården): mummel, spadslag, väcker en död
TOP=-2 fx gravedigger "$P" "$T/s_gravedigger.wav"
fx spade_hit "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,volume=0.45[b];[2:a]$P,atrim=0.25:0.6,asetpts=PTS-STARTPTS,volume=0.3,adelay=40[c];[a][b][c]$(mix 3),atrim=0:0.8,afade=t=out:st=0.55:d=0.25[o]" "$T/s_spade_hit.wav" "$I/impactMetal_heavy_000.ogg" "$S/Items/shovel_dig.wav"
fx raise_dead "[0:a]$P[a];[1:a]$P,volume=0.45,adelay=900[b];[2:a]$P,atrim=0:2.0,asetrate=33075,aresample=44100,lowpass=f=1500,volume=0.2,afade=t=in:d=0.6,afade=t=out:st=1.0:d=0.8[c];[a][b][c]$(mix 3),atrim=0:2.2,afade=t=out:st=1.8:d=0.4[o]" "$T/s_raise_dead.wav" "$G/bone_snap.wav" "$S/Other/ghost_long.wav"
# rotvättet (skogen): knakande trä, rötter skjuter upp
TOP=-2 fx rootling "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,volume=0.4,adelay=100[b];[a][b]$(mix 2),atrim=0:1.2,afade=t=out:st=0.9:d=0.3[o]" "$T/s_rootling.wav" "$S/Footsteps/foley_creak_1.wav"
fx roots_burst "[0:a]$P[a];[1:a]$P,volume=0.5[b];[2:a]$P,atrim=0.35,asetpts=PTS-STARTPTS,volume=0.3,adelay=60[c];[a][b][c]$(mix 3),atrim=0:1.3,afade=t=out:st=0.95:d=0.35[o]" "$T/s_roots_burst.wav" "$I/impactWood_heavy_002.ogg" "$G/bone_snap.wav"
# armborstskytten (borggården)
fx crossbow_enemy "[0:a]$P[a];[1:a]$P,asetrate=30870,aresample=44100,volume=0.4,adelay=8[b];[2:a]$P,volume=0.35[c];[a][b][c]$(mix 3),atrim=0:0.7,afade=t=out:st=0.45:d=0.25[o]" "$T/s_crossbow_enemy.wav" "$S/Other/elastic_twang.wav" "$R/metalClick.ogg"
fx bolt_hit "[0:a]$P[a];[1:a]$P,volume=0.5[b];[a][b]$(mix 2),atrim=0:0.5,afade=t=out:st=0.3:d=0.2[o]" "$T/s_bolt_hit.wav" "$I/impactWood_medium_001.ogg"
# paddjätten (träsket)
TOP=-2 fx toad "[0:a]$P[a];[1:a]$P,atrim=0:1.5,asetrate=22050,aresample=44100,lowpass=f=1500,volume=0.3,afade=t=in:d=0.2,afade=t=out:st=1.0:d=0.5[b];[a][b]$(mix 2),atrim=0:1.5,afade=t=out:st=1.2:d=0.3[o]" "$T/s_toad.wav" "$E/gurgling.wav"
fx tongue_lash "[0:a]$P[a];[1:a]$P,atrim=0.08,asetpts=PTS-STARTPTS,volume=0.4,adelay=105[b];[2:a]$P,atrim=0.2:0.8,asetpts=PTS-STARTPTS,volume=0.3,adelay=260,afade=t=out:st=0.6:d=0.2[c];[a][b][c]$(mix 3),atrim=0:0.8,afade=t=out:st=0.6:d=0.2[o]" "$T/s_tongue_lash.wav" "$G/slap.wav" "$S/Other/drink_slurp.wav"
fx toad_land "[0:a]$P[a];[1:a]$P,asetrate=30870,aresample=44100,volume=0.6[b];[2:a]$P,atrim=0.35:1.15,asetpts=PTS-STARTPTS,asetrate=33075,aresample=44100,volume=0.35[c];[a][b][c]$(mix 3),atrim=0:1.3,afade=t=out:st=0.95:d=0.35[o]" "$T/s_toad_land.wav" "$I/impactSoft_heavy_001.ogg" "$E/water_splashing.wav"
# följeslagare
TOP=-3 fx pet_firefly "$P" "$T/s_pet_firefly.wav"
TOP=-3 fx pet_golem "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,lowpass=f=2500,volume=0.25,afade=t=in:d=0.2[b];[a][b]$(mix 2),atrim=0:1.3,afade=t=out:st=1.0:d=0.3[o]" "$T/s_pet_golem.wav" "$S/Materials/stone_push_short.wav"
TOP=-3 fx pet_owl "$P" "$T/s_pet_owl.wav"
# legendaltaret och legendariska vapen
fx legend_altar "[0:a]$P[a];[1:a]$P,asetrate=29400,aresample=44100,lowpass=f=2500,volume=0.3[b];[a][b]$(mix 2),atrim=0:3.2,afade=t=out:st=2.2:d=1.0[o]" "$T/s_legend_altar.wav" "$I/impactBell_heavy_000.ogg"
fx legend_get "$P" "$T/s_legend_get.wav"
fx legend_fire_dragon "[0:a]$P[a];[1:a]$P,lowpass=f=3000,volume=0.4[b];[2:a]$P,volume=0.45,adelay=30[c];[a][b][c]$(mix 3),atrim=0:1.1,afade=t=out:st=0.8:d=0.3[o]" "$T/s_legend_fire_dragon.wav" "$S/Retro/explosion_medium.wav" "$E/fire_lighting.wav"
fx legend_fire_frost "[0:a]$P[a];[1:a]$P,atrim=0.04,asetpts=PTS-STARTPTS,volume=0.35,adelay=20[b];[2:a]$P,volume=0.3,adelay=30[c];[a][b][c]$(mix 3),atrim=0:1.0,afade=t=out:st=0.7:d=0.3[o]" "$T/s_legend_fire_frost.wav" "$E/ice_in_water.wav" "$I/impactGlass_light_002.ogg"
fx legend_fire_soul "[0:a]$P[a];[1:a]$P,volume=0.3[b];[a][b]$(mix 2),atrim=0:1.0,afade=t=out:st=0.7:d=0.3[o]" "$T/s_legend_fire_soul.wav" "$S/Weapons/shot_muffled.wav"
fx legend_fire_storm "[0:a]$P[a];[1:a]$P,asetrate=30870,aresample=44100,lowpass=f=2500,volume=0.4,adelay=100[b];[a][b]$(mix 2),atrim=0:1.4,afade=t=out:st=0.9:d=0.5[o]" "$T/s_legend_fire_storm.wav" "$S/Retro/explosion_large.wav"
fx legend_hit_blood "[0:a]$P[a];[1:a]$P,volume=0.45[b];[2:a]$P,volume=0.45[c];[a][b][c]$(mix 3),atrim=0:0.95,afade=t=out:st=0.7:d=0.25[o]" "$T/s_legend_hit_blood.wav" "$G/crunch_splat.wav" "$R/chop.ogg"
fx legend_fire_moon "[0:a]$P[a];[1:a]$P,volume=0.3[b];[2:a]$P,asetrate=52920,aresample=44100,volume=0.25[c];[a][b][c]$(mix 3),atrim=0:0.9,afade=t=out:st=0.6:d=0.3[o]" "$T/s_legend_fire_moon.wav" "$S/Other/elastic_twang.wav" "$S/Other/whoosh_1.wav"

for f in "$M"/hub.ogg "$M"/sting_chapter.ogg; do printf '%-36s %6.2f s %5d kB %6s LUFS\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" "$(( $(stat -c %s "$f") / 1024 ))" "$(lufs "$f")"; done
