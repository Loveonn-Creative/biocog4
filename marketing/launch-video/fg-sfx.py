# Sound for fog.html (90 s) and the 30 s teaser cut. Muffled low drone while the file is fog;
# a crisp focus click when the record snaps sharp; then a calm, clear bed with one cue per reveal.
import numpy as np, wave
SR = 48000; D = 90.0; n = int(SR * D); t = np.arange(n) / SR
L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(17)

def add(sig, at, pan=0.0, g=1.0):
    i = int(at * SR); sig = sig[:max(0, n - i)]
    L[i:i+len(sig)] += sig * g * (1 - max(0, pan)); R[i:i+len(sig)] += sig * g * (1 + min(0, pan))
def filt(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1/SR); m = np.ones_like(f)
    if hi: m *= 1 / (1 + (f/hi)**4)
    if lo: m *= 1 / (1 + (lo/np.maximum(f, 1e-3))**4)
    return np.fft.irfft(X*m, len(x))
def env(d, a=.003, k=30.0):
    tt = np.arange(int(d*SR))/SR; return np.minimum(1, tt/a)*np.exp(-tt*k), tt
def ramp(x0, x1, a, b):  # 0 before a, 1 after b, smooth
    k = np.clip((t - a)/(b - a), 0, 1); return k*k*(3-2*k)

# ---------- the fog: muffled drone (0 - 25.4) and its brief return (80.3 - 83) ----------
fogEnv = ramp(0,1,.5,3.0)*.25 + ramp(0,1,5.4,9.2)*.75
fogEnv *= 1 - ramp(0,1,25.4,25.75)
fogEnv = np.maximum(fogEnv, ramp(0,1,80.3,81.5)*.5*(1-ramp(0,1,82.95,83.2)))
noise = filt(rng.standard_normal(n), lo=40, hi=320) * 2.2
wob = 1 + .35*np.sin(2*np.pi*.07*t) + .2*np.sin(2*np.pi*.19*t+1)
drone = (np.sin(2*np.pi*55*t) + .6*np.sin(2*np.pi*82.41*t + .5) + .45*np.sin(2*np.pi*110.3*t) + .25*np.sin(2*np.pi*164.0*t))
drone = filt(drone, hi=260)
L += (drone*.32 + noise*.5*wob) * fogEnv; R += (drone*.32 + noise*.5*wob[::-1]) * fogEnv

def muffle(x): return filt(x, hi=700)
def tick(bright=True):
    e, tt = env(.035, .0004, 180); x = np.sin(2*np.pi*2600*tt)*e*.6 + rng.standard_normal(len(tt))*e*.25
    return x if bright else muffle(np.pad(x, (0, 2000)))
def click():  # the focus snap: a sharp mechanical click with a short body
    e, tt = env(.06, .0002, 120); a = rng.standard_normal(len(tt))*e
    a = filt(np.pad(a, (0, 3000)), lo=1800)[:len(tt)] * 1.6
    e2, tt2 = env(.25, .001, 22); body = np.sin(2*np.pi*(1180 + 300*np.exp(-tt2*60))*tt2)*e2*.5
    out = np.zeros(len(tt2)); out[:len(a)] += a; out += body
    e3, tt3 = env(.02, .0002, 300); out[int(.018*SR):int(.018*SR)+len(tt3)] += np.sin(2*np.pi*4200*tt3)*e3*.6
    return out
def scratch(d):
    tt = np.arange(int(d*SR))/SR; x = filt(rng.standard_normal(len(tt)), lo=900, hi=5200)
    grain = .55 + .45*np.abs(np.sin(2*np.pi*(20 + 8*np.sin(2*np.pi*3*tt))*tt))
    return x * grain * np.minimum(1, tt/.02) * np.minimum(1, (d-tt)/.06) * 1.4
def whoosh(d, lo=200, hi=2400):
    tt = np.arange(int(d*SR))/SR; x = filt(rng.standard_normal(len(tt)), lo=lo, hi=hi)
    return x*np.sin(np.pi*tt/d)**2*2.2
def thud(f=60, bright=.5):
    e, tt = env(.7, .002, 7); b = np.sin(2*np.pi*(f + 50*np.exp(-tt*30))*tt)*e
    e2, _ = env(.06, .0005, 70); b[:len(e2)] += filt(rng.standard_normal(len(e2) + 2000), hi=2500)[:len(e2)]*e2*bright
    return b
def pluck(f, d=1.2, k=4.5):
    e, tt = env(d, .003, k); return (np.sin(2*np.pi*f*tt) + .3*np.sin(4*np.pi*f*tt) + .08*np.sin(6*np.pi*f*tt))*e
def twang(f=196.0):  # the thread pulled taut
    e, tt = env(1.6, .002, 2.6); vib = 1 + .012*np.exp(-tt*3)*np.sin(2*np.pi*6.5*tt)
    ph = 2*np.pi*np.cumsum(f*vib)/SR
    return (np.sin(ph) + .5*np.sin(2*ph) + .25*np.sin(3*ph) + .1*np.sin(5*ph))*e
def glide(f0, f1, d):
    tt = np.arange(int(d*SR))/SR; f = f0 + (f1-f0)*(1-np.exp(-tt*4)); ph = 2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*np.sin(np.pi*tt/d)**1.5
def pad(fs, d, att, rel, g):
    tt = np.arange(int(d*SR))/SR; e = np.minimum(1, tt/att)*np.clip((d-tt)/rel, 0, 1)
    s = sum((np.sin(2*np.pi*f*tt + i) + .15*np.sin(2*np.pi*f*2.002*tt))*(.75 + .25*np.sin(2*np.pi*.13*tt + i)) for i, f in enumerate(fs))
    return s*e*g/len(fs)

# hook: the strike-through
add(scratch(.6), 2.25, .2, .35)
# lens arrives, muffled
add(muffle(whoosh(1.2)), 10.3, .3, .5)
# focus ring hunting: muffled ticks every 7.5 degrees of ring travel (same curve as the film)
def ang(x): return 40*np.sin(x*.9) + 22*np.sin(x*2.4)
last = None
for x in np.arange(11.8, 21.0, 1/240):
    a = int(ang(x)//7.5)
    if last is not None and a != last: add(tick(False), x, .15, .22)
    last = a
# swap: paper slides away, record rises
add(muffle(whoosh(.9, 150, 1800)), 21.2, -.2, .6)
for x in np.arange(23.0, 25.35, 1/240):
    k = min(1, (x-23.0)/2.4); a = int((150*k*k*(3-2*k))//7.5)
    if a != last: add(tick(False), x, .1, .2 + .2*k)
    last = a
# SNAP
add(click(), 25.4, 0, 1.0)
add(pad([261.63, 392.0, 523.25, 659.25, 783.99, 1046.5], 5.0, .05, 3.5, .5), 25.42)
for at in [26.3+.45, 27.3+.45]: add(tick(), at, .2, .35)
# calm bed after the snap: clear, institutional
for at, ch in [(26.5, [130.81, 196.0, 261.63, 329.63, 293.66]), (36.5, [110.0, 164.81, 261.63, 329.63, 392.0]),
               (46.5, [87.31, 174.61, 220.0, 261.63, 329.63]), (56.5, [98.0, 146.83, 246.94, 293.66, 392.0]),
               (66.5, [130.81, 196.0, 261.63, 329.63, 392.0]), (73.5, [110.0, 164.81, 220.0, 261.63, 329.63])]:
    add(pad(ch, 11.5 if at < 73 else 7.8, 2.5, 3.0, .26), at)
# B1 thread
add(whoosh(.9, 900, 6000)*.6, 29.9, .2, .35); add(twang(), 31.85, .25, .55)
# B2 band
add(scratch(.75), 40.3, .2, .45); add(glide(330, 392, .9)*.5, 41.5, .1, .4)
# B3 seal
add(thud(52, .7), 50.0, 0, .85); add(filt(rng.standard_normal(int(.25*SR)), hi=900)*np.exp(-np.arange(int(.25*SR))/SR*16)*.6, 50.03, 0, .5)
for i, at in enumerate([53.7, 54.5, 55.3]): add(tick(), at, -.2, .35); add(pluck(523.25, .8, 6)*.4, at, -.2, .3)
# B4 grade
add(thud(78, .6), 58.9, 0, .8); add(scratch(.5), 59.9, .2, .4)
# B5 fit
add(scratch(.55), 66.2, .2, .4)
# pull back to the wall
add(whoosh(2.2, 120, 1500), 71.8, 0, .55)
notes = [392.0, 440.0, 523.25, 587.33, 659.25]
for k in range(14):
    tc = 74.3 + k*.25; add(tick(), tc, (k % 5 - 2)/3, .28); add(pluck(notes[k % 5]*(1 if k < 10 else 2), .7, 7)*.35, tc + .3, (k % 5 - 2)/3, .3)
# CTA: fog returns, then the final snap and resolve
add(click(), 82.95, 0, 1.0)
add(pad([130.81, 196.0, 261.63, 329.63, 392.0, 587.33], 7.0, .05, 4.0, .6), 82.97)
add(scratch(.6), 83.7, .1, .35)
add(pluck(261.63, 2.5, 1.6)*.5, 86.1, 0, .5); add(pluck(392.0, 2.5, 1.6)*.35, 86.1, .2, .5)

mix = np.stack([L, R], 1)
mix *= np.minimum(1, (D - t)/1.6)[:, None] * np.minimum(1, t/.3)[:, None]
mix /= np.abs(mix).max()/.72
def save(name, x):
    with wave.open(name, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x*32767).astype('<i2').tobytes())
save('fg-sfx.wav', mix)

# teaser: same segments as the film's teaser time map, joined with short crossfades
MAP = [(0, 7.6, 0), (7.6, 15.6, 12.5), (15.6, 23.6, 21.0), (23.6, 30.0, 82.0)]
xf = int(.03*SR); parts = []
for a, b, f in MAP:
    s0 = int(f*SR); s1 = s0 + int((b-a)*SR); parts.append(mix[max(0, s0-xf):s1].copy())
out = parts[0]
for nx in parts[1:]:
    ramp_ = np.linspace(0, 1, xf)[:, None]
    out = np.concatenate([out[:-xf], out[-xf:]*(1-ramp_) + nx[:xf]*ramp_, nx[xf:]])
out = out[:int(30*SR)]
tt = np.arange(len(out))/SR; out = out*np.minimum(1, (30 - tt)/1.2)[:, None]
out /= np.abs(out).max()/.72
save('fg-teaser.wav', out)
print('ok', len(out)/SR)
