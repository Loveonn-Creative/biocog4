// Article body (markdown subset). Metadata lives in ../articleIndex.ts.
export default `Emission factor selection directly impacts the accuracy and credibility of your GHG inventory. Follow this hierarchy for choosing factors.

**Hierarchy of Data Quality:**
1. **Supplier-specific:** Direct measurement or verified data from your actual suppliers
2. **Product-specific:** Third-party verified Environmental Product Declarations
3. **Regional/Country:** National databases reflecting local production methods
4. **Industry average:** Sector benchmarks from recognized databases
5. **Global default:** IPCC default factors (least preferred)

**Key Databases:**
- India: CEA, Bureau of Energy Efficiency, MoPNG
- EU: Ecoinvent, GaBi, EU PEF database
- Global: IPCC, EPA, IEA, DEFRA (UK)

**Critical Considerations:**
- Match factor units to your activity data (kWh, liters, tonnes)
- Check factor boundaries (well-to-wheel vs tank-to-wheel)
- Update factors annually where possible
- Document factor sources and versions

**Common Mistakes:**
- Using outdated factors
- Mixing unit systems (metric vs imperial)
- Applying wrong boundaries (e.g., using production factor for consumption)
- Not adjusting for regional electricity mix`;
