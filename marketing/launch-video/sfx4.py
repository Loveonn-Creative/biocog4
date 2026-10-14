# Sound for cbam.html (38 s): a dark room, a lamp, a UV torch hum, glowing ink, a ticking meter,
# a cold Hamburg office, a pen, a hard number, then the torch turned to you.
import numpy as np, wave
SR = 48000; D = 38.0; n = int(SR*D); t = np.arange(n)/SR
L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(21)
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
def hum(d):
    tt = np.arange(int(d*SR))/SR; e = np.minimum(1, tt/.15)*np.minimum(1, (d-tt)/.2)
    s = np.sin(2*np.pi*100*tt)*.5 + np.sin(2*np.pi*200*tt)*.25 + np.sin(2*np.pi*300*tt)*.12
    return s*(.8+.2*np.sin(2*np.pi*7*tt))*e
def shimmer(d):
    tt = np.arange(int(d*SR))/SR; e = np.sin(np.pi*tt/d)**2
    return sum(np.sin(2*np.pi*f*tt + i)*(.5+.5*np.sin(2*np.pi*(5+i)*tt)) for i, f in enumerate([1760, 2217, 2637, 3520]))*e/4
def bell(f, d=1.6, k=3.5):
    e, tt = env(d, .003, k); return (np.sin(2*np.pi*f*tt) + .4*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt*6) + .2*np.sin(2*np.pi*f*5.4*tt)*np.exp(-tt*9))*e
def tick():
    e, tt = env(.04, .0004, 160); return np.sin(2*np.pi*1500*tt)*e
def pad(fs, d, att, rel, g):
    tt = np.arange(int(d*SR))/SR; e = np.minimum(1, tt/att)*np.clip((d-tt)/rel, 0, 1)
    return sum(np.sin(2*np.pi*f*tt+i)*(.7+.3*np.sin(2*np.pi*.2*tt+i)) for i, f in enumerate(fs))*e*g/len(fs)
def scratch(d):
    tt = np.arange(int(d*SR))/SR; x = rng.standard_normal(len(tt)); b = lp(x, .35) - lp(x, .07)
    return b*(.55+.45*np.abs(np.sin(2*np.pi*24*tt)))*np.minimum(1, tt/.02)*np.minimum(1, (d-tt)/.05)*2.2
def thud(f=55):
    e, tt = env(.9, .002, 5); return np.sin(2*np.pi*(f + 40*np.exp(-tt*25))*tt)*e
def whoosh(d, up=True):
    tt = np.arange(int(d*SR))/SR; x = rng.standard_normal(len(tt)); out = np.zeros_like(tt)
    for b0 in range(0, len(tt), 480):
        k = b0/len(tt); a = .02 + .3*(k if up else 1-k); seg = x[b0:b0+480]; out[b0:b0+480] = lp(seg, a) - lp(seg, a*.3)
    return out*np.sin(np.pi*tt/d)**2*2

# room
add(lp(rng.standard_normal(int(17.9*SR)), .02)*3, 0, 0, .25)
add(click(1800), .25, .2, .7)                              # lamp on
add(pad([73.42, 110.0, 146.83], 5.0, 1.5, 1.0, .5), 0)    # low, patient
add(click(2400), 5.05, .2, .8); add(click(3200), 5.12, -.1, .6)   # lamp off, torch on
add(hum(12.7), 5.1, 0, .16)
add(pad([110.0, 130.81, 164.81, 207.65], 12.8, 1.0, 1.2, .55), 5.1)   # uneasy under UV
add(shimmer(1.9), 5.8, .2, .5); add(bell(1318.5), 7.45, .1, .35); add(shimmer(.8), 8.0, -.2, .3)
for k in range(9): add(tick(), 11.6 + .62*k, .2, .55); add(bell(220*2**(k/12), .5, 7), 11.6 + .62*k, 0, .18)
add(bell(155.56, 1.4, 2.5), 13.0, -.2, .35)               # the penalty lands, low
add(whoosh(.5, True), 17.55, 0, .5)
# Hamburg: cold daylight
add(lp(rng.standard_normal(int(8.4*SR)), .08)*1.2, 18.0, 0, .12)
add(pad([196.0, 246.94, 293.66, 392.0], 8.4, .3, .8, .35), 18.0)
add(scratch(.35), 22.0, .2, .6); add(scratch(.55), 22.5, .25, .6)
add(thud(48), 23.6, 0, .9)
# torch to you
add(whoosh(.9, True), 26.0, 0, .7); add(click(3200), 26.5, 0, .6); add(hum(6.4), 26.6, 0, .14)
add(pad([130.81, 164.81, 196.0, 246.94], 6.5, .6, 1.0, .5), 26.6)
for at, d in [(27.8, .8), (28.5, .9), (29.2, .3), (30.4, .7)]: add(scratch(d), at, .2, .45)
add(bell(1046.5), 29.7, 0, .4)
# end
add(click(2000), 33.1, 0, .5)
for k, at in enumerate(np.arange(33.8, 34.4, .07)): add(click(5000, .4), at, 0, .25)
add(pad([130.81, 196.0, 261.63, 329.63, 392.0], 4.9, .4, 2.0, .7), 33.1)
add(bell(783.99, 2.5, 1.8), 35.0, 0, .3); add(bell(1174.66, 2.5, 1.8), 35.1, 0, .2)
mix = np.stack([L,R],1)*np.minimum(1,(D-t)/1.6)[:,None]
mix /= np.abs(mix).max()/.72
with wave.open('sfx4.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
print('ok')
