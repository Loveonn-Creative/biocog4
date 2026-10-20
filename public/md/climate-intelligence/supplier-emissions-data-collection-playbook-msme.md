# How do you get supplier emissions data when suppliers will not share?

Canonical: https://senseible.earth/climate-intelligence/supplier-emissions-data-collection-playbook-msme

Published 2026-05-21.

A very common Scope 3 blocker for MSMEs is supplier non-response. The supplier is busy, the request looks unfamiliar, and there is no obvious benefit for them to spend three days filling out your form. This is solvable, but only with a sequenced playbook, not a single email blast.

## Why suppliers do not respond

- **They do not have the data.** Most MSME suppliers have never calculated their own footprint.
- **They do not know the format.** They do not speak GHG Protocol.
- **No commercial incentive.** Sharing data does not increase the order value.
- **Confidentiality fear.** They worry the data will be used against them in price negotiations.
- **Request looks like a homework assignment.** Long forms, jargon, no examples.

Every step of the playbook addresses one of these.

## The five-step engagement playbook

### Step 1: Segment the supplier base (week 1)

Do not contact everyone. Rank suppliers by:

1. Annual spend with you.
2. Estimated emission intensity of their sector (use spend-based EEIO factors for the ranking).
3. Strategic dependence (sole-source vs commodity).

A small number of top suppliers usually account for most of your Scope 3. Engage them first. Long-tail can wait or stay on spend-based.

### Step 2: Pre-engagement (week 2)

Before any form goes out, send a one-page letter from a *commercial* signatory (procurement head or CEO), not from sustainability. The letter:

- States why the data matters to you (CBAM, customer requirement, green loan KPI).
- Says nothing about scoring or penalising the supplier.
- Names a single human contact at your end.
- Includes a one-line offer: "we will share back your benchmark vs sector peers anonymously".

This single change usually lifts response rates noticeably.

### Step 3: Make the form survivable (week 3)

A response-grade form for MSME suppliers has three properties:

1. **Under 12 fields.** If you cannot fit it on one screen, you have asked for too much.
2. **Plain language.** "Electricity consumed last year in kWh" beats "Scope 2 location-based emissions in tCO2e per ISO 14064-1 7.3.2".
3. **Pre-filled where possible.** If you already know their HSN code, fill it in. If you know their country, fill in the grid factor field.

A worked example of a minimum viable supplier form:

| Field | Why |
| --- | --- |
| Annual electricity consumed (kWh) | Scope 2 location-based |
| Renewable share of electricity (%) | Scope 2 market-based |
| Annual diesel / LPG / natural gas (litres or kg) | Scope 1 |
| Primary production volume (tonnes or units) | Intensity denominator |
| Country of production | Grid factor |
| HSN / CN code of primary output | Methodology mapping |
| Confidence (estimate / metered / verified) | Data quality tier |

### Step 4: Make it easy to send (week 4)

Offer three response paths:

- Upload to a portal you provide (with read-only sharing).
- Email a PDF with the fields.
- A 20-minute video call where you fill it in for them.

The last option is the highest-success path with reluctant suppliers. The cost (your time) is real but small relative to the value of getting top-supplier data into activity-based tier.

### Step 5: Reciprocate and renew (week 6 onward)

After data is received:

1. **Send back the benchmark.** Anonymously rank them against sector peers. Suppliers care about being above median.
2. **Cite the use.** Tell them which downstream customer or regulator received their (anonymised) data.
3. **Renew annually.** Put the data request into the contract renewal cycle so it stops being a separate ask.

## What to do when a critical supplier refuses

You have four options, in increasing escalation:

1. **Default emission factors.** Use the highest sector-and-country-specific default. This is the GHG Protocol-acceptable fallback and is usually unfavourable to the supplier, which they should know.
2. **Independent estimation.** Hire a Tier 3 estimator to model the supplier's footprint from public data.
3. **Procurement leverage.** Make data sharing a renewal condition for the next contract cycle.
4. **Substitute.** Switch a portion of volume to a supplier that does share. Often a modest volume shift is enough to change the original supplier's posture.

**The honest rule.** No supplier owes you data. But every supplier owes their customer a credible answer to "what is the emission intensity of what I am buying from you?", because increasingly, your customer is asking *you* the same question.

## Tools that help

- **Standardised templates.** CDP Supply Chain, EcoVadis, Sedex have shared formats; reusing them reduces supplier fatigue.
- **MRV-based ingestion.** When suppliers themselves use a deterministic MRV layer (Senseible-equivalent), data sharing becomes a hash-pinned API call, not a form.
- **Industry consortia.** Sector platforms (TfS for chemicals, Catena-X for automotive, Higg for textiles) aggregate supplier data so each supplier reports once.

## FAQ

**How long does it take to build a supplier engagement program?** Several months to the first usable dataset, and longer to mature it into renewal-cycle discipline.

**What response rate is realistic?** A well-run program can get most top suppliers to respond. 100% is a fantasy in year one.

**Do I have to verify supplier data?** Not initially. But the more your number depends on supplier data, the more your customers will require third-party verification of theirs. Plan for verified-tier data in major categories over the next few years.

## Related guides

- [calculating supply chain emissions](https://senseible.earth/climate-intelligence/scope-3-emissions-supply-chain-msme-calculator)
- [spend-based versus activity-based Scope 3](https://senseible.earth/climate-intelligence/spend-based-vs-activity-based-scope-3-method-choice)
- [Scope 3 for Bangladesh textile exporters](https://senseible.earth/climate-intelligence/scope-3-calculator-bangladesh-textile-exporters)
- [embedded emissions in semi-finished imports](https://senseible.earth/climate-intelligence/emissions-data-hidden-in-semi-finished-imports)
