# Sound for r1.html (Bill Bolta Hai #01, 25 s): slap, ink plips, a little bill voice, pen, count-up, the
# series 3-note sting on the reveal, a wink ting, calm end, crumple back into the slap (loops).
import numpy as np, wave
SR = 48000; D = 25.0; n = int(SR*D); T = np.arange(n)/SR
L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(7)
def add(sig, at, pan=0.0, g=1.0):
    i = int(at*SR)
    if i >= n: return
    sig = sig[:n-i]; L[i:i+len(sig)] += sig*g*(1-max(0, pan)); R[i:i+len(sig)] += sig*g*(1+min(0, pan))
def tt(d): return np.arange(int(d*SR))/SR
def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1/SR); X[(f < lo) | (f > hi)] = 0; return np.fft.irfft(X, len(x))
def env(d, a=.002, k=30.0):
    x = tt(d); return np.minimum(1, x/a)*np.exp(-x*k), x
def thud(f=62, g=1):
    e, x = env(.6, .002, 7); return np.sin(2*np.pi*(f*x + 60*(1-np.exp(-x*30))/30))*e*g
def slapnoise(d=.12):
    e, x = env(d, .0005, 45); return band(rng.standard_normal(len(x)), 900, 9000)*e*1.6
def crackle(d, dens=180, g=1):
    x = tt(d); out = np.zeros_like(x)
    for at in np.sort(rng.uniform(0, d, int(d*dens))):
        e, y = env(.012, .0003, 500); s = rng.standard_normal(len(y))*e*rng.uniform(.3, 1); i = int(at*SR); s = s[:len(out)-i]; out[i:i+len(s)] += s
    return band(out, 1500, 12000)*g*np.minimum(1, (d-x)/.05+.001)
def whoosh(d, up=True):
    x = tt(d); w = rng.standard_normal(len(x)); a = band(w, 300, 1500); b = band(w, 1500, 6000)
    k = x/d if up else 1-x/d
    return (a*(1-k) + b*k)*np.sin(np.pi*x/d)**2*1.4
def plip(f0=700, f1=1500):
    e, x = env(.09, .001, 40); return np.sin(2*np.pi*(f0*x + (f1-f0)*x*x/(2*.09)))*e
def click(f=3000, g=1):
    e, x = env(.03, .0003, 200); return (np.sin(2*np.pi*f*x)*.5 + band(rng.standard_normal(len(x)), 2000, 9000)*.6)*e*g
def blip(f):
    e, x = env(.085, .004, 22); vib = 1 + .02*np.sin(2*np.pi*28*x)
    ph = 2*np.pi*np.cumsum(f*vib*(1 + .25*np.exp(-x*40)))/SR
    return (np.sin(ph) + .35*np.sin(2*ph) + .15*np.sin(3*ph))*e
def scratch(d):
    x = tt(d); b = band(rng.standard_normal(len(x)), 1800, 7000)
    return b*(.5+.5*np.abs(np.sin(2*np.pi*19*x)))*np.minimum(1, x/.02)*np.minimum(1, (d-x)/.04)*1.3
def bell(f, d=1.4, k=3.2):
    e, x = env(d, .002, k)
    return (np.sin(2*np.pi*f*x) + .35*np.sin(2*np.pi*f*2.0*x)*np.exp(-x*5) + .18*np.sin(2*np.pi*f*3.01*x)*np.exp(-x*9))*e
def marimba(f, g=1):
    e, x = env(.5, .001, 9); return (np.sin(2*np.pi*f*x) + .25*np.sin(2*np.pi*f*4*x)*np.exp(-x*30))*e*g
def pad(fs, d, att, rel, g):
    x = tt(d); e = np.minimum(1, x/att)*np.clip((d-x)/rel, 0, 1)
    return sum(np.sin(2*np.pi*f*x + i)*(.75+.25*np.sin(2*np.pi*.25*x+i)) for i, f in enumerate(fs))*e*g/len(fs)
def slide(f0, f1, d):
    x = tt(d); f = f0*(f1/f0)**(x/d); ph = 2*np.pi*np.cumsum(f)/SR; return np.sin(ph)*np.sin(np.pi*x/d)**.6

# room tone
add(band(rng.standard_normal(n), 60, 500)*.5, 0, 0, .12)
# 1 · the slap (frame 1 is mid-slap; impact at 0.08 s)
add(thud(60), .07, 0, 1.0); add(slapnoise(), .075, .1, .9); add(crackle(.35, 160, .5), .09, .1)
add(whoosh(.5, False), .55, .4, .35)
# 2 · eyes, mouth, voice
add(plip(650, 1300), 2.1, -.2, .45); add(plip(800, 1600), 2.28, .2, .45)
for b in [2.95, 5.2, 9.0, 13.2, 15.9, 21.4, 23.0]: add(click(4200, .25), b + .06, 0, .5)
add(scratch(.35), 2.6, 0, .25)
SCALE = [392.0, 440.0, 493.9, 587.3, 659.3]
for a, b in [(3.1, 5.3), (5.8, 8.0), (17.85, 19.6)]:
    k = 0
    while True:
        at = a + (np.pi/2 + k*np.pi)/13.5
        if at > b - .1: break
        add(blip(SCALE[int(rng.integers(0, 5))]*(1.0 if a < 17 else 1.12)), at - .03, (rng.random()-.5)*.3, .16); k += 1
# the owner's "?!"
add(slide(380, 1250, .32), 6.85, -.5, .22); add(bell(1567.98, .5, 7), 7.2, -.5, .2)
# 3 · the maths writes itself
add(scratch(.5), 8.6, .2, .45); add(scratch(.55), 8.95, -.3, .35)
for i in range(18): add(click(2600 + (i % 3)*300, .5), 9.35 + i/22, 0, .35)
last = -1
for x in np.arange(10.35, 11.6, 1/240):
    k = 1 - (1 - min(1, (x-10.35)/1.25))**3; step = int(k*24)
    if step != last: add(click(1800 + step*60, .5), x, 0, .4); last = step
# series sting: 3 notes on the reveal
for i, f in enumerate([659.25, 783.99, 1046.5]): add(bell(f, 1.6, 2.6), 11.6 + i*.12, (i-1)*.25, .42)
add(thud(90, .6), 11.78, 0, .5); add(scratch(.45), 11.95, .2, .3)
# 4 · the turn, the wink
add(marimba(196.0, 1), 14.8, -.2, .3); add(marimba(233.1, 1), 15.1, .2, .3)
add(bell(2093.0, 1.0, 4), 17.58, .3, .35); add(bell(2637.0, .6, 6), 17.66, .35, .2)
# music bed: a light plucked ostinato from the eyes to the end card
pat = [0, 2, 4, 2, 3, 2, 4, 1]
bpm = 104; step = 60/bpm/2
x = 2.3; i = 0
while x < 20.2:
    if 14.7 <= x < 17.5: f = [174.6, 207.7, 233.1, 261.6, 311.1][pat[i % 8]]
    else: f = [196.0, 220.0, 246.9, 293.7, 329.6][pat[i % 8]]
    add(marimba(f, 1), x, (-.3 if i % 2 else .3), .13 if i % 4 else .17)
    if i % 4 == 0: add(thud(48, .5), x, 0, .18)
    x += step; i += 1
# 5 · calm end
add(whoosh(.6, True), 19.95, 0, .3)
add(pad([130.81, 196.0, 261.63, 329.63, 392.0], 3.4, .5, 1.2, .55), 20.4)
add(bell(783.99, 2.2, 1.8), 20.6, 0, .25); add(bell(1174.66, 2.0, 2.0), 20.75, 0, .15)
add(plip(500, 1000), 21.8, .2, .35)
# loop: the hand comes back, crumples, slams into frame 1
add(whoosh(.45, True), 23.65, .4, .35)
add(crackle(.75, 260, 1.0), 23.9, 0, .7)
add(whoosh(.5, True), 24.5, 0, .5)
mix = np.stack([L, R], 1)
mix[-int(.02*SR):] *= np.linspace(1, 0, int(.02*SR))[:, None]
mix /= np.abs(mix).max()/.8
with wave.open('r1-sfx.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
print('ok')
