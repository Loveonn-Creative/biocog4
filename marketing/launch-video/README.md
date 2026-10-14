# 20-second launch film

The video's story: three requests arrive (EU buyer, bank, listed customer). The answer is already in the bill:
4,820 kWh × 0.710 kg CO₂/kWh = 3,422 kg CO₂ (Scope 2), marked as verified and counted once.
The same three requests then get answered, and the end card says "Start with one bill."

Copy comes from `src/components/home/AskCards.tsx` and `HomeStory.tsx`. The grid factor comes from the CEA
CO2 Baseline Database v21.0. The bill shows billing fields only, and personal details are redacted.

`launch.html` is a deterministic timeline (`render(t)`). Playwright renders it frame by frame at 30 fps, and `sfx.py`
builds the sound design on the same timeline.

```sh
npm i
python3 sfx.py
node render.mjs stills landscape 3.6,11.9,19.5        # review frames
node render.mjs video landscape v-l.mp4               # or: portrait v-p.mp4
ffmpeg -i v-l.mp4 -i sfx.wav -c:v copy -c:a aac -b:a 192k -shortest out/senseible-launch-16x9.mp4
```

If Chromium lives elsewhere, set its path in `render.mjs`.
