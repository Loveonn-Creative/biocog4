// Article body (markdown subset). Metadata lives in ../articleIndex.ts.
// Sources researched October 2026 (kept here, not on the page):
// lexplosion.in and vinodkothari.com on RBI draft Disclosure Framework on
// Climate-related Financial Risks, 28 Feb 2024 (SCBs, top and upper layer
// NBFCs; Scope 1, 2, 3; metrics and targets from FY2027-28); indiacorplaw.in
// 2026/09/09 (framework still at draft; banks report Scope 1 and 2;
// BRSR Scope 3 voluntary); PCAF Global GHG Accounting and Reporting Standard
// (attribution factors, data quality scores 1 to 5).
export default `For a bank, almost all of its carbon footprint sits in its loan book. The electricity in its branches is small next to the emissions of the steel mills, transporters and factories it finances. Those are financed emissions, Scope 3 Category 15 under the GHG Protocol, and they are what climate disclosure frameworks for lenders are built around.

In India, measuring them has moved from a question for sustainability teams to one for risk and credit. This article explains the method, where Indian regulation stands, and the practical problem every lender hits first: data from small borrowers.

## Where regulation stands

The Reserve Bank of India issued a draft Disclosure Framework on Climate-related Financial Risks on 28 February 2024. It would apply to all scheduled commercial banks and to top-layer and upper-layer NBFCs, with others able to adopt it voluntarily. Its metrics and targets pillar includes Scope 1, 2 and 3 emissions, phased in for the largest entities from 2027-28 in the draft timeline.

At the time of writing the framework has not been finalised, as a September 2026 legal commentary noted. Under SEBI's BRSR, Scope 3 disclosure is voluntary, and most large Indian banks report Scope 1 and 2 only. Investors and global partners are asking for more.

## The method: PCAF

The Partnership for Carbon Accounting Financials (PCAF) standard is the common method. For a business loan, the core idea is attribution:

- **Attribution factor** = the lender's outstanding amount ÷ the borrower's total equity plus debt (or enterprise value for listed companies).
- **Financed emissions** = attribution factor × the borrower's emissions.

If a bank has lent ₹2 crore to a company with ₹10 crore of equity and debt, it attributes 20 percent of that company's emissions to its book.

## Data quality decides how useful the number is

PCAF scores data from 1 (best) to 5 (worst):

- **Score 1 to 2:** the borrower's own verified or reported emissions.
- **Score 3:** emissions estimated from the borrower's physical activity, such as fuel or electricity use.
- **Score 4 to 5:** estimates from revenue or the loan amount using sector averages.

For MSME portfolios, almost everything starts at score 4 or 5, because small borrowers do not report emissions. That makes the number weak for risk decisions: two textile units with the same turnover get the same estimate even if one runs on solar and the other on coal.

## How to move an MSME book up the quality ladder

1. **Collect activity data at onboarding and renewal.** Electricity bills and fuel invoices are already in many loan files; they support a score of 3 directly.
2. **Prioritise by exposure and sector.** Start with the largest loans in steel, cement, chemicals, textiles and transport.
3. **Use verified borrower records where they exist.** A borrower with a documented emissions record, each number traceable to an invoice, can be scored better than a sector average.
4. **Keep the method and factors versioned,** so year-on-year changes reflect real change, not a new spreadsheet.

Senseible gives borrowers a verified record built from their own bills and invoices, which lenders can read as activity-based evidence. For the borrower's side of the same conversation, see [how climate risk differs from ESG for a lender](/climate-intelligence/climate-risk-vs-esg-difference-financial-institutions) and [physical versus transition risk](/climate-intelligence/physical-vs-transition-climate-risk-financial-institutions).

This is general guidance. Check the RBI's current circulars and the PCAF standard for your reporting.`;
