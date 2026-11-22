#!/bin/bash
# Ljud för Krypta version 15 ("Katedralen och Bikupan"): rökelsekaret och bikastaren (bin som surrar och sticker), Blodkatedralen
# (korgosse, botgörare, kerub, ljusstråken, kyrkklockan, blodfunten, katedralens stillhet), Bikupan (arbetsbi, gaddkrigare,
# larver och larvsäckar, honung, bikupans surr), bossarna kardinalen och bidrottningen, och musiken cathedral (+ cathedral_hi),
# hive (+ hive_hi), boss13 och boss14. _hi-filerna är tidslinjerade intensitetslager: samma längd och samma taktnät som
# grundspåret, så att spelet kan tona in dem ovanpå.
# Ljusstråkens välsignelse heter bless_beam: bless.ogg finns redan (prästens välsignelse, make3.sh) och används av game.js.
# Samma konventioner som make2.sh-make11.sh: effekter mono 22 kHz Vorbis q2 toppnormaliserade till $TOP dBFS
# (standard -1, fiendernas röster -2, slingor -4), musik stereo 44,1 kHz Vorbis q1 linjärt förstärkt till mål-LUFS,
# alla slingor bär LOOPLENGTH=<sampel> i Vorbis-kommentaren och effektslingorna vrids så att skarven
# hamnar där signalen är tyst och flack.
# Källor: assets/audio (Kenney-paketen CC0: impact-sounds, rpg-audio; 400 Sounds Pack CC0).
# Bin, röster (korgosse, botgörare, kerub, kardinal), slem, honung, klockor, orgel, kör, slingorna och all musik
# syntetiseras med python3 + numpy (inbäddat nedan).
# Deterministiskt: fast frö för slumptalen och -fflags +bitexact (annars slumpar Ogg-muxern serienumret).
# Kör från katalogen där retrofps/ (repot) och assets/audio/ ligger: bash retrofps/tools/sounds/make12.sh
# (O=<katalog> och M=<katalog> i miljön skriver effekterna/musiken någon annanstans, t.ex. för att prova utan att röra repot).
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

cat > "$T/synth12.py" <<'PY'
# Syntetiserade effekter och musik för Krypta version 15. Användning: python3 synth12.py <katalog>
# Musikslingan läggs med "wrap" (toner som går över slutet läggs på början), efterklangen är en cirkulär
# faltning och liggande toner/brus har ett helt antal perioder på slingan, så slingan är sömlös.
# Byggstenarna nedan är desamma som i make9.sh (plus papper, ånga, el och orgel från make10.sh); nya står under
# "bin, kyrkans röster, slem och honung" och "kyrka och bikupa".
import sys, wave, re, subprocess, numpy as np
SR = 44100
OUT = sys.argv[1]
rng = np.random.default_rng(15015)
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

# ---- nya byggstenar: bin, kyrkans röster, slem och honung ----
def lpn(n, fc):  # som lpnoise men med antal sampel (för kurvor som ska vara exakt lika långa som en tonhöjdskurva)
    x = fftfilt(rng.standard_normal(n), 0, fc); return x / (np.abs(x).max() + 1e-9)

def pulsewave(ph, fmax, f0, duty=0.2):  # bandbegränsad pulsvåg ur en fas (smal puls = näsigt, surrande); f0 = högsta grundton
    y = np.zeros_like(ph)
    for k in range(1, max(1, int(fmax / f0)) + 1): y += np.sin(np.pi * k * duty) / k * np.cos(k * ph)
    return y

def bee(d, f, g=1.0, bright=6000, duty=0.18, flut=0.3, air=0.15):  # bi-surr: vingslagens ton (f tal eller kurva) som en smal puls,
    # tonhöjden och styrkan fladdrar lite och luften slår i vingtakt
    f = np.asarray(f, float); n = len(f) if f.ndim else int(d * SR); f = np.broadcast_to(f, (n,)) * (1 + 0.015 * lpn(n, 9))
    ph = phase(f)
    y = nrm(pulsewave(ph, bright, f.max(), duty)) * (1 - flut * (0.5 + 0.5 * lpn(n, 22)))
    y = y + air * nrm(fftfilt(rng.standard_normal(n), 1500, 8000)) * (0.5 + 0.5 * np.cos(ph)) ** 2
    return y * g

def flyby(d, f0, g=1.0, pk=0.5, shift=0.1, wob=0.0, bright=6000):  # ett bi som flyger förbi: tonhöjden faller förbi närmsta punkten
    # (doppler), styrkan och ljusheten sväller och avtar; wob ger en sicksackande kurs
    t = tt(d); u = (t - d * pk) / (d * 0.16)
    f = f0 * (1 - shift * np.tanh(u)) * (1 + wob * np.sin(2 * np.pi * 3.3 * t))
    a = 1 / (1 + u ** 2)
    y = bee(d, f, 1.0, bright, 0.18, 0.2, 0.12)
    return (fftfilt(y, 120, 1400) * (1 - a) + fftfilt(y, 120, bright) * a) * a * g

def bees(d, n, lo=190, hi=320, g=1.0, bright=5000, depth=0.6):  # svärm: n bin med olika vingtakt som kommer och går
    y = np.zeros(int(d * SR))
    for _ in range(n):
        f = rng.uniform(lo, hi) * (1 + 0.04 * lpnoise(d, 1.5))
        a = 1 - depth * (0.5 + 0.5 * lpnoise(d, rng.uniform(0.8, 2.5)))
        y += bee(d, f, 1.0, bright, rng.uniform(0.12, 0.3), 0.3, 0.1) * a * rng.uniform(0.5, 1)
    return nrm(y) * g

def chitin(g=1.0):  # kitinklick: insektsskal/käkar, mycket kort och högt
    return clack(rng.uniform(3800, 5500), g, 500, 0.02)

def gloop(f=220, d=0.15, g=1.0):  # trögt "glupp": en stor, långsam bubbla i något tjockt (honung, slem, blod)
    b = tt(d); fr = f * (1 + 1.2 * (b / d) ** 1.5)
    return np.sin(phase(fr)) * np.sin(np.pi * np.clip(b / d, 0, 1)) ** 1.5 * np.exp(-b * 3 / d) * g

def honeydrip(g=1.0):  # en trög honungsdroppe: segt "glupp" som släpper och ett mjukt, dämpat plopp
    y = np.zeros(int(0.2 * SR)); place(y, 0, gloop(rng.uniform(260, 340), 0.12), 0.6); place(y, 0.1, bubble(rng.uniform(600, 900), 0.05, 1, 0.6), 0.5)
    return fftfilt(y, 80, 2500) * g

def flap(d=0.08, lo=600, hi=3500):  # litet, fjäderlätt vingslag (kerubens vingar): kort luftflapp
    t = tt(d); a = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    return nrm(svf(noise(d), lo + (hi - lo) * a, 0.9, 'lp')) * a

def lash(g=1.0):  # piskslag mot bar hud: en snabb snärt, en smäll och ett blött klatsch
    d = 0.32; t = tt(d); c = 0.06
    a = np.where(t < c, (t / c) ** 3, np.exp(-(t - c) * 60))
    y = nrm(svf(noise(d), 700 + 3000 * a, 2.0)) * a * 0.35
    place(y, c, crack(0.05, 0.8, 1800)); place(y, c, splat(0.15), 0.5)
    k = tt(0.08); place(y, c, nrm(reson(noise(0.08), [(450, 120, 1), (1300, 300, 0.5)])) * np.exp(-k * 60), 0.7)
    return y * g

def vowel_track(t, segs, glide=0.04):  # formantkurvor [(fc, bw, amp) som kurvor] som glider mellan vokalerna: segs = [(t0, F)],
    # alla F med lika många formanter
    idx = np.clip(np.searchsorted(np.array([s[0] for s in segs]), t, 'right') - 1, 0, len(segs) - 1)
    k = max(1, int(glide * SR)); out = []
    for j in range(len(segs[0][1])):
        cols = []
        for p in range(3):
            v = np.array([s[1][j][p] for s in segs], float)[idx]
            cols.append(np.convolve(np.concatenate([np.full(k, v[0]), v, np.full(k, v[-1])]), np.ones(k) / k, 'same')[k:-k])
        out.append(tuple(cols))
    return out

def chant(notes, g=1.0, vib=0.008, glide=0.05, hmax=7000, roll=0.9, breath=0.05, shift=1.0, gap=0.5, jit=0.002):  # sjungen fras
    # med text: notes = [(t0, midi, d, vokal)]; vokalerna glider in i varandra och varje ny stavelse får ett litet konsonantdopp
    t, f0, amp, since = legato([(a, n, d) for a, n, d, _ in notes], glide)
    F = vowel_track(t, [(a, v) for a, _, _, v in notes])
    v = 1 + vib * np.clip((since - 0.15) / 0.25, 0, 1) * np.sin(2 * np.pi * 5.6 * t + rng.uniform(0, 6))
    for a, _, _, _ in notes[1:]: amp = amp * (1 - gap * np.exp(-((t - a) / 0.025) ** 2))
    y = nrm(voice(f0 * v * shift, F, hmax, jitter=jit, roll=roll))
    y = y + nrm(fftfilt(rng.standard_normal(len(t)), 1500, 8000)) * breath
    return y * amp * g

def mens(notes, shifts=(0.996, 1.0, 1.005), **kw):  # en liten kör som sjunger samma fras (lite olika stämning och insats)
    ys = [chant([(a + rng.uniform(-0.012, 0.012) if a > 0 else a, n, d, v) for a, n, d, v in notes], shift=s, **kw) for s in shifts]
    m = min(len(y) for y in ys); return nrm(sum(y[:m] for y in ys))

# gossesopran (fyra formanter) och djup mansröst (tre formanter)
BOY_A = [(1000, 130, 1.0), (1500, 160, 0.6), (3300, 260, 0.25), (4200, 300, 0.1)]
BOY_O = [(550, 100, 1.0), (950, 130, 0.45), (3100, 250, 0.12), (4000, 300, 0.05)]
BOY_I = [(420, 90, 1.0), (2900, 220, 0.45), (3700, 280, 0.3), (4500, 320, 0.1)]
BOY_E = [(650, 110, 1.0), (2300, 200, 0.45), (3300, 260, 0.25), (4300, 300, 0.1)]
B_O = [(450, 80, 1.0), (800, 100, 0.5), (2500, 180, 0.1)]
B_A = [(700, 110, 1.0), (1150, 130, 0.55), (2650, 180, 0.22)]
B_I = [(300, 70, 1.0), (2200, 200, 0.4), (2950, 250, 0.25)]
B_E = [(500, 90, 1.0), (1800, 150, 0.45), (2500, 200, 0.2)]
B_U = [(320, 70, 1.0), (750, 100, 0.35), (2400, 180, 0.06)]

# ================= effekter =================
# ---- vapen: rökelsekaret och bikastaren ----
def censer_swing():  # rökelsekaret svängs: kedjan rasslar till när det lyfts, en tung svepande svisch genom bågen med rökens
    # fräsande sus, och kedjan skramlar och locket klirrar när karet vänder
    d = 0.85; t = tt(d); y = np.zeros(len(t))
    place(y, 0, chain(0.25, 7, None, (2500, 5500)), 0.35)
    place(y, 0.06, swish(0.55, 350, 1600, 1.4), 0.75); place(y, 0.08, swish(0.5, 2500, 6000, 1.0), 0.15)
    tb = tt(0.55); place(y, 0.06, np.sin(phase(np.interp(tb, [0, 0.3, 0.55], [90, 120, 80]))) * np.sin(np.pi * tb / 0.55) ** 2, 0.2)
    a = np.interp(t, [0, 0.1, 0.45, d], [0, 0, 1, 0])
    y += nrm(fftfilt(noise(d), 3000, 9000)) * a * 0.08 * (1 + 0.5 * lpnoise(d, 20))
    y += chain(d, 12, np.interp(t, [0, 0.5, 0.58, 0.75, d], [0, 0, 1, 0.3, 0]), (2200, 5000)) * 0.4
    place(y, 0.56, ting(0.3, 3300, 1, 2.5), 0.12)
    return cut(verb(y, 0.6, 0.2, 7000), d, 0.25)

def censer_hit():  # rökelsekaret träffar: ett tungt, dovt mässingsklonk mot kött, kedjan skramlar, glöd som sprakar och ett rökpuff
    d = 0.8; y = np.zeros(int(d * SR))
    place(y, 0, thud(70, 0.5, 0.15), 0.9); place(y, 0, anvil(520, 0.7, 0.5)); place(y, 0, splat(0.15), 0.25)
    place(y, 0.005, chain(0.35, 8, None, (2000, 4500)), 0.3)
    place(y, 0.02, puff(0.4, 300, 3000), 0.35)
    sparks(y, 0.6, 40, 1.5, 0.06)
    return cut(verb(y, 0.7, 0.2, 6000), d, 0.25)

def hive_fire():  # bikastaren: en dov pneumatisk puff när kupan stöter ut bina, ett segt vaxglupp, och surret som sväller och
    # sprids när svärmen far iväg (tonhöjden stiger när bina tar fart)
    d = 1.1; y = np.zeros(int(d * SR))
    place(y, 0, thud(80, 0.35, 0.0), 0.8); place(y, 0, puff(0.3, 150, 1800, 1.0, 0.1), 0.9)
    place(y, 0.005, gloop(180, 0.12), 0.3)
    for i in range(5):
        t0 = 0.03 + 0.03 * i; db = d - t0; tb = tt(db)
        f = rng.uniform(200, 290) * (0.85 + 0.3 * np.clip(tb / 0.3, 0, 1))
        a = np.interp(tb, [0, 0.08, 0.35, db], [0, 1, 0.6, 0]) ** 1.2
        place(y, t0, bee(db, f, 1.0, 5000, rng.uniform(0.15, 0.25)) * a, 0.22 * rng.uniform(0.7, 1))
    return cut(verb(y, 0.6, 0.15, 5000), d, 0.3)

def bee_buzz():  # ett bi surrar förbi: dopplersvep (tonhöjden faller när det passerar), surret sväller och dör bort, lätt sicksack
    d = 1.0; y = flyby(d, 250, 1.0, 0.45, 0.1, 0.03) + flyby(d, 262, 0.3, 0.47, 0.1, 0.03)
    return cut(verb(y, 0.4, 0.1, 6000), d, 0.2)

def bee_sting():  # bistick: ett argt surr som skjuter upp i tonhöjd, ett skarpt "tsick" när gadden sticker in och ett litet blött knäpp
    d = 0.45; y = np.zeros(int(d * SR)); c = 0.15
    tb = tt(0.16); place(y, 0, bee(0.16, 260 * (1 + 0.6 * (tb / 0.16) ** 2), 1.0, 7000, 0.15) * np.interp(tb, [0, 0.03, 0.16], [0, 1, 0.8]), 0.5)
    place(y, c, tick(0.03, 1.0, 3500, 11000, 220)); place(y, c, ting(0.15, 4200, 0.3, 3.0)); place(y, c + 0.005, splat(0.12), 0.35)
    tf = tt(0.25); place(y, c + 0.01, bee(0.25, 300 * (1 - 0.3 * tf / 0.25), 1, 5000, 0.2) * np.exp(-tf * 14), 0.3)
    return cut(verb(y, 0.4, 0.12, 7000), d, 0.15)

# ---- fiender: Blodkatedralen ----
def choirboy():  # korgossen: en klar gossesopran som sjunger "Glo-ri-a" (e-g-a) med lite andning och knappt något vibrato, i kyrkans eko
    d = 1.9; y = np.zeros(int(d * SR))
    v = chant([(0.0, 76, 0.32, BOY_O), (0.34, 79, 0.28, BOY_I), (0.64, 81, 0.72, BOY_A)], 1.0, 0.007, 0.05, 9000, 1.0, 0.07)
    place(y, 0.03, v * env(len(v), 0.03, 0.3), 0.8)
    return cut(verb(y, 1.6, 0.4, 7000), d, 0.4)

def flagellant():  # botgöraren: två piskslag mot ryggen, ett plågat, dragande stön mellan dem och ett kort flämtande "ah!" efter det andra
    d = 1.7; y = np.zeros(int(d * SR))
    place(y, 0, lash()); place(y, 0.95, lash(0.9))
    dv = 0.75; k = tt(dv); f0 = np.interp(k, [0, 0.15, 0.5, dv], [130, 165, 150, 105])
    F = [(np.interp(k, [0, dv], [520, 640]), 90, 1), (np.interp(k, [0, dv], [900, 1100]), 120, 0.5), (2500, 220, 0.12)]
    v = growl(dv, f0, F, 0.35, 0.5, 5000, 1.6) * env(len(k), 0.04, 0.35) + nrm(reson(noise(dv), OH)) * env(len(k), 0.01, 0.4) * 0.25
    place(y, 0.12, v, 0.7)
    dv = 0.4; k = tt(dv); place(y, 1.03, growl(dv, np.interp(k, [0, 0.06, dv], [180, 210, 140]), HA, 0.3, 0.45, 5000, 1.6) * env(len(k), 0.01, 0.25), 0.55)
    return cut(verb(y, 1.0, 0.25, 5000), d, 0.3)

def cherub():  # keruben: ett barnsligt, fnissande "hi-hi-hi-hihi" (ljus röst med andning) och små fjäderlätta vingslag
    d = 1.4; y = np.zeros(int(d * SR)); t0 = 0.05
    steps = [(520, 0.08), (560, 0.08), (540, 0.08), (600, 0.07), (580, 0.07), (640, 0.22)]
    for i, (f, dd) in enumerate(steps):
        last = i == len(steps) - 1; dl = dd + 0.06; k = tt(dl)
        f0 = np.interp(k, [0, dd], [f * 0.95, f * (1.15 if last else 1.05)])
        F = [(fc * 1.15, bw, a) for fc, bw, a in (EE if i % 2 else EH)]
        v = nrm(voice(f0, F, 9000, jitter=0.01, roll=0.8)); h = nrm(reson(noise(dl), F))
        e = np.clip(k / 0.008, 0, 1) * np.exp(-k * (5 if last else 18)) * np.clip((dl - k) / 0.04, 0, 1)
        place(y, t0, v * e * 0.8 + h * (np.exp(-k * 60) * 0.5 + e * 0.15))
        t0 += dd + rng.uniform(0.03, 0.05)
    for tf in np.arange(0, d - 0.3, 0.085): place(y, tf, flap(0.08), 0.1 * rng.uniform(0.7, 1))
    return cut(verb(y, 0.9, 0.3, 7000), d, 0.3)

def cherub_shriek():  # kerubens skrik: ett genomträngande, skärande barnskrik som stiger och darrar (snabbt vibrato och skrovlighet),
    # en hög vinande ton som hänger kvar och ringer i öronen, och kyrkans eko
    d = 1.6; y = np.zeros(int(d * SR)); ds = 1.1; k = tt(ds)
    f0 = np.interp(k, [0, 0.12, 0.7, ds], [700, 1250, 1350, 1000]) * (1 + 0.025 * np.sin(2 * np.pi * 11 * k))
    F = [(np.interp(k, [0, 0.15, ds], [1100, 1700, 1500]), 200, 1.0), (2600, 300, 0.7), (4200, 400, 0.4)]
    v = nrm(voice(f0, F, 10000, jitter=0.015, roll=0.5))
    v = np.tanh(2.5 * v * (1 - 0.3 * (0.5 + 0.5 * np.sin(phase(f0 / 2))))) * env(len(k), 0.03, 0.35)
    place(y, 0, v, 0.8); place(y, 0, nrm(reson(noise(ds), [(1500, 200, 1.0), (2600, 300, 0.7), (4200, 400, 0.4)])) * env(len(k), 0.02, 0.4), 0.15)
    rt = tt(1.4); place(y, 0.1, np.sin(2 * np.pi * 3700 * rt) * (1 + 0.3 * np.sin(2 * np.pi * 9 * rt)) * env(len(rt), 0.2, 0.6) * np.exp(-rt * 1.2), 0.1)
    return cut(verb(y, 1.4, 0.35, 8000), d, 0.4)

# ---- fiender: Bikupan ----
def workerbee():  # arbetsbiet: ett par bin som surrar runt (tonhöjden svänger när de vänder), ljusare och snabbare än drottningen
    d = 1.2; t = tt(d); y = np.zeros(len(t))
    for f0, p0, g in ((265, 0, 1.0), (290, 1.7, 0.6), (240, 3.1, 0.45)):
        f = f0 * (1 + 0.06 * np.sin(2 * np.pi * 2.2 * t + p0) + 0.02 * lpnoise(d, 4))
        y += bee(d, f, g, 6000, 0.2) * (0.6 + 0.4 * np.sin(2 * np.pi * 2.2 * t + p0 + 0.8))
    y = nrm(y) * env(len(t), 0.1, 0.3)
    for _ in range(4): place(y, rng.uniform(0.2, 1.0), chitin(0.25))
    return cut(verb(y, 0.4, 0.1, 6000), d, 0.25)

def stingerknight():  # gaddkrigaren: ett djupt, tungt surr från stora vingar (låg vingtakt med mullrande undertoner), rustningen som
    # skramlar och klonkar i takt med vingslagen och ett hotfullt knaster från gadden
    d = 1.6; t = tt(d); y = np.zeros(len(t))
    f = 118 * (1 + 0.04 * np.sin(2 * np.pi * 1.5 * t) + 0.015 * lpnoise(d, 3)); a = env(len(t), 0.15, 0.4)
    y += bee(d, f, 1.0, 4000, 0.25, 0.25, 0.25) * a + bee(d, f * 0.5 * 1.003, 0.4, 1500, 0.4) * a
    y += nrm(fftfilt(noise(d), 60, 400)) * (0.5 + 0.5 * np.cos(phase(f / 4))) ** 3 * a * 0.3
    for t0 in (0.1, 0.42, 0.78, 1.1):
        place(y, t0, anvil(rng.uniform(800, 1000), 0.35, 0.2)); place(y, t0, chain(0.25, 5, None, (2000, 4500)), 0.15); place(y, t0, thud(90, 0.2, 0.0), 0.2)
    tc = 1.25
    for i in range(7): place(y, tc + i * 0.025, chitin(0.4 * (1 - i / 9)))
    return cut(verb(y, 0.8, 0.2, 5000), d, 0.3)

def larva():  # larven: slemmigt kladdande när den kryper (blöta smackar och bubblor), ett lågt, gurglande läte och kroppen som drar sig fram
    d = 1.4; t = tt(d); y = np.zeros(len(t))
    for t0 in (0.0, 0.35, 0.7, 1.0): place(y, t0, splat(0.25), 0.45 * rng.uniform(0.7, 1))
    y += bubbles(d, 25, 300, 900, 0.3)
    y += nrm(svf(noise(d), 500 + 300 * lpnoise(d, 4), 3.0)) * 0.12 * (0.5 + 0.5 * np.sin(2 * np.pi * 2.8 * t)) ** 2
    dv = 0.55; k = tt(dv); f0 = np.interp(k, [0, 0.2, dv], [80, 140, 105])
    v = growl(dv, f0, [(450, 80, 1), (1100, 150, 0.4), (2400, 200, 0.1)], 0.6, 0.6, 3500, 1.8)
    place(y, 0.45, v * env(len(k), 0.05, 0.2) * (0.6 + 0.4 * np.sin(phase(18 + 6 * lpnoise(dv, 5)))), 0.5)
    return cut(verb(y, 0.6, 0.15, 4000), d, 0.3)

def larva_spit():  # larven spottar: ett gurglande uppsamlande ur strupen, ett blött "ptoo" och syran som fräser iväg
    d = 0.95; y = np.zeros(int(d * SR)); c = 0.3; kg = tt(c)
    place(y, 0, (bubbles(c, 18, 250, 700, 1.0) + nrm(svf(noise(c), 400 + 600 * (kg / c), 4)) * 0.4) * (kg / c), 0.5)
    place(y, c, puff(0.12, 300, 3000, 1.0, 0.05), 0.7); place(y, c, splat(0.2), 0.7); place(y, c, gloop(260, 0.1), 0.4)
    tf = tt(0.6); a = np.interp(tf, [0, 0.03, 0.6], [0, 1, 0])
    place(y, c + 0.02, nrm(fftfilt(noise(0.6), 3000, 10000)) * a * (1 + 0.6 * lpnoise(0.6, 40)), 0.18)
    place(y, c + 0.02, swish(0.4, 2000, 700, 2.0), 0.25)
    return cut(verb(y, 0.5, 0.15, 6000), d, 0.25)

def larva_hatch():  # larvsäcken kläcks: hinnan spänns och knarrar blött, rivs upp med ett slemmigt ritsch, innehållet plaskar ut och
    # två-tre nykläckta larver piper och kladdar
    d = 1.7; t = tt(d); y = np.zeros(len(t)); c = 0.45
    place(y, 0, creak(0.45, 15, 40, 220) * np.linspace(0.3, 1, int(0.45 * SR)), 0.35); place(y, 0, bubbles(0.45, 10, 300, 800), 0.3)
    place(y, c - 0.02, crackle(0.25, 400, 600, 5000), 0.6); place(y, c, fftfilt(noise(0.15), 400, 3000) * np.exp(-tt(0.15) * 20), 0.4)
    place(y, c, splat(0.35), 0.9); place(y, c, thud(90, 0.3, 0.0), 0.4); place(y, c + 0.02, gloop(200, 0.2), 0.5)
    y += bubbles(d, 30, 250, 900, 0.3, np.interp(t, [0, c, c + 0.1, d], [0, 0, 1, 0.1]))
    for t0, fa in ((1.0, 900), (1.2, 1100), (1.38, 1000)):
        k = tt(0.14); f0 = np.interp(k, [0, 0.05, 0.14], [fa, fa * 1.3, fa * 1.1])
        place(y, t0, nrm(voice(f0, [(1600, 300, 1), (3000, 500, 0.4)], 8000, jitter=0.03, roll=0.7)) * env(len(k), 0.01, 0.06), 0.18)
        place(y, t0 + 0.05, splat(0.12), 0.15)
    return cut(verb(y, 0.7, 0.2, 5000), d, 0.3)

def larva_squish():  # larven krossas: ett blött, krasande mos (skal som spricker), ett plask av innanmäte och slemmiga efterbubblor
    d = 0.75; y = np.zeros(int(d * SR))
    place(y, 0, splat(0.3), 1.0); place(y, 0, thud(100, 0.25, 0.5), 0.5); place(y, 0.005, debris(0.15, 12, 1500, 5000, 0.06), 0.4)
    place(y, 0.02, gloop(180, 0.15), 0.4); place(y, 0.05, bubbles(0.5, 12, 300, 1000), 0.35); place(y, 0.1, splat(0.2), 0.3)
    return cut(verb(y, 0.5, 0.12, 5000), d, 0.2)

# ---- bossar ----
def cardinal_chant():  # kardinalen mässar: en djup bas på ett recitationstonfall ("Do-mi-ne, De-us"), en låg kör som håller en
    # tom kvint under honom och katedralens långa efterklang
    d = 3.0; y = np.zeros(int(d * SR))
    v = chant([(0.0, 50, 0.38, B_O), (0.4, 50, 0.3, B_I), (0.72, 52, 0.36, B_E), (1.1, 50, 0.3, B_E), (1.42, 48, 0.36, B_E), (1.8, 50, 0.7, B_U)],
              1.0, 0.006, 0.06, 5000, 0.8, 0.04)
    v = np.tanh(1.4 * nrm(v)) * env(len(v), 0.05, 0.3); place(y, 0.05, v, 0.8)
    place(y, 2.45, fftfilt(noise(0.18), 4000, 10000) * env(int(0.18 * SR), 0.02, 0.08), 0.06)
    c = nrm(choir([38, 45], 2.7, 0.5, 0.8, 1.0, vib=4.0, F=OH, hmax=3500)); place(y, 0.1, c, 0.18)
    return cut(verb(y, 2.6, 0.45, 4000), d, 0.5)

def cardinal_laugh():  # kardinalen skrattar: ett djupt, mättat "ho-ho-ho-hooo" som ekar mellan pelarna
    d = 2.5; y = np.zeros(int(d * SR)); t0 = 0.0
    for i, (f, dd) in enumerate([(112, 0.16), (106, 0.16), (100, 0.16), (94, 0.6)]):
        last = i == 3; dl = dd + 0.15; k = tt(dl)
        f0 = np.interp(k, [0, dd], [f * 1.12, f * (0.75 if last else 0.92)])
        F = [(np.interp(k, [0, dl], [750, 480]), 110, 1.0), (np.interp(k, [0, dl], [1200, 850]), 130, 0.5), (2600, 200, 0.15)]
        s = growl(dl, f0, F, 0.3, 0.3, 5000, 1.7); h = nrm(reson(noise(dl), HA)) * np.exp(-k * 40) * 0.5
        e = np.clip(k / 0.01, 0, 1) * (np.clip((dd + 0.1 - k) / 0.45, 0, 1) if last else np.exp(-k * 8) * np.clip((dd + 0.05 - k) / 0.05, 0, 1))
        place(y, t0, s * e + h); t0 += dd + 0.08
    e0 = y.copy(); place(y, 0.33, e0, 0.28); place(y, 0.66, e0, 0.1)
    return cut(verb(fftfilt(y, 40, 6000), 2.2, 0.45, 4000), d, 0.5)

def queenbee_buzz():  # bidrottningen: ett väldigt, dånande surr – enorma vingar med låg vingtakt och mullrande subharmonik, vingslagens
    # luftstötar, ett moln av arbetsbin runt henne och ett tonhöjdssvep när hon lyfter
    d = 2.8; t = tt(d); y = np.zeros(len(t))
    f = np.interp(t, [0, 0.5, 1.6, d], [62, 82, 86, 78]) * (1 + 0.02 * lpnoise(d, 3)); a = np.interp(t, [0, 0.3, 2.0, d], [0, 1, 0.9, 0])
    y += bee(d, f, 1.0, 3500, 0.3, 0.2, 0.2) * a + bee(d, f * 0.5, 0.5, 1200, 0.45, 0.1, 0.0) * a + bee(d, f * 2.01, 0.3, 6000, 0.15) * a
    y += nrm(fftfilt(noise(d), 40, 400)) * (0.5 + 0.5 * np.cos(phase(f))) ** 4 * a * 0.4
    y += bees(d, 10, 220, 340, 0.25) * np.interp(t, [0, 0.5, d], [0.3, 1, 0.6])
    y += low_rumble(d, 31) * a * 0.3
    return cut(verb(fftfilt(y, 25, 7000), 1.2, 0.25, 4000), d, 0.5)

# ---- miljö ----
def honey_splash():  # honungsplask: ett tjockt, segt "splotsch", långsamma klibbiga bubblor, en seg tråd som dras ut och en droppe som släpper
    d = 1.0; y = np.zeros(int(d * SR)); k = tt(0.35)
    place(y, 0, nrm(reson(noise(0.35), [(220, 60, 1), (520, 120, 0.6), (1300, 300, 0.25)])) * np.exp(-k * 14) * env(len(k), 0.004, 0.05), 0.9)
    place(y, 0, thud(110, 0.25, 0.0), 0.3)
    for t0, f in ((0.03, 210), (0.12, 260), (0.25, 180), (0.4, 240)): place(y, t0, gloop(f, rng.uniform(0.12, 0.2)), 0.35)
    ks = tt(0.4); place(y, 0.3, nrm(svf(noise(0.4), 300 + 500 * ks / 0.4, 6)) * np.sin(np.pi * ks / 0.4) ** 2, 0.12)
    place(y, 0.72, honeydrip(), 0.4)
    return cut(verb(y, 0.5, 0.12, 4000), d, 0.25)

def bless_beam():  # välsignelse i ljusstråken: en ljus kör som sväller in (gossesopraner i A-dur, "aah"), ett skimrande celesta-
    # arpeggio och glasharmonika som klingar ut
    d = 1.4; y = np.zeros(int(d * SR))
    place(y, 0, nrm(choir([76, 81, 85, 88], 1.1, 0.12, 0.6, 1.0, vib=5.5, F=SOP, hmax=8000)), 0.5)
    for i, n in enumerate((81, 85, 88, 93, 97)): place(y, 0.02 + 0.06 * i, bar(m2f(n), 0.8, 0.18, dec=3))
    for n in (93, 100): place(y, 0.05, glass(n, 1.2, 0.15, att=0.05, rel=0.8))
    place(y, 0, swish(0.6, 3000, 9000, 2.0), 0.05)
    return cut(verb(y, 1.4, 0.4, 9000), d, 0.4)

def bell_ring():  # kyrkklockan ringer: kläppen slår an en stor bronsklocka (djup hum-ton, klangen med sin mollters svävar och
    # klingar länge), och när klockan svänger tillbaka slår kläppen an en gång till, svagare
    d = 5.0; y = np.zeros(int(d * SR))
    for t0, g in ((0.0, 1.0), (1.7, 0.5)):
        place(y, t0, bell(50, d - t0, g) + bell(50.03, d - t0, 0.3 * g))
        place(y, t0, anvil(700, 0.3, 0.25 * g)); place(y, t0, thud(60, 0.4, 0.0), 0.35 * g); place(y, t0, tick(0.02, 0.4 * g, 2000, 8000, 300))
    return cut(verb(y, 3.0, 0.35, 4000), d, 1.2)

def font_break():  # blodfunten brister: stenen knakar, en tung smäll när skålen spricker, stenbitar som rasar, och blodet som forsar
    # ut (tjockt plask och gurgel) och droppar
    d = 2.0; t = tt(d); y = np.zeros(len(t)); c = 0.18
    place(y, 0, crack(0.06, 0.25, 1500)); place(y, 0.07, crack(0.05, 0.2, 1200)); place(y, 0, creak(0.18, 30, 60, 600), 0.2)
    place(y, c, thud(55, 0.8, 0.6)); place(y, c, crack(0.1, 0.35, 900)); place(y, c, debris(1.0, 50, 500, 4000, 0.5), 0.6)
    a = np.interp(t, [0, c, c + 0.05, 0.8, 1.6, d], [0, 0, 1, 0.6, 0.15, 0])
    y += nrm(reson(noise(d), [(300, 120, 1), (800, 250, 0.6), (1800, 400, 0.3)])) * a * (0.7 + 0.3 * lpnoise(d, 15)) * 0.8
    y += bubbles(d, 50, 200, 800, 0.4, a + 0.01); place(y, c + 0.02, splat(0.3), 0.6); place(y, c + 0.05, gloop(160, 0.25), 0.4)
    for t0 in (1.2, 1.45, 1.7, 1.85): place(y, t0, bubble(rng.uniform(700, 1100), 0.06, 1, 1.0), 0.25)
    return cut(verb(y, 1.2, 0.3, 5000), d, 0.4)

def cathedral_hum(d=4.8):  # katedralens stillhet (slinga 4 s): en låg orgelton (d-a-d-a) som ligger kvar i valven (mycket smalbandigt
    # brus på pipornas delton, så att överlappningen i skarven inte svävar), luftigt sus, och två avlägsna steg på sten som ekar i
    # valven; stegen ligger mellan 0,8 och 4 s så att efterklangen fortsätter rätt över skarven
    F = [(m2f(n) * r, 0.5, a * ra) for n, a in ((38, 1.0), (45, 0.7), (50, 0.55), (57, 0.3), (62, 0.2), (69, 0.08)) for r, ra in ((1, 1), (2, 0.35), (3, 0.12))]
    y = nrm(reson(noise(d), F)) * 0.5 * (0.85 + 0.15 * lpnoise(d, 0.8))
    y += nrm(fftfilt(noise(d), 80, 500)) * 0.1 * (0.8 + 0.2 * lpnoise(d, 1)) + nrm(fftfilt(noise(d), 2000, 7000)) * 0.015
    ev = np.zeros(len(y)); step = fftfilt(thud(130, 0.15, 0.0) * 0.6 + clack(800, 1, 150, 0.15) * 0.4, 0, 3000)
    for t0, g in ((1.0, 1.0), (2.7, 0.8)):
        for j, eg in enumerate((1.0, 0.4, 0.16)): place(ev, t0 + 0.3 * j, step, 0.12 * g * eg)
    return y + verb(ev, 2.0, 0.8, 3000, tail=False)

def hive_hum(d=4.8):  # bikupans surr (slinga 4 s): en tät svärm bakom vaxväggarna (många bin, så att överlappningen inte märks),
    # ett lågt vibrerande brum i kupan (smalbandigt brus), tröga honungsdroppar och vax som knarrar (mellan 0,8 och 4 s)
    y = fftfilt(bees(d, 16, 200, 320, 0.5, 3500, 0.5), 100, 3000)
    y += nrm(reson(noise(d), [(120, 1.5, 1), (240, 2, 0.5), (360, 2.5, 0.25)])) * 0.3 * (0.85 + 0.15 * lpnoise(d, 2))
    for t0 in (0.95, 1.9, 2.6, 3.5): place(y, t0, honeydrip(), 0.3)
    place(y, 2.2, creak(0.4, 12, 25, 260), 0.06)
    return y

FX = dict(censer_swing=censer_swing, censer_hit=censer_hit, hive_fire=hive_fire, bee_buzz=bee_buzz, bee_sting=bee_sting,
          choirboy=choirboy, flagellant=flagellant, cherub=cherub, cherub_shriek=cherub_shriek, workerbee=workerbee,
          stingerknight=stingerknight, larva=larva, larva_spit=larva_spit, larva_hatch=larva_hatch, larva_squish=larva_squish,
          cardinal_chant=cardinal_chant, cardinal_laugh=cardinal_laugh, queenbee_buzz=queenbee_buzz, honey_splash=honey_splash,
          bless_beam=bless_beam, bell_ring=bell_ring, font_break=font_break, cathedral_hum=cathedral_hum, hive_hum=hive_hum)

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


# ---- fler instrument: kyrka och bikupa ----
FL = ((1, 1), (2, 0.45), (4, 0.15))                                          # orgelns flöjtregister 8' 4' 2'
PED = ((0.5, 1), (1, 0.6), (2, 0.2))                                         # pedal 16' 8' 4'
PLENO = ((0.5, 0.6), (1, 1), (2, 0.7), (3, 0.35), (4, 0.45), (6, 0.2), (8, 0.25), (12, 0.1), (16, 0.08))  # fullt verk med mixtur
REED = ((1, 1), (2, 0.8), (3, 0.6), (4, 0.5), (5, 0.4), (6, 0.3), (7, 0.2), (8, 0.15), (10, 0.08))       # tungstämma (trumpet)

def lbuzz(L, n, g=1.0, duty=0.2, hi=3000, am=0, depth=0.0):  # sömlöst bisurr i slingan: två svävande pulsvågor med helt antal
    # perioder på slingan; styrkan pulserar am gånger per slinga (helt tal, så att pulsen går jämnt över skarven)
    f = L.q(m2f(n)); f2 = L.q(m2f(n) * 1.006)
    y = pulsewave(2 * np.pi * f * L.t, hi, f, duty) + 0.6 * pulsewave(2 * np.pi * f2 * L.t + 1.0, hi, f2, duty)
    y = fftfilt(nrm(y), 40, hi)
    if am: y *= 1 - depth * (0.5 + 0.5 * np.cos(2 * np.pi * am / L.T * L.t))
    return nrm(y) * g

def beelead(notes, g=1.0):  # melodi i "bisurr": en surrande pulsvåg som glider mellan tonerna, med ett svävande vibrato
    t, f0, amp, since = legato(notes, 0.04)
    f = f0 * (1 + 0.012 * np.sin(2 * np.pi * 6.5 * t) * np.clip((since - 0.1) / 0.2, 0, 1))
    return fftfilt(bee(0, f, 1.0, 5000, 0.22, 0.15, 0.1), 150, 4500) * amp * g

def riser(d, f0=230, f1=330, n=6, g=1.0):  # svärm som lyfter: bin vars vingtakt stiger, sväller in mot nästa fras
    t = tt(d); y = np.zeros(len(t))
    for _ in range(n): y += bee(d, rng.uniform(0.9, 1.1) * f0 * (f1 / f0) ** (t / d), 1.0, 5000, rng.uniform(0.15, 0.3))
    return nrm(y) * (t / d) ** 2 * env(len(t), 0.01, 0.03) * g

# ---- cathedral: Blodkatedralen, a-moll, 72 bpm, 12 takter = 40 s (Am Dm Am E | F Dm G C | F Dm E E) ----
# grund: mörk drone och orgelpedal, mjuka orgelackord (flöjtregister) i en mycket stor efterklang, en manskör som mässar en
# gregoriansk melodi i första halvan och en gossesopran som svarar i andra, rörklocka vid varje fras.
# hi: pauka på ettan och trean, låga stråkar spiccato i åttondelar, orgelns ljusa arpeggio i åttondelar, virvel på fyran,
# en virvel och en baklänges cymbal inför varje fras.
def cathedral():
    b = 60 / 72; T = 48 * b; base = Loop(T); hi = Loop(T)
    slots = ['Am', 'Dm', 'Am', 'E', 'F', 'Dm', 'G', 'C', 'F', 'Dm', 'E', 'E']
    chord = {'Am': [57, 60, 64], 'Dm': [57, 62, 65], 'E': [56, 59, 64], 'F': [57, 60, 65], 'G': [55, 59, 62], 'C': [55, 60, 64]}
    root = {'Am': 33, 'Dm': 38, 'E': 40, 'F': 41, 'G': 43, 'C': 36}
    base.add(0, base.drone(33, 0.07, h=6, roll=1.6, cyc=3, hi=250))
    base.add(0, base.bed(80, 500, 0.008, cyc=3)); base.add(0, base.bed(2500, 8000, 0.0015, cyc=4))
    for s, c in enumerate(slots):
        t0 = s * 4 * b; ch = chord[c]; r = root[c]
        base.add(t0 - 0.08, organ(ch, 4 * b + 0.35, att=0.3, rel=0.45, stops=FL, chiff=0.05, hi=3000), -0.2, 0.24)
        base.add(t0 - 0.08, organ([r + 12], 4 * b + 0.35, att=0.2, rel=0.45, stops=PED, chiff=0.02, hi=600), 0.05, 0.17)
        if s % 4 == 0: base.add(t0, tubebell(r + 36, 5.0, 0.07), 0.35)
        hi.add(t0, taiko(0.5, 38, 1.4), 0); hi.add(t0 + 2 * b, taiko(0.35, 43, 1.2), 0)
        for k8 in range(8): hi.add(t0 + k8 * b / 2, spicc([r + 12, r + 24], 0.22, 0.3 if k8 % 2 == 0 else 0.2, 1800), -0.1)
        arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12, ch[0] + 24, ch[2] + 12, ch[1] + 12, ch[2] + 12]
        for k8 in range(8): hi.add(t0 + k8 * b / 2, organ([arp[k8]], b / 2 * 0.95, att=0.01, rel=0.08, stops=((1, 1), (2, 0.6), (4, 0.3), (8, 0.1)), chiff=0.25, hi=6000), 0.35, 0.12 if k8 % 2 == 0 else 0.09)
        if s % 4 == 3:
            for k in range(6): hi.add(t0 + 3 * b + k * b / 6, snare(0.05 + 0.025 * k), 0.15)
            hi.add(t0 + 4 * b - 2.0, crash_cym(0.1, 2.0)[::-1], -0.3)
        else: hi.add(t0 + 3 * b, snare(0.12), 0.15)
    for p in (0, 16, 32): hi.add(p * b, crash_cym(0.07, 2.5), 0.3)
    V = [B_I, B_E, B_A, B_O, B_U, B_E]
    men = [(0, 57, 1), (1, 60, 1), (2, 64, 2), (4, 62, 1), (5, 65, 1), (6, 64, 1), (7, 62, 1), (8, 60, 1), (9, 59, 1), (10, 57, 2),
           (12, 56, 1), (13, 59, 1), (14, 64, 2), (16, 65, 1), (17, 64, 1), (18, 60, 2), (20, 62, 1), (21, 60, 1), (22, 57, 2)]
    base.add(0, mens([(t * b, n, d * b, V[i % 6]) for i, (t, n, d) in enumerate(men)], (0.996, 1.0, 1.005, 0.5 * 1.002), vib=0.005, hmax=5000, breath=0.04), 0.1, 0.4)
    VB = [BOY_A, BOY_E, BOY_I, BOY_O]
    boy = [(0, 79, 2), (2, 74, 1), (3, 79, 1), (4, 76, 3), (7, 74, 1), (8, 77, 2), (10, 76, 1), (11, 72, 1), (12, 74, 2), (14, 77, 2),
           (16, 76, 3), (19, 71, 1), (20, 68, 2), (22, 71, 1), (23, 76, 1.2)]
    bv = [(t * b, n, d * b, VB[i % 4]) for i, (t, n, d) in enumerate(boy)]
    base.add(24 * b, nrm(chant(bv, 1.0, 0.007, 0.05, 9000, 1.0, 0.06) + 0.4 * chant(bv, 1.0, 0.007, 0.05, 9000, 1.0, 0.06, 1.004)), 0.15, 0.3)
    base.reverb(5.0, 0.55, 4500, 0.04); hi.reverb(2.0, 0.25, 5000)
    write_aligned((base, 'cathedral', -20), (hi, 'cathedral_hi', -23))

# ---- hive: Bikupan, fiss-moll, 104 bpm, 16 takter = 36,9 s (F#m D Bm C# | F#m A D C#, två takter vardera) ----
# grund: ett lågt bisurr som pulserar på slagen (sömlöst, helt antal perioder), mjuka stråkar, marimba-arpeggio i åttondelar
# (vax och trä), knäppt bas, tröga honungsdroppar; melodin i okarina och sedan i "bisurr" i andra halvan.
# hi: slitstrummor i ett hackigt insektsmönster i sextondelar, kitinklick, bastrumma och virvel, pulserande bas i sextondelar,
# stråkdrill (halvtonssurr) i sextondelar och en svärm som lyfter inför varje fras.
def hive():
    b = 60 / 104; T = 64 * b; base = Loop(T); hi = Loop(T)
    slots = ['F#m', 'D', 'Bm', 'C#', 'F#m', 'A', 'D', 'C#']
    chord = {'F#m': [61, 66, 69], 'D': [62, 66, 69], 'Bm': [62, 66, 71], 'C#': [61, 65, 68], 'A': [61, 64, 69]}
    root = {'F#m': 30, 'D': 26, 'Bm': 35, 'C#': 37, 'A': 33}
    base.add(0, lbuzz(base, 42, 0.07, 0.2, 2500, am=64, depth=0.4)); base.add(0, lbuzz(base, 54, 0.03, 0.15, 4000, am=32, depth=0.5))
    base.add(0, base.bed(150, 700, 0.008, cyc=4)); base.add(0, base.bed(3000, 8000, 0.0015, cyc=5))
    for _ in range(int(T * 1.2)): base.add(rng.uniform(0, T), gloop(rng.uniform(250, 500), rng.uniform(0.08, 0.15), rng.uniform(0.02, 0.05)), rng.uniform(-0.7, 0.7))
    pat = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0]
    for s, c in enumerate(slots):
        t0 = s * 8 * b; ch = chord[c]; r = root[c]
        base.add(t0 - 0.4, strings([n - 12 for n in ch], 8 * b + 0.8, att=0.6, rel=0.8, g=0.18, hi=1200), -0.2)
        base.add(t0 - 0.1, strings([r + 12], 8 * b + 0.3, att=0.3, rel=0.5, g=0.2, hi=400), 0.05)
        arp = [ch[0], ch[1], ch[2], ch[1] + 12, ch[2], ch[1], ch[0] + 12, ch[2]]
        for bar_ in range(2):
            t1 = t0 + bar_ * 4 * b
            for k8 in range(8): base.add(t1 + k8 * b / 2 + rng.uniform(-0.005, 0.005), marimba(arp[(k8 + 3 * bar_) % 8], 1.0, 0.18 if k8 % 4 == 0 else 0.12), -0.35 + 0.1 * (k8 % 4))
            for tb in (0, 1.5, 3): base.add(t1 + tb * b, pluck(r + 12, 1.2, 1.2, 0.22 if tb == 0 else 0.15), 0.05)
            for k16 in range(16):
                if pat[k16]: hi.add(t1 + k16 * b / 4, logdrum(220 if k16 % 4 == 0 else 320, 0.3 if k16 % 4 == 0 else 0.2), 0.3 if k16 % 2 else -0.3)
                hi.add(t1 + k16 * b / 4, chitin(0.06 if k16 % 2 else 0.035), 0.5)
                hi.add(t1 + k16 * b / 4, spicc([ch[2] + 12 + (1 if k16 % 2 else 0)], 0.1, 0.07, 3500), 0.35)
            for tb in (0, 2.5): hi.add(t1 + tb * b, drum(55, 0.6, 0.5 if tb == 0 else 0.35, 0.12, dec=8), 0)
            for tb in (1, 3): hi.add(t1 + tb * b, snare(0.12), 0.15)
            hi.add(t1, pbass(r + 12, 4 * b + 0.02, 4 / b, 0.22, 2.0), 0)
        if s % 4 == 3: hi.add(t0 + 6 * b, riser(2 * b, 220, 340, 6, 0.25), -0.2)
    mel1 = [(0, 73, 1.5), (1.5, 74, 0.5), (2, 73, 1), (3, 69, 1), (4, 66, 3), (7, 68, 1), (8, 69, 1.5), (9.5, 71, 0.5), (10, 69, 1), (11, 66, 1),
            (12, 62, 3), (15, 64, 1), (16, 66, 1.5), (17.5, 68, 0.5), (18, 69, 1), (19, 71, 1), (20, 74, 3), (23, 73, 1), (24, 73, 2), (26, 72, 1),
            (27, 73, 1), (28, 77, 2), (30, 75, 1), (31, 73, 1)]
    for t0, n, dd in mel1: base.add(t0 * b, ocarina(n, dd * b + 0.08, 0.22), 0.15)
    mel2 = [(0, 78, 1.5), (1.5, 76, 0.5), (2, 73, 1), (3, 78, 1), (4, 81, 3), (7, 80, 1), (8, 81, 1.5), (9.5, 80, 0.5), (10, 76, 1), (11, 73, 1),
            (12, 76, 3), (15, 78, 1), (16, 78, 1.5), (17.5, 76, 0.5), (18, 74, 1), (19, 78, 1), (20, 81, 2), (22, 78, 2), (24, 77, 1.5), (25.5, 78, 0.5),
            (26, 77, 1), (27, 73, 1), (28, 80, 2), (30, 77, 1), (31, 73, 1)]
    base.add(32 * b, beelead([(t * b, n - 12, d * b) for t, n, d in mel2]), 0.15, 0.2)
    hi.add(0, crash_cym(0.1, 2.5), 0.3); hi.add(32 * b, crash_cym(0.08, 2.5), -0.3)
    base.reverb(3.0, 0.4, 4500, 0.03); hi.reverb(1.6, 0.22, 5000)
    write_aligned((base, 'hive', -20), (hi, 'hive_hi', -23))

# ---- boss13: kardinalen, d-moll, 100 bpm, 16 takter = 38,4 s (Dm Bb Gm A | Dm C Bb A, två takter vardera) ----
# mörkt och liturgiskt: fullt orgelverk som ligger, pedalen i åttondelar, en manskör som sjunger "Dies irae" (den medeltida
# sekvensen, fri från upphovsrätt) i halvnoter, tunga pukor/taiko på ettan och trean, rörklocka vid varje ackordbyte, låga
# stråkar i tremolo; i andra halvan sjunger kören temat en oktav upp med orgelns trumpetstämma, med virvel och ljusare kör.
def boss13():
    b = 0.6; T = 64 * b; L = Loop(T)
    slots = ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'C', 'Bb', 'A']
    chord = {'Dm': [62, 65, 69], 'Bb': [62, 65, 70], 'Gm': [62, 67, 70], 'A': [61, 64, 69], 'C': [60, 64, 67]}
    root = {'Dm': 38, 'Bb': 34, 'Gm': 31, 'A': 33, 'C': 36}
    L.add(0, L.bed(30, 200, 0.03, cyc=8)); L.add(0, L.drone(26, 0.15, h=8, roll=1.4, cyc=8, hi=250))
    for s, c in enumerate(slots):
        t0 = s * 8 * b; ch = chord[c]; r = root[c]; half = s >= 4
        L.add(t0 - 0.04, organ([n - 12 for n in ch] + [ch[0]], 8 * b + 0.1, att=0.04, rel=0.15, stops=PLENO, chiff=0.12, hi=7000), -0.1, 0.3)
        for k8 in range(16): L.add(t0 + k8 * b / 2, organ([r + 24 if k8 % 4 == 2 else r + 12], b / 2 * 0.85, att=0.01, rel=0.05, stops=PED, chiff=0.08, hi=900), 0, 0.32 if k8 % 2 == 0 else 0.24)
        L.add(t0, tubebell(r + 36 if r + 36 < 72 else r + 24, 4.0, 0.12), 0.4)
        L.add(t0 - 0.3, nrm(choir([n - 12 for n in ch], 8 * b + 0.6, 0.4, 0.5, 1.0, vib=4.0, F=AA if half else OH, hmax=4000)), 0.15, 0.24 if half else 0.15)
        L.add(t0, strings([r + 12, r + 24], 8 * b, att=0.1, rel=0.3, g=0.2, hi=900, trem=10), -0.3)
        for bar_ in range(2):
            t1 = t0 + bar_ * 4 * b
            L.add(t1, taiko(0.65, 38, 1.4), 0); L.add(t1 + 2 * b, taiko(0.5, 43, 1.2), 0)
            L.add(t1 + 1.5 * b, logdrum(120, 0.3), -0.3); L.add(t1 + 3.5 * b, logdrum(150, 0.3), 0.3)
            if half: L.add(t1 + b, snare(0.22), 0.15); L.add(t1 + 3 * b, snare(0.26), 0.15)
    di = [(0, 65, 2, B_I), (2, 64, 2, B_E), (4, 65, 2, B_I), (6, 62, 2, B_A), (8, 64, 2, B_I), (10, 60, 2, B_E), (12, 62, 2, B_I), (14, 62, 2, B_A),
          (16, 65, 2, B_O), (18, 65, 2, B_E), (20, 67, 2, B_E), (22, 65, 2, B_U), (24, 64, 2, B_I), (26, 62, 2, B_A), (28, 61, 2, B_I), (30, 62, 2, B_A)]
    ph = [(t * b, n - 12, d * b * 0.95, v) for t, n, d, v in di]
    L.add(0, mens(ph, (0.996, 1.0, 1.005, 0.5), vib=0.004, hmax=4500, breath=0.03, gap=0.6), 0.1, 0.32)
    L.add(32 * b, mens([(t, n + 12, d, v) for t, n, d, v in ph], (0.996, 1.0, 1.005, 0.5), vib=0.005, hmax=5000, breath=0.03, gap=0.6), 0.1, 0.3)
    for t, n, d, _ in di: L.add((32 + t) * b, organ([n, n + 12], d * b * 0.95, att=0.02, rel=0.12, stops=REED, chiff=0.1, hi=6000), -0.2, 0.2)
    for t0 in (0, 32): L.add(t0 * b, crash_cym(0.25, 3.0), 0.3); L.add(t0 * b, taiko(0.9, 34, 2.0), 0)
    for k in range(12): L.add(T - 2 * b + k * b / 6, drum(45, 0.4, 0.15 + 0.03 * k, 0.1, dec=7), 0)
    L.reverb(3.2, 0.4, 4500)
    write_aligned((L, 'boss13', -19))

# ---- boss14: bidrottningen, e-moll, 132 bpm, 16 takter = 29,1 s (Em C Am B | Em G F B, två takter vardera) ----
# surrande och pulserande: ett bisurr som pulserar i sextondelar (sömlöst), pulserande bas, ett surrande ackord, stråkar som
# kryper kromatiskt i sextondelar (som en humla), insektsrytm på slitstrummor (3-3-2), kitinklick, taiko och virvel; melodin i
# stråkar och sedan i distad mässing med mässingsstötar i andra halvan, och en svärm som lyfter inför varje fras.
def boss14():
    b = 60 / 132; T = 64 * b; L = Loop(T)
    slots = ['Em', 'C', 'Am', 'B', 'Em', 'G', 'F', 'B']
    chord = {'Em': [64, 67, 71], 'C': [64, 67, 72], 'Am': [64, 69, 72], 'B': [63, 66, 71], 'G': [62, 67, 71], 'F': [65, 69, 72]}
    root = {'Em': 28, 'C': 36, 'Am': 33, 'B': 35, 'G': 31, 'F': 29}
    L.add(0, lbuzz(L, 40, 0.09, 0.25, 2500, am=256, depth=0.6)); L.add(0, L.bed(30, 200, 0.03, cyc=8))
    fig = [0, -1, 0, 1, 0, -1, -2, -1]
    for s, c in enumerate(slots):
        t0 = s * 8 * b; ch = chord[c]; r = root[c]; half = s >= 4
        L.add(t0 - 0.02, pbass(r + 12, 8 * b + 0.02, 4 / b, 0.32, 2.4), 0)
        for i, n in enumerate(ch): L.add(t0, fftfilt(bee(8 * b, m2f(n - 12), 1.0, 4000, 0.2), 100, 3000) * env(int(8 * b * SR), 0.05, 0.1), -0.4 + 0.4 * i, 0.05)
        for k16 in range(32): L.add(t0 + k16 * b / 4, spicc([ch[2] + fig[k16 % 8]], 0.11, 0.2 if k16 % 4 == 0 else 0.13, 4000), 0.35)
        for bar_ in range(2):
            t1 = t0 + bar_ * 4 * b
            L.add(t1, taiko(0.6, 40, 1.0), 0); L.add(t1 + 1.75 * b, drum(52, 0.5, 0.4, 0.12, dec=8), 0); L.add(t1 + 2 * b, taiko(0.45, 45, 0.9), 0)
            L.add(t1 + b, snare(0.2), 0.15); L.add(t1 + 3 * b, snare(0.24), 0.15)
            for k16 in (0, 3, 6, 8, 11, 14): L.add(t1 + k16 * b / 4, logdrum(260 if k16 in (0, 8) else 340, 0.3), -0.3 if k16 % 2 else 0.3)
            for k16 in range(16): L.add(t1 + k16 * b / 4, chitin(0.07 if k16 % 2 else 0.04), 0.5 if k16 % 2 else -0.5)
            if half:
                for tb in (0, 1.5, 3): L.add(t1 + tb * b, brass([r + 24, r + 31], 0.25, att=0.01, rel=0.1, drive=3.0, swell=0.05, lo_fc=350, hi_fc=2000), -0.15, 0.22)
        if s % 4 == 3: L.add(t0 + 6 * b, riser(2 * b, 230, 360, 8, 0.3), 0.2)
    mel = [(0, 76, 1.5), (1.5, 75, 0.5), (2, 76, 1), (3, 79, 1), (4, 83, 3), (7, 81, 1), (8, 79, 1.5), (9.5, 76, 0.5), (10, 72, 1), (11, 76, 1),
           (12, 79, 3), (15, 77, 1), (16, 76, 1.5), (17.5, 77, 0.5), (18, 76, 1), (19, 72, 1), (20, 69, 3), (23, 71, 1), (24, 75, 2), (26, 78, 1),
           (27, 81, 1), (28, 83, 2), (30, 78, 1), (31, 75, 1),
           (32, 76, 1), (33, 79, 1), (34, 83, 1), (35, 88, 1), (36, 86, 2), (38, 83, 2), (40, 86, 1.5), (41.5, 83, 0.5), (42, 79, 1), (43, 83, 1),
           (44, 86, 3), (47, 83, 1), (48, 84, 2), (50, 81, 1), (51, 77, 1), (52, 81, 3), (55, 84, 1), (56, 83, 2), (58, 81, 1), (59, 78, 1),
           (60, 75, 2), (62, 71, 2)]
    for t0, n, dd in mel:
        if t0 < 32: L.add(t0 * b, strings([n - 12, n], dd * b + 0.1, att=0.05, rel=0.2, g=0.3, hi=2600, vib=0.006), 0.2)
        else:
            L.add(t0 * b, brass([n - 12, n - 24], dd * b + 0.08, att=0.02, rel=0.15, drive=2.6, swell=0.2, hi_fc=2800), 0.2, 0.32)
            L.add(t0 * b, strings([n], dd * b + 0.1, att=0.05, rel=0.2, g=0.12, hi=3400, vib=0.006), -0.2)
    for t0 in (0, 32): L.add(t0 * b, crash_cym(0.3, 3.0), 0.3); L.add(t0 * b, taiko(0.9, 36, 2.0), 0)
    L.reverb(2.0, 0.25, 4500)
    write_aligned((L, 'boss14', -19))


for k, f in FX.items(): wr('s_' + k, f())
cathedral(); hive(); boss13(); boss14()
PY
python3 -I "$T/synth12.py" "$T"

# ---------- musik ----------
mus cathedral -20 anull "$T/cathedral.wav"
mus cathedral_hi -23 anull "$T/cathedral_hi.wav"
mus hive -20 anull "$T/hive.wav"
mus hive_hi -23 anull "$T/hive_hi.wav"
mus boss13 -19 anull "$T/boss13.wav"
mus boss14 -19 anull "$T/boss14.wav"

# ---------- ljudeffekter ----------
E="$S/Environment"
G="$S/Combat and Gore"
X="$S/Materials"
# vapen: rökelsekaret och bikastaren
fx censer_swing "[0:a]$P[a];[1:a]$P,volume=0.2,afade=t=out:st=0.3:d=0.2[b];[2:a]$P,asetrate=37485,aresample=44100,volume=0.25,adelay=60[c];[a][b][c]$(mix 3),atrim=0:0.85,afade=t=out:st=0.6:d=0.25[o]" "$T/s_censer_swing.wav" "$S/Items/keys_jingling.wav" "$S/Other/whoosh_2.wav"
fx censer_hit "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,volume=0.45[b];[2:a]$P,volume=0.4[c];[a][b][c]$(mix 3),atrim=0:0.8,afade=t=out:st=0.55:d=0.25[o]" "$T/s_censer_hit.wav" "$I/impactMetal_heavy_001.ogg" "$I/impactPunch_medium_000.ogg"
fx hive_fire "[0:a]$P[a];[1:a]$P,asetrate=29400,aresample=44100,lowpass=f=2000,volume=0.45[b];[a][b]$(mix 2),atrim=0:1.1,afade=t=out:st=0.8:d=0.3[o]" "$T/s_hive_fire.wav" "$E/air_burst.wav"
fx bee_buzz "$P" "$T/s_bee_buzz.wav"
fx bee_sting "[0:a]$P[a];[1:a]$P,asetrate=55125,aresample=44100,volume=0.3,adelay=140[b];[a][b]$(mix 2),atrim=0:0.45,afade=t=out:st=0.3:d=0.15[o]" "$T/s_bee_sting.wav" "$X/cork_stabbed.wav"
# fiender: Blodkatedralen
TOP=-2 fx choirboy "$P" "$T/s_choirboy.wav"
TOP=-2 fx flagellant "[0:a]$P[a];[1:a]$P,volume=0.35,adelay=55[b];[2:a]$P,volume=0.3,adelay=1005[c];[a][b][c]$(mix 3),atrim=0:1.7,afade=t=out:st=1.4:d=0.3[o]" "$T/s_flagellant.wav" "$G/slap.wav" "$G/slap.wav"
TOP=-2 fx cherub "[0:a]$P[a];[1:a]$P,asetrate=55125,aresample=44100,highpass=f=800,volume=0.15[b];[a][b]$(mix 2),atrim=0:1.4,afade=t=out:st=1.1:d=0.3[o]" "$T/s_cherub.wav" "$R/cloth1.ogg"
TOP=-2 fx cherub_shriek "$P" "$T/s_cherub_shriek.wav"
# fiender: Bikupan
TOP=-2 fx workerbee "$P" "$T/s_workerbee.wav"
TOP=-2 fx stingerknight "[0:a]$P[a];[1:a]$P,volume=0.25,adelay=100[b];[2:a]$P,volume=0.2,adelay=780[c];[a][b][c]$(mix 3),atrim=0:1.6,afade=t=out:st=1.3:d=0.3[o]" "$T/s_stingerknight.wav" "$I/impactPlate_light_002.ogg" "$I/impactMetal_light_003.ogg"
TOP=-2 fx larva "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,volume=0.3,adelay=50[b];[a][b]$(mix 2),atrim=0:1.4,afade=t=out:st=1.1:d=0.3[o]" "$T/s_larva.wav" "$G/squelching_4.wav"
fx larva_spit "[0:a]$P[a];[1:a]$P,volume=0.45,adelay=300[b];[a][b]$(mix 2),atrim=0:0.95,afade=t=out:st=0.7:d=0.25[o]" "$T/s_larva_spit.wav" "$G/splat_quick.wav"
fx larva_hatch "[0:a]$P[a];[1:a]$P,asetrate=29400,aresample=44100,lowpass=f=3000,volume=0.25,atrim=0:0.6,afade=t=out:st=0.45:d=0.15[b];[2:a]$P,volume=0.35,adelay=440[c];[a][b][c]$(mix 3),atrim=0:1.7,afade=t=out:st=1.4:d=0.3[o]" "$T/s_larva_hatch.wav" "$X/paper_tear_1.wav" "$G/squelching_1.wav"
fx larva_squish "[0:a]$P[a];[1:a]$P,volume=0.5[b];[a][b]$(mix 2),atrim=0:0.75,afade=t=out:st=0.55:d=0.2[o]" "$T/s_larva_squish.wav" "$G/crunch_splat.wav"
# bossar
fx cardinal_chant "$P" "$T/s_cardinal_chant.wav"
fx cardinal_laugh "$P" "$T/s_cardinal_laugh.wav"
fx queenbee_buzz "$P" "$T/s_queenbee_buzz.wav"
# miljö: honung, ljusstråken, klockan, blodfunten, slingor
fx honey_splash "[0:a]$P[a];[1:a]$P,asetrate=29400,aresample=44100,lowpass=f=2500,volume=0.4[b];[2:a]$P,atrim=0:1.0,asetrate=26460,aresample=44100,lowpass=f=1500,volume=0.2,afade=t=out:st=0.4:d=0.6[c];[a][b][c]$(mix 3),atrim=0:1.0,afade=t=out:st=0.75:d=0.25[o]" "$T/s_honey_splash.wav" "$G/splat_double_quick.wav" "$E/water_splashing.wav"
fx bless_beam "[0:a]$P[a];[1:a]$P,asetrate=55125,aresample=44100,volume=0.2,adelay=30[b];[a][b]$(mix 2),atrim=0:1.4,afade=t=out:st=1.0:d=0.4[o]" "$T/s_bless_beam.wav" "$X/glass_ping_small.wav"
fx bell_ring "[0:a]$P[a];[1:a]$P,asetrate=29400,aresample=44100,volume=0.35[b];[2:a]$P,asetrate=29400,aresample=44100,volume=0.2,adelay=1700[c];[a][b][c]$(mix 3),atrim=0:5.0,afade=t=out:st=3.8:d=1.2[o]" "$T/s_bell_ring.wav" "$I/impactBell_heavy_000.ogg" "$I/impactBell_heavy_000.ogg"
fx font_break "[0:a]$P[a];[1:a]$P,volume=0.45,adelay=180[b];[2:a]$P,asetrate=33075,aresample=44100,volume=0.25[c];[3:a]$P,asetrate=29400,aresample=44100,lowpass=f=2000,volume=0.35,adelay=220[d];[a][b][c][d]$(mix 4),atrim=0:2.0,afade=t=out:st=1.6:d=0.4[o]" "$T/s_font_break.wav" "$I/impactMining_002.ogg" "$X/stone_push_short.wav" "$E/water_splashing.wav"
TOP=-4 fxloop cathedral_hum 4 0.8 "[0:a]$P[a];[1:a]$P,atrim=1:5.8,asetpts=PTS-STARTPTS,lowpass=f=700,volume=0.12[b];[a][b]$(mix 2)[o]" "$T/s_cathedral_hum.wav" "$E/ambient_wind.wav"
TOP=-4 fxloop hive_hum 4 0.8 "[0:a]$P[a];[1:a]$P,atrim=6:10.8,asetpts=PTS-STARTPTS,asetrate=29400,aresample=44100,lowpass=f=1800,volume=0.12[b];[a][b]$(mix 2)[o]" "$T/s_hive_hum.wav" "$E/water_dripping.wav"

for f in "$O"/{censer_swing,censer_hit,hive_fire,bee_buzz,bee_sting,choirboy,flagellant,cherub,cherub_shriek,workerbee,stingerknight,larva,larva_spit,larva_hatch,larva_squish,cardinal_chant,cardinal_laugh,queenbee_buzz,honey_splash,bless_beam,bell_ring,font_break,cathedral_hum,hive_hum}.ogg; do printf '%-40s %6.2f s %5d kB\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" "$(( $(stat -c %s "$f") / 1024 ))"; done
for f in "$M"/cathedral.ogg "$M"/cathedral_hi.ogg "$M"/hive.ogg "$M"/hive_hi.ogg "$M"/boss13.ogg "$M"/boss14.ogg; do printf '%-36s %6.2f s %5d kB %6s LUFS\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" "$(( $(stat -c %s "$f") / 1024 ))" "$(lufs "$f")"; done
