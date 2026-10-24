import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { CBAM_SECTORS, calculateCBAM, DEFAULT_EU_ETS_PRICE, defaultValueMarkup } from "@/lib/cbamEngine";
import { DE_META, ROUTE_DE, SECTOR_DE } from "@/data/de/cbamDe";
import { DeHead, eur, num } from "./DeHead";
import "./de.css";

// /de/cbam-rechner. The tool is the page: inputs on the left, a staircase of
// yearly costs on the right that climbs as free allocation runs out. Same
// engine as /cbam-calculator; nothing here re-implements the maths.

const PATH = "/de/cbam-rechner";
const SECTORS = ["steel", "aluminium", "cement", "fertilizers", "hydrogen"] as const;

const parse = (v: string) => {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export default function CbamRechner() {
  const meta = DE_META[PATH];
  const [sectorId, setSectorId] = useState<(typeof SECTORS)[number]>("steel");
  const sector = CBAM_SECTORS.find((s) => s.id === sectorId)!;
  const [routeId, setRouteId] = useState(sector.productionRoutes[0].id);
  const route = sector.productionRoutes.find((r) => r.id === routeId) ?? sector.productionRoutes[0];
  const [tonnesText, setTonnesText] = useState("1000");
  const [hasActual, setHasActual] = useState(false);
  const [actualText, setActualText] = useState("");
  const [priceText, setPriceText] = useState(num(DEFAULT_EU_ETS_PRICE, 2));
  const [paidText, setPaidText] = useState("0");
  const [focus, setFocus] = useState(2026);

  const tonnes = parse(tonnesText) ?? 0;
  const actual = hasActual ? parse(actualText) : null;
  const price = parse(priceText) ?? DEFAULT_EU_ETS_PRICE;
  const paid = parse(paidText) ?? 0;

  const result = useMemo(() => calculateCBAM({
    sectorId, productionRouteId: route.id, countryCode: "IN", supplierName: "", tonnage: tonnes,
    actualEmissionsIntensity: actual, carbonPricePaid: paid, euEtsPrice: price,
  }), [sectorId, route.id, tonnes, actual, paid, price]);
  const max = Math.max(...result.yearlyResults.map((r) => r.netCbamCost), 1);
  const f = result.yearlyResults.find((r) => r.year === focus)!;

  const pick = (id: (typeof SECTORS)[number]) => {
    setSectorId(id);
    setRouteId(CBAM_SECTORS.find((s) => s.id === id)!.productionRoutes[0].id);
  };

  return (
    <div lang="de" className="de-page min-h-screen bg-background text-foreground">
      <DeHead path={PATH} />
      <MinimalNav />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="de-kicker">Kostenlos, ohne Anmeldung</p>
            <h1 className="de-h1 !text-4xl sm:!text-5xl">{meta.h1}</h1>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">Zertifikatskosten je Einfuhrjahr, 2026 bis 2034, für Waren aus Indien.</p>
        </div>

        <section className="de-tool mt-6" aria-label="Rechner">
          <form className="de-tool-in" onSubmit={(e) => e.preventDefault()}>
            <fieldset>
              <legend>Warengruppe</legend>
              <div className="de-chips">
                {SECTORS.map((id) => (
                  <button key={id} type="button" aria-pressed={sectorId === id} onClick={() => pick(id)} className={sectorId === id ? "is-on" : ""}>{SECTOR_DE[id]}</button>
                ))}
              </div>
            </fieldset>
            <label className="de-field">
              <span>{sector.routeKind === "product" ? "Produkt" : "Produktionsroute"}</span>
              <select value={route.id} onChange={(e) => setRouteId(e.target.value)}>
                {sector.productionRoutes.map((r) => <option key={r.id} value={r.id}>{ROUTE_DE[r.id] ?? r.name}</option>)}
              </select>
            </label>
            <label className="de-field">
              <span>Menge pro Jahr (Tonnen)</span>
              <input inputMode="decimal" value={tonnesText} onChange={(e) => setTonnesText(e.target.value)} />
            </label>
            <div className="de-field">
              <label className="de-switch">
                <input type="checkbox" checked={hasActual} onChange={(e) => setHasActual(e.target.checked)} />
                <span>Ich habe einen geprüften Wert meines Lieferanten</span>
              </label>
              {hasActual
                ? <input aria-label="Geprüfter Wert in t CO2e je Tonne" inputMode="decimal" placeholder={`z. B. ${num(route.defaultIntensity * 0.8, 2)}`} value={actualText} onChange={(e) => setActualText(e.target.value)} />
                : <small>Ohne Ist-Wert rechnet der Rechner mit dem Standardwert von {num(route.defaultIntensity, 2)} t CO2e/t plus Aufschlag.</small>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="de-field">
                <span>Zertifikatspreis (€/t)</span>
                <input inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value)} />
              </label>
              <label className="de-field">
                <span>CO2-Preis in Indien (€/t)</span>
                <input inputMode="decimal" value={paidText} onChange={(e) => setPaidText(e.target.value)} />
              </label>
            </div>
          </form>

          <div className="de-tool-out">
            <div className="de-total-row">
              <div><p className="de-col-label">Summe 2026 bis 2034</p><p className="de-big tabular-nums" aria-live="polite">{eur(result.totalCost9Year)}</p></div>
              <div className="text-right"><p className="de-col-label">Im Schnitt je Tonne</p><p className="text-2xl font-semibold tabular-nums">{eur(result.avgCostPerTonne)}</p></div>
            </div>
            <div className="de-stairs" role="group" aria-label="Kosten je Einfuhrjahr">
              {result.yearlyResults.map((r) => (
                <button key={r.year} type="button" onMouseEnter={() => setFocus(r.year)} onFocus={() => setFocus(r.year)} onClick={() => setFocus(r.year)} aria-pressed={focus === r.year} aria-label={`${r.year}: ${eur(r.netCbamCost)}`} className={focus === r.year ? "is-on" : ""}>
                  <i style={{ height: `${Math.max(2, (r.netCbamCost / max) * 100)}%` }} />
                  <span>{String(r.year).slice(2)}</span>
                </button>
              ))}
            </div>
            <dl className="de-detail">
              <div><dt>Einfuhrjahr</dt><dd>{focus}</dd></div>
              <div><dt>Eingebettete Emissionen</dt><dd>{num(f.totalEmissions)} t</dd></div>
              <div><dt>Kostenlose Zuteilung</dt><dd>{num(f.freeAllowances)} t ({num(f.freeAllocationPct * 100, 1)}%)</dd></div>
              <div><dt>Abzugebende Zertifikate</dt><dd>{num(f.netLiableEmissions)}</dd></div>
              <div><dt>Kosten</dt><dd><b>{eur(f.netCbamCost)}</b> · {eur(f.costPerTonne)}/t</dd></div>
              {result.isUsingDefault && defaultValueMarkup(sectorId, focus) > 0 && <div><dt>Aufschlag Standardwert</dt><dd>{num(defaultValueMarkup(sectorId, focus) * 100)}%</dd></div>}
            </dl>
            <p className="de-fine">{result.isUsingDefault ? "Standardwert mit Aufschlag." : "Geprüfter Ist-Wert, kein Aufschlag."} Richtwerte je Route, keine CBAM-Erklärung. Die Mengenschwelle von 50 Tonnen je Jahr gilt nicht für Wasserstoff.</p>
          </div>
        </section>

        <section className="de-section de-levers">
          <div><b>Der Wert kommt aus Indien</b><p>Den Ist-Wert berechnet das Werk Ihres Lieferanten und lässt ihn prüfen. Ohne ihn bleibt der Standardwert mit Aufschlag.</p><Link to="/de/cbam-indische-lieferanten" className="de-link">Datenanfrage vorbereiten <ArrowRight className="h-3.5 w-3.5" /></Link></div>
          <div><b>Warum die Treppe steigt</b><p>EU-Hersteller erhalten jedes Jahr weniger kostenlose Zertifikate, und CBAM folgt demselben Pfad bis null im Jahr 2034.</p><Link to="/de/cbam-kosten" className="de-link">Die Rechnung Schritt für Schritt <ArrowRight className="h-3.5 w-3.5" /></Link></div>
          <div><b>Lieber auf Englisch?</b><p>Derselbe Rechner mit derselben Berechnung, auf Englisch.</p><Link to="/cbam-calculator" className="de-link" hrefLang="en">English calculator <ArrowRight className="h-3.5 w-3.5" /></Link></div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
