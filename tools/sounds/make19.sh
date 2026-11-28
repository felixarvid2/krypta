#!/bin/bash
# Ljud för Krypta version 22 ("Badhuset och Skärselden"): Badhuset (badvaktens blöta stön och handduken som snärtar, ångvålnadens
# viskningar, gladiatorns stridsrop, sköld och nät, mögelkryparen och sporerna, de heta och kalla bassängerna, ånggallret, fontänen),
# Skärselden (eldimpens fnitter och eldklot, den plågade själens skri och explosion, köttbjässen och markslaget, askvandraren som
# smulas och reser sig, runcirkeln, den kedjade själens jämmer, eldregn, eldpelare och sprickor i marken), bossarna (badmästarens
# vrål, skållhett vatten och dyket; eldfurstens vrål), vapnen (treudden som stöts, kastas och kommer tillbaka; svavelmortern med
# skott, explosion och svavelklump) och slingorna bathhouse_hum och purgatory_hum, samt musiken bathhouse (+ bathhouse_hi),
# purgatory (+ purgatory_hi), boss27 (badmästaren) och boss28 (eldfursten, tung metal i Doom-anda – egen originalmusik).
# _hi-filerna är tidslinjerade intensitetslager: samma längd och samma taktnät som grundspåret, så att spelet kan tona in dem ovanpå.
# Samma konventioner som make2.sh-make18.sh: effekter mono 22 kHz Vorbis q2 toppnormaliserade till $TOP dBFS
# (standard -1, röster -2, slingor -4; långa, liggande ljud lägre så att medelnivån blir som de andras), musik stereo 44,1 kHz
# Vorbis q1 linjärt förstärkt till mål-LUFS (grundspår -20, _hi -23, bossar -19), alla slingor bär LOOPLENGTH=<sampel> i
# Vorbis-kommentaren och effektslingorna (4 s, exakt periodiska i en cirkulär buffert, Cyc) tonas linjärt (fxcyc/xloopc) och vrids så
# att skarven – även game.js-skarven 25 ms före slutet – hamnar där signalen är tyst och flack.
# Namnbyte (id:t fanns redan i assets/snd och används av äldre innehåll, så det skrivs inte över): spore_burst -> mold_spore_burst.
# Källor: assets/audio (Kenney-paketen CC0: impact-sounds, rpg-audio; 400 Sounds Pack CC0).
# Röster, eld, vatten, ånga, kedjor, slingorna och all musik syntetiseras med python3 + numpy (inbäddat nedan; byggstenarna är
# desamma som i make17.sh och make18.sh; nya står under "badhus och skärseld").
# Deterministiskt: fast frö för slumptalen och -fflags +bitexact (annars slumpar Ogg-muxern serienumret).
# Kör från katalogen där retrofps/ (repot) och assets/audio/ ligger: bash retrofps/tools/sounds/make19.sh
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
# fxcyc NAMN LEN X 'graf' källor...: som fxloop, för källor som redan är exakt periodiska med perioden LEN (Cyc i synth19.py):
# överlappningen är linjär (amplitudsumman 1 för korrelerad signal), så den varken sväller eller sjunker; den döljer bara att
# omsamplingen till 22 kHz inte är cirkulär i filens kanter.
fxcyc() {
  local n=$1 len=$2 x=$3 g=$4; shift 4
  render "$T/raw_$n.wav" 1 22050 "$g" "$@"
  xloopc "$T/raw_$n.wav" "$T/$n.wav" "$len" "$x"
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
xloopc() { # xloopc IN UT LEN X: som xloop men med linjär överlappning (för exakt periodiska källor)
  ffmpeg -loglevel error -y -i "$1" -ss "$3" -i "$1" -filter_complex "[0:a]atrim=0:$3,afade=t=in:d=$4:curve=tri[p];[1:a]atrim=0:$4,afade=t=out:d=$4:curve=tri[q];[p][q]amix=inputs=2:normalize=0:duration=first[o]" -map '[o]' "$2"
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


cat > "$T/synth19.py" <<'PY'
# Syntetiserade effekter och musik för Krypta version 22. Användning: python3 synth19.py <katalog>
# Musikslingan läggs med "wrap" (toner som går över slutet läggs på början), efterklangen är en cirkulär
# faltning och liggande toner/brus har ett helt antal perioder på slingan, så slingan är sömlös.
# Byggstenarna nedan är desamma som i make17.sh och make18.sh; nya står under "badhus och skärseld".
import sys, wave, re, subprocess, numpy as np
SR = 44100
OUT = sys.argv[1]
rng = np.random.default_rng(22022)
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



# ---- nya byggstenar: gruva och observatorium ----
class Cyc:  # cirkulär monobuffert för effektslingorna: allt som läggs in viker runt slutet, bruset filtreras cirkulärt och
    # efterklangen är en cirkulär faltning, så att slingan är exakt periodisk (xloop tonar då linjärt utan svacka eller puckel)
    def __init__(s, T):
        s.N = int(round(T * SR)); s.T = s.N / SR; s.t = np.arange(s.N) / SR; s.y = np.zeros(s.N)
    def add(s, t0, sig, g=1.0):
        i = int(round(t0 * SR)) % s.N; k = 0; n = len(sig)
        while k < n:
            m = min(n - k, s.N - i); s.y[i:i + m] += sig[k:k + m] * g; k += m; i = 0
    def noise(s, lo, hi): return nrm(fftfilt(rng.standard_normal(s.N), lo, hi))
    def slow(s, fc): return nrm(fftfilt(rng.standard_normal(s.N), 0, fc))  # långsam modulering -1..1
    def tone(s, f, a=1.0): return np.sin(2 * np.pi * f * s.t + rng.uniform(0, 6)) * a  # f på multiplar av 40 Hz
    def verb(s, length=1.0, wet=0.3, bright=5000):
        n = int(length * SR); t = np.arange(n) / SR
        ir = rng.standard_normal(n) * np.exp(-t * 6.9 / length); ir = fftfilt(ir, 150, bright); ir /= np.sqrt((ir ** 2).sum())
        h = np.zeros(s.N); h[:min(n, s.N)] = ir[:s.N]
        s.y = s.y + wet * np.fft.irfft(np.fft.rfft(s.y) * np.fft.rfft(h), s.N)
    def out(s, d): return np.tile(s.y, int(np.ceil(d / s.T)) + 1)[:int(d * SR)]

def drip(f=1400, g=1.0):  # vattendroppe: ett runt "plipp" (bubbla vars tonhöjd stiger) och ett litet klick när droppen slår i
    y = bubble(f, 0.07, 1, 1.6); place(y, 0, tick(0.008, 0.25, 2000, 8000, 600)); return y * g

def pickstone(g=1.0, f=2300):  # hacka mot sten: ett hårt, kort stålslag (ting), ett krasande stenklick och småsten som rasslar
    d = 0.5; y = np.zeros(int(d * SR)); place(y, 0, ting(0.35, f, 0.6, 1.6)); place(y, 0, crack(0.04, 0.8, 1500))
    place(y, 0, fftfilt(noise(0.06), 300, 2500) * np.exp(-tt(0.06) * 60), 0.6); place(y, 0.01, debris(0.4, 10, 800, 4000, 0.15), 0.3)
    return y * g

def farblast(d=3.0, g=1.0):  # avlägsen sprängning: en dov knall genom berget, ett långt muller och grus som rasslar ned
    t = tt(d); y = nrm(fftfilt(noise(d), 25, 220)) * np.interp(t, [0, 0.03, 0.5, d], [0, 1, 0.4, 0]) * (0.8 + 0.2 * lpnoise(d, 4))
    y += np.sin(phase(38 * (1 + 0.8 * np.exp(-t * 12)))) * np.exp(-t * 3) * 0.6
    y += debris(d, 30, 500, 3000, d * 0.7) * 0.12
    return y * env(len(t), 0.004, 0.5) * g

def blower(notes, d, g=1.0, att=0.4, rel=0.6):  # dov blåsare (gruvans mässing): som brass() men mörkare och bara de övertoner som
    # hörs genom lågpasset (snabbare att räkna), ljusheten sväller in över tonen
    t = tt(d); y = np.zeros_like(t); sw = max(0.1, d * 0.4)
    for n in notes:
        for det in (-0.004, 0.0, 0.0045):
            f = m2f(n) * (1 + det) * (1 + 0.003 * np.sin(2 * np.pi * 5.2 * t + rng.uniform(0, 6)))
            y += sawp(phase(f), 2400, f.max())
    y /= np.abs(y).max() + 1e-9; m = np.clip(t / sw, 0, 1) ** 1.5
    y = fftfilt(y, 30, 180) * (1 - m) + fftfilt(y, 30, 650) * m
    y = fftfilt(np.tanh(1.8 * y / (np.abs(y).max() + 1e-9)), 40, 3000)
    return y * env(len(t), att, rel) * g

def celesta(n, d=1.6, g=1.0):  # celesta: klockspel med en mjukare ansats och en svag oktav över
    return (bar(m2f(n), d, 1.0, dec=1.3) + bar(m2f(n + 12), d, 0.12, dec=2.6)) * env(int(d * SR), 0.003, 0.1) * g

def brasstick(f=2600, g=1.0):  # mässingsurverkets tick: ett klick med en kort, ljus metallring
    y = clack(f, 1.0, 380, 0.05); place(y, 0, ting(0.05, f * 1.7, 0.15, 4.0)); return y * g

def shift(x, r):  # transponerar (snabbare uppspelning) med faktorn r
    return np.interp(np.arange(0, len(x) - 1, r), np.arange(len(x)), x)



# ---- nya byggstenar: kloaker och öken ----
def pipeknock(f=220, g=1.0, dec=6.0):  # rör som knackar: ihålig metallklang (ett fritt rörs delton 1; 2,76; 5,40; 8,93) och ett klick
    y = bar(f, 0.9, 1.0, dec=dec); place(y, 0, clack(min(f * 6, 6000), 0.5, 300, 0.03)); return y * g

def oud(n, d=1.2, g=1.0):  # oud: knäppt dubbelsträng (två strängar lätt isär), plektrumknäpp och ett ihåligt, varmt kroppsljud
    f = m2f(n); t = tt(d); y = np.zeros_like(t)
    for det, a in ((1.0, 1.0), (1.003, 0.7)):
        for k in range(1, 14):
            if f * k > 7000: break
            y += a / k * np.exp(-t * (2.2 + 1.1 * k)) * np.sin(2 * np.pi * f * det * k * t + rng.uniform(0, 6))
    y = reson(y, [(280, 80, 1.0), (900, 250, 0.6), (2500, 600, 0.35)]) + 0.3 * y
    place(y, 0, fftfilt(noise(0.012), 2000, 7000) * np.exp(-tt(0.012) * 400), 0.08 * np.abs(y).max())
    return nrm(y) * env(len(t), 0.002, 0.08) * g

def ney(n, d, g=1.0, att=0.12, rel=0.3, scoop=0.4):  # ney: luftig rörflöjt – svag ton med mycket andning, tonen glider upp underifrån
    # och ett brett, fördröjt vibrato
    t = tt(d); f0 = m2f(n)
    f = f0 * 2 ** (-scoop / 12 * np.exp(-t * 12)) * (1 + 0.009 * np.clip((t - 0.3) / 0.4, 0, 1) * np.sin(2 * np.pi * 4.6 * t))
    ph = phase(f); y = np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph)
    br = nrm(reson(noise(d), [(f0, f0 * 0.06, 1), (f0 * 2, f0 * 0.1, 0.4)])) * 0.45 + nrm(fftfilt(noise(d), 1500, 6000)) * 0.12
    return (nrm(y) * 0.8 + br * (0.6 + 0.8 * np.exp(-t * 8))) * env(len(t), att, rel) * g

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



# ---- fler instrument: gruva och observatorium ----
def dripn(n, g=1.0):  # musikalisk vattendroppe: en droppe stämd på en ton, med ett mjukt pling som klingar efter
    y = ping(m2f(n), 0.5, 0.6, 7); place(y, 0, bubble(m2f(n) * 0.9, 0.06, 1, 0.4), 0.5); return y * g

def pickperc(g=1.0, f=2300, heavy=0.6):  # hacka mot sten som slagverk: stålslaget och ett dovt stendunk
    y = pickstone(1.0, f); place(y, 0, thud(70, 0.3, 0.2), heavy); return y * g

def hiss(d, g=1.0):  # ångpys till slagverket: kort stöt som klingar av
    return steam(d, [(0, 0), (0.02, 1), (d * 0.3, 0.5), (d, 0)], 1500, 9000, 1.0, 0.2) * g

def harmonica(n, d, g=1.0):  # munspel: dragspelets tungor, men en ton i taget, smalare och med ett svagt andningssus
    return (accordion([n], d, 1.0, att=0.05, rel=0.15, det=0.002, hi=3500, swell=0.15, rate=5.0) * 0.9
            + nrm(fftfilt(noise(d), 1500, 5000)) * 0.04 * env(int(d * SR), 0.05, 0.15)) * g

def timp(n, g=1.0, d=1.6):  # puka: stämd trumma med lång klang
    t = tt(d); f = m2f(n)
    y = np.sin(phase(f * (1 + 0.1 * np.exp(-t * 20)))) * np.exp(-t * 2.2) + 0.4 * np.sin(2 * np.pi * f * 1.5 * t) * np.exp(-t * 3.5)
    y += fftfilt(noise(d), 80, 1200) * np.exp(-t * 30) * 0.4
    return y * env(len(t), 0.002, 0.2) * g

def schoir(notes, d, g=1.0, att=0.4, rel=0.8):  # synthkör: kör på "aa" med en vattenpad (detunade sågtänder) som bär den
    return (nrm(choir(notes, d, att, rel, 1.0, 4.5, AA, 3000)) * 0.7 + wpad(notes, d, 0.4, att=att, rel=rel, hi=1800)) * g


# ---- fler instrument: kloaker och öken ----
def doum(g=1.0, f=85):  # darbukans "doum": djupt, runt slag mitt på skinnet
    return drum(f, 0.5, 1.0, 0.12, dec=7) * g

def tek(g=1.0, f=620):  # darbukans "tek": skarpt, ljust kantslag
    d = 0.15; k = tt(d)
    y = np.sin(2 * np.pi * f * k) * np.exp(-k * 45) * 0.6 + nrm(reson(noise(d), [(f * 2.6, 300, 1), (4200, 900, 0.6)])) * np.exp(-k * 70)
    return y * env(len(k), 0.0005, 0.02) * g

def riq(g=1.0):  # riqens zils: små cymbaler som skramlar
    y = shaker(0.6)
    for _ in range(3): place(y, rng.uniform(0, 0.02), ting(0.15, rng.uniform(5000, 7500), 0.3, 3))
    return y * g

def pipeclang(g=1.0, f=200):  # rörslag som virvel: ett tungt rör som slås (ihålig klang och en järnsmäll)
    y = pipeknock(f, 1.0, 4.0); place(y, 0, anvil(620, 0.5, 0.5)); place(y, 0, snare(0.3)); return y * g

def rattle(g=1.0):  # skramlande kedja/burk som slagverk
    return chain(0.12, 3, None, (2500, 5000)) * g

# ---- nya byggstenar: fängelse och fiskeläge ----
def pea(d, f=2900, g=1.0, rate=28):  # visselpipa med kula (polisvissla): en ljus ton vars tonhöjd och styrka skallrar när kulan
    # studsar i pipan, och blåsluft
    t = tt(d); r = rate * (1 + 0.1 * lpnoise(d, 3)); m = np.sin(phase(r))
    fr = f * (1 + 0.045 * m + 0.01 * lpnoise(d, 20)); ph = phase(fr)
    y = (np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.06 * np.sin(3 * ph)) * (0.7 + 0.3 * np.abs(m))
    y += nrm(fftfilt(noise(d), f * 0.7, f * 2)) * 0.2
    return y * env(len(t), 0.015, 0.05) * g

def bark(f=520, d=0.2, g=1.0, rough=0.7):  # hundskall: kort, grov stöt vars tonhöjd faller, med brus genom munnen
    t = tt(d); f0 = f * np.interp(t, [0, d * 0.25, d], [0.85, 1.05, 0.6])
    F = [(900, 200, 1), (1700, 300, 0.7), (3000, 500, 0.3)]
    v = growl(d, f0, F, rough, 0.7, 6000, 2.4) + nrm(reson(noise(d), F)) * 0.5
    return v * np.clip(t / 0.008, 0, 1) * np.exp(-t * 9 / d) * g

def snarl(d, f=140, g=1.0):  # morrande hund: låg grov röst med tänder (skrovligt brus) som fladdrar
    t = tt(d); F = [(500, 120, 1), (1300, 250, 0.6), (2600, 400, 0.3)]
    return growl(d, f * (1 + 0.05 * lpnoise(d, 6)), F, 0.9, 0.8, 4000, 2.6) * (0.6 + 0.4 * lpnoise(d, 18)) * env(len(t), 0.03, 0.1) * g

def gullcall(f=1250, d=0.45, g=1.0, kind=0):  # måsskri: ett gällt, nasalt "kii-ow" (0) eller ett kort skrattande "ha" (1)
    t = tt(d); u = t / d
    if kind == 0: f0 = f * np.interp(u, [0, 0.2, 0.55, 1], [0.8, 1.25, 1.1, 0.7])
    else: f0 = f * np.interp(u, [0, 0.3, 1], [1.0, 1.1, 0.85])
    F = [(2200, 400, 1), (3400, 500, 0.7), (5000, 700, 0.3)]
    v = nrm(voice(f0 * (1 + 0.02 * lpnoise(d, 40)), F, 10000, jitter=0.02, roll=0.4))
    v = np.tanh(2.2 * (v + 0.25 * nrm(reson(noise(d), F))))
    return v * env(len(t), 0.01, d * 0.35) * g

def horn(f, d, g=1.0, drop=0.75, hi=1400):  # mistlur (diafon): en mörk, mäktig sågton som sväller in och dör med det typiska
    # fallande "grymtet" på slutet
    t = tt(d); u = t / d
    f0 = f * np.where(u < 0.82, 1.0, 1 - (1 - drop) * (np.clip(u - 0.82, 0, None) / 0.18) ** 1.5) * (1 + 0.003 * lpnoise(d, 5))
    y = sawp(phase(f0), 4000, f) + 0.6 * sawp(phase(f0 * 1.004), 4000, f)
    y = reson(y, [(f * 2, f * 0.6, 1), (f * 5, f * 1.5, 0.5), (900, 300, 0.4)]) + 0.4 * fftfilt(y, 30, hi)
    y = np.tanh(1.6 * nrm(y))
    return fftfilt(y, 40, hi * 2) * env(len(t), d * 0.12, d * 0.12) * g

def splash(d=0.8, g=1.0, lo=300, hi=6000):  # plask: vatten som slås upp (brusstöt) och regnar ned med bubblor
    t = tt(d); y = nrm(fftfilt(noise(d), lo, hi)) * np.exp(-t * 7) * env(len(t), 0.004, 0.1)
    y += nrm(fftfilt(noise(d), 80, 500)) * np.exp(-t * 14) * 0.6
    y += bubbles(d, int(d * 60), 500, 2500, 1.0, np.exp(-t * 3)) * 0.35
    y += rustle(d, np.exp(-t * 4), 2500, 9000, int(d * 500), 0.2)
    return y * g

def hiron(d=0.8, g=1.0):  # glödande järn i vatten/kött: fräsande, sprakande pys
    return steam(d, [(0, 0), (0.02, 1), (d * 0.4, 0.6), (d, 0)], 2000, 10000, 1.0, 0.5) * g + fuse(d, 0.3) * np.exp(-tt(d) * 3)

def ironclang(f=320, d=1.4, g=1.0):  # tungt järnslag (galler, bur): låga oharmoniska delton, en knall och skrammel
    y = anvil(f, d, 1.0) + anvil(f * 1.37, d, 0.6) + 0.5 * anvil(f * 0.71, d, 0.8)
    place(y, 0, thud(60, 0.6, 0.3), 0.8)
    return y * g


# ---- fler instrument: fängelse och fiskeläge ----
def hammer(g=1.0, f=300):  # järnslag som slagverk (smedjehammare mot städ): dov stöt och en kort, ringande klang
    y = anvil(f, 0.6, 0.7); place(y, 0, thud(70, 0.3, 0.1), 0.6); return y * g

def buoy(n, g=1.0, d=4.0):  # bojklocka: en avlägsen, dov klocka som klingar länge
    return fftfilt(tubebell(n, d, 1.0), 150, 3000) * g

def squeeze(notes, d, g=1.0):  # dragspelets ackordstöt (oom-pah): kort och torr
    return accordion(notes, d, 1.0, att=0.01, rel=0.06, swell=0.0) * g


# ---- nya byggstenar: badhus och skärseld ----
def flame(d, pts, lo=150, hi=3000, g=1.0, crack=40):  # eldsvåda/eldklot: ett brusande, fladdrande vrål som följer amplitudkurvan
    # pts = [(t, a)], ljusare ju starkare, med knaster
    t = tt(d); a = np.interp(t, [p[0] for p in pts], [p[1] for p in pts])
    y = nrm(svf(noise(d), lo + (hi - lo) * a * (0.8 + 0.2 * lpnoise(d, 12)), 0.7, 'lp')) * (0.7 + 0.3 * lpnoise(d, 15))
    y += nrm(fftfilt(noise(d), 40, 250)) * 0.5
    y = y * a + fire(d, 300, 3000, 12, crack) * 0.15 * a
    return y * g

def scream(d, f, g=1.0, F=None):  # gällt, plågat skri: hög röst som stiger och bryts, med skrovligt brus
    t = tt(d); F = F or [(1000, 200, 1), (1800, 300, 0.8), (3000, 500, 0.4)]
    f0 = f * np.interp(t, [0, d * 0.2, d * 0.7, d], [0.8, 1.1, 1.0, 0.75]) * (1 + 0.03 * lpnoise(d, 25))
    v = nrm(voice(f0, F, 9000, jitter=0.03, roll=0.5)) * (1 - 0.4 * (0.5 + 0.5 * np.sin(phase(f0 / 2))))
    return np.tanh(2.5 * (v + 0.3 * nrm(reson(noise(d), F)))) * env(len(t), 0.02, d * 0.35) * g

def wail(d, f=330, g=1.0, F=None):  # jämmer: en klagande, svajande röst på "oo" som glider ned
    t = tt(d); F = F or OH
    f0 = f * np.interp(t, [0, d * 0.3, d], [0.9, 1.05, 0.7]) * (1 + 0.02 * np.sin(2 * np.pi * 5.5 * t))
    return nrm(voice(f0, F, 5000, jitter=0.01, roll=0.8)) * env(len(t), d * 0.25, d * 0.4) * g

def boom(d=1.4, g=1.0, f0=40):  # explosion: djup knall, en bred brusstöt och ett muller som klingar ut
    t = tt(d); y = np.zeros(len(t)); place(y, 0, thud(f0, min(d, 1.0), 0.6), 1.0); place(y, 0, crack(0.15, 0.9, 400))
    y += nrm(fftfilt(noise(d), 100, 4000)) * np.exp(-t * 7) * 0.7 + low_rumble(d) * np.exp(-t * 2.5) * 0.4
    return y * env(len(t), 0.001, 0.2) * g

def boil(d, g=1.0, n=None):  # kokande vatten: täta bubblor och ett mjukt sus
    t = tt(d); return (bubbles(d, n or int(d * 120), 300, 1200, 1.0) * 0.8 + nrm(fftfilt(noise(d), 800, 4000)) * 0.12) * g

# ================= effekter =================
# ---- fiender: Badhuset ----
def attendant():  # badvakten: ett blött, släpigt zombiestön, den dyngsura handduken som droppar och smackar
    d = 1.6; y = np.zeros(int(d * SR)); dv = 1.0; tv = tt(dv)
    place(y, 0, growl(dv, np.interp(tv, [0, 0.3, dv], [95, 108, 78]), OH, 0.7, 0.6, 3500, 2.0) * env(len(tv), 0.1, 0.35), 0.6)
    place(y, 0.95, splat(0.3), 0.4)
    for t0 in (0.3, 0.6, 1.1, 1.35): place(y, t0, drip(rng.uniform(900, 1500)), 0.25)
    return cut(verb(y, 1.3, 0.4, 4000), d, 0.3)

def towel_snap():  # handduken snärtar: ett snabbt, blött svisch och en skarp, våt smäll med stänk
    d = 0.5; y = np.zeros(int(d * SR)); place(y, 0, swish(0.16, 500, 3500, 2.0) * np.linspace(0.2, 1, int(0.16 * SR)) ** 2, 0.7)
    place(y, 0.15, crack(0.05, 1.0, 1200)); place(y, 0.15, splat(0.2), 0.5)
    place(y, 0.16, rustle(0.25, np.exp(-tt(0.25) * 12), 2500, 9000, 120), 0.25)
    return cut(verb(y, 0.6, 0.25, 6000), d, 0.15)

def steamghost():  # ångvålnaden: en viskande, ihålig röst i ångan, väsande ånga som sväller och ett kallt sus
    d = 1.8; t = tt(d); y = whisper(d, (OH, AA, EE), 3, 0.5, 0.5) * np.interp(t, [0, 0.4, 1.3, d], [0, 1, 0.7, 0])
    y += steam(d, [(0, 0), (0.5, 1), (1.2, 0.6), (d, 0)], 1500, 8000, 0.35, 0.3) + ghostsus(d, 550, 0.6)
    return cut(verb(y, 1.6, 0.45, 5000), d, 0.4)

def gladiator():  # gladiatorn: ett kort stridsrop ("HA!") som ekar i pelargången, skölden som slår mot treudden och kedjemanteln
    d = 1.3; y = np.zeros(int(d * SR)); dd = 0.32; k = tt(dd)
    place(y, 0, growl(dd, np.interp(k, [0, dd * 0.3, dd], [170, 200, 140]), HA, 0.4, 0.5, 5000, 2.0) * env(len(k), 0.01, 0.14), 0.6)
    e = fftfilt(y[:int(0.5 * SR)], 250, 2500); place(y, 0.25, e, 0.2)
    place(y, 0.55, anvil(520, 0.6, 0.5)); place(y, 0.55, thud(120, 0.3, 0.1), 0.5); place(y, 0.6, chain(0.4, 10, None, (3000, 6000)), 0.25)
    return cut(verb(y, 1.2, 0.35, 5000), d, 0.3)

def gladiator_block():  # skölden tar emot: en tung, dov sköldsmäll (trä och bronsbuckla) och en kort ring
    d = 0.7; y = np.zeros(int(d * SR)); place(y, 0, thud(110, 0.4, 0.2), 0.7); place(y, 0, anvil(430, 0.6, 0.6))
    place(y, 0, crack(0.04, 0.6, 1200)); place(y, 0, logdrum(260, 0.5, 0.25))
    return cut(verb(y, 0.6, 0.25, 5000), d, 0.2)

def net_throw():  # nätet kastas: ett vidt svisch, repen som prasslar och blysänkena som klirrar när det landar
    d = 0.9; y = np.zeros(int(d * SR)); place(y, 0, swish(0.4, 300, 1500, 1.5), 0.6)
    place(y, 0.05, rustle(0.6, np.sin(np.pi * tt(0.6) / 0.6), 800, 5000, 400), 0.4)
    for _ in range(6): place(y, 0.45 + rng.uniform(0, 0.15), clack(rng.uniform(1500, 2600), 1.0, 350, 0.03), rng.uniform(0.2, 0.4))
    return cut(verb(y, 0.5, 0.2, 5000), d, 0.2)

def moldcrawler():  # mögelkryparen: ett blött, kladdigt krälande, ett gurglande fräs och små klickande käkar
    d = 1.4; y = np.zeros(int(d * SR))
    for k in range(6): place(y, k * 0.2, slurp(0.25, 400, 1200), 0.35)
    dv = 0.7; tv = tt(dv); place(y, 0.3, gurgle(dv, np.interp(tv, [0, dv], [140, 110]), EE, 14) * env(len(tv), 0.05, 0.3), 0.4)
    for k in range(8): place(y, 0.9 + k * 0.05, clack(rng.uniform(2800, 4000), 1.0, 500, 0.02), 0.25)
    return cut(verb(y, 0.8, 0.3, 4500), d, 0.25)

def mold_spore_burst():  # mögelkryparen spricker (kontraktets "spore_burst"; id:t fanns redan): en blöt smäll, ett tjockt sporpuff
    # som väller ut och ett fräsande, giftigt sus
    d = 1.3; y = np.zeros(int(d * SR)); place(y, 0, splat(0.35), 0.8); place(y, 0, crack(0.04, 0.4, 1500))
    place(y, 0.02, puff(0.6, 200, 2200, 1.0, 0.1), 0.8)
    place(y, 0.1, steam(1.1, [(0, 0), (0.1, 1), (1.1, 0)], 2000, 7000, 1.0, 0.4), 0.25)
    return cut(verb(y, 0.9, 0.3, 4500), d, 0.3)

# ---- fiender: Skärselden ----
def fireimp():  # eldimpen: ett gällt, elakt fnitter och elden som fräser kring den
    d = 1.2; y = np.zeros(int(d * SR))
    place(y, 0, giggle([(520, 0.08), (560, 0.08), (600, 0.08), (640, 0.09), (560, 0.3)], EE, 1.0, 1.4, 0.6), 0.6)
    place(y, 0, flame(d, [(0, 0.3), (0.5, 0.6), (d, 0)], 300, 3000, 1.0, 30), 0.25)
    return cut(verb(y, 0.8, 0.3, 6000), d, 0.25)

def fireimp_ball():  # eldklotet: ett brusande svisch av eld som far förbi
    d = 0.9; y = flame(d, [(0, 0), (0.15, 1), (0.5, 0.5), (d, 0)], 300, 4000, 1.0, 30)
    place(y, 0, swish(0.5, 800, 2500, 2.0), 0.4)
    return cut(verb(y, 0.5, 0.2, 6000), d, 0.2)

def lostsoul():  # den plågade själen: ett gällt, plågat skri ur den brinnande skallen och elden som vrålar när den störtar
    d = 1.4; y = np.zeros(int(d * SR)); place(y, 0, scream(0.8, 700), 0.55); place(y, 0.15, scream(0.6, 900), 0.3)
    place(y, 0, flame(d, [(0, 0.2), (0.6, 0.6), (1.1, 1), (d, 0)], 300, 4000, 1.0, 40), 0.4)
    return cut(verb(y, 1.0, 0.35, 5000), d, 0.3)

def lostsoul_boom():  # själen exploderar: en eldig knall, benbitar som skramlar och ett sista, försvinnande skrik
    d = 1.4; y = np.zeros(int(d * SR)); place(y, 0, boom(1.3, 1.0, 55), 0.9)
    place(y, 0, flame(1.0, [(0, 1), (1.0, 0)], 300, 5000, 1.0, 50), 0.5)
    place(y, 0.05, debris(0.8, 25, 1500, 5000, 0.5), 0.35); place(y, 0.05, scream(0.4, 1000) * np.exp(-tt(0.4) * 5), 0.12)
    y = np.tanh(2.0 * nrm(y))  # mjuk mättning: explosionen ska kännas tät, inte bara en spik i basen
    return cut(verb(y, 1.2, 0.3, 4500), d, 0.35)

def fleshbrute():  # köttbjässen: ett djupt, blött vrål ur en väldig bröstkorg, tunga, klafsande steg
    d = 1.9; y = np.zeros(int(d * SR)); dv = 1.1; tv = tt(dv)
    place(y, 0, growl(dv, np.interp(tv, [0, 0.3, dv], [60, 78, 50]), AA, 0.9, 0.6, 3500, 2.8) * env(len(tv), 0.05, 0.4), 0.8)
    for t0 in (1.15, 1.55): place(y, t0, thud(50, 0.4, 0.2), 0.7); place(y, t0, splat(0.3), 0.4)
    return cut(verb(y, 1.2, 0.3, 3500), d, 0.3)

def ground_slam():  # köttbjässen slår i marken: en väldig duns, en chockvåg som mullrar utåt och sten och aska som regnar ned
    d = 1.8; y = np.zeros(int(d * SR)); place(y, 0, thud(36, 1.2, 0.8), 1.0); place(y, 0, crack(0.1, 0.7, 600))
    place(y, 0.05, low_rumble(1.5) * np.exp(-tt(1.5) * 2), 0.6); place(y, 0.05, stonescrape(0.9, 80, 1.0, (24, 40)) * np.exp(-tt(0.9) * 3), 0.35)
    place(y, 0.1, debris(1.4, 40, 600, 4000, 1.0), 0.35)
    y = np.tanh(2.0 * nrm(y))  # mjuk mättning: explosionen ska kännas tät, inte bara en spik i basen
    return cut(verb(y, 1.4, 0.3, 3500), d, 0.4)

def ashwalker():  # askvandraren: ett torrt, raspande stön (en strupe full av aska) och aska som rinner av den
    d = 1.6; y = np.zeros(int(d * SR)); dv = 1.1; tv = tt(dv)
    place(y, 0, growl(dv, np.interp(tv, [0, 0.4, dv], [80, 92, 65]), EH, 0.8, 1.2, 3000, 2.2) * env(len(tv), 0.1, 0.4), 0.55)
    place(y, 0.2, sandpour(1.3, 1.0) * np.interp(tt(1.3), [0, 0.3, 1.3], [0, 1, 0]), 0.25)
    return cut(verb(y, 1.0, 0.3, 4000), d, 0.3)

def ash_reform():  # askvandraren reser sig: aska som virvlar upp (ett stigande sus och rinnande korn baklänges), glöd som tänds och en
    # djup inandning
    d = 1.8; t = tt(d); y = nrm(svf(noise(d), 300 + 2500 * (t / d) ** 2, 1.2)) * (t / d) ** 1.5 * 0.5
    y += sandpour(d, 1.0) * (t / d) ** 2 * 0.4
    place(y, 1.2, fire(0.6, 200, 2500, 10, 20) * env(int(0.6 * SR), 0.05, 0.3), 0.3)
    dv = 0.5; tv = tt(dv); place(y, 1.25, growl(dv, np.interp(tv, [0, dv], [70, 95]), OH, 0.8, 1.0, 2500, 2.0) * env(len(tv), 0.2, 0.15), 0.4)
    return cut(verb(y, 1.0, 0.3, 4000), d, 0.25)

# ---- bossar ----
def bathmaster_roar():  # badmästaren ryter: ett väldigt, gurglande vrål ur en uppsvälld kropp, vatten som forsar ur munnen och ett
    # eko i valven
    d = 2.6; y = np.zeros(int(d * SR)); dv = 1.5; tv = tt(dv)
    place(y, 0, growl(dv, np.interp(tv, [0, 0.3, dv], [70, 88, 55]), OH, 0.8, 0.6, 3500, 2.6) * env(len(tv), 0.06, 0.5), 0.7)
    place(y, 0.05, gurgle(dv, np.interp(tv, [0, 0.3, dv], [140, 170, 110]), AA, 11) * env(len(tv), 0.1, 0.5), 0.35)
    place(y, 0.4, splash(1.0, 1.0, 300, 5000), 0.3)
    e = fftfilt(y, 150, 2500); place(y, 0.45, e, 0.25)
    return cut(verb(y, 2.4, 0.5, 3500), d, 0.5)

def scald_splash():  # skållhett vatten slår i: ett plask och ett fräsande, väsande ångmoln
    d = 1.3; y = np.zeros(int(d * SR)); place(y, 0, splash(0.9), 0.8)
    place(y, 0.03, steam(1.2, [(0, 0), (0.05, 1), (0.5, 0.5), (1.2, 0)], 2500, 9000, 1.0, 0.5), 0.45)
    place(y, 0.05, boil(1.0) * np.exp(-tt(1.0) * 2), 0.3)
    return cut(verb(y, 0.8, 0.3, 5000), d, 0.3)

def bath_dive():  # badmästaren dyker: ett väldigt plask, vatten som sluter sig över honom och bubblor som stiger
    d = 1.8; y = np.zeros(int(d * SR)); place(y, 0, splash(1.2, 1.0, 150, 5000), 1.0); place(y, 0, thud(45, 0.6, 0.0), 0.6)
    place(y, 0.3, bubbles(1.4, 70, 150, 600, 1.0, np.exp(-tt(1.4) * 1.5)), 0.5)
    place(y, 0.25, fftfilt(noise(1.2), 40, 300) * np.exp(-tt(1.2) * 3), 0.4)
    return cut(verb(y, 1.4, 0.35, 4000), d, 0.4)

def pyrelord_roar():  # eldfursten ryter: ett demoniskt vrål (djup röst, en oktav under och en hes överstämma), elden som flammar upp
    # och marken som mullrar
    d = 2.8; y = np.zeros(int(d * SR)); dv = 1.8; tv = tt(dv)
    place(y, 0, growl(dv, np.interp(tv, [0, 0.4, dv], [75, 95, 58]), AA, 0.8, 0.7, 4000, 3.0) * env(len(tv), 0.08, 0.6), 0.75)
    place(y, 0, growl(dv, np.interp(tv, [0, 0.4, dv], [37, 47, 29]), OH, 1.0, 0.5, 2000, 2.8) * env(len(tv), 0.12, 0.6), 0.45)
    place(y, 0.05, scream(dv, 260, 1.0, [(800, 200, 1), (1300, 300, 0.7), (2600, 500, 0.3)]) * env(len(tv), 0.2, 0.6), 0.12)
    place(y, 0, flame(2.4, [(0, 0), (0.4, 1), (1.6, 0.7), (2.4, 0)], 200, 3500, 1.0, 50), 0.35)
    place(y, 0, low_rumble(2.4) * env(int(2.4 * SR), 0.2, 0.8), 0.3)
    return cut(verb(y, 2.0, 0.4, 3500), d, 0.5)

def fire_rain():  # eldregnet: eldklot som viner ned ur himlen och slår ned runt omkring med fräsande smällar
    d = 2.6; y = np.zeros(int(d * SR))
    for k in range(7):
        t0 = k * 0.25 + rng.uniform(0, 0.1); dw = 0.45
        place(y, t0, whistle_in(dw, rng.uniform(1400, 2000), rng.uniform(500, 700)), 0.12)
        place(y, t0, flame(dw, [(0, 0), (dw, 1)], 300, 3000, 1.0, 10), 0.15)
        place(y, t0 + dw, thud(rng.uniform(60, 90), 0.4, 0.3), 0.45); place(y, t0 + dw, flame(0.5, [(0, 1), (0.5, 0)], 300, 4000, 1.0, 20), 0.3)
    return cut(verb(y, 1.2, 0.3, 4500), d, 0.4)

def flame_pillar():  # eldpelaren: ett djupt, stigande vrål när elden sprutar upp ur marken, håller och slocknar
    d = 1.8; t = tt(d); y = flame(d, [(0, 0), (0.15, 1), (1.2, 0.85), (d, 0)], 150, 4000, 1.0, 60)
    y += nrm(fftfilt(noise(d), 30, 150)) * np.interp(t, [0, 0.15, 1.2, d], [0, 1, 0.8, 0]) * 0.4
    place(y, 0, swish(0.3, 200, 2000, 1.5), 0.4)
    return cut(verb(y, 0.9, 0.25, 5000), d, 0.3)

def fissure():  # marken spricker: sten som knakar och slits isär, ett muller och glödande lava som bubblar upp
    d = 2.0; y = np.zeros(int(d * SR)); place(y, 0, stonescrape(1.0, 70, 1.0, (20, 45)), 0.6)
    for t0 in (0.0, 0.25, 0.45): place(y, t0, crack(0.08, 0.6, 600)); place(y, t0, thud(50, 0.4, 0.4), 0.4)
    place(y, 0, low_rumble(1.6) * env(int(1.6 * SR), 0.1, 0.6), 0.5)
    place(y, 0.6, boil(1.3, 1.0, 60) * env(int(1.3 * SR), 0.2, 0.4), 0.4); place(y, 0.6, flame(1.3, [(0, 0), (0.3, 0.7), (1.3, 0)], 150, 2000, 1.0, 30), 0.3)
    return cut(verb(y, 1.2, 0.3, 3500), d, 0.4)

def steam_vent():  # ånggallret (2,4 s; ångan väller upp vid 0 och håller i ca 2 s): ett dovt dunk under golvet, gallret som skallrar och
    # het ånga som väller upp, sväller och lägger sig
    d = 2.4; y = np.zeros(int(d * SR)); place(y, 0, thud(70, 0.3, 0.0), 0.4); place(y, 0, chain(0.2, 6, None, (1500, 3000)), 0.2)
    place(y, 0.02, steam(2.3, [(0, 0), (0.1, 1), (1.5, 0.8), (2.3, 0)], 800, 7000, 1.0, 0.3), 0.6)
    return cut(verb(y, 1.2, 0.35, 5000), d, 0.3)

def cold_pool():  # kallbadet läker: klart, kallt vatten som porlar, ett kort, svalt glasackord som stiger och ett mjukt sus
    d = 1.8; y = bubbles(d, 40, 600, 1800, 1.0) * 0.35 + nrm(fftfilt(noise(d), 1500, 6000)) * 0.06 * env(int(d * SR), 0.3, 0.6)
    for k, n in enumerate((81, 84, 88, 93)): place(y, 0.1 + k * 0.12, glass(n, 1.2, 1.0, att=0.02, rel=0.6), 0.25)
    return cut(verb(y, 1.2, 0.35, 6000), d, 0.4)

def hot_pool():  # den heta bassängen: kokande bubblor och ett hett, svagt väsande sus
    d = 1.3; y = boil(d, 1.0) + steam(d, [(0, 0.3), (0.6, 1), (d, 0.3)], 3000, 9000, 0.15, 0.3)
    return cut(verb(y * env(int(d * SR), 0.1, 0.3), 0.6, 0.25, 5000), d, 0.3)

def rune_circle():  # runcirkeln vaknar: ett lågt, demoniskt körackord som sväller, runorna som sprakar, ett stigande sus och en
    # dov gong när demonerna kallas fram
    d = 2.2; y = np.zeros(int(d * SR)); t = tt(d)
    place(y, 0, nrm(choir([38, 45, 51], 1.6, 0.3, 0.5, 1.0, 4.0, OH, 2500)), 0.35)
    place(y, 0, crackle(1.2, 250, 2000, 9000), 0.3)
    place(y, 0, nrm(svf(noise(1.0), 300 * 8 ** (tt(1.0) / 1.0), 3.0)) * (tt(1.0) / 1.0) ** 2, 0.25)
    place(y, 0.95, bell(38, 1.2, 1.0), 0.35); place(y, 0.95, boom(1.0, 1.0, 45), 0.35)
    return cut(verb(y, 1.6, 0.4, 4000), d, 0.4)

def fountain():  # fontänen: en stråle som plaskar ned i bassängen, porlande, kluckande vatten
    d = 1.6; t = tt(d); y = rustle(d, None, 1500, 8000, int(d * 900), 0.4) + bubbles(d, 60, 500, 1600, 1.0) * 0.4
    y += nrm(fftfilt(noise(d), 300, 2000)) * (0.7 + 0.3 * lpnoise(d, 6)) * 0.25
    return cut(verb(y * env(len(t), 0.2, 0.4), 0.9, 0.3, 6000), d, 0.3)

def chained_soul():  # den kedjade själen: ett utdraget, klagande jämmer (två röster i otakt) och kedjorna som skallrar när den rycker
    d = 2.2; y = np.zeros(int(d * SR)); place(y, 0, wail(1.6, 300), 0.5); place(y, 0.3, wail(1.5, 236, F=EH), 0.35)
    place(y, 0.4, chain(1.4, 20, None, (1800, 4500)), 0.3)
    return cut(verb(y, 1.6, 0.45, 4000), d, 0.4)

def brimstone_pickup():  # svavelklumpen tas upp: en tung stenklump som dunsar, smulor som rasslar och ett kort, svavligt fräs
    d = 0.6; y = np.zeros(int(d * SR)); place(y, 0, thud(120, 0.25, 0.5), 0.6); place(y, 0, clack(1300, 0.6, 300, 0.04))
    place(y, 0.02, debris(0.3, 10, 1000, 4000, 0.15), 0.3); place(y, 0.05, steam(0.4, [(0, 0), (0.04, 1), (0.4, 0)], 3000, 9000), 0.15)
    return cut(verb(y, 0.3, 0.12, 6000), d, 0.15)

# ---- vapen: treudden och svavelmortern ----
def trident_stab():  # treudden stöts: ett snabbt, kort svisch framåt, tre stålspetsar som klingar och ett blött hugg
    d = 0.55; y = np.zeros(int(d * SR)); place(y, 0, swish(0.18, 600, 3500, 3.0), 0.8)
    for f in (2900, 3300, 3700): place(y, 0.14, ting(0.3, f, 0.2, 1.8))
    place(y, 0.15, splat(0.2), 0.4); place(y, 0.15, thud(130, 0.15, 0.0), 0.3)
    return cut(verb(y, 0.4, 0.15, 7000), d, 0.12)

def trident_throw():  # treudden kastas: ett kraftigt svisch och skaftet som roterar bort (svisch som tätnar och tonar ut)
    d = 1.0; y = np.zeros(int(d * SR)); place(y, 0, swish(0.3, 400, 2500, 2.0), 0.8); tc = 0.15
    for k in range(7): place(y, tc, swish(0.12, 600, 1500, 3.0), 0.5 * (1 - k / 7)); tc += 0.11
    return cut(verb(y, 0.5, 0.2, 6000), d, 0.2)

def trident_return():  # treudden kommer tillbaka: roterande svisch som växer och en metallisk fångst i handen
    d = 1.0; y = np.zeros(int(d * SR)); tc = 0.0
    for k in range(7): place(y, tc, swish(0.12, 600, 1500, 3.0), 0.15 + 0.5 * k / 7); tc += 0.11
    place(y, 0.8, clack(1800, 1.0, 300, 0.04), 0.7); place(y, 0.8, ting(0.2, 3100, 0.3, 2.0)); place(y, 0.8, thud(150, 0.15, 0.0), 0.3)
    return cut(verb(y, 0.4, 0.15, 7000), d, 0.15)

def brimstone_fire():  # svavelmortern avfyras: en dov, ihålig mortarsmäll ur röret och klotet som far iväg fräsande och brinnande
    d = 1.0; y = np.zeros(int(d * SR)); place(y, 0, thud(55, 0.5, 0.0), 0.9); place(y, 0, pipeknock(140, 0.6, 8.0))
    place(y, 0, crack(0.06, 0.5, 800)); place(y, 0.03, fuse(0.6, 0.3) * np.exp(-tt(0.6) * 3))
    place(y, 0.03, flame(0.7, [(0, 1), (0.7, 0)], 300, 3000, 1.0, 15), 0.35)
    return cut(verb(y, 0.7, 0.25, 5000), d, 0.25)

def brimstone_boom():  # svavelklotet exploderar: en eldig knall, brinnande svavel som stänker och fräser och en eld som brinner kvar
    d = 1.8; y = np.zeros(int(d * SR)); place(y, 0, boom(1.4, 1.0, 45), 1.0)
    place(y, 0, flame(1.7, [(0, 1), (0.3, 0.6), (1.7, 0)], 200, 4000, 1.0, 60), 0.45)
    place(y, 0.05, fuse(0.8, 0.25) * np.exp(-tt(0.8) * 2.5)); place(y, 0.05, splat(0.3), 0.3)
    y = np.tanh(2.0 * nrm(y))  # mjuk mättning: explosionen ska kännas tät, inte bara en spik i basen
    return cut(verb(y, 1.4, 0.3, 4500), d, 0.4)

# ---- biomernas drönare ----
def bathhouse_hum(T=4.0, d=4.8):  # badhuset (slinga 4 s, exakt periodisk): ett varmt, lågt sus från eldstäderna under golvet (40, 80 och
    # 120 Hz), vatten som kluckar i bassängerna, droppar som ekar i valven och ett svagt ångpys
    c = Cyc(T); t = c.t
    c.y += sum(c.tone(f, a) for f, a in ((40, 1.0), (80, 0.5), (120, 0.2))) * 0.07 * (0.85 + 0.15 * np.sin(2 * np.pi * 0.25 * t))
    c.y += c.noise(60, 400) * (0.7 + 0.3 * c.slow(2)) * 0.15
    sw = (0.5 + 0.5 * np.sin(2 * np.pi * 0.5 * t + 1)) ** 2
    c.y += c.noise(400, 2500) * sw * 0.05
    for t0 in rng.uniform(0, T, 16): c.add(t0, bubble(rng.uniform(300, 800), 0.05), 0.03)
    for t0, f, g in ((0.3, 1500, 0.12), (1.1, 1150, 0.1), (2.0, 1700, 0.08), (2.9, 1300, 0.12), (3.5, 1000, 0.08)): c.add(t0, drip(f), g)
    c.add(1.5, steam(1.2, [(0, 0), (0.3, 1), (1.2, 0)], 2500, 8000), 0.03)
    c.verb(2.2, 0.55, 3500)
    return c.out(d)

def purgatory_hum(T=4.0, d=4.8):  # skärselden (slinga 4 s, exakt periodisk): ett tungt, ondskefullt muller (40, 80, 120 och 200 Hz),
    # eld som brusar och knastrar i fjärran, varm vind med aska och avlägsna jämmerrop
    c = Cyc(T); t = c.t
    c.y += sum(c.tone(f, a) for f, a in ((40, 1.0), (80, 0.6), (120, 0.3), (200, 0.1))) * 0.08 * (0.8 + 0.2 * np.sin(2 * np.pi * 0.5 * t))
    c.y += c.noise(30, 200) * (0.6 + 0.4 * c.slow(2)) * 0.25
    c.y += c.noise(200, 2500) * (0.6 + 0.4 * c.slow(6)) * 0.12
    for t0 in rng.uniform(0, T, 60): c.add(t0, ember(0.5), rng.uniform(0.02, 0.08))
    c.add(0.4, fftfilt(wail(1.6, 280), 200, 2000), 0.03); c.add(2.4, fftfilt(wail(1.4, 220, F=EH), 200, 2000), 0.025)
    c.verb(2.0, 0.45, 3000)
    return c.out(d)

FX = dict(attendant=attendant, towel_snap=towel_snap, steamghost=steamghost, gladiator=gladiator, gladiator_block=gladiator_block,
          net_throw=net_throw, moldcrawler=moldcrawler, mold_spore_burst=mold_spore_burst,
          fireimp=fireimp, fireimp_ball=fireimp_ball, lostsoul=lostsoul, lostsoul_boom=lostsoul_boom, fleshbrute=fleshbrute,
          ground_slam=ground_slam, ashwalker=ashwalker, ash_reform=ash_reform,
          bathmaster_roar=bathmaster_roar, scald_splash=scald_splash, bath_dive=bath_dive,
          pyrelord_roar=pyrelord_roar, fire_rain=fire_rain, flame_pillar=flame_pillar, fissure=fissure,
          steam_vent=steam_vent, cold_pool=cold_pool, hot_pool=hot_pool, rune_circle=rune_circle, fountain=fountain,
          chained_soul=chained_soul, brimstone_pickup=brimstone_pickup,
          trident_stab=trident_stab, trident_throw=trident_throw, trident_return=trident_return,
          brimstone_fire=brimstone_fire, brimstone_boom=brimstone_boom, bathhouse_hum=bathhouse_hum, purgatory_hum=purgatory_hum)

# ---- fler instrument: badhus och skärseld ----
def lyre(n, d=1.6, g=1.0):  # lyra: mjukt knäppt tarmsträng, rund och lite ihålig
    y = pluck(n, d, 1.6, 1.0); y = reson(y, [(m2f(n), m2f(n) * 0.05, 0.6), (450, 150, 0.6), (1200, 400, 0.3)]) + 0.5 * y
    return nrm(fftfilt(y, 80, 4000)) * env(len(y), 0.003, 0.1) * g

def dguitar(n, d, g=1.0, mute=False, power=True, drive=7.0):  # distad syntgitarr: kvintackord (grundton, kvint, oktav) av isärstämda
    # sågtänder, kraftigt överstyrda genom en högtalarlådaktig resonans; mute = dämpat "chug" (mörkare, kort)
    t = tt(d); y = np.zeros(len(t))
    for m in ((n, n + 7, n + 12) if power else (n,)):
        f = m2f(m)
        for det in (-0.003, 0.0035): y += sawp(2 * np.pi * f * (1 + det) * t + rng.uniform(0, 6), 3500, f)
    y = fftfilt(y, 70, 900 if mute else 2600)
    y = np.tanh(drive * y / (np.abs(y).max() + 1e-9))
    y = reson(y, [(120, 60, 0.5), (850, 450, 1.0), (2100, 700, 0.55)]) + 0.4 * y
    y = fftfilt(y, 60, 3200 if mute else 5000)
    e = np.exp(-t * (22 if mute else 0.8)) * env(len(t), 0.002, 0.03 if mute else 0.08)
    return nrm(y) * e * g

def kick(g=1.0):  # metaltrummans baskagge: kort, hårt, med ett klick
    y = drum(55, 0.3, 1.0, 0.2, dec=14); place(y, 0, tick(0.006, 0.6, 2000, 8000, 800)); return y * g

def hat(g=1.0, d=0.05):  # hi-hat
    return tick(d, 1.0, 6000, 11000, 90) * g

# ---- bathhouse: Badhuset, a-moll (eoliskt), 100 bpm 4/4 (fjärdedel 0,6 s), 16 takter = 38,4 s
# (Am Am F F | Dm Dm E E | Am Am G G | F Dm E E) ----
# grund: ett ljumt sus, droppar som ekar i valven, låga horn på ackorden, en lyra som brutet arpeggierar och från femte takten en
# flöjt (tibia) i moll; stor, ekande efterklang.
# hi: tympanon (ramtrumma), fingercymbaler, pizzicatobas och ett lyraostinato i åttondelar.
def bathhouse():
    b = 0.6; br = 4 * b; T = 16 * br; base = Loop(T); hi = Loop(T)
    prog = ['Am', 'Am', 'F', 'F', 'Dm', 'Dm', 'E', 'E', 'Am', 'Am', 'G', 'G', 'F', 'Dm', 'E', 'E']
    chord = {'Am': [57, 60, 64], 'F': [57, 60, 65], 'Dm': [57, 62, 65], 'E': [56, 59, 64], 'G': [55, 59, 62]}
    root = {'Am': 45, 'F': 41, 'Dm': 38, 'E': 40, 'G': 43}
    base.add(0, base.drone(33, 0.05, h=10, roll=1.3, cyc=2, hi=400)); base.add(0, base.bed(200, 1500, 0.005, cyc=4))
    for i in range(0, 16, 2): base.add(i * br - 0.3, blower([root[prog[i]], root[prog[i]] + 7], 2 * br + 0.4, 0.08, att=0.8, rel=1.0), 0.0)
    for i, c in enumerate(prog):
        ch = chord[c]
        for k, n in enumerate((ch[0] - 12, ch[1] - 12, ch[2] - 12, ch[0], ch[2] - 12, ch[1] - 12)): base.add(i * br + k * b * 2 / 3, lyre(n, 1.8, 0.07), -0.3)
    sc = [76, 79, 81, 84, 86, 88]
    for _ in range(34): base.add(round(rng.uniform(0, T) / (b / 2)) * b / 2, dripn(sc[rng.integers(len(sc))], 1.0), rng.uniform(-0.8, 0.8), rng.uniform(0.012, 0.03))
    mel = [(4, 0, 76, 2), (4, 2, 77, 1), (4, 3, 76, 1), (5, 0, 74, 2), (5, 2, 72, 2), (6, 0, 71, 1.5), (6, 1.5, 72, 0.5), (6, 2, 74, 2),
           (7, 0, 68, 4), (8, 0, 72, 1), (8, 1, 74, 1), (8, 2, 76, 2), (9, 0, 81, 2), (9, 2, 79, 1), (9, 3, 77, 1),
           (10, 0, 79, 2), (10, 2, 74, 2), (11, 0, 71, 3), (11, 3, 74, 1), (12, 0, 72, 1.5), (12, 1.5, 74, 0.5), (12, 2, 77, 2),
           (13, 0, 76, 1), (13, 1, 74, 1), (13, 2, 72, 1), (13, 3, 71, 1), (14, 0, 69, 2), (14, 2, 68, 2)]
    for bi, k, n, dd in mel: base.add((bi * 4 + k) * b, flute(n, dd * b + 0.05, 0.08), 0.2)
    for i, c in enumerate(prog):
        t0 = i * br; r = root[c]; ch = chord[c]
        for k8, g in ((0, 0.3), (3, 0.18), (4, 0.24), (6, 0.15), (7, 0.12)): hi.add(t0 + k8 * b / 2, bodhran(g, 90, 0.35, 0.3), 0.05)
        for k in (1, 3): hi.add(t0 + k * b, riq(0.06), -0.4)
        hi.add(t0, pizz(r - 12 if r > 40 else r, 0.6, 0.2), 0); hi.add(t0 + 2 * b, pizz(r + 7 - 12 if r > 40 else r + 7, 0.6, 0.15), 0)
        for k8 in range(8): hi.add(t0 + k8 * b / 2, lyre(ch[k8 % 3] + (12 if k8 % 4 == 3 else 0), 0.6, 0.05), 0.35)
    base.reverb(4.5, 0.6, 3500, 0.07); hi.reverb(2.0, 0.35, 4500)
    write_aligned((base, 'bathhouse', -20), (hi, 'bathhouse_hi', -23))

# ---- purgatory: Skärselden, d-frygiskt (d ess f g a b c), 90 bpm-känsla på 100 bpm-nätet (fjärdedel 0,6 s), 16 takter = 38,4 s
# (Dm Dm Eb Dm | Dm Dm Bb A | Dm Eb Dm Eb | Gm Bb A A) ----
# grund: ett väldigt, mörkt drönarmuller, brusande eld, en dov manskör på ackorden, låga blåsare, avlägsna järnslag med eko och
# jämmerrop långt bort.
# hi: tunga taikoslag, tomtrummor, städslag på två och fyra och en distad, pulserande bas.
def purgatory():
    b = 0.6; br = 4 * b; T = 16 * br; base = Loop(T); hi = Loop(T)
    prog = ['Dm', 'Dm', 'Eb', 'Dm', 'Dm', 'Dm', 'Bb', 'A', 'Dm', 'Eb', 'Dm', 'Eb', 'Gm', 'Bb', 'A', 'A']
    chord = {'Dm': [50, 53, 57], 'Eb': [51, 55, 58], 'Bb': [50, 53, 58], 'A': [49, 52, 57], 'Gm': [50, 55, 58]}
    root = {'Dm': 38, 'Eb': 39, 'Bb': 34, 'A': 45, 'Gm': 43}
    base.add(0, base.drone(26, 0.1, h=12, roll=1.1, cyc=2, hi=350)); base.add(0, base.drone(33, 0.04, h=8, roll=1.3, cyc=3, hi=350))
    base.add(0, base.bed(40, 300, 0.012, cyc=4)); base.add(0, base.bed(300, 2500, 0.004, cyc=6))
    for i, c in enumerate(prog):
        base.add(i * br - 0.2, chant([n - 12 for n in chord[c]], br + 0.4, 1.0), 0.0, 0.06)
        if i % 2 == 0: base.add(i * br - 0.3, blower([root[c] - 12 + 12, root[c] + 7], 2 * br + 0.4, 0.08, att=0.8, rel=1.0), 0.0)
    for bi, p in ((1, -0.5), (5, 0.5), (9, -0.4), (13, 0.4)):
        for e, ge in ((0, 1.0), (0.6, 0.4), (1.2, 0.16)): base.add(bi * br + 2 * b + e, fftfilt(hammer(1.0, 230), 120, 2500), p if e == 0 else -p, 0.05 * ge)
    for t0, f in ((3 * br, 300), (7 * br + 1.0, 250), (11 * br, 330), (14 * br + 0.5, 270)): base.add(t0, fftfilt(wail(2.0, f), 200, 2000), rng.uniform(-0.7, 0.7), 0.02)
    for _ in range(80): base.add(rng.uniform(0, T), ember(0.5), rng.uniform(-0.8, 0.8), rng.uniform(0.01, 0.03))
    for i, c in enumerate(prog):
        t0 = i * br; r = root[c]
        hi.add(t0, taiko(0.45, 38, 1.3), 0); hi.add(t0 + 2 * b, taiko(0.35, 42, 1.1), 0); hi.add(t0 + 3.5 * b, taiko(0.2, 46, 0.9), 0)
        for k in (1, 3): hi.add(t0 + k * b, hammer(0.14, 280), 0.3 if k == 1 else -0.3)
        for k8 in (5, 7): hi.add(t0 + k8 * b / 2, drum(110, 0.4, 0.15, 0.2, dec=8), -0.3)
        hi.add(t0, pbass(r, br, 2 / b, 0.14, 2.2), 0)
    base.reverb(4.0, 0.5, 3000, 0.06); hi.reverb(1.8, 0.3, 3500)
    write_aligned((base, 'purgatory', -20), (hi, 'purgatory_hi', -23))

# ---- boss27: badmästaren, e-moll, 100 bpm 4/4 (fjärdedel 0,6 s), 16 takter = 38,4 s, fyra delar à 4 takter
# (Em Em C C | Am Am B B | Em Em C D | Am B Em B) ----
# droppar och ekande valv, låga horn (mistlursaktiga) på varannan takt, en lyra i moll som spelar melodin, pukor, ramtrumma, kör som
# sväller i de två sista delarna, stora plask på varje dels etta och cymbaler.
def boss27():
    b = 0.6; br = 4 * b; T = 16 * br; L = Loop(T)
    prog = ['Em', 'Em', 'C', 'C', 'Am', 'Am', 'B', 'B', 'Em', 'Em', 'C', 'D', 'Am', 'B', 'Em', 'B']
    chord = {'Em': [52, 55, 59], 'C': [52, 55, 60], 'Am': [52, 57, 60], 'B': [51, 54, 59], 'D': [50, 54, 57]}
    root = {'Em': 40, 'C': 36, 'Am': 45, 'B': 47, 'D': 38}
    L.add(0, L.bed(200, 1500, 0.004, cyc=4)); L.add(0, L.drone(28, 0.05, h=8, roll=1.3, cyc=2, hi=300))
    sc = [76, 79, 81, 83, 86, 88]
    for _ in range(30): L.add(round(rng.uniform(0, T) / (b / 2)) * b / 2, dripn(sc[rng.integers(len(sc))], 1.0), rng.uniform(-0.8, 0.8), rng.uniform(0.015, 0.035))
    for i, c in enumerate(prog):
        t0 = i * br; ch = chord[c]; r = root[c]; p = i // 4
        if i % 2 == 0: L.add(t0, horn(m2f(r - 12), 2 * br * 0.9, 1.0, 0.92, 1000), 0.0, 0.07)
        L.add(t0, taiko(0.4, 40, 1.3), 0); L.add(t0 + 2 * b, taiko(0.28, 44, 1.0), 0)
        for k8, g in ((1, 0.12), (3, 0.16), (5, 0.12), (6, 0.18), (7, 0.12)): L.add(t0 + k8 * b / 2, bodhran(g, 100, 0.3, 0.35), 0.2)
        L.add(t0, timp(r if r <= 45 else r - 12, 0.35), 0); L.add(t0 + 3.5 * b, timp((r if r <= 45 else r - 12) + 7, 0.2), 0)
        L.add(t0, dbass(r - 12, br * 0.95, 0.09, 1.5, 400), 0)
        for k, n in enumerate((ch[0] - 12, ch[1] - 12, ch[2] - 12, ch[1])): L.add(t0 + k * b, lyre(n, 1.4, 0.06), -0.35)
        if p >= 2: L.add(t0 - 0.15, nrm(choir([n - 12 for n in ch], br + 0.4, 0.2, 0.4, 1.0, 4.5, OH, 3000)), 0.0, 0.1)
        if p >= 2: L.add(t0, brass([n - 12 for n in ch], br * 0.95, att=0.3, rel=0.4, drive=2.0, swell=0.6, hi_fc=1800), 0.2, 0.07)
        if i % 4 == 0: L.add(t0, crash_cym(0.1, 3.0), 0.35); L.add(t0, splash(1.0, 1.0, 200, 5000), -0.4, 0.06)
    mel = [(0, 0, 76, 2), (0, 2, 79, 1), (0, 3, 78, 1), (1, 0, 76, 4), (2, 0, 72, 2), (2, 2, 76, 2), (3, 0, 79, 3), (3, 3, 76, 1),
           (4, 0, 81, 2), (4, 2, 79, 1), (4, 3, 77, 1), (5, 0, 76, 2), (5, 2, 72, 2), (6, 0, 75, 2), (6, 2, 78, 2), (7, 0, 71, 4),
           (8, 0, 79, 2), (8, 2, 83, 2), (9, 0, 81, 1), (9, 1, 79, 1), (9, 2, 78, 2), (10, 0, 76, 2), (10, 2, 79, 2), (11, 0, 78, 3), (11, 3, 74, 1),
           (12, 0, 72, 2), (12, 2, 76, 2), (13, 0, 75, 2), (13, 2, 71, 2), (14, 0, 76, 4)]
    for bi, k, n, dd in mel: L.add((bi * 4 + k) * b, lyre(n, dd * b + 1.0, 0.11), 0.25); L.add((bi * 4 + k) * b, flute(n - 12, dd * b + 0.05, 0.05), 0.1)
    L.reverb(4.5, 0.55, 4000)
    write_aligned((L, 'boss27', -19))

# ---- boss28: eldfursten, tung metal i Doom-anda, e-frygiskt (e f g a h c d), 150 bpm 4/4 (fjärdedel 0,4 s), 24 takter = 38,4 s,
# tre fraser à 8 takter. Egen originalmusik: ett riff i sextondelar (dämpade "chug" på e och accentuerade kvintackord på g, b, a, f),
# en mellandel med utdragna kvintackord (E C D H) och kör, och en tredje del där riffet kommer tillbaka med en distad leadmelodi
# ovanpå. Trummor: baskagge i sextondelar (dubbelpedal) i första och tredje frasen, åttondelar i den andra, virvel på två och fyra,
# hi-hat i åttondelar, cymbaler och virvlar vid frasskiftena; en distad bas följer gitarrens grundton. ----
def boss28():
    b = 0.4; br = 4 * b; s = b / 4; T = 24 * br; L = Loop(T)
    E = 40
    riffA = [(0, 0, 1, 1), (1, 0, 1, 1), (2, 0, 1, 1), (3, 0, 1, 1), (4, 3, 2, 0), (6, 0, 1, 1), (7, 0, 1, 1), (8, 6, 2, 0), (10, 5, 2, 0),
             (12, 0, 1, 1), (13, 0, 1, 1), (14, 1, 2, 0)]
    riffA2 = riffA[:8] + [(8, 7, 2, 0), (10, 6, 2, 0), (12, 5, 2, 0), (14, 3, 2, 0)]
    Broots = [0, 0, -4, -4, -2, -2, -5, -5]
    lead = [(16, 0, 71, 2), (16, 2, 72, 1), (16, 3, 71, 1), (17, 0, 67, 2), (17, 2, 64, 2), (18, 0, 65, 1), (18, 1, 67, 1), (18, 2, 70, 2),
            (19, 0, 69, 4), (20, 0, 71, 1), (20, 1, 72, 1), (20, 2, 74, 2), (21, 0, 76, 2), (21, 2, 74, 1), (21, 3, 72, 1),
            (22, 0, 71, 1.5), (22, 1.5, 70, 0.5), (22, 2, 67, 2), (23, 0, 64, 4)]
    L.add(0, L.bed(40, 300, 0.008, cyc=6))
    for i in range(24):
        t0 = i * br; p = i // 8
        if p == 1:
            r = E + Broots[i - 8]
            for k8 in range(8):
                acc = k8 in (0, 3, 6)
                L.add(t0 + k8 * b / 2, dguitar(r, b / 2 + (0.25 if acc else 0.02), 0.2 if acc else 0.14, mute=not acc), -0.45 if k8 % 2 else 0.45)
            L.add(t0, dbass(r - 12, br * 0.95, 0.12, 2.5, 500), 0)
            L.add(t0 - 0.05, chant([r + 12, r + 19, r + 24], br + 0.1, 1.0), 0.0, 0.1)
            for k8 in range(8): L.add(t0 + k8 * b / 2, kick(0.22), 0)
        else:
            rf = riffA2 if i % 4 == 3 else riffA
            for st, off, ln, mute in rf:
                g = 0.13 if mute else 0.2
                L.add(t0 + st * s, dguitar(E + off, ln * s + (0.0 if mute else 0.03), g, mute=bool(mute)), -0.45, 1.0)
                L.add(t0 + st * s + 0.012, dguitar(E + off, ln * s + (0.0 if mute else 0.03), g, mute=bool(mute)), 0.45, 1.0)
                L.add(t0 + st * s, dbass(E + off - 12, ln * s * 0.95, 0.1, 2.5, 500), 0)
            for k16 in range(16): L.add(t0 + k16 * s, kick(0.17 if k16 % 2 else 0.22), 0)
        for k in (1, 3): L.add(t0 + k * b, snare(0.32), 0.05)
        for k8 in range(8): L.add(t0 + k8 * b / 2, hat(0.07 if k8 % 2 else 0.1), -0.3)
        if i % 8 == 0: L.add(t0, crash_cym(0.16, 2.5), 0.35)
        if i % 8 == 7: L.add(t0 + 2 * b, roll(2 * b - 0.03, 0.16, rate=32), 0.1)
        if p == 2: L.add(t0 - 0.05, nrm(choir([E + 12, E + 19, E + 24], br + 0.1, 0.1, 0.3, 1.0, 4.5, AA, 3000)), 0.0, 0.07)
    for bi, k, n, dd in lead: L.add((bi * 4 + k) * b, dguitar(n, dd * b + 0.05, 0.12, mute=False, power=False, drive=5.0), 0.15)
    L.reverb(1.6, 0.22, 4500)
    write_aligned((L, 'boss28', -19))

for k, f in FX.items():
    x = f(); assert np.all(np.isfinite(x)), k
    wr('s_' + k, x)
if 'FXONLY' not in sys.argv: bathhouse(); purgatory(); boss27(); boss28()
PY
python3 -I "$T/synth19.py" "$T"

# ---------- musik ----------
mus bathhouse -20 anull "$T/bathhouse.wav"
mus bathhouse_hi -23 anull "$T/bathhouse_hi.wav"
mus purgatory -20 anull "$T/purgatory.wav"
mus purgatory_hi -23 anull "$T/purgatory_hi.wav"
mus boss27 -19 anull "$T/boss27.wav"
mus boss28 -19 anull "$T/boss28.wav"

# ---------- ljudeffekter ----------
E="$S/Environment"
X="$S/Materials"
G="$S/Combat and Gore"
W="$S/Weapons"
# fiender: Badhuset
TOP=-2 fx attendant "$P" "$T/s_attendant.wav"
fx towel_snap "$P" "$T/s_towel_snap.wav"
TOP=-2 fx steamghost "$P" "$T/s_steamghost.wav"
TOP=-2 fx gladiator "[0:a]$P[a];[1:a]$P,volume=0.3,adelay=550[b];[a][b]$(mix 2),atrim=0:1.3,afade=t=out:st=1.0:d=0.3[o]" "$T/s_gladiator.wav" "$W/sword_clash.wav"
fx gladiator_block "[0:a]$P[a];[1:a]$P,volume=0.35[b];[a][b]$(mix 2),atrim=0:0.7,afade=t=out:st=0.5:d=0.2[o]" "$T/s_gladiator_block.wav" "$I/impactPlate_heavy_001.ogg"
TOP=-2 fx net_throw "$P" "$T/s_net_throw.wav"
TOP=-2 fx moldcrawler "[0:a]$P[a];[1:a]$P,volume=0.3,adelay=100[b];[a][b]$(mix 2),atrim=0:1.4,afade=t=out:st=1.1:d=0.3[o]" "$T/s_moldcrawler.wav" "$G/squelching_4.wav"
fx mold_spore_burst "$P" "$T/s_mold_spore_burst.wav"
# fiender: Skärselden
TOP=-2 fx fireimp "$P" "$T/s_fireimp.wav"
fx fireimp_ball "$P" "$T/s_fireimp_ball.wav"
TOP=-2 fx lostsoul "$P" "$T/s_lostsoul.wav"
fx lostsoul_boom "$P" "$T/s_lostsoul_boom.wav"
TOP=-2 fx fleshbrute "[0:a]$P[a];[1:a]$P,asetrate=33075,aresample=44100,volume=0.3,adelay=1150[b];[a][b]$(mix 2),atrim=0:1.9,afade=t=out:st=1.6:d=0.3[o]" "$T/s_fleshbrute.wav" "$G/squelching_3.wav"
fx ground_slam "$P" "$T/s_ground_slam.wav"
TOP=-4 fx ashwalker "$P" "$T/s_ashwalker.wav"
fx ash_reform "$P" "$T/s_ash_reform.wav"
# bossar
TOP=-2 fx bathmaster_roar "$P" "$T/s_bathmaster_roar.wav"
fx scald_splash "[0:a]$P[a];[1:a]$P,volume=0.3[b];[a][b]$(mix 2),atrim=0:1.3,afade=t=out:st=1.0:d=0.3[o]" "$T/s_scald_splash.wav" "$E/water_splashing.wav"
TOP=-2 fx bath_dive "$P" "$T/s_bath_dive.wav"
TOP=-2 fx pyrelord_roar "$P" "$T/s_pyrelord_roar.wav"
TOP=-3 fx fire_rain "$P" "$T/s_fire_rain.wav"
fx flame_pillar "$P" "$T/s_flame_pillar.wav"
fx fissure "$P" "$T/s_fissure.wav"
# rutor och rekvisita
TOP=-3 fx steam_vent "$P" "$T/s_steam_vent.wav"
TOP=-3 fx cold_pool "$P" "$T/s_cold_pool.wav"
TOP=-3 fx hot_pool "$P" "$T/s_hot_pool.wav"
fx rune_circle "$P" "$T/s_rune_circle.wav"
TOP=-3 fx fountain "$P" "$T/s_fountain.wav"
TOP=-2 fx chained_soul "$P" "$T/s_chained_soul.wav"
fx brimstone_pickup "$P" "$T/s_brimstone_pickup.wav"
# vapen: treudden och svavelmortern
fx trident_stab "$P" "$T/s_trident_stab.wav"
fx trident_throw "$P" "$T/s_trident_throw.wav"
fx trident_return "$P" "$T/s_trident_return.wav"
fx brimstone_fire "$P" "$T/s_brimstone_fire.wav"
fx brimstone_boom "$P" "$T/s_brimstone_boom.wav"
# slingor: biomernas drönare (exakt periodiska, linjär överlappning)
TOP=-4 fxcyc bathhouse_hum 4 0.6 "$P" "$T/s_bathhouse_hum.wav"
TOP=-4 fxcyc purgatory_hum 4 0.6 "$P" "$T/s_purgatory_hum.wav"

for f in "$O"/{attendant,towel_snap,steamghost,gladiator,gladiator_block,net_throw,moldcrawler,mold_spore_burst,fireimp,fireimp_ball,lostsoul,lostsoul_boom,fleshbrute,ground_slam,ashwalker,ash_reform,bathmaster_roar,scald_splash,bath_dive,pyrelord_roar,fire_rain,flame_pillar,fissure,steam_vent,cold_pool,hot_pool,rune_circle,fountain,chained_soul,brimstone_pickup,trident_stab,trident_throw,trident_return,brimstone_fire,brimstone_boom,bathhouse_hum,purgatory_hum}.ogg; do printf '%-40s %6.2f s %5d kB\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" "$(( $(stat -c %s "$f") / 1024 ))"; done
for f in "$M"/bathhouse.ogg "$M"/bathhouse_hi.ogg "$M"/purgatory.ogg "$M"/purgatory_hi.ogg "$M"/boss27.ogg "$M"/boss28.ogg; do printf '%-36s %6.2f s %5d kB %6s LUFS\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" "$(( $(stat -c %s "$f") / 1024 ))" "$(lufs "$f")"; done
