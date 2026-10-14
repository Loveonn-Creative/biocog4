# Sound for label.html (37.5 s): warm and precise. Packet crinkles, a soft label flip,
# pen ticks, one beat of real silence at the blank rival, a clean chime at the end.
import numpy as np, wave
SR = 48000; D = 37.5; n = int(SR * D); t = np.arange(n) / SR
L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(17)

def add(sig, at, pan=0.0, g=1.0):
    i = int(at * SR); sig = sig[: max(0, n - i)]
    L[i:i+len(sig)] += sig * g * (1 - max(0, pan)); R[i:i+len(sig)] += sig * g * (1 + min(0, pan))
def onepole(x, a):
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x): acc += a * (v - acc); y[i] = acc
    return y
def hp(x, a): return x - onepole(x, a)
def env(dur, a=.003, k=30.0):
    tt = np.arange(int(dur*SR))/SR; return np.minimum(1, tt/a) * np.exp(-tt*k), tt

def crinkle(dur, density=260, bright=.5, g=1.0):
    """Packet foil: many tiny crackles, denser in the middle of the gesture."""
    m = int(dur*SR); out = np.zeros(m); tt = np.arange(m)/SR
    shape = np.sin(np.pi*np.clip(tt/dur, 0, 1))**1.2
    k = int(density*dur)
    for _ in range(k):
        at = rng.uniform(0, dur)
        if rng.random() > np.sin(np.pi*at/dur)**.8: continue
        L0 = int(rng.uniform(.002, .012)*SR); x = rng.standard_normal(L0)
        e = np.exp(-np.arange(L0)/SR*rng.uniform(250, 700))
        burst = hp(x, bright) * e * rng.uniform(.2, 1.0)
        j = int(at*SR); out[j:j+L0] += burst[:m-j]
    bed = hp(rng.standard_normal(m), .5)*.06*shape
    return (out + bed)*g
def swish(dur=.6, lo=.03, hi=.2, g=1.0):
    tt = np.arange(int(dur*SR))/SR; x = rng.standard_normal(len(tt))
    return (onepole(x, hi) - onepole(x, lo)) * np.sin(np.pi*tt/dur)**2 * 2.0 * g
def thump(f=70, g=1.0, bright=.4):
    e, tt = env(.45, .002, 11); body = np.sin(2*np.pi*(f + 40*np.exp(-tt*30))*tt) * e
    e2, _ = env(.05, .0005, 90); body[:len(e2)] += onepole(rng.standard_normal(len(e2)), .5) * e2 * bright
    return body * g
def pen(dur=.4):
    tt = np.arange(int(dur*SR))/SR; x = rng.standard_normal(len(tt))
    band = onepole(x, .35) - onepole(x, .07)
    grain = .55 + .45*np.abs(np.sin(2*np.pi*(20 + 8*np.sin(2*np.pi*3*tt))*tt))
    return band * grain * np.minimum(1, tt/.02) * np.minimum(1, (dur-tt)/.05) * 2.0
def tick():
    e, tt = env(.03, .0004, 220); return np.sin(2*np.pi*2100*tt)*e*.5
def pluck(f, dur=.9, k=5.5):
    e, tt = env(dur, .003, k); return (np.sin(2*np.pi*f*tt) + .28*np.sin(4*np.pi*f*tt) + .08*np.sin(6*np.pi*f*tt)) * e
def bell(f, dur=3.2):
    e, tt = env(dur, .002, 1.6)
    parts = [(1, 1), (2.0, .35), (3.01, .18), (4.2, .08)]
    return sum(a*np.sin(2*np.pi*f*r*tt)*np.exp(-tt*(1.2+r*.9)) for r, a in parts) * np.minimum(1, tt/.002)
def pad(freqs, dur, att, rel, g):
    tt = np.arange(int(dur*SR))/SR
    e = np.minimum(1, tt/att) * np.clip((dur-tt)/rel, 0, 1)
    s = sum((np.sin(2*np.pi*f*tt + i) + .15*np.sin(2*np.pi*f*2.003*tt)) * (.75 + .25*np.sin(2*np.pi*.21*tt + i)) for i, f in enumerate(freqs))
    return s * e * g / len(freqs)

# ---- bed: cool aisle → warm label → thin cold rival → (silence) → warm resolve
add(pad([146.83, 220.0, 293.66, 329.63], 10.2, 2.0, 1.6, .42), 0)               # D sus, cool, open
add(pad([130.81, 196.0, 261.63, 329.63, 392.0], 15.6, 1.4, 1.2, .5), 9.4)        # C major add, the label
add(pad([233.08, 349.23, 466.16], 2.0, .5, .3, .22), 25.0)                       # thin, glassy: the rival
add(pad([130.81, 196.0, 261.63, 329.63, 392.0, 587.33], 6.0, .6, 2.4, .55), 31.5)  # resolve

# ---- the biscuits
add(thump(90, .35, .6), .3, .1)
add(crinkle(.9, 300, .55, .55), 1.75, .15)
add(crinkle(.6, 260, .55, .4), 3.75, .15)
add(swish(1.3, .02, .1, .5), 4.4, -.2)                                           # the shelf slides
add(pluck(220.0, 1.2, 3.5), 5.55, 0, .18); add(pluck(207.65, 1.2, 3.5), 5.75, 0, .14)  # "don't."

# ---- the hand, the lift, the turn
add(swish(.6, .03, .15, .35), 7.8, .1)
add(crinkle(.7, 220, .5, .55), 8.5, .1)
add(crinkle(1.2, 360, .6, .8), 9.7, 0)
add(swish(.8, .04, .25, .45), 9.7, -.1)
add(thump(120, .45, .9), 9.98, 0)                                                # the soft label "flip"
add(thump(150, .18, .6), 10.32, 0)

# ---- reading: pen brackets, the bands narrowing
for at in [11.5, 14.4, 17.6]: add(pen(.45), at, .2, .4)
for i, f in enumerate([523.25, 659.25, 783.99]): add(pluck(f, .8, 6), 18.0 + i*.5, .1, .16)
add(swish(1.0, .02, .12, .35), 20.3, 0)

# ---- contains no: three ticks, a beat longer before the last
for at, f in zip([21.15, 21.85, 22.85], [587.33, 659.25, 783.99]):
    add(tick(), at, 0, .7); add(pen(.28), at + .18, .2, .45); add(pluck(f, .7, 6), at + .05, 0, .12)
# the ghost copy: slides out, hesitates, gets yanked back, snaps into one
add(swish(.4, .05, .3, .5), 23.15, .3)
add(swish(.22, .08, .45, .55), 23.88, -.2)
add(thump(180, .5, 1.0), 24.08, 0); add(tick(), 24.09, 0, .8)

# ---- the rival: glossy, quick, then nothing at all
add(swish(.8, .04, .2, .4), 24.85, -.3)
add(crinkle(.8, 420, .75, .45), 25.3, .2)
add(crinkle(.5, 500, .8, .5), 26.35, 0)

# ---- after the silence
add(swish(1.3, .015, .08, .35), 28.85, 0)
add(pen(.55), 30.0, 0, .55)
add(pluck(392.0, .7, 6), 30.55, 0, .14); add(pluck(311.13, .9, 5), 30.8, 0, .14)  # "that's it?"

# ---- the close
add(swish(1.0, .03, .18, .45), 31.6, -.2)
add(pen(.6), 33.0, 0, .45)
add(crinkle(1.0, 300, .55, .5), 33.2, -.1)
for i, f in enumerate([1046.5, 1567.98]): add(bell(f), 34.0 + i*.12, 0, .22 - i*.08)

mix = np.stack([L, R], 1)
# the silence: everything out, hard but click-free, while the blank back just sits there
gate = np.ones(n)
a, b = int(26.95*SR), int(28.8*SR); f = int(.08*SR)
gate[a:b] = 0; gate[a-f:a] = np.linspace(1, 0, f); gate[b:b+f] = np.linspace(0, 1, f)
mix *= gate[:, None]
mix *= (np.minimum(1, t/.6) * np.minimum(1, (D - t)/1.6))[:, None]
mix /= np.abs(mix).max() / .72
with wave.open('lbsfx.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
print('ok')
