# Sound for q1.html (30 s): highway toll naka. Boom slam, idling diesels, neon sign, x-ray hum, ticks,
# penalty plate flips (rising), paper certificates, 3-note sting on payoff, boom lift, trucks roll off, calm end.
import numpy as np, wave
SR = 48000; D = 30.0; n = int(SR*D); t = np.arange(n)/SR
L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(7)
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
def clang():
    e, tt = env(.6, .001, 9); return sum(np.sin(2*np.pi*f*tt)*a for f, a in [(612, .5), (1430, .3), (2210, .2)])*e
def bell(f, d=1.6, k=3.5):
    e, tt = env(d, .003, k); return (np.sin(2*np.pi*f*tt) + .4*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt*6))*e
def pad(fs, d, att, rel, g):
    tt = np.arange(int(d*SR))/SR; e = np.minimum(1, tt/att)*np.clip((d-tt)/rel, 0, 1)
    return sum(np.sin(2*np.pi*f*tt+i)*(.7+.3*np.sin(2*np.pi*.2*tt+i)) for i, f in enumerate(fs))*e*g/len(fs)
def idle(d, f=31):
    tt = np.arange(int(d*SR))/SR; e = np.minimum(1, tt/.3)*np.minimum(1, (d-tt)/.4)
    pulse = (np.sin(2*np.pi*f*tt) > .6).astype(float)
    return lpf(pulse - .2 + rng.standard_normal(len(tt))*.3, .03)*e*3
def whoosh(d):
    tt = np.arange(int(d*SR))/SR; x = rng.standard_normal(len(tt)); return (lpf(x, .25) - lpf(x, .05))*np.sin(np.pi*tt/d)**2*2
def screech(d):
    tt = np.arange(int(d*SR))/SR; f = 1900 - 500*tt/d
    return (np.sin(2*np.pi*np.cumsum(f)/SR)*.4 + (lpf(rng.standard_normal(len(tt)), .4)*.5))*np.minimum(1, (d-tt)/.1)*np.exp(-tt*2)
def hum(d, f=120):
    tt = np.arange(int(d*SR))/SR; e = np.minimum(1, tt/.1)*np.minimum(1, (d-tt)/.2)
    return (np.sin(2*np.pi*f*tt)*.5 + np.sin(2*np.pi*2*f*tt)*.25)*e
def paper():
    e, tt = env(.12, .002, 25); x = rng.standard_normal(len(tt)); return (x - lpf(x, .2))*e
def flap():
    th = thud(140, 22)*.4; c = click(900, .8); th[:len(c)] += c; return th

# road bed + distant traffic
add(lpf(rng.standard_normal(n), .015)*2.2, 0, 0, .35)
# hook: brakes + boom slam (loop: boom already falling at t=0)
add(screech(.35), 0, -.2, .35); add(clang(), .18, .1, .7); add(thud(55), .18, 0, 1.0); add(click(1800), .3, .1, .4)
add(idle(25.4), .2, -.3, .22)          # steel truck idling
add(idle(22, 27), 3.6, -.5, .14)       # aluminium arrives
add(whoosh(1.4), 3.4, -.4, .35); add(whoosh(1.6), 5.4, -.5, .3)
# canopy lights up: CBAM
add(click(3000), 3.25, 0, .6); add(click(3600), 3.36, 0, .4); add(hum(3.9, 100), 3.3, 0, .08)
add(pad([110.0, 146.83, 220.0], 4.0, .3, 1.0, .35), 3.3)
# x-ray
add(hum(3.6, 180), 7.6, 0, .12); add(whoosh(.8), 7.55, .2, .3)
for k in range(6): add(bell(1318.5*2**(k/24), .4, 9), 7.9 + k*.18, .2, .12)
# list ticks
for i in range(6): add(click(2400 + i*120, .9), 12.1 + i*.22, .3, .45)
# default lane: board lights, arrow, flips rising
add(click(2200), 14.0, -.3, .5); add(whoosh(.7), 14.6, -.3, .3)
for i, (at, f) in enumerate([(16.9, 196.0), (17.9, 233.08), (18.9, 277.18)]):
    add(flap(), at - .1, -.4, .8); add(bell(f, 1.0, 3), at, -.4, .35 + .1*i)
add(pad([98.0, 116.54, 146.83], 3.0, .4, 1.0, .3), 16.8)
# buyer pays: paper certificates
add(whoosh(.6), 19.55, .4, .3)
for i in range(5): add(paper(), 20.5 + i*.55, .4, .6); add(paper(), 21.7 + i*.55, .1, .4)
# payoff sting (3 notes)
for k, (f, at) in enumerate([(523.25, 22.4), (659.25, 22.62), (783.99, 22.84)]): add(bell(f, 2.0, 2.5), at, 0, .5)
add(pad([130.81, 196.0, 261.63, 329.63], 7.6, .6, 2.4, .55), 22.4)
# booms lift, trucks roll off
add(click(1500), 24.9, .1, .5); add(whoosh(.8), 24.95, .1, .35); add(bell(880, .6, 6), 25.0, .1, .2)
add(idle(3.4, 40), 25.2, .4, .3); add(whoosh(2.5), 25.6, .5, .35)
# end card
add(bell(783.99, 2.5, 1.8), 26.2, 0, .25); add(bell(1174.66, 2.5, 1.8), 26.35, 0, .18)
add(paper(), 27.6, 0, .4)
# loop: next truck, boom starts falling
add(idle(1.2, 29), 28.8, -.3, .2); add(whoosh(.5), 29.5, 0, .3)
mix = np.stack([L, R], 1)
mix *= np.minimum(1, t/.02)[:, None]
mix /= np.abs(mix).max()/.8
with wave.open('q1-sfx.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
print('ok')
