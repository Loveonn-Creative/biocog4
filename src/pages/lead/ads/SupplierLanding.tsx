import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Download, FileText, KeyRound, Lock, PhoneCall, ShieldCheck, Fingerprint, Plug, MessageCircle } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { CopyButton } from "@/components/lead/LeadKit";
import { AdHeader } from "@/components/lead/ads/AdHeader";
import { leadEvents } from "@/components/lead/leadEvents";
import { CallbackForm } from "@/components/lead/ads/CallbackForm";
import { TrustNames } from "@/components/lead/ads/TrustNames";
import { OfferBar, OfferClock, OfferPill, OfferPrice, useTimeLeft } from "@/components/lead/ads/LaunchOffer";
import { ProofStrip } from "@/components/lead/ads/ProofStrip";
import { WHATSAPP_NUMBER } from "@/components/services/shell/actions";
import { downloadKitPdf, supplierKit } from "@/lib/leadMagnets/adKits";
import { SUPPLIER_REQUEST, planSummary, supplierEvidencePlan } from "@/lib/leadMagnets/supplierEvidence";
import "./landing.css";

// Enterprise ad landing page, two colour directions for A/B tests from ads.
// One action (a 10-minute call). The visitor keeps a supplier evidence kit
// (their plan plus a supplier request) built from their own numbers.

type Variant = "a" | "b";
const NAMES: [string, "serif" | "caps" | "sans"][] = [
  ["Rio Tinto", "serif"], ["Saudi Aramco", "sans"], ["Google", "sans"], ["Amazon", "sans"], ["Sanofi", "serif"],
  ["Johnson & Johnson", "serif"], ["Shagang Group", "caps"], ["SAIL", "caps"], ["NALCO", "caps"], ["Indorama Ventures", "sans"], ["Shapoorji Pallonji", "sans"],
];
const INDUSTRIES = [
  { id: "manufacturing", label: "Manufacturing" }, { id: "automotive", label: "Automotive" }, { id: "metals", label: "Metals and mining" },
  { id: "chemicals", label: "Chemicals" }, { id: "pharma", label: "Pharma and healthcare" }, { id: "construction", label: "Construction and real estate" },
  { id: "consumer", label: "Consumer goods and retail" }, { id: "tech", label: "Technology" }, { id: "other", label: "Something else" },
];
const ROWS = [
  { s: "Sharma Castings", tier: "T1", a: "4,200 kWh", t: "2.98" },
  { s: "Patel Pigments", tier: "T2", a: "650 L diesel", t: "1.74" },
  { s: "Kaveri Packaging", tier: "T3", a: "2,900 kWh", t: "2.06" },
];
const CHAOS = ["“Follow-up #4: still waiting on Q2 data”", "supplier_data_v12_FINAL(3).xlsx", "“Will send next week” · WhatsApp", "Spend estimate · flagged by auditor"];
const GUARDS = [
  { icon: Lock, t: "Your data", d: "Private organisation account" },
  { icon: KeyRound, t: "Your rules", d: "Access by role, owner to viewer" },
  { icon: Fingerprint, t: "Your proof", d: "Every bill fingerprinted, never counted twice" },
  { icon: Plug, t: "Your stack", d: "Integrations built to your security review" },
];

export default function SupplierLanding({ variant }: { variant: Variant }) {
  const page = `/go/suppliers-${variant}`;
  const analyticsPage = `ad_suppliers_${variant}`;
  const theme = variant === "a" ? "lp-ent-a" : "lp-ent-b";
  const [open, setOpen] = useState(false);
  const t = useTimeLeft();
  const [suppliers, setSuppliers] = useState(200);
  const [withData, setWithData] = useState(20);
  const plan = useMemo(() => supplierEvidencePlan({ suppliers, withData, months: 6, pressure: "assurance" }), [suppliers, withData]);
  useEffect(() => { leadEvents.view(analyticsPage); }, [analyticsPage]);
  const book = useCallback((where: string) => { leadEvents.cta(analyticsPage, `call_${where}`); setOpen(true); }, [analyticsPage]);
  const close = useCallback(() => setOpen(false), []);
  const kit = () => {
    leadEvents.cta(analyticsPage, "kit_download");
    void downloadKitPdf(supplierKit(plan, "assurance", page), "Senseible-supplier-evidence-kit.pdf", variant === "a" ? [10, 23, 48] : [22, 24, 29]);
  };

  const Steps = (
    <ol className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm opacity-85">
      <li className="flex items-center gap-2"><PhoneCall className="h-4 w-4" /> 10-minute call</li>
      <li className="flex items-center gap-2"><FileText className="h-4 w-4" /> Send one supplier's bills</li>
      <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> See their emissions report</li>
    </ol>
  );

  const waText = `Hi Senseible, I want to see how you get supplier emissions data. ${planSummary(plan, "assurance")}`;
  const whatsapp = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText.slice(0, 600))}`;
  const chat = (where: string) => leadEvents.cta(analyticsPage, `whatsapp_${where}`);
  const Hero = variant === "a" ? (
    <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
      <div>
        <OfferPill t={t} plan="pro" />
        <h1 className="lp-display text-[2.6rem] leading-[1.02] sm:text-[3.5rem]">Stop chasing suppliers. <span className="lp-accent">Start getting reports.</span></h1>
        <p className="mt-5 max-w-[38ch] text-lg leading-relaxed opacity-90">Suppliers send the bills they already pay. You get structured, audit-ready Scope 3 data across tier 1, 2 and 3, inside your security rules.</p>
        <button type="button" onClick={() => book("hero")} className="lp-cta mt-7 inline-flex h-14 items-center gap-2 rounded-full px-7 text-base font-bold">Book a 10-minute call <ArrowRight className="h-5 w-5" /></button>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => chat("hero")} className="mt-3 flex w-fit items-center gap-2 text-sm font-semibold underline underline-offset-4"><MessageCircle className="h-4 w-4" /> Or message us on WhatsApp</a>
        {Steps}
      </div>
      <div className="grid items-center gap-3 sm:grid-cols-[.75fr_24px_1.35fr]">
        <div className="grid gap-2">
          {CHAOS.map((c, i) => <div key={c} className="lp-chaos rounded-xl border border-[#ff7a59]/40 bg-[#ff7a59]/10 px-3 py-2 text-[12.5px] text-[#ffd2c5]" style={{ ["--d" as string]: `${i * 0.4}s` }}>{c}</div>)}
        </div>
        <div className="hidden h-0.5 bg-gradient-to-r from-transparent to-[var(--lp-accent)] sm:block" aria-hidden="true" />
        <div className="rounded-2xl bg-white p-4 text-[12.5px] text-[#0a1730] shadow-2xl">
          <p className="mb-2 flex justify-between text-[13px] font-bold"><span>Supplier emissions report</span><span className="text-[#0b9e83]">Ready</span></p>
          <div className="grid grid-cols-[1.4fr_.9fr_.6fr] gap-2 border-b border-[#e3e9f2] pb-1.5 font-semibold text-[#5a6b85]"><span>Supplier</span><span>Activity</span><span>t CO₂e</span></div>
          {ROWS.map((r, i) => (
            <div key={r.s} className="lp-row grid grid-cols-[1.4fr_.9fr_.6fr] gap-2 border-b border-[#e3e9f2] py-1.5" style={{ ["--d" as string]: `${i * 0.3}s` }}>
              <span>{r.s} · {r.tier}</span><span>{r.a}</span><span className="font-semibold">{r.t}</span>
            </div>
          ))}
          <p className="mt-2 text-[11px] text-[#5a6b85]">Method, factor, source and document on every line · GHG Protocol · CBAM · BRSR. Example data.</p>
        </div>
      </div>
    </div>
  ) : (
    <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr]">
      <div>
        <OfferPill t={t} plan="pro" />
        <h1 className="lp-display text-[2.6rem] leading-[1.02] sm:text-[3.5rem]">Hundreds of suppliers. <span className="lp-accent">One clean emissions report.</span></h1>
        <p className="mt-5 max-w-[38ch] text-lg leading-relaxed opacity-90">See every supplier light up as their bills arrive, from tier 1 to tier 3. No questionnaires, no spreadsheet chase, no security exceptions.</p>
        <button type="button" onClick={() => book("hero")} className="lp-cta mt-7 inline-flex h-14 items-center gap-2 rounded-full px-7 text-base font-bold">Book a 10-minute call <ArrowRight className="h-5 w-5" /></button>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => chat("hero")} className="mt-3 flex w-fit items-center gap-2 text-sm font-semibold underline underline-offset-4"><MessageCircle className="h-4 w-4" /> Or message us on WhatsApp</a>
        {Steps}
      </div>
      <div>
        <svg viewBox="0 0 440 320" className="mx-auto w-full max-w-[440px]" role="img" aria-label="Suppliers turning from grey estimates to blue evidence as their bills arrive">
          <g stroke="#2c313b" strokeWidth="1.5">
            {[[120, 90], [320, 90], [110, 230], [330, 230]].map(([x, y]) => <line key={`a${x}`} x1="220" y1="160" x2={x} y2={y} />)}
            {[[120, 90, 50, 40], [120, 90, 60, 140], [320, 90, 390, 40], [320, 90, 395, 140], [110, 230, 40, 280], [330, 230, 400, 285], [110, 230, 170, 295], [330, 230, 270, 295]].map(([a, b, c, d]) => <line key={`b${c}${d}`} x1={a} y1={b} x2={c} y2={d} />)}
          </g>
          {[[120, 90], [320, 90], [110, 230], [330, 230]].map(([x, y]) => <circle key={`n${x}${y}`} className="lp-node" cx={x} cy={y} r="13" />)}
          {[[50, 40], [60, 140], [390, 40], [395, 140]].map(([x, y]) => <circle key={`m${x}${y}`} className="lp-node" style={{ ["--d" as string]: "1s" }} cx={x} cy={y} r="9" />)}
          {[[40, 280], [400, 285], [170, 295], [270, 295]].map(([x, y]) => <circle key={`o${x}${y}`} className="lp-node" style={{ ["--d" as string]: "2s" }} cx={x} cy={y} r="7" />)}
          <circle cx="220" cy="160" r="22" fill="#ffb020" />
          <text x="220" y="164" textAnchor="middle" fontSize="12" fontWeight="700" fill="#16181d">You</text>
          <text x="140" y="70" fontSize="11" fill="#a9b0bd">Tier 1</text><text x="20" y="20" fontSize="11" fill="#a9b0bd">Tier 2</text><text x="10" y="312" fontSize="11" fill="#a9b0bd">Tier 3</text>
        </svg>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {GUARDS.map((g) => (
            <div key={g.t} className="rounded-xl bg-[var(--lp-soft)] px-3 py-2.5 text-[13px]">
              <span className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider lp-accent"><g.icon className="h-3.5 w-3.5" /> {g.t}</span>{g.d}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`lp-page ${theme} min-h-screen`}>
      <SEOHead title="Supplier emissions without the chase | Senseible" description="Suppliers send the bills they already pay. You get structured, audit-ready Scope 3 data across tiers. Free supplier evidence kit. Book a 10-minute call." canonical={page} noIndex />
      <AdHeader />
      <main>
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-24 md:pt-28">{Hero}</section>

        <section className="lp-band">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-[1.5fr_1fr] md:items-end">
            <TrustNames names={NAMES} label="Trusted by teams at" />
            <dl className="grid grid-cols-3 gap-4">
              {[["29", "clusters piloted"], ["11", "countries"], ["92%", "benchmark accuracy"]].map(([n, l]) => (
                <div key={l}><dt className="lp-display text-3xl">{n}</dt><dd className="text-[13px] opacity-75">{l}</dd></div>
              ))}
            </dl>
          </div>
        </section>

        {/* The free kit: their plan plus the request to send suppliers today */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-8 rounded-3xl bg-[var(--lp-soft)] p-6 md:grid-cols-[1fr_1.1fr] md:p-10">
            <div>
              <h2 className="lp-display text-3xl leading-tight md:text-4xl">Your supplier evidence kit. Free.</h2>
              <p className="mt-3 max-w-[40ch] opacity-85">Two numbers give you a six-month plan and the request to send suppliers today. No questionnaire: they reply with bills they already have.</p>
              {variant === "a" && (
                <div className="mt-6 flex flex-wrap gap-2 text-[12.5px]">
                  {GUARDS.map((g) => <span key={g.t} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--lp-accent)]/40 px-3 py-1.5 lp-accent"><g.icon className="h-3.5 w-3.5" /> {g.d}</span>)}
                </div>
              )}
            </div>
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">Suppliers behind ~80% of spend
                  <input type="number" min={1} max={20000} value={suppliers} onChange={(e) => { const v = Math.max(1, Math.min(20000, Number(e.target.value) || 1)); setSuppliers(v); setWithData((w) => Math.min(w, v)); }} className="mt-1.5 h-12 w-full rounded-xl border border-[var(--lp-line)] bg-[var(--lp-input)] px-4 text-lg tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-cta)]" />
                </label>
                <label className="text-sm font-medium">Of those, sending real data today
                  <input type="number" min={0} max={suppliers} value={withData} onChange={(e) => setWithData(Math.max(0, Math.min(suppliers, Number(e.target.value) || 0)))} className="mt-1.5 h-12 w-full rounded-xl border border-[var(--lp-line)] bg-[var(--lp-input)] px-4 text-lg tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-cta)]" />
                </label>
              </div>
              <p className="text-lg" aria-live="polite"><strong className="lp-display text-2xl">{plan.coveragePct}%</strong> backed by documents. <strong>{plan.missing.toLocaleString("en-IN")}</strong> to bring on: about <strong>{plan.perMonth.toLocaleString("en-IN")}</strong> a month for six months.</p>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={kit} className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--lp-line)] px-5 text-sm font-semibold"><Download className="h-4 w-4" /> Download my kit (PDF)</button>
                <CopyButton text={SUPPLIER_REQUEST} label="Copy supplier request" onCopy={() => leadEvents.cta(analyticsPage, "copy_request")} />
              </div>
            </div>
          </div>
        </section>

        <ProofStrip audience="enterprise" onOpen={(what) => leadEvents.cta(analyticsPage, `proof_${what}`)} />

        <section className="mx-auto max-w-6xl px-5 pb-20">
          <OfferClock t={t} />
          <h2 className="mt-8 text-[12px] font-semibold uppercase tracking-[.16em] opacity-70">Start with one supplier. Scale to all of them.</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="grid content-start gap-2 rounded-2xl bg-[var(--lp-soft)] p-5">
              <span className="font-mono text-[11px] font-semibold uppercase opacity-70">Start</span>
              <h3 className="text-[13px] font-semibold uppercase tracking-wider opacity-80">Pro · yearly</h3>
              <OfferPrice plan="pro" onBuy={() => leadEvents.cta(analyticsPage, "buy_pro")} />
              <ul className="mt-1 space-y-1.5 text-sm"><li>✓ Your key suppliers, read from their bills</li><li>✓ Reports for GHG Protocol, CBAM, BRSR</li><li>✓ 10 team members</li></ul>
            </div>
            <div className="grid content-start gap-2 rounded-2xl bg-[var(--lp-pick-bg)] p-5 ring-2 ring-[var(--lp-cta)]">
              <span className="font-mono text-[11px] font-semibold uppercase opacity-70">For 100+ suppliers</span>
              <h3 className="text-[13px] font-semibold uppercase tracking-wider opacity-80">Scale</h3>
              <p className="lp-display text-3xl">Custom quote</p>
              <p className="text-[13px] opacity-70">Priced to your supplier count</p>
              <ul className="mt-1 space-y-1.5 text-sm"><li>✓ Supplier invitations and portal</li><li>✓ ERP, email and WhatsApp intake, built to your stack</li><li>✓ Every tier, every entity</li></ul>
            </div>
          </div>
          <button type="button" onClick={() => book("plans")} className="lp-cta mt-8 inline-flex h-14 items-center gap-2 rounded-full px-7 text-base font-bold">Book a 10-minute call <ArrowRight className="h-5 w-5" /></button>
        </section>
      </main>
      <OfferBar t={t} onBook={() => book("bar")} hidden={open} whatsapp={whatsapp} onWhatsApp={() => chat("bar")} />
      <CallbackForm open={open} onClose={close} page={page} analyticsPage={analyticsPage} category="enterprise" industries={INDUSTRIES} summary={planSummary(plan, "assurance")} askCompany themeClass={theme} />
    </div>
  );
}
