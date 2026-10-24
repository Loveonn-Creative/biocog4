import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Copy } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { DATA_PACK, DE_DATES, DE_META, SECTOR_DE } from "@/data/de/cbamDe";
import { DeHead } from "./DeHead";
import "./de.css";

// /de/cbam-indische-lieferanten. Signature: a data-pack builder. Tick what you
// still need; a ring fills as the pack completes and a ready-to-send request
// in English (the supplier's working language) writes itself alongside.

const PATH = "/de/cbam-indische-lieferanten";
const GOODS = ["steel", "aluminium", "cement", "fertilizers", "hydrogen"] as const;
const EN_GOODS: Record<string, string> = { steel: "iron and steel", aluminium: "aluminium", cement: "cement", fertilizers: "fertiliser", hydrogen: "hydrogen" };

function Ring({ share }: { share: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="de-ring" aria-hidden="true">
      <circle cx="40" cy="40" r={r} className="track" />
      <circle cx="40" cy="40" r={r} className="fill" strokeDasharray={c} strokeDashoffset={c * (1 - share)} />
    </svg>
  );
}

export default function CbamLieferanten() {
  const meta = DE_META[PATH];
  const [goods, setGoods] = useState<(typeof GOODS)[number]>("steel");
  const [have, setHave] = useState<Record<string, boolean>>({});
  const [company, setCompany] = useState("");
  const [copied, setCopied] = useState(false);

  const missing = DATA_PACK.filter((d) => !have[d.id]);
  const share = (DATA_PACK.length - missing.length) / DATA_PACK.length;

  const email = useMemo(() => {
    const items = missing.length ? missing : DATA_PACK;
    return [
      `Subject: CBAM data for our ${EN_GOODS[goods]} imports from your plant`,
      "",
      "Dear supplier team,",
      "",
      `${company.trim() || "We"} ${company.trim() ? "imports" : "import"} your ${EN_GOODS[goods]} into Germany and ${company.trim() ? "is" : "are"} the authorised CBAM declarant for these goods. To declare them with actual values instead of EU default values, please send the following for each installation and reporting period:`,
      "",
      ...items.map((d, i) => `${i + 1}. ${d.en}`),
      "",
      "The operator emissions report template published by the European Commission is the easiest format for us. The first annual declaration for goods imported in 2026 is due by 30 September 2027, so we would be grateful to receive verified figures well before then.",
      "",
      "Thank you,",
    ].join("\n");
  }, [missing, goods, company]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div lang="de" className="de-page min-h-screen bg-background text-foreground">
      <DeHead path={PATH} />
      <MinimalNav />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6">
        <p className="de-kicker">Für CBAM-Anmelder mit Lieferanten in Indien</p>
        <h1 className="de-h1">{meta.h1}</h1>
        <p className="de-lede">Ohne diese Angaben rechnen Sie mit Standardwerten plus Aufschlag. Haken Sie ab, was Ihnen schon vorliegt. Rechts entsteht die Anfrage an Ihren Lieferanten, auf Englisch und fertig zum Versenden.</p>

        <section className="de-builder mt-8">
          <div className="de-pack">
            <div className="de-pack-head">
              <div className="relative">
                <Ring share={share} />
                <span className="de-ring-n tabular-nums">{DATA_PACK.length - missing.length}/{DATA_PACK.length}</span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold">{missing.length === 0 ? "Datenpaket vollständig" : `${missing.length} Angaben fehlen noch`}</p>
                <label className="de-field mt-2">
                  <span className="sr-only">Warengruppe</span>
                  <select value={goods} onChange={(e) => setGoods(e.target.value as (typeof GOODS)[number])}>
                    {GOODS.map((g) => <option key={g} value={g}>{SECTOR_DE[g]}</option>)}
                  </select>
                </label>
              </div>
            </div>
            <ul className="de-checks">
              {DATA_PACK.map((d) => (
                <li key={d.id}>
                  <label className={have[d.id] ? "is-on" : ""}>
                    <input type="checkbox" checked={!!have[d.id]} onChange={(e) => setHave((h) => ({ ...h, [d.id]: e.target.checked }))} />
                    <span className="de-box" aria-hidden="true"><Check className="h-3.5 w-3.5" /></span>
                    <span>{d.label}</span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="de-fine">Bei Stahl und Aluminium zählen nur direkte Emissionen, bei Zement und Düngemitteln auch indirekte.</p>
          </div>

          <div className="de-letter">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="de-col-label">Anfrage an Ihren Lieferanten (Englisch)</p>
              <button type="button" onClick={copy} className="de-copy">{copied ? <><Check className="h-4 w-4" /> Kopiert</> : <><Copy className="h-4 w-4" /> Kopieren</>}</button>
            </div>
            <label className="de-field mt-3">
              <span>Ihr Firmenname (optional)</span>
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Muster GmbH" />
            </label>
            <pre className="de-mail" lang="en" tabIndex={0}>{email}</pre>
          </div>
        </section>

        <section className="de-section de-two">
          <div>
            <h2>Warum der Lieferant, nicht Sie</h2>
            <p className="de-muted">Die Emissionen entstehen im Werk in Indien. Nur der Betreiber kann sie messen, die kostenlose Zuteilung für seine Waren berechnen und von einer akkreditierten Prüfstelle bestätigen lassen. Ein geprüfter Bericht gilt für Käufer in jedem EU-Mitgliedstaat, denn alle Behörden arbeiten mit denselben Regeln und derselben Vorlage.</p>
            <p className="de-muted mt-3">Für jede eingeführte Tonne ist genau ein Anmelder zuständig: wer die Zollanmeldung abgibt. Senden Ihre Lieferanten an einen Spediteur, der für mehrere Käufer verzollt, achten Sie darauf, dass die Daten beim richtigen Anmelder ankommen.</p>
          </div>
          <div>
            <h2>Bis wann Sie die Daten brauchen</h2>
            <ol className="de-timeline">
              {DE_DATES.map((t) => <li key={t.when}><b>{t.when}</b><p>{t.what}</p></li>)}
            </ol>
          </div>
        </section>

        <section className="de-next">
          <Link to="/de/cbam-rechner" className="de-cta">Kosten mit und ohne Lieferantenwert vergleichen <ArrowRight className="h-4 w-4" /></Link>
          <Link to="/de/cbam-kosten" className="de-cta ghost">Was CBAM kostet <ArrowRight className="h-4 w-4" /></Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
