# Water-bill emissions: calculation methodology (draft for approval)

Status: **not active.** Code is in `supabase/functions/_shared/water/`, tables are in
`supabase/pending-migrations/20261012120000_water_mrv.sql` behind a switch that ships OFF.
Nothing here is wired into the live app, edge functions or reports.
Method version: `WATER_MRV_v1.0`.

This document records every formula, unit, boundary, source and assumption the engine uses.
It does not claim conformance with CSRD, ESRS, ISSB or any other standard (I10). Wherever it
says "GHG Protocol", it describes the method followed, not a certification.

## 1. Boundary

| Item | In scope | Basis |
|---|---|---|
| Water bought from a third-party utility (supply) | Yes | Upstream emissions of a purchased service |
| Wastewater sent to a third-party treatment operator | Yes | GHG Protocol Scope 3 Technical Guidance (2013), Category 5 covers wastewater treated in facilities owned or operated by third parties |
| Water treated on the company's own site | No, it belongs to Scope 1 (process/fugitive) and Scope 2 (electricity) | Same chapter: treatment in facilities the company owns or controls is reported in Scope 1 and 2 |
| Water withdrawn from own borewell | No; pumping energy already appears on the electricity bill | GHG Protocol Corporate Standard (2004), ch. 4 |
| Water volume itself (m³) | Reported as a metric, separate from emissions | I5, I6 |

## 2. Formula

Activity-based method (GHG Protocol Corporate Standard ch. 6; Scope 3 Technical Guidance ch. 1 and 5):

```
emissions (kgCO2e) = volume (m³) × emission factor (kgCO2e per m³)
```

* The factor is converted to per m³ with the same exact constants as the volume (section 3).
* Supply and wastewater are separate activities with separate factors. A bill that gives
  one combined volume is **not** split by assumption; it is flagged `COMBINED_UNSPLIT` and
  has no emissions until a preparer splits it.
* A measured zero volume with a factor gives 0. **No factor gives NULL, never 0** (I2). The
  database enforces this with `CHECK (factor_id IS NOT NULL OR emissions_kgco2e IS NULL)`.
* A credit note (negative volume linked to the bill it corrects) gives negative emissions. A
  negative volume with no linked bill is flagged and not calculated.

## 3. Units (exact definitions only)

| Unit | m³ per unit | Source |
|---|---|---|
| m³, kL | 1 | SI |
| L | 0.001 | SI (1 L = 1 dm³) |
| US gallon | 0.003785411784 | 231 in³, 1 in = 25.4 mm exactly (NIST SP 811 / Handbook 44) |
| Imperial gallon | 0.00454609 | UK Weights and Measures Act 1985 |
| CCF / HCF | 2.8316846592 | 100 ft³, 1 ft = 0.3048 m exactly |

A bare "gallon" is ambiguous (US or imperial) and is treated as an unknown unit
(`UNKNOWN_UNIT`), as is "units", which Indian water bills sometimes use for kL without saying so.

## 4. Reporting periods

A bill whose billing period crosses a reporting-year boundary is split **pro rata by inclusive
calendar days** (leap days counted) and flagged `PERIOD_SPANS_YEARS` (Low). The parts sum exactly
to the bill's volume. Reporting basis is configurable: calendar year or Indian financial year
(1 April to 31 March). Each part is resolved against factors valid over that part only.

## 5. Emission factors

### 5.1 Rules (I3, I4)

* The factor table **ships empty**. No value, source, year or GWP basis is defaulted or invented.
* A factor is used only when it is `APPROVED`, covers the whole sub-period, has a unit convertible
  to per m³, and is on the entity's GWP basis (AR4, AR5 or AR6). Approval needs a second person
  (`approved_by <> created_by`).
* Values are immutable: a correction is a new version. Approved rows cannot change except to retire.
* Every result stores the factor id, version, value, unit, source, geography, publication year,
  GWP basis, uncertainty, tier and the full resolution trace (which factors were considered and why
  each was accepted or rejected).

### 5.2 Selection order

1. **Tier A, supplier-specific:** a factor published by, or derived from data published by, the
   water utility named on the bill.
2. **Tier A, national:** a factor for the bill's country.
3. **Tier B, approved proxy:** a factor for another geography that a factor steward has explicitly
   approved as a proxy for this country. Results are labelled `ESTIMATED_PROXY`, flagged
   `PROXY_FACTOR_USED` (Medium) and shown as a separate subtotal.
4. Otherwise: no factor. Status `UNAVAILABLE_FACTOR_PENDING`, flag `NO_FACTOR` (High), or
   `GWP_BASIS_MISMATCH` if factors exist only on another GWP basis.

Ties at one tier go to the publication year closest to, and not after, the reporting year. A
remaining tie is `AMBIGUOUS_FACTOR` (High); the engine never picks at random.

### 5.3 Candidate sources (to be loaded and approved by a factor steward)

No value is quoted here because none could be checked against the primary publication from the
build environment. A steward loads each value directly from the publication and records the
table reference.

| Candidate | Use | Notes |
|---|---|---|
| UK DESNZ / Defra, *Greenhouse gas reporting: conversion factors* (annual), "Water supply" and "Water treatment" | Tier B proxy only, for non-UK sites | UK utility data. Using it for India is a proxy and must be approved and labelled as such. Record the edition year and GWP basis stated in that edition. |
| Indian water utility (e.g. a municipal corporation or jal board) energy-intensity disclosures | Tier A supplier-specific, derived | Derived factor = utility's published kWh per m³ × CEA CO2 Baseline Database grid factor for the same year. Valid only if both inputs are published; record both sources in `source_name` and `source_table_ref`. |
| National factor for India | Tier A national | No official national water-supply factor was identified. Until one is, Indian bills without a supplier factor stay `NO_FACTOR` unless a proxy is approved. |

## 6. Scope and category mapping (I9)

Mapping is configuration (`water_category_mapping_rule`), never code, and the table **ships empty**.
An entity-specific rule wins over a default rule. No rule, or conflicting rules, leaves the result in
an "Unmapped" bucket, flagged `MAPPING_PENDING`, and outside every scope total.

Recommended rules for a reviewer to approve:

| Activity | Scope | Category | Basis |
|---|---|---|---|
| WATER_WASTEWATER_TREATMENT (third party) | 3 | 5, Waste generated in operations | GHG Protocol Scope 3 Technical Guidance (2013), ch. 5 names wastewater treatment by third parties |
| WATER_SUPPLY (third-party utility) | 3 | 1, Purchased goods and services | Scope 3 Standard (2011), ch. 5 category descriptions: Category 1 covers upstream emissions of purchased goods and services. Interpretation to confirm: the Technical Guidance does not name water explicitly. |

The database rejects a Scope 3 rule without a category 1 to 15, and a Scope 1 or 2 rule with one.

## 7. Data-gap flags

| Reason | Severity | Owner | Due (days) |
|---|---|---|---|
| NO_FACTOR, AMBIGUOUS_FACTOR, GWP_BASIS_MISMATCH | High | Factor steward | 10, 5, 10 |
| UNKNOWN_UNIT, MISSING_FIELD, NEGATIVE_VOLUME_UNMATCHED | High | Preparer | 5 |
| PROXY_FACTOR_USED | Medium | Factor steward | 30 |
| COMBINED_UNSPLIT | Medium | Preparer | 10 |
| MAPPING_PENDING | Medium | Reviewer | 5 |
| UTILITY_ESTIMATED_READING | Low | Preparer | 30 |
| PERIOD_SPANS_YEARS | Low | Reviewer | 30 |

Owners and due dates are configuration and can be changed without touching the method.
States: `OPEN → IN_PROGRESS → RESOLVED | ACCEPTED_RISK`. Resolving needs a note. Accepting a risk
needs a reason and an approver who is not the requester. Closed flags never reopen; if the problem
comes back, a new flag is raised. When a superseding result no longer carries a reason, its flag
resolves automatically with the run id recorded. Invalid bills are kept (I1) with an
`INVALID_INPUT` result and NULL emissions and volume.

## 8. Versioned recalculation (I7)

1. **Dry run** (`planRecalc`): re-runs the pipeline with the current factors and rules and lists, per
   bill and period, NEW / CHANGED / UNCHANGED / NO_LONGER_PRODUCED with the changed fields and the
   kgCO2e delta. The delta is NULL when either side has no number, so a factor arriving later never
   looks like a 0 to N jump.
2. **Approval**: a second person approves the plan (`approved_by <> planned_by`, enforced in code and
   in the database).
3. **Apply** (`water_apply_recalc`): in one transaction, each changed result is superseded
   (`is_current = false`) and a new version is inserted with `supersedes_id`. Old versions are never
   updated or deleted; the database blocks it. If a result was superseded by someone else in the
   meantime, the whole plan fails as stale.
4. **Locked periods** (closed reporting years) change only with a written restatement reason, which
   is stored on the run and in the audit trail. This follows the GHG Protocol Corporate Standard,
   ch. 5, on recalculating reported emissions after methodology or data changes.

Identical inputs always give identical outputs; this is tested.

## 9. Totals and how complete they are (I8)

Each total, per reporting period and per scope/category bucket, carries:

* `total_kgco2e`: sum of calculated rows only; NULL ("not quantified") when no row could be calculated.
* `tier_a_kgco2e` and `proxy_kgco2e`: proxy-based emissions shown separately.
* `included_count`, `excluded_count`, `excluded_volume_m3`, and how many excluded bills had no readable volume.
* `coverage_pct`: included m³ ÷ all m³ (absolute values). Shown as "at most" when some volumes are unreadable.
* `estimation_share_pct`: proxy kgCO2e ÷ total kgCO2e.
* `uncertainty_kgco2e`: root-sum-square of each row's factor uncertainty (IPCC 2006 Guidelines,
  Vol. 1, ch. 3, Approach 1, Equation 3.1, assuming independent factors). NULL when any row's factor
  states no uncertainty. Meter and allocation uncertainty are not quantified and are not implied.
* `open_gaps` and `verification_status = NOT_VERIFIED`. Engine output is a calculated estimate; it is
  never labelled as verified emissions.

Example line: `Scope 3 Category 1, 2026: 80 kgCO2e, 80% of volume covered, 37.5% from proxy factors,
±7.8 kgCO2e (factor uncertainty only), 2 open gaps, not verified.`

A separate water metrics report gives supply, wastewater and combined-unsplit m³ per period whether or
not factors exist, and a data-gap report lists open flags by reason, severity, owner and overdue count.

## 10. Data model and controls

Tables (all new, prefix `water_`): settings (switch), role, emission_factor, category_mapping_rule,
bill, calc_run, locked_period, emission_result, data_gap_flag, audit_event.

* Bills, results, flags and audit events cannot be deleted. Results change only from current to
  superseded. Audit events cannot be updated, deleted or truncated.
* Re-ingesting the same bill (same SHA-256 idempotency key) is a no-op, including under concurrent calls.
* Clients can only read rows for entities they hold a role on. Every write goes through
  `service_role` functions, which refuse to run while the switch is off.

## 11. Tests

* `tests/water-mrv.test.ts` (46 tests): unit conversions from legal definitions, validation, day-based
  allocation (year end, Indian FY end, leap year), factor eligibility and tie-breaks, the calculation,
  mapping, flag state machine, end-to-end reference bills reconciled to hand arithmetic, versioned
  recalculation, aggregation, a 500-bill seeded property test (no number without a factor, allocations
  sum to the bill, aggregate equals the hand sum), static guards against writing 0 for a missing factor,
  and a contract check between the TypeScript output and the SQL functions.
* `supabase/pending-migrations/tests/run.sh 20261012120000_water_mrv`: applies the migration to a
  throwaway Postgres database, runs the behaviour tests in `20261012120000_water_mrv.test.sql`
  (switch off, immutability, NULL handling, idempotency, flags, recalculation, stale plans, locked
  periods, RLS), proves the rollback refuses while data exists, then rolls back and checks the schema
  and an existing table are unchanged (catalog and row snapshot match).

Test factors are labelled `TEST FIXTURE (not a real factor)` and use round numbers for hand checks.

## 12. Open decisions before activation

1. Approve the recommended mapping rules in section 6, especially Category 1 for water supply.
2. Choose factor sources per section 5.3 and have a steward load and a second person approve them.
3. Confirm the reporting basis (Indian FY is the default in settings) and GWP basis (AR5 default).
4. Decide who holds the preparer, reviewer, approver and factor steward roles.
5. Existing live code has an avoided-emissions factor `WATER_CONSERVATION` of 0.20 kgCO2e per kL in
   `supabase/functions/_shared/emissionFactors.ts` with no cited publication. It is left unchanged
   because changing it alters live numbers; it needs a sourced value or removal, on your decision.
6. Rollout after approval: apply the migration, load factors, run in shadow mode (results stored,
   not shown), compare, then backfill through a dry-run plan, then turn the switch on.
