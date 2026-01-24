
# Comprehensive Platform Stabilization & Enhancement Plan

## Executive Summary

This plan addresses critical issues across authentication, payments, voice commands, data flow, and branding while adding new capabilities for invoice PDF downloads, admin dashboard, and marketplace consolidation. The focus is on building a reliable, trustworthy end-to-end user experience.

---

## Issue Analysis & Solutions

### 1. Email Verification Redirects to Wrong Domain

**Problem**: After email verification, users are redirected to `biocog4.lovable.app/dashboard` instead of `senseible.earth`.

**Root Cause**: 
- In `src/pages/Auth.tsx` line 81, the redirect URL uses `window.location.origin` which resolves to the Lovable preview URL during development/staging.
- The Supabase authentication settings need to be configured with the correct site URL.

**Solution**:
- Update `Auth.tsx` to use a hardcoded production domain for `emailRedirectTo`
- Use environment-based URL detection to serve correct redirects

**Files to modify**:
- `src/pages/Auth.tsx` - Update redirect URLs

**Implementation**:
```
// Replace line 81
const redirectUrl = import.meta.env.PROD 
  ? 'https://senseible.earth/' 
  : `${window.location.origin}/`;
```

---

### 2. Voice Command Silent Failures in ESG Intelligence

**Problem**: Toggling voice listening doesn't produce actions, responses, or feedback. Silent failure.

**Root Cause Analysis**:
- In `src/pages/Intelligence.tsx`, the `useVoiceInput` hook is used (lines 121-124)
- The `handleVoiceResult` callback processes transcripts (lines 110-119)
- Issue: The `useVoiceInput` hook in `src/components/VoiceOutput.tsx` recreates the recognition object on every language change (line 87), but the `onResult` callback dependency array can cause stale closures
- No visual/audio feedback when listening starts or ends
- Browser speech recognition errors are logged but not surfaced to user

**Solution**:
1. Add toast notifications for listening state changes
2. Add visual pulsing indicator when actively listening
3. Fix callback stale closure issue
4. Add explicit error handling with user-friendly messages
5. Add audio feedback (beep) on listening start/stop

**Files to modify**:
- `src/components/VoiceOutput.tsx` - Fix hook dependencies, add error handling
- `src/pages/Intelligence.tsx` - Add user feedback for voice states
- `src/components/chat/ChatInput.tsx` - Enhance visual feedback

---

### 3. Payment Flow Issues (Critical)

**Problems**:
- Premium upgrades failing
- Payment method additions not working
- Incomplete order creation

**Root Cause Analysis**:
1. The `useRazorpay` hook (lines 62-73) creates orders but may fail silently if the edge function returns errors
2. Payment method tokenization not implemented (Razorpay requires subscription mandates)
3. The `Billing.tsx` page has "Add" button disabled (line 247: `disabled`)

**Solution**:
1. Add comprehensive error logging and user feedback in payment flow
2. Implement proper Razorpay subscription mandate for payment method storage
3. Enable the "Add payment method" flow
4. Add payment state debugging in development
5. Create a `setup-autopay` edge function for Razorpay mandates

**Files to modify/create**:
- `src/hooks/useRazorpay.ts` - Add error handling, retry logic
- `src/pages/Billing.tsx` - Enable add payment method, fix disabled state
- `supabase/functions/setup-autopay/index.ts` - NEW: Handle Razorpay mandates
- `src/pages/Pricing.tsx` - Add better error handling

---

### 4. Branding Inconsistencies

**Problem**: Some pages may use placeholder/AI-generated logos instead of official Senseible logo.

**Current State**:
- Navigation, MinimalNav, History use `senseibleLogo` correctly
- Footer uses text "senseible" (acceptable)
- SEOHead references `/logo.png` for structured data (may not exist)
- Invoice PDF uses text "Senseible" (acceptable)

**Solution**:
1. Ensure `/public/logo.png` exists for SEO structured data
2. Audit all pages for consistent branding
3. Standardize logo usage across all components

**Files to modify**:
- Copy `src/assets/senseible-logo.png` to `public/logo.png`
- Update components using placeholder icons to use official logo where appropriate

---

### 5. Invoice Scan Flow - Data Not Updating in MRV/Dashboard

**Problem**: After invoice scan on mobile, carbon value shows but clicking "Monetize" doesn't update data in MRV or Dashboard.

**Root Cause Analysis**:
1. After invoice processing in `Index.tsx`, data is saved to `documents` and `emissions` tables (lines 159-227)
2. The `handleConfirm` function (lines 407-414) navigates to `/verify` but doesn't trigger a refetch in MRV/Dashboard
3. MRV Dashboard and Dashboard both fetch data on mount but don't have real-time subscriptions
4. When navigating from Index -> Monetize -> MRV, the MRV component may not refetch

**Solution**:
1. Add real-time Supabase subscriptions for emissions and verifications
2. Add a query invalidation trigger after successful invoice processing
3. Ensure navigation triggers data refresh
4. Add explicit "Data saved" feedback with visual confirmation

**Files to modify**:
- `src/hooks/useEmissions.ts` - Add realtime subscription
- `src/pages/MRVDashboard.tsx` - Add realtime subscription for verifications
- `src/pages/Index.tsx` - Add explicit feedback after save

---

### 6. Missing/Invalid Invoice Data Warnings

**Problem**: Silent failures when invoice data is missing or invalid.

**Current State**: 
- `Index.tsx` handles irrelevant documents (lines 251-256) with toast error
- But missing fields or partial extractions may proceed silently

**Solution**:
1. Add validation warnings for extracted data with low confidence
2. Surface specific field-level issues (e.g., "Amount not detected")
3. Add "incomplete data" state to ResultState component
4. Show actionable suggestions for re-upload

**Files to modify**:
- `src/pages/Index.tsx` - Add validation warnings
- `src/components/ResultState.tsx` - Add warning indicators

---

### 7. Invoice PDF Download with Signed URLs

**Problem**: Need PDF download functionality for invoices.

**Current State**: 
- `generate-invoice-pdf/index.ts` generates HTML and sends via email
- No actual PDF generation or storage

**Solution**:
1. Generate proper PDF using a PDF library (jsPDF already installed)
2. Store PDFs in Supabase Storage with signed URLs
3. Update invoice record with `pdf_url`
4. Add download button in Billing page

**Files to modify/create**:
- `supabase/functions/generate-invoice-pdf/index.ts` - Store HTML and generate signed URL
- `src/pages/Billing.tsx` - Enable download button functionality

---

### 8. Admin Dashboard for Marketplace Management

**Problem**: Need admin capabilities for marketplace listings, purchase requests, and credit moderation.

**Solution**:
Create a new admin dashboard with:
1. Marketplace listings management (CRUD)
2. Purchase requests view
3. Credit moderation tools
4. Analytics overview

**New files to create**:
- `src/pages/Admin.tsx` - Admin dashboard
- `src/pages/AdminMarketplace.tsx` - Marketplace management
- Database: Add admin role check to RLS policies

---

### 9. Sample Marketplace Listings

**Problem**: No test data for Partner Marketplace.

**Solution**:
Insert sample listings via SQL migration with realistic Indian MSME data.

**Files to create**:
- SQL migration with sample marketplace listings

---

### 10. Marketplace Page Consolidation

**Problem**: Two marketplace pages exist (`CarbonMarketplace.tsx` and `PartnerMarketplace.tsx`) causing confusion.

**Analysis**:
- `CarbonMarketplace.tsx`: Uses static sample data, simpler UI, buyer-focused
- `PartnerMarketplace.tsx`: Uses real-time Supabase data, filtering, purchase flow

**Solution**:
1. Merge best features into unified marketplace experience
2. Keep `PartnerMarketplace.tsx` as the primary marketplace (has real data)
3. Update `/marketplace` route to use enhanced PartnerMarketplace
4. Add sample credit projects from CarbonMarketplace as static fallback when no listings
5. Redirect or deprecate CarbonMarketplace

**Files to modify**:
- `src/pages/PartnerMarketplace.tsx` - Add static fallback data, enhanced UI
- `src/App.tsx` - Update routing
- `src/pages/Partners.tsx` - Update marketplace link

---

## Implementation Phases

### Phase 1: Critical Fixes (Immediate)
1. Fix email verification redirect domain
2. Fix voice command feedback and error handling
3. Fix payment flow with error handling
4. Add invoice data validation warnings

### Phase 2: Data Flow & Real-time
1. Add real-time subscriptions for emissions/verifications
2. Fix MRV/Dashboard data refresh on navigation
3. Ensure data consistency across pages

### Phase 3: Features
1. Implement PDF invoice generation with storage
2. Create admin dashboard
3. Add sample marketplace listings
4. Consolidate marketplace pages

### Phase 4: Polish
1. Standardize branding/logos
2. Audit all flows end-to-end
3. Add comprehensive error handling

---

## Technical Details

### Email Redirect Fix

```typescript
// Auth.tsx - Line 81
const getRedirectUrl = () => {
  // Always use production domain for email verification
  const productionDomain = 'https://senseible.earth';
  const isProduction = window.location.hostname === 'senseible.earth' || 
                       window.location.hostname === 'www.senseible.earth';
  
  return isProduction ? `${productionDomain}/` : `${window.location.origin}/`;
};

const redirectUrl = getRedirectUrl();
```

### Voice Command Feedback

```typescript
// Intelligence.tsx - Add to handleVoiceResult
const handleVoiceResult = useCallback((transcript: string) => {
  if (transcript.trim()) {
    toast.info(`Heard: "${transcript.slice(0, 50)}${transcript.length > 50 ? '...' : ''}"`, {
      duration: 2000
    });
    
    const isCommand = processVoiceCommand(transcript.trim());
    if (!isCommand) {
      handleSend(transcript.trim());
    }
  } else {
    toast.warning('No speech detected. Please try again.');
  }
}, [processVoiceCommand, handleSend]);

// Add listening state feedback
useEffect(() => {
  if (isListening) {
    toast.info('Listening...', { duration: 1000 });
  }
}, [isListening]);
```

### Real-time Emissions Subscription

```typescript
// useEmissions.ts - Add to useEffect
useEffect(() => {
  const channel = supabase
    .channel('emissions-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'emissions',
    }, () => {
      refetch();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [refetch]);
```

### Sample Marketplace Data Migration

```sql
INSERT INTO marketplace_listings (
  msme_hash, sector, region, credits_available, 
  price_per_tonne, verification_score, vintage, 
  methodology, sdg_alignment, currency, is_active
) VALUES 
  (encode(sha256(random()::text::bytea), 'hex')::text, 'Textiles', 'South India', 500, 850, 92, '2025', 'CDM AMS-I.D', ARRAY[7,13,8], 'INR', true),
  (encode(sha256(random()::text::bytea), 'hex')::text, 'Manufacturing', 'North India', 1200, 750, 88, '2025', 'Verra VCS', ARRAY[9,13,12], 'INR', true),
  (encode(sha256(random()::text::bytea), 'hex')::text, 'Agriculture', 'West India', 300, 950, 95, '2024', 'Gold Standard', ARRAY[15,13,1,2], 'INR', true),
  (encode(sha256(random()::text::bytea), 'hex')::text, 'Renewable Energy', 'Central India', 800, 1100, 90, '2025', 'CDM AMS-I.D', ARRAY[7,13], 'INR', true),
  (encode(sha256(random()::text::bytea), 'hex')::text, 'Food Processing', 'East India', 450, 900, 85, '2025', 'Puro.earth', ARRAY[13,12,2], 'INR', true);
```

---

## Files Summary

### Files to Modify
1. `src/pages/Auth.tsx` - Fix email redirect domain
2. `src/components/VoiceOutput.tsx` - Fix voice input hook
3. `src/pages/Intelligence.tsx` - Add voice feedback
4. `src/hooks/useRazorpay.ts` - Improve error handling
5. `src/pages/Billing.tsx` - Enable add payment, fix download
6. `src/pages/Index.tsx` - Add validation warnings
7. `src/hooks/useEmissions.ts` - Add realtime subscription
8. `src/pages/MRVDashboard.tsx` - Add realtime subscription
9. `src/pages/PartnerMarketplace.tsx` - Consolidate features
10. `src/pages/Dashboard.tsx` - Add realtime subscription
11. `src/App.tsx` - Add admin routes
12. `supabase/functions/generate-invoice-pdf/index.ts` - Add PDF storage
13. `supabase/config.toml` - Add new function configs

### New Files to Create
1. `supabase/functions/setup-autopay/index.ts` - Razorpay mandate
2. `src/pages/Admin.tsx` - Admin dashboard
3. `public/logo.png` - Copy of senseible logo for SEO
4. SQL migration for sample marketplace listings

---

## Success Criteria

1. Email verification links redirect to senseible.earth domain
2. Voice commands show clear feedback (listening, heard text, executing)
3. Payment flow completes end-to-end with proper error messages
4. Invoice data warnings show for low-confidence extractions
5. MRV and Dashboard update in real-time after invoice processing
6. Invoice PDFs can be downloaded from Billing page
7. Admin can manage marketplace listings
8. Single unified marketplace experience
9. All pages use consistent Senseible branding
