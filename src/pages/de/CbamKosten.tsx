import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { CBAM_SECTORS, calculateCBAM, DEFAULT_EU_ETS_PRICE, defaultValueMarkup, FREE_ALLOCATION_PCT } from "@/lib/cbamEngine";
import { DATA_PACK, DE_DATES, DE_META, KOSTEN_FAQ, PRICES_2026, ROUTE_DE, SECTOR_DE } from "@/data/de/cbamDe";
import { DeHead, eur, num } from "./DeHead";
import "./de.css";

// /de/cbam-kosten. Signature: the shipment slip. Drag the tonnes and the
// supplier's figure; two certificate stacks fill up side by side, one priced on
// the EU default value, one on the supplier's own verified figure.

const PATH = "/de/cbam-kosten";
const SECTORS = ["steel", "aluminium", "cement", "fertilizers"] as const;
const YEARS = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034];
const CELLS = 60;

function Stack({ filled, tone, label }: { filled: number; tone: "default" | "actual"; label: string }) {
  const n = Math.max(0, Math.min(CELLS, Math.round(filled)));
  return (
    <div className="de-stack" role="img" aria-label={label}>
      {Array.from({ length: CELLS }, (_, i) => (
        <i key={i} className={i < n ? `on ${tone}` : ""} style={{ transitionDelay: `${(i % 12) * 12}ms` }} />
      ))}
    </div>
  );
}

function Slip() {
  const [sectorId, setSectorId] = useState<(typeof SECTORS)[number]>("steel");
  const sector = CBAM_SECTORS.find((s) => s.id === sectorId)!;
  const [routeId, setRouteId] = useState(sector.productionRoutes[0].id);
  const route = sector.productionRoutes.find((r) => r.id === routeId) ?? sector.productionRoutes[0];
  const [tonnes, setTonnes] = useState(500);
  const [actualShare, setActualShare] = useState(80); // supplier figure as % of the default value
  const [year, setYear] = useState(2026);

  const pick = (id: (typeof SECTORS)[number]) => {
    setSectorId(id);
    setRouteId(CBAM_SECTORS.find((s) => s.id === id)!.productionRoutes[0].id);
  };

  const actualIntensity = Math.round(route.defaultIntensity * actualShare) / 100;
  const base = { sectorId, productionRouteId: route.id, countryCode: "IN", supplierName: "", tonnage: tonnes, carbonPricePaid: null, euEtsPrice: DEFAULT_EU_ETS_PRICE };
  const withDefault = useMemo(() => calculateCBAM({ ...base, actualEmissionsIntensity: null }), [sectorId, route.id, tonnes]); // eslint-disable-line react-hooks/exhaustive-deps
  const withActual = useMemo(() => calculateCBAM({ ...base, actualEmissionsIntensity: actualIntensity }), [sectorId, route.id, tonnes, actualIntensity]); // eslint-disable-line react-hooks/exhaustive-deps
  const d = withDefault.yearlyResults.find((r) => r.year === year)!;
  const a = withActual.yearlyResults.find((r) => r.year === year)!;
  const scale = Math.max(...withDefault.yearlyResults.map((r) => r.netLiableEmissions), 1);
  const saved = d.netCbamCost - a.netCbamCost;
  const markup = defaultValueMarkup(sectorId, year);

  return (
    <section className="de-slip" aria-labelledby="slip-title">
      <header className="de-slip-head">
        <span className="de-stamp">Lieferschein · Herkunft Indien</span>
        <h2 id="slip-title" className="sr-only">Ihre Lieferung</h2>
        <div className="de-chips" role="radiogroup" aria-label="Warengruppe">
          {SECTORS.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={sectorId === id} onClick={() => pick(id)} className={sectorId === id ? "is-on" : ""}>{SECTOR_DE[id]}</button>
          ))}
        </div>
      </header>

      <div className="de-slip-grid">
        <div className="de-controls">
          <label className="de-field">
            <span>{sector.routeKind === "product" ? "Produkt" : "Produktionsroute"}</span>
            <select value={route.id} onChange={(e) => setRouteId(e.target.value)}>
              {sector.productionRoutes.map((r) => <option key={r.id} value={r.id}>{ROUTE_DE[r.id] ?? r.name}</option>)}
            </select>
          </label>
          <label className="de-field">
            <span>Menge <b>{num(tonnes)} t</b></span>
            <input type="range" min={10} max={5000} step={10} value={tonnes} onChange={(e) => setTonnes(Number(e.target.value))} />
          </label>
          <label className="de-field">
            <span>Wert Ihres Lieferanten <b>{num(actualIntensity, 2)} t CO2e/t</b></span>
            <input type="range" min={30} max={110} step={1} value={actualShare} onChange={(e) => setActualShare(Number(e.target.value))} />
            <small>{actualShare}% des Standardwerts von {num(route.defaultIntensity, 2)} t CO2e/t. Ein Beispielwert: tragen Sie den geprüften Wert des Werks ein, sobald er vorliegt.</small>
          </label>
          <div className="de-field">
            <span>Einfuhrjahr <b>{year}</b></span>
            <div className="de-years" role="radiogroup" aria-label="Einfuhrjahr">
              {YEARS.map((y) => <button key={y} type="button" role="radio" aria-checked={year === y} onClick={() => setYear(y)} className={year === y ? "is-on" : ""}>{String(y).slice(2)}</button>)}
            </div>
            <small>{num(FREE_ALLOCATION_PCT[year] * 100, 1)}% der EU-Benchmark werden {year} noch kostenlos zugeteilt.{markup > 0 ? ` Aufschlag auf Standardwerte: ${num(markup * 100)}%.` : ""}</small>
          </div>
          {tonnes <= 50 && <p className="de-note">Liegt Ihre gesamte Jahresmenge aller erfassten Waren bei höchstens 50 Tonnen, entfällt die CBAM-Pflicht.</p>}
        </div>

        <div className="de-compare">
          <div className="de-col">
            <p className="de-col-label">Mit Standardwert</p>
            <p className="de-big tabular-nums" aria-live="polite">{eur(d.netCbamCost)}</p>
            <p className="de-sub">{num(d.netLiableEmissions)} Zertifikate · {eur(d.costPerTonne)} je Tonne</p>
            <Stack filled={(d.netLiableEmissions / scale) * CELLS} tone="default" label={`${num(d.netLiableEmissions)} Zertifikate mit Standardwert`} />
          </div>
          <div className="de-col">
            <p className="de-col-label">Mit Lieferantenwert</p>
            <p className="de-big tabular-nums">{eur(a.netCbamCost)}</p>
            <p className="de-sub">{num(a.netLiableEmissions)} Zertifikate · {eur(a.costPerTonne)} je Tonne</p>
            <Stack filled={(a.netLiableEmissions / scale) * CELLS} tone="actual" label={`${num(a.netLiableEmissions)} Zertifikate mit Lieferantenwert`} />
          </div>
          <p className="de-saved">
            {saved > 0
              ? <>Geprüfte Daten Ihres Lieferanten sparen {year} <b>{eur(saved)}</b> bei dieser Lieferung.</>
              : <>Bei diesem Wert spart der Lieferantenwert {year} nichts. Prüfen Sie, ob der Wert stimmt.</>}
          </p>
        </div>
      </div>
      <p className="de-fine">Schätzung mit dem Zertifikatspreis des 3. Quartals 2026 ({num(DEFAULT_EU_ETS_PRICE, 2)} €), ohne in Indien gezahlten CO2-Preis. Richtwerte je Route, keine CBAM-Erklärung.</p>
    </section>
  );
}

/** The four steps of the calculation, drawn as a running subtraction. */
function Formula() {
  const rows = [
    ["Spezifische eingebettete Emissionen je Tonne", "Bei Stahl und Aluminium nur direkte Emissionen, bei Zement und Dünger auch indirekte."],
    ["minus kostenlose Zuteilung", "EU-Benchmark mal dem Anteil, den EU-Hersteller im Jahr noch kostenlos erhalten. Der Anteil sinkt bis 2034 auf null."],
    ["minus in Indien gezahlter CO2-Preis", "Umgerechnet zum Zertifikatspreis. Indien erhebt derzeit keinen, der Abzug ist also null."],
    ["mal eingeführte Tonnen", "Ergibt die Zahl der Zertifikate. Ist das Ergebnis negativ, ist die Pflicht null."],
  ];
  return (
    <ol className="de-formula">
      {rows.map(([h, p], i) => (
        <li key={h} style={{ animationDelay: `${i * 120}ms` }}>
          <span className="de-op" aria-hidden="true">{["", "−", "−", "×"][i]}</span>
          <div><b>{h}</b><p>{p}</p></div>
        </li>
      ))}
      <li className="de-total"><span className="de-op" aria-hidden="true">=</span><div><b>Zertifikate, die Sie abgeben</b><p>Jedes Zertifikat deckt eine Tonne CO2e.</p></div></li>
    </ol>
  );
}

export default function CbamKosten() {
  const meta = DE_META[PATH];
  return (
    <div lang="de" className="de-page min-h-screen bg-background text-foreground">
      <DeHead path={PATH} faq={KOSTEN_FAQ} />
      <MinimalNav />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6">
        <p className="de-kicker">CBAM für Importeure in Deutschland</p>
        <h1 className="de-h1">{meta.h1}</h1>
        <p className="de-lede">Seit Januar 2026 kostet jede Tonne Stahl, Aluminium, Zement oder Dünger aus Indien CBAM-Zertifikate. Wie viele, entscheidet vor allem eine Zahl: der Emissionswert, den Ihr Lieferant liefert. Ziehen Sie an den Reglern und sehen Sie, was er wert ist.</p>

        <div className="mt-8"><Slip /></div>

        <section className="de-section">
          <h2>So entsteht der Betrag</h2>
          <Formula />
        </section>

        <section className="de-section de-two">
          <div>
            <h2>Zertifikatspreise für Einfuhren aus 2026</h2>
            <p className="de-muted">Für 2026 gilt der Preis des Quartals, in dem die Ware eingeführt wurde. Ab 2027 veröffentlicht die Kommission einen Wochenpreis.</p>
            <ul className="de-prices">
              {PRICES_2026.map((p) => {
                const w = (p.eur / 90) * 100;
                return (
                  <li key={p.q}>
                    <span>{p.q}</span>
                    <i style={{ width: `${w}%` }} aria-hidden="true" />
                    <b className="tabular-nums">{num(p.eur, 2)} €</b>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h2>Die Fristen</h2>
            <ol className="de-timeline">
              {DE_DATES.map((t) => <li key={t.when}><b>{t.when}</b><p>{t.what}</p></li>)}
            </ol>
            <p className="de-muted mt-4">In Deutschland ist die Deutsche Emissionshandelsstelle (DEHSt) zuständig. Dort beantragen Sie den Anmelderstatus und kaufen die Zertifikate.</p>
          </div>
        </section>

        <section className="de-section">
          <h2>Was den Betrag am stärksten bewegt</h2>
          <div className="de-levers">
            <div><b>Standardwert oder Ist-Wert</b><p>Standardwerte tragen 2026 einen Aufschlag von 10%, 2027 von 20% und ab 2028 von 30%, bei Düngemitteln 1%. Ein geprüfter Ist-Wert des Werks vermeidet ihn.</p></div>
            <div><b>Die Produktionsroute</b><p>Stahl aus dem Elektrolichtbogenofen mit Schrott trägt einen Bruchteil der Emissionen eines Hochofens. Fragen Sie, wie Ihr Stahl hergestellt wird.</p></div>
            <div><b>Das Jahr</b><p>Die kostenlose Zuteilung fällt von 97,5% im Jahr 2026 auf null im Jahr 2034. Derselbe Stahl kostet jedes Jahr mehr.</p></div>
          </div>
        </section>

        <section className="de-section">
          <h2>Häufige Fragen</h2>
          <div className="de-faq">
            {KOSTEN_FAQ.map((f) => (
              <details key={f.question}><summary>{f.question}</summary><p>{f.answer}</p></details>
            ))}
          </div>
        </section>

        <section className="de-next">
          <Link to="/de/cbam-rechner" className="de-cta">Eigene Ware durchrechnen <ArrowRight className="h-4 w-4" /></Link>
          <Link to="/de/cbam-indische-lieferanten" className="de-cta ghost">Welche {DATA_PACK.length} Angaben Ihr Lieferant liefern muss <ArrowRight className="h-4 w-4" /></Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
