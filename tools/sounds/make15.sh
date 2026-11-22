#!/bin/bash
# Ljud för Krypta version 18 ("Cirkusen och Djungeltemplet"): Den övergivna cirkusen (clownen med visselflöjt och fnitter,
# jonglörens käglor, styltgångarens träklonkar, knivkastaren, cirkuslejonets vrål, marionettens skrammel, cirkusdirektörens
# skratt genom megafonen och hans piska, tutan, ballonger som smäller, konfetti, falluckan, strålkastaren, knivkastarhjulet,
# lyckohjulet och cirkusens drönare), Djungeltemplet (ödlekrigaren, blåsrörsjägaren, apan, jaguarens sågande grymtningar,
# myggsvärmen, tempelväktaren och hans laserögon, den fjädrade ormens väs och vrål, guldidolen, pilfällan, pirayorna, lianerna och
# djungelns drönare), vapnen käglekastaren och blåsröret, och musiken circus (+ circus_hi), jungle (+ jungle_hi), boss19 och boss20.
# _hi-filerna är tidslinjerade intensitetslager: samma längd och samma taktnät som grundspåret, så att spelet kan tona in dem ovanpå.
# Samma konventioner som make2.sh-make14.sh: effekter mono 22 kHz Vorbis q2 toppnormaliserade till $TOP dBFS
# (standard -1, röster -2, slingor -4), musik stereo 44,1 kHz Vorbis q1 linjärt förstärkt till mål-LUFS,
# alla slingor bär LOOPLENGTH=<sampel> i Vorbis-kommentaren och effektslingorna vrids så att skarven
# hamnar där signalen är tyst och flack. Slingor: circus_hum och jungle_hum.
# Direktörens piska heter ringmaster_whip (whip_crack finns redan sedan tidigare versioner).
# Källor: assets/audio (Kenney-paketen CC0: impact-sounds, rpg-audio; 400 Sounds Pack CC0).
# Röster (fnitter, skratt, vrål, väs, skri, viskningar), kalliopen/positivet, tutor, piskan, djungelns insekter, fåglar och regn,
# slingorna och all musik syntetiseras med python3 + numpy (inbäddat nedan).
# Deterministiskt: fast frö för slumptalen och -fflags +bitexact (annars slumpar Ogg-muxern serienumret).
# Kör från katalogen där retrofps/ (repot) och assets/audio/ ligger: bash retrofps/tools/sounds/make15.sh
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


cat > "$T/synth15.py" <<'PY'
# Syntetiserade effekter och musik för Krypta version 18. Användning: python3 synth15.py <katalog>
# Musikslingan läggs med "wrap" (toner som går över slutet läggs på början), efterklangen är en cirkulär
# faltning och liggande toner/brus har ett helt antal perioder på slingan, så slingan är sömlös.
# Byggstenarna nedan är desamma som i make14.sh; nya står under "cirkus och djungel".
import sys, wave, re, subprocess, numpy as np
SR = 44100
OUT = sys.argv[1]
rng = np.random.default_rng(18018)
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



# ---- nya byggstenar: cirkus och djungel ----
def caldet(n):  # kalliopens fasta ostämning per tonhöjd (samma tabell varje gång, inte ny slump per anslag): upp till ±25 cent
    return 2 ** ((22 * np.sin(n * 7.31 + 1.3) + 8 * np.sin(n * 2.17)) / 1200 / 1.2)

def calliope(n, d, g=1.0, att=0.015, rel=0.07, wob=0.004, air=0.1):  # ångkalliope/positiv: visselpipor (stark grundton, svaga
    # övertoner) i par där den andra pipan är lite falsk, en fast ostämning per ton, ett fladdrande ångvibrato, luft och pipans "chiff"
    t = tt(d); f = m2f(n) * caldet(n) * (1 + wob * np.sin(2 * np.pi * 7.5 * t + rng.uniform(0, 6)))
    ph = phase(f); y = np.sin(ph) + 0.32 * np.sin(2 * ph) + 0.16 * np.sin(3 * ph) + 0.05 * np.sin(4 * ph)
    y += 0.55 * np.sin(phase(f * 1.007) + rng.uniform(0, 6))
    br = nrm(fftfilt(noise(d), m2f(n) * 0.8, min(m2f(n) * 5, 10000))) * air * (1 + 2.5 * np.exp(-t * 30))
    return (y / 1.9 + br) * env(len(t), att, rel) * g

def honkhorn(f=330, d=0.3, g=1.0):  # tuta (gummiblåsa med tunga): surrig, nasal ton som stiger när blåsan kläms och sjunker när den släpper
    t = tt(d); f0 = f * np.interp(t, [0, 0.04, d * 0.7, d], [0.78, 1.0, 1.02, 0.84]) * (1 + 0.008 * lpnoise(d, 30))
    ph = phase(f0); y = sawp(ph, 7000, f0.max()) + 0.6 * sum(np.sin(k * ph) / k for k in (1, 3, 5, 7, 9))
    y = reson(y, [(950, 160, 1), (1900, 260, 0.8), (3100, 420, 0.4)]) + 0.15 * fftfilt(y, 60, 500)
    return np.tanh(2.5 * nrm(y)) * env(len(t), 0.015, 0.07) * g

def whip(g=1.0):  # piska: ett snärtande svisch som accelererar och en överljudssmäll (mycket kort, ljus knall)
    d = 0.6; y = np.zeros(int(d * SR)); ds = 0.22
    place(y, 0, swish(ds, 400, 3500, 2.0) * np.linspace(0.2, 1, int(ds * SR)) ** 2, 0.9)
    place(y, ds - 0.01, crack(0.06, 1.0, 2000)); place(y, ds - 0.01, nrm(fftfilt(noise(0.012), 3000, 11000)), 0.9)
    return y * g

def crowdlaugh(d, n=6, g=1.0):  # spöklik publik som skrattar: flera avlägsna skratt i olika tonhöjd, mörkt filtrerade och utsmetade
    y = np.zeros(int(d * SR))
    for i in range(n):
        f = rng.uniform(140, 330); ns = int(rng.integers(4, 7))
        st = [(f * rng.uniform(0.95, 1.06), rng.uniform(0.08, 0.12)) for _ in range(ns - 1)] + [(f, 0.3)]
        l = fftfilt(laugh(st, AA if i % 2 else HA, AA, 0.9, 0.7, 0.3, 0.5, 1.5, 0.3, 10), 200, 2200)
        place(y, rng.uniform(0, max(0.01, d - len(l) / SR)), l, rng.uniform(0.4, 1))
    return y * g

def cicada(d, f=4800, rate=80, g=1.0):  # cikada: ljust bandbrus som pulserar snabbt (rate Hz)
    t = tt(d); y = nrm(reson(noise(d), [(f, f * 0.06, 1), (f * 1.5, f * 0.08, 0.35)]))
    return y * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t)) ** 3 * g

def frog(f=180, n=3, g=1.0):  # groda: kväkande stötar (surrig ton som hackas av en snabb puls)
    y = np.zeros(int((n * 0.16 + 0.1) * SR))
    for k in range(n):
        dd = 0.1; t = tt(dd); ph = phase(f * np.interp(t, [0, dd], [1.0, 0.9]))
        c = reson(sawp(ph, 4000, f), [(600, 120, 1), (1400, 250, 0.5)]) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 45 * t)))
        place(y, k * 0.16, nrm(c) * env(len(t), 0.005, 0.03))
    return y * g

def laser(d, f, g=1.0):  # laserstråle: ett gällt, surrande pip (sågtand + ren ton med ringmodulering) och ett fräs
    t = tt(d); f = np.broadcast_to(np.asarray(f, float), t.shape)
    y = buzz(d, f, 1.0, 6000) * (0.7 + 0.3 * np.sin(2 * np.pi * 60 * t)) + np.sin(phase(f * 12)) * (0.5 + 0.5 * np.sin(2 * np.pi * 35 * t)) * 0.5
    return (nrm(y) + nrm(fftfilt(noise(d), 3000, 10000)) * 0.15) * g

NAS = [(600, 90, 1.0), (1500, 150, 0.7), (2700, 220, 0.4), (3500, 300, 0.2)]  # nasalt "e"/"i"

# ================= effekter =================
# ---- fiender: Cirkusen ----
def clown():  # clownen: en visselflöjt som glider uppåt, ett hysteriskt, nasalt fnitter ("hi-hi-hi-hiii") och stora skor som gnisslar
    d = 1.6; y = np.zeros(int(d * SR)); ds = 0.32; ts = tt(ds)
    sw = np.sin(phase(np.interp(ts, [0, ds], [650, 1900]) * (1 + 0.012 * np.sin(2 * np.pi * 6 * ts)))) + nrm(fftfilt(noise(ds), 800, 4000)) * 0.15
    place(y, 0, sw * env(len(ts), 0.015, 0.05), 0.45)
    place(y, 0.36, giggle([(420, 0.07), (450, 0.07), (480, 0.07), (520, 0.07), (560, 0.07), (610, 0.35)], NAS, 0.9, 1.15, 0.4))
    for t0 in (0.12, 1.25): place(y, t0, squeal(0.08, 2600, 3100), 0.12)
    return cut(verb(y, 0.6, 0.2, 7000), d, 0.3)

def juggler():  # jonglören: käglorna som snurrar i luften (svischande varv), fångsterna i handen (trä mot handflata) och ett muntert,
    # nynnat "pa-pa-pam"
    d = 1.5; y = np.zeros(int(d * SR))
    for k in range(4): place(y, k * 0.2, swish(0.18, 700, 1700, 3.0), 0.3); place(y, k * 0.2 + 0.17, logdrum(700 + 60 * (k % 2), 1.0, 0.12), 0.35)
    place(y, 0.85, sing([(0, 57, 0.11), (0.13, 62, 0.11), (0.26, 61, 0.25)], MM, 1.0, 0.0, 0.03, 4000, 0.9, 0.03), 0.4)
    return cut(verb(y, 0.5, 0.18, 7000), d, 0.3)

def stiltwalker():  # styltgångaren: två tunga, ihåliga träklonkar från styltorna, träet som knarrar och ett djupt "hoo-ooh" långt där uppe
    d = 1.8; y = np.zeros(int(d * SR))
    for t0, f in ((0, 160), (0.55, 140)): place(y, t0, logdrum(f, 1.0, 0.4), 0.7); place(y, t0, thud(60, 0.4, 0.1), 0.4)
    place(y, 0.1, creak(0.6, 10, 20, 260), 0.25)
    dv = 0.9; tv = tt(dv)
    place(y, 0.75, growl(dv, np.interp(tv, [0, 0.3, dv], [95, 110, 80]), OH, 0.3, 0.2, 3500, 1.4) * env(len(tv), 0.08, 0.4), 0.45)
    return cut(verb(y, 1.0, 0.3, 5000), d, 0.35)

def knifethrower():  # knivkastaren: knivar som dras ur bältet (stål som skrapar och klingar), ett skarpt "hah!" och ett svisch
    d = 1.2; y = np.zeros(int(d * SR))
    place(y, 0, metalglide(0.25, 3500, 5000, 1.0, 0.01) * np.sin(np.pi * tt(0.25) / 0.25), 0.3)
    place(y, 0.25, ting(0.4, 3200, 0.5, 1.2)); place(y, 0.3, ting(0.4, 3700, 0.4, 1.3))
    dh = 0.25; th = tt(dh)
    place(y, 0.45, growl(dh, np.interp(th, [0, dh], [180, 140]), HA, 0.3, 0.6, 5000, 2.0) * env(len(th), 0.01, 0.15), 0.6)
    place(y, 0.72, swish(0.25, 1500, 5000, 3.0), 0.3)
    return cut(verb(y, 0.5, 0.18, 7000), d, 0.3)

def lion():  # cirkuslejonet: ett långt, djupt, mullrande vrål som sväller och dör ut i två grymtningar
    d = 2.0; y = np.zeros(int(d * SR)); dl = 1.3; tl = tt(dl)
    F = [(np.interp(tl, [0, 0.4, dl], [400, 700, 350]), 120, 1), (1000, 150, 0.6), (2300, 200, 0.2)]
    place(y, 0, growl(dl, np.interp(tl, [0, 0.35, dl], [70, 95, 55]), F, 0.8, 0.6, 3500, 2.8) * env(len(tl), 0.1, 0.5), 0.9)
    for t0 in (1.35, 1.65):
        dg = 0.2; tg = tt(dg); place(y, t0, growl(dg, np.interp(tg, [0, dg], [65, 50]), OH, 0.8, 0.5, 3000, 2.0) * env(len(tg), 0.02, 0.12), 0.4)
    y += nrm(fftfilt(noise(d), 30, 150)) * np.interp(tt(d), [0, 0.3, 1.2, d], [0, 1, 0.5, 0]) * 0.15
    return cut(verb(y, 0.9, 0.25, 4500), d, 0.35)

def marionette():  # marionetten: trälemmar som skramlar och klapprar, trådar som gnisslar och tre ostämda speldosetoner
    d = 1.6; y = np.zeros(int(d * SR))
    for _ in range(14): place(y, rng.uniform(0, 0.7) ** 1.2, clack(rng.uniform(900, 1800), 1, rng.uniform(200, 350), 0.05), rng.uniform(0.3, 0.9))
    for t0 in (0.05, 0.4): place(y, t0, bow_creak(0.35, 30, 60, ((2200, 1, 200), (3600, 0.6, 250))), 0.12)
    for i, n in enumerate((76, 75, 71)): place(y, 0.75 + 0.22 * i, wbox(n, 1.0, 1.0, 0.01, 0.01), 0.25)
    return cut(verb(y, 0.8, 0.25, 7000), d, 0.35)

# ---- fiender: Djungeltemplet ----
def lizardman():  # ödlekrigaren: ett väsande, rasslande fräs ur strupen, ett kort skall och spjutskaftet som slår mot skölden
    d = 1.3; y = np.zeros(int(d * SR)); dh = 0.55; th = tt(dh)
    place(y, 0, nrm(fftfilt(noise(dh), 2500, 9000)) * (0.6 + 0.4 * (0.5 + 0.5 * np.sin(2 * np.pi * 26 * th))) * np.interp(th, [0, 0.05, dh], [0, 1, 0]), 0.45)
    dg = 0.3; tg = tt(dg)
    place(y, 0.42, growl(dg, np.interp(tg, [0, dg], [170, 120]), EH, 0.7, 0.8, 4000, 2.4) * env(len(tg), 0.01, 0.15), 0.55)
    place(y, 0.85, logdrum(220, 1.0, 0.3), 0.5); place(y, 0.85, thud(90, 0.3, 0.1), 0.4)
    return cut(verb(y, 0.5, 0.18, 6000), d, 0.3)

def blowgunner():  # blåsrörsjägaren: en viskad, hotfull ramsa ur skuggorna, löv som prasslar och ett kort, skarpt andetag in
    d = 1.4; y = np.zeros(int(d * SR)); dw = 0.8
    place(y, 0, whisper(dw, (OH, AA, EE), 6, 1.0, 0.6) * env(int(dw * SR), 0.05, 0.2), 0.5)
    place(y, 0.85, puff(0.18, 800, 4000, 1.0, 0.7), 0.35); place(y, 0.1, rustle(1.2, None, 1500, 7000, 300), 0.12)
    return cut(verb(y, 0.4, 0.15, 7000), d, 0.3)

def monkey():  # apan: ett gällt, upphetsat "oo-oo-aa-aa!" som stiger till ett skri, och tänder som skallrar
    d = 1.3; y = np.zeros(int(d * SR)); t0 = 0.0
    for f, dd, F in ((420, 0.12, OH), (480, 0.12, OH), (700, 0.15, AA), (820, 0.25, AA)):
        k = tt(dd); f0 = f * np.interp(k, [0, dd * 0.4, dd], [0.85, 1.1, 0.9]); Fs = [(fc * 1.6, bw * 1.5, a) for fc, bw, a in F]
        v = np.tanh(2.2 * nrm(voice(f0, Fs, 9000, 0.03, 0.6)) + 0.4 * nrm(reson(noise(dd), Fs))) * env(len(k), 0.01, dd * 0.4)
        place(y, t0, v, 0.8); t0 += dd + 0.04
    for _ in range(6): place(y, 0.85 + rng.uniform(0, 0.25), clack(rng.uniform(2000, 3000), 1, 400, 0.03), 0.2)
    return cut(verb(y, 0.5, 0.18, 7000), d, 0.3)

def jaguar():  # jaguaren: det sågande, hostande grymtandet (fem korta, djupa stötar på in- och utandning) över ett lågt morr
    d = 1.6; y = np.zeros(int(d * SR))
    for i in range(5):
        dd = 0.16; k = tt(dd); f0 = np.interp(k, [0, dd], [100, 75]) * (0.88 if i % 2 else 1.0)
        place(y, 0.03 + i * 0.24, growl(dd, f0, [(500, 120, 1), (1100, 150, 0.6), (2400, 220, 0.2)], 0.9, 0.9, 3000, 2.6) * env(len(k), 0.01, 0.1), 0.85 - 0.08 * i)
    dm = 1.4; tm = tt(dm); place(y, 0.05, growl(dm, np.full(len(tm), 48.0), OH, 0.9, 0.4, 1500, 1.5) * env(len(tm), 0.2, 0.4), 0.2)
    return cut(verb(y, 0.6, 0.2, 5000), d, 0.3)

def mosquito():  # myggsvärmen: gälla, svävande surr från tre myggor som kommer och går (dopplerglid)
    d = 1.2; t = tt(d); y = np.zeros(len(t))
    for i, (f, p) in enumerate(((560, 0.0), (610, 0.4), (520, 0.9))):
        fr = f * (1 + 0.06 * np.sin(2 * np.pi * (1.3 + 0.4 * i) * t + p * 6) + 0.01 * lpnoise(d, 20))
        y += buzz(d, fr, 1.0, 6000) * np.clip(0.5 + 0.5 * np.sin(2 * np.pi * (0.7 + 0.3 * i) * t + p * 5), 0.1, 1)
    return fftfilt(y, 300, 7000) * env(len(t), 0.03, 0.25)

def templeguardian():  # tempelväktaren: sten som skrapar när statyn vaknar, ett djupt, dånande "ommm" ur masken och en stigande,
    # surrande laddning i ögonen
    d = 2.0; y = np.zeros(int(d * SR)); place(y, 0, stonescrape(0.8, 150, 1.0) * env(int(0.8 * SR), 0.03, 0.3), 0.5)
    dv = 1.4; tv = tt(dv)
    place(y, 0.2, nrm(voice(65.0 * (1 + 0.01 * np.sin(2 * np.pi * 3 * tv)), MM, 3000, 0.005, 0.8)) * env(len(tv), 0.3, 0.5), 0.45)
    dc = 0.9; tc = tt(dc); place(y, 0.95, buzz(dc, 200 * 2 ** (2 * tc / dc), 1.0, 5000) * (tc / dc) ** 2 * env(len(tc), 0.01, 0.1), 0.2)
    return cut(verb(y, 1.2, 0.3, 5000), d, 0.4)

# ---- bossar ----
def ringmaster_laugh():  # cirkusdirektören skrattar: ett teatraliskt, djupt "HA-HA-HA-HA-HAAA" genom en plåttratt (megafon) som ekar
    # i tältet, och en spöklik publik som skrattar med
    d = 3.0; y = np.zeros(int(d * SR))
    l = laugh([(120, 0.16), (125, 0.16), (130, 0.16), (140, 0.16), (150, 0.7)], HA, AA, 0.9, 0.65, 0.55, 0.4, 2.2, 0.45)
    l = reson(l, [(900, 300, 1), (1800, 400, 0.8), (3000, 500, 0.4)]) + 0.3 * l
    place(y, 0, l); e = fftfilt(y, 300, 3000); place(y, 0.3, e, 0.3); place(y, 0.6, e, 0.12)
    place(y, 0.4, crowdlaugh(2.4, 6), 0.12)
    return cut(verb(y, 1.6, 0.35, 4500), d, 0.5)

def ringmaster_whip():  # direktörens piska: ett snärtande svisch och en skarp smäll som ekar mellan tältduken och manegen
    d = 1.0; y = np.zeros(int(d * SR)); place(y, 0, whip())
    e = y.copy(); place(y, 0.12, fftfilt(e, 600, 5000), 0.35); place(y, 0.25, fftfilt(e, 800, 3500), 0.15)
    y = np.tanh(2.5 * nrm(y))  # mjuk mättning (som kanonen i make14.sh): smällen tar inte hela toppnormaliseringen
    return cut(verb(y, 1.0, 0.25, 7000), d, 0.3)

def serpent_hiss():  # den fjädrade ormen väser: ett långt, tryckande väs som sväller, fjädrar och fjäll som rasslar och en låg ton under
    d = 2.2; t = tt(d); a = np.interp(t, [0, 0.15, 1.4, d], [0, 1, 0.7, 0])
    y = nrm(fftfilt(noise(d), 2500, 10000)) * a * (1 + 0.2 * lpnoise(d, 20)) + nrm(fftfilt(noise(d), 1000, 3000)) * a * 0.3
    y += rustle(d, a, 2000, 8000, 900) * 0.25 + nrm(reson(noise(d), [(110, 15, 1), (220, 30, 0.5)])) * a * 0.25
    return cut(verb(y, 1.0, 0.25, 6000), d, 0.4)

def serpent_roar():  # ormen ryter: ett gigantiskt, skrovligt vrål med en väsande kant som går över i ett väs, och jorden som mullrar
    d = 2.6; t = tt(d); y = np.zeros(len(t)); dr = 1.5; tr = tt(dr)
    F = [(np.interp(tr, [0, 0.4, dr], [380, 620, 300]), 120, 1), (950, 160, 0.6), (2200, 220, 0.25)]
    place(y, 0, growl(dr, np.interp(tr, [0, 0.4, dr], [55, 78, 42]), F, 0.85, 0.7, 3000, 3.0) * env(len(tr), 0.08, 0.5), 0.8)
    place(y, 0.1, nrm(fftfilt(noise(2.2), 3000, 10000)) * np.interp(tt(2.2), [0, 0.6, 1.4, 2.2], [0, 0.6, 1, 0]), 0.3)
    y += nrm(low_rumble(d, 38)) * np.interp(t, [0, 0.3, 1.8, d], [0, 1, 0.6, 0]) * 0.35 + debris(d, 30, 300, 2500, 1.6) * 0.15
    return cut(verb(y, 1.4, 0.3, 4000), d, 0.45)

# ---- cirkusen: tuta, ballonger, konfetti, fallucka, strålkastare, knivhjul, lyckohjul ----
def honk():  # tutan: två klämda gummiblåsetutor ("tut-tuuut"), surriga och nasala
    d = 0.9; y = np.zeros(int(d * SR)); place(y, 0, honkhorn(340, 0.2), 0.9); place(y, 0.28, honkhorn(330, 0.42), 1.0)
    return cut(verb(y, 0.4, 0.12, 6000), d, 0.2)

def balloon_pop():  # ballongen smäller: en skarp, bred knall, en kort, dov luftstöt och gummit som fladdrar
    d = 0.5; y = np.zeros(int(d * SR)); place(y, 0, crack(0.08, 1.0, 800)); place(y, 0, thud(110, 0.15, 0.0), 0.5)
    place(y, 0.01, flutter(0.12, 60, 30, 1500, 6000), 0.15)
    return cut(verb(y, 0.4, 0.15, 8000), d, 0.15)

def confetti():  # konfetti: en liten partysmäll, papperslappar som fladdrar ned och små glittrande plingar
    d = 1.4; y = np.zeros(int(d * SR)); place(y, 0, crack(0.05, 0.8, 1500)); place(y, 0, puff(0.15, 600, 5000, 1.0, 0.1), 0.4)
    place(y, 0.03, flutter(1.1, 50, 15, 2000, 8000) * np.interp(tt(1.1), [0, 0.1, 1.1], [0, 1, 0]), 0.35)
    place(y, 0.05, glitter(1.0, 10, 88, 103), 0.25)
    return cut(verb(y, 0.5, 0.15, 9000), d, 0.3)

def trapdoor():  # falluckan: regeln som slår upp (metalliskt klack, direkt i början), luckan som svänger ned med gnisslande gångjärn
    # och slår i väggen därunder, och ett ihåligt eko ur gropen
    d = 1.3; y = np.zeros(int(d * SR)); place(y, 0, clack(1500, 1.0, 250, 0.05), 0.8); place(y, 0, ting(0.2, 2400, 0.3, 2.0))
    place(y, 0.04, creak(0.3, 30, 60, 500), 0.3); place(y, 0.3, thud(70, 0.6, 0.3), 0.8); place(y, 0.3, logdrum(150, 1.0, 0.4), 0.4)
    e = y.copy(); place(y, 0.18, fftfilt(e, 100, 1200), 0.25)
    return cut(verb(y, 1.2, 0.35, 3500), d, 0.35)

def spotlight_on():  # strålkastaren tänds: ett tungt relä som slår till ("ka-klunk"), båglampan som tänds med ett fräs och ett surr på 120 Hz
    d = 1.2; y = np.zeros(int(d * SR)); place(y, 0, clack(800, 1.0, 150, 0.08), 0.8); place(y, 0.02, thud(80, 0.25, 0.0), 0.4)
    place(y, 0.04, crackle(0.15, 60, 2000, 9000), 0.4)
    dh = 1.1; th = tt(dh); place(y, 0.06, buzz(dh, 120, 1.0, 3000) * np.interp(th, [0, 0.05, 0.6, dh], [0, 1, 0.5, 0]), 0.25)
    return cut(verb(y, 0.8, 0.25, 6000), d, 0.3)

def knifewheel():  # knivkastarhjulet: spärren som slår, fyra knivar som skjuts ut med ett metalliskt "schwing" och viner iväg
    d = 0.8; y = np.zeros(int(d * SR)); place(y, 0, clack(1800, 1.0, 300), 0.6)
    for k in range(4): place(y, 0.01 + 0.012 * k, ting(0.35, 2800 + 350 * k, 0.35, 1.5)); place(y, 0.02 + 0.01 * k, swish(0.35, 3000, 1200, 4.0), 0.25)
    return cut(verb(y, 0.5, 0.18, 7000), d, 0.25)

def prizewheel():  # lyckohjulet: hjulet som rycks igång, spärrens klick som saktar in och en klockring när det stannar
    d = 2.7; y = np.zeros(int(d * SR)); place(y, 0, swish(0.3, 300, 900, 2.0), 0.3)
    place(y, 0.03, ratchet(2.0, 22, 3, 2600, 2200), 0.7)
    place(y, 2.1, ting(0.55, 2650, 0.5, 0.6)); place(y, 2.1, bar(m2f(84), 0.55, 0.4, dec=2.0))
    return cut(verb(y, 0.6, 0.2, 7000), d, 0.3)

# ---- templet: idol, pilfälla, pirayor, lianer ----
def idol_take():  # guldidolen tas: en gyllene, skimrande klang när idolen lyfts, ett klick i golvet och sedan ett hotfullt, malande
    # muller när templet vaknar
    d = 2.4; y = np.zeros(int(d * SR)); place(y, 0, crys(m2f(76), 1.2, 0.4, 2.0))
    for i, n in enumerate((64, 67, 71, 74)): place(y, 0.02 + 0.06 * i, bar(m2f(n + 12), 1.0, 0.2, dec=2.5))
    place(y, 0.05, glitter(0.8, 12, 88, 100), 0.25); place(y, 0.85, clack(600, 1, 150, 0.06), 0.5)
    dr = 1.4; tr = tt(dr); a = np.interp(tr, [0, 0.3, dr], [0, 1, 0])
    place(y, 0.9, stonescrape(dr, 110, 1.0) * a, 0.5); place(y, 0.9, nrm(low_rumble(dr)) * a, 0.4)
    return cut(verb(y, 1.0, 0.3, 5000), d, 0.35)

def dart_trap():  # pilfällan: en stenplatta som klickar, ett snabbt pust ur idolens mun och pilen som visslar förbi
    d = 0.7; y = np.zeros(int(d * SR)); place(y, 0, clack(1100, 1.0, 300, 0.05), 0.6); place(y, 0.03, puff(0.1, 1000, 6000, 1.0, 0.1), 0.6)
    place(y, 0.06, ric(3800, 2600, 0.35, 0.3, 0.0)); place(y, 0.06, swish(0.3, 5000, 2500, 3.0), 0.2)
    return cut(verb(y, 0.3, 0.1, 8000), d, 0.15)

def piranha():  # pirayorna: vatten som piskas upp och snabba, vassa tandbett som klipper
    d = 0.65; y = np.zeros(int(d * SR)); place(y, 0, splat(0.25), 0.5); place(y, 0, nrm(fftfilt(noise(0.4), 600, 6000)) * np.exp(-tt(0.4) * 10), 0.35)
    place(y, 0.01, bubbles(0.5, 15, 600, 2000), 0.25)
    for t0 in (0.0, 0.11, 0.19, 0.3): place(y, t0, jaw(), 0.5); place(y, t0, clack(rng.uniform(2500, 3500), 1, 500, 0.02), 0.4)
    return cut(verb(y, 0.3, 0.1, 7000), d, 0.15)

def vine_rustle():  # lianerna: löv som prasslar och tjocka rankor som spänns och knarrar
    d = 0.9; t = tt(d); a = np.interp(t, [0, 0.04, 0.5, d], [0, 1, 0.5, 0])
    y = rustle(d, a, 1500, 7000, 700) * 0.6; place(y, 0.08, creak(0.55, 8, 20, 350) * env(int(0.55 * SR), 0.05, 0.2), 0.35)
    return cut(verb(y, 0.3, 0.12, 7000), d, 0.2)

# ---- vapen: käglekastaren och blåsröret ----
def pin_throw():  # käglekastaren: ett snabbt kast (svisch) och tre käglor som snurrar iväg med ett vinande "vupp-vupp-vupp"
    d = 0.7; y = np.zeros(int(d * SR)); place(y, 0, swish(0.15, 600, 2500, 2.0), 0.5); ds = 0.6; ts = tt(ds)
    for k in range(3):
        spin = (0.5 + 0.5 * np.sin(phase(np.full(len(ts), 16.0 + 3 * k)))) ** 2
        place(y, 0.03 * k, nrm(svf(noise(ds), 900 + 300 * k, 2.5)) * spin * np.interp(ts, [0, 0.05, ds], [0, 1, 0]), 0.3)
    return cut(verb(y, 0.35, 0.12, 6000), d, 0.2)

def pin_bounce():  # käglan studsar: ett ihåligt, trähårt "tock" (lönnkägla mot sten) med en kort klang
    d = 0.35; y = np.zeros(int(d * SR)); place(y, 0, logdrum(520, 1.0, 0.3)); place(y, 0, clack(1900, 0.6, 250, 0.05))
    place(y, 0, marimba(79, 0.3, 0.25))
    return cut(verb(y, 0.3, 0.12, 7000), d, 0.12)

def blowgun_fire():  # blåsröret: ett kort, tyst "pfft" (en luftstöt genom röret) och pilen som susar iväg
    d = 0.4; y = np.zeros(int(d * SR)); place(y, 0, puff(0.08, 500, 3500, 1.0, 0.15), 0.8)
    place(y, 0.003, nrm(fftfilt(noise(0.03), 1500, 5000)) * np.exp(-tt(0.03) * 120), 0.5); place(y, 0.04, swish(0.25, 4000, 2000, 4.0), 0.25)
    return cut(verb(y, 0.25, 0.08, 7000), d, 0.12)

def blowgun_hit():  # giftpilen träffar: ett litet, torrt "tschk" när spetsen sätter sig, en dallrande pil och ett giftigt litet fräs
    d = 0.45; y = np.zeros(int(d * SR)); place(y, 0, clack(2200, 1, 400, 0.03), 0.6); place(y, 0, splat(0.08), 0.3)
    place(y, 0.01, twang(900, 0.25, 1.5, 25), 0.15); place(y, 0.05, fizz(0.3, 100) * np.interp(tt(0.3), [0, 0.05, 0.3], [0, 1, 0]), 0.2)
    return cut(verb(y, 0.25, 0.08, 8000), d, 0.12)

def laser_eye():  # laserögonen: en stigande, gäll laddning (varningen) och en surrande, fräsande stråle som pulserar och slocknar
    d = 1.4; y = np.zeros(int(d * SR)); dc = 0.4; tc = tt(dc)
    place(y, 0, np.sin(phase(400 * 2 ** (3 * tc / dc))) * (tc / dc) ** 2, 0.3)
    db = 0.95; tb = tt(db); place(y, 0.4, laser(db, 180 * (1 + 0.03 * np.sin(2 * np.pi * 30 * tb))) * env(len(tb), 0.01, 0.15), 0.6)
    place(y, 0.4, crackle(db, 150, 2000, 9000), 0.2)
    return cut(verb(y, 0.5, 0.18, 7000), d, 0.25)

# ---- biomernas drönare ----
def circus_hum(d=4.8):  # den övergivna cirkusen (slinga 4 s): tältduken som andas i vinden, glödlampsgirlanger som surrar på 120 Hz
    # (smalbandigt brus på multiplar av 40 Hz, så att överlappningen inte svävar och game.js-skarven 25 ms före slutet hamnar i fas),
    # ett rep som knarrar och, mitt i slingan, en avlägsen ostämd kalliopeton och ett svagt, spöklikt fnitter
    y = nrm(fftfilt(noise(d), 60, 600)) * (0.6 + 0.4 * lpnoise(d, 0.6)) * 0.35
    y += nrm(fftfilt(noise(d), 200, 1400)) * np.clip(lpnoise(d, 2), 0, 1) ** 2 * 0.1
    y += nrm(reson(noise(d), [(120 * k, 0.8, 1 / k ** 0.8) for k in range(1, 26)])) * 0.12
    place(y, 1.2, creak(0.8, 4, 9, 300) * env(int(0.8 * SR), 0.25, 0.3), 0.1)
    place(y, 2.0, fftfilt(calliope(64, 0.9, 1.0, 0.15, 0.4), 200, 2500), 0.05); place(y, 2.45, fftfilt(calliope(63, 0.8, 1.0, 0.15, 0.4), 200, 2500), 0.04)
    place(y, 2.9, fftfilt(giggle([(380, 0.07), (400, 0.07), (430, 0.25)], NAS, 1.0, 1.1, 0.5), 300, 2500), 0.03)
    return verb(y, 1.2, 0.3, 4500, tail=False)

def jungle_hum(d=4.8):  # djungeln (slinga 4 s): ett täckande cikadasurr som pulserar 80 gånger i sekunden (helt antal perioder, i fas
    # med game.js-skarven), syrsor på 4,2 kHz som pulserar på 40 Hz, löv som prasslar i vinden, droppar från lövkronan och, mitt i
    # slingan, några fåglar och en groda
    t = tt(d); y = cicada(d, 4800, 80, 0.12) * (0.8 + 0.2 * lpnoise(d, 0.5)) + cicada(d, 6200, 120, 0.06)
    y += nrm(reson(noise(d), [(4200, 40, 1)])) * (0.5 + 0.5 * np.sin(2 * np.pi * 40 * t)) ** 4 * 0.05
    y += rustle(d, 0.5 + 0.5 * lpnoise(d, 0.8), 1200, 6000, int(d * 250)) * 0.08 + nrm(fftfilt(noise(d), 80, 600)) * 0.08
    for _ in range(10): place(y, rng.uniform(0.9, 3.9), bubble(rng.uniform(1500, 2600), 0.03, 1, 1.2), rng.uniform(0.03, 0.08))
    for t0, f, k, dd in ((1.2, 3300, 0, 0.12), (1.36, 3500, 0, 0.1), (2.3, 2400, 2, 0.35), (3.1, 2900, 1, 0.12)): place(y, t0, bird(f, dd, 1.0, k), 0.07)
    place(y, 2.0, frog(170, 3), 0.06)
    return verb(y, 0.8, 0.2, 7000, tail=False)

FX = dict(clown=clown, juggler=juggler, stiltwalker=stiltwalker, knifethrower=knifethrower, lion=lion, marionette=marionette,
          lizardman=lizardman, blowgunner=blowgunner, monkey=monkey, jaguar=jaguar, mosquito=mosquito, templeguardian=templeguardian,
          ringmaster_laugh=ringmaster_laugh, ringmaster_whip=ringmaster_whip, serpent_hiss=serpent_hiss, serpent_roar=serpent_roar,
          honk=honk, balloon_pop=balloon_pop, confetti=confetti, trapdoor=trapdoor, spotlight_on=spotlight_on, knifewheel=knifewheel,
          prizewheel=prizewheel, idol_take=idol_take, dart_trap=dart_trap, piranha=piranha, vine_rustle=vine_rustle,
          pin_throw=pin_throw, pin_bounce=pin_bounce, blowgun_fire=blowgun_fire, blowgun_hit=blowgun_hit, laser_eye=laser_eye,
          circus_hum=circus_hum, jungle_hum=jungle_hum)

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



# ---- fler instrument: cirkus och djungel ----
def tuba(n, d, g=1.0):  # tuba: mörk, rund mässing med kort ansats
    return brass([n], d, att=0.02, rel=0.08, drive=1.6, lo_fc=250, hi_fc=800, swell=0.06, g=g)

def roll(d, g=1.0, rate=24, cresc=True):  # virvel: täta trumslag (rate per s) som växer
    y = np.zeros(int(d * SR) + int(0.3 * SR)); n = int(d * rate)
    for k in range(n): place(y, k / rate, snare(1.0) * (0.35 + 0.65 * (k / n if cresc else 1)) * (0.8 + 0.2 * (k % 2)))
    return y * g

def bdrum(g=1.0):  # stortrumma
    return drum(52, 0.6, g, 0.2, dec=7)

def conga(f=220, g=1.0, slap=0.5):  # handtrumma: kort skinnslag (som ramtrumman, högre stämd)
    return bodhran(g, f, 0.25, slap)

def chant(notes, d, g=1.0):  # dov manskör på "oh" som sjunger en ton (ramsa)
    return nrm(choir(notes, d, 0.08, 0.25, 1.0, vib=4.0, F=OH, hmax=3000)) * g

# ---- circus: Den övergivna cirkusen, a-moll, vals 3/4 (fjärdedel 0,4 s), 32 takter = 38,4 s, fyra fraser à 8 takter
# (Am Am E E E E Am Am | Dm Dm Am Am E E Am Am | Am Am E E E E Am E | F F C C Dm E Am E) ----
# grund: en ostämd kalliope/positiv spelar valsen (bas på ettan, ackord på tvåan och trean) och en sorglig melodi i moll, ett
# klockspel som ekar melodin, en svag spöklik "oh"-kör, tältdukens sus och en spöklik publik som skrattar ett par gånger.
# tutor (gummiblåsor) på varje frasslut.
# hi: tuba på ettan (grundton och kvint), stortrumma, virveltrumma med stålborste på två och tre, virvlar mot frasslutet,
# cymbal på varje fras och en träkloss.
def circus():
    b = 0.4; br = 3 * b; T = 32 * br; base = Loop(T); hi = Loop(T)
    prog = ['Am', 'Am', 'E', 'E', 'E', 'E', 'Am', 'Am', 'Dm', 'Dm', 'Am', 'Am', 'E', 'E', 'Am', 'Am',
            'Am', 'Am', 'E', 'E', 'E', 'E', 'Am', 'E', 'F', 'F', 'C', 'C', 'Dm', 'E', 'Am', 'E']
    chord = {'Am': [57, 60, 64], 'E': [56, 59, 62], 'Dm': [57, 62, 65], 'F': [57, 60, 65], 'C': [55, 60, 64]}
    root = {'Am': 45, 'E': 40, 'Dm': 50, 'F': 41, 'C': 48}
    base.add(0, base.bed(80, 700, 0.01, cyc=3)); base.add(0, base.bed(1500, 6000, 0.0012, cyc=5))
    for i, c in enumerate(prog):
        t0 = i * br; ch = chord[c]; r = root[c]
        base.add(t0, calliope(r + 12, b * 0.9, 0.16, rel=0.05), -0.2)
        for k in (1, 2):
            for n in ch: base.add(t0 + k * b, calliope(n, b * 0.55, 0.06, rel=0.05), 0.25)
        if 8 <= i < 16: base.add(t0 - 0.2, chant([n - 12 for n in ch[:2]], br + 0.4, 1.0), 0.0, 0.05)
        hi.add(t0, tuba(r - 12 if i % 2 == 0 else r - 5, b * 0.9, 0.3), 0.0); hi.add(t0, bdrum(0.4), 0)
        for k in (1, 2): hi.add(t0 + k * b, snare(0.12), 0.2); hi.add(t0 + k * b, shaker(0.04), -0.3)
        hi.add(t0 + 2.5 * b, wblock(1500, 0.05), -0.5)
        if i % 8 == 7: hi.add(t0 + b, roll(2 * b - 0.05, 0.1), 0.15)
        if i % 8 == 0: hi.add(t0, crash_cym(0.14, 2.5), 0.35)
        if i % 8 == 7: base.add(t0 + b, honkhorn(m2f(ch[0]), 0.18), 0.6, 0.025); base.add(t0 + 2 * b, honkhorn(m2f(ch[0] - 1), 0.3), 0.6, 0.025)
    mel = [(0, 0, 76, 2), (0, 2, 75, 1), (1, 0, 76, 1), (1, 1, 72, 1), (1, 2, 69, 1), (2, 0, 71, 2), (2, 2, 68, 1), (3, 0, 71, 1), (3, 1, 74, 1), (3, 2, 77, 1),
           (4, 0, 76, 2), (4, 2, 74, 1), (5, 0, 72, 1), (5, 1, 71, 1), (5, 2, 68, 1), (6, 0, 69, 3), (7, 0, 64, 1), (7, 1, 68, 1), (7, 2, 71, 1),
           (8, 0, 74, 2), (8, 2, 77, 1), (9, 0, 81, 2), (9, 2, 77, 1), (10, 0, 76, 2), (10, 2, 72, 1), (11, 0, 69, 2), (11, 2, 72, 1),
           (12, 0, 71, 1), (12, 1, 74, 1), (12, 2, 71, 1), (13, 0, 68, 1), (13, 1, 71, 1), (13, 2, 74, 1), (14, 0, 72, 2), (14, 2, 71, 1), (15, 0, 69, 2), (15, 2, 64, 1)]
    mel += [(bi + 16, k, n, dd) for bi, k, n, dd in mel[:16]] + [(23, 0, 68, 1), (23, 1, 71, 1), (23, 2, 74, 1)]
    mel += [(24, 0, 72, 2), (24, 2, 69, 1), (25, 0, 65, 1), (25, 1, 69, 1), (25, 2, 72, 1), (26, 0, 79, 2), (26, 2, 76, 1), (27, 0, 72, 3),
            (28, 0, 74, 1), (28, 1, 77, 1), (28, 2, 81, 1), (29, 0, 80, 2), (29, 2, 76, 1), (30, 0, 81, 2), (30, 2, 72, 1), (31, 0, 71, 1), (31, 1, 68, 1), (31, 2, 64, 1)]
    for bi, k, n, dd in mel:
        base.add(bi * br + k * b, calliope(n, dd * b * 0.92, 0.2, wob=0.006), 0.1)
        if bi >= 16: base.add(bi * br + k * b + 0.6, bar(m2f(n + 12), 1.0, 0.035, dec=2.0), -0.5)
    for t0, p in ((9.3, -0.6), (28.0, 0.6)): base.add(t0, fftfilt(crowdlaugh(2.6, 5), 150, 1800), p, 0.05)
    base.reverb(3.2, 0.42, 4500, 0.03); hi.reverb(1.5, 0.22, 5000)
    write_aligned((base, 'circus', -20), (hi, 'circus_hi', -23))

# ---- jungle: Djungeltemplet, d-moll (dorisk), 100 bpm, 16 takter = 38,4 s (Dm C Bb C | Dm C Bb Am | Dm C Bb C | Gm Am Dm Dm) ----
# grund: regn på löven (cirkulärt filtrerat brus och droppar), cikador och syrsor, en låg drönare på D, mjuka padar, slitstrummor
# med ett tvåtonsmönster, fåglar och grodor här och där och en flöjtmelodi (pentatonisk moll) från femte takten.
# hi: handtrummor i sextondelar, ramtrumma och taiko, shaker, marimba-ostinato och en pulserande bas.
def jungle():
    b = 0.6; br = 4 * b; T = 16 * br; base = Loop(T); hi = Loop(T)
    prog = ['Dm', 'C', 'Bb', 'C', 'Dm', 'C', 'Bb', 'Am', 'Dm', 'C', 'Bb', 'C', 'Gm', 'Am', 'Dm', 'Dm']
    chord = {'Dm': [62, 65, 69], 'C': [60, 64, 67], 'Bb': [58, 62, 65], 'Am': [57, 60, 64], 'Gm': [55, 58, 62]}
    root = {'Dm': 38, 'C': 36, 'Bb': 34, 'Am': 33, 'Gm': 31}
    base.add(0, base.drone(38, 0.06, h=8, roll=1.4, cyc=2, hi=400)); base.add(0, base.bed(1800, 9000, 0.004, cyc=3))
    ins = base.bed(4300, 5300, 1.0, cyc=1) * (0.5 + 0.5 * np.sin(2 * np.pi * base.q(80) * base.t)) ** 3
    base.add(0, ins * 0.0025 * (1 + 0.5 * np.sin(2 * np.pi * 3 / T * base.t)), -0.3)
    for _ in range(160): base.add(rng.uniform(0, T), bubble(rng.uniform(1600, 3000), 0.03, 1, 1.2), rng.uniform(-0.9, 0.9), rng.uniform(0.004, 0.012))
    for _ in range(9):
        t0 = rng.uniform(0, T); f = rng.uniform(2600, 3800); k = int(rng.integers(3)); p = rng.uniform(-0.8, 0.8)
        for j in range(int(rng.integers(2, 5))): base.add(t0 + j * 0.15, bird(f * rng.uniform(0.95, 1.05), 0.11, 1.0, k), p, 0.012)
    for t0 in (6.0, 21.5, 33.0): base.add(t0, frog(rng.uniform(150, 200), 3), rng.uniform(-0.6, 0.6), 0.015)
    for i, c in enumerate(prog):
        t0 = i * br; ch = chord[c]; r = root[c]
        base.add(t0 - 0.3, wpad([n - 12 for n in ch], br + 0.6, 0.12, att=0.6, rel=0.7, hi=1100), 0.0)
        for k8, (f, gg) in enumerate(((180, 0.3), (0, 0), (240, 0.2), (180, 0.15), (0, 0), (180, 0.25), (240, 0.2), (0, 0))):
            if gg: base.add(t0 + k8 * b / 2, logdrum(f, gg, 0.35), -0.25)
        for k in (0, 2): base.add(t0 + k * b, conga(110, 0.2, 0.2), 0.1)
        for k16 in range(16):
            gg = (0.22, 0.06, 0.12, 0.06)[k16 % 4]; hi.add(t0 + k16 * b / 4, conga(260 if k16 % 3 else 330, gg, 0.5), 0.3 if k16 % 2 else -0.2)
            hi.add(t0 + k16 * b / 4, shaker(0.03 if k16 % 2 == 0 else 0.015), -0.45)
        hi.add(t0, taiko(0.35, 42, 1.2), 0); hi.add(t0 + 2.5 * b, taiko(0.2, 46, 1.0), 0)
        for k in (1, 3): hi.add(t0 + k * b, bodhran(0.3, 95), 0.05)
        arp = [ch[0], ch[2], ch[1] + 12, ch[2], ch[0] + 12, ch[2], ch[1], ch[2]]
        for k8 in range(8): hi.add(t0 + k8 * b / 2, marimba(arp[k8], 0.6, 0.09 if k8 % 2 == 0 else 0.06), 0.35)
        hi.add(t0, pbass(r + 12, br, 2 / b, 0.18, 1.6), 0)
    mel = [(4, 0, 74, 1.5), (4, 1.5, 77, 0.5), (4, 2, 76, 1), (4, 3, 74, 1), (5, 0, 72, 2), (5, 2, 69, 2), (6, 0, 70, 1.5), (6, 1.5, 72, 0.5), (6, 2, 74, 2),
           (7, 0, 72, 1), (7, 1, 69, 1), (7, 2, 67, 2), (8, 0, 74, 1), (8, 1, 77, 1), (8, 2, 81, 2), (9, 0, 79, 1.5), (9, 1.5, 77, 0.5), (9, 2, 76, 2),
           (10, 0, 77, 1), (10, 1, 74, 1), (10, 2, 70, 2), (11, 0, 72, 3), (11, 3, 76, 1), (12, 0, 74, 1.5), (12, 1.5, 70, 0.5), (12, 2, 67, 2),
           (13, 0, 69, 1), (13, 1, 72, 1), (13, 2, 76, 2), (14, 0, 74, 4)]
    for bi, k, n, dd in mel: base.add((bi * 4 + k) * b, flute(n, dd * b + 0.05, 0.14, att=0.05, rel=0.2, vib=0.008), 0.15)
    base.add(15 * br, flute(81, 0.5, 0.06, att=0.05, rel=0.3), 0.4); base.add(15 * br + 0.3, flute(86, 0.6, 0.05, att=0.05, rel=0.3), 0.4)
    base.reverb(3.0, 0.4, 5000, 0.03); hi.reverb(1.4, 0.2, 5500)
    write_aligned((base, 'jungle', -20), (hi, 'jungle_hi', -23))

# ---- boss19: cirkusdirektören, d-moll, snabb vals/galopp 3/4 (fjärdedel 0,25 s), 48 takter = 36 s, tre fraser à 16 takter
# (Dm Dm A A A A Dm Dm Gm Gm Dm Dm A A Dm Dm | Bb Bb F F Gm Gm A A Bb Bb F F Gm A Dm A | som första frasen) ----
# en ostämd kalliope/positiv i full fart: tuba och stortrumma på ettan, kalliopens ackord och virveltrumman på tvåan och trean,
# en kromatisk melodi, mässingsstötar, cymbaler, virvlar mot frasslutet, tutor, piskor som smäller, en kör i andra frasen och spöklik
# publik som skrattar.
def boss19():
    b = 0.25; br = 3 * b; T = 48 * br; L = Loop(T)
    A = ['Dm', 'Dm', 'A', 'A', 'A', 'A', 'Dm', 'Dm', 'Gm', 'Gm', 'Dm', 'Dm', 'A', 'A', 'Dm', 'Dm']
    B = ['Bb', 'Bb', 'F', 'F', 'Gm', 'Gm', 'A', 'A', 'Bb', 'Bb', 'F', 'F', 'Gm', 'A', 'Dm', 'A']
    prog = A + B + A
    chord = {'Dm': [62, 65, 69], 'A': [61, 64, 67], 'Gm': [62, 67, 70], 'Bb': [62, 65, 70], 'F': [60, 65, 69]}
    root = {'Dm': 50, 'A': 45, 'Gm': 43, 'Bb': 46, 'F': 41}
    L.add(0, L.bed(40, 250, 0.012, cyc=4))
    for i, c in enumerate(prog):
        t0 = i * br; ch = chord[c]; r = root[c]; p = i // 16
        L.add(t0, tuba(r - 12 if i % 2 == 0 else r - 5, b * 0.85, 0.32), 0.0); L.add(t0, bdrum(0.45), 0)
        L.add(t0, calliope(r, b * 0.8, 0.1, rel=0.04), -0.2)
        for k in (1, 2):
            for n in ch: L.add(t0 + k * b, calliope(n, b * 0.5, 0.05, rel=0.04), 0.3)
            L.add(t0 + k * b, snare(0.14), 0.15)
        for k in range(3): L.add(t0 + k * b, shaker(0.035), -0.4)
        if p == 1: L.add(t0 - 0.1, chant([n - 12 for n in ch], br + 0.2, 1.0), 0.0, 0.06)
        if i % 16 == 15: L.add(t0, roll(br - 0.03, 0.16), 0.1)
        if i % 8 == 0: L.add(t0, crash_cym(0.15, 2.5), 0.35)
        if i % 16 == 7: L.add(t0 + b, honkhorn(m2f(ch[0]), 0.14), -0.6, 0.03); L.add(t0 + 2 * b, honkhorn(m2f(ch[0] + 1), 0.2), 0.6, 0.03)
        if i % 4 == 3: L.add(t0 + 2 * b, brass([n - 12 for n in ch], b * 0.8, att=0.01, rel=0.06, drive=2.4, swell=0.05, hi_fc=2600), -0.25, 0.12)
    for t0, p in ((16 * br - 0.25, -0.5), (32 * br - 0.25, 0.5)): L.add(t0, whip(), p, 0.25)
    mel = [(0, 0, 74, 1), (0, 1, 73, 1), (0, 2, 74, 1), (1, 0, 77, 2), (1, 2, 74, 1), (2, 0, 73, 1), (2, 1, 72, 1), (2, 2, 73, 1), (3, 0, 76, 2), (3, 2, 73, 1),
           (4, 0, 79, 1), (4, 1, 78, 1), (4, 2, 79, 1), (5, 0, 82, 2), (5, 2, 79, 1), (6, 0, 77, 1), (6, 1, 76, 1), (6, 2, 74, 1), (7, 0, 69, 3),
           (8, 0, 70, 1), (8, 1, 74, 1), (8, 2, 79, 1), (9, 0, 82, 2), (9, 2, 79, 1), (10, 0, 77, 1), (10, 1, 74, 1), (10, 2, 69, 1), (11, 0, 74, 3),
           (12, 0, 73, 1), (12, 1, 76, 1), (12, 2, 79, 1), (13, 0, 82, 1), (13, 1, 81, 1), (13, 2, 79, 1), (14, 0, 77, 1), (14, 1, 76, 1), (14, 2, 73, 1), (15, 0, 74, 2), (15, 2, 69, 1)]
    mel2 = [(16, 0, 70, 2), (16, 2, 74, 1), (17, 0, 77, 3), (18, 0, 72, 2), (18, 2, 69, 1), (19, 0, 65, 3), (20, 0, 67, 1), (20, 1, 70, 1), (20, 2, 74, 1),
            (21, 0, 79, 2), (21, 2, 74, 1), (22, 0, 73, 1), (22, 1, 76, 1), (22, 2, 79, 1), (23, 0, 81, 2), (23, 2, 79, 1),
            (24, 0, 82, 2), (24, 2, 81, 1), (25, 0, 77, 3), (26, 0, 81, 2), (26, 2, 77, 1), (27, 0, 72, 3), (28, 0, 79, 1), (28, 1, 77, 1), (28, 2, 74, 1),
            (29, 0, 73, 1), (29, 1, 76, 1), (29, 2, 79, 1), (30, 0, 74, 2), (30, 2, 77, 1), (31, 0, 76, 1), (31, 1, 73, 1), (31, 2, 69, 1)]
    mel += mel2 + [(bi + 32, k, n, dd) for bi, k, n, dd in mel]
    for bi, k, n, dd in mel:
        L.add(bi * br + k * b, calliope(n, dd * b * 0.9, 0.2, wob=0.006), 0.1)
        if bi >= 32: L.add(bi * br + k * b, calliope(n - 12, dd * b * 0.9, 0.1, wob=0.006), -0.1)
    for t0, p in ((10.0, -0.6), (26.0, 0.6)): L.add(t0, fftfilt(crowdlaugh(2.4, 5), 150, 1800), p, 0.05)
    L.reverb(2.4, 0.33, 4800)
    write_aligned((L, 'boss19', -19))

# ---- boss20: den fjädrade ormen, e-frygisk, 12/8 (åttondel 0,2 s), 16 takter = 38,4 s, fyra delar à 4 takter
# (Em F Em Dm | Em F G F | Am G F Em | Em F Dm Em) ----
# djungelrytm: taiko på ettan och sjuan, slitstrummor i treor mot handtrummor i tvåor, shaker, en låg drönare och en dov mansramsa
# på "oh"; en mörk okarina spelar melodin (frygisk), en ljus flöjt kommer in i tredje delen och svarar, väsande brussvall när ormen
# rör sig, mässingsstötar i sista delen och en virvel tillbaka in i början.
def boss20():
    b = 0.2; br = 12 * b; T = 16 * br; L = Loop(T)
    prog = ['Em', 'F', 'Em', 'Dm', 'Em', 'F', 'G', 'F', 'Am', 'G', 'F', 'Em', 'Em', 'F', 'Dm', 'Em']
    chord = {'Em': [52, 55, 59], 'F': [53, 57, 60], 'Dm': [50, 53, 57], 'G': [50, 55, 59], 'Am': [52, 57, 60]}
    root = {'Em': 40, 'F': 41, 'Dm': 38, 'G': 43, 'Am': 45}
    L.add(0, L.drone(28, 0.07, h=10, roll=1.2, cyc=4, hi=500)); L.add(0, L.bed(30, 200, 0.015, cyc=6))
    for t0, dd, p in ((4.0, 2.5, -0.6), (13.5, 2.0, 0.6), (23.0, 2.5, -0.4), (31.0, 3.0, 0.5)):
        L.add(t0, nrm(fftfilt(noise(dd), 2500, 9000)) * np.sin(np.pi * tt(dd) / dd) ** 2, p, 0.035)
    for i, c in enumerate(prog):
        t0 = i * br; ch = chord[c]; r = root[c]; p = i // 4
        L.add(t0, taiko(0.5, 38, 1.4), 0); L.add(t0 + 6 * b, taiko(0.35, 42, 1.2), 0)
        for k in range(12):
            if k % 3 == 0: L.add(t0 + k * b, logdrum(200 if k % 6 == 0 else 150, 0.22, 0.3), -0.3)
            if k % 2 == 0: L.add(t0 + k * b, conga(250 if k % 4 else 320, 0.16 if k % 4 else 0.24, 0.5), 0.3)
            L.add(t0 + k * b, shaker(0.035 if k % 3 == 0 else 0.018), -0.45)
        for k in (3, 9): L.add(t0 + k * b, bodhran(0.3, 90), 0.05)
        L.add(t0 - 0.2, chant([r, r + 7], br + 0.3, 1.0), 0.0, 0.07 if p in (1, 3) else 0.04)
        L.add(t0, dbass(r - 12 + 12, br * 0.95, 0.12, 1.8, 400), 0)
        if p == 3:
            for k in (0, 6): L.add(t0 + k * b, brass([n - 12 for n in ch], 4 * b, att=0.01, rel=0.1, drive=2.4, swell=0.1, hi_fc=2200), -0.2, 0.12)
            if i == 15: L.add(t0 + 6 * b, roll(6 * b - 0.05, 0.14), 0.1)
    mel = [(0, 0, 64, 3), (0, 3, 65, 3), (0, 6, 64, 2), (0, 8, 62, 1), (0, 9, 64, 3), (1, 0, 65, 3), (1, 3, 69, 3), (1, 6, 67, 3), (1, 9, 65, 3),
           (2, 0, 64, 6), (2, 6, 59, 3), (2, 9, 60, 3), (3, 0, 62, 6), (3, 6, 60, 3), (3, 9, 59, 3),
           (4, 0, 64, 3), (4, 3, 67, 3), (4, 6, 71, 3), (4, 9, 72, 3), (5, 0, 71, 3), (5, 3, 69, 3), (5, 6, 65, 6), (6, 0, 67, 3), (6, 3, 71, 3), (6, 6, 74, 6),
           (7, 0, 72, 3), (7, 3, 69, 3), (7, 6, 65, 3), (7, 9, 64, 3)]
    mel += [(bi + 8, k, n + 5 if bi < 2 else n, dd) for bi, k, n, dd in mel[:8]] + [(10, 0, 65, 3), (10, 3, 64, 3), (10, 6, 62, 3), (10, 9, 60, 3), (11, 0, 64, 12)]
    mel += [(bi + 12, k, n, dd) for bi, k, n, dd in mel[:15]]
    for bi, k, n, dd in mel: L.add((bi * 12 + k) * b, ocarina(n + 12, dd * b + 0.03, 0.16), 0.15)
    fl = [(8, 6, 88, 1), (8, 7, 86, 1), (8, 8, 84, 4), (9, 6, 83, 1), (9, 7, 84, 1), (9, 8, 86, 4), (10, 6, 89, 2), (10, 8, 88, 4), (11, 6, 86, 6)]
    for bi, k, n, dd in fl: L.add((bi * 12 + k) * b, flute(n, dd * b + 0.05, 0.08, att=0.03, rel=0.15, vib=0.01), -0.35)
    for t0 in (0, 8 * br): L.add(t0, crash_cym(0.14, 3.0), 0.3)
    L.reverb(2.8, 0.36, 4500)
    write_aligned((L, 'boss20', -19))

for k, f in FX.items(): wr('s_' + k, f())
circus(); jungle(); boss19(); boss20()
PY
python3 -I "$T/synth15.py" "$T"

# ---------- musik ----------
mus circus -20 anull "$T/circus.wav"
mus circus_hi -23 anull "$T/circus_hi.wav"
mus jungle -20 anull "$T/jungle.wav"
mus jungle_hi -23 anull "$T/jungle_hi.wav"
mus boss19 -19 anull "$T/boss19.wav"
mus boss20 -19 anull "$T/boss20.wav"

# ---------- ljudeffekter ----------
E="$S/Environment"
X="$S/Materials"
W="$S/Weapons"
Q="$S/Other"
K="$S/Machines"
Z="$S/Retro"
# fiender: Cirkusen
TOP=-2 fx clown "$P" "$T/s_clown.wav"
TOP=-2 fx juggler "[0:a]$P[a];[1:a]$P,volume=0.3,adelay=150[b];[a][b]$(mix 2),atrim=0:1.5,afade=t=out:st=1.2:d=0.3[o]" "$T/s_juggler.wav" "$X/bamboo_drop.wav"
TOP=-2 fx stiltwalker "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,volume=0.35[b];[a][b]$(mix 2),atrim=0:1.8,afade=t=out:st=1.45:d=0.35[o]" "$T/s_stiltwalker.wav" "$X/wood_small_hollow.wav"
TOP=-2 fx knifethrower "[0:a]$P[a];[1:a]$P,volume=0.4[b];[a][b]$(mix 2),atrim=0:1.2,afade=t=out:st=0.9:d=0.3[o]" "$T/s_knifethrower.wav" "$R/drawKnife2.ogg"
TOP=-2 fx lion "$P" "$T/s_lion.wav"
TOP=-2 fx marionette "[0:a]$P[a];[1:a]$P,volume=0.35[b];[a][b]$(mix 2),atrim=0:1.6,afade=t=out:st=1.25:d=0.35[o]" "$T/s_marionette.wav" "$X/wood_small_gather.wav"
# fiender: Djungeltemplet
TOP=-2 fx lizardman "$P" "$T/s_lizardman.wav"
TOP=-2 fx blowgunner "$P" "$T/s_blowgunner.wav"
TOP=-2 fx monkey "$P" "$T/s_monkey.wav"
TOP=-2 fx jaguar "$P" "$T/s_jaguar.wav"
TOP=-2 fx mosquito "$P" "$T/s_mosquito.wav"
TOP=-2 fx templeguardian "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,lowpass=f=2500,volume=0.35,afade=t=out:st=0.9:d=0.5[b];[a][b]$(mix 2),atrim=0:2.0,afade=t=out:st=1.6:d=0.4[o]" "$T/s_templeguardian.wav" "$X/stone_push_medium.wav"
# bossar
TOP=-2 fx ringmaster_laugh "[0:a]$P[a];[1:a]$P,atrim=1:4,asetpts=PTS-STARTPTS,asetrate=33075,aresample=44100,lowpass=f=1500,volume=0.12,afade=t=in:d=0.8,afade=t=out:st=2.0:d=1.0,adelay=300[b];[a][b]$(mix 2),atrim=0:3.0,afade=t=out:st=2.5:d=0.5[o]" "$T/s_ringmaster_laugh.wav" "$Q/applause.wav"
TOP=-2 fx ringmaster_whip "[0:a]$P[a];[1:a]$P,volume=0.2[b];[a][b]$(mix 2),atrim=0:1.0,afade=t=out:st=0.7:d=0.3[o]" "$T/s_ringmaster_whip.wav" "$Q/whoosh_1.wav"
TOP=-3 fx serpent_hiss "$P" "$T/s_serpent_hiss.wav"
TOP=-2 fx serpent_roar "[0:a]$P[a];[1:a]$P,asetrate=29400,aresample=44100,lowpass=f=900,volume=0.3,adelay=100[b];[a][b]$(mix 2),atrim=0:2.6,afade=t=out:st=2.15:d=0.45[o]" "$T/s_serpent_roar.wav" "$Z/explosion_large.wav"
# cirkusen: tuta, ballonger, konfetti, fallucka, strålkastare, knivhjul, lyckohjul
TOP=-4 fx honk "$P" "$T/s_honk.wav"
fx balloon_pop "[0:a]$P[a];[1:a]$P,volume=0.3[b];[a][b]$(mix 2),atrim=0:0.5,afade=t=out:st=0.35:d=0.15[o]" "$T/s_balloon_pop.wav" "$Q/snap.wav"
fx confetti "[0:a]$P[a];[1:a]$P,volume=0.25,adelay=40[b];[a][b]$(mix 2),atrim=0:1.4,afade=t=out:st=1.1:d=0.3[o]" "$T/s_confetti.wav" "$X/paper_move.wav"
fx trapdoor "[0:a]$P[a];[1:a]$P,volume=0.3[b];[2:a]$P,volume=0.35,adelay=300[c];[a][b][c]$(mix 3),atrim=0:1.3,afade=t=out:st=0.95:d=0.35[o]" "$T/s_trapdoor.wav" "$R/metalLatch.ogg" "$I/impactPlank_medium_001.ogg"
fx spotlight_on "[0:a]$P[a];[1:a]$P,volume=0.3[b];[a][b]$(mix 2),atrim=0:1.2,afade=t=out:st=0.9:d=0.3[o]" "$T/s_spotlight_on.wav" "$R/metalLatch.ogg"
fx knifewheel "[0:a]$P[a];[1:a]$P,volume=0.3[b];[a][b]$(mix 2),atrim=0:0.8,afade=t=out:st=0.55:d=0.25[o]" "$T/s_knifewheel.wav" "$R/drawKnife1.ogg"
fx prizewheel "$P" "$T/s_prizewheel.wav"
# templet: idol, pilfälla, pirayor, lianer
fx idol_take "[0:a]$P[a];[1:a]$P,volume=0.35,adelay=900,afade=t=out:st=1.0:d=1.4[b];[a][b]$(mix 2),atrim=0:2.4,afade=t=out:st=2.05:d=0.35[o]" "$T/s_idol_take.wav" "$X/stone_push_long.wav"
fx dart_trap "[0:a]$P[a];[1:a]$P,volume=0.25,adelay=20[b];[a][b]$(mix 2),atrim=0:0.7,afade=t=out:st=0.55:d=0.15[o]" "$T/s_dart_trap.wav" "$E/air_burst.wav"
fx piranha "[0:a]$P[a];[1:a]$P,atrim=0:0.65,asetpts=PTS-STARTPTS,volume=0.3[b];[a][b]$(mix 2),atrim=0:0.65,afade=t=out:st=0.5:d=0.15[o]" "$T/s_piranha.wav" "$E/water_splashing.wav"
TOP=-2 fx vine_rustle "[0:a]$P[a];[1:a]$P,volume=0.35[b];[a][b]$(mix 2),atrim=0:0.9,afade=t=out:st=0.7:d=0.2[o]" "$T/s_vine_rustle.wav" "$I/footstep_grass_001.ogg"
# vapen: käglekastaren och blåsröret
fx pin_throw "[0:a]$P[a];[1:a]$P,volume=0.3[b];[a][b]$(mix 2),atrim=0:0.7,afade=t=out:st=0.5:d=0.2[o]" "$T/s_pin_throw.wav" "$Q/whoosh_1.wav"
fx pin_bounce "[0:a]$P[a];[1:a]$P,volume=0.35[b];[a][b]$(mix 2),atrim=0:0.35,afade=t=out:st=0.23:d=0.12[o]" "$T/s_pin_bounce.wav" "$I/impactWood_light_002.ogg"
fx blowgun_fire "[0:a]$P[a];[1:a]$P,volume=0.25[b];[a][b]$(mix 2),atrim=0:0.4,afade=t=out:st=0.28:d=0.12[o]" "$T/s_blowgun_fire.wav" "$E/air_burst.wav"
fx blowgun_hit "[0:a]$P[a];[1:a]$P,volume=0.4[b];[a][b]$(mix 2),atrim=0:0.45,afade=t=out:st=0.33:d=0.12[o]" "$T/s_blowgun_hit.wav" "$X/cork_stabbed.wav"
fx laser_eye "[0:a]$P[a];[1:a]$P,atrim=0:0.95,asetpts=PTS-STARTPTS,highpass=f=800,volume=0.15,adelay=400,afade=t=out:st=0.7:d=0.25[b];[a][b]$(mix 2),atrim=0:1.4,afade=t=out:st=1.15:d=0.25[o]" "$T/s_laser_eye.wav" "$K/razor_buzz.wav"
# biomernas drönare
TOP=-4 fxloop circus_hum 4 0.8 "[0:a]$P[a];[1:a]$P,atrim=2:6.8,asetpts=PTS-STARTPTS,lowpass=f=1200,volume=0.2[b];[a][b]$(mix 2)[o]" "$T/s_circus_hum.wav" "$E/ambient_wind.wav"
TOP=-4 fxloop jungle_hum 4 0.8 "[0:a]$P[a];[1:a]$P,atrim=0:4,asetpts=PTS-STARTPTS,lowpass=f=2500,volume=0.08,afade=t=out:st=3.85:d=0.15[b];[a][b]$(mix 2)[o]" "$T/s_jungle_hum.wav" "$E/water_babbling_loop.wav"

for f in "$O"/{clown,juggler,stiltwalker,knifethrower,lion,marionette,lizardman,blowgunner,monkey,jaguar,mosquito,templeguardian,ringmaster_laugh,ringmaster_whip,serpent_hiss,serpent_roar,honk,balloon_pop,confetti,trapdoor,spotlight_on,knifewheel,prizewheel,idol_take,dart_trap,piranha,vine_rustle,pin_throw,pin_bounce,blowgun_fire,blowgun_hit,laser_eye,circus_hum,jungle_hum}.ogg; do printf '%-40s %6.2f s %5d kB\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" "$(( $(stat -c %s "$f") / 1024 ))"; done
for f in "$M"/circus.ogg "$M"/circus_hi.ogg "$M"/jungle.ogg "$M"/jungle_hi.ogg "$M"/boss19.ogg "$M"/boss20.ogg; do printf '%-36s %6.2f s %5d kB %6s LUFS\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" "$(( $(stat -c %s "$f") / 1024 ))" "$(lufs "$f")"; done
