import { useMemo, useRef, useState, type DragEvent } from "react";
import { Download, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { readSpreadsheet } from "@/lib/import/readFile";
import { checkSheet, type CheckedRow, type CheckResult, type RowStatus } from "@/lib/import/validate";
import { downloadTemplate } from "@/lib/import/templates";
import { DOC_TYPES, parseDocType, type ImportKind } from "@/lib/import/schema";

// /import: check a spreadsheet in the browser before anything is saved.
// Preview only. Nothing is uploaded or written; the estimate uses the same
// shared factor functions as the extraction pipeline.

const PAGE = 50;
const kg = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

const STATUS: Record<RowStatus, { label: string; text: string; fill: string }> = {
  ready: { label: "Ready", text: "text-success", fill: "bg-success" },
  fix: { label: "Needs fixing", text: "text-destructive", fill: "bg-destructive" },
  duplicate: { label: "Duplicates", text: "text-warning", fill: "bg-warning" },
};
const ORDER: RowStatus[] = ["ready", "fix", "duplicate"];

function TemplateLine({ kind, title, line }: { kind: ImportKind; title: string; line: string }) {
  const [busy, setBusy] = useState<"csv" | "xlsx" | null>(null);
  const get = async (format: "csv" | "xlsx") => {
    setBusy(format);
    try { await downloadTemplate(kind, format); } finally { setBusy(null); }
  };
  const btn = "inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-sm font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{line}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        {(["xlsx", "csv"] as const).map(f => (
          <button key={f} type="button" className={btn} onClick={() => get(f)} disabled={busy !== null} data-template={`${kind}-${f}`}>
            {busy === f ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
            {f === "xlsx" ? "Excel" : "CSV"}
          </button>
        ))}
      </div>
    </div>
  );
}

function rowEstimate(r: CheckedRow): string {
  if (r.status === "fix") return "After fixing";
  if (r.status === "duplicate") return "Counted once";
  return typeof r.estimateKg === "number" ? kg(r.estimateKg) : "Not estimated here";
}

const rowLabel = (s: RowStatus) => (s === "duplicate" ? "Duplicate" : STATUS[s].label);

function rowProblem(r: CheckedRow, kind: ImportKind): string {
  if (r.status === "duplicate") return `Same ${kind === "suppliers" ? "supplier" : "bill"} as row ${r.duplicateOf}`;
  return r.issues.map(i => i.message).join(" ");
}

const typeLabel = (raw: string) => { const t = parseDocType(raw); return t ? DOC_TYPES[t].label : raw; };

function Summary({ result, filter, onFilter }: { result: CheckResult; filter: RowStatus | "all"; onFilter: (f: RowStatus | "all") => void }) {
  const { counts } = result;
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {ORDER.map(s => counts[s] > 0 && (
          <div key={s} className={`${STATUS[s].fill} h-full transition-[width] duration-500 motion-reduce:transition-none`} style={{ width: `${(counts[s] / counts.total) * 100}%` }} />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2" role="group" aria-label="Show rows">
        {ORDER.map(s => (
          <button key={s} type="button" onClick={() => onFilter(filter === s ? "all" : s)} aria-pressed={filter === s}
            className={`text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded ${filter !== "all" && filter !== s ? "opacity-50" : ""}`}>
            <span className={`block text-2xl font-semibold tabular-nums ${STATUS[s].text}`}>{counts[s]}</span>
            <span className="text-sm text-muted-foreground">{STATUS[s].label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Rows({ result, filter }: { result: CheckResult; filter: RowStatus | "all" }) {
  const [shown, setShown] = useState(PAGE);
  const rows = useMemo(() => result.rows.filter(r => filter === "all" || r.status === filter), [result, filter]);
  const visible = rows.slice(0, shown);
  const activity = result.kind === "activity";
  const cols = activity
    ? ["Row", "Status", "Bill", "Supplier", "Carbon, kg CO2e", "What to fix"]
    : ["Row", "Status", "Supplier", "Contact", "Annual spend", "What to fix"];
  const cell = "px-3 py-2.5 align-top";
  if (!rows.length) return <p className="py-6 text-sm text-muted-foreground">No rows here.</p>;
  return (
    <>
      {/* Phone: one block per row */}
      <ul className="divide-y divide-border sm:hidden">
        {visible.map(r => (
          <li key={r.line} className="py-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground">Row {r.line}</span>
              <span className={`font-medium ${STATUS[r.status].text}`}>{rowLabel(r.status)}</span>
            </div>
            <p className="mt-1 break-words font-medium">
              {activity
                ? [typeLabel(r.values.type), [r.values.quantity, r.values.unit].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "Empty row"
                : r.values.name || "No name"}
            </p>
            <p className="break-words text-muted-foreground">
              {activity ? [r.values.supplier, r.values.date].filter(Boolean).join(", ") : [r.values.gstin, r.values.email].filter(Boolean).join(", ")}
            </p>
            {r.status === "ready"
              ? activity && <p className="mt-1">Carbon: <span className="font-medium tabular-nums">{rowEstimate(r)}{typeof r.estimateKg === "number" ? " kg CO2e" : ""}</span></p>
              : <p className={`mt-1 break-words ${STATUS[r.status].text}`}>{rowProblem(r, result.kind)}</p>}
          </li>
        ))}
      </ul>
      {/* Wider screens: table, scrolling inside its own box */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card sm:block">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
            <tr>{cols.map(c => <th key={c} scope="col" className="px-3 py-2 font-medium">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map(r => (
              <tr key={r.line}>
                <td className={`${cell} tabular-nums text-muted-foreground`}>{r.line}</td>
                <td className={`${cell} whitespace-nowrap font-medium ${STATUS[r.status].text}`}>{rowLabel(r.status)}</td>
                {activity ? (
                  <>
                    <td className={cell}>
                      <span className="block font-medium">{typeLabel(r.values.type) || "No type"}</span>
                      <span className="block tabular-nums">{[r.values.quantity, r.values.unit].filter(Boolean).join(" ")}</span>
                      <span className="block whitespace-nowrap text-muted-foreground">{r.values.date}</span>
                    </td>
                    <td className={`${cell} max-w-[200px] break-words`}>
                      <span className="block">{r.values.supplier}</span>
                      {r.values.gstin && <span className="block font-mono text-xs text-muted-foreground">{r.values.gstin}</span>}
                      {r.values.invoice && <span className="block whitespace-nowrap text-xs text-muted-foreground">Invoice {r.values.invoice}</span>}
                    </td>
                    <td className={`${cell} ${r.status === "ready" && typeof r.estimateKg === "number" ? "tabular-nums font-medium" : "text-muted-foreground"}`}>{rowEstimate(r)}</td>
                  </>
                ) : (
                  <>
                    <td className={`${cell} max-w-[200px] break-words`}>
                      <span className="block font-medium">{r.values.name}</span>
                      {r.values.category && <span className="block text-muted-foreground">{r.values.category}</span>}
                    </td>
                    <td className={`${cell} max-w-[220px] break-all`}>
                      {r.values.gstin && <span className="block font-mono text-xs">{r.values.gstin}</span>}
                      {r.values.email && <span className="block">{r.values.email}</span>}
                    </td>
                    <td className={`${cell} tabular-nums`}>{r.values.spend}</td>
                  </>
                )}
                <td className={`${cell} min-w-[200px] max-w-[280px] ${STATUS[r.status].text}`}>{rowProblem(r, result.kind)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > shown && (
        <button type="button" onClick={() => setShown(s => s + PAGE)} className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline">
          Show {Math.min(PAGE, rows.length - shown)} more of {rows.length - shown}
        </button>
      )}
    </>
  );
}

export default function Import() {
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [filter, setFilter] = useState<RowStatus | "all">("all");
  const [dragging, setDragging] = useState(false);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setError(null); setResult(null); setFilter("all"); setFileName(file.name);
    const read = await readSpreadsheet(file);
    if (read.ok === false) setError(read.message);
    else {
      const checked = checkSheet(read.rows);
      if (checked.ok === false) setError(checked.message); else setResult(checked.result);
    }
    setBusy(false);
  };
  const reset = () => {
    setResult(null); setError(null); setFileName(null); setFilter("all");
    if (input.current) input.current.value = "";
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); void handle(e.dataTransfer.files?.[0]); };

  const ready = result?.counts.ready ?? 0;
  // Ready activity rows with no factor in the shared file (freight).
  const unestimated = result?.kind === "activity" && result.rows.some(r => r.status === "ready" && r.estimateKg === null);
  const noun = result?.kind === "suppliers" ? (ready === 1 ? "supplier" : "suppliers") : (ready === 1 ? "row" : "rows");

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Import a spreadsheet | Senseible" description="Check fuel, power, freight and supplier spreadsheets row by row before they become records." noIndex />
      <MinimalNav />
      <main className="mx-auto max-w-5xl overflow-x-clip px-4 pb-20 pt-24 sm:px-6">
        <header className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Import your spreadsheet</h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Already keep bills in Excel? Upload the sheet and see which rows are ready and which need fixing.
          </p>
        </header>

        <ol className="mt-10 space-y-10">
          <li className="grid gap-4 sm:grid-cols-[2.5rem_1fr]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background" aria-hidden="true">1</span>
            <section aria-labelledby="step-template">
              <h2 id="step-template" className="text-lg font-semibold">Start from a template</h2>
              <div className="mt-1 divide-y divide-border">
                <TemplateLine kind="activity" title="Fuel and power bills" line="One row per bill: power, fuel or freight." />
                <TemplateLine kind="suppliers" title="Supplier list" line="Who you buy from, with GSTIN and yearly spend." />
              </div>
            </section>
          </li>

          <li className="grid gap-4 sm:grid-cols-[2.5rem_1fr]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background" aria-hidden="true">2</span>
            <section aria-labelledby="step-upload" className="min-w-0">
              <h2 id="step-upload" className="text-lg font-semibold">Check your file</h2>
              {!result && (
                <label
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${dragging ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/60"}`}>
                  {busy ? <Loader2 className="h-6 w-6 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" /> : <Upload className="h-6 w-6 text-primary" aria-hidden="true" />}
                  <span className="font-medium">{busy ? "Checking rows" : "Drop a file or choose one"}</span>
                  <span className="text-sm text-muted-foreground">CSV or Excel, up to 2 MB and 1,000 rows. It stays in this browser.</span>
                  <input ref={input} type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only"
                    onChange={e => void handle(e.target.files?.[0])} data-testid="import-file" />
                </label>
              )}
              {error && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {fileName ? <span className="font-medium">{fileName}: </span> : null}{error}
                </p>
              )}

              {result && (
                <div className="mt-4 space-y-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex min-w-0 items-center gap-2 text-sm">
                      <FileSpreadsheet className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate font-medium">{fileName}</span>
                      <span className="shrink-0 text-muted-foreground">{result.counts.total} {result.counts.total === 1 ? "row" : "rows"}</span>
                    </p>
                    <button type="button" onClick={reset} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
                      <X className="h-4 w-4" aria-hidden="true" /> Check another file
                    </button>
                  </div>

                  <Summary result={result} filter={filter} onFilter={setFilter} />

                  <p className="text-sm">
                    {result.readyEstimateKg !== null && (
                      <>Carbon from ready rows: <span className="font-semibold tabular-nums">{kg(result.readyEstimateKg)} kg CO2e</span>. </>
                    )}
                    {unestimated && <>Freight rows are not included. </>}
                    <span className="text-muted-foreground">Preview only. Nothing is saved.</span>
                  </p>

                  <Rows key={`${fileName}-${filter}`} result={result} filter={filter} />

                  <div className="rounded-2xl border border-border bg-card p-5">
                    <button type="button" disabled aria-describedby="import-next"
                      className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground opacity-50">
                      Import {ready} {noun} (coming soon)
                    </button>
                    <p id="import-next" className="mt-3 max-w-xl text-sm text-muted-foreground">
                      Importing opens soon. Ready rows will then be added to your records and checked like any bill you upload.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </li>
        </ol>
      </main>
      <Footer />
    </div>
  );
}
