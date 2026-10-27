import { Fragment, useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Download, FileSpreadsheet, Loader2, Pencil, Upload, X } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { readSpreadsheet } from "@/lib/import/readFile";
import { checkRecords, checkSheet, SAVE_BATCH_MAX, type CheckedRow, type CheckResult, type RowRecord, type RowStatus } from "@/lib/import/validate";
import { downloadTemplate } from "@/lib/import/templates";
import { COLUMNS, DOC_TYPES, parseDocType, type ImportKind } from "@/lib/import/schema";
import { toCsv } from "@/lib/import/csv";
import { takeHandedOffSpreadsheet } from "@/lib/import/handoff";
import { finalRows, NOT_SAVED, type FinalStatus, type Outcome, type SaveSummary } from "@/lib/import/results";
import { useAuthStatus } from "@/hooks/useSession";
import { emitRecordsChanged } from "@/lib/recordsEvents";

// /import: check a spreadsheet in the browser, fix rows, then save ready bill
// rows through the import-records function, which checks every row again
// with the same shared rules (importRows.ts) and stores them like uploaded
// bills. The file itself is never uploaded. A CSV or Excel file picked in the
// homepage or bulk upload box arrives here (handoff.ts) instead of going to
// the invoice reader.

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

/** Inputs for the cells a row needs fixed; "Check again" runs the same checks. */
function RowEditor({ row, kind, onSave, onCancel }: { row: CheckedRow; kind: ImportKind; onSave: (values: Record<string, string>) => void; onCancel: () => void }) {
  const fields = [...new Set(row.issues.map(i => i.field))];
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(f => [f, row.values[f] ?? ""])));
  const label = (key: string) => COLUMNS[kind].find(c => c.key === key)?.label ?? key;
  const submit = (e: FormEvent) => { e.preventDefault(); onSave({ ...row.values, ...draft }); };
  return (
    <form onSubmit={submit} className="mt-2 space-y-3 rounded-xl border border-border bg-background p-3" aria-label={`Fix row ${row.line}`}>
      {fields.map(f => (
        <label key={f} className="block text-sm">
          <span className="font-medium">{label(f)}</span>
          <input value={draft[f]} onChange={e => setDraft(d => ({ ...d, [f]: e.target.value }))}
            className="mt-1 block h-10 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
      ))}
      <div className="flex gap-2">
        <button type="submit" className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">Check again</button>
        <button type="button" onClick={onCancel} className="inline-flex h-9 items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted">Cancel</button>
      </div>
    </form>
  );
}

function FixButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
      <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Fix here
    </button>
  );
}

function Rows({ result, filter, onFix }: { result: CheckResult; filter: RowStatus | "all"; onFix?: (line: number, values: Record<string, string>) => void }) {
  const [shown, setShown] = useState(PAGE);
  const [editing, setEditing] = useState<number | null>(null);
  const save = (line: number) => (values: Record<string, string>) => { setEditing(null); onFix?.(line, values); };
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
            {r.status === "fix" && onFix && (editing === r.line
              ? <RowEditor row={r} kind={result.kind} onSave={save(r.line)} onCancel={() => setEditing(null)} />
              : <FixButton onClick={() => setEditing(r.line)} />)}
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
              <Fragment key={r.line}>
              <tr>
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
                <td className={`${cell} min-w-[200px] max-w-[280px] ${STATUS[r.status].text}`}>
                  {rowProblem(r, result.kind)}
                  {r.status === "fix" && onFix && editing !== r.line && <div><FixButton onClick={() => setEditing(r.line)} /></div>}
                </td>
              </tr>
              {editing === r.line && (
                <tr><td colSpan={cols.length} className="px-3 pb-3">
                  <RowEditor row={r} kind={result.kind} onSave={save(r.line)} onCancel={() => setEditing(null)} />
                </td></tr>
              )}
              </Fragment>
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


// Rows kept across sign-in only (this tab, cleared once read), so a visitor
// who signs in to import does not have to pick the file again.
const CARRY_KEY = "senseible:import-carry";
function carryRows(data: { fileName: string; kind: ImportKind; records: RowRecord[] }) {
  try { sessionStorage.setItem(CARRY_KEY, JSON.stringify(data)); } catch { /* storage blocked */ }
}
function takeCarriedRows(): { fileName: string; kind: ImportKind; records: RowRecord[] } | null {
  try {
    const raw = sessionStorage.getItem(CARRY_KEY);
    sessionStorage.removeItem(CARRY_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v && Array.isArray(v.records) && (v.kind === "activity" || v.kind === "suppliers") ? v : null;
  } catch { return null; }
}

function downloadFlagged(result: CheckResult, fileName: string | null) {
  const cols = COLUMNS[result.kind];
  const rows = [[...cols.map(c => c.label), "What to fix"]];
  for (const r of result.rows) if (r.status === "fix") rows.push([...cols.map(c => r.values[c.key] ?? ""), r.issues.map(i => i.message).join(" ")]);
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(fileName ?? "sheet").replace(/\.(csv|xlsx|xls)$/i, "")}-rows-to-fix.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function saveRows(all: CheckedRow[], onProgress: (done: number) => void): Promise<SaveSummary> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { resolveWorkspaceScope } = await import("@/lib/workspaceChoice");
  const { getFunctionErrorMessage } = await import("@/lib/functionErrors");
  const outcomes = new Map<number, Outcome>();
  const finish = (error: string | null, unsentReason = NOT_SAVED): SaveSummary => {
    const rows = finalRows(all, outcomes, unsentReason);
    const counts: Record<FinalStatus, number> = { saved: 0, duplicate: 0, fix: 0, failed: 0 };
    for (const r of rows) counts[r.status]++;
    return { rows, counts, error };
  };
  const ready = all.filter(r => r.status === "ready");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return finish("Sign in again to import.");
  let organizationId: string | undefined;
  try {
    const scope = await resolveWorkspaceScope(supabase, auth.user.id);
    if (scope.kind === "organization") {
      if (!scope.capabilities.includes("records.upload")) return finish("Your team role cannot add bills to this organisation. Ask an admin for access.");
      organizationId = scope.organizationId;
    }
  } catch {
    return finish("We could not check your workspace. Try again.");
  }
  for (let i = 0; i < ready.length; i += SAVE_BATCH_MAX) {
    const batch = ready.slice(i, i + SAVE_BATCH_MAX).map(r => ({ line: r.line, values: r.values }));
    const { data, error } = await supabase.functions.invoke("import-records", { body: { kind: "bills", rows: batch, organizationId } });
    if (error) return finish(await getFunctionErrorMessage(error, "Saving stopped. Try again."));
    for (const o of (data?.results ?? []) as Outcome[]) outcomes.set(o.line, o);
    onProgress(Math.min(i + SAVE_BATCH_MAX, ready.length));
    // The rest would be refused too: they are reported without being sent.
    if (data?.limitReached) return finish(null, "Monthly limit reached. Not saved.");
  }
  return finish(null);
}

const FINAL: Record<FinalStatus, { label: string; text: string }> = {
  saved: { label: "Saved", text: "text-success" },
  duplicate: { label: "Duplicate", text: "text-warning" },
  fix: { label: "Needs fixing", text: "text-destructive" },
  failed: { label: "Failed", text: "text-destructive" },
};

function SavedPanel({ summary }: { summary: SaveSummary }) {
  const [shown, setShown] = useState(PAGE);
  const { counts } = summary;
  const items: Array<[number, string, string]> = [
    [counts.saved, "Saved", "text-success"],
    [counts.duplicate, "Duplicates", "text-warning"],
    [counts.fix, "Need fixing", "text-destructive"],
    [counts.failed, "Failed", "text-destructive"],
  ];
  // Rows that were not saved first, then the saved ones.
  const order: Record<FinalStatus, number> = { failed: 0, fix: 1, duplicate: 2, saved: 3 };
  const rows = [...summary.rows].sort((a, b) => order[a.status] - order[b.status] || a.line - b.line);
  return (
    <div className="space-y-4" data-testid="import-saved">
      <h3 className="text-lg font-semibold">{counts.saved > 0 ? "Added to your records" : "Nothing new was saved"}</h3>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {items.map(([n, label, color]) => (
          <div key={label}>
            <span className={`block text-2xl font-semibold tabular-nums ${color}`}>{n}</span>
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
      {summary.error && <p role="alert" className="text-sm text-destructive">{summary.error}</p>}
      {counts.saved > 0 && (
        <div className="flex flex-wrap gap-3">
          <Link to="/verify" className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90">Review in Verify</Link>
          <Link to="/history" className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-card px-6 text-sm font-semibold hover:bg-muted">See in History</Link>
        </div>
      )}
      <ul className="divide-y divide-border text-sm">
        {rows.slice(0, shown).map(r => (
          <li key={r.line} className="flex flex-wrap items-baseline gap-x-3 py-2">
            <span className="w-16 shrink-0 tabular-nums text-muted-foreground">Row {r.line}</span>
            <span className={`w-28 shrink-0 font-medium ${FINAL[r.status].text}`}>{FINAL[r.status].label}</span>
            {r.reason && <span className="min-w-0 flex-1 break-words text-muted-foreground">{r.reason}</span>}
          </li>
        ))}
      </ul>
      {rows.length > shown && (
        <button type="button" onClick={() => setShown(n => n + PAGE)} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Show {Math.min(PAGE, rows.length - shown)} more of {rows.length - shown}
        </button>
      )}
    </div>
  );
}

export default function Import() {
  const input = useRef<HTMLInputElement>(null);
  // Signed in or not, without starting a guest session on this page.
  const authStatus = useAuthStatus();
  const signedIn = authStatus === "signedIn";
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ kind: ImportKind; records: RowRecord[] } | null>(null);
  const [filter, setFilter] = useState<RowStatus | "all">("all");
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState<SaveSummary | null>(null);
  const result = useMemo(() => (sheet ? checkRecords(sheet.kind, sheet.records) : null), [sheet]);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setError(null); setSheet(null); setSummary(null); setFilter("all"); setFileName(file.name);
    const read = await readSpreadsheet(file);
    if (read.ok === false) setError(read.message);
    else {
      const checked = checkSheet(read.rows);
      if (checked.ok === false) setError(checked.message);
      else setSheet({ kind: checked.result.kind, records: checked.result.rows.map(r => ({ line: r.line, values: r.values })) });
    }
    setBusy(false);
  };

  // A sheet picked in an upload box elsewhere, or rows carried across sign-in.
  const started = useRef(false);
  useEffect(() => {
    if (started.current || authStatus === "loading") return;
    started.current = true;
    const handed = takeHandedOffSpreadsheet();
    if (handed) { void handle(handed); return; }
    const carried = signedIn ? takeCarriedRows() : null;
    if (carried) { setFileName(carried.fileName); setSheet({ kind: carried.kind, records: carried.records }); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  const reset = () => {
    setSheet(null); setError(null); setFileName(null); setFilter("all"); setSummary(null);
    if (input.current) input.current.value = "";
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); void handle(e.dataTransfer.files?.[0]); };
  const fixRow = (line: number, values: Record<string, string>) =>
    setSheet(s => (s ? { ...s, records: s.records.map(r => (r.line === line ? { line, values } : r)) } : s));

  const save = async () => {
    if (!result || !signedIn) return;
    const total = result.counts.ready;
    setSaving({ done: 0, total });
    const out = await saveRows(result.rows, done => setSaving({ done, total }));
    setSaving(null);
    setSummary(out);
    if (out.counts.saved > 0) emitRecordsChanged("import");
  };

  const ready = result?.counts.ready ?? 0;
  const fixCount = result?.counts.fix ?? 0;
  // Ready activity rows with no factor in the shared file (freight).
  const unestimated = result?.kind === "activity" && result.rows.some(r => r.status === "ready" && r.estimateKg === null);
  const suppliers = result?.kind === "suppliers";
  const noun = suppliers ? (ready === 1 ? "supplier" : "suppliers") : (ready === 1 ? "row" : "rows");
  const actionBtn = "inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground";

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
                  <span className="text-sm text-muted-foreground">CSV or Excel, up to 2 MB and 1,000 rows. The file stays in this browser.</span>
                  <input ref={input} type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only"
                    onChange={e => void handle(e.target.files?.[0])} data-testid="import-file" />
                </label>
              )}
              {error && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {fileName ? <span className="font-medium">{fileName}: </span> : null}{error}
                </p>
              )}

              {result && summary && (
                <div className="mt-4 rounded-2xl border border-border bg-card p-5">
                  <SavedPanel summary={summary} />
                  <button type="button" onClick={reset} className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline">Check another file</button>
                </div>
              )}

              {result && !summary && (
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
                    <span className="text-muted-foreground">Nothing is saved until you import.</span>
                  </p>

                  {fixCount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Fix a row here, or{" "}
                      <button type="button" onClick={() => downloadFlagged(result, fileName)} className="font-medium text-primary underline-offset-4 hover:underline">
                        download the {fixCount} {fixCount === 1 ? "row" : "rows"} to fix
                      </button>{" "}
                      and upload them again.
                    </p>
                  )}

                  <Rows key={`${fileName}-${filter}`} result={result} filter={filter} onFix={fixRow} />

                  <div className="rounded-2xl border border-border bg-card p-5">
                    {suppliers ? (
                      <>
                        <button type="button" disabled aria-describedby="import-next" className={`${actionBtn} opacity-50`}>
                          Import {ready} {noun} (coming soon)
                        </button>
                        <p id="import-next" className="mt-3 max-w-xl text-sm text-muted-foreground">Importing opens soon. Ready suppliers will then be added to your supplier list.</p>
                      </>
                    ) : !signedIn ? (
                      <>
                        <Link to="/auth?next=/import" onClick={() => sheet && carryRows({ fileName: fileName ?? "sheet", ...sheet })} className={`${actionBtn} hover:opacity-90`}>
                          Sign in to import
                        </Link>
                        <p className="mt-3 max-w-xl text-sm text-muted-foreground">Your checked rows wait here while you sign in.</p>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => void save()} disabled={ready === 0 || !!saving} aria-describedby="import-next"
                          className={`${actionBtn} hover:opacity-90 disabled:opacity-50`} data-testid="import-save">
                          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Saving {saving.done} of {saving.total}</> : `Import ${ready} ${noun}`}
                        </button>
                        <p id="import-next" className="mt-3 max-w-xl text-sm text-muted-foreground">
                          Ready rows are added to your records and checked like any bill you upload. Each saved row uses one bill from your monthly allowance.
                        </p>
                      </>
                    )}
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
