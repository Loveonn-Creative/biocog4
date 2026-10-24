import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Check, Copy, Download, FileSpreadsheet, FileText } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import NotFound from "./NotFound";
import {
  REGISTER_FUELS, REGISTER_GRID, TEMPLATES, TEMPLATES_META, TEMPLATES_PATH, findTemplate, registerRow, supplierLetter, templatePath,
  type Audience, type LetterInputs, type TemplateDoc,
} from "@/data/templates";

// /templates and /templates/:slug. The hero is the template itself: a sheet
// whose example answers type in, with sheet tabs to switch template and a role
// switch that lights up the fields that reader fills in.

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 1 });

/** How many rows are revealed; restarts when `key` changes. Reduced motion shows all at once. */
function useTypedRows(total: number, key: string) {
  const [shown, setShown] = useState(() => (reduced() ? total : 0));
  useEffect(() => {
    if (reduced()) { setShown(total); return; }
    setShown(0);
    let i = 0;
    const id = window.setInterval(() => { i += 1; setShown(i); if (i >= total) window.clearInterval(id); }, 160);
    return () => window.clearInterval(id);
  }, [total, key]);
  return shown;
}

function DownloadButton({ t, letter, compact }: { t: TemplateDoc; letter?: LetterInputs; compact?: boolean }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const go = async () => {
    setState("busy");
    try {
      const { downloadTemplate } = await import("@/lib/templates/buildTemplate");
      await downloadTemplate(t, letter);
      setState("done");
      window.setTimeout(() => setState("idle"), 2200);
    } catch { setState("idle"); }
  };
  const Icon = state === "done" ? Check : Download;
  return (
    <button type="button" onClick={go} disabled={state === "busy"} data-download={t.slug}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60 ${compact ? "h-9 px-4 text-sm" : "h-11 px-5 text-sm"}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {state === "done" ? "Downloaded" : state === "busy" ? "Building file" : `Download .${t.format}`}
    </button>
  );
}

/** The sheet: rows type in, fields for the other role dim, tabs switch template. */
function Sheet({ t, role, onTab, showTabs }: { t: TemplateDoc; role: Audience; onTab?: (slug: string) => void; showTabs: boolean }) {
  const rows = useMemo(() => t.sections.flatMap(s => s.fields.map((f, i) => ({ ...f, section: i === 0 ? s.name : "" }))), [t]);
  const shown = useTypedRows(rows.length, t.slug);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-2.5 text-xs text-muted-foreground">
        {t.format === "xlsx" ? <FileSpreadsheet className="h-4 w-4 text-primary" aria-hidden="true" /> : <FileText className="h-4 w-4 text-primary" aria-hidden="true" />}
        <span className="truncate font-mono">{t.fileName}</span>
      </div>
      <div className="max-h-[26rem] overflow-y-auto">
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">{t.name}: fields and example answers</caption>
          <thead className="sticky top-0 bg-card text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border">
              <th scope="col" className="w-[42%] px-4 py-2 font-medium">Field</th>
              <th scope="col" className="px-4 py-2 font-medium">Example answer</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const mine = r.by === role;
              const typed = i < shown;
              return (
                <tr key={`${t.slug}-${r.label}`} className={`border-b border-border/70 align-top transition-opacity duration-300 ${mine ? "" : "opacity-45"}`}>
                  <th scope="row" className="px-4 py-2.5 font-normal">
                    {r.section && <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-primary">{r.section}</span>}
                    <span className="flex items-start gap-2">
                      <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${mine ? "bg-primary" : "bg-border"}`} />
                      <span className="min-w-0 break-words font-medium">{r.label}</span>
                    </span>
                  </th>
                  <td className="px-4 py-2.5">
                    <span className={`block min-w-0 break-words font-mono text-[13px] transition-all duration-300 ${typed ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}>{r.example}</span>
                    {r.hint && <span className={`mt-1 block text-xs text-muted-foreground transition-opacity duration-500 ${typed ? "opacity-100" : "opacity-0"}`}>{r.hint}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showTabs && (
        <div role="tablist" aria-label="Templates" className="flex overflow-x-auto border-t border-border bg-muted/60 text-sm">
          {TEMPLATES.map(x => (
            <button key={x.slug} role="tab" type="button" aria-selected={x.slug === t.slug} onClick={() => onTab?.(x.slug)}
              className={`shrink-0 border-r border-border px-4 py-2.5 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${x.slug === t.slug ? "bg-card text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {x.tab}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleSwitch({ role, setRole }: { role: Audience; setRole: (r: Audience) => void }) {
  return (
    <div role="radiogroup" aria-label="I am" className="inline-flex rounded-full border border-border bg-card p-1 text-sm">
      {(["supplier", "buyer"] as const).map(r => (
        <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)}
          className={`rounded-full px-4 py-1.5 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${role === r ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
          {r === "supplier" ? "I supply a big company" : "I buy from suppliers"}
        </button>
      ))}
    </div>
  );
}

/** Register preview: type one month's quantities and watch the formulas work. */
function RegisterPreview() {
  const [q, setQ] = useState<Record<string, string>>({ DIESEL: "400", LPG: "150", GRID: "26000" });
  const nums = Object.fromEntries(Object.entries(q).map(([k, v]) => [k, Number(v.replace(/,/g, ""))]));
  const { scope1, scope2 } = registerRow(nums);
  const lines = [...REGISTER_FUELS.map(f => ({ key: f.key, label: f.label, unit: f.unit, factor: f.factor })), { key: "GRID", label: REGISTER_GRID.label, unit: "kWh", factor: REGISTER_GRID.factor }];
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border bg-muted/60 px-4 py-2.5 text-xs text-muted-foreground">One month of the register. Type from your bills.</div>
      <ul className="divide-y divide-border/70">
        {lines.map(l => {
          const n = nums[l.key];
          const kg = Number.isFinite(n) && n > 0 ? n * l.factor : 0;
          return (
            <li key={l.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5 sm:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1fr)]">
              <span className="min-w-0 text-sm font-medium">{l.label}<span className="block text-xs font-normal text-muted-foreground">× {l.factor} kg CO2 per {l.unit}</span></span>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input aria-label={`${l.label} in ${l.unit}`} inputMode="decimal" value={q[l.key] ?? ""} placeholder="0"
                  onChange={e => setQ(p => ({ ...p, [l.key]: e.target.value }))}
                  className="w-24 rounded-md border border-dashed border-primary/50 bg-background px-2 py-1 text-right font-mono text-sm text-foreground" />
                {l.unit}
              </label>
              <span className="col-span-2 text-right font-mono text-sm tabular-nums sm:col-span-1">{kg ? `${fmt(kg)} kg` : "–"}</span>
            </li>
          );
        })}
      </ul>
      <div className="grid grid-cols-3 gap-2 border-t border-border bg-muted/40 px-4 py-3 text-center" aria-live="polite">
        {[["Scope 1", scope1], ["Scope 2", scope2], ["Month total", scope1 + scope2]].map(([k, v]) => (
          <div key={k as string}><p className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</p><p className="font-mono text-lg font-semibold tabular-nums text-primary">{fmt((v as number) / 1000)} t</p></div>
        ))}
      </div>
    </div>
  );
}

/** Letter preview: the reader's words drop into the letter as they type. */
function LetterPreview({ inputs, setInputs }: { inputs: LetterInputs; setInputs: (i: LetterInputs) => void }) {
  const [copied, setCopied] = useState(false);
  const text = supplierLetter(inputs);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked: the text stays selectable */ }
  };
  const fields: [keyof LetterInputs, string, string][] = [["buyer", "Your company", "Acme Auto Components"], ["supplier", "Supplier", "Shree Ganesh Castings"], ["period", "Period", "April 2025 to March 2026"], ["replyBy", "Reply by", "15 November"]];
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <div className="grid content-start gap-3">
        {fields.map(([k, label, ph]) => (
          <label key={k} className="grid gap-1 text-sm font-medium">{label}
            <input value={inputs[k]} placeholder={ph} onChange={e => setInputs({ ...inputs, [k]: e.target.value })}
              className="h-10 rounded-lg border border-input bg-card px-3 text-sm font-normal" />
          </label>
        ))}
      </div>
      <div className="relative min-w-0 rounded-2xl border border-border bg-card p-4">
        <button type="button" onClick={copy} className="absolute right-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-medium hover:border-primary/50">
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}{copied ? "Copied" : "Copy"}
        </button>
        <pre className="whitespace-pre-wrap break-words pr-16 font-sans text-sm leading-relaxed">{text}</pre>
      </div>
    </div>
  );
}

const NextStep = () => (
  <section className="mt-14 rounded-2xl bg-foreground px-6 py-8 text-background sm:px-10">
    <p className="text-sm font-semibold uppercase tracking-wider opacity-70">Skip the typing</p>
    <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">Upload the bills and the numbers fill themselves in.</h2>
    <p className="mt-2 max-w-xl opacity-80">Senseible reads electricity bills and fuel invoices, applies the same factors as these templates and keeps the bill behind every figure. The first check is free.</p>
    <Link to="/" className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90">Upload a bill <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
  </section>
);

function Hub() {
  const [slug, setSlug] = useState(TEMPLATES[0].slug);
  const [role, setRole] = useState<Audience>("supplier");
  const t = findTemplate(slug) ?? TEMPLATES[0];
  return (
    <>
      <SEOHead title={TEMPLATES_META.title} description={TEMPLATES_META.description} canonical={TEMPLATES_PATH}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Templates", url: TEMPLATES_PATH }]} />
      <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
        <div className="min-w-0 lg:pt-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Free templates</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight [text-wrap:balance] sm:text-5xl">The ESG forms your customers send, already laid out.</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">Four templates for Indian MSMEs and the companies that buy from them. Watch every field fill in, then download. No sign-up.</p>
          <div className="mt-6"><RoleSwitch role={role} setRole={setRole} /></div>
          <p className="mt-3 text-sm text-muted-foreground">{role === "supplier" ? "Bright rows are yours to answer." : "Bright rows are what you ask for and track."}</p>
        </div>
        <div className="min-w-0"><Sheet t={t} role={role} onTab={setSlug} showTabs /></div>
      </section>

      <section className="mt-16" aria-labelledby="all-templates">
        <h2 id="all-templates" className="text-2xl font-semibold tracking-tight">Pick one and take it with you</h2>
        <ol className="mt-6 border-t border-border">
          {TEMPLATES.map((x, i) => (
            <li key={x.slug} className="grid gap-3 border-b border-border py-5 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center">
              <span className="font-mono text-sm text-muted-foreground">0{i + 1}</span>
              <div className="min-w-0">
                <Link to={templatePath(x.slug)} className="text-lg font-semibold hover:text-primary">{x.name}</Link>
                <p className="mt-1 text-sm text-muted-foreground">{x.whoFor} {x.saves}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link to={templatePath(x.slug)} className="inline-flex h-9 items-center rounded-full border border-border px-4 text-sm font-medium hover:border-primary/50">Preview</Link>
                {x.format === "xlsx" && <DownloadButton t={x} compact />}
              </div>
            </li>
          ))}
        </ol>
      </section>
      <NextStep />
    </>
  );
}

function Detail({ t }: { t: TemplateDoc }) {
  const [role, setRole] = useState<Audience>(t.sections.some(s => s.fields.some(f => f.by === "supplier")) ? "supplier" : "buyer");
  const [letter, setLetter] = useState<LetterInputs>({ buyer: "", supplier: "", period: "", replyBy: "" });
  const hasBoth = t.sections.some(s => s.fields.some(f => f.by === "buyer")) && t.sections.some(s => s.fields.some(f => f.by === "supplier"));
  const crumbs = [{ name: "Home", url: "/" }, { name: "Templates", url: TEMPLATES_PATH }, { name: t.name, url: templatePath(t.slug) }];
  return (
    <>
      <SEOHead title={t.title} description={t.description} canonical={templatePath(t.slug)} breadcrumbs={crumbs}
        howToSchema={{ name: `How to use the ${t.name.toLowerCase()}`, steps: t.steps }} />
      <nav className="text-sm text-muted-foreground"><Link to={TEMPLATES_PATH} className="hover:text-foreground">Templates</Link> / {t.name}</nav>
      <div className="mt-4 grid items-start gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight [text-wrap:balance] sm:text-4xl">{t.h1}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{t.answer}</p>
          <dl className="mt-6 grid gap-3 border-l-2 border-primary pl-4 text-sm">
            <div><dt className="font-semibold">For</dt><dd className="text-muted-foreground">{t.whoFor}</dd></div>
            <div><dt className="font-semibold">Saves you</dt><dd className="text-muted-foreground">{t.saves}</dd></div>
          </dl>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <DownloadButton t={t} letter={letter} />
            {hasBoth && <RoleSwitch role={role} setRole={setRole} />}
          </div>
        </div>
        <div className="min-w-0">
          {t.slug === "monthly-emissions-register" ? <RegisterPreview />
            : t.format === "txt" ? <LetterPreview inputs={letter} setInputs={setLetter} />
            : <Sheet t={t} role={role} showTabs={false} />}
        </div>
      </div>

      <section className="mt-14" aria-labelledby="how">
        <h2 id="how" className="text-2xl font-semibold tracking-tight">How to use it</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.steps.map((s, i) => (
            <li key={s.title} className="relative border-t-2 border-primary pt-3">
              <span className="font-mono text-xs text-muted-foreground">Step {i + 1}</span>
              <h3 className="mt-1 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <NextStep />

      <section className="mt-12" aria-labelledby="more">
        <h2 id="more" className="text-lg font-semibold">More templates</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {TEMPLATES.filter(x => x.slug !== t.slug).map(x => (
            <Link key={x.slug} to={templatePath(x.slug)} className="inline-flex h-9 items-center rounded-full border border-border px-4 text-sm hover:border-primary/50">{x.name}</Link>
          ))}
        </div>
      </section>
    </>
  );
}

export default function Templates() {
  const { slug } = useParams();
  const t = slug ? findTemplate(slug) : undefined;
  if (slug && !t) return <NotFound />;
  return (
    <div className="min-h-screen bg-background">
      <MinimalNav />
      <main className="mx-auto max-w-6xl overflow-x-clip px-4 pb-16 pt-24 sm:px-6">
        {t ? <Detail t={t} /> : <Hub />}
      </main>
      <Footer />
    </div>
  );
}
