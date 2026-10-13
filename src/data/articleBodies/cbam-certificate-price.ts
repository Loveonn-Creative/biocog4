// Article body (markdown subset). Metadata lives in ../articleIndex.ts.
// Sources researched October 2026 (kept here, not on the page):
// it.andersen.com "CBAM: the first certificate price will be published on
// 7 April 2026"; epa.ie CBAM certificates page (Q1 EUR 75.36 on 7 Apr 2026,
// Q2 EUR 75.28 on 6 Jul 2026, Q4 due 4 Jan 2027); alcircle.com news 121455
// (Q3 EUR 82.32, 5 Oct 2026); environnement.public.lu CBAM certificates and
// price (weighted average of EU ETS auction clearing prices; purchase from
// 1 Feb 2027; weekly price from 2027, published Monday, effective Tuesday).
export default `Every CBAM cost estimate multiplies two numbers: the embedded emissions in a shipment and the price of one CBAM certificate. Exporters spend most of their effort on the first number. The second one is set in Brussels, follows the EU carbon market, and changes on a published schedule. Knowing how it works tells you which price to use in a quote and how much it can move.

## One certificate, one tonne

A CBAM certificate covers one tonne of CO2e embedded in imported goods. The EU importer, as authorised declarant, buys certificates for the embedded emissions it declares, after deducting the share still covered by EU free allocation and any carbon price paid at origin.

## How the price is calculated

The certificate price is tied to the EU Emissions Trading System. The European Commission calculates it from the weighted average of the auction clearing prices of EU ETS allowances.

- **In 2026:** the Commission publishes one price per quarter, which applies to goods imported during that quarter.
- **From 2027:** the price becomes weekly, based on the average EU ETS auction price of the previous week, published on Monday and applying from Tuesday.

Certificates for 2026 imports can be bought from 1 February 2027, and the first annual declaration, covering 2026, is due by 30 September 2027.

## The 2026 prices so far

| Quarter | Price per certificate | Published |
|---|---|---|
| Q1 2026 | €75.36 | 7 April 2026 |
| Q2 2026 | €75.28 | 6 July 2026 |
| Q3 2026 | €82.32 | 5 October 2026 |
| Q4 2026 | to be published | due 4 January 2027 |

Senseible's [CBAM calculator](/cbam-calculator) and the [cost tables by sector](/cbam-cost) use the latest published price, €82.32, and hold it flat to 2034 so that the change in cost comes only from emissions and the phase-out of free allocation.

## What this means for a quote

- **Quote with a range, not a point.** The EU carbon price moved by about €7 between the second and third quarters of 2026. A tonne of steel at default values embeds roughly two tonnes of CO2, so the certificate cost per tonne of product moves by about twice the price change, less the share still allocated free.
- **The quarter of import decides the 2026 price.** Goods that clear customs in a given quarter of 2026 use that quarter's price, whenever the certificates are bought.
- **From 2027, timing matters weekly.** Importers will watch the EU ETS more closely, and some will ask suppliers to share the risk in contracts.
- **The emissions number is the one you control.** A verified actual figure below the default value lowers the bill at any price. For when that pays off, see [CBAM default values versus actual emissions](/climate-intelligence/cbam-default-values-vs-actual-emissions-msme-decision-guide).

For how the declaration itself works, read [how the CBAM declaration works and what exporters must provide](/climate-intelligence/how-to-file-eu-carbon-tax-report-msme-guide).

This is general guidance, not legal advice. Check the Commission's published prices for the quarter of import.`;
