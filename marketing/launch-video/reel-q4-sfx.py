# Sound for r5.html (26.5 s): a theatre spotlight, paper cut-outs, a muffled club behind a door,
# a velvet rope, a sneaky photocopy, a rubber stamp, the count-up and the series sting.
import numpy as np, wave
SR = 48000; D = 28.0; n = int(SR*D); t = np.arange(n)/SR
L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(44)
def add(sig, at, pan=0.0, g=1.0):
    i = int(at*SR); sig = sig[:max(0, n-i)]
    L[i:i+len(sig)] += sig*g*(1-max(0,pan)); R[i:i+len(sig)] += sig*g*(1+min(0,pan))
def env(d, a=.002, k=30.0):
    tt = np.arange(int(d*SR))/SR; return np.minimum(1, tt/a)*np.exp(-tt*k), tt
def lp(x, a):
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x): acc += a*(v-acc); y[i] = acc
    return y
def click(f=2600, g=1.0):
    e, tt = env(.05, .0004, 120); return (np.sin(2*np.pi*f*tt)*.5 + lp(rng.standard_normal(len(tt)), .5)*.9)*e*g
def thud(f=55, k=5):
    e, tt = env(.9, .002, k); return np.sin(2*np.pi*(f + 40*np.exp(-tt*25))*tt)*e
def bell(f, d=1.6, k=3.5):
    e, tt = env(d, .003, k); return (np.sin(2*np.pi*f*tt) + .4*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt*6) + .2*np.sin(2*np.pi*f*5.4*tt)*np.exp(-tt*9))*e
def tick():
    e, tt = env(.04, .0004, 160); return np.sin(2*np.pi*1500*tt)*e
def blip(f0, f1, d=.12):
    tt = np.arange(int(d*SR))/SR; f = f0 + (f1-f0)*tt/d; ph = 2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*np.sin(np.pi*tt/d)
def flutter(d=.25):
    tt = np.arange(int(d*SR))/SR; x = rng.standard_normal(len(tt)); b = lp(x, .5) - lp(x, .1)
    return b*(.4+.6*np.abs(np.sin(2*np.pi*38*tt)))*np.sin(np.pi*tt/d)*2
def whoosh(d, up=True):
    tt = np.arange(int(d*SR))/SR; x = rng.standard_normal(len(tt)); out = np.zeros_like(tt)
    for b0 in range(0, len(tt), 480):
        k = b0/len(tt); a = .02 + .3*(k if up else 1-k); seg = x[b0:b0+480]; out[b0:b0+480] = lp(seg, a) - lp(seg, a*.3)
    return out*np.sin(np.pi*tt/d)**2*2
def pluck(f, d=.35):
    e, tt = env(d, .002, 12); return (np.sin(2*np.pi*f*tt) + .3*np.sin(4*np.pi*f*tt))*e
def tuba(f, d=.45):
    tt = np.arange(int(d*SR))/SR; e = np.minimum(1, tt/.03)*np.clip((d-tt)/.15, 0, 1)
    ph = 2*np.pi*f*tt*(1 - .04*tt/d); s = np.sign(np.sin(ph))*.3 + np.sin(ph)
    return lp(s*e, .08)*2.5
def pad(fs, d, att, rel, g):
    tt = np.arange(int(d*SR))/SR; e = np.minimum(1, tt/att)*np.clip((d-tt)/rel, 0, 1)
    return sum(np.sin(2*np.pi*f*tt+i)*(.7+.3*np.sin(2*np.pi*.2*tt+i)) for i, f in enumerate(fs))*e*g/len(fs)
def slide(f0, f1, d):
    tt = np.arange(int(d*SR))/SR; f = f0*(f1/f0)**(tt/d); ph = 2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*np.minimum(1, tt/.02)*np.clip((d-tt)/.05, 0, 1)

# ---- q4: one tonne cube in a night lane ----
def oc(k): return 1-(1-k)**3
def cl(x): return min(1,max(0,x))
# night bed: room tone, 50 Hz grid hum from the wires, crickets, kettle simmer
add(lp(rng.standard_normal(n), .02)*3, 0, 0, .16)
hum = (np.sin(2*np.pi*50*t)*.5 + np.sin(2*np.pi*100*t)*.35 + np.sin(2*np.pi*150*t)*.12)*(1+.2*np.sin(2*np.pi*.3*t))
L += hum*.025; R += hum*.025
for k in range(40):
    at = .3 + k*.68 + rng.random()*.2; tt = np.arange(int(.09*SR))/SR
    add(np.sin(2*np.pi*4300*tt)*(np.sin(2*np.pi*60*tt)>0)*np.sin(np.pi*tt/.09), at, .6 if k%2 else -.6, .025)
sim = lp(rng.standard_normal(n), .25) - lp(rng.standard_normal(n), .05)
bub = np.zeros(n)
for k in range(90):
    at = rng.random()*27.5; b = blip(300+rng.random()*500, 700+rng.random()*600, .03); i = int(at*SR); bub[i:i+len(b)] += b
near = 1 - np.clip((t-8.0)/4.0, 0, 1) + np.clip((t-23.6)/1.6, 0, 1)
L += (sim*.035 + bub*.05)*near*.7; R += (sim*.035 + bub*.05)*near
# ink scratch for each edge as it is drawn (matches cubeState)
def scratch(d):
    tt = np.arange(int(d*SR))/SR; x = rng.standard_normal(len(tt)); b = lp(x, .6) - lp(x, .25)
    return b*(.5+.5*np.abs(np.sin(2*np.pi*23*tt)))*np.sin(np.pi*tt/d)*1.6
ts = np.arange(0, 2.8, 1/300); dd = .22 + .78*np.array([oc(x/2.8) for x in ts])
for e in range(2, 12):
    s0 = ts[np.argmax(dd*12 >= e)] if (dd*12 >= e).any() else None
    s1 = ts[np.argmax(dd*12 >= e+1)] if (dd*12 >= e+1).any() else 2.8
    if s0 is None: continue
    add(scratch(max(.06, s1-s0)), s0, .3*np.sin(e), .35)
add(bell(1567.98, .9, 5), 2.8, .2, .1)
# caption breaths
for at in [3.1, 5.8, 7.75]: add(whoosh(.35, True), at-.05, 0, .12)
# growth 7.8 -> 12.6: rising glass tone + ink stretch, counter ticks
add(slide(98, 392, 4.8)*np.linspace(.3, 1, int(4.8*SR)), 7.8, 0, .16)
add(slide(147, 588, 4.8)*np.linspace(.2, 1, int(4.8*SR)), 7.8, 0, .08)
add(whoosh(4.8, True), 7.8, 0, .25)
for k in range(19): add(tick(), 8.3 + k*.23, 0, .14 + k*.006)
# label snap + series sting
add(thud(52, 5), 12.7, 0, .9); add(click(1800, 1.0), 12.7, 0, .6)
for f, at in [(523.25, 12.75), (659.25, 12.87), (783.99, 12.99)]: add(bell(f, 2.0, 2.2), at, 0, .34)
add(pad([130.81, 196.0, 261.63, 329.63], 3.6, .3, 1.4, .45), 12.75)
# storey ruler knocks
for i, at in enumerate([16.6, 16.95, 17.3]): add(pluck([220, 277.18, 329.63][i], .4), at, -.3, .45); add(click(900, .6), at, -.3, .3)
# payoff: low swell, then the paper tag
add(pad([110.0, 164.81, 220.0], 4.0, .8, 1.5, .4), 19.6)
add(flutter(.3), 21.0, .4, .45); add(bell(987.77, 1.4, 3.5), 21.25, .4, .16)
# fold back to a point over the chai stall
add(whoosh(1.6, False), 23.6, 0, .3)
add(slide(588, 147, 1.5)*np.linspace(1, .2, int(1.5*SR)), 23.65, 0, .1)
add(bell(2093.0, 1.2, 4), 25.3, .2, .22)
# sign-off
add(pad([130.81, 196.0, 261.63, 392.0], 2.8, .4, 1.2, .3), 25.2)
for f, at in [(523.25, 25.2), (659.25, 25.32), (783.99, 25.44)]: add(bell(f, 2.0, 2.4), at, 0, .2)
fade = np.clip((D - t)/.35, 0, 1); L *= fade; R *= fade
mix = np.stack([L,R],1); mix /= np.abs(mix).max()/.8
with wave.open('q4-sfx.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
print('ok')
