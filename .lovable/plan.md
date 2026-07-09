# Plan

Two independent workstreams. Both preserve existing architecture, routing, and data model.

---

## 1. Fix "Verification failed" (MRV pipeline)

### Root cause (confirmed from edge logs + DB)

Edge log: `Ownership mismatch: emission e1591082… does not belong to requester`.

The failing emission has `user_id = null`, `session_id = c5327400-…` — it was created as a guest, then the user signed in on the same browser. The client still shows it (because `useEmissions` matches by session), and sends both `sessionId` and the authenticated JWT to `verify-carbon`.

`supabase/functions/verify-carbon/index.ts` currently does:

```ts
const sessionId = userId ? null : (bodySessionId || null);
```

As soon as a user is authenticated it **discards** `bodySessionId`, then requires `emission.user_id === userId`. Guest-owned rows can never pass — the verify call throws → toast "Verification failed. Please try again." No verification row is ever written, so History/Reports/Monetize never get an outcome.

### Fix (surgical, no architecture change)

Edit only `supabase/functions/verify-carbon/index.ts`:

1. Keep `bodySessionId` available even when `userId` is present.
2. Ownership check passes if **either**:
  - `emission.user_id === userId`, **or**
  - `bodySessionId && emission.session_id === bodySessionId` (same browser that created it).
3. When an authenticated user successfully verifies a guest-owned emission, adopt it: `UPDATE emissions SET user_id = <userId> WHERE id IN (...) AND user_id IS NULL AND session_id = <bodySessionId>` before the verified flag update. Same adoption pattern for the linked `documents` row (id from `emission.document_id`) so History/Reports show it under the user.
4. Persist `carbon_verifications.user_id = userId` (already correct) and `session_id = bodySessionId` when adoption happened, so the audit trail is intact.
5. Guarantee an outcome on unrecoverable errors: wrap the AI-recommendations block and compliance-ledger inserts in try/catch (AI block already is; ledger inserts are looped but a single throw would still bubble — confirm each insert is inside its own try/catch, which it already is). No behavior change needed there, just verify.
6. Return HTTP 200 with `{ success: true, data: { status: 'rejected', ... } }` for validation-failure cases instead of 400/500 whenever emissions were fetched successfully — so the UI always renders an outcome card (verified / needs_review / rejected) instead of a generic toast.
7. For guest user always output even cached data end to end without failing,

Client-side (`src/pages/Verify.tsx`): no change to the happy path. Only tighten the catch: if `data?.success === false` or `error` present, still show a rejected result card with the server message, not just a toast — this matches the "must give outcome even null or rejection" requirement.

### Downstream (already wired, will start working once verification succeeds)

- `useEffect` on `verificationResult` triggers monetization preview.
- `refetch()` reloads emissions → Dashboard/History pick up `verified=true`.
- `compliance_ledger` inserts run inside the function → Reports page reads them.
No changes needed in Dashboard/History/Monetize/Reports.

### Verification steps

- `psql` check: run the failing emission id, confirm `user_id` gets set after a successful verify.
- Playwright: sign in, land on `/verify`, click Verify All → screenshot the result card (verified or rejected), then `/history` and `/reports` should show the row.
- Edge logs: no more "Ownership mismatch" entries.

### Files touched

- `supabase/functions/verify-carbon/index.ts` (ownership + adoption + always-200 outcome)
- `src/pages/Verify.tsx` (render rejected outcome from server payload instead of only a toast)

Nothing else in the MRV pipeline is broken from the logs. Extraction, ledger, monetization code paths are intact; they simply never run today because verification 403s.

---

## 2. Careers page — deliberate color/type system + copy trim

Architecture, routes, data (`careersRoles.ts`), i18n keys, apply flow (fresher → Google Form, others → email + platform video) all stay identical. This is a visual-hierarchy + copy pass only.

### Color & type system (uses existing tokens, no new palette)

Introduce a small pacing system inside `Careers.tsx` — no new global tokens:

- **Section rhythm**: alternating `bg-background` → `bg-muted/30` → `bg-background` → single accent band (`bg-primary text-primary-foreground`) for the Apply section. One saturated moment, everything else quiet.
- **Type scale (locked to existing font stack)**:
  - Manifesto / hero: `text-[clamp(2.75rem,6vw,5.5rem)] leading-[1.05] tracking-[-0.03em] font-medium`
  - Section leads: `text-[clamp(2rem,3.5vw,3.25rem)] leading-[1.1] tracking-[-0.02em]`
  - Body lead: `text-lg md:text-xl text-muted-foreground leading-relaxed max-w-[62ch]`
  - Micro-eyebrow: `text-xs uppercase tracking-[0.18em] text-muted-foreground`
- **Contrast rules**: only `text-foreground` / `text-muted-foreground` / `text-primary-foreground` — remove any lingering arbitrary greys. Meets WCAG AA in both themes.
- **Emphasis**: single accent color (`text-primary`) reserved for numbers that matter (400M, 47s, 11) and the Apply band. No accent on decorative elements.
- **Spacing**: sections use `py-24 md:py-32`, hero `min-h-[85vh]`. Consistent `max-w-6xl` container.

### Copy trim (remove AI-sounding phrasing)

Pass every string through a "would a builder actually say this?" filter. Concrete deletions/rewrites in `en.json` `careers.*` keys:

- Cut: "we're building the future", "passionate team", "world-class", "shape the future", "join us on this journey", any exclamation marks, any triple-adjective stacks.
- Replace hero manifesto with a shorter, concrete opening (2 lines, not 4).
- "Why it matters" — trim each of the 3 blocks to one sentence + one number. No filler.
- "How we work" (We do / We don't) — keep, but make each line ≤ 9 words. Currently reads like a values doc.
- "Belonging" — remove the "we recognise the whole you" heading (feels HR-generated); replace with a one-line frame around the 11-language glyph row.
- "Straight answers" FAQs — rewrite in candidate voice, cut every "at Senseible we…" opener.
- Apply band — one sentence, two actions (fresher form, everyone else email + platform link). No secondary paragraph.

Only English strings change. Other locales already fall back to English per the existing pattern; no re-translation forced.

### Files touched

- `src/pages/Careers.tsx` (typography scale, section rhythm, accent band, remove templated blocks)
- `src/lib/i18n/translations/en.json` (`careers.*` copy trims only)

Not touched: `careersRoles.ts`, `Footer.tsx`, `MinimalNav.tsx`, `App.tsx`, `index.css`, `tailwind.config.ts`, other locale JSONs, any platform/Supabase code.

### Verification

- `tsgo` clean, `bun run build` exits 0.
- Playwright at 1280×1800 and 375×812 — screenshot hero, "Why it matters", roles, apply band. Confirm one saturated section only, consistent type scale, no orphan grey utilities.
- Toggle `prefers-reduced-motion: reduce` — no motion regressions (existing keyframes already respect it via `MinimalNav` / global CSS).

Chat Output: In chat along with summary of what deployed; include colour codes & fonts used on Senseible platform as brand theme.

---

## Out of scope (explicit)

- No changes to extraction pipeline, HSN lookup, emission factors, `extract-document`, `calculate-monetization`, RLS, or DB schema.
- No new design tokens, no palette change, no new fonts.
- No changes to any other page.