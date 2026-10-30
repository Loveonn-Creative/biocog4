import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CopyButton, Choice } from "@/components/lead/LeadKit";
import { leadEvents } from "@/components/lead/leadEvents";
import type { QuickFuel } from "@/lib/calculators/quickCarbon";
import { downloadSendablePdf, downloadText } from "@/lib/leadMagnets/sendableFile";
import {
  FILE_YEARS, FY_MONTHS, OTHER_FUELS, hasFigures, supplierEmissions, supplierEmissionsCsv, supplierEmissionsFile, supplierFileName, tonnes,
  type Basis, type SupplierFileInput,
} from "@/lib/leadMagnets/supplierEmissionsFile";

// The supplier's file: what an MSME types from its own bills becomes one page
// for its buyer. The paper on the right is the file, filling in as they type.

const PAGE = "supplier_evidence";

/** Financial year (start year) and month index (0 = April) of the last full month before `d`. */
function lastFullMonth(d: Date) {
  const m = d.getMonth(); // 0 = January
  const prev = m === 0 ? 11 : m - 1;
  const year = m === 0 ? d.getFullYear() - 1 : d.getFullYear();
  return { fy: prev >= 3 ? year : year - 1, idx: (prev + 9) % 12 };
}

const num = (s: string): number | null => {
  const t = s.replace(/,/g, "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 1e9) : null;
};

const inputCls = "h-12 w-full rounded-xl border border-input bg-background px-4 text-lg tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const selectCls = "h-12 w-full rounded-xl border border-input bg-background px-3 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const Held = ({ id, checked, onChange }: { id: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label htmlFor={id} className="mt-2 flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground">
    <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
    I have the bill for every month
  </label>
);

export function SupplierEmissionsTool() {
  const last = useMemo(() => lastFullMonth(new Date()), []);
  const years = FILE_YEARS.filter((y) => y <= last.fy);
  const [fy, setFy] = useState<number>(years.includes(2025) ? 2025 : years[0]);
  const maxIdx = fy === last.fy ? last.idx : 11;
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(11);
  const [basis, setBasis] = useState<Basis>("total");
  const [kwh, setKwh] = useState("");
  const [diesel, setDiesel] = useState("");
  const [otherFuel, setOtherFuel] = useState<QuickFuel | "">("");
  const [otherUnit, setOtherUnit] = useState("");
  const [otherQty, setOtherQty] = useState("");
  const [held, setHeld] = useState({ electricity: false, diesel: false, other: false });
  const [company, setCompany] = useState("");
  const [buyer, setBuyer] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const engaged = useRef(false);

  // Keep the months inside the chosen year, and never in the future.
  useEffect(() => { setTo((t) => Math.min(t, maxIdx)); setFrom((f) => Math.min(f, maxIdx)); }, [maxIdx]);
  const fuel = OTHER_FUELS.find((f) => f.id === otherFuel);

  const input: SupplierFileInput = {
    fy, from, to: Math.max(from, to), basis,
    kwh: num(kwh), diesel: num(diesel),
    other: fuel ? { fuel: fuel.id, unit: otherUnit || fuel.units[0].id, qty: num(otherQty) } : null,
    billsHeld: held, company, buyer,
  };
  const r = supplierEmissions(input);
  const ready = hasFigures(r);
  const months = r.months;
  const touch = () => { if (!engaged.current) { engaged.current = true; leadEvents.engage(PAGE); } };

  const pdf = async () => {
    if (!ready) return;
    setBusy(true); setFailed(false);
    try { await downloadSendablePdf(supplierEmissionsFile(input), supplierFileName("pdf")); leadEvents.cta(PAGE, "supplier_file_pdf"); }
    catch { setFailed(true); }
    finally { setBusy(false); }
  };
  const csv = () => {
    if (!ready) return;
    setFailed(false);
    try { downloadText(supplierEmissionsCsv(input), supplierFileName("csv"), "text/csv;charset=utf-8"); leadEvents.cta(PAGE, "supplier_file_csv"); }
    catch { setFailed(true); }
  };

  const monthOpts = FY_MONTHS.map((m, i) => ({ m, i })).filter((x) => x.i <= maxIdx);
  const per = basis === "month" ? " a month" : "";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12" onPointerDown={touch} onKeyDown={touch}>
      {/* What they type */}
      <div className="space-y-6">
        <fieldset>
          <legend className="text-sm font-medium">Period</legend>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <label className="block"><span className="sr-only">Financial year</span>
              <select value={fy} onChange={(e) => setFy(Number(e.target.value))} className={selectCls}>
                {years.map((y) => <option key={y} value={y}>FY {y}-{String(y + 1).slice(-2)}</option>)}
              </select>
            </label>
            <label className="block"><span className="sr-only">From</span>
              <select value={from} onChange={(e) => { const v = Number(e.target.value); setFrom(v); setTo((t) => Math.max(t, v)); }} className={selectCls}>
                {monthOpts.map(({ m, i }) => <option key={m} value={i}>From {m.slice(0, 3)}</option>)}
              </select>
            </label>
            <label className="block"><span className="sr-only">To</span>
              <select value={Math.max(from, to)} onChange={(e) => setTo(Number(e.target.value))} className={selectCls}>
                {monthOpts.filter(({ i }) => i >= from).map(({ m, i }) => <option key={m} value={i}>To {m.slice(0, 3)}</option>)}
              </select>
            </label>
          </div>
        </fieldset>

        <div>
          <p className="text-sm font-medium" id="sf-basis">The numbers below are</p>
          <div className="mt-2">
            <Choice<Basis> name="The numbers below are" value={basis} onChange={setBasis}
              options={[{ id: "total", label: `Totals for ${months} ${months === 1 ? "month" : "months"}` }, { id: "month", label: "One typical month" }]} />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="sf-kwh" className="block text-sm font-medium">Electricity, kWh{per}</label>
            <p className="mt-0.5 text-[13px] text-muted-foreground">The units line on the bill, not kVAh</p>
            <input id="sf-kwh" inputMode="decimal" value={kwh} onChange={(e) => setKwh(e.target.value)} placeholder="48000" className={`mt-2 ${inputCls}`} />
            <Held id="sf-held-e" checked={held.electricity} onChange={(v) => setHeld((h) => ({ ...h, electricity: v }))} />
          </div>
          <div>
            <label htmlFor="sf-diesel" className="block text-sm font-medium">Diesel, litres{per}</label>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Generators and own vehicles. 0 if none</p>
            <input id="sf-diesel" inputMode="decimal" value={diesel} onChange={(e) => setDiesel(e.target.value)} placeholder="1200" className={`mt-2 ${inputCls}`} />
            <Held id="sf-held-d" checked={held.diesel} onChange={(v) => setHeld((h) => ({ ...h, diesel: v }))} />
          </div>
        </div>

        <div>
          <label htmlFor="sf-fuel" className="block text-sm font-medium">Another fuel <span className="font-normal text-muted-foreground">(if any)</span></label>
          <div className="mt-2 grid grid-cols-[1.2fr_1fr] gap-3 sm:grid-cols-[1fr_1fr_1fr]">
            <select id="sf-fuel" value={otherFuel} onChange={(e) => { setOtherFuel(e.target.value as QuickFuel | ""); setOtherUnit(""); }} className={selectCls}>
              <option value="">None</option>
              {OTHER_FUELS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {fuel && (
              <>
                <input aria-label={`${fuel.name} quantity${per}`} inputMode="decimal" value={otherQty} onChange={(e) => setOtherQty(e.target.value)} className={inputCls} />
                <select aria-label="Unit" value={otherUnit || fuel.units[0].id} onChange={(e) => setOtherUnit(e.target.value)} className={`col-span-2 sm:col-span-1 ${selectCls}`}>
                  {fuel.units.map((u) => <option key={u.id} value={u.id}>{u.label}{per}</option>)}
                </select>
              </>
            )}
          </div>
          {fuel && <Held id="sf-held-o" checked={held.other} onChange={(v) => setHeld((h) => ({ ...h, other: v }))} />}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Your company <span className="font-normal text-muted-foreground">(optional)</span></span>
            <input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={80} autoComplete="organization" className={`mt-2 ${inputCls} text-[15px]`} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Your buyer <span className="font-normal text-muted-foreground">(optional)</span></span>
            <input value={buyer} onChange={(e) => setBuyer(e.target.value)} maxLength={80} autoComplete="off" className={`mt-2 ${inputCls} text-[15px]`} />
          </label>
        </div>
      </div>

      {/* The file itself, filling in */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-[0_30px_60px_-45px_hsl(var(--foreground)/.45)]" aria-live="polite">
          <div className="bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground">Scope 1 and 2 emissions</div>
          <div className="space-y-3 px-5 py-4 text-[13px] leading-relaxed">
            <div className="text-muted-foreground">
              <div><b className="text-foreground">To:</b> The sustainability and procurement team{buyer.trim() ? `, ${buyer.trim()}` : ""}</div>
              {company.trim() && <div><b className="text-foreground">From:</b> {company.trim()}</div>}
              <div className="mt-1 font-medium text-foreground">Our Scope 1 and Scope 2 emissions for {r.period}.</div>
            </div>
            <dl className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border">
              {[
                { k: "Scope 1", v: r.scope1Kg },
                { k: "Scope 2", v: r.scope2Kg },
                { k: "Total", v: ready ? r.totalKg : null },
              ].map((x) => (
                <div key={x.k} className="p-3">
                  <dt className="text-[12px] text-muted-foreground">{x.k}</dt>
                  <dd className={`mt-0.5 text-xl font-semibold tabular-nums transition-colors duration-300 ${x.v === null ? "text-muted-foreground/40" : ""}`}>
                    {x.v === null ? "0" : tonnes(x.v)}<span className="ml-1 text-[12px] font-normal text-muted-foreground">t</span>
                  </dd>
                </div>
              ))}
            </dl>
            <ol className="divide-y divide-border border-y border-border">
              {r.rows.length === 0 && <li className="py-3 text-muted-foreground">Type the units from your bills. Each one becomes a line here.</li>}
              {r.rows.map((x) => (
                <li key={x.key} className="grid grid-cols-[1fr_auto] gap-x-3 py-2.5 animate-[lm-pop_350ms_ease-out_both] motion-reduce:animate-none">
                  <span className="font-medium">{x.source} <span className="font-normal text-muted-foreground">· Scope {x.scope}</span></span>
                  <span className="text-right font-medium tabular-nums">{Math.round(x.kg).toLocaleString("en-IN")} kg</span>
                  <span className="text-muted-foreground tabular-nums">{x.qty.toLocaleString("en-IN", { maximumFractionDigits: 2 })} {x.unit} × {x.factor}</span>
                  <span className={`text-right ${x.billsHeld ? "text-primary" : "text-muted-foreground"}`}>{x.billsHeld ? "Bills held" : "Self-declared"}</span>
                </li>
              ))}
            </ol>
            <p className="text-muted-foreground">Then the factor sources, the method, and a line saying these come from your own bills and have not been checked by a third party.</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={pdf} disabled={!ready || busy}
            className="h-12 rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground transition-transform hover:-translate-y-px disabled:opacity-50 disabled:hover:translate-y-0">
            {busy ? "Making the file" : "Download the PDF"}
          </button>
          <button type="button" onClick={csv} disabled={!ready}
            className="h-12 rounded-full border border-border px-5 text-[15px] font-medium hover:bg-secondary disabled:opacity-50">
            Or as CSV
          </button>
        </div>
        <p className="mt-3 text-[13px] text-muted-foreground" aria-live="polite">
          {failed ? "The file did not download. Try again." : ready ? "One page for your buyer. Made on this device; nothing is sent." : "Type at least one number from a bill to make the file."}
        </p>
        <p className="mt-5 border-t border-border pt-4 text-[14px] text-muted-foreground">
          Asked again next quarter? Senseible reads each bill and keeps the figure tied to it. <Link to="/" onClick={() => leadEvents.cta(PAGE, "supplier_file_read_bill")} className="font-medium text-primary underline-offset-4 hover:underline">Read a bill free →</Link>
        </p>
      </div>
    </div>
  );
}

/** For buyers: the link to hand suppliers, so every reply arrives in the same format. */
export function SupplierToolLink() {
  return <CopyButton text="https://senseible.earth/scope-3-supplier-evidence#supplier-file" label="Copy the link for suppliers" onCopy={() => leadEvents.cta(PAGE, "copy_supplier_link")} />;
}
