# Sound for revert.html: inbox pings pile into noise, hard cut to silence, one clean tone per green light building a chord.
# python3 rv-sfx.py rv-cues-long.json rv-long.wav
import numpy as np, wave, json, sys
cues = json.load(open(sys.argv[1])); D = cues['dur']; C = cues['cues']
SR = 48000; n = int(SR * D); t = np.arange(n) / SR
L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(7)
def add(sig, at, pan=0.0, g=1.0):
    i = int(at * SR)
    if i >= n: return
    sig = sig[: n - i]; L[i:i+len(sig)] += sig * g * (1 - max(0, pan)); R[i:i+len(sig)] += sig * g * (1 + min(0, pan))
def ma(x, k): return np.convolve(x, np.ones(k) / k, 'same')
def bp(x, lo, hi): return ma(x, lo) - ma(x, hi)
def env(d, a=.002, k=30.0):
    tt = np.arange(int(d * SR)) / SR; return np.minimum(1, tt / a) * np.exp(-tt * k), tt
def ping(f=1318.5, g=1.0):  # inbox notification: two quick bright notes
    out = np.zeros(int(.5 * SR))
    for j, (ff, at) in enumerate([(f, 0), (f * 1.5, .085)]):
        e, tt = env(.38, .001, 14); s = (np.sin(2*np.pi*ff*tt) + .3*np.sin(2*np.pi*ff*2.01*tt)) * e; i = int(at * SR); out[i:i+len(s)] += s[:len(out)-i]
    return out * g
def thud(f=70, bright=.6, d=.5):
    e, tt = env(d, .002, 9); body = np.sin(2*np.pi*(f + 60*np.exp(-tt*30))*tt) * e
    e2, _ = env(.06, .0005, 80); body[:len(e2)] += bp(rng.standard_normal(len(e2)), 3, 30) * e2 * bright * 3
    return body
def click():
    e, tt = env(.03, .0004, 220); x = rng.standard_normal(len(tt)); return (x - ma(x, 6)) * e * .5
def err():
    e, tt = env(.16, .002, 18); return np.sign(np.sin(2*np.pi*196*tt)) * e * .25 + np.sin(2*np.pi*207*tt) * e * .3
def whoosh(d=.6, up=True):
    tt = np.arange(int(d * SR)) / SR; x = rng.standard_normal(len(tt)); y = bp(x, 20, 300)
    return y * np.sin(np.pi * tt / d) ** 2 * 3
def slap():
    e, tt = env(.22, .001, 22); x = bp(rng.standard_normal(len(tt)), 4, 60)
    return x * e * 3 + np.sin(2*np.pi*(90+50*np.exp(-tt*40))*tt) * np.exp(-tt*20) * .7
def scratch(d):
    tt = np.arange(int(d * SR)) / SR; x = bp(rng.standard_normal(len(tt)), 3, 18)
    grain = .55 + .45 * np.abs(np.sin(2*np.pi*(22 + 9*np.sin(2*np.pi*3*tt))*tt))
    return x * grain * np.minimum(1, tt/.02) * np.minimum(1, (d-tt)/.05) * 1.6
def tick():
    e, tt = env(.03, .0004, 240); return np.sin(2*np.pi*2300*tt) * e * .4
def bell(f, d=6.0, g=1.0):
    tt = np.arange(int(d * SR)) / SR; e = np.minimum(1, tt / .012) * np.exp(-tt * .75)
    return (np.sin(2*np.pi*f*tt) + .22*np.sin(2*np.pi*f*2*tt)*np.exp(-tt*2) + .08*np.sin(2*np.pi*f*3.01*tt)*np.exp(-tt*4)) * e * g
def pad(fs, d, att, rel, g):
    tt = np.arange(int(d * SR)) / SR; e = np.minimum(1, tt / att) * np.clip((d - tt) / rel, 0, 1)
    return sum((np.sin(2*np.pi*f*tt + i) + .15*np.sin(2*np.pi*f*2.003*tt)) * (.75 + .25*np.sin(2*np.pi*.2*tt + i)) for i, f in enumerate(fs)) * e * g / len(fs)

get = lambda k: [c for c in C if c[1] == k]
T = lambda k: get(k)[0][0]
cut, final = T('cut'), T('final')
feats = get('ping'); f0 = feats[0][0]
CHORD = [261.63, 392.0, 329.63, 493.88, 587.33, 783.99]
for c in C:
    at, k = c[0], c[1]
    if k == 'send': add(whoosh(1.2), at, -.2, .35)
    elif k == 'return': add(whoosh(1.4)[::-1], at, .2, .4)
    elif k == 'ping': add(ping(1318.5 * (1 + .03 * (c[2] % 3))), at, (-.3, .3)[c[2] % 2], .32)
    elif k == 'thud': add(thud(66, .5, .5), at, 0, .55)
    elif k == 'key': add(click(), at, .2, .5)
    elif k == 'err': add(err(), at, -.1, .45)
    elif k == 'whoosh': add(whoosh(.6), at - .1, .1, .35)
    elif k == 'scratch': add(scratch(.5), at, .15, .45)
    elif k == 'shatter':
        add(thud(55, 1.0, .7), at, 0, .8)
        for j in range(14): add(click(), at + rng.uniform(0, .9), rng.uniform(-.6, .6), .9)
    elif k in ('hit', 'cellhit'):
        x = c[2]
        add(ping(1318.5 * 2 ** (rng.integers(-5, 6) / 12), 1.0), at - .05, rng.uniform(-.7, .7), .16 + .1 * x)
        add(thud(80 + rng.uniform(-10, 20), .7, .3), at, rng.uniform(-.3, .3), .35 + .2 * x)
        if k == 'cellhit': add(err(), at, rng.uniform(-.5, .5), .3)
    elif k == 'final':
        add(thud(48, 1.2, 1.2), at, 0, 1.3)
        for j in range(10): add(ping(1318.5 * 2 ** (rng.integers(-12, 8) / 12)), at + rng.uniform(-.05, .15), rng.uniform(-.8, .8), .18)
    elif k == 'slap': add(slap(), at, 0, .7)
    elif k == 'count':
        for j in range(18): add(tick(), at + (1 - (1 - j/18) ** 2.5) * .9, 0, .5)
    elif k == 'fold': add(whoosh(.9), at, -.1, .35); add(scratch(.25), at + .2, .2, .25)
    elif k == 'unfold': add(whoosh(.8)[::-1], at, .1, .3)
    elif k == 'dark': add(pad([55.0, 82.41], 3.5, 1.4, 1.6, .5), at)
    elif k == 'light': add(bell(CHORD[c[2] % 6], 7.0), at, (-.35, .35, 0, -.2, .2, .1)[c[2] % 6], .32)
    elif k == 'spark': add(bell(CHORD[int(rng.integers(0, 6))] * 2, 2.2), at, rng.uniform(-.7, .7), .06)

# corporate bed: a nagging drone and a drumroll of noise that swells to the punchline
seg = (t < cut) * np.minimum(1, t / .8)
ramp = np.clip((t - f0) / (final - f0), 0, 1) ** 2.2
drone = (np.sin(2*np.pi*110*t) + np.sin(2*np.pi*116.5*t) + .5*np.sin(2*np.pi*233*t)) * (.05 + .15 * ramp)
roll = bp(rng.standard_normal(n), 2, 25) * (.02 + .5 * ramp ** 1.5) * (.6 + .4 * np.abs(np.sin(2*np.pi*(6 + 20*ramp)*t)))
L += (drone + roll) * seg; R += (drone + roll * .9) * seg
# hard cut: true silence for a beat, then the faintest room tone
L[(t >= cut)] *= np.where(t[(t >= cut)] < T('slap') - .6, 0, 1); R[(t >= cut)] *= np.where(t[(t >= cut)] < T('slap') - .6, 0, 1)
room = bp(rng.standard_normal(n), 30, 400) * .012 * np.clip((t - cut - .8) / 1.5, 0, 1) * (t < T('dark'))
L += room; R += room
# night: the chord sustains under the lights; full resolve at the CTA
lights = get('light')
for j, c in enumerate(lights):
    add(pad([CHORD[j % 6] / 2], max(1, D - c[0]), 2.5, 2.5, .10), c[0] + .1)
cta = T('cta')
add(pad([130.81, 196.0, 261.63, 329.63, 392.0, 493.88, 587.33], D - cta + .2, 1.5, 2.5, .35), cta - .4)
mix = np.stack([L, R], 1)
mix *= np.minimum(1, (D - t) / 1.6)[:, None]
mix /= np.abs(mix).max() / .8
mix = np.tanh(mix * 2.4) / np.tanh(2.4) * .88
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok', sys.argv[2])
