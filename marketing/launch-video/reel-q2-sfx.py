# Sound for q2.html (25 s): tear-off calendar. Paper rips accelerating into a flurry, two desk slams,
# a marker circling the date, a 3-note sting, calm sign-off, one last page fluttering into the loop.
import numpy as np, wave
SR = 48000; D = 25.0; n = int(SR*D); t = np.arange(n)/SR
L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(42)
def add(sig, at, pan=0.0, g=1.0):
    i = int(at*SR); sig = sig[:max(0, n-i)]
    L[i:i+len(sig)] += sig*g*(1-max(0,pan)); R[i:i+len(sig)] += sig*g*(1+min(0,pan))
def lp(x, a):
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x): acc += a*(v-acc); y[i] = acc
    return y
def env(d, a=.002, k=30.0):
    tt = np.arange(int(d*SR))/SR; return np.minimum(1, tt/a)*np.exp(-tt*k), tt
NB = rng.standard_normal(SR*2); HP = NB - lp(NB, .25); BP = lp(NB, .5) - lp(NB, .08)
def rip(d=.12, bright=1.0):
    m = int(d*SR); o = rng.integers(0, len(HP)-m); x = HP[o:o+m]*bright + BP[o:o+m]*(1-bright*.5)
    tt = np.arange(m)/SR; crackle = (rng.random(m) < .02)*rng.standard_normal(m)*3
    e = np.minimum(1, tt/.004)*np.clip(1-tt/d, 0, 1)**1.5*(.6+.4*np.abs(np.sin(2*np.pi*(60+rng.random()*80)*tt)))
    return (x + crackle)*e
def thud(f=52):
    e, tt = env(1.0, .002, 4.5); return np.sin(2*np.pi*(f + 50*np.exp(-tt*28))*tt)*e
def knock():
    e, tt = env(.12, .001, 45); return (np.sin(2*np.pi*190*tt) + .6*np.sin(2*np.pi*410*tt))*e + lp(rng.standard_normal(len(tt)), .3)*e*.8
def bell(f, d=1.6, k=3.0):
    e, tt = env(d, .003, k); return (np.sin(2*np.pi*f*tt) + .35*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt*6) + .15*np.sin(2*np.pi*f*5.4*tt)*np.exp(-tt*9))*e
def pad(fs, d, att, rel, g):
    tt = np.arange(int(d*SR))/SR; e = np.minimum(1, tt/att)*np.clip((d-tt)/rel, 0, 1)
    return sum(np.sin(2*np.pi*f*tt+i)*(.7+.3*np.sin(2*np.pi*.25*tt+i)) for i, f in enumerate(fs))*e*g/len(fs)
def riser(d, f0, f1):
    tt = np.arange(int(d*SR))/SR; f = f0*(f1/f0)**(tt/d); ph = 2*np.pi*np.cumsum(f)/SR
    return (np.sin(ph) + .3*np.sin(2*ph))*(tt/d)**2
def scratch(d):
    tt = np.arange(int(d*SR))/SR; x = rng.standard_normal(len(tt)); b = lp(x, .4) - lp(x, .1)
    return b*(.5+.5*np.abs(np.sin(2*np.pi*18*tt)))*np.minimum(1, tt/.02)*np.minimum(1, (d-tt)/.06)*2

def tk(k):
    if k == 0: return 0.9
    if k <= 103: return 0.9 + 3.7*(k/103)**(1/2.2)
    if k <= 344: return 10.4 + 3.0*((k-104)/240)**(1/2.2)
    return 24.2
# room tone + shop murmur
add(lp(rng.standard_normal(n), .015)*2.5, 0, 0, .18)
add(pad([110.0, 164.81, 220.0], D, 1.0, 1.5, .18), 0)
# rips
for k in range(346):
    at = tk(k); dense = 1.0 if k in (0, 345) else 1/(1 + 0.03*max(0, min(k, 103) - 5) + (0.04*(k-104) if k > 103 else 0))**.5
    d = .32 if k in (0, 345) else .09 + rng.random()*.05
    add(rip(d, .9), at, rng.uniform(-.5, .5), (1.0 if k in (0, 345) else .55)*max(dense, .25))
# tension risers under each flurry
add(riser(3.7, 110, 440), 0.9, 0, .22); add(riser(3.0, 130, 520), 10.4, 0, .26)
# slams
for at in (4.6, 13.4):
    add(thud(), at, 0, 1.0); add(knock(), at, 0, .7); add(bell(146.83, 2.2, 1.8), at, 0, .25)
add(pad([146.83, 220.0, 293.66], 5.8, .4, 1.4, .35), 4.6)
add(pad([130.81, 196.0, 261.63, 311.13], 6.0, .4, 1.4, .38), 13.4)
# circle: marker squeak, then the 3-note sting
for at, d in [(19.6, .45), (20.02, .45)]: add(scratch(d), at, .1, .5)
for i, f in enumerate([587.33, 739.99, 880.0]): add(bell(f, 1.8, 2.6), 20.55 + i*.16, (i-1)*.3, .32)
# calm sign-off
add(pad([196.0, 246.94, 293.66, 392.0], 3.4, .5, 1.4, .45), 22.0)
add(bell(783.99, 2.2, 2.0), 22.1, 0, .18)
# loop: last page torn gently, flutter
add(lp(rng.standard_normal(int(.8*SR)), .2)*np.sin(np.linspace(0, np.pi, int(.8*SR)))*(.6+.4*np.sin(np.linspace(0, 40, int(.8*SR)))), 24.25, -.3, .35)
mix = np.stack([L, R], 1)
mix *= np.minimum(1, (D - t)/.15)[:, None]*np.minimum(1, t/.02)[:, None]
mix /= np.abs(mix).max()/.8
with wave.open('q2-sfx.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
print('ok')
