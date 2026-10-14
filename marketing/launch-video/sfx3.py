# Calm UI sound design for guide1.html (80 s): soft bed, taps, typing, success and error cues.
import numpy as np, wave, re
SR = 48000; D = 80.0; n = int(SR*D); t = np.arange(n)/SR
L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(3)
def add(sig, at, pan=0.0, g=1.0):
    i = int(at*SR); sig = sig[:max(0, n-i)]
    L[i:i+len(sig)] += sig*g*(1-max(0,pan)); R[i:i+len(sig)] += sig*g*(1+min(0,pan))
def env(d, a=.002, k=30.0):
    tt = np.arange(int(d*SR))/SR; return np.minimum(1, tt/a)*np.exp(-tt*k), tt
def tap():
    e, tt = env(.08, .0008, 60); return np.sin(2*np.pi*(900+500*np.exp(-tt*80))*tt)*e*.7
def key():
    e, tt = env(.025, .0004, 220); x = rng.standard_normal(len(tt)); return (x - np.convolve(x, np.ones(6)/6, 'same'))*e*.35
def chime(fs):
    out = np.zeros(int(1.2*SR))
    for i, f in enumerate(fs):
        e, tt = env(1.0, .004, 4.5); s = (np.sin(2*np.pi*f*tt)+.25*np.sin(4*np.pi*f*tt))*e; j = int(i*.09*SR); out[j:j+len(s)] += s[:len(out)-j]
    return out
def soft_err():
    e, tt = env(.35, .004, 9); return (np.sin(2*np.pi*220*tt)+np.sin(2*np.pi*233*tt))*e*.5
def whoosh(d=.5):
    tt = np.arange(int(d*SR))/SR; x = rng.standard_normal(len(tt)); y = np.convolve(x, np.ones(40)/40, 'same') - np.convolve(x, np.ones(300)/300, 'same')
    return y*np.sin(np.pi*tt/d)**2*3
def pad(fs, d, g):
    tt = np.arange(int(d*SR))/SR; e = np.minimum(1, tt/3)*np.clip((d-tt)/3, 0, 1)
    return sum(np.sin(2*np.pi*f*tt+i)*(.75+.25*np.sin(2*np.pi*.11*tt+i)) for i, f in enumerate(fs))*e*g/len(fs)

src = open('guide1.html').read()
# bed: two gentle chords alternating, warm and steady
for k, at in enumerate(np.arange(0, 80, 10)):
    add(pad([130.81,196.0,261.63,329.63] if k % 2 == 0 else [146.83,220.0,293.66,349.23], 13, .22), at)
# taps, read straight from the timeline
taps = [float(x) for x in re.findall(r"\[(\d+\.?\d*), '[a-zA-Z0-9]+'\]", src.split('const TAPS')[1].split(';')[0])]
for at in taps: add(tap(), at, .25, .5)
# typing: email, password, name, GSTIN, phone, sector, size
for s0, chars, cps in [(7.2,19,13),(9.8,10,7),(20.6,21,15),(22.6,15,8),(27.8,15,14),(35.9,13,14),(37.0,15,14)]:
    for c in range(chars): add(key(), s0 + c/cps + rng.uniform(-.01,.01), .25, .55)
# step changes
for at in [5.2, 19.2, 40.4, 49.2, 62.2]: add(whoosh(), at - .15, -.2, .25); add(chime([659.25]), at + .1, 0, .12)
# error notes (soft, never alarming)
for at in [12.0, 24.6, 56.8, 69.4]: add(soft_err(), at, -.2, .35)
# success toasts
for at, fs in [(31.0,[523.25,659.25]),(38.45,[523.25,659.25]),(55.2,[523.25,659.25,783.99]),(26.7,[783.99])]: add(chime(fs), at, .1, .28)
add(chime([523.25,659.25,783.99,1046.5]), 76.8, 0, .3)
mix = np.stack([L,R],1)*np.minimum(1,(D-t)/2.0)[:,None]*np.minimum(1, t/1.0)[:,None]
mix /= np.abs(mix).max()/.7
with wave.open('sfx3.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
print('ok', len(taps), 'taps')
