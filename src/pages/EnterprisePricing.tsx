import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Minus, Plus } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import {
  ingestionChannels, outputs, suiteModules, controlAndSecurity, supplierCountOptions, type Capability,
} from "@/data/enterpriseCapabilities";
import { ROLE_LABELS, type TeamRole } from "@/lib/teamRoles";

// Pricing terms are the owner's decisions in docs/context/senseible.md
// ("Enterprise pricing", 25 October 2026): one custom quote per enterprise,
// set by suppliers, team seats, report downloads and supplier invites; past
// the quote's limits, pay as you go. Suppliers share at no cost; their own
// extras (Monetize and the rest) are on their own Senseible plan. No prices
// are published. Capabilities come from enterpriseCapabilities.ts; only
// custom builds carry a label.

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------- Hero table
// Fictional suppliers for the example table.
const EXAMPLE = [
  { name: "Riverbend Dye House", buys: "Dyeing", t: 412.0, grade: "A" },
  { name: "Northgate Spinning", buys: "Yarn", t: 268.0, grade: "C" },
  { name: "Lotus Weaving Co", buys: "Fabric", t: 190.5, grade: "A" },
  { name: "Silverline Freight", buys: "Road freight", t: 96.4, grade: "D" },
  { name: "Meadow Chemicals", buys: "Dyes", t: 88.2, grade: "B" },
  { name: "Harbour Steam Co", buys: "Steam", t: 71.9, grade: "A" },
  { name: "Bluehill Packaging", buys: "Cartons", t: 40.3, grade: "B" },
  { name: "Oakfield Trims", buys: "Trims", t: 12.6, grade: "C" },
];

/** The product is the price list: every row added is one supplier on the bill. */
function BillTable() {
  const [n, setN] = useState(3);
  const [fresh, setFresh] = useState<number | null>(null);
  const add = () => { if (n < EXAMPLE.length) { setFresh(n); setN(n + 1); } };
  const remove = () => { if (n > 1) { setFresh(null); setN(n - 1); } };
  // Shared after a beat, the way a real request lands; instantly with reduced motion.
  useEffect(() => {
    if (fresh === null) return;
    const id = setTimeout(() => setFresh(null), reduced() ? 0 : 900);
    return () => clearTimeout(id);
  }, [fresh]);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden min-w-0">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="text-sm font-medium">Your suppliers</p>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Example</span>
      </div>
      <ul className="divide-y divide-border" aria-live="polite">
        {EXAMPLE.slice(0, n).map((r, i) => {
          const asked = fresh === i;
          return (
            <li key={r.name} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-2.5 text-sm motion-safe:animate-[ent-fade-up_var(--motion-base)_var(--ease-out)_both]">
              <span className="min-w-0"><span className="block truncate font-medium">{r.name}</span><span className="block text-xs text-muted-foreground">{r.buys}</span></span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${asked ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>{asked ? "Asked" : `Shared · ${r.grade}`}</span>
              <span className="w-24 text-right tabular-nums whitespace-nowrap">{asked ? "-" : `${r.t.toFixed(1)} t CO₂e`}</span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted/40 px-4 py-3">
        <div className="flex items-center rounded-full border border-border bg-background">
          <button type="button" onClick={remove} disabled={n <= 1} aria-label="Remove a supplier" className="p-2 disabled:opacity-40"><Minus className="h-4 w-4" /></button>
          <button type="button" onClick={add} disabled={n >= EXAMPLE.length} className="flex items-center gap-1 border-l border-border px-3 py-1.5 text-sm font-medium disabled:opacity-40"><Plus className="h-4 w-4" />Add supplier</button>
        </div>
        <p className="ml-auto text-sm" aria-live="polite">On your bill: <strong className="tabular-nums">{n} {n === 1 ? "supplier" : "suppliers"}</strong></p>
        <p className="basis-full text-xs text-muted-foreground">A to D: how much of each figure comes from verified bills.</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- Quote meter
const DIALS = [
  { k: "Suppliers", w: 1 },
  { k: "Team seats", w: 0.8 },
  { k: "Report downloads", w: 1.15 },
  { k: "Supplier invites", w: 0.9 },
];

/** What the quote sets, and what happens past it. */
function QuoteMeter() {
  const [use, setUse] = useState(70);
  return (
    <div className="grid gap-8 md:grid-cols-[1fr_1.2fr] md:items-center">
      <div>
        <h2 id="ep-quote-h" className="text-2xl sm:text-3xl font-semibold tracking-tight [text-wrap:balance]">One quote. Four things set it.</h2>
        <p className="mt-3 text-muted-foreground max-w-sm">Go past any of them and you pay as you go, only for the extra.</p>
        <label className="mt-6 grid gap-2 text-sm max-w-sm">
          <span className="text-muted-foreground">Your year so far</span>
          <input type="range" min={20} max={140} value={use} onChange={(e) => setUse(Number(e.target.value))} className="accent-[hsl(var(--primary))]" aria-label="Use this year, compared with your quote" />
        </label>
      </div>
      <ul className="grid gap-4" aria-live="polite">
        {DIALS.map((d) => {
          const pct = Math.min(150, use * d.w);
          const inQuote = Math.min(pct, 100);
          const over = Math.max(0, pct - 100);
          return (
            <li key={d.k} className="grid gap-1.5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{d.k}</span>
                <span className={over > 0 ? "text-primary font-medium" : "text-muted-foreground"}>{over > 0 ? "Pay as you go" : "In your quote"}</span>
              </div>
              <div className="relative h-3 rounded-full bg-muted">
                <span className="absolute inset-y-0 left-0 rounded-full bg-foreground/80 transition-[width] duration-[var(--motion-base)]" style={{ width: `${(inQuote / 150) * 100}%` }} />
                {over > 0 && <span className="absolute inset-y-0 rounded-r-full bg-primary transition-[width] duration-[var(--motion-base)]" style={{ left: `${(100 / 150) * 100}%`, width: `${(over / 150) * 100}%` }} />}
                <span className="absolute -top-1 -bottom-1 w-px bg-foreground" style={{ left: `${(100 / 150) * 100}%` }} aria-hidden="true" />
              </div>
            </li>
          );
        })}
        <li className="text-xs text-muted-foreground">The line is your quote.</li>
      </ul>
    </div>
  );
}

// ---------------------------------------------------------- Capability wall
type Area = "Suppliers" | "Emissions" | "Reports" | "Exports" | "Insight" | "Integrations";
const AREAS: Area[] = ["Suppliers", "Emissions", "Reports", "Exports", "Insight", "Integrations"];
interface Tile { key: string; label: string; custom: boolean; area: Area }
const pick = (list: Capability[], key: string) => list.find((c) => c.key === key)!;
const tile = (c: Capability, label: string, area: Area): Tile => ({ key: c.key, label, custom: c.status === "custom", area });

const TILES: Tile[] = [
  tile(pick(controlAndSecurity, "consent"), "Supplier requests, with consent", "Suppliers"),
  { key: "reminders", label: "Reminders and overdue list", custom: false, area: "Suppliers" },
  tile(pick(controlAndSecurity, "proofs"), "Supplier totals with proof, never their invoices", "Suppliers"),
  tile(pick(ingestionChannels, "docs"), "Supplier bills read into their emissions", "Emissions"),
  tile(pick(outputs, "portfolio"), "Coverage by share of purchases", "Emissions"),
  tile(pick(outputs, "lineage"), "Every figure traced to its bill", "Emissions"),
  { key: "history", label: "Supplier history, year by year", custom: false, area: "Emissions" },
  tile(pick(outputs, "frameworks"), "Your BRSR, GHG Protocol, CDP and ESRS reports", "Reports"),
  tile(pick(outputs, "audittrail"), "Audit-trail export", "Reports"),
  tile(pick(outputs, "cbam"), "CBAM product emissions and EU report", "Exports"),
  tile(pick(suiteModules, "pcf"), "Product carbon footprint", "Exports"),
  // Biocog Superintelligence over supplier records: owner-requested, built for each enterprise.
  { key: "mind", label: "Biocog Superintelligence on your supplier data", custom: true, area: "Insight" },
  tile(pick(suiteModules, "decarb"), "Net-zero roadmap with costs", "Insight"),
  tile(pick(suiteModules, "dma"), "Double materiality", "Insight"),
  tile(pick(ingestionChannels, "erp"), "Tally, SAP, Oracle, Zoho feeds", "Integrations"),
  tile(pick(ingestionChannels, "api"), "API and webhooks", "Integrations"),
  tile(pick(controlAndSecurity, "sso"), "Single sign-on", "Integrations"),
];

/** Every capability on one wall; pick an area to bring it forward. */
function CapabilityWall() {
  const [area, setArea] = useState<Area | null>(null);
  const chip = (on: boolean) => `rounded-full px-4 py-2 text-sm transition-colors ${on ? "bg-foreground text-background" : "border border-border hover:bg-secondary"}`;
  return (
    <div className="grid gap-6">
      <div role="group" aria-label="Filter by area" className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={area === null} onClick={() => setArea(null)} className={chip(area === null)}>All</button>
        {AREAS.map((a) => <button key={a} type="button" aria-pressed={area === a} onClick={() => setArea(a)} className={chip(area === a)}>{a}</button>)}
      </div>
      <ul className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((t) => {
          const on = area === null || t.area === area;
          return (
            <li key={t.key} className={`min-h-[6rem] flex-col justify-between gap-3 rounded-xl border p-4 transition-all duration-[var(--motion-base)] ${on ? "flex border-border bg-card" : "hidden sm:flex border-transparent bg-muted/40 opacity-50"}`}>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{t.area}</p>
              <div className="flex items-end justify-between gap-3">
                <p className="text-sm font-medium leading-snug">{t.label}</p>
                {t.custom && <span className="shrink-0 rounded-full border border-foreground/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider">Custom</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------- Roles
// The enterprise's own Team roles (supabase/functions/_shared/teamRoles.ts).
// Asking suppliers is enforced by private.enterprise_can_ask; downloads are
// hidden for viewers; managing the team is owner and admin only.
type Action = "ask" | "remind" | "download" | "team";
const ROLE_ACTIONS: { role: TeamRole; can: Action[]; line: string }[] = [
  { role: "admin", can: ["ask", "remind", "download", "team"], line: "Everything, including who joins and their roles." },
  { role: "data_manager", can: ["ask", "remind", "download"], line: "Asks, reminds and cancels suppliers. Downloads the sheet." },
  { role: "analyst", can: ["download"], line: "Sees every supplier. Downloads sheets and reports." },
  { role: "carbon_auditor", can: ["download"], line: "Checks figures against their evidence." },
  { role: "viewer", can: [], line: "Reads totals and suppliers on screen. Changes nothing." },
];

/** Pick a role; the preview shows exactly what that person can press. */
function RolePreview() {
  const [r, setR] = useState(ROLE_ACTIONS[0]);
  const btn = (a: Action, label: string, solid = false) => {
    const on = r.can.includes(a);
    return (
      <span className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-[var(--motion-base)] ${on ? (solid ? "bg-primary text-primary-foreground" : "border border-border bg-background") : "border border-dashed border-border text-muted-foreground/60 line-through"}`}>{label}</span>
    );
  };
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,15rem)_1fr] md:items-start">
      <div role="radiogroup" aria-label="Role" className="grid gap-2">
        {ROLE_ACTIONS.map((x) => (
          <button key={x.role} type="button" role="radio" aria-checked={x.role === r.role} onClick={() => setR(x)}
            className={`rounded-xl border px-4 py-3 text-left transition-colors ${x.role === r.role ? "border-foreground bg-foreground text-background" : "border-border hover:bg-secondary"}`}>
            <span className="block text-sm font-medium">{ROLE_LABELS[x.role]}</span>
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden min-w-0" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="text-sm font-medium">Your suppliers</p>
          <div className="flex flex-wrap gap-2">{btn("team", "Team")}{btn("download", "Supplier sheet")}{btn("ask", "Ask suppliers", true)}</div>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-sm">
          <span className="min-w-0 truncate">Bluehill Packaging <span className="text-xs text-muted-foreground">· overdue</span></span>
          {btn("remind", "Remind")}
        </div>
        <p className="border-t border-border bg-muted/40 px-4 py-3 text-sm">{r.line}</p>
      </div>
    </div>
  );
}

// -------------------------------------------------------------- Quote form
const INTEGRATIONS = ["Tally", "SAP, Oracle or Zoho", "API", "Single sign-on"];

function QuoteForm() {
  const [suppliers, setSuppliers] = useState(supplierCountOptions[0]);
  const [seats, setSeats] = useState(5);
  const [ints, setInts] = useState<string[]>([]);
  const msg = useMemo(() => [
    "Enterprise quote",
    `Suppliers: ${suppliers}`,
    `Team seats: ${seats}`,
    `Integrations: ${ints.length ? ints.join(", ") : "none"}`,
  ].join("\n"), [suppliers, seats, ints]);
  return (
    <div className="rounded-3xl bg-foreground text-background p-5 sm:p-8 grid gap-6 md:grid-cols-[1fr_1fr_1.3fr_auto] md:items-end">
      <label className="grid gap-1.5 text-sm">
        <span className="text-background/70">Suppliers</span>
        <select value={suppliers} onChange={(e) => setSuppliers(e.target.value)} className="rounded-lg bg-background text-foreground px-3 py-2.5">
          {supplierCountOptions.map((o) => <option key={o}>{o}</option>)}
        </select>
      </label>
      <div className="grid gap-1.5 text-sm">
        <span className="text-background/70">Team seats</span>
        <div className="inline-flex w-fit items-center rounded-lg bg-background text-foreground">
          <button type="button" onClick={() => setSeats((s) => Math.max(1, s - 1))} aria-label="One fewer seat" className="p-2.5"><Minus className="h-4 w-4" /></button>
          <span className="w-10 text-center tabular-nums" aria-live="polite">{seats}</span>
          <button type="button" onClick={() => setSeats((s) => Math.min(500, s + 1))} aria-label="One more seat" className="p-2.5"><Plus className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="grid gap-1.5 text-sm">
        <span className="text-background/70">Integrations</span>
        <div className="flex flex-wrap gap-2">
          {INTEGRATIONS.map((i) => {
            const on = ints.includes(i);
            return (
              <button key={i} type="button" aria-pressed={on} onClick={() => setInts((x) => (on ? x.filter((y) => y !== i) : [...x, i]))}
                className={`rounded-full px-3 py-1.5 text-xs transition-colors ${on ? "bg-background text-foreground" : "border border-background/30 text-background/80"}`}>{i}</button>
            );
          })}
        </div>
      </div>
      <Link to={`/contact?topic=enterprise&msg=${encodeURIComponent(msg)}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-background text-foreground px-6 py-3 text-sm font-medium whitespace-nowrap">
        Get your quote <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

/** /enterprise/pricing: how an enterprise is billed for supplier emissions. */
export default function EnterprisePricing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SEOHead title="" description="" canonical="/enterprise/pricing" />
      <MinimalNav />

      <header className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-24 sm:pt-28 pb-16 grid gap-10 md:grid-cols-[1fr_1.05fr] md:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Enterprise pricing</p>
          <h1 className="mt-3 text-[clamp(2.25rem,6vw,3.75rem)] font-semibold leading-[1.04] tracking-tight [text-wrap:balance]">Pay as you add suppliers.</h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-md">One quote, built around your suppliers and your team.</p>
          <ul className="mt-6 grid gap-2 text-sm">
            {["No plan tiers to climb", "Suppliers share with you free", "Your team, your roles"].map((x) => (
              <li key={x} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" aria-hidden="true" />{x}</li>
            ))}
          </ul>
          <a href="#ep-get" className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3 text-sm font-medium">
            Get your quote <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <BillTable />
      </header>

      <section aria-labelledby="ep-quote-h" className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-16 border-t border-border">
        <QuoteMeter />
      </section>

      <section aria-labelledby="ep-what" className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-16 border-t border-border">
        <h2 id="ep-what" className="text-2xl sm:text-3xl font-semibold tracking-tight mb-8">Everything on one record</h2>
        <CapabilityWall />
      </section>

      <section aria-labelledby="ep-roles" className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-16 border-t border-border">
        <h2 id="ep-roles" className="text-2xl sm:text-3xl font-semibold tracking-tight">Your team, your roles</h2>
        <p className="mt-2 mb-8 text-muted-foreground">You pick each person's role when you invite them.</p>
        <RolePreview />
      </section>

      <section aria-label="Suppliers" className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-16 border-t border-border grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight">Suppliers keep their own account.</p>
        </div>
        <div className="grid gap-3 text-sm">
          <p className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />Sharing with you costs them nothing.</p>
          <p className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />Monetize and other extras are on their own Senseible plan.</p>
          <p className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />Your roles cover your team, never theirs.</p>
        </div>
      </section>

      <section id="ep-get" aria-label="Get your quote" className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-6 pb-28 sm:pb-24 scroll-mt-16 grid gap-4">
        <QuoteForm />
        <p className="text-sm text-muted-foreground">One company, several factories? <Link to="/pricing?plan=scale#plans" className="text-foreground underline underline-offset-4">See the Scale plan</Link></p>
      </section>

      <Footer />
    </div>
  );
}
