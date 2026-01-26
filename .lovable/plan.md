
# Focused Fix Plan: Partner Auth + Footer + Marketplace Flow

## Critical Issues Identified

| Issue | Root Cause | Impact |
|-------|-----------|--------|
| Partner signup requires email verification | `auto_confirm_email` was enabled but partner_applications insert still fails due to RLS timing | Partners can't complete signup |
| Partner redirects to MSME dashboard | `user_contexts` table is EMPTY - no partner context ever gets created | All users go to /dashboard |
| Footer inconsistent across pages | 8 pages use SecondaryFooter, rest use full Footer or none | Poor navigation discovery |
| Marketplace "Express Interest" goes to Contact page | No listing details passed; team gets generic inquiry | Lost purchase intent context |

## Fixes Required

### 1. Partner Signup Flow (Auth.tsx)
**Problem**: After signup, `partner_applications` insert is attempted but user_contexts is never created, so redirect logic always returns `/dashboard`.

**Fix**:
- After partner_applications insert succeeds, CREATE a user_context with `context_type: 'partner'`
- Set `is_active: true` so redirect logic finds it
- This is the missing link - currently partner signup never creates the context

```typescript
// After partner_applications insert succeeds:
await supabase.from('user_contexts').insert({
  user_id: data.user.id,
  context_type: 'partner',
  context_id: data.user.id, // Use user_id as context_id for pending partners
  context_name: businessName,
  is_active: true
});
```

### 2. Marketplace Purchase Flow (CarbonMarketplace.tsx + PartnerMarketplace.tsx)
**Problem**: "Express Interest" links to /contact with no listing context. Team receives generic inquiry with no project/credit details.

**Fix**:
- Pass listing details as URL params or store in session
- Create dedicated edge function `send-purchase-enquiry` that includes:
  - Listing ID, project name, sector, price
  - Requested quantity
  - Buyer contact info
- Send structured email to team with all purchase details

### 3. Footer Standardization
**Pages needing full Footer (currently have SecondaryFooter)**:
- Contact.tsx
- ClimateFinance.tsx
- CarbonCredits.tsx
- Industries.tsx
- ClimateStack.tsx
- Principles.tsx
- PaymentSuccess.tsx

**Replace SecondaryFooter with Footer for better navigation discovery.**

### 4. Navigation Role Badge (Already in Navigation.tsx)
Verified working - shows "Partner" or "MSME" badge based on user_contexts.

## Implementation Order

1. **Auth.tsx**: Add partner context creation after application insert
2. **CarbonMarketplace.tsx**: Add listing details to purchase intent
3. **Create send-purchase-enquiry edge function**: Structured purchase notification
4. **Replace SecondaryFooter with Footer**: 7 pages

## Expected Outcomes

- Partner signup creates user_context → redirects to /partner-dashboard
- Purchase interest includes full listing details → team can follow up
- All public pages have full footer → consistent navigation
