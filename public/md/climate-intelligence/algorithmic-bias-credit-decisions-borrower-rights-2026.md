# Algorithmic bias in credit decisions: what borrowers should know and how to respond

Canonical: https://senseible.earth/climate-intelligence/algorithmic-bias-credit-decisions-borrower-rights-2026

Most credit decisions in India and Asia in 2026 are made or materially influenced by algorithms. That is not new. What is new is the volume of alternative data used (cash-flow patterns, GST filings, telecom usage, device signals, social graphs), the opacity of the models, and the absence of a settled right to explanation for retail and MSME borrowers in most jurisdictions.

This article is written for borrowers — individuals and MSME owners — who suspect a credit decision was wrong or unfair, and for finance teams that want to advocate for borrowers credibly. It is not legal advice; it is operational guidance based on how decisions are actually structured.

## How credit decisions are actually made

A typical retail or MSME loan decision in 2026 stacks four layers:

1. **Eligibility filter.** Hard rules — age, KYC, jurisdiction, exclusion lists.
2. **Bureau-score band.** CIBIL, Experian, Equifax, CRIF. A score below a threshold blocks the rest.
3. **Algorithmic underwriting model.** Trained on the lender's own historical book, scoring 50–500 features. This is where most of the discretion lives.
4. **Human override.** Limited authority to approve borderline files or reject suspicious-looking approvals.

A "good score, surprising rejection" almost always comes from layer 3, not layer 2. The borrower's credit bureau score is fine; the lender's internal model has weighted some combination of recent enquiries, employment-tenure pattern, declared-income volatility, address change, or device fingerprint heavily enough to reject.

## Where bias enters

Three honest sources of bias, in increasing order of difficulty to address:

- **Training-data bias.** The model learned from a historical book that reflected past lending patterns. Groups under-represented in past lending are systematically harder to score, often producing higher false-rejection rates rather than higher default predictions.
- **Proxy bias.** Variables that are not protected attributes but correlate strongly with them (pin code, school name, language of communication, device model). These can re-introduce discrimination through the back door even when the model never sees the protected attribute.
- **Feedback-loop bias.** Borrowers rejected by the model never appear in the next training cycle as performing loans, so the model becomes increasingly confident in its own pattern. This compounds over years.

These are technical problems with practical consequences for individual borrowers.

## What you can actually ask for

In India in 2026, the legal landscape is unsettled but practical avenues exist:

- **Reason for rejection.** RBI's Fair Practices Code requires lenders to communicate the main reason for rejection on request. The reason given is often general ("internal credit policy"); push back politely for specificity.
- **Bureau report and dispute.** Free annual bureau report from each agency. Dispute incorrect entries; resolution is required within 30 days under the Credit Information Companies (Regulation) Act.
- **Internal appeal.** Most regulated lenders have an internal grievance redressal officer. Use this channel before escalating.
- **RBI Integrated Ombudsman.** For regulated lenders, free escalation channel with binding outcomes.
- **DPDP Act rights (from 2026).** Right to correction of personal data used in automated decisions. The right to explanation for automated decisions specifically is still being defined in subordinate rules.

In Singapore (MAS), the UK (FCA), and EU (GDPR Article 22 plus the AI Act), the rights are stronger and more explicit. India is moving in the same direction at its own pace.

## How to file a credible appeal

A successful appeal almost never says "the decision was unfair". It says "the decision used the following specific input incorrectly, here is the evidence, please reconsider". The structure that works:

1. State the application reference and the rejection reason as communicated.
2. Identify the specific input you believe is wrong or misinterpreted.
3. Provide documentary evidence (bank statements, GST returns, salary slips, address proofs, supplier confirmations).
4. Request reconsideration with a specific timeframe (14 days is standard).
5. Mention the next escalation step in neutral language.

This works because it gives the lender's grievance officer a concrete file to act on. "Be fair to me" gives them nothing.

## The Five Cs, still relevant

Underneath every algorithm, lenders still test the same five Cs:

- **Character** — repayment history and behavioural signals.
- **Capacity** — cash flow against obligations (DSCR, FOIR).
- **Capital** — borrower's own equity in the deal.
- **Collateral** — secondary repayment source.
- **Conditions** — sector outlook, macro environment, use of proceeds.

If you are denied, the fix is almost always in one of these five. Identify which, fix it, then re-apply.

## What borrowers commonly get wrong

- **Multiple simultaneous applications.** Each generates a hard enquiry, which the next model reads as desperation. Space applications 30 days apart.
- **Round-tripped income.** Self-transfers and family loans inflate apparent balances. Algorithms detect this and penalise it heavily.
- **Mismatch between declared and observed.** Declared income that does not reconcile to bank or GST data is the single biggest silent rejection driver for MSME loans.
- **Address volatility.** More than two address changes in 24 months is a flag at most lenders.
- **Co-applicant problems.** A co-applicant with weak credit damages the file; choose deliberately.

## When to suspect actual bias

Honest signals that an individual case may be biased rather than just unlucky:

- Multiple lenders rejecting with materially different stated reasons.
- A clean bureau score (>750), stable income, low utilisation — but consistent rejection.
- Approval by foreign-bank or fintech lender; rejection by domestic public-sector or NBFC lender (or vice-versa) for the same file.
- Approval changes when a non-substantive feature changes (e.g. spelling of name, communication language).

If two or more of these are true, the case is worth escalating to the regulator, not just appealing.

## FAQ

**Can I demand to know which features the model used?** Not yet enforceable in India. You can ask; lenders rarely tell.

**Does a rejection lower my credit score?** The hard enquiry itself does, marginally. The rejection does not, separately.

**How long does an appeal take?** Internal: 14–30 days. Ombudsman: 60–90 days typical.

**Is there a difference between denial and deferral?** Yes. Deferral keeps the file open and may convert to approval with additional documentation; denial closes the file. Always ask which one applies.

## Related guides

- [Can we reroute supply chains to reduce CBAM exposure legally?](https://senseible.earth/climate-intelligence/reroute-supply-chains-reduce-cbam-exposure)
- [How should Indian exporters prepare for EU CBAM compliance?](https://senseible.earth/climate-intelligence/cbam-compliance-indian-exporters)
- [What are the BRSR reporting requirements for Indian companies?](https://senseible.earth/climate-intelligence/brsr-reporting-requirements-india)
