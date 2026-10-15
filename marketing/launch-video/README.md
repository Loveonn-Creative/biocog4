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

## Guide 1: set up your account (80 seconds, `guide1.html`)

Five stops (Account → Business → Plan → Pay → Check). A saffron ring marks each tap, and red "If you see" notes give the fix for common errors.

- **Checked on the live site (14 Oct 2026):** the sign-up form, the password checks, the GSTIN check-digit error and success states (the state fills in from the GSTIN), and pricing.
- **Checked against code:** the Profile, Subscription and payment messages (`src/hooks/useRazorpay.ts`).
- **Simulated, by request:** the payment window and the screens after payment. No payment was made.
- **Fictional data:** all business details. GSTIN `03AAKCS4821M1Z6` is format-valid and made up.

```sh
python3 sfx3.py && bash g1render.sh   # renders four chunks in parallel, then muxes the audio
```

## "The invisible line": CBAM film (38 seconds, `cbam.html`)

The story: a UV torch reveals the CBAM cost hidden in an Indian steel export invoice. That cost grows every year from 2026 to 2034. In the buyer's office in Hamburg the same line is printed, and the buyer chooses the supplier that sent its own data. The film ends: "Duty is printed. CBAM isn't."

Every number matches the live calculator: 100 t, Iron & Steel BF-BOF, India, €82.32. Sources are in the code comments. The film makes no claim that Senseible provides CBAM verification.

```sh
python3 sfx4.py && bash cbrender.sh
```

Reels cut (15 s): `QS="&cut=reel" FILE=cbam.html DUR=15 node render.mjs video portrait rl.mp4`, then mux `sfx4-reel.wav` (sfx4.wav cut to the same beats).

## "You can't underwrite fog": lender film (90 s, 16:9) and 30 s teaser (9:16)
Sources are in the HTML comments of `fog.html`. The record is labelled illustrative. No lender or partner is named.

## "Will revert by EOD": enterprise Scope 3 film (70 s, 16:9) and 20 s cut (9:16)
Every claim quotes the Enterprise page (sources in the comments of `revert.html`). No self-serve supplier portal is shown. The replies are fiction played for comedy.

## "Read the label": credibility film (37.5 s, 9:16 and 16:9)
Do not publish until the CEA edition of the 0.710 grid factor is confirmed (FACTOR_SOURCE constant at the top of `label.html`).

## "Same bill, different line": green-loan film (51 s, 9:16 and 16:9)
The KYC fact (an electricity bill is accepted as address proof) is sourced to the RBI KYC Master Direction in the comments of `samebill.html`. The bill is fictional. Check the Bank Disclosure Report on the live site before publishing.

## Guide 2: your first carbon report (93 s, `guide2.html`)
- **Upload, Read, Check:** match the live site on 15 Oct 2026 (sample bill: 3,412.56 kg, which uses the live factor 0.708).
- **Save, Use:** built from code (guest import prompt, Dashboard, Reports, Monetize).
- **When extract-document is redeployed with 0.710:** re-check the live site and re-render.
