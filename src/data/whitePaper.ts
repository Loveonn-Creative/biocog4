// The Senseible White Paper as structured content. One source feeds the page
// (src/pages/WhitePaper.tsx) and the prerendered HTML and /md mirror
// (src/lib/seo/staticContent.ts), so the indexed text is the published text.
//
// Prose markup: **bold**, $inline math$ (src/lib/mathMarkup.ts), and
// {eq:id} / {fig:id}, replaced by the equation or figure number, so numbers
// stay right when sections change.
//
// Sections 1 to 12 and the appendices follow the owner's White Paper PDF
// (October 2026). Additions describe the code as it works today, each checked
// against its source:
//   2.3 units and electricity   supabase/functions/_shared/emissionFactors.ts (normalizeUnit, calculateEmissions)
//                               supabase/functions/_shared/electricityBill.ts (APPARENT, NET, printedBilledKwh)
//   3.1 factor derivation       emissionFactors.ts FUEL_FACTORS comments; IPCC 2006 V2 Ch1 Tables 1.2 to 1.4
//                               (carbon content LPG 17.2 kgC/GJ; CO2 LPG 63,100 and residual fuel oil
//                               77,400 kg/TJ; NCV LPG 47.3, residual fuel oil 40.4 TJ/Gg)
//   4.1 acceptance checks       supabase/functions/_shared/verifyGate.ts (validateEmission, evidenceGaps,
//                               calculateGreenwashingRisk, previewVerification). Risk weights are left
//                               out on purpose (methodology documentation under NDA, Section 12).
//   5.1 long documents          supabase/functions/_shared/pdfPages.ts MAX_PDF_PAGES, src/lib/pdfSplit.ts
//   5.2 grounding               supabase/functions/intelligence-chat/index.ts (<records> block, leak check)
//   5.3 projection              supabase/functions/_shared/intelligence.ts projectTrend, PROJECTION_MIN_MONTHS
//   Power relations             IEEE Std 1459-2010 (sinusoidal definitions)
//   Supplier sharing (2, 6.2,   drizzle/migrations/0034_enterprise_pilot.sql and 0038 (token_hash, link claims, reminder links, share_with_enterprise,
//   7.1, 8 to 11)               snapshot_hash, consent_text_hash, withdraw_supplier_consent, 3-day reminder rule);
//                               supabase/functions/_shared/supplierPilot.ts (gradeFor, supplier sheet columns)
//   5.4 supplier questions      supabase/functions/enterprise-intelligence/index.ts (RULES)
//   8 guest uploads             supabase/functions/_shared/guestScan.ts (GUEST_DAILY_SCANS), src/lib/guestResults.ts

export type WPFigure = 'uncertainty' | 'datamodel' | 'flow' | 'supplierflow';
export type WPWidget = 'scope2' | 'proration' | 'rounding' | 'hash';

export type WPBlock =
  | { p: string }
  | { ul: string[] }
  | { h3: string; id: string }
  | { eq: string[]; id: string }
  | { plain: string }
  | { example: string; label?: string }
  | { note: string; label?: string }
  | { table: { head: string[]; rows: string[][]; variant?: 'isnot' | 'notation' } }
  | { figure: WPFigure; id: string; title: string; caption: string }
  | { widget: WPWidget };

export interface WPSection {
  id: string;
  title: string;
  blocks: WPBlock[];
}

export const WP_PATH = '/white-paper';
export const WP_TITLE = 'White Paper';
export const WP_TAGLINE = 'Every figure traceable to its source.';
export const WP_PUBLISHED = '2026-10-15';
export const WP_CONTACT = 'build@senseible.earth';

export const WP_SECTIONS: WPSection[] = [
  {
    id: 'intended-use',
    title: '1. Intended use and limits',
    blocks: [
      { p: 'Senseible converts business documents such as tax invoices and utility bills into greenhouse-gas activity records, calculates emissions with published factors, and keeps an evidence trail for each figure.' },
      { table: { variant: 'isnot', head: ['Senseible is', 'Senseible is not'], rows: [
        ['A baselining, screening and evidence-management tool', 'An assurance provider, auditor, verifier or accredited body'],
        ['A calculator producing estimates with stated uncertainty', 'A source of certified or third-party-verified figures'],
        ['A preparer of framework-aligned report drafts', 'A carbon registry, exchange or credit issuer'],
        ['A data-preparation aid for customers reporting under carbon-border and disclosure regimes', 'A substitute for installation-level monitoring plans and accredited verification where a regime requires them'],
      ] } },
      { p: 'All reports are self-declared by the customer. Acceptance by any regulator, lender, investor or buyer is not guaranteed.' },
      { note: 'Where this paper uses a formula, the sentence or paragraph right after it explains what it means. Numbers in worked examples are illustrative round values chosen to show the arithmetic. They are not published emission factors. Symbols are listed in Appendix A and sources in Appendix B.', label: 'How to read the equations' },
    ],
  },
  {
    id: 'accounting-method',
    title: '2. Accounting method',
    blocks: [
      { ul: [
        '**Framework.** Calculations follow the accounting principles of the GHG Protocol Corporate Standard, Scope 2 Guidance and Scope 3 Standard. Scope 1: direct combustion and process sources. Scope 2: purchased electricity, energy, heat. Scope 3: other value-chain activity.',
        '**Scope 2.** Location-based and market-based results are reported as separate figures where the customer supplies the instrument data needed for market-based accounting.',
        '**Calculation.** Emissions equal activity quantity multiplied by an emission factor. A line is calculated only when activity category, quantity, unit and a matching registry factor are all present. Quantities are never inferred from monetary amounts for Scope 1 and 2 activity.',
        '**Scope 3.** Where only spend data exists, a spend-based method is used and labelled as such. Spend-based results carry materially wider uncertainty than activity-based results and are presented with that range.',
        '**Avoided emissions and offsets.** Reported separately, with their methodology stated. They are never subtracted from the Scope 1, 2 or 3 inventory.',
        '**Direct measurement.** Invoices record purchases, not consumption. Sources such as refrigerant leakage, process emissions and captive generation are calculated only when the customer supplies the underlying measured or metered data.',
        '**Supplier-shared Scope 3.** An enterprise can ask its suppliers for their emissions. Each supplier\'s figure is calculated with this same method from that supplier\'s own bills, or is the supplier\'s own figure, shared marked as without bills. It reaches the enterprise only as totals the supplier chooses to share (Section 6.2).',
      ] },
      { h3: '2.1 The core equation', id: 'core-equation' },
      { eq: ['E = A × EF'], id: 'core' },
      { plain: 'Emissions (E, in kilograms of CO₂-equivalent) equal the amount of activity (A: litres of fuel, kilowatt-hours, tonne-kilometres) multiplied by an emission factor (EF: kilograms of CO₂-equivalent released per unit of that activity). For example, 100 litres of a fuel with an illustrative factor of 2.5 kgCO₂e per litre gives 100 × 2.5 = 250 kgCO₂e. This is the form the IPCC and the GHG Protocol use for fuel combustion and purchased energy.' },
      { eq: ['EF_{CO₂e} = EF_{CO₂}', '+ GWP_{CH₄} · EF_{CH₄}', '+ GWP_{N₂O} · EF_{N₂O}'], id: 'gases' },
      { plain: 'Burning a fuel releases carbon dioxide, a little methane and a little nitrous oxide. Each gas warms the climate by a different amount, so each is multiplied by its Global Warming Potential (GWP), which compares one kilogram of that gas with one kilogram of CO₂ over 100 years, and the results are added. Under IPCC Sixth Assessment Report values, $GWP_{CH₄}$ is 29.8 for fossil methane and 27.0 for non-fossil methane, and $GWP_{N₂O}$ is 273. The GWP set used (for example AR5 or AR6) is stored on every line, and one total never mixes sets.' },
      { eq: ['EF_{CO₂} = CC × OF × \\frac{44}{12}'], id: 'carbon' },
      { plain: 'Background on where a combustion factor comes from. Carbon is conserved: the carbon in the fuel (CC, kilograms of carbon per unit of fuel) that actually burns (OF, the oxidation fraction) leaves as CO₂. Each kilogram of carbon becomes 44/12, about 3.67, kilograms of CO₂ because CO₂ is heavier than carbon alone (molar masses of about 44 and 12 g/mol). Senseible applies published factors from its registry. It does not substitute its own figures for them.' },
      { h3: '2.2 Activity types and their equations', id: 'activity-types' },
      { eq: ['A_{freight} = (m / 1000) × d', 'E = A_{freight} × EF_{tkm}'], id: 'freight' },
      { plain: 'Freight is measured in tonne-kilometres: the mass moved (m, kilograms, divided by 1000 to get tonnes) times the distance (d, kilometres). Moving 30,000 kg over 1,400 km is 30 × 1,400 = 42,000 tonne-kilometres. At an illustrative 0.05 kgCO₂e per tonne-kilometre that is 2,100 kgCO₂e.' },
      { eq: ['E_{spend} = S × EF_{spend}'], id: 'spend' },
      { plain: 'When no quantity is available, money spent (S) is multiplied by an average factor for that kind of purchase (kilograms of CO₂e per unit of currency). This is the spend-based method in the GHG Protocol Scope 3 guidance. It is only an average over many products, so its uncertainty is much wider than an activity-based figure. Senseible labels it as spend-based and shows the range.' },
      { eq: ['E_{location} = Σ_{p} kWh_{p} × EF_{grid,p}', 'E_{market} = Σ_{i} kWh_{i} × EF_{i} + kWh_{res} × EF_{res}'], id: 'scope2' },
      { plain: 'Purchased electricity is reported two ways. The location-based figure multiplies each period\'s kilowatt-hours (p runs over periods) by the average factor of the local grid. The market-based figure multiplies the kilowatt-hours covered by each contractual instrument i (a certificate, power purchase agreement or supplier contract) by that instrument\'s factor, and multiplies the remaining uncovered kilowatt-hours, $kWh_{res} = kWh_{total} − Σ kWh_{i}$, by a residual-mix factor. Each instrument can be counted only once, and cannot cover more than was consumed. Illustration: 10,000 kWh, of which 6,000 kWh are covered by an instrument with factor 0, a grid factor of 0.80 and a residual factor of 0.90 gives a location-based 8,000 kgCO₂e and a market-based 4,000 × 0.90 = 3,600 kgCO₂e. The GHG Protocol Scope 2 Guidance requires both to be reported where market-based data exist.' },
      { widget: 'scope2' },
      { eq: ['T = E_{1} + E_{2} + E_{3}', '(avoided emissions R reported beside T, never T − R)'], id: 'total' },
      { plain: 'The inventory total is the sum of Scope 1, 2 and 3. Reductions elsewhere (avoided emissions, offsets) are shown as a separate line with their method, and are not deducted from the inventory, which keeps the total comparable between companies and years.' },
      { h3: '2.3 Units and the physics of a valid quantity', id: 'units-physics' },
      { p: 'An emission factor is defined per physical unit, so before equation {eq:core} is applied the quantity read from a document must be in the factor\'s unit and must measure the same physical thing.' },
      { eq: ['A_{c} = k_{u} × A_{p}'], id: 'units' },
      { plain: 'The printed quantity ($A_{p}$) is converted to the unit of the factor ($A_{c}$) with a fixed multiplier ($k_{u}$): 1 for kilowatt-hours, 1,000 from megawatt-hours to kilowatt-hours, 1,000 from kilolitres to litres and 1,000 from tonnes to kilograms. A multiplier exists only between units of the same kind. If a document gives litres and the factor is per kilogram, there is no multiplier, so the line gets no figure. A density is used only where it is written into the factor record itself (equation {eq:derive}).' },
      { eq: ['EF_{grid} = \\frac{Σ_{g} M_{g}}{Σ_{g} G_{g}}'], id: 'grid' },
      { plain: 'A location-based grid factor is the carbon dioxide emitted by the power stations feeding a grid ($M_{g}$ for station g) divided by the electricity they supplied ($G_{g}$). It averages coal, gas, hydro, nuclear, solar and wind generation together, which is why every kilowatt-hour drawn from the same grid in the same period carries the same factor. Senseible takes this value from the national grid authority\'s published database (Section 3). It does not compute or adjust it.' },
      { eq: ['kVA^{2} = kW^{2} + kvar^{2}', 'kW = kVA × cos φ', 'kWh = kVAh × \\bar{PF}'], id: 'power' },
      { plain: 'Alternating current carries real power (kW), which does useful work and is what power stations burn fuel to produce, and reactive power (kvar), which flows back and forth to keep motors and transformers magnetised without being used up. Together they make apparent power (kVA). For a sinusoidal supply the three form a right-angled triangle, and the cosine of the angle φ between real and apparent power is the power factor. Over a billing period they add up to kWh, kvarh and kVAh. Grid emission factors are per kWh of real energy. Some industrial tariffs bill in kVAh, and turning kVAh into kWh needs the period\'s average power factor ($\\bar{PF}$), which is itself defined as kWh divided by kVAh. Illustration: 10,000 kVAh at an average power factor of 0.95 is 9,500 kWh; treating it as 10,000 kWh would overstate emissions by about 5%. Senseible never treats kVAh as kWh. On a kVAh-billed bill it uses the kWh printed on the same bill (usually in the meter-reading table) when there is one. If only the power factor is printed, it calculates kWh = kVAh × that printed power factor and labels the line as an estimate with lower data quality; a power factor is never assumed. With neither printed, the bill is kept with no emissions and the result asks for the kWh or power factor. Reactive energy (kvarh) is never converted. Handwritten bills and meter photographs are read the same way and labelled as such: a meter photo counts only when two readings are visible, as the later reading minus the earlier one.' },
      { eq: ['kWh_{net} = kWh_{import} − kWh_{export}'], id: 'net' },
      { plain: 'A rooftop-solar customer on net metering may see one figure that is grid import minus solar export. Scope 2 counts electricity bought from the grid, so the import reading is needed; the net figure understates it. Exported solar is a separate quantity, reported if at all as avoided emissions beside the inventory (equation {eq:total}), never deducted from it. Senseible does not treat net units as consumption and notes on the result that import units are needed.' },
    ],
  },
  {
    id: 'factor-governance',
    title: '3. Emission factor governance',
    blocks: [
      { ul: [
        '**Registry.** Every factor is held in a versioned registry with its value, unit, geography, gas basis, Global Warming Potential set, publisher, source document, publication year and validity period.',
        '**Sources.** Primary publications only: national grid authority databases, IPCC guidelines and emission factor database, national government conversion-factor sets, and the International Energy Agency for other countries.',
        '**No factor, no figure.** If no registry factor matches an activity, the line returns no result and is flagged. The system does not estimate or substitute a similar factor.',
        '**Pinning.** Each result stores the factor identifier, source, year and methodology version in force when it was calculated. Later factor updates do not alter stored results; recalculation creates a new, linked record.',
      ] },
      { eq: ['A_{k} = A × d_{k} / d', 'E = Σ_{k} A_{k} × EF_{k}'], id: 'prorate' },
      { plain: 'A factor is valid only for a stated period. When a bill covers days from two validity periods, the quantity is split in proportion to days ($d_{k}$ days in period k, out of d days in total) and each part uses the factor valid for its own period. A 30-day bill with 12 days in the first period puts 40% of the kilowatt-hours under the first factor and 60% under the second. If no factor exists, the result is left empty, which is different from zero. A missing factor never turns into a silent 0.' },
      { widget: 'proration' },
      { h3: '3.1 From a published default to a factor per kilogram or litre', id: 'factor-derivation' },
      { eq: ['EF_{mass} = EF_{energy} × NCV', 'EF_{vol} = EF_{mass} × ρ'], id: 'derive' },
      { plain: 'Fuel tables give CO₂ per unit of energy (kilograms per terajoule), but invoices give kilograms or litres. The net calorific value (NCV, the energy released per unit of mass) turns the first into CO₂ per kilogram, and the density (ρ, kilograms per litre) turns that into CO₂ per litre. Where a density is needed it is an assumption, written into the factor record with its value, and a supplier\'s measured value should replace it.' },
      { example: 'LPG has a default carbon content of 17.2 kg of carbon per gigajoule. By equation {eq:carbon}, with full oxidation as the IPCC defaults assume, that is 17.2 × 44/12 ≈ 63.1 kg CO₂ per gigajoule, the tabulated 63,100 kg per terajoule. With an NCV of 47.3 gigajoules per tonne, one kilogram of LPG gives 63.1 × 47.3 / 1,000 ≈ 2.98 kg CO₂. Residual fuel oil (furnace oil) gives 77.4 × 40.4 / 1,000 ≈ 3.13 kg CO₂ per kilogram; at an assumed density of 0.95 kg per litre, about 2.97 kg CO₂ per litre. Naphtha is published per mass only, so it is kept per kilogram and a naphtha line in litres gets no figure. These are the carbon-dioxide parts of the factors; equation {eq:gases} shows how methane and nitrous oxide are added where a registry factor includes them.', label: 'Worked derivation (IPCC 2006 default values)' },
    ],
  },
  {
    id: 'uncertainty',
    title: '4. Uncertainty and data quality',
    blocks: [
      { ul: [
        '**Range reporting.** Each line carries a low, central and high value derived from the factor\'s published uncertainty. Totals combine lines using error propagation, and the range is shown beside every total in the dashboard, exports and reports.',
        '**Data-quality flags.** Missing fields, unit anomalies, unclassified items and low extraction quality reduce a documented data-quality score. The score measures completeness and consistency of inputs. It does not measure the accuracy of the underlying facility.',
        '**Consistency status.** Records are labelled internally consistent, needs review, or insufficient data. "Internally consistent" means the record passed the system\'s rule checks. It does not mean independently verified.',
      ] },
      { eq: ['u_{E} = \\sqrt{u_{A}^{2} + u_{EF}^{2}}'], id: 'line-uncertainty' },
      { plain: 'For a single line, E = A × EF. If the activity data are uncertain by $u_{A}$ (as a fraction, for example 0.05 for 5%) and the factor by $u_{EF}$, and the two errors are independent, the line\'s relative uncertainty is the square root of the sum of their squares. This is the IPCC (2006) rule for multiplying independent quantities. Squaring means the larger error dominates: 5% and 3% combine to about 5.8%, not 8%.' },
      { eq: ['Var(E_{tot}) = Σ_{f} [ (Σ_{i∈f} A_{i})^{2} σ_{f}^{2}', '+ EF_{f}^{2} Σ_{i∈f} σ_{A,i}^{2} ]', 'U_{tot} = \\sqrt{Var(E_{tot})} / E_{tot}'], id: 'total-uncertainty' },
      { plain: 'Many lines can use the same emission factor f. A factor\'s error is the same error repeated on every line that uses it, so it must be added once on the combined quantity, not once per line. In the formula, the first term is the factor\'s error ($σ_{f}$) applied to the summed activity of all lines using it. The second term is each line\'s own activity error ($σ_{A,i}$), which is independent between lines. The square root of the variance, divided by the total, is the relative uncertainty $U_{tot}$. This follows the standard propagation law in the ISO/IEC Guide 98-3 (GUM) and IPCC Approach 1, with correlation of the shared factor included.' },
      { example: 'Two lines share one factor of 2.0 with 3% uncertainty. Line 1 has 100 units and line 2 has 200 units, each with 5% activity uncertainty. The total is 2.0 × 300 = 600. The variance is 300² × 0.06² + 2.0² × (5² + 10²) = 324 + 500 = 824, so the standard deviation is 28.7, which is 4.78% of the total. Treating the two lines as fully independent would give 4.35% and understate the uncertainty by about 10%. For a range at roughly 95% coverage (coverage factor 1.96, assuming a normal distribution), the total is about 600 ± 56, or 544 to 656.', label: 'Worked example (illustrative)' },
      { note: 'It is a first-order approximation. It is reliable when relative uncertainties are modest (IPCC guidance treats about 30% as the practical limit) and assumes activity errors are independent between lines. For larger or asymmetric uncertainties, the IPCC recommends Monte Carlo simulation (Approach 2). Factor uncertainties are those published by the factor\'s source. Senseible does not generate its own.', label: 'Limits of this method' },
      { figure: 'uncertainty', id: 'uncertainty', title: 'Why a shared emission factor sets a floor on total uncertainty', caption: 'Relative uncertainty of a total when n equal lines share one factor (3%), each with 5% independent activity uncertainty. The total follows U = √(u_F² + u_A²/n) and cannot fall below the factor\'s own uncertainty. Move the sliders to try other values.' },
      { eq: ['Q = max( 0 , min( 100 , 100 − Σ_{k} p_{k} · n_{k} ) )'], id: 'quality' },
      { plain: 'The data-quality score starts at 100 and loses points each time a documented check flags a problem: $n_{k}$ is how many times flag k occurred (for example a missing quantity or an unclassified item), and $p_{k}$ is that flag\'s penalty, held in versioned configuration. The score is kept between 0 and 100. Because it is a fixed rule, the same document always scores the same. It describes the completeness of the paperwork, not the true emissions of a site.' },
      { h3: '4.1 The checks a record passes before it is accepted', id: 'acceptance-checks' },
      { p: 'Equation {eq:quality} is applied to every emission line with these penalties, the values in force in the current methodology version:' },
      { table: { head: ['Check (flag k)', 'Penalty pₖ'], rows: [
        ['Activity quantity missing, zero or negative', '20'],
        ['Activity unit missing', '15'],
        ['Emission factor missing', '10'],
        ['Quantity unusually high for one record (above 1,000,000 units, or 100,000,000 kWh for grid electricity)', '25'],
        ['Source document read with extraction confidence below 70 out of 100', '15'],
      ] } },
      { eq: ['line passes if Q_{i} ≥ 80', 'F_{pass} = n_{pass} / n'], id: 'pass' },
      { plain: 'A line passes when its score $Q_{i}$ is 80 or more, so any combination of flags costing more than 20 points fails it. $F_{pass}$ is the share of the n lines in a batch that pass. Score alone is not enough: the evidence gate below runs first.' },
      { p: 'Before scoring, an evidence gate requires every line to have its source document and that document\'s SHA-256 fingerprint; a scope of 1, 2 or 3; an activity classification, quantity and unit; an emission factor with its source and the source line it was read from; and a calculated result. A factor written by the current methodology must equal the published registry value for its source. Scope 3 lines are checked line by line in the supplier evidence trail instead. The stored result must also recompute:' },
      { eq: ['| A × EF − E | ≤ max( 0.01 , 0.001 · E )'], id: 'recompute' },
      { plain: 'Quantity times factor must reproduce the stored emissions to within 0.1%, or 0.01 kg for very small values. The stored number is re-derived rather than trusted, so an edited or corrupted result cannot pass.' },
      { p: 'Each batch also receives a screening risk level (low, medium or high) from patterns that are unusual in genuine records, such as a high share of whole-number results, missing invoice numbers, low average line scores, or one identical factor across many fuel lines. The weights are part of the methodology documentation described in Section 12. The status then follows:' },
      { table: { head: ['Status', 'Rule'], rows: [
        ['Insufficient data', 'Any line misses a field required by the evidence gate'],
        ['Internally consistent', '$F_{pass}$ ≥ 0.8 and risk low'],
        ['Needs review', '$F_{pass}$ ≥ 0.5 and risk not high'],
        ['Not accepted', 'Any other case'],
      ] } },
      { p: 'In the app the internally consistent status is labelled Verified. As stated above, it means the batch passed these rule checks, not that it was independently verified. The same rules run in the preview offered to visitors who are not signed in, which records nothing.' },
    ],
  },
  {
    id: 'ai-architecture',
    title: '5. AI architecture and boundaries',
    blocks: [
      { note: 'AI reads and explains; deterministic code classifies, calculates and scores.', label: 'Principle' },
      { table: { head: ['Layer', 'Function', 'Control'], rows: [
        ['Extraction', 'A vision-capable language model reads a document image and returns structured fields.', 'Fixed output schema. Minimum-variability settings. Absent fields return null; the model may not infer quantities, units or codes.'],
        ['Classification', 'Rule-based mapping by full tax-code match first, then whole-word keyword match only when the unit agrees.', 'Ambiguous or unmatched items are marked for review, never guessed.'],
        ['Plausibility checks', 'Unit conversion and quantity-price-total consistency checks.', 'Failures block calculation and route the line to review.'],
        ['Calculation and scoring', 'Registry factors applied by versioned code.', 'Same input gives the same output. No model influence.'],
        ['Human review', 'Reviewers confirm or override flagged lines.', 'Every override records who, when, what changed and why.'],
        ['Advisory chat and recommendations', 'Language models explain results and suggest improvements.', 'Text only. Figures come from the signed-in user\'s own records. The models cannot alter figures, scores or status, and are instructed not to estimate missing values or claim certification.'],
      ] } },
      { p: 'Model text output cannot be guaranteed identical between calls. Repeatability is enforced by the system: a document already processed is returned from stored results or rejected as a duplicate, not reprocessed.' },
      { h3: '5.1 How the language model is constrained', id: 'model-constraints' },
      { eq: ['y_{t} = argmax_{v} P( v | y_{<t}, image, instructions )'], id: 'argmax' },
      { plain: 'A language model writes its answer one token (a word fragment) at a time. At each step it scores every possible next token, P(v | everything so far). At temperature 0 it always takes the highest-scoring token (argmax) instead of sampling at random, which removes sampling randomness. This lowers variability but does not guarantee identical text across model versions or hardware, which is why results are stored and reused. The reply must fit a fixed schema of named fields, and a field that is not clearly visible must be null. The model\'s output is treated as untrusted input: every field must pass the checks below before it reaches a calculation.' },
      { eq: ['| q × r − a | ≤ τ', 'τ = ½ · 10^{−d_{q}} · r + ½ · 10^{−d_{r}} · q + ½ · 10^{−d_{a}}'], id: 'rounding' },
      { plain: 'A consistency check on every invoice line: quantity (q) times unit rate (r) should equal the printed line amount (a), apart from rounding. Printed numbers are rounded, so the allowed gap τ is not a guess. It is the largest error that rounding alone could cause: a value printed with d decimals can be off by up to half of the last digit, and the rate\'s error is multiplied by the quantity and vice versa. Example: quantity 1,250.50 and rate 91.25 (two decimals each) give 114,108.125; the printed amount 114,108.13 differs by 0.005, well inside τ = 6.71375, so the line passes. A line that fails is not calculated and goes to a reviewer.' },
      { widget: 'rounding' },
      { p: '**Long documents.** One extraction call reads at most 10 pages, so a longer PDF is read in parts.' },
      { eq: ['N_{parts} = ⌈ n_{pages} / 10 ⌉', 'page = page′ + 10 · (j − 1)'], id: 'split' },
      { plain: 'A document of $n_{pages}$ pages is split into $N_{parts}$ parts, rounding up: a 23-page PDF becomes 3 parts (pages 1 to 10, 11 to 20 and 21 to 23). The model reports page numbers within its part (page′), and the system maps each back to the original by adding the pages before part j, so every line still points to its true source page. A document whose page count cannot be read is rejected rather than guessed.' },
      { h3: '5.2 How the advisory assistant is grounded', id: 'assistant-grounding' },
      { p: 'The assistant does not recall figures from memory. For a signed-in user, application code queries that user\'s own records on the server, using the authenticated identity rather than anything typed in the request, and places the results in the model\'s context. The model is told to use only those figures and to say so when a figure is absent. Visitors who are not signed in receive no user data. Nothing the assistant writes is stored as a record, so it cannot change a calculated number.' },
      { p: 'Text taken from documents and profiles is placed inside a delimited data block, and the model is instructed that anything inside it is data, never instructions, so an instruction hidden in an invoice cannot redirect the assistant. Replies are checked before they are shown, and a reply that repeats internal instructions is replaced.' },
      { h3: '5.3 Projections the assistant may quote', id: 'projection' },
      { p: 'When a signed-in user\'s records cover at least four months, the assistant may quote a 12-month projection. It is computed by code, not by the model, and is always labelled Projection.' },
      { eq: ['β_{1} = \\frac{Σ_{t} (t − \\bar{t})(y_{t} − \\bar{y})}{Σ_{t} (t − \\bar{t})^{2}}', 'β_{0} = \\bar{y} − β_{1} \\bar{t}'], id: 'trend' },
      { plain: 'Each month\'s total emissions ($y_{t}$, where t counts calendar months so that gaps keep their real spacing) is fitted with the straight line that minimises the squared distances to the points: ordinary least squares over up to the last 12 months. $β_{1}$ is the trend in kilograms per month and $β_{0}$ is the line\'s level at the first month.' },
      { eq: ['\\hat{Y} = Σ_{k=1…12} max( 0 , β_{0} + β_{1} (t_{last} + k) )', 'range = \\hat{Y} ± 1.28 · s_{r} · \\sqrt{12}', 's_{r} = \\sqrt{Σ_{t} r_{t}^{2} / (n − 2)}'], id: 'projection' },
      { plain: 'The line is extended 12 months past the last month and the months are added, with any negative month counted as zero. The range uses the scatter of past months around the line ($s_{r}$, computed from the residuals $r_{t}$ with n − 2 because two parameters were fitted): for twelve independent months the spread of the sum grows with √12, and ±1.28 standard deviations covers about 80% of a normal distribution. The range leaves out uncertainty in the fitted line itself and any change in the business, so it is narrower than the true uncertainty, especially with few months. A projection describes the past trend. It is not a forecast, target or commitment.' },
      { h3: '5.4 Questions on supplier records', id: 'supplier-questions' },
      { p: 'Enterprise teams can ask questions about their own supplier records, such as where to focus or whom to follow up. The answer uses only the supplier lines the enterprise dashboard shows for the chosen period, and the model is instructed never to invent a number, supplier, saving or cost. Patterns in a supplier\'s records may suggest the kind of action, never a size of saving.' },
    ],
  },
  {
    id: 'audit-trail',
    title: '6. Evidence and audit trail',
    blocks: [
      { ul: [
        'Each uploaded file is identified by a SHA-256 hash of its full contents.',
        'Each calculated line records document hash, factor identifier and source, methodology version, flags, quality score and status.',
        'The compliance ledger and security audit log are append-only, and entries are hash-chained so alteration is detectable.',
        'Customers can export the full trail from source document to reported figure.',
      ] },
      { eq: ['h = SHA-256( file bytes ) ∈ {0,1}^{256}', 'h_{i} = SHA-256( h_{i−1} ‖ e_{i} )'], id: 'hash' },
      { plain: 'SHA-256 (standardised in NIST FIPS 180-4) turns any file into a 256-bit fingerprint. Change a single character in the file and the fingerprint changes completely, so identical fingerprints mean identical files for all practical purposes; the chance that two different files share one is at most about n²/2²⁵⁷ for n files, which is about 4 × 10⁻⁵⁴ for a trillion files. The second formula chains the ledger: each entry\'s hash ($h_{i}$) is computed from the previous hash ($h_{i−1}$) joined (‖) to the new entry ($e_{i}$). Altering or removing an old entry changes every hash after it, so tampering is detectable. A hash chain detects changes; it does not by itself prevent them.' },
      { widget: 'hash' },
      { h3: '6.1 Data model', id: 'data-model' },
      { figure: 'datamodel', id: 'datamodel', title: 'How a figure links back to its document', caption: 'Data model. Tap an entity to see what it holds and what it links to. Factors are never edited in place; a new version is added.' },
      { table: { head: ['Entity', 'What it holds', 'Linked to'], rows: [
        ['Document', 'Full-file hash, type, dates, supplier and tax identifiers, extraction output, source reference', 'One or more line items'],
        ['Line item', 'Description, tax or classification code, quantity, unit, amount', 'One emission line'],
        ['Emission line', 'Scope, category, activity quantity and unit, result with low, central and high values, status, flags, quality score', 'One factor; one ledger entry'],
        ['Emission factor', 'Value, unit, geography, gas basis, GWP set, publisher, source document, year, validity period, version', 'Many emission lines'],
        ['Ledger entry', 'Hashes, factor and methodology version in force, status, reviewer actions', 'Emission line; previous entry'],
      ] } },
      { p: 'Relationships: Document (1) → Line items (many) → Emission line (1 each) ← Factor (1 per line). Factors are never edited in place; a new version is added.' },
      { h3: '6.2 Supplier evidence shared with an enterprise', id: 'supplier-evidence' },
      { p: 'When a supplier shares with an enterprise, the server computes the supplier\'s totals for the requested period from the supplier\'s own records and stores them as a fixed snapshot. The enterprise receives the snapshot, never the bills, line items or records behind it.' },
      { eq: ['h_{s} = SHA-256( request ‖ period ‖ E_{1} ‖ E_{2} ‖ E_{3} ‖ E_{ver} ‖ E_{own} ‖ categories ‖ evidence hashes )'], id: 'snapshot' },
      { plain: 'Each snapshot carries its own fingerprint ($h_{s}$), computed from the request, the period, the Scope 1, 2 and 3 totals, the part backed by verified bills ($E_{ver}$), any figure the supplier entered without bills ($E_{own}$), the totals by category and the SHA-256 fingerprints of the bills counted. Changing any of these changes the fingerprint, so an auditor can match a figure in the enterprise\'s supplier sheet to the supplier\'s own record.' },
      { eq: ['g = E_{ver} / E_{bills}'], id: 'grade' },
      { plain: 'The proof grade is the share ($g$) of a supplier\'s bill-based emissions ($E_{bills}$) that comes from bills which passed the checks in Section 4.1. A figure the supplier entered without bills is always grade D.' },
      { table: { head: ['Grade', 'Share backed by verified bills'], rows: [
        ['A', '90% or more'],
        ['B', '75% to under 90%'],
        ['C', '50% to under 75%'],
        ['D', 'Under 50%, or a figure entered without bills'],
      ] } },
      { p: 'The enterprise\'s supplier sheet lists, for each supplier, the status, proof, Scope 1 and Scope 2 totals, the counted total, the part backed by verified bills, the grade, the period and the snapshot fingerprint.' },
    ],
  },
  {
    id: 'data-flow',
    title: '7. Document data flow',
    blocks: [
      { figure: 'flow', id: 'flow', title: 'Where AI is used, and where it is not', caption: 'Document data flow. Only step 3 uses a language model. Every other step is deterministic, versioned code, with human review for flagged lines.' },
      { table: { head: ['Step', 'Stage', 'Behaviour'], rows: [
        ['1', 'Upload', 'File sent to the processing service over an encrypted connection.'],
        ['2', 'Identity', 'Signed-in requests are validated server-side. Unauthenticated use is limited to a separate, time-limited guest session.'],
        ['3', 'Hash and duplicate check', 'Full-file hash; duplicates are not reprocessed.'],
        ['4', 'Extraction', 'AI extraction; one retry on a more capable model if the output is unusable.'],
        ['5', 'Relevance check', 'Non-business documents are rejected.'],
        ['6', 'Classification and checks', 'Rule-based classification and plausibility checks.'],
        ['7', 'Calculation', 'Registry factors applied; ranges computed.'],
        ['8', 'Review and storage', 'Flagged lines reviewed; results stored with the full trail.'],
      ] } },
      { h3: '7.1 Supplier request flow', id: 'supplier-flow' },
      { figure: 'supplierflow', id: 'supplierflow', title: 'What crosses from supplier to enterprise', caption: 'Supplier request flow. Bills and records stay on the supplier side; only the shared snapshot reaches the enterprise.' },
      { table: { head: ['Step', 'Stage', 'Behaviour'], rows: [
        ['1', 'Request', 'The enterprise pastes its supplier list: name, email or GSTIN, what it buys and share of purchases. Each request gets a random link; only the link\'s SHA-256 hash is stored, and each link sets an expiry no more than 90 days ahead.'],
        ['2', 'Open', 'The supplier opens the link and signs in or creates a free account. The first account to open the link claims the request, so a forwarded link works; the named account (confirmed email or GSTIN) can also open it from its own requests. After that, no other account can open it. The enterprise sees when it was opened, and by which email if it was forwarded.'],
        ['3', 'Upload', 'The supplier uploads bills, which are read and calculated by the steps above.'],
        ['4', 'Review', 'The supplier sees the totals that would be shared and the exact consent text before anything is shared.'],
        ['5', 'Share', 'On Share, the server computes the snapshot (Section 6.2) and records the consent with the SHA-256 hash of the consent text shown.'],
        ['6', 'Track', 'The enterprise sees status, totals and proof grade per supplier, and can remind a supplier who has not shared at most once every 3 days; each reminder sends a fresh link.'],
        ['7', 'Stop', 'The supplier can stop sharing at any time. The enterprise gets nothing new and sees the request as declined; totals already shared stay with the enterprise.'],
      ] } },
    ],
  },
  {
    id: 'data-security',
    title: '8. Data security',
    blocks: [
      { ul: [
        '**Privacy by design.** Each feature keeps and moves the least data it needs: guest uploads are not stored on the server, suppliers share computed totals rather than their bills, request links are stored only as hashes, and logs do not record document contents.',
        '**Authentication and authorisation.** Managed identity service with server-side token validation. Every server function validates the caller. Roles are held separately from profiles.',
        '**Tenant isolation.** Database Row-Level Security is enabled on every table. Signed-in users can read and write only their own records. Team data is additionally scoped by organisation membership.',
        '**Guest sessions.** Guest data and cached results are scoped to the originating session and time-limited.',
        '**Storage.** Document storage is private, with access limited to the owning account.',
        '**Encryption.** Encryption in transit and at rest on managed infrastructure, as stated in our Privacy Policy.',
        '**Secrets and origins.** Service credentials exist only in server-side environments. Cross-origin access is restricted to Senseible\'s own domains.',
        '**Payments.** Payment signatures are verified server-side and matched to the authenticated user. Card data is handled by the payment processor.',
        '**Logging.** Security events go to an access-restricted audit log. Logs do not record document contents.',
        '**Supplier data boundary.** Supplier sharing exists so an enterprise can receive its suppliers\' emissions, which makes it the one exception to own-records-only access. Even then, an enterprise cannot read a supplier\'s documents, line items or records. It receives only the totals computed on the server when the supplier presses Share: emissions by scope and category, the part backed by verified bills, any own figure and its note, the energy units on the bills, the number of bills and each bill\'s fingerprint. The bills and their amounts stay in the supplier\'s account.',
        '**Supplier links and consent.** Request links carry a random 256-bit token, stored only as its SHA-256 hash; each link or reminder sets an expiry no more than 90 days ahead. Each share records the consent version and the hash of the exact consent text the supplier agreed to.',
        '**Guest uploads.** Documents read for visitors who are not signed in are not stored on the server. Their results stay in the visitor\'s browser for 24 hours, and guest reads are limited to 30 per device per day, enforced on the server.',
        '**Restricted files.** Restricted resources are delivered only through a signed link that expires, or to a signed-in account with a confirmed email.',
      ] },
    ],
  },
  {
    id: 'data-protection',
    title: '9. Data protection',
    blocks: [
      { table: { head: ['Topic', 'Position'], rows: [
        ['Legal framework', 'Designed to align with India\'s Digital Personal Data Protection Act, 2023, and GDPR principles where applicable.'],
        ['Roles', 'Data Fiduciary/Controller for direct users. Data Processor for enterprise and institutional customers under a Data Processing Agreement, acting on documented instructions.'],
        ['Sub-processors', 'Cloud infrastructure, AI model, voice, payment and analytics providers, under contractual confidentiality and data-protection obligations. Document images are sent to AI model providers for extraction. The current list is available on request.'],
        ['Breach notification', 'Confirmed personal data breaches are notified to the Controller without undue delay and within 72 hours of awareness.'],
        ['Retention', 'Unauthenticated data: up to 3 months. Authenticated or paid data: up to 18 months, unless law or contract requires otherwise.'],
        ['Deletion and return', 'On termination, personal data is deleted or returned, subject to legal retention and to data irreversibly anonymised.'],
        ['Model improvement', 'Governed by the Privacy Policy and customer contract. Users may opt out of future training. Enterprise customers can set specific terms in the Data Processing Agreement.'],
        ['User rights and grievances', 'Access, correction, deletion, withdrawal of consent and grievance redressal, as set out in the Privacy Policy.'],
        ['Ownership', 'Customers retain ownership of their raw input data.'],
        ['Supplier data shared with an enterprise', 'Shared only after the supplier presses Share, under a recorded consent text that lists what is shared and what is not. The supplier can stop sharing at any time; totals already shared stay with the enterprise.'],
      ] } },
    ],
  },
  {
    id: 'error-handling',
    title: '10. Error handling',
    blocks: [
      { p: 'On failure the system returns an explicit error or a flagged partial result. It does not fabricate or silently estimate values.' },
      { table: { head: ['Condition', 'System behaviour', 'Outcome for user'], rows: [
        ['Model output unusable', 'One retry on a more capable model', 'Clear error and request for a clearer image if the retry fails'],
        ['AI provider rate or usage limit', 'Request stopped; no partial result stored', 'Retry or plan message'],
        ['Non-business document', 'Rejected', 'Explanation of accepted document types'],
        ['Duplicate document', 'Not reprocessed', 'Original record referenced or stored result returned'],
        ['Missing quantity, unit or classification', 'No figure calculated for the affected line', 'Partial result with visible flags'],
        ['No matching registry factor', 'No figure calculated', 'Line flagged as having no factor'],
        ['Plausibility check failure', 'Calculation blocked', 'Line routed to human review'],
        ['Unauthenticated or unauthorised request', 'Rejected before processing', 'Access error'],
        ['Failed payment verification', 'Rejected before any plan change', 'No change to subscription'],
        ['Advisory chat cannot load records', 'States records are unavailable; produces no figures', 'Offer to retry'],
        ['Supplier link expired, closed or for another account', 'Request not opened', 'Message that the request is closed or not for this account'],
        ['Supplier has no bills dated in the requested period', 'Nothing shared', 'Option to upload bills, or enter an own figure that the enterprise sees marked as without bills'],
        ['Reminder within 3 days of the last one', 'Reminder refused', 'Message that the supplier was already reminded'],
      ] } },
    ],
  },
  {
    id: 'limitations',
    title: '11. Known limitations',
    blocks: [
      { ul: [
        'Results reflect the documents supplied. Missing or incorrect source documents produce incomplete or inaccurate results.',
        'Document-based accounting is suited to screening and baselining. Installation-level regimes need measured facility data, which customers must supply.',
        'Optical extraction can misread poor-quality documents. Flagged lines require human confirmation before use in a disclosure.',
        'Spend-based Scope 3 figures are indicative and carry wide ranges.',
        'Range calculations use first-order error propagation and assume independent activity errors; they describe stated factor and input uncertainty, not unknown or unreported errors.',
        'A hash chain detects alteration after the fact. It does not prove that the original document was truthful.',
        'Factor coverage varies by country. Where no primary factor exists, no figure is produced.',
      ] },
    ],
  },
  {
    id: 'governance',
    title: '12. Governance and assurance status',
    blocks: [
      { ul: [
        'Methodology and factor-registry changes are versioned and dated. Prior versions remain available for audit.',
        'Senseible does not currently hold a third-party security certification such as SOC 2 or ISO/IEC 27001, and its outputs have not been independently assured.',
        `Methodology documentation, the Data Processing Agreement, the sub-processor list and security questionnaires are available to prospective enterprise customers under NDA. Contact: ${WP_CONTACT}.`,
      ] },
    ],
  },
  {
    id: 'notation',
    title: 'Appendix A. Notation',
    blocks: [
      { table: { variant: 'notation', head: ['Symbol', 'Meaning'], rows: [
        ['$E$', 'Emissions, kg CO₂e (kilograms of carbon-dioxide equivalent)'],
        ['$A$, $A_{i}$', 'Activity quantity (litres, kg, kWh, tonne-km), for line i'],
        ['$EF$', 'Emission factor, kg CO₂e per unit of activity'],
        ['$GWP$', '100-year Global Warming Potential of a gas, relative to CO₂'],
        ['$CC$, $OF$', 'Carbon content of a fuel; oxidation fraction'],
        ['$m$, $d$', 'Mass moved (kg); distance (km). In equation {eq:prorate}, d and dₖ are days'],
        ['$S$', 'Spend, in currency units'],
        ['$A_{p}$, $A_{c}$, $k_{u}$', 'Quantity as printed; quantity in the factor\'s unit; unit multiplier'],
        ['$M_{g}$, $G_{g}$', 'CO₂ emitted by power station g; electricity it supplied'],
        ['kW, kvar, kVA, φ, $\\bar{PF}$', 'Real, reactive and apparent power; their phase angle; average power factor over a billing period'],
        ['$NCV$, ρ', 'Net calorific value (energy per mass); density (mass per litre)'],
        ['$u$, $U$, σ', 'Relative uncertainty of a line; of a total; absolute standard deviation'],
        ['$f$', 'A factor shared by several lines'],
        ['$Q$, $p_{k}$, $n_{k}$', 'Data-quality score; penalty for flag k; count of flag k'],
        ['$F_{pass}$', 'Share of lines in a batch that pass the score threshold'],
        ['$q$, $r$, $a$, $d_{x}$', 'Printed quantity, rate and amount; their number of decimal places'],
        ['$β_{0}$, $β_{1}$, $s_{r}$, $\\hat{Y}$', 'Trend intercept and slope; residual standard deviation; projected 12-month total'],
        ['$h$, $e_{i}$, ‖', 'Hash value; ledger entry i; concatenation (joined end to end)'],
        ['$h_{s}$', 'Fingerprint of a supplier\'s shared snapshot'],
        ['$E_{ver}$, $E_{bills}$, $E_{own}$', 'Supplier emissions backed by verified bills; from all counted bills; entered by the supplier without bills'],
        ['$g$', 'Proof grade share, $E_{ver}$ / $E_{bills}$'],
      ] } },
    ],
  },
  {
    id: 'references',
    title: 'Appendix B. References',
    blocks: [
      { ul: [
        '[1] WRI and WBCSD. The Greenhouse Gas Protocol: A Corporate Accounting and Reporting Standard, Revised Edition (2004).',
        '[2] WRI and WBCSD. GHG Protocol Scope 2 Guidance (2015).',
        '[3] WRI and WBCSD. Corporate Value Chain (Scope 3) Accounting and Reporting Standard (2011), and Technical Guidance for Calculating Scope 3 Emissions (2013).',
        '[4] WRI and WBCSD. Guidance on Uncertainty Assessment in GHG Inventories and Calculating Statistical Parameter Uncertainty (2003).',
        '[5] IPCC. 2006 Guidelines for National Greenhouse Gas Inventories, Volume 1, Chapter 3 (Uncertainties); Volume 2, Chapter 1, Tables 1.2 to 1.4 (default net calorific values, carbon contents and CO₂ emission factors), and Chapter 2 (Stationary Combustion).',
        '[6] IPCC. Climate Change 2021: The Physical Science Basis, Working Group I contribution to the Sixth Assessment Report, Chapter 7, Table 7.15 (100-year Global Warming Potentials).',
        '[7] ISO 14064-1:2018. Greenhouse gases: Specification with guidance at the organization level for quantification and reporting of greenhouse gas emissions and removals.',
        '[8] JCGM 100:2008 (ISO/IEC Guide 98-3). Evaluation of measurement data: Guide to the expression of uncertainty in measurement.',
        '[9] NIST. FIPS PUB 180-4: Secure Hash Standard (2015).',
        '[10] IEEE Std 1459-2010. IEEE Standard Definitions for the Measurement of Electric Power Quantities Under Sinusoidal, Nonsinusoidal, Balanced, or Unbalanced Conditions.',
      ] },
    ],
  },
  {
    id: 'disclaimer',
    title: 'Legal Disclaimer',
    blocks: [
      { p: 'This White Paper describes the methods and current capabilities of Senseible for information only. Nothing in it is an offer to sell, or the solicitation of an offer to buy, any security, financial instrument, product or service, and nothing in it is legal, financial, accounting, tax, regulatory or assurance advice.' },
      { p: 'Senseible publishes this White Paper so that customers, auditors, technical reviewers and the public can examine its approach and send feedback and comments. Any commercial relationship will be governed only by definitive documents, such as the Terms of Service, Privacy Policy, Data Processing Agreement and order forms. Those documents may differ from this White Paper, and where they conflict they prevail.' },
      { p: 'Emission figures produced with Senseible are calculated estimates based on the documents and data a customer supplies. They are self-declared by the customer. They are not certified, audited or independently verified unless a separate written verification statement says so, and Senseible does not guarantee that any regulator, lender, investor, buyer or other third party will accept them.' },
      { p: 'Nothing in this White Paper is a guarantee or promise of how Senseible\'s business, platform or methods will develop, or of any result, saving, outcome or value from using them. It outlines current practice and plans, which Senseible may change at its discretion. Their success depends on many factors outside Senseible\'s control, including changes in law, standards and published emission factors, the availability and quality of customer and third-party data, and the services of third-party providers.' },
      { p: 'Any statement about future events is based solely on Senseible\'s own analysis of the matters described in this White Paper. That analysis may prove to be incorrect. Equations and worked examples are illustrative, use round numbers that are not published emission factors, and are provided to explain method only.' },
      { p: `Feedback, questions and security or compliance review requests: ${WP_CONTACT}` },
    ],
  },
];

/** Equation and figure numbers in reading order. */
function numbering() {
  const eq = new Map<string, number>();
  const fig = new Map<string, number>();
  for (const s of WP_SECTIONS) for (const b of s.blocks) {
    if ('eq' in b) eq.set(b.id, eq.size + 1);
    if ('figure' in b) fig.set(b.id, fig.size + 1);
  }
  return { eq, fig };
}
export const WP_NUMBERS = numbering();

/** Replaces {eq:id} and {fig:id} with their numbers. Throws on an unknown id, so a broken reference fails the build. */
export function resolveRefs(text: string): string {
  return text.replace(/\{(eq|fig):([a-z0-9-]+)\}/g, (_, kind: 'eq' | 'fig', id: string) => {
    const n = WP_NUMBERS[kind].get(id);
    if (!n) throw new Error(`White Paper: unknown ${kind} reference "${id}"`);
    return kind === 'eq' ? `(${n})` : String(n);
  });
}
