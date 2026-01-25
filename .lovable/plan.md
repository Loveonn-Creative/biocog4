
# Platform-Wide Role-Based UX, Personalization, and Footer Consistency Enhancement

## Executive Summary

This plan addresses systemic UX inconsistencies, implements role-based routing for partners, enhances personalization, standardizes footers across all pages, and adds intelligent OCR feedback for irrelevant images. All changes maintain existing page speed and core functionality.

---

## Current State Analysis

### What Already Works Correctly

| Feature | Status | Location |
|---------|--------|----------|
| Auth-aware homepage footer | Implemented | `Index.tsx` lines 539-554 |
| Auth-aware HomeNavIcons menu | Implemented | `HomeNavIcons.tsx` lines 28-51 |
| Auth-aware main Footer | Implemented | `Footer.tsx` with `useSession()` |
| Partner Dashboard access control | Implemented | `PartnerDashboard.tsx` |
| CMS Admin access control | Implemented | `CMSAdmin.tsx` (admin-only) |
| Personalization hook | Implemented | `usePersonalization.ts` |
| Document relevance detection | Implemented | `extract-document/index.ts` lines 258-300 |
| SecondaryFooter component | Implemented | `SecondaryFooter.tsx` |

### Issues Requiring Fixes

| Issue | Root Cause | Impact |
|-------|-----------|--------|
| Partners redirect to /dashboard not /partner-dashboard | Auth.tsx line 86, 155, 161 hardcodes `/dashboard` | Partners see MSME view after login |
| Personalization not used in all headers | Only Navigation.tsx uses it | Inconsistent greeting experience |
| SecondaryFooter missing from Pricing, Legal, Partners | Not imported in these pages | Inconsistent legal footer |
| OCR lacks humorous feedback for irrelevant images | `isDocumentRelevant()` returns plain messages | Missed engagement opportunity |
| Footer columns not organized (Industries under Legal) | `Footer.tsx` structure | Confusing navigation |

---

## Implementation Plan

### Phase 1: Role-Based Login Redirect

**File**: `src/pages/Auth.tsx`

Add context-aware redirect after sign-in that checks user's active context:

```text
After successful sign-in (line 84-87):
1. Check user_contexts table for active partner context
2. If partner context exists and is_active = true → redirect to /partner-dashboard  
3. Otherwise → redirect to /dashboard
```

**Changes**:
- Add helper function `getRedirectPath(userId)` that queries `user_contexts`
- Update sign-in success handler to use dynamic redirect
- Update sign-up success handler to use dynamic redirect

```typescript
// New function to add
const getRedirectPath = async (userId: string): Promise<string> => {
  const { data } = await supabase
    .from('user_contexts')
    .select('context_type, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  
  if (data?.context_type === 'partner') {
    return '/partner-dashboard';
  }
  return '/dashboard';
};

// Update sign-in handler (around line 84)
if (data.user) {
  const redirectPath = await getRedirectPath(data.user.id);
  toast.success("Welcome back! Redirecting...");
  navigate(redirectPath);
}
```

---

### Phase 2: Reorganize Footer Columns

**File**: `src/components/Footer.tsx`

Restructure footer links to have clearer columns:

```text
Current structure:
- Platform: Climate Intelligence, Pricing, Contact, [Sign In/Dashboard]
- Company: Mission, About, Principles
- Legal: Terms, Privacy, DPA, Industries ← WRONG

New structure:
- Platform: Climate Intelligence, Marketplace, Pricing, [Sign In/Dashboard]
- Solutions: Green Loans, Industries, Carbon Credits  
- Company: Mission, About, Principles, Contact
- Legal: Terms, Privacy, DPA
```

This removes Industries from Legal and creates a logical "Solutions" column.

---

### Phase 3: Add SecondaryFooter to Remaining Public Pages

**Files to update**:
- `src/pages/Pricing.tsx` - Add SecondaryFooter
- `src/pages/Legal.tsx` - Add SecondaryFooter  
- `src/pages/Partners.tsx` - Replace Footer with SecondaryFooter or add it
- `src/pages/PaymentSuccess.tsx` - Add SecondaryFooter
- `src/pages/ClimateStack.tsx` - Add SecondaryFooter

**Pattern**:
```tsx
import { SecondaryFooter } from "@/components/SecondaryFooter";

// At end of component JSX
<SecondaryFooter />
```

---

### Phase 4: Extend Personalization to Dashboard Headers

**File**: `src/pages/Dashboard.tsx`

Already uses `usePersonalization()` but can be extended. Current implementation shows greeting in Navigation - this is already working.

**File**: `src/pages/Intelligence.tsx`

Add personalized greeting in chat header:

```tsx
const { greeting, displayName, isPersonalized } = usePersonalization();

// In header section, add:
{isPersonalized && (
  <span className="text-sm text-muted-foreground">
    {greeting}
  </span>
)}
```

---

### Phase 5: Enhance OCR Irrelevant Image Detection with Humorous Feedback

**File**: `supabase/functions/extract-document/index.ts`

Update `isDocumentRelevant()` function (lines 266-300) to return more engaging, humorous messages:

```typescript
// Enhanced irrelevant document responses
const HUMOROUS_REJECTIONS: Record<string, string[]> = {
  ceiling: [
    "That's a lovely ceiling, but we can't find any carbon emissions there! Try uploading a fuel bill or invoice instead.",
    "Great architectural shot! But for carbon accounting, we need business documents like invoices or utility bills."
  ],
  selfie: [
    "Looking good! But we're more interested in your invoices than your selfies. Upload a business document to get started.",
    "Nice photo! For carbon tracking though, we need to see your electricity bills or purchase invoices."
  ],
  nature: [
    "Beautiful scenery! Trees do absorb carbon, but we need your business invoices to calculate emissions.",
    "Love the nature shot! To track your carbon footprint though, please upload a fuel bill or invoice."
  ],
  food: [
    "That looks delicious! But to calculate carbon, we need your business invoices, not your lunch.",
    "Yum! For carbon accounting, please upload a utility bill or purchase invoice instead."
  ],
  default: [
    "Hmm, this doesn't look like a business document. Try uploading an invoice, fuel bill, or electricity bill.",
    "We're not quite sure what this is. For carbon MRV, please upload a business invoice or utility bill."
  ]
};

// Detection patterns for humorous responses
const IMAGE_CONTEXT_PATTERNS = {
  ceiling: /ceiling|roof|light|fixture|fan|lamp|chandelier/i,
  selfie: /face|person|portrait|selfie|photo|profile/i,
  nature: /tree|plant|flower|garden|nature|landscape|sky|cloud/i,
  food: /food|meal|dish|restaurant|menu|plate|eat/i
};

function getHumorousRejection(ocrText: string): string {
  const text = ocrText.toLowerCase();
  
  for (const [category, pattern] of Object.entries(IMAGE_CONTEXT_PATTERNS)) {
    if (pattern.test(text)) {
      const messages = HUMOROUS_REJECTIONS[category] || HUMOROUS_REJECTIONS.default;
      return messages[Math.floor(Math.random() * messages.length)];
    }
  }
  
  return HUMOROUS_REJECTIONS.default[Math.floor(Math.random() * HUMOROUS_REJECTIONS.default.length)];
}
```

Integrate into `isDocumentRelevant()`:
- If document type is "unknown" and no invoice-like data found
- Use AI vision response to detect image context (ceiling, selfie, nature, food)
- Return humorous, brand-aligned rejection message

---

### Phase 6: Verify CMS Pipeline Access

**Current Implementation** (already correct):
- CMS Admin is at `/cms-admin` 
- Access restricted to admin role via `user_roles` table check
- Link visible in UserMenu for admins only ("Content Manager" with CMS badge)
- Excel import/export functionality fully implemented

**No changes needed** - just documentation clarity:
- As a developer/admin, you access CMS via the user menu after signing in with an admin account
- The Excel upload happens directly in the browser at `/cms-admin`
- Data is stored in TypeScript files (`cmsContent.ts`, `seoFaqs.ts`) which requires code deployment
- For database-backed CMS, a future migration would move content to Supabase tables

---

## Files to Modify

| File | Change | Priority |
|------|--------|----------|
| `src/pages/Auth.tsx` | Add context-aware redirect logic | High |
| `src/components/Footer.tsx` | Reorganize columns, add Solutions | Medium |
| `src/pages/Pricing.tsx` | Add SecondaryFooter | Medium |
| `src/pages/Legal.tsx` | Add SecondaryFooter | Medium |
| `src/pages/Partners.tsx` | Add SecondaryFooter | Medium |
| `src/pages/PaymentSuccess.tsx` | Add SecondaryFooter | Low |
| `src/pages/ClimateStack.tsx` | Add SecondaryFooter | Low |
| `src/pages/Intelligence.tsx` | Add personalized greeting | Low |
| `supabase/functions/extract-document/index.ts` | Add humorous rejection messages | Medium |

---

## Technical Details

### Context-Aware Redirect Flow

```text
User Signs In
      ↓
Query user_contexts WHERE user_id = ? AND is_active = true
      ↓
┌─────────────────────────────────────┐
│ context_type = 'partner'?           │
│     YES → /partner-dashboard        │
│     NO  → /dashboard                │
└─────────────────────────────────────┘
```

### Footer Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│ Primary Footer (Footer.tsx) - Full marketing pages             │
│ ├─ Brand + Social                                              │
│ ├─ Platform: Climate Intelligence, Marketplace, Pricing        │
│ ├─ Solutions: Green Loans, Industries, Carbon Credits          │
│ ├─ Company: Mission, About, Principles, Contact                │
│ └─ Legal: Terms, Privacy, DPA                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Secondary Footer (SecondaryFooter.tsx) - Minimal pages         │
│ ├─ © 2026 Senseible | Terms | Privacy | DPA                    │
│ └─ Social Icons (LinkedIn, X, Instagram, Facebook)             │
└─────────────────────────────────────────────────────────────────┘
```

### OCR Feedback Tone Guidelines

- Friendly, not condescending
- Brief (1-2 sentences max)
- Always includes guidance on what TO upload
- Matches Senseible brand voice: calm, precise, helpful

---

## Security Verification

| Check | Approach |
|-------|----------|
| Partner context validated server-side | Query `user_contexts` with RLS |
| Admin CMS access | `user_roles` table with `has_role()` function |
| MSME data isolation | Anonymous hash IDs only in partner views |
| No cross-role data leakage | RLS policies enforce ownership |

---

## Performance Impact

- **Role-based redirect**: +1 database query on login (< 50ms)
- **Footer changes**: No runtime impact (static restructure)
- **SecondaryFooter additions**: Minimal (shared component already loaded)
- **OCR humor**: No additional AI calls (uses existing response data)
- **Personalization**: Already cached with 5-minute staleTime

---

## Success Criteria

1. Partners signing in are redirected to `/partner-dashboard`, partner sign-up verified and login saved
2. MSMEs signing in are redirected to `/dashboard`
3. All public pages show SecondaryFooter with legal + social links
4. Footer columns are logically organized (Solutions, not Industries under Legal)
5. Irrelevant image uploads receive friendly, humorous rejection messages
6. Personalized greetings appear consistently for signed-in users
7. No impact on page load speed (< 2 second first response)
