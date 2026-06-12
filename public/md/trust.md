# Trust & Technical Validation

How Senseible turns ordinary business documents into evidence that auditors, lenders, carbon-credit buyers, enterprises, and ESG teams can independently rely on.

## Four-layer trust model

1. **Evidence Layer** — Every document is fingerprinted with SHA-256 before processing. A pre-processing stub is written first, so even failed runs leave an audit trail. The same invoice cannot be claimed twice across users, sessions, or time.
2. **Verification Layer** — Deterministic HSN-to-scope mapping, country grid factors (IEA 2023), and math reconciliation. Missing inputs return a math-based failure reason — never a silent estimate.
3. **Intelligence Layer** — Biocog superintelligence reads the scope ledger as the single source of truth and projects it into every framework view non-destructively. The same number appears in every report because it comes from the same record.
4. **Disclosure & Decision Layer** — Framework-aligned outputs (CBAM, BRSR, GHG Protocol, CSRD, ISSB, TCFD, GRI, SBTi) carry the audit trail, confidence bands, and Climate Credibility Score (A+ to D) with them.

## Data sources and how each is verified

- **Tax invoices / purchase records** — schema validation, math reconciliation, HSN-to-scope lookup.
- **Utility & energy bills** — period continuity, consumption sanity, country grid-factor lookup.
- **IoT & meter signals** — device identity, timestamp gaps, drift detection.
- **Operational records** — cross-check against invoices and supplier evidence.
- **Satellite & remote signals** — provenance and acquisition-date stamping.
- **Geotagging** — facility coordinates aligned with country config.
- **Supplier evidence** — supplier-issued PCFs hashed; counterparty identifier anchored.

## MRV pipeline

Ingest → Stub + SHA-256 hash → AI parse (structured fields only) → Deterministic rules (HSN, grid factor, math) → Attest (methodology + factor source + evidence hash).

AI is used only to parse unstructured inputs. Classification, factor selection, and arithmetic are deterministic.

## ESG Intelligence Engine — outcome multiplier

One verified ledger. Every framework. Every decision.

- **Do more in less time.** One ingestion event produces CBAM, BRSR, GHG Protocol, ISSB, CSRD, TCFD, GRI and SBTi outputs with no re-keying.
- **Reduce cost from invoice memory.** Shared memory surfaces duplicate spend, high-emission supplier substitutes, and energy-mix arbitrage hidden in your own purchase history.
- **Maximize net-zero progress.** Sector-aware reduction levers are ranked by tCO₂e impact per unit of spend.
- **Audit-ready by default.** Methodology version, factor source, and evidence hash lock at write time.

## Reporting framework coverage

GHG Protocol (Scopes 1, 2, 3) · CBAM · BRSR · CSRD / ESRS E1 · ISSB IFRS S2 · TCFD · GRI 305 · SBTi · ISO 14064 / 14067. All read from the same scope ledger.

## Scope 3 — supplier evidence enterprises can't gather alone

In emerging markets, most suppliers don't publish PCFs. Enterprises fall back on sector averages and lose defensibility under CBAM, ISSB and CSRD. Senseible's cross-MSME footprint turns that gap into a primary-data network.

- **Country-aware counterparty linkage.** GSTIN (India), NPWP (Indonesia), MST (Vietnam), TIN (Thailand, Philippines, Malaysia), BIN (Bangladesh), NTN (Pakistan), CNPJ (Brazil), VAT (EU).
- **Anomaly detection across the network.** Supplier emission intensity flagged when it deviates beyond 2σ from the peer cluster mean for the same HSN/CN code and country grid factor.
- **Cluster benchmarking.** Sector medians come from verified MSME activity across the network — peer-normalized scores instead of generic industry averages.

## Climate Credibility Score

A single 0–100 band aggregating verification quality, green-benefit ratio, data completeness, and history depth. Bands: A+ ≥ 90, A ≥ 75, B ≥ 55, C ≥ 35, D < 35.

## Greenwashing prevention — structural defense

Six mechanisms working together: universal SHA-256 dedup, immutable pre-processing stubs, methodology and factor pinning per output, deterministic failure when inputs are missing, additionality lock on credit-eligible records, and cross-MSME peer challenge before disclosure.

Verification you can challenge — and that holds up when challenged.

## Carbon credit validation

Records eligible for credit consideration clear three gates: additionality, evidence linkage (hash-anchored), and methodology lock. Buyers consume decision-grade signals — not raw MSME data.

## Climate & green finance — why lenders can underwrite

- Hash-pinned, spot-auditable figures.
- Confidence bands, never false precision.
- Methodology locked at disclosure time.
- Climate Credibility Score (0–100) as a single underwriting-ready signal.
- Cross-MSME peer comparison instead of self-reported claims.
- Decision-grade view (instrument fit, eligibility band, evidence depth) — borrower documents stay private.

The same verified ledger maps to government incentive schemes across emerging markets (SIDBI, IREDA, MNRE in India; equivalents elsewhere via country config).

## Net-Zero enablement

The Net-Zero engine consumes the same scope ledger. A baseline becomes a sector-aware roadmap; progress is measured against the original methodology so reductions are real, not re-baselined.

## Governance & security

Row-Level Security on every table. IP addresses hashed in logs. Centralised audit ledger. Methodology version pinning on every output. Cross-tenant access is impossible by construction.

## Read also

- [Operating principles](/principles)
- [Climate finance](/climate-finance)
- [Net-Zero engine](/net-zero)
- [CBAM calculator](/cbam-calculator)
- [Partners](/partners)
- [Contact](/contact)
