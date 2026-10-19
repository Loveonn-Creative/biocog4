# Sound for q5.html (31 s): chat ping, balloon stretching with each forward, pin + POP, paper, pen strikes,
# conveyor goods, crate thuds, stamp, 3-note sting on "Rule nahi.", calm sign-off, loop ping.
import numpy as np, wave
SR = 48000; D = 31.0; n = int(SR*D); t = np.arange(n)/SR
L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(11)
def add(sig, at, pan=0.0, g=1.0):
    i = int(at*SR)
    if i < 0: sig = sig[-i:]; i = 0
    sig = sig[:max(0, n-i)]
    L[i:i+len(sig)] += sig*g*(1-max(0,pan)); R[i:i+len(sig)] += sig*g*(1+min(0,pan))
def env(d, a=.002, k=30.0):
    tt = np.arange(int(d*SR))/SR; return np.minimum(1, tt/a)*np.exp(-tt*k), tt
def lp(x, a):
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x): acc += a*(v-acc); y[i] = acc
    return y
def noise(d): return rng.standard_normal(int(d*SR))
def thud(f=55, k=5, d=.9):
    e, tt = env(d, .002, k); return np.sin(2*np.pi*(f + 40*np.exp(-tt*25))*tt)*e
def bell(f, d=1.4, k=3.5):
    e, tt = env(d, .003, k); return (np.sin(2*np.pi*f*tt) + .4*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt*6))*e
def blip(f0, f1, d=.12):
    tt = np.arange(int(d*SR))/SR; f = f0 + (f1-f0)*tt/d; ph = 2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*np.sin(np.pi*tt/d)
def ping(): return np.concatenate([blip(880, 900, .07)*0, np.zeros(1)]) if False else None
def chat_ping(g=1):
    a = bell(1318.5, .5, 9); b = bell(1760, .6, 8); out = np.zeros(int(.7*SR)); out[:len(a)] += a; j = int(.09*SR); out[j:j+len(b)] += b[:len(out)-j]; return out*g
def squeak(f0, f1, d=.5):
    tt = np.arange(int(d*SR))/SR; f = f0*(f1/f0)**(tt/d) + 18*np.sin(2*np.pi*23*tt); ph = 2*np.pi*np.cumsum(f)/SR
    s = np.sin(ph) + .5*np.sin(2*ph) + .25*np.sin(3*ph); return lp(s, .25)*np.sin(np.pi*tt/d)**.7
def whoosh(d, up=True):
    tt = np.arange(int(d*SR))/SR; x = noise(d); out = np.zeros_like(tt)
    for b0 in range(0, len(tt), 480):
        k = b0/len(tt); a = .02 + .3*(k if up else 1-k); seg = x[b0:b0+480]; out[b0:b0+480] = lp(seg, a) - lp(seg, a*.3)
    return out*np.sin(np.pi*tt/d)**2*2
def scratch(d=.4):
    tt = np.arange(int(d*SR))/SR; x = noise(d); b = x - lp(x, .3)
    return b*(.5 + .5*np.abs(np.sin(2*np.pi*31*tt)))*np.sin(np.pi*tt/d)*.6
def pluck(f, d=.35):
    e, tt = env(d, .002, 12); return (np.sin(2*np.pi*f*tt) + .3*np.sin(4*np.pi*f*tt))*e
def tick():
    e, tt = env(.03, .0004, 180); return np.sin(2*np.pi*2200*tt)*e
def pad(fs, d, att, rel, g):
    tt = np.arange(int(d*SR))/SR; e = np.minimum(1, tt/att)*np.clip((d-tt)/rel, 0, 1)
    return sum(np.sin(2*np.pi*f*tt+i)*(.7+.3*np.sin(2*np.pi*.25*tt+i)) for i, f in enumerate(fs))*e*g/len(fs)

add(lp(noise(D), .02)*3, 0, 0, .14)                       # room tone
add(chat_ping(), -.25, 0, .35)                              # incoming forward (tail at frame 0)
# balloon inflates with every forward
for k, at in enumerate([1.6, 2.3, 3.0, 3.7, 4.4]):
    add(squeak(300 + k*70, 420 + k*90, .45), at - .05, -.1, .22)
    add(blip(900 + k*120, 1300 + k*140, .08), at, .3, .16)
for i in range(9): add(whoosh(.5), 1.6 + i*.5, .6, .16)   # forward arrows streaming out
tt = np.arange(int(4.7*SR))/SR                             # stretched-rubber tension under it all
add(np.sin(2*np.pi*(90 + 60*tt/4.7)*tt)*np.minimum(1, tt/.5)*.5*(tt/4.7), 1.4, 0, .25)
# pin + POP
add(whoosh(.75, True), 5.55, .5, .55)
add(lp(noise(.25), .7)*env(.25, .0005, 22)[0], 6.3, 0, 1.1)
add(thud(60, 7), 6.3, 0, .9); add(whoosh(.9, False), 6.36, 0, .5)
for j in range(10): add(pluck(500 + (j*137 % 7)*90, .12), 6.6 + j*.07, -.5 + j*.1, .12)  # bits falling
# truth bed: soft pad
add(pad([196, 246.9, 293.7], 15.2, 1.5, 1.5, .10), 7.0, 0, 1)
add(pad([174.6, 220, 261.6], 7.5, 1.2, 1.5, .10), 22.2, 0, 1)
add(scratch(.35), 6.9, -.3, .5)                             # tag box
for i in range(6): add(tick(), 7.2 + i*.14, .2, .18)
add(scratch(.45), 8.6, .1, .9)                              # red pen through "size"
for i in range(5): add(tick(), 10.4 + i*.12, .2, .18)
add(scratch(.6), 10.6, -.3, .35); add(scratch(.6), 10.8, .3, .35)   # belts
for i in range(6):
    at = 11.3 + i*.42; add(thud(120, 18, .3), at + .55, -.4 + i*.16, .35); add(pluck([392, 440, 493.9, 523.3, 587.3, 659.3][i], .4), at + .55, -.4 + i*.16, .3)
for k in range(12): add(tick(), 15.2 + k*.066, 0, .2)      # 50 counting
add(bell(784, .9, 5), 16.0, 0, .2)
add(scratch(.7), 15.4, -.2, .35); add(scratch(.5), 15.7, .4, .3)
for i in range(5): add(tick(), 17.2 + i*.12, .2, .16)
for i in range(9): add(thud(150 + (i % 3)*20, 14, .35), 17.3 + i*.36 + .2, -.3 + (i % 3)*.2, .55); add(lp(noise(.08), .4)*env(.08, .001, 50)[0], 17.3 + i*.36 + .2, 0, .25)
add(bell(392, .5, 9), 19.3, .4, .25); add(bell(370, .5, 9), 19.45, .4, .2)   # gauge crosses 50 t
add(scratch(.4), 20.0, -.2, .45)
add(thud(48, 4), 20.9, 0, 1.0); add(lp(noise(.1), .5)*env(.1, .0005, 40)[0], 20.9, 0, .7)   # stamp
add(whoosh(.6, False), 22.0, 0, .3)
for i in range(5): add(tick(), 22.5 + i*.14, 0, .16)
for f, at in [(523.3, 23.9), (659.3, 24.12), (784, 24.34)]: add(bell(f, 1.8, 2.6), at, 0, .3)   # series sting
add(scratch(.5), 24.6, 0, .7)
add(bell(392, 3.0, 1.2), 26.4, 0, .15)
add(scratch(.5), 28.2, .2, .4)
add(whoosh(.8, True), 29.45, 0, .4)
add(chat_ping(), 30.75, 0, .35)                             # the next forward (loops into frame 0)

m = max(np.abs(L).max(), np.abs(R).max()); L, R = L/m*.89, R/m*.89
fade = np.clip((D - t)/.08, 0, 1); L *= fade; R *= fade
pcm = (np.stack([L, R], 1)*32767).astype('<i2')
with wave.open('q5-sfx.wav', 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok')
