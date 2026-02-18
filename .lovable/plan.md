

# Fix: Invoice Data Not Appearing on Dashboard, History, or MRV

## Root Cause Identified

The `documents.confidence` column has a database constraint of `numeric(3,2)`, which only accepts values from 0.00 to 9.99. However, the OCR pipeline sends confidence as a whole-number percentage (e.g., 40, 80, 100). This causes a **"numeric field overflow"** error that silently breaks the entire save pipeline.

Evidence from the edge function logs:
```
Failed to cache result: { code: "22003", details: "A field with precision 3, scale 2 must round to an absolute value less than 10^1.", message: "numeric field overflow" }
```

Evidence from the database: the current session (`013c59d5...`) has **zero documents and zero emissions** despite successfully processing invoices through OCR.

## How This Breaks Everything

```text
Upload -> OCR (works) -> Edge Function saves document with confidence=40 -> OVERFLOW ERROR
  -> Client looks up document by hash -> NOT FOUND (never inserted)
  -> Client fallback creates document -> SAME OVERFLOW ERROR -> FAILS
  -> Emission insert has no document_id -> FAILS or orphaned
  -> Dashboard, History, MRV all show EMPTY
```

## Fix Plan

### 1. Database Migration: Widen the `confidence` column

Change `documents.confidence` from `numeric(3,2)` to `numeric(5,2)`, which supports values up to 999.99 (more than enough for 0-100 percentages).

```sql
ALTER TABLE public.documents ALTER COLUMN confidence TYPE numeric(5,2);
```

This is a non-destructive change -- all existing data remains intact.

### 2. Edge Function: Add confidence normalization safety

Add a guard in `extract-document/index.ts` to clamp confidence before inserting, ensuring it never overflows even if the column type is ever reverted:

```typescript
confidence: Math.min(extractedData.confidence, 999.99),
```

### 3. Client-side: Same guard in Index.tsx fallback insert

In `saveEmissionToDatabase`, add the same confidence clamp on the fallback document creation path.

## Files to Modify

| File | Action | Change |
|------|--------|--------|
| Database Migration | CREATE | `ALTER COLUMN confidence TYPE numeric(5,2)` |
| `supabase/functions/extract-document/index.ts` | EDIT | Clamp confidence value before DB insert |
| `src/pages/Index.tsx` | EDIT | Clamp confidence in fallback document creation |

## What This Fixes

- All invoices (guest and paid) will be saved to the database correctly
- Documents will appear in History with proper status badges (Verified, Processed, Review)
- Emissions will appear on Dashboard with scope breakdown and trend charts
- MRV Dashboard will show verification data and green scores
- The entire pipeline from upload to display will work end-to-end

## What Does NOT Change

- OCR pipeline logic and deterministic math
- Emission factors, scope mapping, and category classification
- Page layouts, navigation, and component hierarchy
- RLS policies and security model
- Enterprise mode behavior
- Green invoice verification architecture

