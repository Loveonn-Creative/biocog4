
# Critical Role-Based Access Control & Platform Fixes

## Executive Summary

This plan addresses critical security failures and architectural issues where CMS Admin, Marketplace, and Partner pages are currently accessible to all users. The solution implements strict role-based access control (RBAC) without creating new pages or affecting performance.

---

## Critical Issues Identified

### 1. CMS Admin Page (CRITICAL SECURITY FAILURE)
**Current State**: `/cms-admin` is accessible to ALL users
**Impact**: Any user can upload files that appear on the website
**Solution**: Restrict to admin role only (developer access)

### 2. Partner Marketplace Access
**Current State**: `/partner-marketplace` accessible to all authenticated users
**Impact**: MSMEs can access partner-only features
**Solution**: Restrict to users with partner context OR admin role

### 3. "Become a Partner" Flow (BROKEN)
**Current State**: Partners page line 135-138 redirects to `/contact` page
**Impact**: Partners cannot onboard properly
**Solution**: Create proper partner signup/onboarding flow using existing Auth page

### 4. Partner Dashboard Access
**Current State**: `/partner` accessible without role check
**Impact**: Any user can access partner dashboard
**Solution**: Add partner context verification

### 5. Marketplace Consolidation
**Current State**: Two marketplaces: `/marketplace` (static) and `/partner-marketplace` (real data)
**Impact**: Confusion, duplicate pages
**Solution**: Route `/marketplace` to unified marketplace with role-appropriate views

---

## Architecture: Role-Based Access Model

```text
+---------------------+-----------------------------------+
|       ROLE          |         ACCESSIBLE PAGES          |
+---------------------+-----------------------------------+
| MSME (default)      | /, /dashboard, /verify, /monetize |
|                     | /reports, /mrv-dashboard, /intel  |
|                     | /marketplace (view-only credits)  |
|                     | /settings, /profile, /billing     |
+---------------------+-----------------------------------+
| Partner             | All MSME pages +                  |
| (bank/buyer/ERP)    | /partner (partner dashboard)      |
|                     | /partner-marketplace (full access)|
+---------------------+-----------------------------------+
| Admin (developer)   | All pages +                       |
|                     | /admin, /cms-admin                |
+---------------------+-----------------------------------+
```

---

## Implementation Plan

### Phase 1: Grant Developer Admin Access (Immediate)

**SQL Migration**:
- Add admin role to developer's user account
- This enables access to `/admin` and `/cms-admin`

```sql
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role 
FROM profiles 
ORDER BY created_at ASC 
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;
```

### Phase 2: CMS Admin Access Control

**File**: `src/pages/CMSAdmin.tsx`

Add admin role verification at component start:
- Check `user_roles` table for admin role
- Show "Access Denied" card if not admin
- Redirect to dashboard

**Changes**:
```typescript
// Add to CMSAdmin.tsx
const [isAdmin, setIsAdmin] = useState(false);
const [checkingAccess, setCheckingAccess] = useState(true);

useEffect(() => {
  const checkAdmin = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');
    setIsAdmin(data && data.length > 0);
    setCheckingAccess(false);
  };
  checkAdmin();
}, [user?.id]);

// Render access denied if not admin
```

### Phase 3: Partner Access Control

**File**: `src/pages/PartnerMarketplace.tsx`

Update access logic:
- Allow if user has partner context (from `user_contexts` where `context_type = 'partner'`)
- Allow if user has admin role
- Allow MSMEs to VIEW listings but restrict purchase to partners
- Show "Apply to become a partner" for non-partners

**File**: `src/pages/PartnerDashboard.tsx`

Add context verification:
- Check if user has partner context
- Show onboarding prompt if not a partner

### Phase 4: Fix "Become a Partner" Flow

**File**: `src/pages/Partners.tsx`

Change line 135-138:
- From: `<Link to="/contact">`
- To: `<Link to="/auth?mode=partner">` (Partner signup flow)

**File**: `src/pages/Auth.tsx`

Add partner registration mode:
- Detect `?mode=partner` query param
- After signup, create partner onboarding entry in database
- Admin approves partner, then context is granted

**Database**: Create partner onboarding queue
```sql
CREATE TABLE partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  organization_name text NOT NULL,
  organization_type text NOT NULL,
  contact_email text NOT NULL,
  website text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);
```

### Phase 5: Marketplace Consolidation

**File**: `src/App.tsx`

Update routing:
- `/marketplace` -> `PartnerMarketplace` (unified, with role-based UI)
- Remove separate `CarbonMarketplace` from active routes

**File**: `src/pages/PartnerMarketplace.tsx`

Add role-aware UI:
- MSMEs see: Credits listings, estimated values, "Contact to Purchase"
- Partners see: Full purchase flow, quantity selection, direct buy
- Both see: Same listings, filtering, stats

### Phase 6: Context Switcher Enhancement

**File**: `src/components/ContextSwitcher.tsx`

Already works correctly - no changes needed.

**File**: `src/components/Navigation.tsx`

Add role-based nav items:
- Hide "Partner Dashboard" link for non-partners
- Show relevant items based on active context

---

## Access Control Implementation Pattern

For all protected pages, use this pattern:

```typescript
const ProtectedPage = () => {
  const { user, isAuthenticated, isLoading } = useSession();
  const [hasAccess, setHasAccess] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user?.id) { setChecking(false); return; }
      
      // For admin pages: check user_roles
      // For partner pages: check user_contexts where context_type = 'partner'
      // For MSME pages: allow all authenticated users
      
      setHasAccess(/* result */);
      setChecking(false);
    };
    if (isAuthenticated) checkAccess();
  }, [user?.id, isAuthenticated]);

  if (isLoading || checking) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/auth" />;
  if (!hasAccess) return <AccessDeniedCard />;
  
  return <PageContent />;
};
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/CMSAdmin.tsx` | Add admin role check, access denied UI |
| `src/pages/PartnerMarketplace.tsx` | Add partner/admin check, role-aware UI |
| `src/pages/PartnerDashboard.tsx` | Add partner context check |
| `src/pages/Partners.tsx` | Fix "Become a Partner" link |
| `src/pages/Auth.tsx` | Add partner mode handling |
| `src/App.tsx` | Consolidate marketplace routes |
| `src/components/Navigation.tsx` | Role-based nav visibility |

## New Database Objects (via Migration)

| Object | Purpose |
|--------|---------|
| `partner_applications` table | Partner onboarding queue |
| Admin role grant | Developer access to CMS/Admin |

---

## Performance & SEO Impact

- **No new pages created** - reusing existing components
- **No bundle size increase** - same lazy-loaded pages
- **Access checks are async** - don't block render
- **SEO unchanged** - noindex on admin pages already set
- **No visual changes for valid users** - only unauthorized users see access denied

---

## Success Criteria

1. CMS Admin only accessible to users with admin role
2. Partner Marketplace shows role-appropriate UI
3. "Become a Partner" leads to proper signup flow
4. Partner Dashboard requires partner context
5. Unified marketplace at /marketplace with role-aware views
6. Context switching between MSME and Partner works correctly
7. Developer has admin access immediately after migration
