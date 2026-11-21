#!/bin/bash
# Ljud för Krypta del 8 ("Avgrunden"): harpunen, bumerangen och prismat, Kristallgrottorna (golem,
# skärvirrbloss, kristaller, skärvspikar), Den sjunkna staden (drunknad sjöman, ål, siren, krabba,
# simning, luft, tidvatten, vrak), skuggjägaren och häxan, kristalldrottningen och leviatan,
# erfarenhet/nivåer/talanger, läget Avgrunden, och musiken crystal (+ crystal_hi), sunken (+ sunken_hi),
# boss5, boss6, abyss och sting_levelup. _hi-filerna är tidslinjerade intensitetslager: samma längd och
# samma taktnät som grundspåret, så att spelet kan tona in dem ovanpå.
# Samma konventioner som make2.sh-make5.sh: effekter mono 22 kHz Vorbis q2 toppnormaliserade till $TOP dBFS
# (standard -1, slingor -4), musik stereo 44,1 kHz Vorbis q1 linjärt förstärkt till mål-LUFS,
# alla slingor bär LOOPLENGTH=<sampel> i Vorbis-kommentaren och effektslingorna vrids så att skarven
# hamnar där signalen är tyst och flack.
# Källor: assets/audio (Kenney-paketen CC0: impact-sounds, rpg-audio, voiceover-pack; 400 Sounds Pack CC0).
# Röster (golem, sjöman, siren, häxa, bossar), kristaller, vatten, bubblor, magi och all musik
# syntetiseras med python3 + numpy (inbäddat nedan).
# Deterministiskt: fast frö för slumptalen och -fflags +bitexact (annars slumpar Ogg-muxern serienumret).
# Kör från katalogen där retrofps/ (repot) och assets/audio/ ligger: bash retrofps/tools/sounds/make6.sh
set -e
O=retrofps/assets/snd
M=retrofps/assets/music
A=assets/audio
S="$A/400 Sounds Pack"
I=$A/impact-sounds/Audio
R=$A/rpg-audio/Audio
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


# röstmaterial till skuggjägarens viskning (Kenney Voiceover Pack, manlig röst), mono 44,1 kHz
ffmpeg -loglevel error -y -i "$V/war_cover_me.ogg" -i "$V/war_sniper.ogg" -i "$V/war_get_down.ogg" -i "$V/war_target_engaged.ogg" \
  -filter_complex "[0:a][1:a][2:a][3:a]concat=n=4:v=0:a=1,$P[o]" -map '[o]' "$T/vox_s.wav"

# ---------- syntes ----------
cat > "$T/synth6.py" <<'PY'
# Syntetiserade effekter och musikslingor för Krypta del 8. Användning: python3 synth6.py <katalog>
# Musiken läggs med "wrap" (toner som går över slutet läggs på början), efterklangen är en cirkulär
# faltning och liggande toner/brus har ett helt antal perioder på slingan, så slingorna är sömlösa.
import sys, wave, numpy as np
SR = 44100
OUT = sys.argv[1]
rng = np.random.default_rng(8188)

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

def bubble(f0, g=1.0, rise=0.6):  # luftbubbla (Minnaert): sinus som glider uppåt och klingar av
    d = float(np.clip(25 / f0, 0.015, 0.09)); t = tt(d)
    y = np.sin(phase(f0 * (1 + rise * t / d))) * np.exp(-t * 5 / d)
    return y * env(len(t), 0.002, 0.004) * g

def bubbles(d, n, lo=300, hi=1500, t1=None, dist=1.0):  # n bubblor med log-likformig storlek
    y = np.zeros(int(d * SR)); t1 = d - 0.1 if t1 is None else t1
    for _ in range(n): place(y, t1 * rng.uniform(0, 1) ** dist, bubble(lo * (hi / lo) ** rng.uniform(0, 1)), rng.uniform(0.2, 1))
    return y

def splash(d=0.7, g=1.0, lo=250, hi=7000, dec=7.0, drops=25):  # plask: brusstöt + droppar
    t = tt(d); y = nrm(fftfilt(noise(d), lo, hi) * np.exp(-t * dec) * env(len(t), 0.003, 0.1))
    return (y + bubbles(d, drops, 700, 3000, d * 0.85, 1.5) * 0.35) * g

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

def shellclick(fc, g=1.0, dec=260):  # ihåligt skalklick
    k = tt(0.03); return nrm(reson(noise(0.03), [(fc, 90, 1), (fc * 1.7, 140, 0.5), (fc * 0.45, 60, 0.4)])) * np.exp(-k * dec) * g

def ting(d=0.55, f=2650, g=1.0, dec=1.0):  # stålspets mot sten/metall
    t = tt(d); y = np.zeros_like(t)
    for r, a, dd in ((1, 1, 9), (1.56, 0.7, 12), (2.26, 0.45, 16), (2.92, 0.25, 22), (3.51, 0.12, 30)):
        if f * r < SR * 0.45: y += a * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6)) * np.exp(-t * dd * dec)
    y += fftfilt(noise(d), 3000, 10000) * np.exp(-t * 250) * 0.8
    return y * env(len(t), 0.0005, 0.03) * g

SOP = [(850, 120, 1.0), (1250, 140, 0.5), (2900, 250, 0.3), (3500, 300, 0.12)]  # ljus kvinnoröst, "ah"
SOO = [(400, 90, 1.0), (800, 110, 0.35), (2800, 250, 0.1)]                      # ljus kvinnoröst, "oo"

# ================= effekter =================
# ---- vapen ----
def harpoon():  # avtryckare, tryckluft och fjäderklang, linan som rusar ut
    d = 0.9; y = np.zeros(int(d * SR))
    place(y, 0, tick(0.03, 0.8, 1200, 7000, 150))
    tb = tt(0.3); place(y, 0.012, fftfilt(noise(0.3), 300, 7000) * np.exp(-tb * 20) * env(len(tb), 0.002, 0.05), 1.3)
    place(y, 0.012, thud(75, 0.35, 0.0), 0.7)
    tw = tt(0.55); f = 150 * (1 + 0.25 * np.exp(-tw * 25))
    s = sum(np.sin(k * phase(f) + rng.uniform(0, 6)) / k * np.exp(-tw * (5 + 3 * k)) for k in range(1, 10))
    place(y, 0.015, s * env(len(tw), 0.002, 0.05), 0.5)
    tz = tt(0.75); z = nrm(svf(noise(0.75), 4200 * 0.55 ** (tz / 0.75), 5.0)) * np.exp(-tz * 3.5) * env(len(tz), 0.03, 0.1)
    place(y, 0.05, z, 0.3)
    return y

def reel():  # spärrhjulet klickar allt tätare, linan sveper in, vinschen surrar
    d = 1.0; t = tt(d); y = np.zeros(len(t)); tc = 0.0; rate = 12.0
    while tc < d - 0.08:
        k = tt(0.03); c = nrm(reson(noise(0.03), [(2300, 150, 1), (3900, 250, 0.6), (1100, 100, 0.4)])) * np.exp(-k * 220)
        place(y, tc, c, 0.55); tc += 1 / rate; rate = min(30, rate * 1.07)
    u = t / d
    y += nrm(svf(noise(d), 700 + 900 * u, 3.0)) * 0.3 * (0.4 + 0.6 * u)
    y += nrm(fftfilt(noise(d), 2500, 8000)) * (0.6 + 0.4 * lpnoise(d, 40)) * 0.08
    return y * env(len(t), 0.02, 0.1)

def harpoon_hit():  # spetsen slår in: dovt slag, metallklang och ett blött stick
    d = 0.6; t = tt(d); y = thud(60, d, 0.2) * 0.8
    place(y, 0, ting(0.45, 1900, 0.35, 1.3))
    y += nrm(reson(noise(d), [(350, 80, 1), (800, 150, 0.5)])) * np.exp(-t * 20) * 0.5
    return y

def boom_throw():  # bumerangen kastas: träigt svischande med snabb rotationspuls
    d = 0.6; t = tt(d); c = 0.1
    a = np.where(t < c, (t / c) ** 2, np.exp(-(t - c) * 4))
    spin = 0.2 + 0.8 * (0.5 + 0.5 * np.sin(phase(np.interp(t, [0, d], [16, 12])))) ** 2
    y = nrm(svf(noise(d), 600 + 700 * a, 1.6)) * a * spin + nrm(fftfilt(noise(d), 150, 450)) * a * spin * 0.3
    return y * env(len(t), 0.01, 0.12)

def whirr(d=1.5):  # bumerangen i luften: 12 varv/s och ett dopplersvaj på 1 Hz, så att 1 s-slingan går jämnt upp
    t = tt(d)
    spin = 0.2 + 0.8 * (0.5 + 0.5 * np.sin(2 * np.pi * 12 * t)) ** 2
    fc = 850 * 2 ** (0.3 * np.sin(2 * np.pi * t))
    return nrm(svf(noise(d), fc, 1.8)) * spin + nrm(fftfilt(noise(d), 140, 450)) * spin * 0.35

def boom_catch():  # fångad: trä mot handflata, kort dov smäll
    d = 0.4; t = tt(d)
    y = nrm(reson(noise(d), [(320, 50, 1), (720, 90, 0.6), (1500, 160, 0.3)])) * np.exp(-t * 35)
    y += thud(110, d, 0.0) * 0.5 + fftfilt(noise(d), 1000, 6000) * np.exp(-t * 120) * 0.5
    return y * env(len(t), 0.0008, 0.05)

def prism():  # kristallstråle: fallande glaszap, skimrande ackord, brummande kärna och glitter
    d = 0.95; t = tt(d); y = np.zeros(len(t))
    for n in (76, 80, 83, 87, 92):
        for det in (-0.004, 0.004): y += np.sin(2 * np.pi * m2f(n) * (1 + det) * t + rng.uniform(0, 6))
    y = nrm(y) * (0.7 + 0.3 * np.sin(2 * np.pi * 17 * t)) * np.exp(-t * 3) * 0.6
    tz = tt(0.3); place(y, 0, np.sin(phase(4200 * 0.25 ** (tz / 0.3))) * np.exp(-tz * 9) * env(len(tz), 0.001, 0.05), 0.6)
    core = nrm(fftfilt(sawp(2 * np.pi * 165 * t, 3000, 165), 100, 2000)) * (0.75 + 0.25 * np.sin(2 * np.pi * 30 * t)) * np.exp(-t * 4)
    y += core * 0.35 + shards(d, 20, 0.6, 4000, 9000) * 0.3
    return cut(verb(y * env(len(t), 0.002, 0.2), 0.9, 0.3, 9000), d, 0.3)

def prism_bounce():  # strålen studsar: glasting och kort zap
    d = 0.5; y = crys(2640, d, 1, 6) + crys(3960, d, 0.5, 8)
    tz = tt(0.12); place(y, 0, np.sin(phase(3000 * 0.4 ** (tz / 0.12))) * np.exp(-tz * 25), 0.5)
    return y + tick(d, 0.6, 3000, 10000, 200)

# ---- fiender ----
def golem():  # grov stenröst: låg röst med knastrande grovhet, malande sten och grus
    d = 1.6; t = tt(d)
    f0 = np.interp(t, [0, 0.3, 1.0, d], [48, 60, 52, 40])
    F1 = np.interp(t, [0, 0.5, d], [400, 550, 380]); F2 = np.interp(t, [0, 0.5, d], [700, 900, 650])
    v = voice(f0, [(F1, 90, 1.0), (F2, 120, 0.5), (2200, 250, 0.12)], 3500, jitter=0.04, roll=0.5)
    fry = 0.3 + 0.7 * np.clip(lpnoise(d, 25) * 2 + 0.4, 0, 1)
    v = np.tanh(3 * nrm(v)) * fry
    grind = nrm(reson(noise(d), [(150, 40, 1), (260, 60, 0.7), (480, 90, 0.4), (900, 150, 0.2)])) * (0.5 + 0.5 * fry)
    y = (v + grind * 0.45) * env(len(t), 0.1, 0.4) + debris(d, 30, 600, 3500, d * 0.9) * 0.25
    return cut(verb(fftfilt(y, 40, 3500), 1.0, 0.25, 2500), 1.6, 0.4)

def golem_step():  # tungt stenfotsteg med krasande kristallgrus
    d = 0.6; return thud(36, d, 0.6) + shards(d, 10, 0.12, 2500, 6000) * 0.12

def shardwisp():  # skärvirrbloss: virvlande glasklirr, luftigt sus och ett skimrande kvitter
    d = 1.0; t = tt(d); y = np.zeros(len(t))
    for i in range(14):
        place(y, 0.05 * i + rng.uniform(0, 0.02), crys(m2f(rng.choice([88, 91, 93, 95, 98, 100, 103])), 0.3, 0.6, 6), 0.4 * np.sin(np.pi * (i + 0.5) / 14))
    sw = nrm(svf(noise(d), 2500 * 2 ** (0.8 * np.sin(2 * np.pi * 3 * t)), 4.0)) * env(len(t), 0.15, 0.35)
    chirp = np.sin(phase(1800 + 600 * np.sin(2 * np.pi * 9 * t))) * env(len(t), 0.2, 0.4) * 0.15
    return verb(y + sw * 0.4 + chirp, 0.8, 0.3, 9000)[:len(t)]

def sailor():  # drunknad sjöman: gurglande stön genom vatten, bubblor som brister
    d = 1.5; t = tt(d)
    f0 = np.interp(t, [0, 0.3, 1.0, d], [90, 110, 95, 75])
    F1 = 450 + 150 * lpnoise(d, 6); F2 = 900 + 250 * lpnoise(d, 8)
    v = voice(f0, [(F1, 100, 1.0), (F2, 140, 0.5), (2400, 250, 0.1)], 3500, jitter=0.03, roll=0.6)
    gurg = 0.3 + 0.7 * np.abs(np.sin(phase(18 + 10 * lpnoise(d, 4))))
    v = np.tanh(2.0 * nrm(v)) * gurg
    y = (fftfilt(v, 60, 2200) + bubbles(d, 40, 200, 900) * 0.5) * env(len(t), 0.1, 0.35)
    return cut(verb(y, 0.8, 0.2, 3000), 1.5, 0.35)

def eel():  # ålen: väsande fräs och ett plask
    d = 1.0; y = np.zeros(int(d * SR)); th = tt(0.6)
    hs = nrm(reson(noise(0.6), [(4500, 900, 1), (2600, 500, 0.5), (7000, 1200, 0.4)])) * env(len(th), 0.04, 0.3) * (0.7 + 0.3 * lpnoise(0.6, 30))
    place(y, 0, hs, 0.7); place(y, 0.35, splash(0.6), 0.8)
    return y

def siren():  # sirenens lockrop: ljus kvinnoröst i en slingrande fras, en svag stämma under, glasklang, lång efterklang
    notes = [(0, 76, 0.3), (0.28, 79, 0.25), (0.5, 81, 0.55), (1.02, 79, 0.22), (1.22, 83, 0.25), (1.45, 81, 0.6)]
    v = sing(notes, SOP, 1.0, 0.012, 0.05, 7000, 0.9, 0.06)
    v2 = sing(notes, SOO, 0.3, 0.012, 0.05, 6000, 1.0, 0.0, shift=2 ** (-3 / 12))
    y = v + v2; d = len(y) / SR
    y += glass(69, d, 0.15, att=0.4, rel=0.8) + glass(76, d, 0.1, att=0.6, rel=0.8)
    return cut(verb(y, 2.2, 0.45, 7000), 2.3, 0.5)

def crab():  # krabban: ihåliga skalklick i skurar och krafsande ben
    d = 0.8; y = np.zeros(int(d * SR)); t0 = 0.01
    for _ in range(3):
        bd = rng.uniform(0.12, 0.2); r = rng.uniform(22, 34); fc = rng.uniform(1300, 2200)
        for i in range(int(bd * r)): place(y, t0 + i / r + rng.uniform(0, 0.004), shellclick(fc * rng.uniform(0.9, 1.1)), rng.uniform(0.5, 1))
        t0 += bd + rng.uniform(0.04, 0.09)
        if t0 > d - 0.22: break
    y += grains(d, 300, 1500, 6000, 0.003) * 0.5 * env(len(y), 0.05, 0.2)
    return fade_tail(y, 0.06)

def crab_clack():  # klon slår ihop: två hårda skalknäpp
    y = np.zeros(int(0.35 * SR))
    place(y, 0, shellclick(1500, 1.0, 120)); place(y, 0.004, thud(140, 0.15, 0), 0.4)
    place(y, 0.11, shellclick(1750, 0.8, 140))
    return y

def stalker():  # skuggjägaren: baklänges viskning, ett andetag och ett svagt mörkt sus
    d = 1.5; y = np.zeros(int(d * SR))
    place(y, 0.05, whisper('vox_s', 0.3, 1.3), 1.0)
    tb = tt(0.45); place(y, 0, nrm(svf(noise(0.45), 1200 + 800 * tb / 0.45, 1.5)) * np.sin(np.pi * tb / 0.45) ** 2, 0.25)
    y += nrm(fftfilt(noise(d), 60, 300)) * env(len(y), 0.4, 0.5) * 0.15
    return cut(verb(y, 1.2, 0.35, 6000), d, 0.4)

def witch():  # häxans kackel: "hi-hi-hi-ha-ha-haaa" i fallande steg, nasalt och skrovligt
    out = np.zeros(int(1.5 * SR)); t0 = 0.0
    steps = [(640, 0.08), (610, 0.08), (580, 0.085), (540, 0.09), (500, 0.095), (470, 0.1), (430, 0.32)]
    for i, (f, dd) in enumerate(steps):
        t = tt(dd); last = i == len(steps) - 1
        f0 = np.interp(t, [0, dd], [f * 1.08, f * 0.92]) * (1 + (0.03 * np.sin(2 * np.pi * 9 * t) if last else 0))
        F = [(950, 130, 1), (1800, 160, 0.8), (3100, 260, 0.45)] if i < 3 else [(1000, 140, 1), (1500, 160, 0.7), (2900, 250, 0.4)]
        v = np.tanh(1.8 * nrm(voice(f0, F, 7000, jitter=0.02, roll=0.5)))
        h = nrm(reson(noise(dd), [(1800, 400, 1), (3000, 500, 0.6)]))
        s = h * np.exp(-t * 70) * 0.6 + v * np.clip((t - 0.008) / 0.01, 0, 1) * (env(len(t), 0.01, 0.2) if last else np.exp(-t * 14))
        place(out, t0, s * env(len(t), 0.003, 0.02))
        t0 += dd + 0.045
    return cut(verb(out, 0.7, 0.2, 7000), 1.4, 0.3)

def hex_():  # förbannelse: baklänges sus, en vriden sjunkande ton, tritonuskör och en låg klocka
    d = 1.4; y = np.zeros(int(d * SR)); ts = tt(0.5)
    place(y, 0, nrm(svf(noise(0.5), 400 + 2000 * (ts / 0.5) ** 2, 2.0)) * (ts / 0.5) ** 2, 0.5)
    dd = 0.9; t = tt(dd); u = t / dd
    f = 420 * 0.4 ** u * (1 + 0.05 * np.sin(phase(5 + 9 * u)))
    place(y, 0.45, nrm(fftfilt(sawp(phase(f), 4000, 420), 80, 2200)) * env(len(t), 0.02, 0.3), 0.5)
    place(y, 0.42, nrm(choir([50, 56], 0.9, 0.05, 0.4, 1.0, vib=6, F=OH, hmax=3500)), 0.4)
    place(y, 0.45, bell(38, 0.95, 0.4))
    return cut(verb(y, 1.2, 0.35, 4500), d, 0.35)

def teleport():  # häxans teleport: sugande stigande sus, ett puff och fallande glitter
    d = 1.0; y = np.zeros(int(d * SR)); u = tt(0.45) / 0.45
    place(y, 0, nrm(svf(noise(0.45), 300 * 14 ** u, 3.0)) * u ** 2, 0.7)
    place(y, 0, np.sin(phase(200 * 8 ** u)) * u ** 3, 0.2)
    tp = tt(0.25); place(y, 0.45, fftfilt(noise(0.25), 200, 5000) * np.exp(-tp * 25) + np.sin(phase(180 * (1 + np.exp(-tp * 30)))) * np.exp(-tp * 18), 0.9)
    place(y, 0.45, shards(0.55, 25, 0.35, 3500, 8500), 0.35)
    return cut(verb(y, 0.9, 0.3, 8000), d, 0.3)

# ---- bossar ----
def queen_roar():  # kristalldrottningen: kraftfull röst med glasartade övertoner, ringande resonanser, skimrande kör, klirr
    d = 2.4; t = tt(d)
    f0 = np.interp(t, [0, 0.25, 1.0, 1.8, d], [95, 140, 128, 110, 85])
    F1 = np.interp(t, [0, 0.3, 1.6, d], [550, 800, 720, 500]); F2 = np.interp(t, [0, 0.3, 1.6, d], [950, 1300, 1150, 900])
    v = nrm(voice(f0, [(F1, 110, 1), (F2, 140, 0.7), (2700, 250, 0.35), (3600, 350, 0.15)], 6000, jitter=0.02, roll=0.5))
    hi = nrm(voice(f0 * 3, [(2200, 250, 1), (3400, 350, 0.6)], 8000, jitter=0.02, roll=0.6))
    rough = 0.65 + 0.35 * np.sin(phase(24 + 6 * lpnoise(d, 5)))
    y = np.tanh(2.4 * (v + 0.35 * hi) * rough) * env(len(t), 0.1, 0.6)
    ring = nrm(reson(y, [(1760, 6, 1), (2349, 8, 0.8), (3136, 10, 0.6), (4186, 12, 0.4)]))
    y += ring * 0.3 + nrm(choir([81, 88, 92], d, 0.5, 0.8, 1.0, vib=6, F=AA, hmax=8000)) * 0.25
    y += shards(d, 40, d * 0.8, 3000, 8000) * 0.25
    return cut(verb(y, 2.5, 0.45, 6000), d, 0.6)

def queen_shatter():  # drottningen splittras: smäll, kaskader av glas, sjunkande glasklang, mullret
    d = 2.8; t = tt(d); y = thud(38, d, 0.0) * 0.8
    tc = tt(0.35); place(y, 0, fftfilt(noise(0.35), 1500, 11000) * np.exp(-tc * 18), 0.9)
    y += shards(d, 180, d * 0.75, 1800, 9000, (6, 25)) * 0.5 + low_rumble(d) * np.exp(-t * 1.5) * 0.4
    for f in (1760, 2637, 3520): y += np.sin(phase(f * 2 ** (-1.2 * t / d))) * np.exp(-t * 1.5) * env(len(t), 0.05, 0.3) * 0.15
    return cut(verb(y, 2.5, 0.4, 7000), d, 0.7)

def queen_beam():  # drottningens stråle: laddande glasvissling, prismatiskt ackord, brummande kärna, glitter
    d = 2.0; t = tt(d); y = np.zeros(len(t))
    for i, n in enumerate((64, 71, 76, 78, 83, 88)):
        for det in (-0.003, 0.003): y += np.sin(2 * np.pi * m2f(n) * (1 + det) * t + rng.uniform(0, 6)) * np.clip((t - 0.06 * i) / 0.3, 0, 1)
    y = nrm(y) * (0.7 + 0.3 * np.sin(2 * np.pi * 13 * t))
    c = np.clip(t / 0.4, 0, 1); whine = np.sin(phase(1200 + 1800 * c)) * c * np.exp(-np.maximum(t - 0.4, 0) * 4)
    core = nrm(fftfilt(sawp(2 * np.pi * 82.4 * t, 3000, 82.4), 60, 1200)) * (0.8 + 0.2 * np.sin(2 * np.pi * 9 * t))
    sw = nrm(fftfilt(noise(d), 4000, 12000)) * (0.6 + 0.4 * lpnoise(d, 20))
    y = (y * 0.5 + whine * 0.2 + core * 0.4 + sw * 0.1 + shards(d, 50, d * 0.9, 4000, 9500) * 0.35) * env(len(t), 0.05, 0.5)
    return verb(y, 1.4, 0.35, 9000)[:len(t)]

def lev_roar():  # leviatan: enormt djupt vrål med bubblande strupe, subbas och vattenmuller
    d = 3.0; t = tt(d)
    f0 = np.interp(t, [0, 0.35, 1.3, 2.2, d], [30, 46, 42, 36, 26])
    F1 = np.interp(t, [0, 0.4, 2.0, d], [320, 500, 450, 300]); F2 = np.interp(t, [0, 0.4, 2.0, d], [600, 820, 760, 520])
    v = nrm(voice(f0, [(F1, 90, 1), (F2, 120, 0.6), (1700, 200, 0.2)], 3000, jitter=0.03, roll=0.4))
    gurg = 0.55 + 0.45 * np.sin(phase(19 + 8 * lpnoise(d, 4)))
    e = env(len(t), 0.15, 0.8)
    y = np.tanh(3.0 * v * gurg) * e + np.sin(phase(f0 / 2)) * env(len(t), 0.2, 0.9) * 0.5
    y += nrm(svf(noise(d), F1, 2.0)) * 0.2 * gurg * e
    y += low_rumble(d, 38) * 0.4 + bubbles(d, 80, 90, 400, d - 0.3) * 0.5
    return cut(verb(fftfilt(y, 25, 3500), 2.8, 0.4, 2500), d, 0.8)

def lev_submerge():  # leviatan dyker: stort plask, sörplande virvel, bubbelmoln och fallande mullret
    d = 2.6; t = tt(d); y = np.zeros(len(t))
    place(y, 0, splash(1.2, 1.0, 150, 6000, 3.5, 60)); place(y, 0, thud(45, 1.2, 0.0), 0.6)
    gl = nrm(svf(noise(d), 1400 * 0.15 ** (t / d), 2.5)) * np.interp(t, [0, 0.3, 1.8, d], [0, 1, 0.5, 0])
    y += gl * 0.5 + bubbles(d, 140, 120, 700, d - 0.4, 1.3) * 0.5 + low_rumble(d, 35) * np.exp(-t * 1.2) * 0.5
    return fade_tail(y, 0.6)

def lev_wave():  # flodvåg: dånande uppsvällning, ett brak och skummande fräs
    d = 2.8; t = tt(d); c = 1.4; sw = np.clip(t / c, 0, 1) ** 2.2
    w = nrm(svf(noise(d), 250 + 2500 * sw, 0.8, 'lp')) * np.where(t < c, sw, np.exp(-(t - c) * 2.5))
    on = np.clip((t - c) / 0.015, 0, 1)
    y = w + fftfilt(noise(d), 100, 9000) * np.exp(-np.maximum(t - c, 0) * 4) * on * 0.8
    y += nrm(fftfilt(noise(d), 2500, 10000)) * np.exp(-np.maximum(t - c, 0) * 1.6) * on * 0.4
    y += low_rumble(d) * sw * np.exp(-np.maximum(t - c, 0) * 1.5) * 0.6 + bubbles(d, 120, 400, 2500, d - 0.2) * on * 0.3
    place(y, c, thud(40, d - c, 0.3), 0.7)
    return fade_tail(y, 0.6)

# ---- miljö ----
def crystal_hit():  # skott mot kristall: klart glasslag
    d = 0.5; return crys(2200, d, 1, 5) + crys(3310, d, 0.4, 7) + tick(d, 0.5, 2000, 9000, 180)

def crystal_shatter():  # kristallen krossas: knak, skärvor som rasar, en liten duns
    d = 1.3; t = tt(d); y = fftfilt(noise(d), 1200, 10000) * np.exp(-t * 30) * 0.9
    y += thud(90, d, 0.0) * 0.4 + shards(d, 70, 0.6, 2000, 8500, (8, 30)) * 0.7
    return fade_tail(y, 0.3)

def crystal_chime():  # kristallerna klingar: tre mjuka glastoner
    d = 2.2; y = np.zeros(int(d * SR))
    for t0, n, g in ((0, 88, 1), (0.16, 95, 0.6), (0.34, 100, 0.4)): place(y, t0, crys(m2f(n), d - t0, g, 0.9, 0.002))
    return cut(verb(y, 1.8, 0.4, 9000), d, 0.5)

def spikes_crystal():  # kristallspikar skjuter upp: snabbt stigande "sching", glasklunga och krasande grus
    d = 0.7; y = np.zeros(int(d * SR)); ts = tt(0.12)
    place(y, 0, nrm(svf(noise(0.12), 2000 * 3 ** (ts / 0.12), 8.0)) * env(len(ts), 0.01, 0.03), 0.6)
    for f in (2900, 3700, 4400, 5300): place(y, 0.08 + rng.uniform(0, 0.03), crys(f, 0.6, 0.5, 4))
    y += debris(d, 30, 1500, 6000, 0.25) * 0.35
    return y

def swim_stroke():  # simtag: vattnet trycks undan, svall och små bubblor
    d = 0.7; t = tt(d); a = np.interp(t, [0, 0.25, d], [0, 1, 0])
    y = nrm(svf(noise(d), 300 + 900 * a, 0.9, 'lp')) * a ** 1.5
    y += nrm(reson(noise(d), [(220, 60, 1), (480, 90, 0.5)])) * a * 0.3 + bubbles(d, 12, 300, 1200, 0.5) * 0.25
    return y * env(len(t), 0.01, 0.1)

def dive():  # dyker: plask, sedan dämpat bubbelmoln och tryck
    d = 1.3; t = tt(d); y = np.zeros(len(t)); place(y, 0, splash(0.5, 1.0, 300, 7000, 9, 15))
    bc = fftfilt(bubbles(d, 70, 150, 800, 0.8, 1.6), 0, 1500); place(y, 0.12, bc, 0.7)
    y += nrm(fftfilt(noise(d), 40, 400)) * np.clip((t - 0.1) / 0.2, 0, 1) * np.exp(-t * 1.5) * 0.4
    return fade_tail(y, 0.3)

def surface():  # bryter ytan: dämpat sus som blir ljust, plask och droppar
    d = 1.0; y = np.zeros(int(d * SR)); tw = tt(0.25)
    place(y, 0, nrm(svf(noise(0.25), 400 * 15 ** (tw / 0.25), 1.2, 'lp')) * (tw / 0.25) ** 1.5, 0.6)
    place(y, 0.22, splash(0.75, 0.8, 600, 8000, 8, 30))
    return fade_tail(y, 0.2)

def gasp_air():  # inandning: luft genom svalget, stigande och tätt, med ett tonande insug i början
    d = 0.75; t = tt(d); u = t / d
    a = np.interp(t, [0, 0.05, 0.45, 0.6, d], [0, 0.6, 1, 0.5, 0])
    y = (nrm(svf(noise(d), 800 + 900 * u, 1.8)) + nrm(fftfilt(noise(d), 1500, 7000)) * 0.5) * a
    tv = tt(0.12); place(y, 0.02, nrm(voice(np.interp(tv, [0, 0.12], [190, 230]), HA, 5000, jitter=0.02)) * env(len(tv), 0.01, 0.06), 0.3)
    return y

def drown():  # drunknar: dämpade kvävda stötar genom vatten och bubbelskurar
    d = 1.6; t = tt(d); y = np.zeros(len(t))
    for t0, f in ((0.0, 130), (0.42, 145), (0.85, 120)):
        dd = 0.3; tv = tt(dd); v = nrm(voice(np.interp(tv, [0, dd], [f, f * 0.8]), OH, 3000, jitter=0.05, roll=0.5))
        place(y, t0, np.tanh(2 * v) * env(len(tv), 0.02, 0.12), 0.7)
        place(y, t0 + 0.05, bubbles(0.4, 18, 150, 900, 0.3), 0.6)
    y = fftfilt(y, 60, 1100) + bubbles(d, 25, 250, 1200, d - 0.3) * 0.3
    return fade_tail(y, 0.3)

def bubble_stream(d=2.6):  # jämn ström av bubblor (slinga 2 s)
    return bubbles(d, 110, 250, 1400, d - 0.1) + nrm(fftfilt(noise(d), 3000, 9000)) * 0.03

def tide(d=2.8):  # tidvattnet stiger: sväll av forsande vatten, gluckande och svall
    t = tt(d); u = t / d; a = np.interp(t, [0, 1.6, d], [0.15, 1, 0])
    y = nrm(svf(noise(d), 300 + 1200 * u, 0.9, 'lp')) * a * (0.8 + 0.2 * np.sin(2 * np.pi * 1.3 * t))
    y += bubbles(d, 60, 150, 600, d - 0.4) * 0.4 * a + nrm(fftfilt(noise(d), 1500, 6000)) * a * 0.08
    return y * env(len(t), 0.05, 0.2)

def water_deep(d=4.8):  # under vattnet: lågt muller, tryck, avlägsna bubblor och svagt knaster (slinga 4 s)
    y = nrm(fftfilt(noise(d), 25, 250)) * (0.7 + 0.3 * lpnoise(d, 0.5))
    y += nrm(fftfilt(bubbles(d, 25, 150, 600), 0, 900)) * 0.25 + nrm(fftfilt(noise(d), 300, 1200)) * 0.08
    y += fftfilt(grains(d, int(d * 150), 2000, 7000, 0.002), 0, 9000) * 0.15
    return y

def wreck():  # vrakkistan: knarrande lock, vatten som rinner ur, dovt stopp
    d = 1.6; y = np.zeros(int(d * SR))
    place(y, 0.05, nrm(bow_creak(0.8, 10, 25, ((320, 1, 70), (760, 0.6, 110), (1500, 0.3, 160)))), 0.6)
    place(y, 0.85, thud(90, 0.5, 0.1), 0.6)
    place(y, 0.3, fftfilt(bubbles(1.2, 40, 600, 2500, 1.0), 400, 6000), 0.4)
    return y

def tome():  # kunskapsboken: magiskt skimmer som stiger
    d = 1.5; y = np.zeros(int(d * SR))
    for i, n in enumerate((81, 86, 88, 93, 98)): place(y, 0.25 + 0.06 * i, bar(m2f(n), 1.0, 0.25, dec=3))
    place(y, 0.25, glass(86, 1.2, 0.3, att=0.3, rel=0.6)); place(y, 0, nrm(heavy_swish_rev(0.5)), 0.2)
    return cut(verb(y, 1.4, 0.4, 8000), d, 0.4)

def heavy_swish_rev(d):  # sus som sväller in (baklänges svep)
    t = tt(d); a = (t / d) ** 2; return svf(noise(d), 500 + 3000 * a, 1.5) * a

def altar():  # talangaltaret: låg klocka, stigande kör, glasglimtar och brum
    d = 2.2; t = tt(d); y = bell(45, d, 0.5) + nrm(choir([62, 69, 74, 78], d, 0.6, 0.8, 1.0, vib=5, F=AA, hmax=6000)) * 0.4
    y += hum(d, 110, 0.15) * env(len(t), 0.3, 0.8)
    for t0, n in ((0.5, 93), (0.8, 98), (1.1, 102)): place(y, t0, crys(m2f(n), 1.0, 0.25, 2))
    return cut(verb(y, 2.0, 0.4, 7000), d, 0.6)

def hum(d, f=110, g=1.0):  # varmt brum
    t = tt(d); y = sum(np.sin(2 * np.pi * f * k * t + rng.uniform(0, 6)) / k ** 1.3 for k in range(1, 10))
    return nrm(fftfilt(y, 80, 2500)) * (0.85 + 0.15 * lpnoise(d, 12)) * g

# ---- erfarenhet, nivåer, talanger ----
def levelup():  # ny nivå: mässingsarpeggio uppåt, klockspel och glitter
    d = 1.7; y = np.zeros(int(d * SR))
    for i, n in enumerate((60, 64, 67, 72)): place(y, 0.08 * i, brass([n], 0.2, att=0.005, rel=0.07, drive=2.0, swell=0.05, hi_fc=3200), 0.45)
    place(y, 0.32, brass([60, 64, 67, 72], 1.1, att=0.01, rel=0.5, drive=2.0, swell=0.15, hi_fc=3200), 0.65)
    for i, n in enumerate((84, 88, 91, 96, 100)): place(y, 0.32 + 0.05 * i, bar(m2f(n), 1.1, 0.25, dec=2.5))
    y += shards(d, 30, 1.2, 5000, 9500) * 0.15
    return cut(verb(y, 1.3, 0.3, 7000), d, 0.4)

def talent_pick():  # talangval: kort sus uppåt och ett ljust ackordslag
    d = 0.8; y = np.zeros(int(d * SR)); place(y, 0, nrm(heavy_swish_rev(0.15)), 0.3)
    for n, g in ((79, 0.6), (84, 0.5), (88, 0.4), (91, 0.3)): place(y, 0.13, ping(m2f(n), 0.65, g, 6)); place(y, 0.13, bar(m2f(n + 12), 0.4, g * 0.2, dec=6))
    return cut(verb(y, 0.8, 0.25, 8000), d, 0.25)

def xp_tick():  # erfarenhetspling
    y = ping(m2f(96), 0.2, 1.0, 18); place(y, 0, bar(m2f(103), 0.12, 0.15, dec=12)); return y

# ---- Avgrunden ----
def abyss_descend():  # nedstigning: fallande drönarkluster, sjunkande vind, svällande muller och en avlägsen klocka
    d = 3.8; t = tt(d); fall = 2 ** (-t / d)
    y = np.zeros(len(t))
    for n in (38, 39, 45):
        for det in (-0.003, 0.003): y += sawp(phase(m2f(n) * (1 + det) * fall), 1500, m2f(n))
    y = nrm(fftfilt(y, 30, 900)) * env(len(t), 0.4, 0.6) * 0.5
    y += nrm(svf(noise(d), 1200 * 0.2 ** (t / d), 2.0)) * np.interp(t, [0, 0.6, 2.8, d], [0, 0.6, 0.5, 0])
    y += low_rumble(d, 32) * np.interp(t, [0, 2.5, d], [0.1, 0.7, 0])
    place(y, 2.4, fftfilt(bell(26, 1.4, 0.5), 0, 1200))
    return cut(verb(y, 2.5, 0.35, 3000), d, 0.6)

fx = dict(harpoon=harpoon, reel=reel, harpoon_hit=harpoon_hit, boom_throw=boom_throw, whirr=whirr, boom_catch=boom_catch,
          prism=prism, prism_bounce=prism_bounce, golem=golem, golem_step=golem_step, shardwisp=shardwisp, sailor=sailor,
          eel=eel, siren=siren, crab=crab, crab_clack=crab_clack, stalker=stalker, witch=witch, hex=hex_, teleport=teleport,
          queen_roar=queen_roar, queen_shatter=queen_shatter, queen_beam=queen_beam, lev_roar=lev_roar,
          lev_submerge=lev_submerge, lev_wave=lev_wave, crystal_hit=crystal_hit, crystal_shatter=crystal_shatter,
          crystal_chime=crystal_chime, spikes_crystal=spikes_crystal, swim_stroke=swim_stroke, dive=dive, surface=surface,
          gasp_air=gasp_air, drown=drown, bubbles=bubble_stream, tide=tide, water_deep=water_deep, wreck=wreck, tome=tome,
          altar=altar, levelup=levelup, talent_pick=talent_pick, xp_tick=xp_tick, abyss=abyss_descend)
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

def write_aligned(*named):  # [(Loop, namn)]: vrider alla slingor lika mycket (0-30 ms senare) så att skarven hamnar där
    # alla kanaler är nära noll och flacka; annars ger Vorbis-kodarens start mitt i en stark baston ett litet knäpp i skarven.
    # Intensitetslagren vrids lika mycket som grundspåret, så tidslinjen är densamma.
    N = named[0][0].N; K = int(0.03 * SR); i = (N - np.arange(K)) % N; cost = np.zeros(K)
    for lp, _ in named:
        for ch in (lp.L, lp.R):
            cost += (np.abs(ch[i]) + 20 * np.abs(ch[i] - ch[i - 1])) / (np.sqrt(np.mean(ch ** 2)) + 1e-9)
    k = int(np.argmin(cost))
    for lp, name in named:
        lp.L = np.roll(lp.L, k); lp.R = np.roll(lp.R, k); lp.write(name)

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

def stereo_sting(T):  # icke-slingande stereobuffert (för stingers)
    return [np.zeros(int(T * SR)), np.zeros(int(T * SR))]

def sadd(B, t0, sig, pan=0.0, g=1.0):
    place(B[0], t0, sig, np.cos((pan + 1) * np.pi / 4) * g * 1.414); place(B[1], t0, sig, np.sin((pan + 1) * np.pi / 4) * g * 1.414)

# ---- crystal: e-moll med lydisk färg (Em9 Cmaj7#11 Am9 Em9 Cmaj7#11 Bsus), 80 bpm, 12 takter = 36 s ----
# grund: glasharmonikor, klockspelsarpeggio, kristallmelodi, låga stråkar, glitter. hi: puls, bastrumma, shaker, 16-delsarpeggio.
def crystal():
    b = 0.75; T = 48 * b; base = Loop(T); hi = Loop(T)
    sec = [(0, 'E'), (2, 'C'), (4, 'A'), (6, 'E'), (8, 'C'), (10, 'B')]
    chord = {'E': [52, 59, 66, 67], 'C': [48, 55, 64, 66], 'A': [45, 52, 59, 60], 'B': [47, 54, 59, 63]}
    root = {'E': 28, 'C': 24, 'A': 33, 'B': 35}
    arp = {'E': [64, 71, 78, 79, 83, 79, 78, 71], 'C': [60, 67, 76, 78, 79, 78, 76, 67],
           'A': [57, 64, 71, 72, 76, 72, 71, 64], 'B': [59, 66, 71, 75, 78, 75, 71, 66]}
    base.add(0, base.drone(40, 0.22, h=6, roll=1.6, cyc=3, hi=500))
    base.add(0, base.bed(3000, 9000, 0.006, cyc=6))
    for b0, c in sec:
        t0 = b0 * 4 * b
        for j, n in enumerate(chord[c]):
            base.add(t0 - 0.8 + 0.15 * j, glass(n + 12, 8 * b + 2.4, 0.16, att=1.4, rel=2.0, trem=3.5 + 0.4 * j, det=0.002), -0.6 + 0.4 * j)
        base.add(t0 - 0.3, strings([root[c] + 12, root[c] + 24], 8 * b + 1.2, att=1.0, rel=1.5, g=0.35, hi=700), 0)
        for bar_ in range(2):
            t1 = t0 + bar_ * 4 * b
            for k8 in range(8):
                base.add(t1 + k8 * b / 2, bar(m2f(arp[c][k8]), 1.6, 0.11 if k8 % 2 else 0.15, dec=2.2), 0.45 if k8 % 2 else -0.45)
                hi.add(t1 + k8 * b / 2, mpulse(root[c] + 24, 0.3, 0.55 if k8 in (0, 3, 6) else 0.3), -0.1)
            for k16 in range(16):
                hi.add(t1 + k16 * b / 4, bar(m2f(arp[c][(k16 * 3) % 8] + 12), 0.5, 0.05, dec=6), 0.6 if k16 % 2 else 0.3)
                hi.add(t1 + k16 * b / 4, shaker(0.12 if k16 % 4 == 2 else 0.06), -0.5)
            for tb in (0, 2): hi.add(t1 + tb * b, drum(48, 0.7, 0.8, 0.1, dec=7), 0)
            hi.add(t1 + 3.5 * b, drum(70, 0.5, 0.45, 0.2, dec=9), 0.25)
            if (b0 + bar_) % 4 == 3:
                for k in range(4): hi.add(t1 + 3 * b + k * b / 4, drum(90 - 8 * k, 0.4, 0.3 + 0.08 * k, 0.2, dec=10), 0.3 - 0.2 * k)
    mel = [(8, 79, 1.5), (9.5, 78, 0.5), (10, 76, 2), (12, 71, 2), (14, 72, 1), (15, 76, 1), (16, 81, 3), (19, 79, 1), (20, 76, 4),
           (32, 79, 1.5), (33.5, 81, 0.5), (34, 83, 2), (36, 84, 1), (37, 83, 1), (38, 79, 2), (40, 78, 2), (42, 75, 2), (44, 71, 4)]
    for t0, n, dd in mel: base.add(t0 * b, mel_tone(n, dd * b, 0.22), 0.15)
    for _ in range(14):
        base.add(rng.uniform(0, T), crys(m2f(rng.choice([88, 90, 91, 95, 100])), 1.5, 0.05, 1.5, 0.002), rng.uniform(-0.8, 0.8))
    base.reverb(4.0, 0.45, 5000); hi.reverb(2.0, 0.2, 6000)
    write_aligned((base, 'crystal'), (hi, 'crystal_hi'))

# ---- sunken: d-dorisk (Dm9 Bbmaj7 Cadd9 Am7 Dm9 Gm9), 75 bpm, 12 takter = 38,4 s ----
# grund: svajande vattenpadar, harpa, dränkt klocka, bubblor, "oo"-sång, valsång. hi: låga trummor, basostinato, tremolostråkar, shaker.
def sunken():
    b = 0.8; T = 48 * b; base = Loop(T); hi = Loop(T)
    sec = [(0, 'D'), (2, 'B'), (4, 'C'), (6, 'A'), (8, 'D'), (10, 'G')]
    chord = {'D': [50, 57, 64, 65], 'B': [46, 53, 57, 62], 'C': [48, 55, 62, 64], 'A': [45, 52, 55, 60], 'G': [43, 50, 57, 58]}
    root = {'D': 38, 'B': 34, 'C': 36, 'A': 33, 'G': 31}
    base.add(0, base.drone(26, 0.25, h=6, roll=1.6, cyc=2, hi=250))
    base.add(0, base.bed(80, 500, 0.02, cyc=3))
    for b0, c in sec:
        t0 = b0 * 4 * b; ch = chord[c]
        base.add(t0 - 1.0, wpad(ch, 8 * b + 2.4, 0.4, att=1.8, rel=2.2, hi=900), 0)
        base.add(t0 - 0.2, wpad([root[c]], 8 * b + 0.8, 0.3, att=0.5, rel=1.0, hi=300), 0)
        for bar_ in range(2):
            t1 = t0 + bar_ * 4 * b
            up = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 24, ch[3] + 12]
            for k, n in enumerate(up if bar_ == 0 else up[:4]): base.add(t1 + k * b / 2, pluck(n, 2.5, 1.8, 0.14), -0.4 + 0.15 * k)
            osti = [0, 12, 7, 12, 0, 10, 7, 5]
            for k8 in range(8):
                hi.add(t1 + k8 * b / 2, pluck(root[c] + osti[k8], 0.7, 1.1, 0.4 if k8 in (0, 3, 6) else 0.28), -0.15)
                hi.add(t1 + k8 * b / 2, shaker(0.1 if k8 % 2 else 0.05), 0.5)
            for tb, g in ((0, 1.0), (1.5, 0.6), (2, 0.85), (3, 0.5), (3.5, 0.6)): hi.add(t1 + tb * b, drum(45, 1.0, 0.8 * g, 0.2, dec=5), 0)
            hi.add(t1 + 1 * b, drum(85, 0.4, 0.3, 0.3, dec=10), 0.3); hi.add(t1 + 3 * b, drum(85, 0.4, 0.35, 0.3, dec=10), 0.3)
        hi.add(t0, strings(ch[1:], 8 * b, att=0.4, rel=0.6, g=0.2, hi=2200, trem=8), 0.35)
    for t0 in (0, 24): base.add(t0 * b, fftfilt(bell(50, 7.0, 0.35), 0, 1200), 0.2)
    for t0, (n0, n1) in ((16, (57, 62)), (40, (55, 50))):
        d = 3.0; t = tt(d); f = m2f(n0) * (m2f(n1) / m2f(n0)) ** np.clip((t - 0.4) / 1.5, 0, 1) * (1 + 0.008 * np.sin(2 * np.pi * 4 * t))
        base.add(t0 * b, fftfilt(np.sin(phase(f)) + 0.2 * np.sin(2 * phase(f)), 0, 900) * env(len(t), 0.6, 1.2) * 0.12, -0.5)
    for _ in range(10):
        base.add(rng.uniform(0, T), fftfilt(bubbles(0.8, 8, 300, 1200, 0.6), 0, 2500) * 0.08, rng.uniform(-0.7, 0.7))
    phr = [[(8, 69, 3), (11, 70, 1), (12, 69, 2), (14, 65, 2), (16, 67, 3), (19, 64, 1), (20, 62, 4)],
           [(32, 74, 3), (35, 72, 1), (36, 69, 2), (38, 65, 2), (40, 67, 2), (42, 70, 2), (44, 69, 4)]]
    for p in phr:
        s0 = p[0][0]
        base.add(s0 * b, sing([((t0 - s0) * b, n, d * b) for t0, n, d in p], SOO, 0.18, 0.01, 0.12, 5000, 1.0, 0.04), 0.2)
    base.reverb(4.5, 0.5, 3000, 0.03); hi.reverb(2.0, 0.25, 4000)
    write_aligned((base, 'sunken'), (hi, 'sunken_hi'))

# ---- boss5: e-frygiskt (Em F Dm Em), 150 bpm, 16 takter = 25,6 s: glasostinato, distbas, taiko, virvel, kör, kristall-/mässingsmelodi ----
def boss5():
    b = 0.4; T = 64 * b; L = Loop(T)
    prog = [(40, [64, 67, 71]), (41, [65, 69, 72]), (38, [62, 65, 69]), (40, [64, 67, 71])]
    mel = [(0, 64, 1.5), (1.5, 65, 0.5), (2, 67, 2), (4, 71, 1), (5, 69, 1), (6, 67, 2), (8, 69, 1.5), (9.5, 72, 0.5), (10, 69, 1), (11, 67, 1),
           (12, 65, 4), (16, 62, 1.5), (17.5, 65, 0.5), (18, 69, 2), (20, 67, 1), (21, 65, 1), (22, 64, 2), (24, 64, 3), (27, 65, 0.5),
           (27.5, 67, 0.5), (28, 71, 2), (30, 72, 1), (31, 71, 1)]
    for half in range(2):
        h0 = half * 32 * b
        for i, (r, ch) in enumerate(prog):
            t0 = h0 + i * 8 * b
            turn = [0, 7, 12, 7, 1, 7, 12, 13] if r == 40 else [0, 7, 12, 7, 0, 5, 12, 7]
            for k in range(32):
                L.add(t0 + k * b / 4, crys(m2f(r + 36 + turn[k % 8]), 0.35, 1.0, 7, 0.002), 0.35 if k % 2 else -0.35, 0.09 if k % 4 else 0.13)
            for bar_ in range(2):
                t1 = t0 + bar_ * 4 * b
                for tb in (0, 2): L.add(t1 + tb * b, taiko(1.0, 42), 0)
                L.add(t1 + 3.5 * b, taiko(0.5, 52, 0.8), 0.1)
                if half:
                    for tb in (1, 3): L.add(t1 + tb * b, snare(0.45), 0.1)
                for k8 in range(8):
                    L.add(t1 + k8 * b / 2, dbass(r + [0, 0, 12, 0, 7, 0, 12, 1][k8], b / 2 * 0.9, drive=2.6), 0, 0.5 if k8 in (0, 3, 6) else 0.34)
                    L.add(t1 + k8 * b / 2, shaker(0.25 if k8 % 2 else 0.12), 0.45)
            L.add(t0 - 0.05, nrm(choir([n - 12 for n in ch], 8 * b + 0.3, 0.25, 0.4, 1.0, F=AA, hmax=5000)), 0, 0.3 if half == 0 else 0.42)
        for t0, n, dd in mel:
            if half == 0: L.add(h0 + t0 * b, mel_tone(n + 12, dd * b, 0.35), 0.2)
            else: L.add(h0 + t0 * b, brass([n, n - 12], dd * b + 0.1, att=0.02, rel=0.12, drive=2.4, swell=0.2, hi_fc=3000), 0.2, 0.34)
        L.add(h0, crash_cym(0.35), 0.3)
        L.add(h0, shards(2.0, 40, 1.2, 3000, 9000) * 0.15, -0.3)
        for k in range(8): L.add(h0 + 30 * b + k * b / 4, snare(0.15 + 0.05 * k), -0.1)
        rs = tt(2 * b); L.add(h0 + 30 * b, svf(noise(2 * b), 400 * 10 ** (rs / (2 * b)), 3) * (rs / (2 * b)) ** 2, 0, 0.12)
    L.add(0, L.drone(28, 0.3, h=8, roll=1.4, cyc=4, hi=300))
    L.reverb(1.8, 0.25, 6000)
    write_aligned((L, 'boss5'))

# ---- boss6: c-moll (Cm Ab Fm G), 120 bpm, 16 takter = 32 s: tunga taiko, låga mässingsstötar, distbas, tremolostråkar, kör, vattenmuller ----
def boss6():
    b = 0.5; T = 64 * b; L = Loop(T)
    prog = [(36, [60, 63, 67]), (32, [60, 63, 68]), (29, [60, 65, 68]), (31, [59, 62, 67])]
    mel = [(0, 67, 2), (2, 68, 1), (3, 67, 1), (4, 63, 3), (7, 62, 1), (8, 63, 2), (10, 65, 1), (11, 63, 1), (12, 60, 4),
           (16, 65, 2), (18, 67, 1), (19, 68, 1), (20, 72, 3), (23, 70, 1), (24, 71, 2), (26, 67, 1), (27, 65, 1), (28, 62, 2), (30, 63, 1), (31, 62, 1)]
    L.add(0, L.bed(30, 250, 0.05, cyc=4)); L.add(0, L.drone(24, 0.3, h=8, roll=1.4, cyc=2, hi=250))
    for half in range(2):
        h0 = half * 32 * b
        for i, (r, ch) in enumerate(prog):
            t0 = h0 + i * 8 * b
            L.add(t0, strings(ch, 8 * b, att=0.2, rel=0.4, g=0.3 if half == 0 else 0.38, hi=2500, trem=8), -0.35)
            L.add(t0 - 0.05, dbass(r + 12, 8 * b, 0.3, drive=2.0, hi=500), 0)
            L.add(t0 - 0.2, nrm(choir([n - 12 for n in ch], 8 * b + 0.6, 0.4, 0.6, 1.0, F=OH if half == 0 else AA, hmax=4000)), 0.1, 0.35 if half == 0 else 0.45)
            for bar_ in range(2):
                t1 = t0 + bar_ * 4 * b
                for tb, g in ((0, 1.0), (0.75, 0.45), (1.5, 0.7), (2, 0.95), (3, 0.6), (3.5, 0.5)): L.add(t1 + tb * b, taiko(g, 38, 1.4), 0)
                for tb in (1, 3): L.add(t1 + tb * b, snare(0.3 if half else 0.18), 0.15)
                for tb in (0, 1.5): L.add(t1 + tb * b, brass([r + 12, r + 19], 0.45, att=0.01, rel=0.15, drive=3.0, swell=0.05, lo_fc=350, hi_fc=1800), -0.1, 0.35)
                for k8 in range(8): L.add(t1 + k8 * b / 2, dbass(r + 12 + [0, 0, 12, 0, 0, 7, 0, 12][k8], b / 2 * 0.85, drive=2.8), 0, 0.3 if k8 in (0, 3, 6) else 0.2)
        for t0, n, dd in mel:
            if half == 0: L.add(h0 + t0 * b, strings([n - 12, n], dd * b + 0.15, att=0.08, rel=0.2, g=0.3, hi=2000, vib=0.006), 0.2)
            else: L.add(h0 + t0 * b, brass([n, n - 12], dd * b + 0.1, att=0.02, rel=0.15, drive=2.5, swell=0.25, hi_fc=2800), 0.2, 0.38)
        L.add(h0, bell(36, 6.0, 0.35), 0); L.add(h0, crash_cym(0.3, 3.0), 0.3)
        L.add(h0 + 0.1, fftfilt(bubbles(2.0, 40, 100, 500, 1.5), 0, 1500) * 0.3, -0.4)
        for k in range(8): L.add(h0 + 30 * b + k * b / 4, taiko(0.25 + 0.07 * k, 60 - 3 * k, 0.6), 0)
    L.reverb(2.2, 0.25, 4000)
    write_aligned((L, 'boss6'))

# ---- abyss: d-moll mörk (Dm Bb/D Gm/D A7b9), 80 bpm, 16 takter = 48 s ----
# Tilltagande: drönare och glas från start, puls från takt 5, trummor och kör från takt 9, mässing och 16-delspuls från takt 13;
# en baklänges cymbal leder in i gongslaget på ettan, som klingar ut i den glesa början igen.
def abyss():
    b = 0.75; T = 64 * b; L = Loop(T)
    L.add(0, L.drone(26, 0.4, h=8, roll=1.4, cyc=2, hi=300) + L.drone(33, 0.18, h=6, roll=1.6, cyc=3, hi=300, det=0.003))
    L.add(0, L.bed(60, 400, 0.03, cyc=2)); L.add(0, L.bed(1500, 5000, 0.004, cyc=3))
    sec = [(0, [38, 50, 53, 57]), (16, [34, 50, 53, 58]), (32, [31, 50, 55, 58]), (48, [33, 49, 52, 58])]
    for s0, ch in sec:
        L.add(s0 * b - 1.0, strings(ch[1:], 16 * b + 2.0, att=2.5, rel=2.5, g=0.25 + 0.06 * (s0 // 16), hi=900, vib=0.004), -0.2)
        L.add(s0 * b - 0.5, strings([ch[0], ch[0] + 12], 16 * b + 1.0, att=1.5, rel=2.0, g=0.3, hi=500), 0.1)
    for k in range(16):
        t1 = k * 4 * b; I = k / 15; r = sec[k // 4][1][0]
        L.add(t1, drum(46, 0.6, 0.25 + 0.3 * I, 0.05, dec=9), 0); L.add(t1 + 0.28, drum(44, 0.6, 0.18 + 0.2 * I, 0.05, dec=10), 0)
        if k >= 4:
            for k8 in range(8): L.add(t1 + k8 * b / 2, mpulse(r + 12, 0.3, (0.2 + 0.25 * I) * (1.3 if k8 in (0, 3, 6) else 0.8)), 0.1)
        if k >= 8:
            for tb, g in ((0, 1.0), (1.5, 0.5), (2, 0.8), (2.75, 0.4), (3.5, 0.6)): L.add(t1 + tb * b, taiko(g * (0.4 + 0.4 * I), 40, 1.2), 0)
            L.add(t1 + 1 * b, snare(0.12 + 0.12 * I), 0.2); L.add(t1 + 3 * b, snare(0.12 + 0.12 * I), 0.2)
        if k >= 12:
            for k16 in range(16): L.add(t1 + k16 * b / 4, mpulse(r + 24, 0.15, 0.12 if k16 % 4 else 0.2), -0.4)
            for k16 in range(0, 16, 2): L.add(t1 + k16 * b / 4, shaker(0.15), 0.5)
    for s0, ch in sec[2:]:
        L.add(s0 * b - 0.3, nrm(choir(ch[1:], 16 * b + 0.6, 1.5, 1.5, 1.0, vib=4.5, F=OH if s0 == 32 else AA, hmax=3500)), 0, 0.3)
    L.add(48 * b, brass([45, 52], 8 * b, att=2.0, rel=0.8, drive=2.5, swell=3.0, lo_fc=300, hi_fc=1500), 0, 0.35)
    L.add(56 * b, brass([46, 53], 8 * b, att=1.5, rel=0.8, drive=2.8, swell=2.5, lo_fc=300, hi_fc=1700), 0, 0.4)
    mel = [(32, 62, 4), (36, 65, 2), (38, 67, 2), (40, 70, 4), (44, 69, 4), (48, 61, 4), (52, 64, 2), (54, 65, 2), (56, 64, 4), (60, 61, 4)]
    for t0, n, dd in mel: L.add(t0 * b, strings([n], dd * b + 0.3, att=0.3, rel=0.4, g=0.3, hi=1500, vib=0.006), 0.25)
    for _ in range(12): L.add(rng.uniform(0, T), glass(rng.choice([75, 80, 81, 86]), 3.0, 0.05, att=1.0, rel=1.5, det=0.004), rng.uniform(-0.8, 0.8))
    L.add(0, bell(26, 8.0, 0.5), 0); L.add(0, fftfilt(noise(6.0), 40, 300) * np.exp(-tt(6.0) * 0.8) * env(int(6.0 * SR), 0.005, 1) * 0.3, 0)
    L.add(T - 2 * b, crash_cym(0.35, 2 * b)[::-1], 0)
    L.reverb(4.0, 0.4, 3000, 0.03)
    write_aligned((L, 'abyss'))

# ---- sting_levelup: F-dur, 3,4 s: mässingsuppslag, klockspel, pauka och skimmer (slingar inte; svansen tonas ut) ----
def sting_levelup():
    B = stereo_sting(3.6)
    for i, n in enumerate((65, 69, 72)): sadd(B, 0.1 * i, brass([n, n + 12], 0.18, att=0.005, rel=0.06, drive=2.2, swell=0.05, hi_fc=3200), -0.2 + 0.2 * i, 0.45)
    sadd(B, 0.3, brass([53, 65, 69, 72, 77], 2.0, att=0.01, rel=1.0, drive=2.0, swell=0.3, hi_fc=3000), 0, 0.6)
    sadd(B, 0.3, taiko(0.7, 44, 1.6), 0); sadd(B, 0.3, crash_cym(0.25, 2.5), 0.3)
    for i, n in enumerate((89, 93, 96, 101, 105)): sadd(B, 0.3 + 0.06 * i, bar(m2f(n), 1.8, 0.2, dec=2), -0.5 + 0.25 * i)
    sadd(B, 0.35, nrm(choir([65, 69, 72, 77], 2.4, 0.4, 1.4, 1.0, F=AA, hmax=6000)), 0, 0.2)
    sadd(B, 0.3, shards(2.0, 40, 1.4, 5000, 9500), 0.4, 0.12)
    L = cut(verb(B[0], 1.6, 0.35, 6000), 3.4, 0.9); R = cut(verb(B[1], 1.6, 0.35, 6000), 3.4, 0.9)
    wr('sting_levelup', np.stack([L, R], 1).reshape(-1), 2)

crystal(); sunken(); boss5(); boss6(); abyss(); sting_levelup()
PY
python3 -I "$T/synth6.py" "$T"

# ---------- musik ----------
mus crystal -20 anull "$T/crystal.wav"
mus crystal_hi -23 anull "$T/crystal_hi.wav"
mus sunken -20 anull "$T/sunken.wav"
mus sunken_hi -23 anull "$T/sunken_hi.wav"
mus boss5 -19 anull "$T/boss5.wav"
mus boss6 -19 anull "$T/boss6.wav"
mus abyss -20 anull "$T/abyss.wav"
mus sting_levelup -17 anull "$T/sting_levelup.wav"

# ---------- ljudeffekter ----------
# vapen: harpunen, bumerangen, prismat
fx harpoon_fire "[0:a]$P[a];[1:a]$P,volume=0.5,highpass=f=300[b];[2:a]$P,asetrate=33075,aresample=44100,volume=0.4,adelay=15[c];[a][b][c]$(mix 3),atrim=0:0.9,afade=t=out:st=0.6:d=0.3[o]" "$T/s_harpoon.wav" "$S/Environment/air_burst.wav" "$S/Other/elastic_twang.wav"
fx harpoon_reel "[0:a]$P[a];[1:a]$P,volume=0.45,adelay=900[b];[a][b]$(mix 2),atrim=0:1.1,afade=t=out:st=0.95:d=0.15[o]" "$T/s_reel.wav" "$R/metalClick.ogg"
fx harpoon_hit "[0:a]$P[a];[1:a]$P,volume=0.7[b];[2:a]$P,volume=0.45,highpass=f=400[c];[3:a]$P,atrim=0:0.35,lowpass=f=2000,volume=0.35,adelay=20[d];[a][b][c][d]$(mix 4),atrim=0:0.6,afade=t=out:st=0.4:d=0.2[o]" "$T/s_harpoon_hit.wav" "$S/Materials/cork_stabbed.wav" "$I/impactMetal_medium_002.ogg" "$S/Combat and Gore/squelching_1.wav"
fx boomerang_throw "[0:a]$P[a];[1:a]$P,asetrate=35280,aresample=44100,lowpass=f=3000,volume=0.45[b];[a][b]$(mix 2),atrim=0:0.6,afade=t=out:st=0.4:d=0.2[o]" "$T/s_boom_throw.wav" "$S/Other/whoosh_2.wav"
TOP=-4 fxloop boomerang_whirr 1 0.3 "$P" "$T/s_whirr.wav"
fx boomerang_catch "[0:a]$P[a];[1:a]$P,volume=0.7[b];[2:a]$P,volume=0.5,adelay=10[c];[a][b][c]$(mix 3),atrim=0:0.45,afade=t=out:st=0.3:d=0.15[o]" "$T/s_boom_catch.wav" "$I/impactWood_light_002.ogg" "$R/handleSmallLeather.ogg"
fx prism_fire "[0:a]$P[a];[1:a]$P,highpass=f=1500,volume=0.3[b];[a][b]$(mix 2),atrim=0:0.95,afade=t=out:st=0.65:d=0.3[o]" "$T/s_prism.wav" "$S/Materials/glass_ping_small.wav"
fx prism_bounce "[0:a]$P[a];[1:a]$P,volume=0.5[b];[a][b]$(mix 2),atrim=0:0.5,afade=t=out:st=0.3:d=0.2[o]" "$T/s_prism_bounce.wav" "$I/impactGlass_light_001.ogg"
# fiender
fx golem "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,lowpass=f=1500,volume=0.35,adelay=100[b];[a][b]$(mix 2),atrim=0:1.6,afade=t=out:st=1.2:d=0.4[o]" "$T/s_golem.wav" "$S/Materials/stone_push_short.wav"
fx golem_step "[0:a]$P[a];[1:a]$P,volume=0.6,lowpass=f=2500[b];[2:a]$P,asetrate=33075,aresample=44100,volume=0.5,lowpass=f=1200[c];[a][b][c]$(mix 3),atrim=0:0.6,afade=t=out:st=0.4:d=0.2[o]" "$T/s_golem_step.wav" "$I/impactMining_001.ogg" "$S/Footsteps/foley_footstep_concrete_2.wav"
fx shardwisp "$P" "$T/s_shardwisp.wav"
fx sailor "[0:a]$P[a];[1:a]$P,atrim=0:1.5,lowpass=f=1500,volume=0.3[b];[a][b]$(mix 2),atrim=0:1.5,afade=t=out:st=1.1:d=0.4[o]" "$T/s_sailor.wav" "$S/Environment/gurgling.wav"
fx eel "[0:a]$P[a];[1:a]$P,volume=0.45,adelay=330[b];[a][b]$(mix 2),atrim=0:1.1,afade=t=out:st=0.8:d=0.3[o]" "$T/s_eel.wav" "$S/Environment/water_splashing.wav"
fx siren_song "$P" "$T/s_siren.wav"
fx crab "$P" "$T/s_crab.wav"
fx crab_clack "[0:a]$P[a];[1:a]$P,volume=0.35,highpass=f=600[b];[a][b]$(mix 2),atrim=0:0.35,afade=t=out:st=0.25:d=0.1[o]" "$T/s_crab_clack.wav" "$I/impactPlate_light_000.ogg"
TOP=-3 fx stalker "$P" "$T/s_stalker.wav"
fx witch "$P" "$T/s_witch.wav"
fx witch_hex "[0:a]$P[a];[1:a]$P,areverse,lowpass=f=3000,volume=0.35[b];[a][b]$(mix 2),atrim=0:1.4,afade=t=out:st=1.05:d=0.35[o]" "$T/s_hex.wav" "$S/Other/whoosh_2.wav"
fx witch_teleport "[0:a]$P[a];[1:a]$P,asetrate=52920,aresample=44100,volume=0.35,adelay=150[b];[a][b]$(mix 2),atrim=0:1.0,afade=t=out:st=0.7:d=0.3[o]" "$T/s_teleport.wav" "$S/Other/whoosh_1.wav"
# bossar
fx queen_roar "$P" "$T/s_queen_roar.wav"
fx queen_shatter "[0:a]$P[a];[1:a]$P,volume=0.6[b];[2:a]$P,volume=0.5,adelay=180[c];[3:a]$P,lowpass=f=1200,volume=0.45[d];[a][b][c][d]$(mix 4),atrim=0:2.8,afade=t=out:st=2.1:d=0.7[o]" "$T/s_queen_shatter.wav" "$I/impactGlass_heavy_000.ogg" "$I/impactGlass_heavy_003.ogg" "$S/Retro/explosion_large.wav"
fx queen_beam "$P" "$T/s_queen_beam.wav"
fx leviathan_roar "$P" "$T/s_lev_roar.wav"
fx leviathan_submerge "[0:a]$P[a];[1:a]$P,asetrate=30870,aresample=44100,lowpass=f=2500,volume=0.5[b];[2:a]$P,lowpass=f=1000,volume=0.35,adelay=400[c];[a][b][c]$(mix 3),atrim=0:2.6,afade=t=out:st=1.9:d=0.7[o]" "$T/s_lev_submerge.wav" "$S/Environment/water_splashing.wav" "$S/Environment/gurgling.wav"
fx leviathan_wave "[0:a]$P[a];[1:a]$P,asetrate=30870,aresample=44100,lowpass=f=4000,volume=0.5,adelay=1380[b];[a][b]$(mix 2),atrim=0:2.8,afade=t=out:st=2.1:d=0.7[o]" "$T/s_lev_wave.wav" "$S/Environment/water_splashing.wav"
# miljö: kristaller
fx crystal_hit "[0:a]$P[a];[1:a]$P,volume=0.5[b];[a][b]$(mix 2),atrim=0:0.5,afade=t=out:st=0.3:d=0.2[o]" "$T/s_crystal_hit.wav" "$I/impactGlass_light_000.ogg"
fx crystal_shatter "[0:a]$P[a];[1:a]$P,volume=0.6[b];[2:a]$P,volume=0.4,adelay=90[c];[a][b][c]$(mix 3),atrim=0:1.3,afade=t=out:st=0.9:d=0.4[o]" "$T/s_crystal_shatter.wav" "$I/impactGlass_heavy_002.ogg" "$I/impactGlass_medium_000.ogg"
TOP=-3 fx crystal_chime "$P" "$T/s_crystal_chime.wav"
TOP=-2 fx spikes_crystal "[0:a]$P[a];[1:a]$P,volume=0.45[b];[2:a]$P,asetrate=55125,aresample=44100,highpass=f=1500,volume=0.3[c];[a][b][c]$(mix 3),atrim=0:0.7,afade=t=out:st=0.45:d=0.25[o]" "$T/s_spikes_crystal.wav" "$I/impactGlass_medium_001.ogg" "$S/Weapons/sword_unsheath.wav"
# miljö: vatten och luft
fx swim_stroke "[0:a]$P[a];[1:a]$P,atrim=0:0.6,lowpass=f=1800,volume=0.25[b];[a][b]$(mix 2),atrim=0:0.7,afade=t=out:st=0.5:d=0.2[o]" "$T/s_swim_stroke.wav" "$S/Environment/water_splashing.wav"
fx dive "[0:a]$P[a];[1:a]$P,volume=0.6[b];[a][b]$(mix 2),atrim=0:1.3,afade=t=out:st=1.0:d=0.3[o]" "$T/s_dive.wav" "$S/Environment/water_splashing.wav"
TOP=-2 fx surface "[0:a]$P[a];[1:a]$P,volume=0.4,adelay=250[b];[2:a]$P,volume=0.3,adelay=650[c];[a][b][c]$(mix 3),atrim=0:1.0,afade=t=out:st=0.75:d=0.25[o]" "$T/s_surface.wav" "$S/Environment/water_splashing.wav" "$S/Environment/water_drop_medium.wav"
TOP=-2 fx gasp_air "$P" "$T/s_gasp_air.wav"
fx drown "[0:a]$P[a];[1:a]$P,atrim=0:1.6,lowpass=f=1200,volume=0.35[b];[a][b]$(mix 2),atrim=0:1.6,afade=t=out:st=1.2:d=0.4[o]" "$T/s_drown.wav" "$S/Environment/gurgling.wav"
TOP=-4 fxloop bubbles 2 0.5 "$P" "$T/s_bubbles.wav"
fx tide_rise "[0:a]$P[a];[1:a]$P,atrim=0:2.8,lowpass=f=1500,volume=0.3,afade=t=in:d=1.2[b];[a][b]$(mix 2),atrim=0:2.8,afade=t=out:st=2.2:d=0.6[o]" "$T/s_tide.wav" "$S/Environment/water_babbling_loop.wav"
TOP=-4 fxloop water_deep 4 0.8 "$P" "$T/s_water_deep.wav"
fx wreck_open "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,lowpass=f=2500,volume=0.5[b];[2:a]$P,volume=0.4[c];[3:a]$P,lowpass=f=1500,volume=0.45,adelay=150[d];[a][b][c][d]$(mix 4),atrim=0:1.6,afade=t=out:st=1.2:d=0.4[o]" "$T/s_wreck.wav" "$R/creak1.ogg" "$R/metalLatch.ogg" "$R/doorOpen_1.ogg"
fx tome_read "[0:a]$P[a];[1:a]$P,volume=0.6[b];[2:a]$P,volume=0.45,adelay=250[c];[a][b][c]$(mix 3),atrim=0:1.5,afade=t=out:st=1.1:d=0.4[o]" "$T/s_tome.wav" "$R/bookOpen.ogg" "$R/bookFlip2.ogg"
fx talent_altar "$P" "$T/s_altar.wav"
# erfarenhet, nivåer, talanger
fx levelup "$P" "$T/s_levelup.wav"
fx talent_pick "[0:a]$P[a];[1:a]$P,volume=0.5[b];[a][b]$(mix 2),atrim=0:0.8,afade=t=out:st=0.55:d=0.25[o]" "$T/s_talent_pick.wav" "$S/Card and Board/card_draw_1.wav"
TOP=-3 fx xp_tick "$P" "$T/s_xp_tick.wav"
# Avgrunden
fx abyss_descend "[0:a]$P[a];[1:a]$P,atrim=1:4.8,asetpts=PTS-STARTPTS,lowpass=f=1200,volume=0.5,afade=t=in:d=0.6[b];[a][b]$(mix 2),atrim=0:3.8,afade=t=out:st=3.0:d=0.8[o]" "$T/s_abyss.wav" "$S/Environment/ambient_wind.wav"

for f in "$M"/crystal.ogg "$M"/crystal_hi.ogg "$M"/sunken.ogg "$M"/sunken_hi.ogg "$M"/boss5.ogg "$M"/boss6.ogg "$M"/abyss.ogg "$M"/sting_levelup.ogg; do printf '%-36s %6.2f s %5d kB %6s LUFS\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" "$(( $(stat -c %s "$f") / 1024 ))" "$(lufs "$f")"; done
