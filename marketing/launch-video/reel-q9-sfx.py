# Sound for q9.html (29 s): night at a railway level crossing. Crossing bell, 50 Hz catenary buzz, loco horn,
# axle clacks computed from the same train kinematics as the page, a tally tick per wagon counted,
# the last-vehicle lamp, a silence, the 26x hit, boom-gate creak, series sting, bell returns for the loop.
import numpy as np, wave
SR = 48000; D = 29.0; n = int(SR*D); t = np.arange(n)/SR
L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(92)
def add(sig, at, pan=0.0, g=1.0):
    i = int(at*SR)
    if i >= n: return
    sig = sig[:n-i]; L[i:i+len(sig)] += sig*g*(1-max(0,pan)); R[i:i+len(sig)] += sig*g*(1+min(0,pan))
def env(d, a=.002, k=30.0):
    tt = np.arange(int(d*SR))/SR; return np.minimum(1, tt/a)*np.exp(-tt*k), tt
def lp(x, a):
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x): acc += a*(v-acc); y[i] = acc
    return y
def bell(f, d=1.6, k=3.5):
    e, tt = env(d, .003, k); return (np.sin(2*np.pi*f*tt) + .4*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt*6) + .2*np.sin(2*np.pi*f*5.4*tt)*np.exp(-tt*9))*e
def thud(f=55, k=5):
    e, tt = env(.9, .002, k); return np.sin(2*np.pi*(f + 40*np.exp(-tt*25))*tt)*e
def clack(f=900, g=1.0):
    e, tt = env(.08, .0005, 70); x = rng.standard_normal(len(tt))
    return (np.sin(2*np.pi*f*tt)*.4 + np.sin(2*np.pi*f*1.53*tt)*.25 + (lp(x, .35) - lp(x, .05))*1.2)*e*g
def tick():
    e, tt = env(.05, .0004, 120); return (np.sin(2*np.pi*1650*tt) + .3*np.sin(2*np.pi*3300*tt))*e
def pad(fs, d, att, rel, g):
    tt = np.arange(int(d*SR))/SR; e = np.minimum(1, tt/att)*np.clip((d-tt)/rel, 0, 1)
    return sum(np.sin(2*np.pi*f*tt+i)*(.7+.3*np.sin(2*np.pi*.2*tt+i)) for i, f in enumerate(fs))*e*g/len(fs)
def horn(d, f1=311.1, f2=370.0):
    tt = np.arange(int(d*SR))/SR; e = np.minimum(1, tt/.08)*np.clip((d-tt)/.25, 0, 1)
    s = 0
    for f in (f1, f2):
        ph = 2*np.pi*f*tt; s = s + np.sign(np.sin(ph))*.25 + np.sin(ph) + .3*np.sin(2*ph)
    return lp(s*e, .12)*1.3
def creak(d):
    tt = np.arange(int(d*SR))/SR; f = 180 + 60*np.sin(2*np.pi*.7*tt); ph = 2*np.pi*np.cumsum(f)/SR
    s = np.sign(np.sin(ph))*(np.abs(np.sin(2*np.pi*11*tt)))
    return lp(s, .2)*np.sin(np.pi*tt/d)

# train kinematics, identical to front() in q9.html
F0, V0, VM, TA, TB = 560, 140, 700, 3.5, 9.0
def front(x):
    u = min(1, max(0, (x-TA)/(TB-TA))); d = TB-TA; y = F0 + V0*x
    if x > TA: y += (VM-V0)*(d*(u**3 - u**4/2) if x < TB else d*.5 + (x-TB))
    return y
ENG, PITCH, NW, GATE = 520, 430, 26, 540
ts = np.arange(0, D, 1/1000.); fr = np.array([front(x) for x in ts])
def when(pos):  # time the train's front reaches pos
    i = np.searchsorted(fr, pos); return ts[i] if i < len(ts) else None

# bed: room tone, 50 Hz catenary buzz, distant crickets
add(lp(rng.standard_normal(n), .02)*3, 0, 0, .14)
hum = (np.sin(2*np.pi*50*t)*.5 + np.sin(2*np.pi*100*t)*.35 + np.sin(2*np.pi*150*t)*.15)*(1+.2*np.sin(2*np.pi*.4*t))
L += hum*.03; R += hum*.03
for k in range(40):
    at = .3 + k*.7 + rng.random()*.2; tt = np.arange(int(.09*SR))/SR
    add(np.sin(2*np.pi*4300*tt)*(np.sin(2*np.pi*60*tt)>0)*np.sin(np.pi*tt/.09), at, .6 if k%2 else -.6, .02)
# crossing bell: electric ring, while the gate is down; returns at the end
ring = np.zeros(n)
for k in range(int(D*9)):
    at = k/9
    if 22.3 < at < 28.2: continue
    b = bell(1975 + 8*np.sin(k), .14, 30); i = int(at*SR); ring[i:i+len(b)] += b[:max(0, n-i)]
rgain = np.where(t < 22.3, .55 - .25*np.clip((t-4)/4, 0, 1), np.clip((t-28.2)/.5, 0, 1)*.35)
L += ring*rgain*.12; R += ring*rgain*.09
# loco horn on the first frame, two blasts
add(horn(.9), 0.05, .2, .32); add(horn(1.3), 1.15, .3, .32)
# wheels: one clack per axle crossing the listener (the gate post)
ENG_AX = [50, 120, 190, 330, 400, 470]; W_AX = [40, 100, 300, 360]
axles = [ENG - o for o in ENG_AX]
for i in range(1, NW+1):
    base = ENG + i*PITCH
    axles += [base - o for o in W_AX]
roll = np.zeros(n)
for off in axles:
    at = when(GATE + off)
    if at is None: continue
    sp = min(1, .35 + .65*(at-1)/9)
    add(clack(700 + rng.random()*300, .5 + .5*sp), at, (rng.random()-.5)*.3, .5)
# body rumble while the train is passing
pass_end = when(1080 + ENG + NW*PITCH + 64)
rum = lp(rng.standard_normal(n), .01)*6
reng = np.clip(t/1.0, 0, 1)*np.clip((pass_end - t)/1.2, 0, 1)*(.5 + .5*np.clip((t-3)/8, 0, 1))
L += rum*reng*.22; R += rum*reng*.22
# tally tick per wagon counted (wagon tail passes the gate)
for i in range(1, NW+1):
    at = when(GATE + ENG + i*PITCH)
    if at is not None: add(tick(), at, -.25, .16 + i*.004)
last = when(GATE + ENG + NW*PITCH)
# last-vehicle blink: tiny relay clicks
for k in range(6): add(tick()*.5, last - 1.6 + k/1.2, .4, .08)
# payoff: the 26x lands in the hush after the last wagon
add(thud(48, 4), last + .08, 0, .9)
for f, at in [(523.25, last+.12), (659.25, last+.24), (783.99, last+.36)]: add(bell(f, 2.0, 2.2), at, 0, .3)
add(pad([130.81, 196.0, 261.63, 329.63], 3.8, .3, 1.5, .42), last+.1)
# boom gate lifts
add(creak(1.7), 22.5, -.6, .12); add(thud(70, 9), 24.2, -.6, .25)
# closing line + sign-off sting
add(pad([110.0, 164.81, 220.0], 2.4, .5, 1.0, .3), 24.4)
add(pad([130.81, 196.0, 261.63, 392.0], 2.6, .4, 1.2, .3), 26.5)
for f, at in [(523.25, 26.5), (659.25, 26.62), (783.99, 26.74)]: add(bell(f, 2.0, 2.4), at, 0, .2)
add(creak(.7), 28.3, -.6, .08)
fade = np.clip((D - t)/.3, 0, 1); L *= fade; R *= fade
mix = np.stack([L, R], 1); mix /= np.abs(mix).max()/.8
with wave.open('q9-sfx.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
print('ok last', last, 'pass_end', pass_end)
