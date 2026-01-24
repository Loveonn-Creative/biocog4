
# Admin Dashboard Enhancement & Platform Access Control Improvements

## Overview

This plan adds partner application approval functionality to the Admin Dashboard, updates the logo to the approved Senseible wordmark, and implements additional security/UX improvements while maintaining full page speed and existing functionality.

---

## Current State Analysis

### What Works Correctly

1. **CMS Admin Access**: Already restricted to admin role only (verified in `CMSAdmin.tsx`)
2. **Partner Dashboard Access**: Already restricted to partner context or admin role (verified in `PartnerDashboard.tsx`)
3. **Marketplace Access**: Already role-aware with partner/admin purchase capability (verified in `PartnerMarketplace.tsx`)
4. **Partner Signup Flow**: Already functional at `/auth?mode=partner` with `partner_applications` table
5. **Marketplace Listings**: Database shows 7 active listings (Textiles, Manufacturing, Agriculture, Renewable Energy, Food Processing, Logistics, Construction)
6. **User Menu**: Already shows admin links only to admins

### Issues to Address

| Issue | Solution |
|-------|----------|
| No partner application approval UI | Add to Admin Dashboard |
| Logo shows old icon version | Replace with approved text-only logo |
| Team page linked from menu without action context | Already gated by Pro/Scale tier - working as intended |
| CMS export/import location unclear | Already in `/cms-admin` page (admin-only) - working |

---

## Implementation Plan

### Phase 1: Update Logo Asset

**Action**: Replace current logo with the approved Senseible text-only wordmark

**File**: `src/assets/senseible-logo.png`
- Copy uploaded logo from `user-uploads://senseiblelogo.png` to `src/assets/senseible-logo.png`
- The logo is already imported in Navigation.tsx with `dark:invert` class for theme support

---

### Phase 2: Add Partner Applications Tab to Admin Dashboard

**File**: `src/pages/Admin.tsx`

Add a new "Applications" tab for partner application review:

```typescript
// Add new interface
interface PartnerApplication {
  id: string;
  user_id: string;
  organization_name: string;
  organization_type: string;
  contact_email: string;
  website: string | null;
  status: string;
  created_at: string;
}

// Add state
const [applications, setApplications] = useState<PartnerApplication[]>([]);

// Add fetch function
const fetchApplications = async () => {
  const { data } = await supabase
    .from('partner_applications')
    .select('*')
    .order('created_at', { ascending: false });
  if (data) setApplications(data);
};

// Add approval function
const handleApproveApplication = async (app: PartnerApplication) => {
  // 1. Update application status
  await supabase
    .from('partner_applications')
    .update({ 
      status: 'approved', 
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id 
    })
    .eq('id', app.id);
  
  // 2. Create partner context for user
  await supabase
    .from('user_contexts')
    .insert({
      user_id: app.user_id,
      context_type: 'partner',
      context_id: app.id,
      context_name: app.organization_name,
      is_active: true
    });
  
  toast.success(`Partner ${app.organization_name} approved`);
  fetchApplications();
};

// Add reject function
const handleRejectApplication = async (id: string) => {
  await supabase
    .from('partner_applications')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', id);
  
  toast.success('Application rejected');
  fetchApplications();
};
```

Add new tab UI:

```tsx
<TabsTrigger value="applications" className="gap-1">
  <Users className="w-4 h-4" />
  Applications
  {applications.filter(a => a.status === 'pending').length > 0 && (
    <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
      {applications.filter(a => a.status === 'pending').length}
    </Badge>
  )}
</TabsTrigger>

<TabsContent value="applications">
  <Card>
    <CardHeader>
      <CardTitle>Partner Applications</CardTitle>
      <CardDescription>Review and approve partner registrations</CardDescription>
    </CardHeader>
    <CardContent>
      {applications.map(app => (
        <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="font-medium">{app.organization_name}</p>
            <p className="text-sm text-muted-foreground">{app.organization_type}</p>
            <p className="text-sm">{app.contact_email}</p>
          </div>
          <div className="flex gap-2">
            {app.status === 'pending' ? (
              <>
                <Button size="sm" onClick={() => handleApproveApplication(app)}>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleRejectApplication(app.id)}>
                  Reject
                </Button>
              </>
            ) : (
              <Badge variant={app.status === 'approved' ? 'default' : 'destructive'}>
                {app.status}
              </Badge>
            )}
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
</TabsContent>
```

---

### Phase 3: Add Partner Stats to Dashboard

**File**: `src/pages/Admin.tsx`

Add to stats cards:
- Pending Applications count
- Approved Partners count

```typescript
// Add to DashboardStats interface
pendingApplications: number;
approvedPartners: number;

// Add to fetchStats
const { count: pendingApps } = await supabase
  .from('partner_applications')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'pending');

const { count: approvedPartners } = await supabase
  .from('partner_applications')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'approved');
```

---

### Phase 4: Add CMS Admin Link to UserMenu

**File**: `src/components/UserMenu.tsx`

Add CMS Admin link for admin users (alongside existing Admin Dashboard link):

```tsx
{isAdmin && (
  <>
    <DropdownMenuSeparator />
    <DropdownMenuItem asChild>
      <Link to="/admin" className="flex items-center gap-2 cursor-pointer text-primary">
        <Shield className="w-4 h-4" />
        Admin Dashboard
      </Link>
    </DropdownMenuItem>
    <DropdownMenuItem asChild>
      <Link to="/cms-admin" className="flex items-center gap-2 cursor-pointer">
        <FileText className="w-4 h-4" />
        CMS Admin
      </Link>
    </DropdownMenuItem>
  </>
)}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/assets/senseible-logo.png` | Replace with text-only wordmark |
| `src/pages/Admin.tsx` | Add Applications tab, approval/reject functionality, partner stats |
| `src/components/UserMenu.tsx` | Add CMS Admin link for admins |

---

## What Remains Unchanged

- **All 7 marketplace listings** - already in database and displaying correctly
- **CMS import/export** - already functional at `/cms-admin` (admin-only access)
- **Partner flow** - already functional (Partners page → `/auth?mode=partner` → creates application)
- **Team page** - already gated by Pro/Scale subscription tier
- **AcceptInvite page** - functional for team invitations
- **Role-based access** - already implemented for all protected pages
- **Page speed** - no new dependencies, minimal additions

---

## Security Verification

| Check | Status |
|-------|--------|
| CMS Admin restricted to admin role | Already implemented |
| Partner Dashboard restricted to partner/admin | Already implemented |
| Marketplace purchase restricted to partner/admin | Already implemented |
| MSME data not exposed to partners | Anonymized via hash IDs |
| Partner applications visible only to admins | Via RLS policy |

---

## Technical Notes

### CMS Data Management
The CMS Admin page (`/cms-admin`) already provides:
- **Export**: Download current FAQs and articles as Excel
- **Import**: Upload Excel files to preview/validate content
- **Template**: Download blank template for content creation

This is accessible only to admin users (you) via the UserMenu or direct URL.

### Partner Context Flow
1. Partner applies at `/auth?mode=partner`
2. Application created in `partner_applications` table
3. Admin reviews in Admin Dashboard → Applications tab
4. On approval: `user_contexts` entry created with `context_type: 'partner'`
5. Partner can now access Partner Dashboard and purchase credits

---

## Success Criteria

1. Admin Dashboard shows Applications tab with pending count badge
2. Admins can approve/reject partner applications
3. Approved partners automatically get partner context
4. Logo displays as approved text-only wordmark
5. CMS Admin accessible from user menu for admins
6. No impact on page load speed or existing functionality
