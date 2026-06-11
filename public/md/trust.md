# Trust & Technical Validation

> How Senseible validates MSME climate data for partners, auditors, climate-finance providers, carbon-credit buyers, and enterprises — without exposing proprietary methods, weights, or customer data.

Senseible converts ordinary business documents into evidence that external stakeholders can independently rely on. The trust surface is intentionally auditable; the underlying methodology remains proprietary.

## Four-layer trust model

1. **Evidence.** Documents and signals are captured with SHA-256 fingerprints before any processing begins.
2. **Verification.** Deterministic rules — HSN-to-scope mapping, IEA 2023 grid factors, math reconciliation — return an explicit failure reason when inputs are insufficient.
3. **Attestation.** The methodology version, factor source, and evidence hash are locked together in an immutable record.
4. **Disclosure.** Framework-aligned outputs (CBAM, BRSR, GHG Protocol, ISSB, CSRD, TCFD, GRI) carry the underlying audit trail with them.

## Data sources and how each is checked

- **Tax invoices / GST records** — schema validation, math reconciliation, HSN-to-scope lookup.
- **Utility & energy bills** — period continuity, consumption sanity, country grid-factor lookup.
- **IoT and meter signals** — device identity, timestamp gap detection, drift checks.
- **Operational records** — cross-check against invoices and supplier evidence.
- **Satellite & remote signals** — provenance and acquisition-date stamping.
- **Geotagging** — facility coordinates aligned with country config (grid factor, tax ID format).
- **Supplier evidence** — supplier-issued PCFs hashed; buyer identifier (e.g., GSTIN) anchored where applicable.

## MRV pipeline (public-safe view)

Ingest → Stub + SHA-256 hash → AI parse (structured fields only) → Deterministic rules (HSN, grid factor, math) → Attest (methodology + factor source + evidence hash).

AI is used only to parse unstructured inputs into structured fields. Classification, factor selection, and arithmetic are deterministic. Missing inputs produce a math-based failure reason — never a silent estimate.

## Reporting framework coverage

GHG Protocol (Scopes 1, 2, 3) · CBAM · BRSR · CSRD / ESRS E1 · ISSB IFRS S2 · TCFD · GRI 305 · SBTi · ISO 14064 / 14067. All projections read from the same scope ledger.

## Scope 3 traceability

Supplier-issued documents are hashed and linked to buyer identifiers where applicable, so a purchaser can verify that an upstream claim is anchored to a real, hash-pinned counterparty rather than a sector average.

## Carbon & confidence scoring

The Climate Credibility Score is a 0–100 band aggregating: verification quality, green-benefit ratio, data completeness (vendor + date + amount + HSN), and history depth. Bands: A+ ≥ 90, A ≥ 75, B ≥ 55, C ≥ 35, D < 35.

## Greenwashing prevention

- Universal SHA-256 deduplication blocks evidence reuse across users, sessions, and time.
- An immutable pre-processing stub is written before processing starts; failed runs still leave a record.
- Methodology version and factor source are pinned per output; retroactive changes are visible.

## Carbon credit validation

Records considered for credit must clear additionality, evidence linkage (hash-anchored), and methodology lock. Buyers consume decision-grade signals — not raw MSME data.

## Climate finance readiness

Verified evidence powers green-loan, factoring, and SLL eligibility signals. Lenders see instrument fit, eligibility band, and evidence depth without touching borrower documents.

## Net-Zero enablement

The Net-Zero engine consumes the same scope ledger that feeds disclosure. A baseline becomes a sector-aware roadmap; progress is measured against the original methodology, so reductions are real rather than re-baselined.

## Governance & security

Row-Level Security on every table. IP addresses hashed in logs. Centralised audit ledger for sensitive actions. Methodology version pinning on every output. Cross-tenant access is impossible by construction.

## What we do not expose

Internal weights, prompts, model identities, and heuristics remain proprietary. The trust surface — inputs, standards, failure modes, evidence chain — is fully visible.

## Read also

- [Operating principles](/principles)
- [Net-Zero engine](/net-zero)
- [CBAM calculator](/cbam-calculator)
- [Partners](/partners)
- [Contact](/contact)
