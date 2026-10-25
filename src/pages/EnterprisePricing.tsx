import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Minus, Plus, Plug } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { StatusBadge } from "@/components/enterprise/StatusBadge";
import {
  ingestionChannels, outputs, suiteModules, controlAndSecurity, supplierCountOptions, type Capability, type CapabilityStatus,
} from "@/data/enterpriseCapabilities";

// Pricing terms come from the owner's decisions in docs/context/senseible.md
// ("Enterprise pilot", 25 October 2026): custom terms, billed per supplier
// (bill reads and data shared by suppliers already verified on Senseible),
// team size and custom integrations, invoiced through a direct payment link,
// separate from the MSME plans; pilots start on 10 to 15 suppliers. No prices
// are published. Capability statuses come from enterpriseCapabilities.ts.

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
              <span className="w-20 text-right tabular-nums">{asked ? "-" : `${r.t.toFixed(1)} t CO₂e`}</span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted/40 px-4 py-3">
        <div className="flex items-center rounded-full border border-border bg-background">
          <button type="button" onClick={remove} disabled={n <= 1} aria-label="Remove a supplier" className="p-2 disabled:opacity-40"><Minus className="h-4 w-4" /></button>
          <button type="button" onClick={add} disabled={n >= EXAMPLE.length} className="flex items-center gap-1 border-l border-border px-3 py-1.5 text-sm font-medium disabled:opacity-40"><Plus className="h-4 w-4" />Add supplier</button>
        </div>
        <p className="text-xs text-muted-foreground basis-full order-last">A to D: how much of each figure comes from verified bills.</p>
        <p className="ml-auto text-sm" aria-live="polite">On your bill: <strong className="tabular-nums">{n} {n === 1 ? "supplier" : "suppliers"}</strong></p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------- Capability wall
type Fn = "finance" | "esg" | "exports" | "procurement" | "supply";
const FUNCTIONS: { id: Fn; label: string }[] = [
  { id: "finance", label: "Finance" },
  { id: "esg", label: "ESG and sustainability" },
  { id: "exports", label: "Exports" },
  { id: "procurement", label: "Procurement" },
  { id: "supply", label: "Supply chain" },
];

const pick = (list: Capability[], key: string) => list.find((c) => c.key === key)!;
interface Tile { key: string; label: string; status: CapabilityStatus; area: string; fns: Fn[] }
const tile = (c: Capability, label: string, area: string, fns: Fn[]): Tile => ({ key: c.key, label, status: c.status, area, fns });

// Every tile's status comes from enterpriseCapabilities.ts; labels are shortened for the wall.
const TILES: Tile[] = [
  tile(pick(controlAndSecurity, "consent"), "Supplier requests, with consent", "Supplier data", ["procurement", "supply", "esg", "exports"]),
  { key: "reminders", label: "Reminders and overdue list", status: "pilot", area: "Supplier data", fns: ["procurement", "supply"] },
  tile(pick(ingestionChannels, "docs"), "Supplier bills read into their emissions", "Supplier data", ["supply", "esg"]),
  tile(pick(outputs, "portfolio"), "Coverage by share of purchases", "Supply-chain emissions", ["esg", "finance", "procurement"]),
  tile(pick(outputs, "lineage"), "Every figure traced to its bill", "Supply-chain emissions", ["esg", "exports", "finance"]),
  tile(pick(controlAndSecurity, "proofs"), "Supplier totals with proof, never their invoices", "Supplier data", ["finance", "esg", "exports", "procurement"]),
  tile(pick(outputs, "frameworks"), "Your own BRSR, GHG Protocol, CDP and ESRS reports", "Reporting", ["esg"]),
  tile(pick(outputs, "audittrail"), "Audit-trail export", "Reporting", ["esg", "finance"]),
  tile(pick(outputs, "cbam"), "CBAM: product emissions and EU report", "Exports", ["exports", "finance"]),
  tile(pick(suiteModules, "pcf"), "Product carbon footprint", "Exports", ["exports"]),
  tile(pick(suiteModules, "decarb"), "Net-zero roadmap with costs", "ESG", ["esg", "finance"]),
  tile(pick(suiteModules, "dma"), "Double materiality", "ESG", ["esg"]),
  tile(pick(ingestionChannels, "erp"), "Tally, SAP, Oracle, Zoho feeds", "Integrations", ["finance", "supply", "procurement"]),
  tile(pick(ingestionChannels, "api"), "API and webhooks", "Integrations", ["supply"]),
  tile(pick(controlAndSecurity, "rbac"), "Roles per team member", "Access", ["finance", "esg", "exports", "procurement", "supply"]),
  tile(pick(controlAndSecurity, "sso"), "Single sign-on", "Access", ["finance", "esg", "exports", "procurement", "supply"]),
];

/** Pick a team; the tiles it works with light up. */
function CapabilityWall() {
  const [fn, setFn] = useState<Fn | null>(null);
  return (
    <div className="grid gap-6">
      <div role="group" aria-label="Show what a team uses" className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={fn === null} onClick={() => setFn(null)}
          className={`rounded-full px-4 py-2 text-sm transition-colors ${fn === null ? "bg-foreground text-background" : "border border-border hover:bg-secondary"}`}>All</button>
        {FUNCTIONS.map((f) => (
          <button key={f.id} type="button" aria-pressed={fn === f.id} onClick={() => setFn(f.id)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${fn === f.id ? "bg-foreground text-background" : "border border-border hover:bg-secondary"}`}>{f.label}</button>
        ))}
      </div>
      <ul className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((t) => {
          const on = fn === null || t.fns.includes(fn);
          return (
            <li key={t.key} className={`min-h-[6.5rem] flex-col justify-between gap-3 rounded-xl border p-4 transition-all duration-[var(--motion-base)] ${on ? "flex border-border bg-card" : "hidden sm:flex border-transparent bg-muted/40 opacity-50"}`}>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{t.area}</p>
              <div className="flex items-end justify-between gap-3">
                <p className="text-sm font-medium leading-snug">{t.label}</p>
                <StatusBadge status={t.status} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">Live: works today. Pilot: in use, still growing. Custom: built for you.</p>
    </div>
  );
}

// ------------------------------------------------------------- Team builder
type Access = "totals" | "suppliers" | "download" | "ask" | "team";
const ACCESS: { id: Access; label: string }[] = [
  { id: "totals", label: "Totals" },
  { id: "suppliers", label: "Supplier detail" },
  { id: "download", label: "Downloads and reports" },
  { id: "ask", label: "Ask and remind suppliers" },
  { id: "team", label: "Manage team" },
];
// Each team maps to an existing Team role (supabase/functions/_shared/teamRoles.ts).
const ROLE_ACCESS: Record<string, { role: string; access: Access[] }> = {
  admin: { role: "Admin", access: ["totals", "suppliers", "download", "ask", "team"] },
  finance: { role: "Analyst", access: ["totals", "suppliers", "download"] },
  leadership: { role: "Viewer", access: ["totals", "suppliers"] },
  esg: { role: "Analyst", access: ["totals", "suppliers", "download"] },
  exports: { role: "Data manager", access: ["totals", "suppliers", "download", "ask"] },
  procurement: { role: "Data manager", access: ["totals", "suppliers", "download", "ask"] },
  supply: { role: "Data manager", access: ["totals", "suppliers", "download", "ask"] },
  auditor: { role: "Carbon auditor", access: ["totals", "suppliers", "download"] },
};
const TEAM_ROWS: { id: string; label: string; start: number }[] = [
  { id: "admin", label: "Admin", start: 1 },
  { id: "finance", label: "Finance", start: 1 },
  { id: "esg", label: "ESG and sustainability", start: 2 },
  { id: "exports", label: "Exports", start: 0 },
  { id: "procurement", label: "Procurement", start: 1 },
  { id: "supply", label: "Supply chain", start: 0 },
  { id: "leadership", label: "Leadership", start: 0 },
  { id: "auditor", label: "Auditor", start: 0 },
];
const INTEGRATIONS = ["Tally", "SAP, Oracle or Zoho", "API", "Single sign-on"];

/** Seats by team, the access each gets, and the shape of the quote. */
function TeamBuilder() {
  const [seats, setSeats] = useState<Record<string, number>>(() => Object.fromEntries(TEAM_ROWS.map((r) => [r.id, r.start])));
  const [suppliers, setSuppliers] = useState(supplierCountOptions[0]);
  const [ints, setInts] = useState<string[]>([]);
  const total = Object.values(seats).reduce((a, b) => a + b, 0);
  const step = (id: string, d: number) => setSeats((s) => ({ ...s, [id]: Math.max(id === "admin" ? 1 : 0, Math.min(50, s[id] + d)) }));

  const msg = useMemo(() => [
    "Enterprise quote",
    `Suppliers: ${suppliers}`,
    `Team: ${total} (${TEAM_ROWS.filter((r) => seats[r.id] > 0).map((r) => `${r.label} ${seats[r.id]}`).join(", ")})`,
    `Integrations: ${ints.length ? ints.join(", ") : "none"}`,
  ].join("\n"), [suppliers, total, seats, ints]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
      <div className="hidden sm:block rounded-2xl border border-border overflow-hidden min-w-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-3 pl-4 pr-3 font-medium">Team</th>
                <th className="py-3 pr-3 font-medium">Seats</th>
                {ACCESS.map((a) => <th key={a.id} className="py-3 pr-3 font-medium text-center">{a.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {TEAM_ROWS.map((r) => {
                const ra = ROLE_ACCESS[r.id];
                const off = seats[r.id] === 0;
                return (
                  <tr key={r.id} className={`border-b border-border last:border-0 ${off ? "text-muted-foreground" : ""}`}>
                    <td className="py-2.5 pl-4 pr-3"><span className="font-medium">{r.label}</span>{ra.role !== r.label && <span className="block text-xs text-muted-foreground">{ra.role}</span>}</td>
                    <td className="py-2.5 pr-3">
                      <div className="inline-flex items-center rounded-full border border-border">
                        <button type="button" onClick={() => step(r.id, -1)} aria-label={`One fewer ${r.label} seat`} className="p-1.5"><Minus className="h-3.5 w-3.5" /></button>
                        <span className="w-6 text-center tabular-nums" aria-live="polite">{seats[r.id]}</span>
                        <button type="button" onClick={() => step(r.id, 1)} aria-label={`One more ${r.label} seat`} className="p-1.5"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                    {ACCESS.map((a) => (
                      <td key={a.id} className="py-2.5 pr-3 text-center">
                        {ra.access.includes(a.id) ? <Check className={`mx-auto h-4 w-4 ${off ? "opacity-40" : "text-primary"}`} aria-label="Yes" /> : <span className="text-muted-foreground/50" aria-label="No">-</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phones: one card per team, access as plain chips. */}
      <ul className="sm:hidden grid gap-3">
        {TEAM_ROWS.map((r) => {
          const ra = ROLE_ACCESS[r.id];
          return (
            <li key={r.id} className={`rounded-xl border border-border p-4 ${seats[r.id] === 0 ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between gap-3">
                <p><span className="font-medium">{r.label}</span>{ra.role !== r.label && <span className="block text-xs text-muted-foreground">{ra.role}</span>}</p>
                <div className="inline-flex items-center rounded-full border border-border">
                  <button type="button" onClick={() => step(r.id, -1)} aria-label={`One fewer ${r.label} seat`} className="p-2"><Minus className="h-3.5 w-3.5" /></button>
                  <span className="w-6 text-center tabular-nums">{seats[r.id]}</span>
                  <button type="button" onClick={() => step(r.id, 1)} aria-label={`One more ${r.label} seat`} className="p-2"><Plus className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <p className="mt-3 flex flex-wrap gap-1.5">
                {ACCESS.filter((x) => ra.access.includes(x.id)).map((x) => <span key={x.id} className="rounded-full bg-muted px-2 py-0.5 text-xs">{x.label}</span>)}
              </p>
            </li>
          );
        })}
      </ul>

      <aside className="rounded-2xl bg-foreground text-background p-5 sm:p-6 grid gap-5" aria-label="Your quote">
        <p className="font-mono text-[11px] uppercase tracking-widest text-background/60">Your quote covers</p>
        <label className="grid gap-1.5 text-sm">
          <span className="text-background/70">Suppliers</span>
          <select value={suppliers} onChange={(e) => setSuppliers(e.target.value)} className="rounded-lg bg-background text-foreground px-3 py-2">
            {supplierCountOptions.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <div className="text-sm"><span className="text-background/70">Team</span><p className="text-2xl font-semibold tabular-nums">{total} {total === 1 ? "seat" : "seats"}</p></div>
        <div className="grid gap-2 text-sm">
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
        <Link to={`/contact?topic=enterprise&msg=${encodeURIComponent(msg)}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-background text-foreground px-5 py-3 text-sm font-medium">
          Get this quote <ArrowRight className="h-4 w-4" />
        </Link>
      </aside>
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
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-md">Your price follows three things: suppliers, team seats and any integration you ask for. Nothing else.</p>
          <ul className="mt-6 grid gap-2 text-sm">
            {["No plan tiers to climb", "Invoiced, paid by link", "Start with 10 to 15 suppliers"].map((x) => (
              <li key={x} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" aria-hidden="true" />{x}</li>
            ))}
          </ul>
          <a href="#ep-quote" className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3 text-sm font-medium">
            Shape your quote <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <BillTable />
      </header>

      <section aria-labelledby="ep-what" className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-16 border-t border-border">
        <h2 id="ep-what" className="text-2xl sm:text-3xl font-semibold tracking-tight mb-8">One record, every team</h2>
        <CapabilityWall />
      </section>

      <section id="ep-quote" aria-labelledby="ep-team" className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-16 border-t border-border scroll-mt-16">
        <h2 id="ep-team" className="text-2xl sm:text-3xl font-semibold tracking-tight mb-8">Seats by team, access by role</h2>
        <TeamBuilder />
      </section>

      <section aria-labelledby="ep-start" className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-10 pb-28 sm:pb-24 grid gap-8 md:grid-cols-2 border-t border-border">
        <div>
          <h2 id="ep-start" className="text-2xl sm:text-3xl font-semibold tracking-tight">Start with your biggest suppliers.</h2>
          <p className="mt-3 text-muted-foreground">Pilot on 10 to 15. Add the rest as you go.</p>
          <Link to={`/contact?topic=enterprise&msg=${encodeURIComponent("Pilot on 10 to 15 suppliers")}`} className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3 text-sm font-medium">
            Plan your pilot <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 text-sm">
          <div className="rounded-2xl border border-dashed border-border p-5">
            <p className="flex items-center gap-2 font-medium"><Plug className="h-4 w-4" aria-hidden="true" />Already verified on Senseible?</p>
            <p className="mt-1 text-muted-foreground">Those suppliers count the same. Their data reaches you sooner.</p>
          </div>
          <p className="text-muted-foreground">One company, several factories? <Link to="/pricing?plan=scale#plans" className="text-foreground underline underline-offset-4">See the Scale plan</Link></p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
