# Procedural sound design, synced to launch.html's timeline.
import numpy as np, wave
SR = 48000; D = 20.0; n = int(SR * D)
t = np.arange(n) / SR
L = np.zeros(n); R = np.zeros(n)
rng = np.random.default_rng(7)

def add(sig, at, pan=0.0, g=1.0):
    i = int(at * SR); sig = sig[: max(0, n - i)]
    L[i:i + len(sig)] += sig * g * (1 - max(0, pan)); R[i:i + len(sig)] += sig * g * (1 + min(0, pan))

def env(dur, a=0.004, k=30.0):
    tt = np.arange(int(dur * SR)) / SR
    return np.minimum(1, tt / a) * np.exp(-tt * k), tt

def lp(x, a):  # one-pole low-pass
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x): acc += a * (v - acc); y[i] = acc
    return y

def pop(f=1046.5):  # message-arrive: soft two-partial blip with slight pitch drop
    e, tt = env(.22, .002, 22); ph = 2*np.pi*np.cumsum(f*(1+.06*np.exp(-tt*40)))/SR
    return (np.sin(ph) + .25*np.sin(2*ph)) * e

def tick():
    e, tt = env(.03, .0005, 260); return np.sin(2*np.pi*2400*tt) * e * .5 + lp(rng.standard_normal(len(tt)), .3) * e * .4

def whoosh(dur=.7):
    tt = np.arange(int(dur*SR))/SR; e = np.sin(np.pi*tt/dur)**2
    out = np.zeros_like(tt); x = rng.standard_normal(len(tt))
    # sweeping band: two low-passes with moving coefficient approximated by blocks
    for b in range(0, len(tt), 480):
        a = .02 + .25 * (b/len(tt)); seg = x[b:b+480]
        out[b:b+480] = lp(seg, a) - lp(seg, a*.3)
    return out * e * 1.6

def thud():
    e, tt = env(.45, .002, 9); body = np.sin(2*np.pi*(70 + 50*np.exp(-tt*30))*tt) * e
    e2, _ = env(.06, .0005, 80); click = lp(rng.standard_normal(len(e2)), .5) * e2
    out = body.copy(); out[:len(click)] += click * .6; return out

def chord(freqs, dur, attack=.8, release=1.5, g=.12):
    tt = np.arange(int(dur*SR))/SR
    e = np.minimum(1, tt/attack) * np.minimum(1, np.maximum(0, (dur - tt)/release))
    s = sum(np.sin(2*np.pi*f*tt + i) * (.6 + .4*np.sin(2*np.pi*.3*tt + i)) + .2*np.sin(2*np.pi*2*f*tt) for i, f in enumerate(freqs))
    return s * e * g / len(freqs)

# Bed: unresolved suspension under the asks, opens to a warm major chord at "already in your bills"
add(chord([146.83, 220.0, 293.66, 329.63], 4.6, 1.2, .9, .5), 0.0)            # Dsus2 tension
add(chord([130.81, 196.0, 261.63, 329.63, 392.0], 8.2, .9, 1.4, .55), 4.3)     # C major, open
add(chord([174.61, 220.0, 261.63, 349.23, 440.0], 4.3, .6, 1.0, .5), 12.3)     # F major lift on answers
add(chord([130.81, 196.0, 261.63, 329.63, 392.0, 587.33], 4.0, .5, 1.8, .6), 16.0)  # resolve on end card

for at, pan in [(0.27, -.3), (0.97, 0), (1.67, .3)]: add(pop(), at, pan, .35)
for at in [4.15, 12.2, 15.85]: add(whoosh(), at - .2, 0, .22)
# scan: soft rising tone
tt = np.arange(int(1.15*SR))/SR; add(np.sin(2*np.pi*(500+400*tt)*tt) * np.sin(np.pi*tt/1.15)**2 * .5, 6.0, 0, .08)
add(pop(1318.5), 7.08, 0, .25)                        # units row locks
add(whoosh(.6), 7.8, .2, .12)                          # chip flight
# count-up ticks follow the easing (outCubic over 1.3s from 9.3s)
last = -1
for k in range(1, 300):
    x = k/300; v = int((1-(1-x)**3) * 26)
    if v != last: add(tick(), 9.3 + x*1.3, 0, .35); last = v
add(pop(784), 10.72, -.2, .25)                        # scope tag
add(thud(), 11.1, 0, .7)                               # verified stamp
for at, pan in [(13.4, .3), (13.8, .3), (14.2, .3)]: add(pop(1567.98), at, pan, .22)

mix = np.stack([L, R], 1)
fade = np.minimum(1, (D - t) / 1.2)[:, None]; mix *= fade
mix /= np.abs(mix).max() / 0.7
with wave.open('sfx.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok')
