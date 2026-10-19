# Sound for twosides.html (46 s): warm chord = the factory, cool chord = its buyer, one shared chord at "verified once".
import numpy as np, wave
SR = 48000; D = 46.0; n = int(SR*D); t = np.arange(n)/SR
L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(8)
def add(sig, at, pan=0.0, g=1.0):
    i = int(at*SR); sig = sig[:max(0, n-i)]
    L[i:i+len(sig)] += sig*g*(1-max(0,pan)); R[i:i+len(sig)] += sig*g*(1+min(0,pan))
def env(d, a=.003, k=20.0):
    tt = np.arange(int(d*SR))/SR; return np.minimum(1, tt/a)*np.exp(-tt*k), tt
def pad(fs, d, att, rel, g):
    tt = np.arange(int(d*SR))/SR; e = np.minimum(1, tt/att)*np.clip((d-tt)/rel, 0, 1)
    return sum((np.sin(2*np.pi*f*tt+i)+.15*np.sin(4*np.pi*f*tt))*(.7+.3*np.sin(2*np.pi*.17*tt+i)) for i, f in enumerate(fs))*e*g/len(fs)
def bell(f, d=1.4, k=3.2):
    e, tt = env(d, .003, k); return (np.sin(2*np.pi*f*tt)+.35*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt*6))*e
def click(f=1800):
    e, tt = env(.05, .0005, 120); return np.sin(2*np.pi*f*tt)*e
def whoosh(d=.8):
    tt = np.arange(int(d*SR))/SR; x = rng.standard_normal(len(tt)); y = np.convolve(x, np.ones(30)/30, 'same') - np.convolve(x, np.ones(260)/260, 'same')
    return y*np.sin(np.pi*tt/d)**2*3
def thud():
    e, tt = env(.8, .002, 6); return np.sin(2*np.pi*(60+40*np.exp(-tt*25))*tt)*e
WARM = [146.83, 220.0, 293.66, 369.99]      # D major: the factory
COOL = [130.81, 196.0, 246.94, 329.63]      # C maj7-ish, airy: the buyer
BOTH = [146.83, 220.0, 293.66, 369.99, 440.0, 587.33]
add(pad([146.83, 220.0], 4.8, 1.0, 1.0, .35), 0)
add(click(2200), .2, .2, .5); add(bell(1174.66), 1.5, .1, .35)
add(whoosh(.6), 4.5, 0, .3); add(thud(), 4.7, 0, .5)
add(pad(WARM, 4.0, .6, 1.2, .45), 4.8, -.5)
add(whoosh(1.1), 8.1, .0, .45); add(bell(784, 1.2), 8.8, .4, .3)
add(pad(COOL, 4.6, .6, 1.2, .45), 8.7, .5)
add(pad(WARM, 11.6, .8, 1.4, .5), 12.8, -.2)
for at in [14.6, 15.4]: add(click(1500), at, -.2, .4)
for at in [17.4, 18.2, 19.0]: add(bell(659.25, .6, 7), at, -.1, .25)
add(bell(880, 1.0), 21.6, 0, .3)
add(whoosh(1.0), 23.8, 0, .4)
add(pad(COOL, 11.6, .8, 1.4, .5), 24.0, .2)
for at in [28.4, 29.2]: add(click(2400), at, .2, .5); add(bell(987.77, .8, 5), at + .05, .2, .25)
add(whoosh(.8), 34.8, 0, .35)
add(thud(), 36.6, 0, .9); add(pad(BOTH, 9.4, .5, 2.4, .6), 36.6, 0)
add(bell(1174.66, 2.2, 1.8), 36.7, 0, .3)
for at in [40.6, 41.0]: add(click(1700), at, 0, .35)
mix = np.stack([L,R],1)*np.minimum(1,(D-t)/2.0)[:,None]*np.minimum(1, t/.6)[:,None]
mix /= np.abs(mix).max()/.72
with wave.open('sfx6.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
print('ok')
