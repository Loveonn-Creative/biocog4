# Sound for q8.html (32 s): office corridor by the lift. HVAC + tube-light hum, dot stamp, marker squeaks,
# paper map unfolding, room stamps (8 rising, then 7), 15-tick sweep, zoom whoosh, metal sign clank,
# marker strike + handwriting, LIFT DING then a dry bonk (payoff), five stair footsteps, green-tick chord, calm end.
import numpy as np, wave
SR = 48000; D = 32.0; n = int(SR*D); t = np.arange(n)/SR
L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(8)
def add(sig, at, pan=0.0, g=1.0):
    i = int(at*SR); sig = sig[:max(0, n-i)]
    L[i:i+len(sig)] += sig*g*(1-max(0,pan)); R[i:i+len(sig)] += sig*g*(1+min(0,pan))
def env(d, a=.002, k=30.0):
    tt = np.arange(int(d*SR))/SR; return np.minimum(1, tt/a)*np.exp(-tt*k), tt
def lpf(x, a):
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x.tolist()): acc += a*(v-acc); y[i] = acc
    return y
def click(f=2600, g=1.0):
    e, tt = env(.05, .0004, 120); return (np.sin(2*np.pi*f*tt)*.5 + lpf(rng.standard_normal(len(tt)), .5)*.9)*e*g
def thud(f=60, k=7):
    e, tt = env(.8, .002, k); return np.sin(2*np.pi*(f + 50*np.exp(-tt*30))*tt)*e
def bell(f, d=1.6, k=3.5):
    e, tt = env(d, .003, k); return (np.sin(2*np.pi*f*tt) + .4*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt*6))*e
def ding(f, d=2.4):   # lift chime: soft attack, long ring, slight vibrato
    tt = np.arange(int(d*SR))/SR; e = np.minimum(1, tt/.006)*np.exp(-tt*1.6)
    ph = 2*np.pi*f*tt + .002*np.sin(2*np.pi*5*tt)*f
    return (np.sin(ph) + .25*np.sin(2*ph) + .12*np.sin(3.01*ph))*e
def pad(fs, d, att, rel, g):
    tt = np.arange(int(d*SR))/SR; e = np.minimum(1, tt/att)*np.clip((d-tt)/rel, 0, 1)
    return sum(np.sin(2*np.pi*f*tt+i)*(.7+.3*np.sin(2*np.pi*.2*tt+i)) for i, f in enumerate(fs))*e*g/len(fs)
def whoosh(d):
    tt = np.arange(int(d*SR))/SR; x = rng.standard_normal(len(tt)); return (lpf(x, .25) - lpf(x, .05))*np.sin(np.pi*tt/d)**2*2
def squeak(d, f0=2300, f1=2900):   # felt marker on laminated paper
    tt = np.arange(int(d*SR))/SR; f = f0 + (f1-f0)*tt/d + 120*np.sin(2*np.pi*7*tt)
    am = .55 + .45*np.abs(np.sin(2*np.pi*9*tt))
    x = rng.standard_normal(len(tt)); hiss = x - lpf(x, .3)
    return (np.sin(2*np.pi*np.cumsum(f)/SR)*.25 + hiss*.35)*am*np.minimum(1, tt/.02)*np.minimum(1, (d-tt)/.04)
def crinkle(d, dens=90):   # paper unfolding: random tiny crackles over a soft swish
    tt = np.arange(int(d*SR))/SR; out = whoosh(d)*.4
    for _ in range(int(d*dens)):
        i = rng.integers(0, len(tt)-2400); e, t2 = env(.03, .0003, 160)
        x = rng.standard_normal(len(t2)); out[i:i+len(t2)] += (x - lpf(x, .4))*e*rng.uniform(.2, .8)*np.sin(np.pi*i/len(tt))
    return out
def stamp(f=180):
    s = thud(f, 26)*.6; c = click(1200, .6); s[:len(c)] += c; return s
def step(f):
    e, tt = env(.25, .002, 22); x = lpf(rng.standard_normal(len(tt)), .2)
    return (np.sin(2*np.pi*f*tt)*.6 + x*1.2)*e
def clank():
    e, tt = env(.9, .001, 6); return sum(np.sin(2*np.pi*f*tt)*a for f, a in [(420, .5), (1130, .3), (1985, .2), (2870, .1)])*e

# room tone: HVAC + tube-light hum (50 Hz mains harmonics)
hv = lpf(rng.standard_normal(n), .02)*2.0
add(hv, 0, 0, .28); add((np.sin(2*np.pi*100*t)*.4 + np.sin(2*np.pi*200*t)*.15 + np.sin(2*np.pi*300*t)*.06), 0, .2, .025)
# hook: dot stamp (already landing at t=0) + marker circle
add(stamp(150), 0, 0, 1.0); add(squeak(.85, 2100, 2700), .05, .1, .45); add(click(3200), 1.35, .1, .3)
# scope 1 and 2: walls traced, badges pop
add(squeak(1.15, 1700, 2200), 3.5, -.1, .32)
for at, f in [(4.25, 523.25), (4.45, 523.25), (4.85, 659.25)]: add(bell(f, .7, 7), at, .1, .22); add(click(2400), at, .1, .3)
# unfold up, rooms 1-8 (rising), unfold down, rooms 9-15
add(crinkle(1.5), 8.1, -.2, .7)
scale = [392.0, 440.0, 493.88, 587.33, 659.25, 783.99, 880.0, 987.77]
for i in range(8): add(stamp(170 + i*6), 9.95 + i*.33, -.15 + i*.04, .45); add(bell(scale[i], .35, 10), 9.97 + i*.33, 0, .12)
add(crinkle(1.5), 13.65, .2, .7)
for i in range(7): add(stamp(150 + i*6), 15.15 + i*.33, .15 - i*.04, .45); add(bell(scale[i]*.75, .35, 10), 15.17 + i*.33, 0, .12)
# 15-tick sweep, zoom-out whoosh, low pad
for i in range(15): add(click(2000 + i*90, .7), 17.3 + i*.095, -.5 + i/14, .35)
add(whoosh(1.6), 18.8, 0, .35); add(pad([98.0, 146.83, 196.0], 3.4, .5, 1.2, .25), 17.6)
# payoff: sign clank, strike, handwriting, LIFT DING, then a dry bonk
add(whoosh(.5), 20.7, 0, .3); add(clank(), 20.95, 0, .35); add(thud(90, 14), 20.95, 0, .4)
add(squeak(.35, 1500, 1900), 21.75, .2, .5); add(squeak(.7, 2400, 3000), 22.15, .25, .4)
add(ding(1318.5), 23.2, 0, .45); add(ding(1046.5), 23.5, 0, .35)
add(thud(70, 9), 24.05, 0, .55); add(click(600, .7), 24.05, 0, .3)
# take the stairs: five footsteps, pitch rising
for j in range(5): add(step(110 + j*14), 25.8 + j*.3, -.2 + j*.08, .55)
# first room done: the only green, a soft resolved chord
for k, f in enumerate([523.25, 659.25, 783.99]): add(bell(f, 2.2, 2.2), 27.55 + k*.08, 0, .32)
add(pad([130.81, 196.0, 261.63, 329.63], 4.4, .6, 2.0, .45), 27.5)
# end card
add(bell(783.99, 2.5, 1.8), 28.65, 0, .22); add(bell(1174.66, 2.5, 1.8), 28.8, 0, .16)
add(crinkle(1.1, 60), 28.55, 0, .45); add(squeak(.6, 1800, 2300), 30.0, .1, .25)
add(whoosh(1.2), 30.85, 0, .25)
mix = np.stack([L, R], 1)
mix *= np.minimum(1, t/.01)[:, None] * np.minimum(1, (D - t)/.05)[:, None]
mix /= np.abs(mix).max()/.8
with wave.open('q8-sfx.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
print('ok')
