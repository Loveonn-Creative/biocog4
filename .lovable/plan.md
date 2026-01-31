

# Critical Fixes: OCR-to-MRV-to-Monetize Pipeline

## Verified Issues from Code Analysis

### Issue 1: Guest User Gets Different Results for Same Invoice (CRITICAL BUG)

**Root Cause Identified:**
The OCR extraction uses Gemini AI models which have inherent non-determinism. Even with "deterministic" rule-based classification after OCR, the AI model returns **different line item extractions** each time for the same document.

Looking at lines 792-793 of `extract-document/index.ts`:
```typescript
content = await extractWithAI(imageBase64, mimeType || 'image/jpeg', LOVABLE_API_KEY, 'google/gemini-2.5-flash');
```

The AI extraction produces varying results (different quantities, line item parsing), which then feeds into the deterministic calculation. **Same input image -> Different AI OCR output -> Different calculated CO2 values**.

**Fix Required:**
1. For guest users: Cache the OCR result by document hash and return the same result on repeat uploads
2. The claim "deterministic" only applies to calculations AFTER OCR - the OCR itself is non-deterministic

### Issue 2: "Continue to Verify" Goes to Dummy Page

**Root Cause Identified:**
In `Index.tsx` line 449-456:
```typescript
const handleConfirm = () => {
  toast.success("Saved! Your carbon data has been recorded.");
  if (result?.emissionId) {
    navigate(`/verify?emission=${result.emissionId}`);
  } else {
    navigate('/verify');
  }
};
```

The `Verify.tsx` page at lines 64-91 only fetches unverified emissions from the database. If:
- The emission was already saved but the user has no active session
- The session_id doesn't match what's in the database
- The query filter returns empty

...then the Verify page shows "No emissions data yet" and an upload button (lines 218-222).

**Fix Required:**
1. Pass extracted data directly to Verify page via state when navigating
2. Improve session continuity between pages
3. Add fallback to display the emission data that was just saved

### Issue 3: Dashboard Shows 100% Score but 0,0,0 Values

**Root Cause Identified:**
1. `verificationScore` is fetched from `carbon_verifications` table (line 82-105 of Dashboard.tsx)
2. Scope values come from `useEmissions()` which queries `emissions` table

If there's a verification record but no emissions linked, or if the session_id mismatch prevents loading emissions:
- `verificationScore` shows 100% from previous verification
- `summary.scope1/2/3` all return 0 because no emissions are found

**Fix Required:**
1. Ensure session continuity - emissions and verifications must query with the same session
2. Show verification score only when emissions exist
3. Add validation that score reflects actual computed data

### Issue 4: Partner Pricing Shows MSME Tiers (ALREADY FIXED)

**Code Analysis Shows Fix IS Implemented:**
In `Pricing.tsx` lines 59-61 and 416:
```typescript
const isPartnerContext = activeContext?.context_type === 'partner';
// ...
{isPartnerContext ? (
  <section>...</section>  // Partner tiers rendered
) : (
  // MSME tiers
)}
```

**The code exists but may not be triggering because:**
- `activeContext` is null or undefined when the page loads
- Partner signup doesn't correctly set `context_type: 'partner'`
- User context switching isn't persisting

**Fix Required:**
1. Verify partner signup creates correct user_context record
2. Add loading state check before showing pricing
3. Ensure `useOrganization()` returns the correct context

### Issue 5: "Add Payment Method" Button Disabled in Billing

**Root Cause Identified:**
In `Billing.tsx` line 275-278:
```typescript
<Button variant="outline" size="sm" disabled>
  <Plus className="w-4 h-4 mr-1" />
  Add
</Button>
```

The button is **hardcoded as disabled**. This is intentional per the comment "Cards are saved during checkout" but the user expects to add cards directly.

**Fix Required:**
1. Either implement add payment method flow via Razorpay tokenization
2. Or make the disabled state clearer with explanation

---

## Implementation Plan

### Phase 1: Fix OCR Determinism for Guest Users

**File: `supabase/functions/extract-document/index.ts`**

Add in-memory cache or session-based cache for guest users:

```typescript
// After generating document hash (line ~690)
const documentHash = await generateDocumentHash(imageBase64, mimeType || 'image/jpeg');

// For guest users: Check if we have a cached result for this hash
if (!isAuthenticated) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl!, supabaseKey!);
  
  // Check for any existing document with this hash
  const { data: existingDoc } = await supabase
    .from('documents')
    .select('cached_result, document_hash')
    .eq('document_hash', documentHash)
    .not('cached_result', 'is', null)
    .limit(1)
    .single();
  
  if (existingDoc?.cached_result) {
    console.log(`Guest user: Returning cached result for hash ${documentHash.substring(0, 16)}...`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: existingDoc.cached_result,
        documentHash,
        userTier: 'guest',
        cached: true,
        message: 'Returning consistent results for this invoice.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
```

Also: Cache ALL processed results (not just paid users) so same invoice returns same result:

```typescript
// In the database insert (in Index.tsx saveToDatabase function)
cached_result: extractedData,  // Always cache, not just for paid users
```

### Phase 2: Fix Verify Page Navigation

**File: `src/pages/Index.tsx`**

Pass extracted data via navigation state:

```typescript
const handleConfirm = () => {
  toast.success("Saved! Your carbon data has been recorded.");
  // Pass data directly to verify page
  navigate('/verify', { 
    state: { 
      emissionId: result?.emissionId,
      documentId: result?.documentId,
      extractedData: result?.extractedData,
      fromUpload: true
    }
  });
};
```

**File: `src/pages/Verify.tsx`**

Receive and use navigation state:

```typescript
import { useLocation } from 'react-router-dom';

const location = useLocation();
const navState = location.state as { emissionId?: string; extractedData?: any; fromUpload?: boolean } | null;

// If coming from upload, show the just-uploaded data
const [justUploaded, setJustUploaded] = useState(navState?.extractedData || null);

// In the UI, show justUploaded data if emissions array is empty
{unverified.length > 0 || justUploaded ? (
  // Show emissions for verification
) : (
  // Show upload prompt
)}
```

### Phase 3: Fix Dashboard Score/Values Mismatch

**File: `src/pages/Dashboard.tsx`**

Only show verification score if there are actual emissions:

```typescript
// Line 203-210
<VerificationStatusCard
  verificationScore={emissions.length > 0 ? verificationScore : 0}
  totalEmissions={summary.total}
  unverifiedCount={unverifiedEmissions.length}
  hasVerifiedData={verifiedEmissions.length > 0}
  latestStatus={emissions.length > 0 ? latestStatus : null}
  eligibleCredits={emissions.length > 0 ? eligibleCredits : 0}
/>
```

### Phase 4: Fix Partner Context Detection

**File: `src/pages/Pricing.tsx`**

Add explicit context loading check:

```typescript
const { activeContext, isLoading: contextLoading } = useOrganization();

// Show loading while context is being determined
if (contextLoading) {
  return <LoadingSkeleton />;
}

const isPartnerContext = activeContext?.context_type === 'partner';
```

**File: `src/hooks/useOrganization.ts`**

Verify the hook correctly returns loading state and context.

### Phase 5: Enable Add Payment Method

**File: `src/pages/Billing.tsx`**

Replace disabled button with functional implementation or clearer messaging:

```typescript
<Button 
  variant="outline" 
  size="sm"
  onClick={() => toast.info('Payment methods are saved automatically during checkout. Make a payment to save your card.')}
>
  <Plus className="w-4 h-4 mr-1" />
  Add
</Button>
```

### Phase 6: Add Session Continuity Check

**File: `src/hooks/useSession.ts`**

Ensure session is persisted and restored correctly across page navigations.

---

## New Features to Add

### Bulk Upload with Deduplication Summary

**New Component: `src/components/BulkUpload.tsx`**

- Accept multiple files
- Generate hash for each
- Check for duplicates
- Show summary: "3 new, 2 duplicates skipped"
- Process new files in parallel

### History Page Charts

**File: `src/pages/History.tsx`**

Add emissions trend chart using existing recharts:

```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Add date range filter
const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);

// Add trend chart section
<Card className="mb-6">
  <CardHeader>Emissions Trend</CardHeader>
  <CardContent>
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={trendData}>
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="co2" stroke="#10b981" />
      </LineChart>
    </ResponsiveContainer>
  </CardContent>
</Card>
```

### Visual Indicator for Previously Processed Documents

**File: `src/pages/Index.tsx`**

Add indicator when document hash is recognized:

```typescript
// After receiving OCR response
if (data?.cached) {
  toast.info("This invoice was previously processed. Showing cached results for accuracy.", {
    duration: 5000,
    icon: "🔒"
  });
}
```

---

## File Changes Summary

| File | Change Type | Purpose |
|------|-------------|---------|
| supabase/functions/extract-document/index.ts | EDIT | Add guest user caching for determinism |
| src/pages/Index.tsx | EDIT | Pass state to Verify, show cache indicator |
| src/pages/Verify.tsx | EDIT | Accept nav state, handle just-uploaded data |
| src/pages/Dashboard.tsx | EDIT | Fix score/value consistency |
| src/pages/Pricing.tsx | EDIT | Add context loading check |
| src/pages/Billing.tsx | EDIT | Improve add payment UX |
| src/pages/History.tsx | EDIT | Add charts and date filtering |
| src/hooks/useOrganization.ts | EDIT | Verify loading state export |
| src/components/BulkUpload.tsx | CREATE | Multi-file upload with deduplication |

---

## Performance Guarantees

- No new dependencies
- All changes use existing patterns
- Lazy loading maintained
- No core logic changes that would affect existing flows
- All fixes are additive/corrective

---

## Testing Checklist

1. Upload same invoice as guest 5+ times - verify identical CO2 values
2. Click "Continue to Verify" - verify emissions appear on Verify page
3. Check Dashboard after upload - verify score matches actual values
4. Sign up as partner - verify Pricing shows Enterprise tiers
5. Check Billing page - verify Add button provides clear guidance
6. Upload multiple invoices - verify deduplication works
7. View History - verify charts render and date filter works

