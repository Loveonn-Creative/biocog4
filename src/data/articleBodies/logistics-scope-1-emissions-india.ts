// Article body (markdown subset). Metadata lives in ../articleIndex.ts.
export default `A fleet's Scope 1 emissions are the fuel its own vehicles burn. Multiply litres of diesel from fuel invoices by an emission factor of about 2.645 kgCO2 per litre: a truck using 3,000 litres a month emits about 8 tonnes of CO2. Hired transport is Scope 3, not Scope 1.

## At a glance

| Item | Detail |
|---|---|
| Scope 1 for logistics | Fuel burned in vehicles you own or control |
| Scope 3 for logistics | Freight carried by hired transporters (Categories 4 and 9) |
| Diesel factor used here | 2.645 kgCO2 per litre (combustion only; check your chosen factor source) |
| Example | 3,000 litres a month = 7.94 tCO2 |
| Framework for freight | GLEC Framework and ISO 14083 |

## The formula

Scope 1 (kgCO2) = litres of fuel × emission factor for that fuel (kgCO2 per litre).

Diesel factors from common sources fall in a narrow band of about 2.64 to 2.7 kgCO2 per litre; the difference comes from assumed density and calorific value. Use one source consistently and state it.

## Worked example: a 5-truck fleet

| Truck | Litres in the year | kgCO2 at 2.645 |
|---|---|---|
| Truck 1 | 36,000 | 95,220 |
| Truck 2 | 32,500 | 85,963 |
| Truck 3 | 40,200 | 106,329 |
| Truck 4 | 28,800 | 76,176 |
| Truck 5 | 34,500 | 91,252 |
| **Fleet** | **172,000** | **454,940 (≈ 455 t)** |

If the fleet moved 9.2 million tonne-kilometres, intensity is about 49 gCO2 per tonne-kilometre. Compare routes and modes with the [freight emissions calculator](/calculators/logistics-emissions).

## Data that holds up in an audit

1. Fuel invoices with date, vehicle number, litres and pump.
2. Odometer readings to cross-check litres per kilometre.
3. Separate records for reefer units, which add fuel and refrigerant leakage.
4. A clear line between owned vehicles (Scope 1) and hired trucks (Scope 3).

## Frequently asked questions

### Are hired trucks part of my Scope 1?
No. Freight moved by hired transporters is Scope 3. Your Scope 1 covers vehicles you own or operate.

### What about CNG or electric vehicles?
CNG burned in your vehicles is Scope 1 with a gas-specific factor. Electricity for EV charging is Scope 2, calculated with the grid factor.

### Do I need GLEC for a small fleet?
Not to report Scope 1. GLEC and ISO 14083 matter when customers ask for emissions per shipment or per tonne-kilometre.

## Related

- [GLEC Framework explained](/climate-intelligence/glec-framework-explained-msme-freight-emissions)
- [Scope 1 emissions for manufacturers in India](/climate-intelligence/manufacturing-scope-1-emissions-india)
- [Emissions for logistics businesses](/industries/logistics)

## Sources

- [GHG Protocol Corporate Standard](https://ghgprotocol.org/corporate-standard)
- [Smart Freight Centre: GLEC Framework](https://www.smartfreightcentre.org/en/our-programs/emissions-accounting/global-logistics-emissions-council/)
- [IPCC 2006 Guidelines, Volume 2 (Energy), default CO2 emission factors](https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html)`;
