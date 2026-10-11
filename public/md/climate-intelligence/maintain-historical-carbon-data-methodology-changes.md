# How do we maintain historical carbon data when methodologies change?

Canonical: https://senseible.earth/climate-intelligence/maintain-historical-carbon-data-methodology-changes

Maintain parallel datasets rather than overwriting historical records. When a methodology changes, such as an update to GHG Protocol guidance or new emission factors published by national authorities, create a new data series while preserving the original calculations under the old method.

Document the change clearly: note the effective date, the reason for the change, the specific parameters that differ, and the impact on reported emissions. For year-over-year comparisons, recalculate at least the prior year using the new methodology to enable like-for-like comparison, but retain the original figures in archived records.

This dual approach allows you to show trend consistency under current methods while maintaining a complete historical audit trail. Use version tags in your database or spreadsheet, such as Emissions_2023_v1_GHGProtocol2015 and Emissions_2023_v2_GHGProtocol2022.

Disclosure documents should include a reconciliation note explaining the methodology change and quantifying the difference. This practice aligns with requirements under frameworks like TCFD, which emphasize consistency and transparency in reporting methodologies over time. It also protects against challenges during external assurance or regulatory review.

## Related guides

- [What are the different types of carbon credits in voluntary markets?](https://senseible.earth/climate-intelligence/carbon-credit-types-voluntary-markets)
- [How do we select the right emission factors for our calculations?](https://senseible.earth/climate-intelligence/emission-factors-selection-guidance)
- [Scope 1 vs Scope 2 vs Scope 3: A Simple Guide for Small Businesses](https://senseible.earth/climate-intelligence/scope-1-2-3-emissions-simple-guide-small-business)
