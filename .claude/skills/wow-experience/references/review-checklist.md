# Self-review checklist

Run this on the rendered result before finishing. Each item is pass or fix.

## Flow
- [ ] The page's one action is obvious within five seconds, on phone and desktop.
- [ ] Every section moves the visitor toward that action or answers a doubt they have at that point. Nothing is there "because pages usually have it".
- [ ] Every link and button goes somewhere real; no dead ends, no broken anchors, no 404s.
- [ ] What happens after the click is clear: success state, error state, next screen or email.
- [ ] Forms: only necessary fields, labels present, inline errors in plain words, a clear success message.

## Visual
- [ ] Spacing follows one scale; no cramped or randomly large gaps; sections align to the same grid.
- [ ] Text contrast meets WCAG AA in every theme the site supports; no grey-on-grey.
- [ ] One dominant element per section; the primary CTA wins against every other control.
- [ ] No horizontal scroll at 390px; tap targets at least 44px; nothing overlaps or clips.
- [ ] No generic patterns that could belong to any brand (identical card grids, stock hero, icon walls).

## Motion
- [ ] Hover, press, reveal and loading states exist and are quick (about 150 to 600ms).
- [ ] Each animation explains something; nothing loops or moves without purpose.
- [ ] `prefers-reduced-motion` shows the complete still state.
- [ ] No layout shift from animation; first paint is not delayed by motion code.

## Copy
- [ ] Every claim, number and name is real and traceable to a source; nothing invented or placeholder.
- [ ] CTAs say what happens ("Get my estimate"), not "Learn more", "Submit" or "Click here".
- [ ] Reads like a person talking to one customer: short sentences, concrete nouns, active verbs.
- [ ] None of the AI tells below remain.

### AI tells to remove
Phrases: "unlock", "unleash", "elevate", "empower", "seamless", "seamlessly", "cutting-edge", "game-changer", "revolutionize", "supercharge", "leverage" (as a verb for people), "harness the power of", "in today's fast-paced world", "in the ever-evolving landscape", "look no further", "whether you're X or Y", "take your X to the next level", "it's not just X, it's Y", "we've got you covered", "dive in", "delve", "navigate the complexities", "robust", "holistic", "synergy", "best-in-class", "world-class", "one-stop shop", "next-gen".

Patterns:
- Em dashes used for drama (use a comma, a full stop or a colon).
- Triplets of adjectives or benefits added for rhythm ("fast, simple, and powerful").
- Rhetorical questions as openers ("Tired of spreadsheets?").
- Headlines that describe the company instead of the visitor's outcome.
- Emojis in product or page copy (unless the brand uses them on purpose).
- Exclamation marks to manufacture excitement.
- Closing lines that restate the paragraph.

## Before shipping
- [ ] The project's own rules (AGENTS.md, brand and copy docs) are met.
- [ ] Build, tests and any SEO or accessibility gates pass.
- [ ] The user has approved this specific deploy, or a standing instruction covers it, and you have said exactly what will ship.
