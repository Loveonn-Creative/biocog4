# MRV → Monetize Pipeline: End-to-End Audit

## Audit Summary

After reviewing all pipeline files (`extract-document`, `verify-carbon`, `Index.tsx`, `Dashboard.tsx`, `MRVDashboard.tsx`, `credibilityScore.ts`, `govComplianceAdapter.ts`), the pipeline is **architecturally sound** with deterministic math, SHA-256 hashing, and rule-based classification. However, there are **5 gaps** that need closing.

---

## What's Working Correctly


| Layer                      | Status        | Evidence                                                                  |
| -------------------------- | ------------- | ------------------------------------------------------------------------- |
| OCR → Data Extraction      | Solid         | AI extracts fields only; `temperature: 0` prevents variability            |
| Classification             | Deterministic | HSN lookup → Keyword fallback → UNVERIFIABLE (no AI guessing)             |
| Emission Calculation       | Math-only     | `Quantity × Factor = CO2` with fixed BIOCOG_MVR_INDIA_v1.0 factors        |
| Confidence Scoring         | Deterministic | Fixed penalty system (CONFIDENCE_PENALTIES), same input = same score      |
| Document Hashing           | SHA-256       | Hash generated before any processing; used for dedup                      |
| Duplicate Detection (Auth) | Working       | Paid users get cached result; free users blocked with clear message       |
| Guest Caching              | Working       | Same hash returns same cached result for guests                           |
| Real-time Updates          | Working       | Dashboard subscribes to `carbon_verifications` + `emissions` tables       |
| Compliance Ledger          | Working       | Auto-populated during verification with full audit trail                  |
| Greenwashing Detection     | Working       | Multi-signal risk scoring (perfect numbers, missing docs, low confidence) |


---

## Gap 1: Document Not Recorded Before MRV for Guest Users (CRITICAL)

**Problem**: For guest users, the edge function caches the document at the END of processing (line 1159). But `Index.tsx` then calls `saveEmissionToDatabase` which tries to find the document by hash (line 206). If the edge function's cache insert fails silently, the client creates a NEW document record (line 234) — but the emission is saved without the original document being permanently recorded first.

**The sequence should be**: Record document → Run MRV → Save emission (linked to document).

**Current sequence**: OCR → Classify → Calculate → Cache document → Client finds/creates document → Save emission.

**Fix**: In `extract-document/index.ts`, move the document cache insert BEFORE the AI extraction for guests. Insert a stub record with just `document_hash` and `session_id` immediately after hash generation. Then update it with `cached_result` after processing completes. This ensures every invoice is a permanent system entry before MRV begins.

**File**: `supabase/functions/extract-document/index.ts`

---

## Gap 2: No Duplicate Detection for Guest Users Uploading Same Invoice

**Problem**: Authenticated users have duplicate detection (line 810-850). Guest users only get cache hits (same result returned), but the system still creates a NEW document + emission record each time. This means a guest can inflate their dashboard numbers by re-uploading the same invoice.

**Fix**: In `Index.tsx` `saveEmissionToDatabase`, before inserting a new emission, check if an emission already exists for this `document_id` (found via hash). If yes, skip the emission insert and return the existing IDs. Add a toast: "This invoice was already processed."

**File**: `src/pages/Index.tsx` (in `saveEmissionToDatabase`)

---

## Gap 3: Verification Errors Not Surfaced with Precise Guidance

**Problem**: When `verify-carbon` returns validation flags like "Missing or invalid activity data" or "Missing activity unit", these are stored in `ai_analysis.flags` but never shown to the MSME user in a clear, actionable way. The MRV Dashboard shows verification status but not the specific math-based reason why a record failed.

**Current**: User sees "needs_review" badge. No explanation of WHY.

**Fix**: In `MRVDashboard.tsx`, when rendering each verification, extract `ai_analysis.flags` and display them as a collapsible list with precise guidance. Map each flag to an actionable message:

- "Missing or invalid activity data" → "The quantity (litres/kWh/kg) was not detected on this invoice. Upload a clearer scan showing the quantity."
- "Missing activity unit" → "The unit of measurement could not be identified. Ensure the invoice shows units like litres, kWh, or kg."
- "Low OCR confidence" → "The document quality is poor. Try scanning with better lighting or a higher resolution."

**File**: `src/pages/MRVDashboard.tsx`

---

## Gap 4: Emission Save Can Silently Fail Without User Recovery Path

**Problem**: In `Index.tsx` line 401-407, if `saveEmissionToDatabase` returns null, the user sees "Failed to save data. Please try again." but the result screen still shows with the calculated CO2 value. The user thinks processing succeeded but no data was persisted. The result is ephemeral — lost on page reload.

**Fix**: If `savedIds` is null, do NOT proceed to the result screen. Instead, show an error state with a "Retry" button that re-attempts the save with the already-extracted data (no re-OCR needed). Store `extractedData` in component state so retry is instant.

**File**: `src/pages/Index.tsx`

---

## Gap 5: Dashboard Emissions Real-time Channel Missing Filter

**Problem**: The Dashboard's real-time subscription (line 68-94) listens to ALL `carbon_verifications` and `emissions` changes without filtering by `user_id` or `session_id`. This means the callback fires for every user's data, causing unnecessary refetches. At scale, this degrades performance.

**Fix**: Add a filter to the subscription:

```typescript
filter: user?.id ? `user_id=eq.${user.id}` : `session_id=eq.${sessionId}`
```

**File**: `src/pages/Dashboard.tsx`

---

## Files Summary (4 files)


| File                                           | Change                                             | Priority |
| ---------------------------------------------- | -------------------------------------------------- | -------- |
| `supabase/functions/extract-document/index.ts` | Insert document stub before processing             | Critical |
| `src/pages/Index.tsx`                          | Guest dedup check + save-failure recovery          | Critical |
| `src/pages/MRVDashboard.tsx`                   | Surface validation flags with actionable guidance  | High     |
| `src/pages/Dashboard.tsx`                      | Add user/session filter to real-time subscriptions | Medium   |


## What Does NOT Change

- Emission factors, BIOCOG_MVR_INDIA_v1.0 methodology
- SHA-256 hashing logic
- HSN/Keyword classification rules
- Confidence scoring penalties
- Greenwashing detection algorithm
- Compliance ledger population
- Authentication, RLS policies
- Any existing UI text or page structure
- Guest user multiple scanning and testing of platform without lagging
- Making platform more efficient for paid users