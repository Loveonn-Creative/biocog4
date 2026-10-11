# Should you do carbon accounting yourself or hire a consultant?

Canonical: https://senseible.earth/climate-intelligence/diy-vs-consultant-carbon-accounting-msme-decision-framework

Hiring a Big-Four-style sustainability consultant for an MSME carbon baseline can cost between ₹6 lakh and ₹40 lakh depending on scope. Doing it yourself with a deterministic MRV tool can cost under ₹60,000 per year. Neither extreme is universally right. The decision is a structured one.

## The four-question filter

Run your situation through these in order. The first "yes" determines the answer.

1. **Is the output going into a regulator-filed legal document where signature liability matters (CBAM declaration, SEBI BRSR Core assurance, EU CSRD)?** → Hire a registered verifier for the assurance step. You can still do the data collection yourself.
2. **Do you have zero internal capacity to read an invoice, find an HSN code, or open a spreadsheet?** → Hire.
3. **Is the carbon number tied to a covenant, loan rate, or buyer contract worth more than 10× the consultant cost?** → Hire for year 1 to get the baseline right, then operate yourself in year 2+.
4. **None of the above?** → Do it yourself with a deterministic MRV tool. The marginal accuracy gain from a consultant is real but small, and the cost gap is large.

## What a consultant actually gives you

- **A baseline they have built before.** Useful if your sector is unusual.
- **A defensible methodology choice.** Useful in audit-heavy contexts.
- **Audit-firm familiarity.** They speak the language of your assurer.
- **A second opinion.** Useful when internal politics need an outsider to settle a debate.

## What a consultant does not give you

- **An operating capability.** When they leave, the spreadsheet leaves with them.
- **Speed.** A typical scoping-to-baseline engagement runs 8–14 weeks. A deterministic MRV ingest can finish the same baseline in under a week.
- **Updateability.** Re-running the consultant for every quarter is uneconomic.

## What DIY with a tool gives you

- **A living baseline** that updates as documents flow in.
- **Audit trail** (SHA-256 evidence hashing, immutable methodology version pins).
- **Per-document explainability** so you can answer a buyer or banker question without an email chain.
- **Marginal cost per cycle approaching zero** after the first month.

## The hybrid pattern most MSMEs end up using

| Phase | Who does it | Why |
| --- | --- | --- |
| Year 1, baseline build | Tool + light consultant review (5–10 hours) | Get methodology choices defensible |
| Year 1, disclosure | Tool, optional limited assurance | First disclosure published |
| Year 2+, ongoing | Tool only | Operating cost stays flat |
| Major regulatory filing | Add registered verifier | Signature liability only |

**The split that works.** Consultants for opinions you will be quoted on. Tools for the math you will repeat. Never the other way round.

## Red flags when buying a consultant

- They quote without naming the GHG Protocol version and Scope 3 categories in scope.
- They will not commit to a tCO2e number with a confidence band.
- They charge for "carbon strategy" without producing a baseline first.
- They want to lock you into their proprietary spreadsheet.

## Red flags when going DIY

- The tool returns a single number with no confidence band.
- You cannot trace any final number back to a specific invoice line.
- The tool silently fills missing inputs with estimates instead of flagging them.
- Methodology version is not pinned per record.

## FAQ

**Will a buyer accept a self-produced number?** Increasingly yes, *if* the underlying evidence is verifiable. A deterministic MRV output with SHA-256-hashed source documents is more defensible than a consultant PDF that cannot be re-derived.

**Can I switch later?** Yes. Self-produced data ingested by a registered verifier becomes assured data. The reverse — consultant data ingested by a tool — usually loses traceability.

**What is the minimum internal headcount to go DIY?** One operations or finance person who can spend 4–6 hours per month, and one decision-maker who can sign off methodology choices once a year.

## Related guides

- [How do we maintain historical carbon data when methodologies change?](https://senseible.earth/climate-intelligence/maintain-historical-carbon-data-methodology-changes)
- [What are the different types of carbon credits in voluntary markets?](https://senseible.earth/climate-intelligence/carbon-credit-types-voluntary-markets)
- [How do we select the right emission factors for our calculations?](https://senseible.earth/climate-intelligence/emission-factors-selection-guidance)
