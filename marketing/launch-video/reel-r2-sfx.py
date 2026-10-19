# Sound for r2.html (33 s): a funfair calliope, a ratcheting dial, stamps, a slot reel,
# then the bill walks in, the music stops, and the series sting lands on the payoff.
import numpy as np, wave, math
SR = 48000; D = 33.0; n = int(SR*D); t = np.arange(n)/SR
L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(22)
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
def click(f=2600, g=1.0):
    e, tt = env(.04, .0004, 140); return (np.sin(2*np.pi*f*tt)*.5 + lp(rng.standard_normal(len(tt)), .5)*.8)*e*g
def bell(f, d=1.4, k=3.5):
    e, tt = env(d, .003, k); return (np.sin(2*np.pi*f*tt) + .4*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt*6) + .2*np.sin(2*np.pi*f*5.4*tt)*np.exp(-tt*9))*e
def thud(f=55, d=.6):
    e, tt = env(d, .002, 7); return np.sin(2*np.pi*(f + 50*np.exp(-tt*25))*tt)*e
def slap(g=1.0):
    e, tt = env(.12, .0005, 45); return lp(rng.standard_normal(len(tt)), .6)*e*g
def whoosh(d):
    tt = np.arange(int(d*SR))/SR; x = rng.standard_normal(len(tt)); return (lp(x, .12)-lp(x, .03))*np.sin(np.pi*tt/d)**2*2.5
def organ(f, d, g=1.0):
    tt = np.arange(int(d*SR))/SR; vib = 1 + .006*np.sin(2*np.pi*6*tt)
    s = sum(np.sin(2*np.pi*f*h*vib*tt)/h for h in (1, 2, 3, 4, 6))
    e = np.minimum(1, tt/.01)*np.clip((d-tt)/.04, 0, 1)
    return s*e*g*.35
def pad(fs, d, att, rel, g):
    tt = np.arange(int(d*SR))/SR; e = np.minimum(1, tt/att)*np.clip((d-tt)/rel, 0, 1)
    return sum(np.sin(2*np.pi*f*tt+i)*(.7+.3*np.sin(2*np.pi*.2*tt+i)) for i, f in enumerate(fs))*e*g/len(fs)
def scratch(d):
    tt = np.arange(int(d*SR))/SR; x = rng.standard_normal(len(tt)); b = lp(x, .35) - lp(x, .07)
    return b*(.55+.45*np.abs(np.sin(2*np.pi*24*tt)))*np.minimum(1, tt/.02)*np.minimum(1, (d-tt)/.05)*2.2
def boing(f0, d=.5, up=False):
    tt = np.arange(int(d*SR))/SR; f = f0*(1 + (.6 if up else .25)*np.sin(2*np.pi*14*tt)*np.exp(-tt*5)) * (1 + (tt/d if up else 0))
    ph = 2*np.pi*np.cumsum(f)/SR; return np.sin(ph)*np.exp(-tt*5)*np.minimum(1, tt/.005)
N = lambda m: 440*2**((m-69)/12)

# ---- calliope waltz (beat .4 s), 0–15.6 s, then back in 32.3–33 for the loop ----
beat = .4
prog = [(48, [64, 67, 72]), (48, [64, 67, 72]), (43, [62, 67, 71]), (43, [62, 65, 71]), (48, [64, 67, 72]), (41, [65, 69, 72]), (43, [62, 67, 71]), (48, [64, 67, 72])]
mel = [76, 79, 84, 83, 81, 79, 74, 77, 79, 77, 76, 74, 76, 79, 84, 86, 84, 81, 79, 77, 74, 72, 76, 72]
def calliope(t0, t1, g):
    k = 0; tb = t0
    while tb < t1 - .05:
        bar = k // 3; b, ch = prog[bar % len(prog)]; pos = k % 3
        if pos == 0: add(organ(N(b), .36), tb, -.2, g*1.1)
        else: [add(organ(N(c), .22), tb, .15, g*.28) for c in ch]
        add(organ(N(mel[k % len(mel)]), .36), tb, 0, g*.55)
        k += 1; tb += beat
calliope(0, 15.6, .55)
add(np.concatenate([np.zeros(10)]), 0)
# record stop: a falling organ note at 15.6
tt = np.arange(int(.5*SR))/SR; add(np.sin(2*np.pi*np.cumsum(N(72)*(1-tt/.6))/SR)*np.exp(-tt*4)*.5, 15.6, 0, .5)
# ---- needle ratchet: a tick each time the needle crosses a 15-degree mark ----
def aSwing(x): return 15 + 72*math.sin(2.4*x + .5)
def io(x): return 4*x**3 if x < .5 else 1 - (-2*x + 2)**3/2
def needle(x):
    if x < 4.4: return aSwing(x)
    if x < 6.8: a0 = aSwing(4.4); return a0 + (95+720-a0)*io(min(1, (x-4.4)/2.4))
    return 95
prev = needle(0)
for f in range(1, int(6.8*1000)):
    x = f/1000; a = needle(x)
    if math.floor(a/15) != math.floor(prev/15): add(click(3200 + 400*(x > 4.4)), x, .1, .35)
    prev = a
add(thud(60), 6.8, 0, .9); add(bell(N(84), 1.2), 6.8, .1, .35); add(bell(N(88), 1.2), 6.95, -.1, .3)
for k in range(5): add(organ(N(45 - k), .1), 6.85 + k*.11, 0, .25)   # buzzer flutter
# tag drop + count-up
add(whoosh(.45), 7.15, .2, .5); add(slap(.7), 7.6, .2, .6)
for k in range(14): add(click(4200, .5), 7.3 + k*.055, 0, .3)
# stamps
for s in (8.0, 9.2, 10.2): add(thud(70, .35), s, .25, .8); add(slap(), s, .25, .8)
# slot reel 9.2–12.7: fast ratchet, column stops, ka-ching
x = 9.2
while x < 12.6: add(click(5200, .4), x, -.1, .22); x += .045 if x < 11.6 else .07
for i in range(7): add(click(1800), 11.6 + i*.16, 0, .55)
add(bell(N(88), 1.5, 2.6), 12.7, 0, .45); add(bell(N(93), 1.5, 2.6), 12.78, .2, .35)
# ---- the bill walks in ----
for k in range(5): add(slap(.5), 15.95 + k*.196, -.3, .4)
add(boing(330, .5, True), 16.75, 0, .35)
add(thud(90, .3), 17.25, 0, .6); add(slap(.8), 17.25, 0, .5)
add(boing(500, .45, True), 17.25, -.4, .25)   # hat pops
tt = np.arange(int(.25*SR))/SR; add(lp(rng.standard_normal(len(tt)), .7)*np.exp(-tt*10)*np.minimum(1, tt/.003), 18.0, .3, .7)  # rip
add(whoosh(.8), 18.05, .3, .45)
add(boing(220, .7), 19.0, 0, .5)
add(scratch(.4), 19.0, .1, .5); add(scratch(.5), 19.4, .1, .45)
# dim + payoff
add(pad([130.81, 164.81, 196.0], 7.0, 1.0, 1.5, .35), 21.6)
for k, m in enumerate([72, 76, 79]): add(bell(N(m), 2.4, 1.8), 24.5 + k*.18, (k-1)*.2, .45)   # series sting C5 E5 G5
add(click(2400), 26.1, 0, .3)
# end
add(pad([130.81, 196.0, 261.63, 329.63], 3.6, .4, 1.0, .45), 28.8)
add(boing(600, .25), 29.3, 0, .15)
calliope(32.3, 33.0, .3)
# loop: start the waltz from a faded entry so the seam is soft
mix = np.stack([L, R], 1)
fade = np.ones(n); fi = int(.15*SR); fade[:fi] = np.linspace(.6, 1, fi)
mix *= fade[:, None]
mix /= np.abs(mix).max()/.75
with wave.open('r2-sfx.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
print('ok')
