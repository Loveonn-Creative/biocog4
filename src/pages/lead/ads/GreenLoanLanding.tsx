import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Camera, Download, FileCheck2, Lock, MessageCircle, PhoneCall } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { AdHeader } from "@/components/lead/ads/AdHeader";
import { leadEvents } from "@/components/lead/leadEvents";
import { CallbackForm } from "@/components/lead/ads/CallbackForm";
import { TrustNames } from "@/components/lead/ads/TrustNames";
import { OfferBar, OfferClock, OfferPill, OfferPrice, useTimeLeft } from "@/components/lead/ads/LaunchOffer";
import { ProofStrip } from "@/components/lead/ads/ProofStrip";
import { WHATSAPP_NUMBER } from "@/components/services/shell/actions";
import { estimateAnnual } from "@/lib/leadMagnets/msmeCarbonReply";
import { downloadKitPdf, msmeKit } from "@/lib/leadMagnets/adKits";
import { BUSINESS_TYPES } from "@/lib/greenLoanCheck";
import "./landing.css";

// MSME ad landing page, two colour directions for A/B tests from ads.
// One action (a 10-minute call). The visitor also leaves with something
// they keep: a readiness kit PDF built from their own numbers.

type Variant = "a" | "b";
const NAMES: [string, "serif" | "caps" | "sans"][] = [
  ["Sudarshan Foundries", "serif"], ["Jyoti Chemicals", "serif"], ["SAIL", "caps"], ["NALCO", "caps"],
  ["Shapoorji Pallonji", "sans"], ["Indorama Ventures", "sans"], ["Bureau of Energy Efficiency", "sans"], ["Verra", "caps"], ["Net-Zero India", "sans"],
];
const BILLS = [
  { m: "APR", v: "4,180 kWh", x: "150px", y: "150px", l: "2%", t: "4%", r: -8 },
  { m: "MAY", v: "4,420 kWh", x: "95px", y: "150px", l: "22%", t: "0%", r: 5 },
  { m: "JUN", v: "310 L diesel", x: "40px", y: "150px", l: "42%", t: "6%", r: -3 },
  { m: "JUL", v: "4,050 kWh", x: "140px", y: "70px", l: "6%", t: "30%", r: 7 },
  { m: "AUG", v: "3,960 kWh", x: "85px", y: "70px", l: "27%", t: "28%", r: -6 },
  { m: "SEP", v: "280 L diesel", x: "30px", y: "70px", l: "47%", t: "32%", r: 4 },
];

const PLANS = [
  { step: "Start here", name: "Free check", plan: null, points: ["Your carbon number on the call", "Readiness kit to keep"] },
  { step: "Step 2", name: "Essential · yearly", plan: "basic" as const, points: ["Every bill turned into carbon", "Your green-loan signal"] },
  { step: "Most chosen", name: "Pro · yearly", plan: "pro" as const, points: ["Lender-ready file and reports", "Incentives and credit options you may qualify for"], pick: true },
];

export default function GreenLoanLanding({ variant }: { variant: Variant }) {
  const page = `/go/green-loan-${variant}`;
  const analyticsPage = `ad_green_loan_${variant}`;
  const theme = variant === "a" ? "lp-msme-a" : "lp-msme-b";
  const [open, setOpen] = useState(false);
  const t = useTimeLeft();
  const [kwh, setKwh] = useState("");
  const [diesel, setDiesel] = useState("");
  const estimate = useMemo(() => estimateAnnual({ kwhPerMonth: Number(kwh), dieselLitresPerMonth: Number(diesel) }), [kwh, diesel]);
  useEffect(() => { leadEvents.view(analyticsPage); }, [analyticsPage]);
  const book = useCallback((where: string) => { leadEvents.cta(analyticsPage, `call_${where}`); setOpen(true); }, [analyticsPage]);
  const close = useCallback(() => setOpen(false), []);
  const kit = () => {
    leadEvents.cta(analyticsPage, "kit_download");
    void downloadKitPdf(msmeKit(estimate, page), "Senseible-green-loan-readiness-kit.pdf", variant === "a" ? [13, 59, 46] : [196, 83, 43]);
  };
  const share = estimate
    ? `My business is about ${estimate.totalTonnes.toLocaleString("en-IN", { maximumFractionDigits: 1 })} tonnes CO2 a year. Green-loan readiness check: https://senseible.earth${page}`
    : "";
  const summary = estimate ? `Estimate ${estimate.totalTonnes} t CO2/yr from ${kwh || 0} kWh and ${diesel || 0} L a month` : undefined;
  const waText = `Hi Senseible, I want my green-loan readiness file.${summary ? ` ${summary}.` : ""}`;
  const whatsapp = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText.slice(0, 600))}`;
  const chat = (where: string) => leadEvents.cta(analyticsPage, `whatsapp_${where}`);
  const num = (v: string) => v.replace(/[^\d.]/g, "").slice(0, 9);

  const Hero = variant === "a" ? (
    <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
      <div>
        <OfferPill t={t} />
        <h1 className="lp-display text-[2.6rem] leading-[1.02] sm:text-[3.6rem]">Your bills can open the door to a <span className="lp-accent">green loan.</span></h1>
        <p className="mt-5 max-w-[34ch] text-lg leading-relaxed opacity-90">Banks want proof your business is cleaning up. Six months of electricity and fuel bills is all it takes. We turn them into that proof.</p>
        <button type="button" onClick={() => book("hero")} className="lp-cta mt-7 inline-flex h-14 items-center gap-2 rounded-full px-7 text-base font-bold">Book a 10-minute call <ArrowRight className="h-5 w-5" /></button>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => chat("hero")} className="mt-3 flex w-fit items-center gap-2 text-sm font-semibold underline underline-offset-4"><MessageCircle className="h-4 w-4" /> Or message us on WhatsApp</a>
        <ol className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm opacity-85">
          <li className="flex items-center gap-2"><PhoneCall className="h-4 w-4" /> 10-minute call</li>
          <li className="flex items-center gap-2"><Camera className="h-4 w-4" /> Share 6 months of bills</li>
          <li className="flex items-center gap-2"><FileCheck2 className="h-4 w-4" /> Your bank-ready file</li>
        </ol>
        <p className="mt-3 flex items-center gap-2 text-sm opacity-75"><Lock className="h-4 w-4" /> Your bills stay in your account. Never sold.</p>
      </div>
      <div className="lp-stage" aria-label="Six monthly bills fly into a green-loan readiness file">
        {BILLS.map((b, i) => (
          <div key={b.m} className="lp-bill" style={{ left: b.l, top: b.t, rotate: `${b.r}deg`, animationDelay: `${i * 0.35}s`, ["--x" as string]: b.x, ["--y" as string]: b.y }}>
            <b>{b.m}</b><i /><i />Units <span className="font-bold text-[#0d3b2e]">{b.v}</span>
          </div>
        ))}
        <div className="absolute bottom-[6%] right-0 w-[min(250px,60%)] rounded-2xl bg-[#fbf6e9] p-4 text-[#1b2a22] shadow-2xl">
          <span className="lp-stamp absolute -top-3.5 right-3 rounded-lg bg-[#f3a712] px-2.5 py-1.5 text-[11px] font-extrabold tracking-wider text-[#1b1404]">BANK-READY</span>
          <p className="font-bold">Green-loan readiness file</p>
          <div className="lp-file-meter mt-3 h-2.5 overflow-hidden rounded-full bg-[#e9e2cf]"><i /></div>
          <p className="mt-1.5 font-mono text-xs opacity-70">6 of 6 months read</p>
          <dl className="mt-3 space-y-1.5 text-[13px]">
            <div className="flex justify-between gap-3"><dt>Carbon baseline</dt><dd className="font-bold">from your bills</dd></div>
            <div className="flex justify-between gap-3"><dt>Loan fit</dt><dd className="font-bold">solar · motors</dd></div>
            <div className="flex justify-between gap-3"><dt>Savings found</dt><dd className="font-bold">diesel → grid</dd></div>
          </dl>
        </div>
      </div>
    </div>
  ) : (
    <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
      <div>
        <OfferPill t={t} />
        <h1 className="lp-display text-[2.6rem] leading-[1.02] sm:text-[3.6rem]">The bank asked for your carbon data. <span className="lp-accent" style={{ backgroundImage: "linear-gradient(transparent 62%, #f6c9a6 62%)" }}>Send 6 photos.</span></h1>
        <p className="mt-5 max-w-[36ch] text-lg leading-relaxed opacity-90">No consultant. No forms. Snap your last six bills and get the file lenders ask for, plus the savings and finance options hiding in them.</p>
        <button type="button" onClick={() => book("hero")} className="lp-cta mt-7 inline-flex h-14 items-center gap-2 rounded-full px-7 text-base font-bold">Book a 10-minute call <ArrowRight className="h-5 w-5" /></button>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => chat("hero")} className="mt-3 flex w-fit items-center gap-2 text-sm font-semibold underline underline-offset-4"><MessageCircle className="h-4 w-4" /> Or message us on WhatsApp</a>
        <ol className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm opacity-85">
          <li className="flex items-center gap-2"><PhoneCall className="h-4 w-4" /> 10-minute call</li>
          <li className="flex items-center gap-2"><Camera className="h-4 w-4" /> 6 bill photos</li>
          <li className="flex items-center gap-2"><FileCheck2 className="h-4 w-4" /> Your file</li>
        </ol>
        <p className="mt-3 flex items-center gap-2 text-sm opacity-75"><Lock className="h-4 w-4" /> Private to your account. Never sold.</p>
      </div>
      <div className="grid gap-4">
        <div className="max-w-[330px] rounded-2xl rounded-bl-sm bg-white p-4 text-[15px] shadow-lg"><span className="block text-[11px] opacity-60">Your bank</span>Can you share your carbon footprint for the green-loan form?</div>
        <div className="lp-rise justify-self-end rounded-2xl rounded-br-sm bg-[#2f7d4a] px-4 py-3 text-[15px] text-white shadow-lg">Sending it now</div>
        <div className="justify-self-end w-[min(280px,100%)] rounded-[28px] bg-[#2a1d15] p-2.5 shadow-2xl">
          <div className="grid gap-3 rounded-[20px] bg-[#fffaf3] p-4">
            <p className="text-xs font-semibold opacity-70">Bills: Apr to Sep</p>
            <div className="grid grid-cols-6 gap-1">
              {[0, 1, 2, 3, 4, 5].map((i) => <i key={i} className="lp-thumb block h-9 rounded bg-[#eadbc6]" style={{ ["--d" as string]: `${i * 0.25}s` }} />)}
            </div>
            <div className="rounded-xl border border-[#ead8c2] bg-white p-3 text-[13px]">
              <p className="mb-1.5 text-sm font-bold">Green-loan readiness</p>
              <div className="flex justify-between border-b border-dashed border-[#ead8c2] py-1"><span>Every bill read</span><span>6 / 6</span></div>
              <div className="flex justify-between border-b border-dashed border-[#ead8c2] py-1"><span>Factor and source</span><span>on every line</span></div>
              <p className="lp-rise mt-2 font-bold text-[#2f7d4a]" style={{ animationDelay: "2s" }}>Ready to share with your bank</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`lp-page ${theme} min-h-screen`}>
      <SEOHead title="Green loan readiness from your bills | Senseible" description="Six months of electricity and fuel bills become the carbon proof banks ask for. Free readiness kit. Book a 10-minute call." canonical={page} noIndex />
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

        {/* The free kit: something to keep, built from their own numbers */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-8 rounded-3xl bg-[var(--lp-soft)] p-6 md:grid-cols-[1fr_1fr] md:p-10">
            <div>
              <h2 className="lp-display text-3xl leading-tight md:text-4xl">Get your readiness kit now. Free.</h2>
              <p className="mt-3 max-w-[38ch] opacity-85">Type two numbers from one bill. Keep a one-page kit: your carbon number, the papers lenders ask for, and a 6-month bill tracker.</p>
            </div>
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">Electricity a month
                  <input inputMode="decimal" value={kwh} onChange={(e) => setKwh(num(e.target.value))} placeholder="0" className="mt-1.5 h-12 w-full rounded-xl border border-[var(--lp-line)] bg-[var(--lp-input)] px-4 text-lg tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-cta)]" />
                  <span className="mt-1 block text-xs opacity-60">kWh, “Units consumed”</span>
                </label>
                <label className="text-sm font-medium">Diesel a month, if any
                  <input inputMode="decimal" value={diesel} onChange={(e) => setDiesel(num(e.target.value))} placeholder="0" className="mt-1.5 h-12 w-full rounded-xl border border-[var(--lp-line)] bg-[var(--lp-input)] px-4 text-lg tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-cta)]" />
                  <span className="mt-1 block text-xs opacity-60">litres, generator or vehicles</span>
                </label>
              </div>
              <p className="text-lg" aria-live="polite">{estimate ? <>About <strong className="lp-display text-2xl">{estimate.totalTonnes.toLocaleString("en-IN", { maximumFractionDigits: 1 })} t CO₂</strong> a year. An estimate; your bills make it proof.</> : <span className="opacity-70">Your number appears here.</span>}</p>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={kit} className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--lp-line)] px-5 text-sm font-semibold"><Download className="h-4 w-4" /> Download my kit (PDF)</button>
                {estimate && <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer" onClick={() => leadEvents.cta(analyticsPage, "kit_whatsapp")} className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--lp-line)] px-5 text-sm font-semibold"><MessageCircle className="h-4 w-4" /> Save to WhatsApp</a>}
              </div>
            </div>
          </div>
        </section>

        <ProofStrip audience="msme" onOpen={(what) => leadEvents.cta(analyticsPage, `proof_${what}`)} />

        <section className="mx-auto max-w-6xl px-5 pb-20">
          <OfferClock t={t} />
          <h2 className="mt-8 text-[12px] font-semibold uppercase tracking-[.16em] opacity-70">Start small. Grow when your bank asks.</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.name} className={`grid content-start gap-2 rounded-2xl p-5 ${p.pick ? "bg-[var(--lp-pick-bg)] text-[var(--lp-pick-ink)] ring-[3px] ring-[var(--lp-cta)]" : "bg-[var(--lp-soft)]"}`}>
                <span className="font-mono text-[11px] font-semibold uppercase opacity-70">{p.step}</span>
                <h3 className="text-[13px] font-semibold uppercase tracking-wider opacity-80">{p.name}</h3>
                {p.plan ? <OfferPrice plan={p.plan} onBuy={() => leadEvents.cta(analyticsPage, `buy_${p.plan}`)} /> : <><p className="lp-display text-3xl">₹0</p><p className="text-[13px] opacity-70">No card. No catch.</p></>}
                <ul className="mt-1 space-y-1.5 text-sm">{p.points.map((x) => <li key={x}>✓ {x}</li>)}</ul>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => book("plans")} className="lp-cta mt-8 inline-flex h-14 items-center gap-2 rounded-full px-7 text-base font-bold">Book a 10-minute call <ArrowRight className="h-5 w-5" /></button>
          <p className="mt-3 text-sm opacity-70">Banks and lenders decide on loans. We get your proof ready.</p>
        </section>
      </main>
      <OfferBar t={t} onBook={() => book("bar")} hidden={open} whatsapp={whatsapp} onWhatsApp={() => chat("bar")} />
      <CallbackForm open={open} onClose={close} page={page} analyticsPage={analyticsPage} category="green-loan-check" industries={BUSINESS_TYPES} summary={summary} themeClass={theme} />
    </div>
  );
}
