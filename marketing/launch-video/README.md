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

## "Carbon proof", a 23-second positioning film (`film.html`)

- **Pain:** an MSME's green loan file is complete except one line, the emissions baseline.
- **What people use instead:** a pile of consultant quotes, site visits, spreadsheets, enterprise suites and English-only forms, taking months.
- **The turn:** the answer is the bill at the bottom of the pile. Its title is shown in Hindi, Tamil and Bengali. 4,820 kWh × 0.710 = 3.42 t CO₂, stamped "verified, counted once".
- **The payoff:** the same form is completed and stamped. The end line reads "Your bills are your carbon proof."

Colour carries the arc: cold grey and red ink while the MSME is locked out, warm paper, green and saffron once the bill turns.

```sh
python3 sfx2.py
FILE=film.html DUR=23 node render.mjs video landscape f-l.mp4   # or portrait f-p.mp4
ffmpeg -i f-l.mp4 -i sfx2.wav -c:v copy -c:a aac -b:a 192k -shortest out/carbon-proof-16x9.mp4
```
