# Document Intelligence and Team Access Release Plan

## Guardrails
- Keep existing URLs, UI contracts, database tables, calculation methods, and unrelated workflows unchanged.
- Do not infer missing climate data. Missing or ambiguous evidence remains unverified and is surfaced with a precise reason.
- Release in two gates. Do not start Team access changes until the document pipeline passes regression checks.

## Phase 1 — Document intelligence and MRV audit trail

### Confirmed defects to fix
- The extractor classifies every returned line item, but `Index.tsx` persists only `lineItems[0]` into one emissions row while storing the total CO₂ from all items. This can mix one item’s quantity/factor with a multi-item total.
- `factorSource` exists in extracted line-item evidence but is not persisted to the emissions record. Verification then overwrites `verification_notes` with a score and copies that field into `compliance_ledger.factor_source`; live Scope 2 ledger rows therefore have a factor value but a blank source.
- Document warnings returned by extraction are replaced by a smaller client-generated warning list before display.
- The current input sends an entire PDF as one model attachment; there is no confirmed page-level OCR or page/source locator capture.
- Broad keyword fallback can misclassify charge lines: current stored evidence includes a kWh line classified as furnace oil and a monthly electricity charge treated as kWh. The current generic raw-material factor is explicitly an estimate, which conflicts with the no-inference requirement.
- Existing MRV test coverage has helpers only; there are no end-to-end extraction fixtures or regression assertions.

### Implementation
1. Add regression fixtures covering a multi-line electricity bill, text PDF, scanned/image PDF, ambiguous/unreadable evidence, and non-relevant input. Tests will lock current request/response shapes before production logic changes.
2. Refine extraction to preserve every observed line item, quantity, unit, date, meter/consumption evidence, factor, source, confidence, and validation reason. For PDFs, process pages deterministically and retain page-level evidence references; handwriting remains accepted only when legible, otherwise flagged.
3. Tighten deterministic classification so calculations run only when the evidence unit is compatible with the selected factor. Charges, months, totals, or ambiguous text must not be converted into kWh/fuel activity. Remove estimated output from the document path where no verified factor match exists.
4. Persist one emissions record per calculable line item using the existing schema and API surface. Keep uncalculable lines in the document’s cached evidence with explicit flags; never collapse multi-line totals into the first line item.
5. Preserve factor provenance through verification and reporting without a schema change: retain the exact source in the existing provenance field, keep verification status separate, and copy the actual source into the compliance ledger.
6. Merge server validation flags with client checks instead of replacing them. A document with no calculable evidence must produce no emissions record and an explicit review/rejection outcome.
7. Add idempotency checks so retries and verification do not duplicate emissions or compliance-ledger rows.

### Phase 1 release gate
- Exercise upload → page extraction → all-line classification → emissions persistence → verification → compliance ledger → report export.
- Assert Scope 2 `activity_data`, `activity_unit`, `emission_factor`, and `factor_source` are all present and traceable for verified electricity evidence.
- Assert ambiguous and unreadable inputs produce flags and no invented CO₂.
- Compare sums across extracted line items, emissions rows, verification totals, and report evidence.
- Run focused tests, type checks, production build, edge-function tests, database security checks, and desktop/mobile browser verification.

## Phase 2 — Secure Team access

### Confirmed defects to fix
- The sole organization currently has no owner membership or MSME context, so `useOrganization` cannot resolve an active organization for `/team`.
- Genuine invitees cannot read or accept their invitation under current policies; only organization admins can read invitations or insert members.
- The invitation function is called without the signed-in authorization header, so email delivery fails while the UI still reports success.
- Accepted invitations are never marked accepted, and the UI permits a different signed-in email to “Accept Anyway.”
- Team renders a nonexistent member email field, causing real members such as owners to appear as “Unknown.”
- Team limits are enforced only in the browser.

### Implementation
1. Repair only missing owner membership/context rows for existing organizations, idempotently; do not create organizations or duplicate records.
2. Add a single authenticated acceptance function that validates the token, expiry, intended email, allowed role, organization capacity, and existing membership; atomically creates membership/context and marks the invitation accepted.
3. Route invitation preview and acceptance through that function. Reject email mismatches; remove “Accept Anyway.”
4. Invoke invitation email through the authenticated client, surface delivery failure accurately, and keep the invitation available for retry/cancel.
5. Restrict management controls to organization owners/admins, enforce the existing member limit server-side, and render only real stored identity fields with honest fallbacks.
6. Preserve current role names and navigation; do not add financial features or new tables.

### Phase 2 release gate
- Verify owner access, invite creation, email dispatch response, signed-out redirect, matching-recipient acceptance, wrong-recipient rejection, expiry/reuse rejection, member-limit enforcement, cancellation, and tenant isolation.
- Run RLS/security scans, focused tests, type checks, production build, and authenticated desktop/mobile browser checks.

## Deliverable
A changed / verified / safely unchanged report for each phase, including any source document type or production behavior that cannot be verified without a representative file.
