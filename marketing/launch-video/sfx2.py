# Sound design for film.html (23 s). Cold, tense bed while locked out; warm major bloom when the bill turns.
import numpy as np, wave
SR = 48000; D = 23.0; n = int(SR * D); t = np.arange(n) / SR
L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(5)

def add(sig, at, pan=0.0, g=1.0):
    i = int(at * SR); sig = sig[: max(0, n - i)]
    L[i:i+len(sig)] += sig * g * (1 - max(0, pan)); R[i:i+len(sig)] += sig * g * (1 + min(0, pan))
def lp(x, a):
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x): acc += a * (v - acc); y[i] = acc
    return y
def env(dur, a=.003, k=30.0):
    tt = np.arange(int(dur*SR))/SR; return np.minimum(1, tt/a) * np.exp(-tt*k), tt
def scratch(dur):  # ballpoint on paper: band-passed noise with grainy amplitude
    tt = np.arange(int(dur*SR))/SR; x = rng.standard_normal(len(tt))
    band = lp(x, .35) - lp(x, .06)
    grain = .55 + .45*np.abs(np.sin(2*np.pi*(22 + 9*np.sin(2*np.pi*3*tt))*tt))
    shape = np.minimum(1, tt/.02) * np.minimum(1, (dur-tt)/.05)
    return band * grain * shape * 2.2
def slap():  # a sheet landing on a pile
    e, tt = env(.18, .001, 28); x = lp(rng.standard_normal(len(tt)), .25)
    return x*e*1.4 + np.sin(2*np.pi*(95+40*np.exp(-tt*40))*tt)*np.exp(-tt*22)*.6
def thud(f=62, bright=.6):
    e, tt = env(.6, .002, 7.5); body = np.sin(2*np.pi*(f + 55*np.exp(-tt*28))*tt) * e
    e2, _ = env(.07, .0005, 70); body[:len(e2)] += lp(rng.standard_normal(len(e2)), .55) * e2 * bright
    return body
def slide(dur=.6):
    tt = np.arange(int(dur*SR))/SR; x = rng.standard_normal(len(tt))
    return (lp(x, .18) - lp(x, .03)) * np.sin(np.pi*tt/dur)**1.5 * 1.8
def pluck(f):
    e, tt = env(.9, .003, 5.5); return (np.sin(2*np.pi*f*tt) + .3*np.sin(4*np.pi*f*tt) + .1*np.sin(6*np.pi*f*tt)) * e
def tick():
    e, tt = env(.03, .0004, 240); return np.sin(2*np.pi*2300*tt)*e*.5
def pad(freqs, dur, att, rel, g):
    tt = np.arange(int(dur*SR))/SR
    e = np.minimum(1, tt/att) * np.clip((dur-tt)/rel, 0, 1)
    s = sum((np.sin(2*np.pi*f*tt + i) + .18*np.sin(2*np.pi*f*2.003*tt)) * (.7 + .3*np.sin(2*np.pi*.23*tt + i)) for i, f in enumerate(freqs))
    return s * e * g / len(freqs)

# Bed
add(pad([110.0, 164.81, 261.63, 246.94], 8.6, 1.5, 1.2, .55), 0)                 # A minor, a rubbing B: unresolved
add(pad([55.0], 8.4, 2.0, 1.0, .35), 0)                                           # sub pressure
add(pad([130.81, 196.0, 261.63, 329.63, 293.66], 7.0, .9, 1.4, .6), 8.0)         # C add9: the turn
add(pad([174.61, 220.0, 261.63, 349.23, 392.0], 4.6, .7, 1.2, .55), 14.6)        # F add9: back in
add(pad([130.81, 196.0, 261.63, 329.63, 392.0, 587.33], 4.4, .5, 2.2, .65), 18.7)  # resolve

# A: the form
for at in [.55, .83, 1.11, 1.39]: add(scratch(.22), at, .25, .5)
add(scratch(.45), 1.6, .2, .45); add(scratch(.5), 2.0, .1, .6)
add(thud(58, .9), 2.55, 0, 1.0)
# B: the pile grows
for at in [4.75, 5.25, 5.7, 6.1, 6.45, 6.75]: add(slap(), at + .24, .2, .8)
add(slide(.7), 7.25, -.2, .5)
# C: language plucks rise, pen loop, the number
for at, f in zip([9.75, 10.15, 10.55, 10.95], [523.25, 587.33, 659.25, 783.99]): add(pluck(f), at, .15, .22)
add(scratch(.45), 11.55, .2, .55); add(slide(.5), 11.95, .2, .25)
last = -1
for k in range(1, 400):
    x = k/400; v = int((1-(1-x)**3) * 24)
    if v != last: add(tick(), 13.1 + x*.9, 0, .4); last = v
add(thud(82, .5), 13.75, 0, .7)
# D: peel, write, tick, stamp
add(slide(.6), 15.35, -.1, .45)
add(scratch(.8), 15.85, .15, .5); add(scratch(.3), 16.7, .2, .55)
add(thud(82, .5), 17.05, 0, .75)
# E: underline
add(scratch(.55), 20.1, 0, .45)

mix = np.stack([L, R], 1) * np.minimum(1, (D - t) / 1.4)[:, None]
mix /= np.abs(mix).max() / .72
with wave.open('sfx2.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
print('ok')
