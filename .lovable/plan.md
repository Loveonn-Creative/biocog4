
# Fix Plan: Data Persistence & MRV Pipeline Reliability

## Problem Summary

After investigation, I've identified a **critical data synchronization bug** in the invoice-to-MRV pipeline. While the OCR extraction and CO₂ calculations are mathematically correct (your 5,000L diesel invoice correctly calculates to 13,400 kg CO₂ and ₹10,050 carbon credit value), the data is NOT being properly linked to your session when saved.

## Root Cause Analysis

### Issue 1: Session-Document Mismatch

The edge function (`extract-document`) saves documents to the database **without a session_id for guest users**:

```typescript
// Current problematic code (line 1016-1026):
await supabase.from('documents').insert({
  document_hash: documentHash,
  user_id: userId,  // NULL for guests
  // session_id is MISSING entirely!
})
```

This means guest user documents are orphaned in the database with no owner.

### Issue 2: Client-Side Update Fails

When `Index.tsx` tries to update the document with session info (lines 162-170), the RLS policy blocks it because:
- RLS requires `session_id` to match on UPDATE
- The document has no `session_id` set, so the update fails silently

### Issue 3: Emissions Saved But Inaccessible

Emissions ARE being saved correctly, but queries in `useEmissions.ts` and `useDocuments.ts` filter by:
```typescript
query.eq('session_id', sessionId)  // Guest users
query.eq('user_id', user.id)       // Signed-in users
```

If the session_id wasn't saved to the document/emission, it won't appear.

## Carbon Credit Math Validation

Your invoice's calculation is **correct and deterministic**:

| Field | Value | Source |
|-------|-------|--------|
| Document | PQR Chemicals Fuel Invoice | OCR |
| Fuel Type | High-Speed Diesel (HSD) | Keyword Detection |
| Quantity | 5,000 liters | OCR Extraction |
| Emission Factor | 2.68 kg CO₂e/L | BIOCOG_MVR_INDIA_v1.0 |
| CO₂ Emissions | 5,000 × 2.68 = **13,400 kg** | Deterministic Calculation |
| Credit Rate | ₹750/tonne | Fixed Platform Rate |
| Carbon Credit Value | 13.4 t × ₹750 = **₹10,050** | Deterministic |

The math is correct. The issue is data not reaching downstream pages.

## Implementation Plan

### Step 1: Fix Edge Function Session Handling

Modify `supabase/functions/extract-document/index.ts` to:
- Accept `sessionId` from the request body (client sends it)
- Save documents WITH `session_id` for guest users
- Ensure all cached documents have proper ownership

### Step 2: Update Client to Pass Session ID

Modify `src/pages/Index.tsx` to:
- Include `sessionId` in the edge function call
- Verify database save succeeded before showing success toast
- Add error handling when saves fail

### Step 3: Add Session Validation on Client

Modify `src/hooks/useSession.ts` to:
- Verify session exists before using cached session_id
- Handle session recovery gracefully
- Log session state changes for debugging

### Step 4: Fix RLS Policy Gap

Add a migration to ensure:
- Guest users can properly access their session-linked data
- No orphaned documents exist without ownership

### Step 5: Add Data Recovery Logic

Create logic to:
- Detect orphaned documents (those with `document_hash` but no `session_id`)
- Associate them with the current session on next upload of same document

## Technical Implementation Details

### Files to Modify

| File | Change | Purpose |
|------|--------|---------|
| `supabase/functions/extract-document/index.ts` | Add sessionId parameter, save with session | Link guest documents to session |
| `src/pages/Index.tsx` | Pass sessionId to edge function | Enable session-aware caching |
| `src/hooks/useSession.ts` | Add session validation logging | Debug session issues |
| Database Migration | Update documents table policies | Fix RLS access gap |

### Edge Function Fix (Key Change)

```typescript
// Accept sessionId from client
const { imageBase64, mimeType, sessionId } = await req.json();

// When caching document, include session_id
await supabase.from('documents').insert({
  document_hash: documentHash,
  user_id: userId,
  session_id: isAuthenticated ? null : sessionId, // ADD THIS
  // ... rest of fields
});
```

### Client Fix (Key Change)

```typescript
// In processDocument function:
const { data, error } = await supabase.functions.invoke('extract-document', {
  body: { 
    imageBase64, 
    mimeType,
    sessionId // ADD THIS - pass session to edge function
  }
});
```

## Expected Outcomes After Fix

1. **Dashboard**: Will show emissions summary with scope breakdown
2. **History**: Will list all processed invoices with vendor, amount, CO₂
3. **MRV**: Will show pending/verified emissions with proper counts
4. **Verify**: Will populate with unverified emissions immediately after upload
5. **Monetize**: Will calculate credit value from verified emissions

## Verification Tests

After implementation:

1. Upload the PQR Chemicals invoice as guest
2. Verify "Continue to Verify" navigates with data
3. Check History page shows the document
4. Check Dashboard shows 13,400 kg in Scope 1
5. Sign in and verify data persists (merge-session logic)
6. Upload same invoice again - should show duplicate detection

## Calculation Transparency

For the attached invoice, here's the complete audit trail:

```text
Invoice: FUEL/2024-0120
Vendor: ABC Petroleum → PQR Chemicals
Product: High-Speed Diesel (HSD)
Quantity: 5,000 liters (explicitly stated)
Unit Price: ₹86.50/L
Subtotal: ₹4,32,500
GST: ₹77,850 (CGST + SGST @ 18%)
Total: ₹5,10,350

BIOCOG MRV Calculation:
├─ Classification: HSN 27 → FUEL → Scope 1
├─ Emission Factor: 2.68 kg CO₂e/litre (DIESEL)
├─ CO₂ = 5,000 × 2.68 = 13,400 kg
└─ Credit Value = 13.4 tCO₂e × ₹750 = ₹10,050
```

This calculation is **deterministic** - same invoice will always produce same result.
