#!/bin/bash
# Ljud för Krypta del 5: kastkniven, stridshammaren, musköten, Graven (mumier, skarabéer, schakaler,
# tjuvar, dubbelgångare, sarkofager, rullande stenblock, kvicksand, sandstorm), smygandet (lampor,
# kastade stenar, upptäckt), spelhålan (tärningar, lyckohjul, banken), vandraren, köpslåendet,
# faraon och labyrinten, och musiken tomb (+ tomb_hi, tidslinjerat intensitetslager), boss4,
# stealth och labyrinth.
# Samma konventioner som make2.sh-make4.sh: effekter mono 22 kHz Vorbis q2 toppnormaliserade till $TOP dBFS
# (standard -1, slingor -4), musik stereo 44,1 kHz Vorbis q1 linjärt förstärkt till mål-LUFS,
# alla slingor bär LOOPLENGTH=<sampel> i Vorbis-kommentaren och effektslingorna vrids så att skarven
# hamnar där signalen är tyst och flack.
# Källor: assets/audio (Kenney-paketen CC0: impact-sounds, rpg-audio, casino-audio, voiceover-pack;
# 400 Sounds Pack CC0). Horror SFX-paketet används inte längre: röster (mumie, schakal, tjuv, farao,
# köpman), insekter, klockor, vind, musköten, magi och all musik syntetiseras med python3 + numpy
# (inbäddat nedan).
# Deterministiskt: fast frö för slumptalen och -fflags +bitexact (annars slumpar Ogg-muxern serienumret).
# Kör från katalogen där retrofps/ (repot) och assets/audio/ ligger: bash retrofps/tools/sounds/make5.sh
set -e
O=retrofps/assets/snd
M=retrofps/assets/music
A=assets/audio
S="$A/400 Sounds Pack"
I=$A/impact-sounds/Audio
R=$A/rpg-audio/Audio
C=$A/casino-audio/Audio
V=$A/voiceover-pack/Male
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

# röstmaterial till dubbelgångarens viskning och vandrarens mummel (Kenney Voiceover Pack, manlig röst), mono 44,1 kHz
ffmpeg -loglevel error -y -i "$V/war_watch_my_back.ogg" -i "$V/hurry_up.ogg" -i "$V/you_lose.ogg" -i "$V/war_look_out.ogg" \
  -filter_complex "[0:a][1:a][2:a][3:a]concat=n=4:v=0:a=1,$P[o]" -map '[o]' "$T/vox_d.wav"

# ---------- syntes ----------
cat > "$T/synth5.py" <<'PY'
# Syntetiserade effekter och musikslingor för Krypta del 5. Användning: python3 synth5.py <katalog>
# Musiken läggs med "wrap" (toner som går över slutet läggs på början), efterklangen är en cirkulär
# faltning och liggande toner/brus har ett helt antal perioder på slingan, så slingorna är sömlösa.
import sys, wave, numpy as np
SR = 44100
OUT = sys.argv[1]
rng = np.random.default_rng(5155)

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

# ---- byggstenar (som i make4.sh) ----
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

def whisper(src, start, d, rev=True):  # viskning: röstens spektrum med slumpad fas
    x = rd(src); x = x[::-1] if rev else x
    i0 = int(start * SR); x = x[i0:i0 + int(d * SR)]
    N, hop = 1024, 256; w = np.hanning(N); pad_ = np.zeros(len(x) + N); pad_[:len(x)] = x
    out = np.zeros(len(pad_) + N); norm = np.zeros_like(out)
    for i in range(0, len(x), hop):
        X = np.abs(np.fft.rfft(pad_[i:i + N] * w))
        out[i:i + N] += np.fft.irfft(X * np.exp(1j * rng.uniform(0, 2 * np.pi, len(X))), N) * w; norm[i:i + N] += w ** 2
    y = fftfilt((out / np.maximum(norm, 1e-3))[:len(x)], 500, 9000)
    return y * env(len(y), 0.03, 0.15)

def thud(f0=48, d=0.7, crunch=0.4):  # tungt slag: fallande subton + dovt brus + krasch
    t = tt(d)
    y = np.sin(phase(f0 * (1 + 2.0 * np.exp(-t * 30)))) * np.exp(-t * 6)
    y += fftfilt(noise(d), 40, 700) * np.exp(-t * 18) * 0.6
    y += fftfilt(noise(d), 1500, 6000) * np.exp(-t * 90) * 0.3
    y += debris(d, 25, 700, 4000, 0.18) * crunch
    return y * env(len(t), 0.001, 0.1)

# ================= effekter =================
def knife_whoosh():  # snurrande kniv: bandpassat brus med rotationspuls, tonhöjden sjunker
    d = 0.45; t = tt(d); c = 0.13
    a = np.where(t < c, (t / c) ** 2, np.exp(-(t - c) * 13))
    fc = 2600 * 0.38 ** (t / d)
    spin = 0.3 + 0.7 * (0.5 + 0.5 * np.sin(phase(np.interp(t, [0, d], [30, 20])))) ** 2
    y = svf(noise(d), fc, 2.5) * a * spin
    y = nrm(y) + fftfilt(noise(d), 3500, 9000) * a * spin * 0.08
    return y * env(len(t), 0.01, 0.08)

def knife_thrum():  # bladet dallrar i målet
    d = 0.45; t = tt(d)
    y = np.sin(2 * np.pi * 262 * t) * (0.55 + 0.45 * np.sin(2 * np.pi * 38 * t)) * np.exp(-t * 10)
    y += 0.3 * np.sin(2 * np.pi * 1730 * t) * np.exp(-t * 25)
    return y * env(len(t), 0.002, 0.05)

def ting(d=0.55, f=2650, g=1.0, dec=1.0):  # stålspets mot sten/metall
    t = tt(d); y = np.zeros_like(t)
    for r, a, dd in ((1, 1, 9), (1.56, 0.7, 12), (2.26, 0.45, 16), (2.92, 0.25, 22), (3.51, 0.12, 30)):
        if f * r < SR * 0.45: y += a * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6)) * np.exp(-t * dd * dec)
    y += fftfilt(noise(d), 3000, 10000) * np.exp(-t * 250) * 0.8
    return y * env(len(t), 0.0005, 0.03) * g

def knife_ting():  # träff i väggen + en liten studs
    y = np.zeros(int(0.55 * SR))
    place(y, 0, ting(0.55, 2650)); place(y, 0.115, ting(0.4, 3120, 0.3, 1.6)); place(y, 0.19, ting(0.3, 2890, 0.12, 2))
    place(y, 0, tick(0.03, 0.8, 1500, 6000, 150))
    return y

def knife_pick():  # bladet glider in i hölstret
    d = 0.3; t = tt(d); u = t / d
    y = svf(noise(d), 2800 + 3500 * u, 6.0) * np.sin(np.pi * np.clip(t / 0.2, 0, 1)) ** 1.2
    y = nrm(y) * 0.5
    place(y, 0.2, ting(0.1, 3800, 0.4, 2.5))
    return y * env(len(t), 0.01, 0.05)

def heavy_swish(d=0.7, c=0.3):  # tungt huvud som sveper förbi
    t = tt(d); a = 1 / (1 + ((t - c) / 0.09) ** 2)
    w = svf(noise(d), 180 + 520 * a, 1.3) * a + svf(noise(d), 90 + 110 * a, 2.5) * a * 0.9
    return w * env(len(t), 0.05, 0.15)

def strain():  # hammaren laddas: stigande ansträngt brum, skakning, knarr och sus
    d = 0.95; t = tt(d); u = t / d
    f = 62 * 2 ** (u * 1.1)
    tone = fftfilt(sawp(phase(f), 2500, 135), 40, 1100); tone = nrm(tone) * (0.3 + 0.7 * u ** 1.3)
    trem = 1 + 0.45 * u * np.sin(phase(7 + 24 * u))
    rise = nrm(svf(noise(d), 220 * 9 ** u, 3.0)) * u ** 1.6 * 0.55
    cr = nrm(bow_creak(d, 15, 40, ((380, 1, 90), (900, 0.6, 130), (1700, 0.3, 180)))) * 0.45
    y = tone * trem * 0.6 + rise + cr
    return y * env(len(t), 0.06, 0.04)

def slam():  # markslag + mullret
    d = 1.7; t = tt(d)
    y = np.sin(phase(42 * (1 + 1.8 * np.exp(-t * 16)))) * np.exp(-t * 3)
    y += fftfilt(noise(d), 40, 2500) * np.exp(-t * 25) * 0.7
    y += low_rumble(d) * np.exp(-t * 1.6) * 0.8 + debris(d, 50, 300, 2800, 1.1) * 0.4
    return fade_tail(y * env(len(t), 0.001, 0.1), 0.5)

def musket():  # flintlåset slår, krutet i pannan fräser, den stora smällen och krutknastret efteråt
    d = 1.5; y = np.zeros(int(d * SR))
    place(y, 0, tick(0.02, 0.6, 2000, 9000, 220))
    pan = fftfilt(noise(0.05), 1500, 8000) * np.exp(-tt(0.05) * 50); place(y, 0.008, pan, 0.5)
    t0 = 0.04; dd = d - t0; t = tt(dd)
    boom = np.sin(phase(40 * (1 + 2.5 * np.exp(-t * 25)))) * np.exp(-t * 3.2)
    blast = fftfilt(noise(dd), 60, 5000) * np.exp(-t * 16) * 1.6
    body = fftfilt(noise(dd), 40, 900) * np.exp(-t * 3.5) * 0.7 * (0.8 + 0.2 * lpnoise(dd, 10))
    crack = fftfilt(noise(dd), 2000, 10000) * np.exp(-t * 60) * 0.9
    b = (boom + blast + body + crack) * env(len(t), 0.0008, 0.1)
    place(y, t0, np.tanh(1.6 * nrm(b)))
    cr = np.zeros_like(y)
    for _ in range(170):
        u = rng.uniform(0, 1) ** 1.8; tc = 0.07 + u * 1.25; dc = rng.uniform(0.001, 0.006)
        c = noise(dc + 0.001)[:max(2, int(dc * SR))]; c = c * np.exp(-np.linspace(0, 5, len(c)))
        place(cr, tc, c, rng.uniform(0.2, 1) * (1 - u * 0.75))
    y += fftfilt(cr, 700, 9000) * 0.4
    tl = tt(d); y += fftfilt(noise(d), 1500, 7000) * 0.05 * np.exp(-np.maximum(tl - 0.05, 0) * 2.2) * np.minimum(1, tl / 0.05)
    return cut(verb(y, 1.7, 0.35, 4000), 1.45, 0.5)

def ramrod():  # laddstaken skrapar i pipan (rörresonanser) och stöter kulan på plats två gånger
    d = 1.25; y = np.zeros(int(d * SR))
    def scrape(dd, up):
        t = tt(dd); u = t / dd
        x = noise(dd) * (0.55 + 0.45 * lpnoise(dd, 70))
        r = nrm(reson(x, [(1250, 35, 1), (2680, 60, 0.7), (4150, 90, 0.45), (5600, 120, 0.25)]))
        r += nrm(fftfilt(x, 2500, 9000)) * 0.2
        return r * np.sin(np.pi * u) ** 0.7 * (0.8 + 0.2 * (u if up else 1 - u))
    def tap(g):
        s = anvil(820, 0.25, 0.5) + thud(110, 0.25, 0.1) * 0.8
        return s * g
    place(y, 0.18, scrape(0.28, False)); place(y, 0.45, tap(1.0))
    place(y, 0.56, scrape(0.17, True), 0.8); place(y, 0.74, scrape(0.15, False), 0.9); place(y, 0.88, tap(0.85))
    return y

def groan():  # mumien: torr, knarrande stön
    d = 1.4; t = tt(d)
    f0 = np.interp(t, [0, 0.25, 0.9, d], [76, 92, 80, 60])
    F1 = np.interp(t, [0, 0.5, d], [450, 600, 420]); F2 = np.interp(t, [0, 0.5, d], [820, 960, 760])
    F = [(F1, 90, 1.0), (F2, 120, 0.5), (2300, 250, 0.12)]
    v = voice(f0, F, 4500, jitter=0.03, roll=0.5)
    fry = 0.35 + 0.65 * np.clip(lpnoise(d, 40) * 2 + 0.3, 0, 1)
    v = np.tanh(2.2 * nrm(v)) * fry
    rasp = nrm(reson(noise(d), [(550, 150, 1), (900, 200, 0.6), (2500, 400, 0.3)]))
    y = (v + rasp * 0.35 * (0.6 + 0.4 * fry)) * env(len(t), 0.12, 0.35)
    return cut(verb(fftfilt(y, 60, 3500), 0.9, 0.22, 3000), 1.45, 0.35)

def flap():  # linnebindel som piskar
    d = 0.45; t = tt(d); c = 0.12
    a = np.where(t < c, (t / c) ** 1.5, np.exp(-(t - c) * 12))
    fl = 0.35 + 0.65 * np.abs(np.sin(phase(np.interp(t, [0, c, d], [25, 48, 20]))))
    y = fftfilt(noise(d), 300, 5000) * a * fl
    place(y, c, tick(0.03, 3.0, 800, 6000, 150))
    return y

def chitter(d=0.6, bursts=4, rate=(70, 120), f=(3000, 5200)):  # skarabé: täta käkklick i skurar
    y = np.zeros(int(d * SR)); t0 = rng.uniform(0, 0.03); k = tt(0.012)
    for _ in range(bursts):
        bd = rng.uniform(0.07, 0.15); r = rng.uniform(*rate); n = max(2, int(bd * r)); fc = rng.uniform(*f)
        for i in range(n):
            c = np.sin(2 * np.pi * fc * rng.uniform(0.9, 1.1) * k) * np.exp(-k * rng.uniform(400, 700)) + noise(0.012) * np.exp(-k * 900) * 0.5
            place(y, t0 + i / r + rng.uniform(0, 0.002), c, rng.uniform(0.5, 1) * np.sin(np.pi * (i + 0.5) / n) ** 0.5)
        t0 += bd + rng.uniform(0.02, 0.07)
        if t0 > d - 0.16: break
    for _ in range(3): place(y, rng.uniform(0, d - 0.05), tick(0.02, 1.0, 1500, 4000, 250))
    return fade_tail(y, 0.08)

def swarm(d=2.6):  # svärm: många skarabéer + krafsande ben + prassel
    y = np.zeros(int(d * SR))
    for _ in range(22): place(y, rng.uniform(0, d - 0.6), chitter(0.6, 3, (60, 130), (2500, 6000)), rng.uniform(0.25, 0.7))
    y += grains(d, int(d * 1100), 2000, 9000, 0.002) * 1.5 * (0.7 + 0.3 * lpnoise(d, 3))
    y += fftfilt(noise(d), 300, 1500) * 0.05 * (0.7 + 0.3 * lpnoise(d, 2))
    return y

def bark(out, t0, sc=1.0, dd=0.16, rough=1.0):  # schakalens skall (rått, ljust)
    t = tt(dd); f0 = np.interp(t, [0, 0.02, dd], [430, 580, 320]) * sc
    F1 = np.interp(t, [0, 0.03, dd], [650, 980, 600])
    ph = phase(f0); y = np.zeros_like(t)
    for k in range(1, 18):
        y += (1 / (1 + ((k * f0 - F1) / 250) ** 2) + 0.6 / (1 + ((k * f0 - 1900) / 400) ** 2) + 0.03) / k ** 0.3 * np.sin(k * ph)
    y = np.tanh(2.5 * nrm(y)) + svf(noise(dd), 1800, 0.9) * 0.4 * rough * np.exp(-t * 20)
    place(out, t0, y * env(len(t), 0.004, 0.05) * np.exp(-t * 5) * sc)

def jackal():  # morrning som brister i ett skall och ett kortare glefs
    out = np.zeros(int(1.05 * SR))
    dg = 0.48; t = tt(dg)
    f0 = np.interp(t, [0, 0.2, dg], [105, 125, 140])
    v = voice(f0, [(560, 120, 1.0), (1150, 150, 0.5), (2600, 300, 0.2)], 5000, jitter=0.04, roll=0.45)
    am = 0.35 + 0.65 * np.abs(np.sin(phase(30 + 8 * lpnoise(dg, 8))))
    g = (np.tanh(2.5 * nrm(v)) + nrm(fftfilt(noise(dg), 300, 2500)) * 0.3) * am * env(len(t), 0.08, 0.06)
    place(out, 0, g, 0.7)
    bark(out, 0.45, 1.0, 0.17); bark(out, 0.68, 1.12, 0.12)
    return verb(out, 0.5, 0.15, 6000)[:len(out)]

def clang():  # parering: stål mot stål, lång ringning
    d = 0.8; t = tt(d)
    y = anvil(1700, d, 1.0) + anvil(2330, d, 0.5)
    for f, a, dec in ((3110, 0.35, 4), (4870, 0.25, 6), (6420, 0.12, 8)):
        y += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t * dec) * (1 + 0.2 * np.sin(2 * np.pi * 9 * t))
    y += fftfilt(noise(d), 1000, 9000) * np.exp(-t * 120)
    return cut(verb(y, 0.8, 0.2, 8000), 0.8, 0.3)

def snicker():  # tjuven fnissar: "heh-heh-heh" med luft och näsklang
    out = np.zeros(int(0.85 * SR))
    for i, (t0, f) in enumerate(((0, 262), (0.115, 250), (0.225, 240), (0.335, 228), (0.465, 214))):
        dd = 0.085 + 0.01 * i; t = tt(dd)
        f0 = np.interp(t, [0, dd], [f * 1.05, f * 0.9])
        v = nrm(voice(f0, [(520, 80, 1), (1750, 140, 0.6), (2550, 200, 0.3)], 6000, jitter=0.01, roll=0.6))
        h = nrm(reson(noise(dd), [(1750, 300, 1), (2600, 400, 0.6), (600, 200, 0.4)]))
        s = h * np.exp(-t * 60) * 0.8 + v * np.clip((t - 0.012) / 0.01, 0, 1) * np.exp(-t * 22) * 0.7 + h * 0.2 * np.exp(-t * 18)
        place(out, t0, s * env(len(t), 0.003, 0.02) * (1 - 0.12 * i))
    return verb(out, 0.5, 0.15, 6000)[:len(out)]

def doppel():  # dubbelgångaren: viskning med ringmodulation, en lägre skugga och studsande ekon
    w = whisper('vox_d', 0.2, 1.3); d = len(w) / SR; t = np.arange(len(w)) / SR
    ring = w * np.sin(2 * np.pi * (70 + 30 * np.sin(2 * np.pi * 0.7 * t)) * t)
    low = np.interp(np.arange(0, len(w), 0.78), np.arange(len(w)), w)[:len(w)]
    y = np.tanh(2 * nrm(w + ring * 0.6 + low * 0.5))
    out = np.zeros(int((d + 0.7) * SR))
    for dl, g in ((0, 1), (0.11, 0.55), (0.23, 0.35), (0.37, 0.22), (0.52, 0.12)):
        place(out, dl, fftfilt(y, 300, 7000 - dl * 8000) if dl else y, g)
    return cut(verb(out, 1.4, 0.35, 5000), 1.6, 0.4)

def grind():  # stenlocket glider: stick-slip-skrap, mullret och ett dovt stopp
    d = 1.6; t = tt(d)
    sl = np.clip(lpnoise(d, 18) * 1.5 + 0.5, 0, 1)
    g = nrm(fftfilt(noise(d), 60, 900) * (0.4 + 0.6 * sl))
    g += nrm(reson(noise(d), [(180, 40, 1), (310, 60, 0.6), (520, 90, 0.4), (1200, 200, 0.2)])) * 0.5 * (0.5 + 0.5 * sl)
    a = np.interp(t, [0, 0.2, 1.15, 1.32, d], [0.2, 1, 0.9, 0.35, 0])
    y = g * a + debris(d, 30, 800, 4000, d * 0.9) * 0.2 + low_rumble(d) * 0.3 * a
    place(y, 1.3, thud(40, d - 1.3, 0.3), 0.8)
    return y * env(len(t), 0.05, 0.05)

def boulder(d=2.6, per=0.5):  # rullande stenblock: periodiskt mullrande (helt antal varv per 2 s), grus
    t = tt(d); rot = 0.7 + 0.3 * np.cos(2 * np.pi * t / per)
    y = nrm(fftfilt(noise(d), 25, 220) * rot) + 0.4 * np.sin(2 * np.pi * 34 * t) * rot
    y += grains(d, int(d * 260), 500, 3000, 0.02) * 4 * rot
    for k in range(int(d / per) + 1): place(y, k * per + 0.05, drum(36, 0.45, 0.6, 0.3, dec=8))
    return y

def crash():  # stenblocket krossas
    d = 1.7; t = tt(d)
    y = np.sin(phase(38 * (1 + 2 * np.exp(-t * 12)))) * np.exp(-t * 2.8)
    y += fftfilt(noise(d), 30, 900) * np.exp(-t * 3) * 0.8 + fftfilt(noise(d), 900, 5000) * np.exp(-t * 12) * 0.4
    y += debris(d, 80, 400, 4000, d * 0.7) * 0.7
    return fade_tail(y * env(len(t), 0.002, 0.1), 0.5)

def quicksand():  # sugande sand: fallande sug, gluckande bubblor som dras ned, rinnande korn
    d = 1.4; t = tt(d); y = np.zeros(len(t))
    s = nrm(svf(noise(d), 900 * 0.2 ** (t / d), 4.0)) * env(len(t), 0.2, 0.3) * 0.6
    for _ in range(9):
        t0 = rng.uniform(0, d - 0.25); f0 = rng.uniform(90, 200); dd = rng.uniform(0.1, 0.2); tb = tt(dd)
        place(y, t0, np.sin(phase(f0 * (1.4 - 0.8 * tb / dd))) * np.sin(np.pi * tb / dd) ** 0.7, rng.uniform(0.4, 1))
    sand = fftfilt(noise(d), 2500, 9000) * (0.5 + 0.5 * lpnoise(d, 6)) * 0.1 + grains(d, 400, 2000, 8000, 0.003) * 0.8
    return fade_tail(y + s + sand, 0.3)

def sandhiss(d=4.8):  # sandstorm: vindbyar, sandkorn som piskar, lågt dån
    gust = 0.55 + 0.45 * lpnoise(d, 0.6)
    h = nrm(fftfilt(noise(d), 2500, 11000)) * gust
    gr = nrm(grains(d, int(d * 2500), 3000, 10000, 0.002)) * (0.4 + 0.6 * gust)
    lo = nrm(fftfilt(noise(d), 120, 700)) * (0.5 + 0.5 * lpnoise(d, 0.4))
    return h * 0.45 + gr * 0.45 + lo * 0.7

def handbell():  # larmklocka: liten bronsklocka som ringer i snabb takt
    d = 2.2; y = np.zeros(int(d * SR)); f = 1180
    for i in range(14):
        tb = tt(1.2); s = np.zeros_like(tb); sc = 1 + 0.004 * (i % 2)
        for r, a, dec in ((1, 1, 2.5), (2.0, 0.5, 3.5), (2.66, 0.45, 4), (3.97, 0.3, 6), (5.4, 0.18, 8), (0.56, 0.25, 2)):
            s += a * np.exp(-tb * dec) * np.sin(2 * np.pi * f * sc * r * tb + rng.uniform(0, 6))
        s += fftfilt(noise(1.2), 3000, 10000) * np.exp(-tb * 200) * 0.5
        place(y, i * 0.125 + rng.uniform(-0.006, 0.006), s * env(len(tb), 0.0008, 0.05), 0.9 if i % 2 == 0 else 0.7)
    return fade_tail(verb(y, 1.2, 0.2, 7000)[:len(y)], 0.45)

def chime():  # mjuk notis för ett funnet blad
    y = np.zeros(int(0.95 * SR))
    place(y, 0, ping(m2f(86), 0.9, 0.55, 4)); place(y, 0.09, ping(m2f(93), 0.85, 0.45, 4)); place(y, 0.09, bar(m2f(98), 0.5, 0.05, dec=5))
    return cut(verb(y, 0.9, 0.3, 7000), 0.95, 0.3)

def hum(d, f=110, g=1.0):  # varmt brum (lampans glöd)
    t = tt(d); y = sum(np.sin(2 * np.pi * f * k * t + rng.uniform(0, 6)) / k ** 1.3 for k in range(1, 10))
    return nrm(fftfilt(y, 80, 2500)) * (0.85 + 0.15 * lpnoise(d, 12)) * g

def lamp_on():  # klick, lågan tar sig (fwoomp) och ett glödande brum sväller
    d = 0.9; t = tt(d); y = np.zeros(len(t))
    place(y, 0, tick(0.03, 0.5, 1500, 8000, 160))
    w = svf(noise(0.35), 250 + 900 * np.exp(-tt(0.35) * 8), 1.5) * np.sin(np.pi * np.clip(tt(0.35) / 0.35, 0, 1)) ** 1.5
    place(y, 0.03, nrm(w), 0.6)
    y += hum(d, 110, 0.9) * np.clip((t - 0.04) / 0.2, 0, 1) ** 2
    return y * env(len(t), 0.001, 0.25)

def lamp_off():  # klick och brummet faller bort
    d = 0.4; t = tt(d); y = np.zeros(len(t))
    place(y, 0, tick(0.03, 1.0, 1200, 7000, 160))
    f = 110 * (1 - 0.4 * t / d); h = sum(np.sin(k * phase(f)) / k ** 1.3 for k in range(1, 8))
    y += nrm(fftfilt(h, 80, 2000)) * 0.4 * np.exp(-t * 9)
    w = svf(noise(d), 600 * np.exp(-t * 4) + 150, 1.5); y += nrm(w) * 0.2 * np.exp(-t * 10)
    return y * env(len(t), 0.001, 0.08)

def flicker():  # lampan fladdrar: brum som slås av och på
    d = 0.4; t = tt(d)
    b = nrm(fftfilt(np.tanh(3 * sawp(2 * np.pi * 120 * t, 6000, 120)), 100, 6000))
    gate = np.zeros(len(t))
    for a0, a1 in ((0.0, 0.05), (0.085, 0.13), (0.16, 0.18), (0.22, 0.34)): gate[int(a0 * SR):int(a1 * SR)] = 1
    gate = np.convolve(gate, np.ones(60) / 60, 'same')
    y = b * gate * 0.6 + hum(d, 110, 0.4) * gate
    sparks(y, d, 25, 1.0, 0.8)
    return y * env(len(t), 0.002, 0.04)

def clack():  # sten mot sten med två studsar
    y = np.zeros(int(0.35 * SR))
    for t0, g in ((0, 1.0), (0.095, 0.45), (0.16, 0.2), (0.2, 0.08)):
        k = tt(0.06); c = nrm(reson(noise(0.06), [(2100, 120, 1), (3450, 180, 0.7), (5200, 250, 0.4), (900, 100, 0.3)])) * np.exp(-k * 110)
        place(y, t0, c, g)
    return y

def alert():  # upptäckt: skarp mässingsstöt + klocka (ett "!")
    d = 0.8; y = np.zeros(int(d * SR))
    place(y, 0, brass([74, 80, 86], 0.35, att=0.004, rel=0.15, drive=3.0, swell=0.02, hi_fc=3500), 0.8)
    place(y, 0, bell(86, 0.8, 0.5)); place(y, 0, anvil(2400, 0.5, 0.35))
    return cut(verb(y, 0.9, 0.3, 6000), 0.8, 0.3)

def hmq():  # misstänksamt "hm?": nasalt nynnande som stiger
    d = 0.6; t = tt(d)
    f0 = np.interp(t, [0, 0.25, 0.5, d], [165, 158, 228, 240])
    v = nrm(voice(f0, MM, 4000, jitter=0.004, roll=0.9)) * env(len(t), 0.05, 0.15)
    v += np.sin(phase(f0 * 2)) * 0.15 * env(len(t), 0.1, 0.2)
    return cut(verb(v, 0.6, 0.2, 5000), 0.7, 0.2)

def haggle():  # köpmannens "hmm... hm": tänker efter
    y = np.zeros(int(0.95 * SR))
    for t0, dd, k in ((0.0, 0.42, [138, 145, 128]), (0.5, 0.33, [122, 150, 158])):
        t = tt(dd); f0 = np.interp(t, [0, dd * 0.4, dd], k)
        v = nrm(voice(f0, MM, 4000, jitter=0.008, roll=0.8)) * env(len(t), 0.05, 0.12)
        place(y, t0, v)
    place(y, 0, fftfilt(noise(0.08), 400, 3000) * np.exp(-tt(0.08) * 40), 0.15)
    return verb(y, 0.5, 0.15, 5000)[:len(y)]

def stab():  # dovt stick (smygdödande)
    d = 0.5; t = tt(d)
    y = thud(70, d, 0.0) * 0.8 + nrm(reson(noise(d), [(400, 120, 1), (900, 200, 0.5)])) * np.exp(-t * 18) * 0.5
    return fftfilt(y, 40, 1800) * env(len(t), 0.002, 0.08)

def wheel():  # lyckohjulet: spärren klickar allt glesare, ett sista klick som studsar tillbaka
    d = 2.3; y = np.zeros(int(d * SR)); t = 0.0; rate = 20.0; last = 0.0
    while t < 2.0:
        k = tt(0.03); c = nrm(reson(noise(0.03), [(1900, 150, 1), (3300, 250, 0.6), (5200, 400, 0.3), (800, 100, 0.3)])) * np.exp(-k * 180)
        place(y, t, c, 0.6 + 0.4 * rate / 20); last = t
        t += 1 / rate; rate = max(4.5, rate * 0.95)
    place(y, last + 0.07, clack()[:int(0.04 * SR)], 0.2)
    tl = tt(d); whir = nrm(fftfilt(noise(d), 300, 1500)) * 0.12 * np.clip(1 - tl / 2.0, 0, 1) ** 1.5
    return y + whir

def fanfare():  # vinst: snabbt mässingsarpeggio i D-dur + glitter
    d = 1.7; y = np.zeros(int(d * SR))
    for i, n in enumerate((62, 66, 69)): place(y, 0.09 * i, brass([n, n + 12], 0.16, att=0.005, rel=0.06, drive=2.2, swell=0.05, hi_fc=3200), 0.5)
    place(y, 0.27, brass([62, 66, 69, 74], 1.1, att=0.01, rel=0.5, drive=2.0, swell=0.2, hi_fc=3000), 0.7)
    for i, n in enumerate((86, 90, 93, 98, 102)): place(y, 0.27 + 0.05 * i, bar(m2f(n), 1.0, 0.2, dec=3))
    return cut(verb(y, 1.2, 0.3, 6000), 1.7, 0.4)

def sad():  # förlust: mörkt fallande glid under sitarn
    d = 1.6; t = tt(d); f = 147 * 0.5 ** (t / d)
    y = nrm(fftfilt(sawp(phase(f * (1 + 0.01 * np.sin(2 * np.pi * 5 * t))), 2000, 150), 40, 800))
    return y * env(len(t), 0.15, 0.5) * 0.6

def wanderer():  # vandraren: nynnande kör, mumlande baklängesröst, glas
    d = 2.3; y = np.zeros(int(d * SR))
    place(y, 0, choir([50, 57, 63], d, 0.5, 0.7, 1.0, vib=4.5, F=MM, hmax=3000))
    x = rd('vox_d')[::-1][int(0.5 * SR):int(0.5 * SR) + int(1.8 * SR)]
    place(y, 0.25, nrm(fftfilt(x, 80, 750)) * env(int(1.8 * SR), 0.3, 0.5), 0.35)
    for t0, n in ((0.3, 81), (0.9, 86), (1.5, 82)): place(y, t0, glass(n, 0.9, 0.15, att=0.1, rel=0.6))
    return cut(verb(y, 2.0, 0.4, 4000), 2.3, 0.6)

def mastery():  # mästerskap: stigande klockspelsarpeggio + ljust pling
    d = 1.35; y = np.zeros(int(d * SR))
    for i, n in enumerate((74, 78, 81, 86, 90, 93, 98)): place(y, 0.055 * i, bar(m2f(n), d - 0.055 * i, 0.4, dec=3))
    place(y, 0.4, ping(m2f(98), 0.9, 0.4, 3)); place(y, 0.4, ping(m2f(105), 0.9, 0.2, 4))
    y += fftfilt(noise(d), 6000, 11000) * np.exp(-tt(d) * 5) * 0.04 * np.clip(tt(d) / 0.4, 0, 1)
    return cut(verb(y, 1.2, 0.35, 9000), d, 0.35)

def pharaoh():  # faraons vrål: djup röst med undertonsoktav, rå grovhet, kunglig mässing och subbas
    d = 2.3; t = tt(d)
    f0 = np.interp(t, [0, 0.2, 0.9, 1.6, d], [55, 78, 72, 60, 48])
    F1 = np.interp(t, [0, 0.3, 1.5, d], [500, 720, 650, 450]); F2 = np.interp(t, [0, 0.3, 1.5, d], [850, 1150, 1000, 800])
    F = [(F1, 110, 1.0), (F2, 140, 0.6), (2400, 250, 0.25), (3300, 350, 0.1)]
    v = nrm(voice(f0, F, 5000, jitter=0.025, roll=0.45)); sub = nrm(voice(f0 / 2, F, 2500, jitter=0.025, roll=0.6))
    rough = 0.6 + 0.4 * np.sin(phase(28 + 6 * lpnoise(d, 5)))
    y = np.tanh(2.8 * (v + 0.5 * sub) * rough)
    y += nrm(svf(noise(d), F2, 1.5)) * 0.25 * rough
    y *= env(len(t), 0.12, 0.6)
    y += brass([38, 45, 50], d, att=0.4, rel=0.7, drive=3.0, swell=1.0, lo_fc=300, hi_fc=1400) * 0.45
    y += np.sin(2 * np.pi * m2f(26) * t) * env(len(t), 0.2, 0.8) * 0.4
    return cut(verb(y, 2.5, 0.45, 3500), 2.3, 0.6)

def beam():  # gyllene stråle: ljust skimrande ackord, brummande kärna, sus och glitter
    d = 1.6; t = tt(d); y = np.zeros(len(t))
    for n in (74, 78, 81, 85, 90, 93):
        for det in (-0.003, 0.003): y += np.sin(2 * np.pi * m2f(n) * (1 + det) * t + rng.uniform(0, 6))
    y = nrm(y) * (0.75 + 0.25 * np.sin(2 * np.pi * 11 * t))
    core = nrm(fftfilt(sawp(2 * np.pi * 110 * t, 3000, 110), 80, 1500)) * (0.8 + 0.2 * np.sin(2 * np.pi * 7 * t))
    sw = nrm(fftfilt(noise(d), 4000, 12000)) * (0.6 + 0.4 * lpnoise(d, 15))
    gl = np.zeros(len(t))
    for _ in range(30): place(gl, rng.uniform(0, d - 0.3), bar(m2f(rng.choice([93, 97, 98, 102, 105])), 0.3, 0.1, dec=8))
    y = (y * 0.5 + core * 0.35 + sw * 0.12 + gl) * env(len(t), 0.12, 0.35)
    return verb(y, 1.2, 0.3, 9000)[:len(t)]

def tornado(d=2.5):  # virvelvind: svepande sus (perioder som går jämnt upp i 2 s), vinande ton, dån
    t = tt(d)
    fc = 650 * 2 ** (0.9 * np.sin(2 * np.pi * 1.0 * t))
    w = nrm(svf(noise(d), fc, 1.4))
    wh = nrm(svf(noise(d), 1150 * 2 ** (0.5 * np.sin(2 * np.pi * 0.5 * t + 1)), 14.0))
    lo = nrm(fftfilt(noise(d), 40, 300))
    return (w * 0.7 + wh * 0.25 + lo * 0.5) * (0.8 + 0.2 * np.sin(2 * np.pi * 2 * t))

def curse():  # förbannelsen vänds: baklänges sus in i en vriden, fallande ton
    d = 1.0; y = np.zeros(int(d * SR))
    sw = heavy_swish(0.6, 0.25)[::-1]; place(y, 0, nrm(sw), 0.7)
    place(y, 0.05, bell(81, 0.55, 0.3)[::-1])
    dd = 0.45; t = tt(dd); u = t / dd
    f = 560 * 0.35 ** u * (1 + 0.06 * np.sin(phase(6 + 12 * u)))
    tone = nrm(fftfilt(sawp(phase(f), 4000, 560), 80, 2500)) * np.sin(np.pi * np.clip(u / 0.15, 0, 0.5)) * (1 - u) ** 1.2
    place(y, 0.55, tone, 0.6)
    return cut(verb(y, 1.0, 0.35, 5000), d, 0.25)

def ctick():  # labyrintens klocka: torrt tick
    d = 0.25; t = tt(d)
    y = nrm(reson(noise(d), [(2500, 100, 1), (4100, 150, 0.6), (1250, 80, 0.5)])) * np.exp(-t * 70)
    y += np.sin(2 * np.pi * 180 * t) * np.exp(-t * 60) * 0.3
    return y * env(len(t), 0.0005, 0.05)

fx = dict(knife_whoosh=knife_whoosh, knife_thrum=knife_thrum, knife_ting=knife_ting, knife_pick=knife_pick,
          heavy_swish=heavy_swish, thud=thud, strain=strain, slam=slam, musket=musket, ramrod=ramrod, groan=groan,
          flap=flap, scarab=chitter, swarm=swarm, jackal=jackal, clang=clang, snicker=snicker, doppel=doppel,
          grind=grind, boulder=boulder, crash=crash, quicksand=quicksand, sandhiss=sandhiss, handbell=handbell,
          chime=chime, lamp_on=lamp_on, lamp_off=lamp_off, flicker=flicker, clack=clack, alert=alert, hmq=hmq,
          haggle=haggle, stab=stab, wheel=wheel, fanfare=fanfare, sad=sad, wanderer=wanderer, mastery=mastery,
          pharaoh=pharaoh, beam=beam, tornado=tornado, curse=curse, tick=ctick)
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

# ---- instrument från Mellanöstern ----
def oud(n, d=1.4, g=1.0, bright=1.0):  # luta utan band: två strängar per kör, plektrumknäpp, kroppsresonans
    f = m2f(n); t = tt(d); y = np.zeros_like(t)
    for det in (-0.0012, 0.0012):
        for k in range(1, 20):
            if f * k > 7000: break
            a = (1 / k ** bright) * (abs(np.sin(np.pi * k / 7)) + 0.05) * (1 + 0.8 / (1 + ((f * k - 450) / 250) ** 2))
            y += a * np.exp(-t * (2.0 + 1.1 * k)) * np.sin(2 * np.pi * f * k * (1 + det) * t * (1 + 0.0003 * k * k) + rng.uniform(0, 6))
    k = int(0.015 * SR); y[:k] += fftfilt(noise(0.015), 1500, 6000)[:k] * np.exp(-np.arange(k) / k * 6) * 0.4 * np.abs(y).max()
    return y * env(len(t), 0.002, 0.08) * g / 2

def ney(notes, g=1.0, glide=0.07, breath=0.4):
    """ney (rörflöjt): en legatofras [(t0, midi, d)] i sekunder med glidningar, fördröjt vibrato och mycket luft"""
    end = max(t0 + d for t0, _, d in notes) + 0.3; t = tt(end); N = len(t)
    f0 = np.full(N, m2f(notes[0][1])); amp = np.zeros(N); since = np.zeros(N)
    for t0, n, d in notes:
        i0 = int(t0 * SR); i1 = min(N, int((t0 + d) * SR) + int(0.05 * SR))
        f0[i0:] = m2f(n); since[i0:] = t[i0:] - t0
        amp[i0:i1] = np.maximum(amp[i0:i1], env(i1 - i0, 0.07, 0.14))
    k = max(1, int(glide * SR)); f0 = np.convolve(np.concatenate([np.full(k, f0[0]), f0, np.full(k, f0[-1])]), np.ones(k) / k, 'same')[k:-k]
    vib = 1 + 0.007 * np.clip((since - 0.3) / 0.4, 0, 1) * np.sin(2 * np.pi * 5.2 * t)
    ph = phase(f0 * vib)
    tone = np.sin(ph) + 0.22 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph) + 0.03 * np.sin(4 * ph)
    br = nrm(fftfilt(noise(end), 500, 4500)) * 0.6 + nrm(fftfilt(noise(end), 3000, 9000)) * 0.15
    chiff = np.exp(-np.minimum(since, 1) * 18)
    y = tone * (0.9 + 0.1 * lpnoise(end, 8)) + br * (breath + 0.6 * chiff) * 1.2
    return fftfilt(y * amp, 150, 7000) * g

def dum(g=1.0, f=95):  # darbuka, låg ton
    d = 0.5; t = tt(d)
    y = np.sin(phase(f * (1 + 0.5 * np.exp(-t * 40)))) * np.exp(-t * 9) + 0.3 * np.sin(phase(2.3 * f * (1 + 0.3 * np.exp(-t * 40)))) * np.exp(-t * 14)
    y += fftfilt(noise(d), 100, 1500) * np.exp(-t * 45) * 0.3
    return y * env(len(t), 0.001, 0.05) * g

def tek(g=1.0):  # darbuka, kantslag
    d = 0.18; t = tt(d)
    y = fftfilt(noise(d), 1800, 9000) * np.exp(-t * 90) + 0.35 * (np.sin(2 * np.pi * 680 * t) * np.exp(-t * 30) + 0.6 * np.sin(2 * np.pi * 1450 * t) * np.exp(-t * 40))
    return y * env(len(t), 0.0005, 0.02) * g

def ka(g=1.0):  # darbuka, svagt slag med andra handen
    d = 0.1; t = tt(d); return fftfilt(noise(d), 1200, 6000) * np.exp(-t * 120) * 0.7 * env(len(t), 0.0005, 0.02) * g

def riq(g=1.0):  # tamburin med cymbaler
    d = 0.25; t = tt(d); y = np.zeros_like(t)
    for f, dec in ((5200, 25), (6900, 28), (8100, 32), (9400, 36)): y += np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t * dec)
    y = y * (0.6 + 0.4 * np.abs(fftfilt(noise(d), 0, 300)) / 0.1) * 0.2 + fftfilt(noise(d), 5000, 11000) * np.exp(-t * 30)
    return y * env(len(t), 0.001, 0.03) * g

def bendir(g=1.0):  # ramtrumma med surrsträng
    d = 0.9; t = tt(d)
    return drum(68, d, 1.0, 0.25, dec=5) * g + fftfilt(noise(d), 1800, 6000) * np.exp(-t * 12) * 0.12 * g

def zill(g=1.0, f=2600):  # fingercymbaler
    d = 2.0; t = tt(d); y = np.zeros_like(t)
    for r, a, dec in ((1, 1, 2.2), (1.58, 0.6, 3), (2.27, 0.4, 4), (3.04, 0.2, 5.5)):
        y += a * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6)) * np.exp(-t * dec)
    return y * env(len(t), 0.0008, 0.3) * g

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

def mbox(n, d=2.5, g=1.0):  # ostämd speldosa: två lätt isärdragna klockspel som svävar
    return (bar(m2f(n) * 1.004, d, 1.0, dec=1.6) + bar(m2f(n) * 0.997, d, 0.6, dec=1.8)) * g

def clock(g=1.0, tock=False):  # urverkets tick/tack
    d = 0.12; t = tt(d); s = 0.78 if tock else 1.0
    y = nrm(reson(noise(d), [(2500 * s, 100, 1), (4100 * s, 150, 0.6), (1250 * s, 80, 0.5)])) * np.exp(-t * 80)
    return y * env(len(t), 0.0005, 0.02) * g

# Hijaz på D: D Eb F# G A Bb C
# ---- tomb: D-hijaz, 80 bpm, 12 takter = 36 s: drönare, ramtrumma, oud, ney, nynnande kör, fingercymbaler ----
def tomb():
    b = 0.75; T = 48 * b; base = Loop(T); hi = Loop(T)
    base.add(0, base.drone(38, 0.5, h=10, roll=1.3, cyc=3, hi=900) + base.drone(45, 0.22, h=8, roll=1.5, cyc=4, hi=900) + base.drone(26, 0.3, h=6, roll=1.6, cyc=2, hi=300))
    base.add(0, base.bed(400, 2500, 0.025, cyc=5))  # dammig luft
    sec = [(0, 4, 'D'), (4, 2, 'C'), (6, 2, 'D'), (8, 2, 'G'), (10, 2, 'D')]  # (takt, längd, ackord)
    chord = {'D': [50, 57, 62], 'C': [48, 55, 63], 'G': [43, 50, 58]}
    riff = {'D': [(0, 50), (0.5, 50), (1.5, 57), (2, 51), (2.5, 50), (3, 54)],
            'C': [(0, 48), (1.5, 55), (2, 51), (3, 50)],
            'G': [(0, 43), (1.5, 50), (2, 46), (2.5, 45), (3, 43)]}
    osti = {'D': [50, 62, 51, 50, 54, 55, 57, 55], 'C': [48, 60, 50, 48, 51, 55, 51, 50], 'G': [43, 55, 46, 45, 43, 50, 46, 45]}
    for b0, nb, c in sec:
        base.add(b0 * 4 * b - 0.6, choir(chord[c], nb * 4 * b + 1.8, 1.6, 1.8, 0.3, vib=4.0, F=MM, hmax=3000), 0)
        for j in range(nb):
            t1 = (b0 + j) * 4 * b
            for tb, n in riff[c]: base.add(t1 + tb * b, oud(n, 1.4, 0.6 if tb == 0 else 0.42), -0.3)
            for tb, s, gg in ((0, bendir, 0.9), (1.5, tek, 0.25), (2, bendir, 0.55), (3, ka, 0.2), (3.5, ka, 0.15)):
                base.add(t1 + tb * b, s(gg), 0.15)
            # intensitetslager: maqsum på darbuka med spökslag, riq, oud-ostinato i åttondelar, låg trumma
            bar_i = b0 + j
            for k8 in range(8):
                tb = k8 / 2
                hi.add(t1 + tb * b, oud(osti[c][k8], 0.9, 0.3 if k8 % 2 == 0 else 0.22, 1.2), 0.35)
                hi.add(t1 + tb * b, riq(0.2 if k8 % 2 else 0.11), -0.45)
            for tb, s, gg in ((0, dum, 1.0), (0.5, tek, 0.55), (1.5, tek, 0.5), (2, dum, 0.85), (3, tek, 0.55)):
                hi.add(t1 + tb * b, s(gg), -0.1)
            for tb in (0.25, 1.0, 1.25, 2.5, 2.75, 3.5, 3.75): hi.add(t1 + tb * b, ka(0.25), -0.1)
            if bar_i % 4 == 3:
                for k in range(8): hi.add(t1 + 2 * b + k * b / 4, tek(0.25 + 0.06 * k), -0.1)
            for tb in (0, 2): hi.add(t1 + tb * b, drum(48, 0.9, 0.5, 0.1, dec=5), 0)
    for t0 in (0, 24, 36): base.add(t0 * b, zill(0.12), 0.5)
    phr = [[(4, 69, 3), (7, 70, 0.5), (7.5, 69, 0.5), (8, 67, 1), (9, 66, 1), (10, 67, 1.5), (11.5, 66, 0.5), (12, 63, 1), (13, 62, 2.5)],
           [(18, 67, 1), (19, 70, 1), (20, 72, 2), (22, 70, 0.5), (22.5, 72, 0.5), (23, 75, 2), (25, 74, 1), (26, 72, 0.5), (26.5, 70, 0.5), (27, 69, 3)],
           [(33, 74, 1.5), (34.5, 75, 0.5), (35, 74, 1), (36, 72, 1), (37, 70, 2), (39, 69, 1), (40, 67, 0.5), (40.5, 66, 0.5), (41, 63, 1), (42, 62, 3.5)]]
    for p in phr:
        s0 = p[0][0]
        base.add(s0 * b, ney([((t0 - s0) * b, n, d * b) for t0, n, d in p], 0.32), 0.2)
    base.reverb(3.5, 0.4, 3500); hi.reverb(2.0, 0.2, 4500)
    base.write('tomb'); hi.write('tomb_hi')

# ---- boss4: D-hijaz (D Eb Cm D), 150 bpm, 16 takter = 25,6 s: darbuka, taiko, distbas, stråkostinato, mässing, kör ----
def boss4():
    b = 0.4; T = 64 * b; L = Loop(T)
    prog = [(38, [62, 66, 69], 'D'), (39, [63, 67, 70], 'E'), (36, [60, 63, 67], 'C'), (38, [62, 66, 69], 'D')]
    mel = [(0, 62, 1.5), (1.5, 63, 0.5), (2, 66, 2), (4, 67, 1), (5, 66, 1), (6, 63, 2),
           (8, 67, 1.5), (9.5, 70, 0.5), (10, 67, 1), (11, 66, 1), (12, 63, 4),
           (16, 72, 1.5), (17.5, 70, 0.5), (18, 67, 2), (20, 70, 1), (21, 72, 1), (22, 75, 2),
           (24, 74, 3), (27, 72, 0.5), (27.5, 70, 0.5), (28, 69, 1), (29, 67, 0.5), (29.5, 66, 0.5), (30, 63, 1), (31, 62, 1)]
    for half in range(2):
        h0 = half * 32 * b
        for i, (r, ch, c) in enumerate(prog):
            t0 = h0 + i * 8 * b
            turn = [0, 1, 0, 4, 0, 1, 0, 7] if c == 'D' else [0, 0, 12, 0, 7, 0, 12, 7]
            for k in range(32):  # stråkostinato i sextondelar
                n = r + 24 + turn[k % 8]
                tm = tt(b / 4 * 0.85); s = fftfilt(sawp(2 * np.pi * m2f(n) * tm, 5000, m2f(n)), 60, 1800) * env(len(tm), 0.003, 0.03)
                L.add(t0 + k * b / 4, s, -0.3, 0.13 if k % 4 else 0.2)
            for bar_ in range(2):
                t1 = t0 + bar_ * 4 * b
                for tb in (0, 2): L.add(t1 + tb * b, drum(42, 1.2, 1.0, 0.5, dec=4.5), 0)
                L.add(t1 + 3.5 * b, drum(50, 0.8, 0.5, 0.4, dec=7), 0.1)
                for k8 in range(8):
                    L.add(t1 + k8 * b / 2, dbass(r + 12 + [0, 0, 12, 0, 7, 0, 12, 0][k8], b / 2 * 0.9, drive=2.6), 0, 0.5 if k8 in (0, 3, 6) else 0.34)
                    L.add(t1 + k8 * b / 2, riq(0.2 if k8 % 2 else 0.12), 0.45)
                for tb, s, gg in ((0, dum, 1.0), (0.5, tek, 0.6), (1.5, tek, 0.55), (2, dum, 0.9), (3, tek, 0.6)):
                    L.add(t1 + tb * b, s(gg * 0.8), -0.15)
                for tb in (0.25, 1.0, 1.25, 2.5, 2.75, 3.5, 3.75): L.add(t1 + tb * b, ka(0.3 if half else 0.2), -0.15)
            L.add(t0 - 0.05, choir([n - 12 for n in ch], 8 * b + 0.3, 0.25, 0.4, 0.35 if half == 0 else 0.5), 0)
            if half and i % 2 == 0:
                y = choir([ch[0] - 24, ch[0] - 12], 0.3, 0.01, 0.12, 1.0, F=HA, hmax=6000) * np.exp(-tt(0.3) * 6)
                L.add(t0 + 2 * b, y + fftfilt(noise(0.3), 800, 3000) * np.exp(-tt(0.3) * 25) * 0.3, 0.15, 0.5)
        for t0, n, dd in mel:
            L.add(h0 + t0 * b, brass([n] if half == 0 else [n, n - 12], dd * b + 0.1, att=0.02, rel=0.12, drive=2.4, swell=0.2, hi_fc=3000), 0.2, 0.3 if half == 0 else 0.34)
        L.add(h0, crash_cym(0.35), 0.3)
        for k in range(8): L.add(h0 + 30 * b + k * b / 4, tek(0.3 + 0.07 * k), -0.15)
        rs = tt(2 * b); L.add(h0 + 30 * b, svf(noise(2 * b), 400 * 10 ** (rs / (2 * b)), 3) * (rs / (2 * b)) ** 2, 0, 0.12)
    L.add(0, L.drone(26, 0.3, h=8, roll=1.4, cyc=4, hi=300))
    L.reverb(1.8, 0.22, 4500)
    L.write('boss4')

# ---- stealth: d-moll (Dm Bb Gm A), 75 bpm, 8 takter = 25,6 s: låga stråkar, dämpad puls, hjärtslag, pizzicato ----
def stealth():
    b = 0.8; T = 32 * b; L = Loop(T)
    prog = [(38, [50, 53, 57]), (34, [50, 53, 58]), (31, [50, 55, 58]), (33, [49, 52, 57])]
    for i, (r, ch) in enumerate(prog):
        t0 = i * 8 * b
        L.add(t0 - 0.6, strings([r, r + 12], 8 * b + 1.6, att=1.2, rel=1.5, g=0.5, hi=900), -0.15)
        L.add(t0 - 0.6, strings(ch, 8 * b + 1.6, att=2.0, rel=2.0, g=0.16, hi=1800, vib=0.005), 0.25)
        for bar_ in range(2):
            t1 = t0 + bar_ * 4 * b
            for k8 in range(8):
                L.add(t1 + k8 * b / 2, mpulse(50, 0.3, [0.5, 0.2, 0.2, 0.45, 0.2, 0.2, 0.4, 0.2][k8]), 0.1)
                if k8 % 2: L.add(t1 + k8 * b / 2, tick(0.04, 0.03, 6000, 11000, 90), 0.5)
            L.add(t1, drum(48, 0.6, 0.35, 0.05, dec=9), 0); L.add(t1 + 0.3, drum(46, 0.6, 0.22, 0.05, dec=10), 0)
    for t0, n in ((6, 62), (14.5, 65), (22, 67), (30.5, 61)): L.add(t0 * b, pluck(n, 0.8, 1.6, 0.12), -0.4)
    for t0, n in ((12, 81), (28, 88)): L.add(t0 * b, glass(n, 4.0, 0.07, att=1.0, rel=2.0), 0.6)
    L.add(24 * b, strings([61, 64, 69], 8 * b, att=4.0, rel=0.9, g=0.12, hi=3000, vib=0.003, trem=12), 0.3)
    L.add(0, L.drone(26, 0.18, h=6, roll=1.6, cyc=2, hi=200))
    L.reverb(3.0, 0.35, 3000)
    L.write('stealth')

# ---- labyrinth: heltonsskala på C#, 60 bpm, 32 slag = 32 s: tick-tack, ett urverk i 3 mot 4, speldosa, glas, tritonusdrönare ----
def labyrinth():
    b = 1.0; T = 32 * b; L = Loop(T)
    for k in range(32): L.add(k * b, clock(0.9 if k % 2 == 0 else 0.75, k % 2 == 1), -0.2 if k % 2 == 0 else 0.2)
    for k in range(24): L.add(k * 4 / 3 * b + 0.05, clock(0.22, False)[::2], 0.6)
    L.add(0, L.drone(37, 0.3, h=6, roll=1.5, cyc=2, hi=500) + L.drone(43, 0.18, h=6, roll=1.6, cyc=3, hi=500, det=0.004))
    L.add(0, L.bed(200, 1200, 0.02, cyc=3))
    mel = [(0, 85), (2, 83), (3, 81), (6, 79), (8, 85), (10, 87), (11, 83), (14, 81),
           (16, 85), (18, 83), (19, 81), (22, 77), (24, 79), (26, 81), (27, 79), (30, 73)]
    for i, (t0, n) in enumerate(mel): L.add(t0 * b, mbox(n, 2.5, 0.22), 0.35 if i % 2 else -0.35)
    for i, ch in enumerate([[61, 65, 69], [63, 67, 71], [61, 65, 69], [59, 63, 67]]):
        for j, n in enumerate(ch): L.add(i * 8 * b - 1.0 + 0.2 * j, glass(n, 8 * b + 2.5, 0.12, att=2.0, rel=2.5, trem=3 + 0.5 * j, det=0.003), -0.5 + 0.5 * j)
    for t0 in (0, 16): L.add(t0 * b, bell(37, 8.0, 0.2), 0)
    for t0 in (16, 32): L.add(t0 * b - 1.5, glass(73, 1.5, 0.12, att=0.05, rel=0.05)[::-1], 0)
    L.reverb(4.0, 0.45, 3500, 0.03)
    L.write('labyrinth')

tomb(); boss4(); stealth(); labyrinth()
PY
python3 -I "$T/synth5.py" "$T"

# ---------- musik ----------
mus tomb -20 anull "$T/tomb.wav"
mus tomb_hi -23 anull "$T/tomb_hi.wav"
mus boss4 -19 anull "$T/boss4.wav"
mus stealth -20 anull "$T/stealth.wav"
mus labyrinth -20 anull "$T/labyrinth.wav"

# ---------- ljudeffekter ----------
# kastkniven
fx knife_throw "[0:a]$P[a];[1:a]$P,asetrate=55125,aresample=44100,highpass=f=500,volume=0.45[b];[a][b]$(mix 2),atrim=0:0.45,afade=t=out:st=0.3:d=0.15[o]" "$T/s_knife_whoosh.wav" "$S/Other/whoosh_1.wav"
fx knife_hit "[0:a]$P[a];[1:a]$P,volume=0.8[b];[2:a]$P,volume=0.6,lowpass=f=1500[c];[3:a]$P,volume=0.4,adelay=10[d];[a][b][c][d]$(mix 4),atrim=0:0.45,afade=t=out:st=0.3:d=0.15[o]" "$S/Materials/cork_stabbed.wav" "$I/impactWood_medium_000.ogg" "$I/impactPunch_medium_002.ogg" "$T/s_knife_thrum.wav"
fx knife_wall "[0:a]$P[a];[1:a]$P,asetrate=55125,aresample=44100,volume=0.55[b];[2:a]$P,highpass=f=800,volume=0.3[c];[a][b][c]$(mix 3),atrim=0:0.55,afade=t=out:st=0.35:d=0.2[o]" "$T/s_knife_ting.wav" "$I/impactMetal_light_003.ogg" "$I/impactGeneric_light_002.ogg"
fx knife_pickup "[0:a]$P,volume=16dB[a];[1:a]$P,volume=0.5,adelay=40[b];[2:a]$P,volume=0.4,highpass=f=500[c];[a][b][c]$(mix 3),atrim=0:0.5,afade=t=out:st=0.35:d=0.15[o]" "$R/drawKnife2.ogg" "$T/s_knife_pick.wav" "$R/handleSmallLeather.ogg"
# stridshammaren
fx hammer_swing "[0:a]$P[a];[1:a]$P,asetrate=30870,aresample=44100,lowpass=f=2500,volume=0.55,adelay=60[b];[a][b]$(mix 2),atrim=0:0.7,afade=t=out:st=0.5:d=0.2[o]" "$T/s_heavy_swish.wav" "$S/Other/whoosh_2.wav"
fx hammer_hit "[0:a]$P[a];[1:a]$P,volume=0.8,lowpass=f=2000[b];[2:a]$P,atrim=0:0.6,volume=0.5[c];[3:a]$P,volume=0.4,adelay=15[d];[a][b][c][d]$(mix 4),atrim=0:0.75,afade=t=out:st=0.5:d=0.25[o]" "$T/s_thud.wav" "$I/impactPunch_heavy_001.ogg" "$S/Combat and Gore/crunch.wav" "$I/impactMining_002.ogg"
fx hammer_charge "[0:a]$P[a];[1:a]$P,volume=0.5[b];[2:a]$P,asetrate=33075,aresample=44100,volume=0.35,adelay=250[c];[a][b][c]$(mix 3),atrim=0:0.95,afade=t=out:st=0.88:d=0.07[o]" "$T/s_strain.wav" "$R/handleSmallLeather2.ogg" "$R/creak2.ogg"
fx hammer_slam "[0:a]$P[a];[1:a]$P,volume=0.8,lowpass=f=1200[b];[2:a]$P,lowpass=f=1500,volume=0.5,adelay=40[c];[3:a]$P,volume=0.45,adelay=30[d];[4:a]$P,volume=0.3,adelay=250[e];[a][b][c][d][e]$(mix 5),atrim=0:1.7,afade=t=out:st=1.2:d=0.5[o]" "$T/s_slam.wav" "$I/impactPunch_heavy_003.ogg" "$S/Materials/stone_push_medium.wav" "$I/impactMining_004.ogg" "$I/impactMining_000.ogg"
# musköten
fx musket_fire "[0:a]$P[a];[1:a]$P,atrim=0:0.15,volume=0.5[b];[2:a]$P,lowpass=f=2500,volume=0.45,adelay=40[c];[3:a]$P,lowpass=f=1200,volume=0.35,adelay=40[d];[a][b][c][d]$(mix 4),atrim=0:1.45,afade=t=out:st=1.0:d=0.45[o]" "$T/s_musket.wav" "$R/metalClick.ogg" "$S/Weapons/shot_muffled.wav" "$S/Retro/explosion_large.wav"
fx musket_reload "[0:a]$P[a];[1:a]$P,atrim=0:0.25,volume=0.45,highpass=f=400[b];[2:a]$P,volume=0.6,adelay=1000[c];[3:a]$P,volume=0.45,adelay=1060[d];[a][b][c][d]$(mix 4),atrim=0:1.25,afade=t=out:st=1.1:d=0.15[o]" "$T/s_ramrod.wav" "$S/Materials/paper_tear_1.wav" "$R/metalClick.ogg" "$R/metalLatch.ogg"
# gravens fiender
fx mummy "[0:a]$P[a];[1:a]$P,volume=0.35,highpass=f=300[b];[2:a]$P,volume=0.3,adelay=300,highpass=f=300[c];[a][b][c]$(mix 3),atrim=0:1.45,afade=t=out:st=1.05:d=0.4[o]" "$T/s_groan.wav" "$R/cloth1.ogg" "$R/cloth4.ogg"
fx bandage "[0:a]$P[a];[1:a]$P,volume=0.7[b];[2:a]$P,volume=0.5,adelay=50[c];[a][b][c]$(mix 3),atrim=0:0.5,afade=t=out:st=0.35:d=0.15[o]" "$T/s_flap.wav" "$R/cloth3.ogg" "$S/Combat and Gore/swipe.wav"
fx scarab "$P" "$T/s_scarab.wav"
TOP=-4 fxloop scarab_swarm 2 0.5 "$P" "$T/s_swarm.wav"
fx jackal "$P" "$T/s_jackal.wav"
fx parry "[0:a]$P[a];[1:a]$P,volume=0.8[b];[2:a]$P,volume=0.5,adelay=5[c];[a][b][c]$(mix 3),atrim=0:0.8,afade=t=out:st=0.5:d=0.3[o]" "$T/s_clang.wav" "$S/Weapons/sword_clash.wav" "$I/impactMetal_heavy_001.ogg"
fx thief "$P" "$T/s_snicker.wav"
fx steal "[0:a]$P[a];[1:a]$P,volume=0.6,adelay=60[b];[2:a]$P,asetrate=52920,aresample=44100,volume=0.6,adelay=200[c];[a][b][c]$(mix 3),atrim=0:0.7,afade=t=out:st=0.5:d=0.2[o]" "$S/Items/coins_gather_quick.wav" "$R/handleCoins2.ogg" "$S/Other/whoosh_1.wav"
fx doppel "$P" "$T/s_doppel.wav"
# fällor och miljö
fx sarcophagus_open "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,lowpass=f=1800,volume=0.6[b];[2:a]$P,asetrate=29400,aresample=44100,lowpass=f=2000,volume=0.4,adelay=250[c];[3:a]$P,volume=0.5,lowpass=f=900,adelay=1300[d];[a][b][c][d]$(mix 4),atrim=0:1.65,afade=t=out:st=1.35:d=0.3[o]" "$T/s_grind.wav" "$S/Materials/stone_push_long.wav" "$S/Materials/concrete_scrape.wav" "$I/impactPunch_heavy_002.ogg"
TOP=-4 fxloop boulder_roll 2 0.5 "$P" "$T/s_boulder.wav"
fx boulder_crash "[0:a]$P[a];[1:a]$P,volume=0.7,lowpass=f=1500[b];[2:a]$P,volume=0.5,adelay=40[c];[3:a]$P,volume=0.45,adelay=180[d];[4:a]$P,volume=0.4,adelay=60,lowpass=f=2500[e];[a][b][c][d][e]$(mix 5),atrim=0:1.7,afade=t=out:st=1.2:d=0.5[o]" "$T/s_crash.wav" "$I/impactPunch_heavy_000.ogg" "$I/impactMining_001.ogg" "$I/impactMining_003.ogg" "$S/Materials/stone_push_short.wav"
fx quicksand "[0:a]$P[a];[1:a]$P,asetrate=29400,aresample=44100,lowpass=f=1200,volume=0.5[b];[2:a]$P,lowpass=f=1500,volume=0.35,adelay=200[c];[a][b][c]$(mix 3),atrim=0:1.4,afade=t=out:st=1.0:d=0.4[o]" "$T/s_quicksand.wav" "$S/Environment/gurgling.wav" "$S/Combat and Gore/squelching_2.wav"
TOP=-4 fxloop sandstorm 4 0.8 "[0:a]$P[a];[1:a]$P,atrim=1.5:6.3,asetpts=PTS-STARTPTS,highpass=f=150,volume=0.8[b];[a][b]$(mix 2),atrim=0:4.8[o]" "$T/s_sandhiss.wav" "$S/Environment/ambient_wind.wav"
TOP=-4 fxloop tornado 2 0.5 "$P" "$T/s_tornado.wav"
fx alarm_bell "$P" "$T/s_handbell.wav"
fx page_found "[0:a]$P[a];[1:a]$P,volume=0.5,adelay=80[b];[2:a]$P,volume=0.6,adelay=150[c];[a][b][c]$(mix 3),atrim=0:1.1,afade=t=out:st=0.8:d=0.3[o]" "$S/Items/page_turn.wav" "$S/Materials/paper_move.wav" "$T/s_chime.wav"
# smygandet
fx lamp_on "[0:a]$P[a];[1:a]$P,volume=0.3[b];[a][b]$(mix 2),atrim=0:0.9,afade=t=out:st=0.6:d=0.3[o]" "$T/s_lamp_on.wav" "$R/metalLatch.ogg"
TOP=-3 fx lamp_off "[0:a]$P[a];[1:a]$P,atrim=0:0.14,volume=1.5[b];[a][b]$(mix 2),atrim=0:0.4,afade=t=out:st=0.25:d=0.15[o]" "$T/s_lamp_off.wav" "$R/metalClick.ogg"
TOP=-3 fx lamp_flicker "$P" "$T/s_flicker.wav"
fx stone_throw "[0:a]$P[a];[1:a]$P,asetrate=52920,aresample=44100,volume=0.6[b];[a][b]$(mix 2),atrim=0:0.35,afade=t=out:st=0.22:d=0.13[o]" "$S/Combat and Gore/swipe.wav" "$S/Other/whoosh_1.wav"
TOP=-2 fx stone_land "[0:a]$P[a];[1:a]$P,volume=0.5,highpass=f=600[b];[a][b]$(mix 2),atrim=0:0.35,afade=t=out:st=0.22:d=0.13[o]" "$T/s_clack.wav" "$I/impactGeneric_light_000.ogg"
fx detect "$P" "$T/s_alert.wav"
TOP=-4 fx suspicious "$P" "$T/s_hmq.wav"
fx sneak_kill "[0:a]$P,lowpass=f=2500[a];[1:a]$P,lowpass=f=1200,volume=0.7[b];[2:a]$P,atrim=0:0.4,lowpass=f=1800,volume=0.45,adelay=40[c];[3:a]$P,volume=0.6[d];[a][b][c][d]$(mix 4),atrim=0:0.55,afade=t=out:st=0.35:d=0.2[o]" "$S/Materials/cork_stabbed.wav" "$S/Combat and Gore/punch.wav" "$S/Combat and Gore/squelching_1.wav" "$T/s_stab.wav"
# spelhålan och banken
fx gamble_dice "[0:a]$P,atrim=0:0.7[a];[1:a]$P,volume=0.9,adelay=600[b];[a][b]$(mix 2),atrim=0:1.3,afade=t=out:st=1.1:d=0.2[o]" "$C/dice-shake-1.ogg" "$C/dice-throw-1.ogg"
fx gamble_win "[0:a]$P[a];[1:a]$P,volume=0.6[b];[2:a]$P,volume=0.45,adelay=250[c];[a][b][c]$(mix 3),atrim=0:1.7,afade=t=out:st=1.3:d=0.4[o]" "$T/s_fanfare.wav" "$S/Items/coins_gather_medium.wav" "$S/Items/coin_jingle_small.wav"
fx gamble_lose "[0:a]$P,aecho=0.8:0.4:80:0.2[a];[1:a]$P,volume=0.5[b];[a][b]$(mix 2),atrim=0:1.7,afade=t=out:st=1.3:d=0.4[o]" "$S/Musical Effects/sitar_negative.wav" "$T/s_sad.wav"
fx wheel_spin "$P" "$T/s_wheel.wav"
fx bank_deposit "[0:a]$P[a];[1:a]$P,volume=0.7,adelay=150[b];[2:a]$P,volume=0.6,adelay=650,lowpass=f=2500[c];[3:a]$P,volume=0.4,adelay=650[d];[a][b][c][d]$(mix 4),atrim=0:1.2,afade=t=out:st=0.9:d=0.3[o]" "$R/handleCoins.ogg" "$S/Items/coins_gather_medium.wav" "$I/impactWood_heavy_000.ogg" "$R/metalLatch.ogg"
# vandraren, köpmannen, mästerskap
fx wanderer "$P" "$T/s_wanderer.wav"
fx haggle "$P" "$T/s_haggle.wav"
fx mastery_up "$P" "$T/s_mastery.wav"
# faraon, förbannelser och labyrinten
fx pharaoh_roar "$P" "$T/s_pharaoh.wav"
fx golden_beam "$P" "$T/s_beam.wav"
fx curse_reverse "[0:a]$P[a];[1:a]$P,areverse,volume=0.4[b];[a][b]$(mix 2),atrim=0:1.0,afade=t=out:st=0.7:d=0.3[o]" "$T/s_curse.wav" "$S/Other/whoosh_2.wav"
TOP=-3 fx labyrinth_tick "[0:a]$P[a];[1:a]$P,atrim=0:0.13,volume=0.6[b];[a][b]$(mix 2),atrim=0:0.25,afade=t=out:st=0.15:d=0.1[o]" "$T/s_tick.wav" "$S/Environment/clock_tick_only.wav"

for f in "$M"/tomb.ogg "$M"/tomb_hi.ogg "$M"/boss4.ogg "$M"/stealth.ogg "$M"/labyrinth.ogg; do printf '%-34s %6.2f s %5d kB\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" "$(( $(stat -c %s "$f") / 1024 ))"; done
