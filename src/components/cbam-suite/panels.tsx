import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Download, FileSpreadsheet, FileText, Lock, ShieldCheck, Unlock } from 'lucide-react';
import { FUEL_FACTORS } from '../../../supabase/functions/_shared/emissionFactors';
import { INDIA_DEFAULTS } from '@/lib/cbam/official';
import { categoryForCn, type Result } from '@/lib/cbam/suite/engine';
import { GOODS_CATEGORIES } from '@/lib/cbam/suite/templateGoods';
import { IPCC_FUELS } from '@/lib/cbam/suite/fuels';
import { uid } from '@/lib/cbam/suite/sample';
import { ELEC_EF_SOURCES, type Process, type SourceStream, type Workbook, type StreamMethod } from '@/lib/cbam/suite/types';
import { CHECKS, INTERNAL_LABEL, MATERIALITY, materiality, reviewReadiness } from '@/lib/cbam/suite/verify';
import { AddButton, Field, NumInput, Pill, RemoveButton, Select, TextInput, Trail, t } from './ui';

export type Edit = (fn: (d: Workbook) => void, action?: string) => void;
type P = { w: Workbook; r: Result; edit: Edit; locked: boolean };

const FUEL_LABELS: Record<string, string> = { DIESEL: 'Diesel', PETROL: 'Petrol', CNG: 'Natural gas / CNG (by mass)', COAL: 'Coal', LPG: 'LPG', PNG: 'Piped natural gas', FURNACE_OIL: 'Furnace oil', NAPHTHA: 'Naphtha', KEROSENE: 'Kerosene', BIOMASS: 'Biomass' };
const FUELS = Object.entries(FUEL_FACTORS as Record<string, { value: number; unit: string; source: string }>).map(([k, f]) => ({ key: k, ...f }));
const IPCC_FOR: Record<string, string> = { DIESEL: 'gas_diesel_oil', PETROL: 'motor_gasoline', CNG: 'natural_gas', PNG: 'natural_gas', LPG: 'lpg', FURNACE_OIL: 'residual_fuel_oil', NAPHTHA: 'naphtha', KEROSENE: 'other_kerosene', COAL: 'other_bituminous_coal' };

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`grid gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 ${className}`}>{children}</div>
);

const issuesFor = (r: Result, ref: string) => r.issues.filter((i) => i.ref === ref && i.level !== 'note');
function Issues({ r, refKey }: { r: Result; refKey: string }) {
  const list = issuesFor(r, refKey);
  if (!list.length) return null;
  return (
    <ul className="grid gap-1 text-xs">
      {list.map((i, k) => <li key={k} className={i.level === 'error' ? 'text-destructive' : 'text-warning'}>{i.message}</li>)}
    </ul>
  );
}

// ------------------------------------------------------------------ Plant
export function PlantPanel({ w, r, edit, locked }: P) {
  const i = w.installation;
  const set = (k: keyof typeof i) => (v: string) => edit((d) => { (d.installation as unknown as Record<string, string>)[k] = v; });
  return (
    <Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Installation name (English)"><TextInput value={i.nameEn} onChange={set('nameEn')} disabled={locked} /></Field>
        <Field label="Economic activity"><TextInput value={i.economicActivity} onChange={set('economicActivity')} placeholder="Hot rolling of steel" disabled={locked} /></Field>
        <Field label="Street, number"><TextInput value={i.street} onChange={set('street')} disabled={locked} /></Field>
        <Field label="City"><TextInput value={i.city} onChange={set('city')} disabled={locked} /></Field>
        <Field label="Post code"><TextInput value={i.postcode} onChange={set('postcode')} disabled={locked} /></Field>
        <Field label="Country" hint="ISO code"><TextInput value={i.country} onChange={(v) => set('country')(v.toUpperCase().slice(0, 2))} disabled={locked} /></Field>
        <Field label="UN/LOCODE" hint="optional"><TextInput value={i.unlocode} onChange={set('unlocode')} disabled={locked} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude" hint="main source"><TextInput value={i.latitude} onChange={set('latitude')} disabled={locked} /></Field>
          <Field label="Longitude"><TextInput value={i.longitude} onChange={set('longitude')} disabled={locked} /></Field>
        </div>
        <Field label="Authorised representative"><TextInput value={i.representative} onChange={set('representative')} disabled={locked} /></Field>
        <Field label="Email"><TextInput value={i.email} onChange={set('email')} disabled={locked} /></Field>
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:max-w-md">
          <Field label="Period start"><input type="date" className="w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2 text-sm" value={i.periodStart} disabled={locked} onChange={(e) => set('periodStart')(e.target.value)} /></Field>
          <Field label="Period end"><input type="date" className="w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2 text-sm" value={i.periodEnd} disabled={locked} onChange={(e) => set('periodEnd')(e.target.value)} /></Field>
        </div>
      </div>
      <Issues r={r} refKey="installation" />
    </Card>
  );
}

// ------------------------------------------------------------------ Fuels and materials
function StreamRow({ s, w, r, edit, locked }: P & { s: SourceStream }) {
  const res = r.streams.find((x) => x.id === s.id);
  const up = (fn: (x: SourceStream) => void, action?: string) => edit((d) => { const x = d.streams.find((y) => y.id === s.id); if (x) fn(x); }, action);
  const fuel = s.fuel ? FUELS.find((f) => f.key === s.fuel) : undefined;
  const measured = s.method !== 'factor';
  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Source stream" className="min-w-[12rem] flex-1"><TextInput value={s.name} onChange={(v) => up((x) => { x.name = v; })} disabled={locked} /></Field>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Emissions</p>
          <Trail lines={[res?.formula || 'Incomplete']}><span className="font-mono text-lg font-semibold tabular-nums">{t(res?.tco2e, 1)}</span> <span className="text-xs text-muted-foreground">t CO2e</span></Trail>
        </div>
        <RemoveButton label={`Remove ${s.name}`} disabled={locked} onClick={() => edit((d) => { d.streams = d.streams.filter((y) => y.id !== s.id); }, `Removed source stream ${s.name}`)} />
      </div>

      {!measured && (
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="Fuel">
            <Select value={s.fuel ?? ''} disabled={locked} options={FUELS.map((f) => ({ value: f.key, label: FUEL_LABELS[f.key] ?? f.key }))} onChange={(k) => up((x) => { const f = FUELS.find((y) => y.key === k)!; x.fuel = k; x.adUnit = f.unit; x.factorSource = f.source; })} />
          </Field>
          <Field label="Quantity" hint={fuel ? `in ${fuel.unit}` : ''}><NumInput value={s.ad} disabled={locked} onChange={(v) => up((x) => { x.ad = v ?? NaN; })} /></Field>
          <div className="self-end pb-2 text-xs text-muted-foreground">
            {fuel && <Trail lines={[`${fuel.value} kg CO2 per ${fuel.unit}`, fuel.source]} title="Platform factor">{fuel.value} kg/{fuel.unit}</Trail>}
          </div>
        </div>
      )}

      {measured && (
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Method">
            <Select<StreamMethod> value={s.method} disabled={locked} onChange={(m) => up((x) => { x.method = m; })} options={[{ value: 'combustion', label: 'Combustion' }, { value: 'process', label: 'Process emissions' }, { value: 'mass_balance', label: 'Mass balance' }, { value: 'measured', label: 'Measured total' }]} />
          </Field>
          {s.method === 'measured' ? (
            <Field label="Measured" hint="t CO2e"><NumInput value={s.measuredTco2e} disabled={locked} onChange={(v) => up((x) => { x.measuredTco2e = v; })} /></Field>
          ) : (
            <>
              <Field label="Activity data"><NumInput value={s.ad} disabled={locked} onChange={(v) => up((x) => { x.ad = v ?? NaN; })} /></Field>
              <Field label="Unit"><Select value={s.adUnit} disabled={locked} onChange={(u) => up((x) => { x.adUnit = u; })} options={[{ value: 't', label: 't' }, { value: '1000Nm3', label: '1000 Nm3' }]} /></Field>
            </>
          )}
          {s.method === 'combustion' && <>
            <Field label="NCV" hint={`GJ/${s.adUnit}`}><NumInput value={s.ncv} disabled={locked} onChange={(v) => up((x) => { x.ncv = v; })} /></Field>
            <Field label="EF" hint="t CO2/TJ"><NumInput value={s.ef} disabled={locked} onChange={(v) => up((x) => { x.ef = v; })} /></Field>
            <Field label="Oxidation" hint="%"><NumInput value={s.oxidation === undefined ? 100 : s.oxidation * 100} disabled={locked} onChange={(v) => up((x) => { x.oxidation = v === undefined ? undefined : v / 100; })} /></Field>
          </>}
          {s.method === 'process' && <>
            <Field label="EF" hint={`t CO2/${s.adUnit}`}><NumInput value={s.ef} disabled={locked} onChange={(v) => up((x) => { x.ef = v; })} /></Field>
            <Field label="Conversion" hint="%"><NumInput value={s.conversion === undefined ? 100 : s.conversion * 100} disabled={locked} onChange={(v) => up((x) => { x.conversion = v === undefined ? undefined : v / 100; })} /></Field>
          </>}
          {s.method === 'mass_balance' && <Field label="Carbon content" hint={`t C/${s.adUnit}`}><NumInput value={s.carbonContent} disabled={locked} onChange={(v) => up((x) => { x.carbonContent = v; })} /></Field>}
          {s.method !== 'measured' && <Field label="Biomass" hint="%"><NumInput value={(s.biomass ?? 0) * 100} disabled={locked} onChange={(v) => up((x) => { x.biomass = v === undefined ? undefined : v / 100; })} /></Field>}
          <Field label="Evidence" className="sm:col-span-2"><TextInput value={s.evidence} placeholder="Lab report, calibration certificate" disabled={locked} onChange={(v) => up((x) => { x.evidence = v; x.factorSource = v ? `Plant-measured: ${v}` : x.factorSource; })} /></Field>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs">
        {!measured ? (
          <button type="button" disabled={locked} className="font-semibold text-primary hover:underline disabled:opacity-50" onClick={() => up((x) => {
            const ip = IPCC_FUELS.find((f) => f.id === IPCC_FOR[x.fuel ?? '']);
            x.method = 'combustion'; x.adUnit = 't'; x.ad = NaN; x.ncv = ip?.ncvGJperT; x.ef = ip?.efTco2PerTJ; x.oxidation = 1;
            x.factorSource = ip ? 'Plant-measured values (starting from IPCC 2006 defaults until replaced)' : 'Plant-measured values';
          }, `Switched ${s.name} to plant-measured values`)}>Use plant-measured NCV and EF</button>
        ) : (
          <button type="button" disabled={locked} className="font-semibold text-primary hover:underline disabled:opacity-50" onClick={() => up((x) => { const f = FUELS[0]; x.method = 'factor'; x.fuel = x.fuel ?? f.key; const ff = FUELS.find((y) => y.key === x.fuel)!; x.adUnit = ff.unit; x.ad = NaN; x.factorSource = ff.source; })}>Back to platform factor</button>
        )}
      </div>

      <div className="grid gap-2">
        <p className="text-xs font-medium text-muted-foreground">Split over processes</p>
        <div className="flex flex-wrap gap-2">
          {w.processes.map((p) => {
            const a = s.allocations.find((x) => x.processId === p.id);
            return (
              <label key={p.id} className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs">
                <span className="max-w-[10rem] truncate">{p.name}</span>
                <span className="w-16"><NumInput value={a ? Number((a.share * 100).toFixed(4)) : undefined} placeholder="0" disabled={locked} onChange={(v) => up((x) => {
                  x.allocations = x.allocations.filter((y) => y.processId !== p.id);
                  if (v && v > 0) x.allocations.push({ processId: p.id, share: v / 100 });
                })} /></span>%
              </label>
            );
          })}
          {!w.processes.length && <span className="text-xs text-muted-foreground">Add a process first.</span>}
        </div>
      </div>
      <Issues r={r} refKey={`stream:${s.id}`} />
    </Card>
  );
}

export function StreamsPanel(props: P & { onImport?: () => void; canImport?: boolean }) {
  const { w, edit, locked } = props;
  const addFuel = () => edit((d) => { const f = FUELS.find((x) => x.key === 'DIESEL') ?? FUELS[0]; d.streams.push({ id: uid(), name: FUEL_LABELS[f.key] ?? f.key, method: 'factor', fuel: f.key, ad: NaN, adUnit: f.unit, factorSource: f.source, allocations: d.processes.length === 1 ? [{ processId: d.processes[0].id, share: 1 }] : [] }); }, 'Added fuel');
  const addOther = () => edit((d) => { d.streams.push({ id: uid(), name: 'Process input', method: 'process', ad: NaN, adUnit: 't', factorSource: '', allocations: d.processes.length === 1 ? [{ processId: d.processes[0].id, share: 1 }] : [] }); }, 'Added material');
  return (
    <div className="grid gap-4">
      {w.streams.map((s) => <StreamRow key={s.id} {...props} s={s} />)}
      <div className="flex flex-wrap gap-2">
        <AddButton onClick={addFuel} disabled={locked}>Add fuel</AddButton>
        <AddButton onClick={addOther} disabled={locked}>Add process material or measured total</AddButton>
        {props.canImport && <AddButton onClick={props.onImport!} disabled={locked}>Import my verified records</AddButton>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Processes and goods
const CN_HINTS = INDIA_DEFAULTS.filter((d) => d.cn.length >= 6).slice(0, 400);

function ProcessCard({ p, w, r, edit, locked }: P & { p: Process }) {
  const pr = r.processes.find((x) => x.id === p.id);
  const up = (fn: (x: Process) => void, action?: string) => edit((d) => { const x = d.processes.find((y) => y.id === p.id); if (x) fn(x); }, action);
  const cat = GOODS_CATEGORIES.find((c) => c.name === p.category);
  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Production process" className="min-w-[12rem] flex-1"><TextInput value={p.name} onChange={(v) => up((x) => { x.name = v; })} disabled={locked} /></Field>
        <Field label="Aggregated goods category" className="min-w-[12rem] flex-1">
          <Select value={p.category} disabled={locked} placeholder="Choose" options={GOODS_CATEGORIES.map((c) => ({ value: c.name, label: c.name }))} onChange={(v) => up((x) => { const c = GOODS_CATEGORIES.find((y) => y.name === v)!; x.category = v; x.sector = c.sector; x.route = c.routes[0]; })} />
        </Field>
        {cat && cat.routes.length > 1 && (
          <Field label="Route" className="min-w-[10rem]"><Select value={p.route ?? ''} disabled={locked} options={cat.routes.map((x) => ({ value: x, label: x }))} onChange={(v) => up((x) => { x.route = v; })} /></Field>
        )}
        <RemoveButton label={`Remove ${p.name}`} disabled={locked} onClick={() => edit((d) => {
          d.processes = d.processes.filter((y) => y.id !== p.id);
          d.streams.forEach((s) => { s.allocations = s.allocations.filter((a) => a.processId !== p.id); });
          d.processes.forEach((y) => { y.precursors = y.precursors.filter((u) => u.fromProcessId !== p.id); });
        }, `Removed process ${p.name}`)} />
      </div>

      <div className="grid gap-2">
        {p.goods.map((g) => {
          const c = g.cn ? categoryForCn(g.cn) : null;
          return (
            <div key={g.id} className="grid items-end gap-2 sm:grid-cols-[9rem_1fr_9rem_auto]">
              <Field label="CN code"><input list="cbam-cn" className="w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm" value={g.cn} disabled={locked} onChange={(e) => up((x) => { const y = x.goods.find((z) => z.id === g.id)!; y.cn = e.target.value.replace(/[^\d ]/g, ''); })} /></Field>
              <Field label="Product name" hint={c && c !== p.category ? `(${c})` : ''}><TextInput value={g.name} disabled={locked} onChange={(v) => up((x) => { x.goods.find((z) => z.id === g.id)!.name = v; })} /></Field>
              <Field label="Produced" hint="t"><NumInput value={g.tonnes} disabled={locked} onChange={(v) => up((x) => { x.goods.find((z) => z.id === g.id)!.tonnes = v ?? NaN; })} /></Field>
              <RemoveButton label={`Remove ${g.name}`} disabled={locked} onClick={() => up((x) => { x.goods = x.goods.filter((z) => z.id !== g.id); })} />
            </div>
          );
        })}
        <div><AddButton disabled={locked} onClick={() => up((x) => { x.goods.push({ id: uid(), cn: '', name: '', tonnes: NaN }); })}>Add good</AddButton></div>
      </div>

      {pr && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
          <span>Activity level <b className="font-mono text-foreground">{t(pr.activity, 1)} t</b></span>
          {pr.consumedInternally > 0 && <span>Used inside the plant <b className="font-mono text-foreground">{t(pr.consumedInternally, 1)} t</b></span>}
          <span>Directly attributable <b className="font-mono text-foreground">{t(pr.dirEm, 1)} t CO2e</b></span>
        </div>
      )}
      <Issues r={r} refKey={`process:${p.id}`} />
    </Card>
  );
}

export function ProcessesPanel(props: P) {
  const { w, edit, locked } = props;
  return (
    <div className="grid gap-4">
      <datalist id="cbam-cn">{CN_HINTS.map((d) => <option key={d.cn} value={d.cn}>{d.description.slice(0, 80)}</option>)}</datalist>
      {w.processes.map((p) => <ProcessCard key={p.id} {...props} p={p} />)}
      <div><AddButton disabled={locked} onClick={() => edit((d) => { d.processes.push({ id: uid(), name: `Process ${d.processes.length + 1}`, category: 'Iron or steel products', sector: 'iron_steel', route: 'All production routes', goods: [{ id: uid(), cn: '', name: '', tonnes: NaN }], precursors: [], electricity: { mwh: 0, ef: null, efSource: null } }); }, 'Added process')}>Add production process</AddButton></div>
    </div>
  );
}

// ------------------------------------------------------------------ Precursors
export function PrecursorsPanel({ w, r, edit, locked }: P) {
  return (
    <div className="grid gap-4">
      {w.processes.map((p) => {
        const pr = r.processes.find((x) => x.id === p.id);
        const up = (fn: (x: Process) => void) => edit((d) => { const x = d.processes.find((y) => y.id === p.id); if (x) fn(x); });
        return (
          <Card key={p.id}>
            <p className="text-sm font-semibold">{p.name}</p>
            {p.precursors.map((u) => {
              const res = pr?.precursors.find((x) => x.id === u.id);
              const set = (fn: (x: typeof u) => void) => up((x) => { const y = x.precursors.find((z) => z.id === u.id); if (y) fn(y); });
              return (
                <div key={u.id} className="grid gap-3 rounded-xl border border-border bg-background p-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <Field label="Source" className="min-w-[10rem]">
                      <Select value={u.kind === 'own' ? 'own' : u.basis === 'default' ? 'default' : 'supplier'} disabled={locked} onChange={(v) => set((x) => { if (v === 'own') { x.kind = 'own'; } else { x.kind = 'purchased'; x.basis = v as 'supplier' | 'default'; x.country = x.country || 'IN'; } })}
                        options={[{ value: 'own', label: 'Made in this plant' }, { value: 'supplier', label: 'Bought, supplier data' }, { value: 'default', label: 'Bought, default value' }]} />
                    </Field>
                    {u.kind === 'own' ? (
                      <Field label="From process" className="min-w-[10rem] flex-1"><Select value={u.fromProcessId ?? ''} disabled={locked} placeholder="Choose" options={w.processes.filter((x) => x.id !== p.id).map((x) => ({ value: x.id, label: x.name }))} onChange={(v) => set((x) => { x.fromProcessId = v; })} /></Field>
                    ) : (
                      <>
                        <Field label="Precursor" className="min-w-[8rem] flex-1"><TextInput value={u.name} disabled={locked} onChange={(v) => set((x) => { x.name = v; })} /></Field>
                        <Field label="CN code" className="w-32"><input list="cbam-cn" className="w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm" value={u.cn ?? ''} disabled={locked} onChange={(e) => set((x) => { x.cn = e.target.value.replace(/[^\d]/g, ''); })} /></Field>
                        <Field label="Country" className="w-20"><TextInput value={u.country} disabled={locked} onChange={(v) => set((x) => { x.country = v.toUpperCase().slice(0, 2); })} /></Field>
                      </>
                    )}
                    <Field label="Used" hint="t" className="w-32"><NumInput value={u.quantity} disabled={locked} onChange={(v) => set((x) => { x.quantity = v ?? NaN; })} /></Field>
                    <RemoveButton label="Remove precursor" disabled={locked} onClick={() => up((x) => { x.precursors = x.precursors.filter((z) => z.id !== u.id); })} />
                  </div>
                  {u.kind === 'purchased' && u.basis === 'supplier' && (
                    <div className="grid gap-3 sm:grid-cols-4">
                      <Field label="SEE direct" hint="t CO2e/t"><NumInput value={u.seeDirect} disabled={locked} onChange={(v) => set((x) => { x.seeDirect = v; })} /></Field>
                      <Field label="SEE indirect" hint="t CO2e/t"><NumInput value={u.seeIndirect} disabled={locked} onChange={(v) => set((x) => { x.seeIndirect = v; })} /></Field>
                      <Field label="SEFA" hint="t CO2e/t"><NumInput value={u.sefa} disabled={locked} onChange={(v) => set((x) => { x.sefa = v; })} /></Field>
                      <Field label="Supplier report"><TextInput value={u.evidence} disabled={locked} placeholder="Verified report reference" onChange={(v) => set((x) => { x.evidence = v; })} /></Field>
                    </div>
                  )}
                  {res && (
                    <p className="text-xs text-muted-foreground">
                      <Trail lines={[res.formula]}>Embedded <b className="font-mono text-foreground">{t(res.embeddedDirect + res.embeddedIndirect, 1)} t CO2e</b></Trail>
                      {res.basis === 'default' && <span className="ml-2"><Pill tone="warn">default + mark-up</Pill></span>}
                    </p>
                  )}
                </div>
              );
            })}
            <div><AddButton disabled={locked} onClick={() => up((x) => { x.precursors.push({ id: uid(), kind: 'purchased', basis: 'supplier', name: '', cn: '', country: 'IN', quantity: NaN }); })}>Add precursor</AddButton></div>
          </Card>
        );
      })}
      {!w.processes.length && <Card><p className="text-sm text-muted-foreground">Add a process first.</p></Card>}
    </div>
  );
}

// ------------------------------------------------------------------ Electricity
export function ElectricityPanel({ w, r, edit, locked }: P) {
  return (
    <div className="grid gap-4">
      {w.processes.map((p) => {
        const pr = r.processes.find((x) => x.id === p.id);
        const set = (fn: (x: Process['electricity']) => void) => edit((d) => { const x = d.processes.find((y) => y.id === p.id); if (x) fn(x.electricity); });
        return (
          <Card key={p.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{p.name}</p>
              {pr && <Pill tone={pr.indirectCounted ? 'brand' : 'muted'}>{pr.indirectCounted ? 'Counts for CBAM' : 'Reported, not counted'}</Pill>}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr]">
              <Field label="Consumed" hint="MWh"><NumInput value={p.electricity.mwh} disabled={locked} onChange={(v) => set((x) => { x.mwh = v ?? 0; })} /></Field>
              <Field label="Emission factor" hint="t CO2/MWh"><NumInput value={p.electricity.ef} disabled={locked} onChange={(v) => set((x) => { x.ef = v ?? null; })} /></Field>
              <Field label="Factor source"><Select value={p.electricity.efSource ?? ''} disabled={locked} placeholder="Choose" options={ELEC_EF_SOURCES.map((s) => ({ value: s.code, label: `${s.code}  ${s.label}` }))} onChange={(v) => set((x) => { x.efSource = v; })} /></Field>
              <Field label="Evidence" className="sm:col-span-3"><TextInput value={p.electricity.evidence} disabled={locked} placeholder="Bill, meter export, PPA" onChange={(v) => set((x) => { x.evidence = v; })} /></Field>
            </div>
            {pr && pr.indirEm > 0 && <p className="text-xs text-muted-foreground">Indirect <b className="font-mono text-foreground">{t(pr.indirEm, 1)} t CO2e</b></p>}
            <Issues r={r} refKey={`process:${p.id}`} />
          </Card>
        );
      })}
      {!w.processes.length && <Card><p className="text-sm text-muted-foreground">Add a process first.</p></Card>}
    </div>
  );
}

// ------------------------------------------------------------------ Results
export function ResultsPanel({ r }: { r: Result }) {
  const reduce = useReducedMotion();
  const maxSee = Math.max(0.001, ...r.goods.flatMap((g) => [g.seeCounted, g.defaultSee ?? 0]));
  return (
    <div className="grid gap-4">
      {r.goods.map((g, k) => {
        const pr = r.processes.find((x) => x.id === g.processId)!;
        return (
          <motion.div key={g.goodId} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.06 }} className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">{g.name || 'Good'} <span className="font-mono text-xs text-muted-foreground">CN {g.cn}</span></p>
              <span className="text-xs text-muted-foreground">{t(g.tonnes, 0)} t produced</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">SEE direct</p>
                <Trail lines={pr.trail}><span className="font-mono text-3xl font-semibold tabular-nums">{t(g.seeDirect, 3)}</span></Trail>
                <p className="text-[11px] text-muted-foreground">t CO2e per t</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">SEE indirect {g.indirectCounted ? '' : '(not counted)'}</p>
                <span className="font-mono text-3xl font-semibold tabular-nums text-muted-foreground">{t(g.seeIndirect, 3)}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Free allocation (SEFA)</p>
                <span className="font-mono text-3xl font-semibold tabular-nums">{t(g.sefa, 3)}</span>
              </div>
            </div>
            <div className="grid gap-1.5" aria-label="Actual against default value">
              {[{ l: 'Your actual', v: g.seeCounted, c: 'bg-primary' }, { l: `Default + ${Math.round(g.markup * 100)}%`, v: g.defaultSee, c: 'bg-warning' }].map((b) => (
                <div key={b.l} className="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{b.l}</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <motion.i className={`block h-full rounded-full ${b.c}`} initial={reduce ? false : { width: 0 }} animate={{ width: `${b.v === null ? 0 : Math.max(1, (b.v / maxSee) * 100)}%` }} transition={{ duration: 0.8 }} />
                  </div>
                  <span className="text-right font-mono tabular-nums">{t(b.v, 3)}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
              <span>Certificates (estimate) <b className="font-mono text-foreground">{t(g.certificates, 0)}</b>{g.certificatesAtDefault !== null && <> vs <b className="font-mono">{t(g.certificatesAtDefault, 0)}</b> on default</>}</span>
              <span>At {g.pricePeriod} price <b className="font-mono text-foreground">€{t(g.costEur, 0)}</b></span>
            </div>
          </motion.div>
        );
      })}
      {!r.goods.length && <Card><p className="text-sm text-muted-foreground">Results appear when a process has goods and tonnes.</p></Card>}
    </div>
  );
}

// ------------------------------------------------------------------ Report
export function ReportPanel({ r, onReport, onPdf, onVerifierPack, onJson }: { r: Result; onReport: () => void; onPdf: () => void; onVerifierPack: () => void; onJson: () => void }) {
  const errors = r.issues.filter((i) => i.level === 'error');
  const warnings = r.issues.filter((i) => i.level === 'warning');
  const btn = 'inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold transition hover:border-primary/50 hover:text-primary';
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" className={btn} onClick={onReport}><FileSpreadsheet className="h-4 w-4" /> Operator emissions report (.xlsx)</button>
        <button type="button" className={btn} onClick={onPdf}><FileText className="h-4 w-4" /> Summary for importers (.pdf)</button>
        <button type="button" className={btn} onClick={onVerifierPack}><ShieldCheck className="h-4 w-4" /> Verifier pack (.xlsx)</button>
        <button type="button" className={btn} onClick={onJson}><Download className="h-4 w-4" /> Workbook file (.json)</button>
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">Data checks</p>
          <Pill tone={errors.length ? 'bad' : 'ok'}>{errors.length} errors</Pill>
          <Pill tone={warnings.length ? 'warn' : 'muted'}>{warnings.length} warnings</Pill>
        </div>
        <ul className="grid gap-1.5 text-xs">
          {[...errors, ...warnings, ...r.issues.filter((i) => i.level === 'note')].map((i, k) => (
            <li key={k} className={i.level === 'error' ? 'text-destructive' : i.level === 'warning' ? 'text-warning' : 'text-muted-foreground'}>{i.message}</li>
          ))}
          {!r.issues.length && <li className="text-success">No issues.</li>}
        </ul>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------ Verify
export function VerifyPanel({ w, r, edit, onSign, onReopen, hash }: { w: Workbook; r: Result; edit: Edit; onSign: () => void; onReopen: () => void; hash: string }) {
  const v = w.verification, iv = v.internal, ex = v.external;
  const signed = Boolean(iv.signedHash);
  const rows = useMemo(() => materiality(iv, r.processes), [iv, r.processes]);
  const errors = r.issues.filter((i) => i.level === 'error').length;
  const ready = reviewReadiness(w, rows, errors);
  const setI = (fn: (x: typeof iv) => void) => edit((d) => fn(d.verification.internal));
  const setE = (fn: (x: typeof ex) => void) => edit((d) => fn(d.verification.external));
  const [mDesc, setMDesc] = useState('');

  return (
    <div className="grid gap-4">
      <div className="inline-flex w-fit rounded-full border border-border bg-card p-1 text-sm">
        {(['senseible', 'external'] as const).map((m) => (
          <button key={m} type="button" disabled={signed} onClick={() => edit((d) => { d.verification.mode = m; }, `Verification mode: ${m}`)} className={`rounded-full px-4 py-1.5 font-semibold transition ${v.mode === m ? 'bg-foreground text-background' : 'text-muted-foreground'}`}>
            {m === 'senseible' ? 'Senseible' : 'External verifier'}
          </button>
        ))}
      </div>

      {v.mode === 'external' && (
        <Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Verifier company"><TextInput value={ex.company} disabled={signed} onChange={(x) => setE((e) => { e.company = x; })} /></Field>
            <Field label="Accreditation member state"><TextInput value={ex.accreditationState} disabled={signed} onChange={(x) => setE((e) => { e.accreditationState = x; })} /></Field>
            <Field label="National accreditation body"><TextInput value={ex.accreditationBody} disabled={signed} onChange={(x) => setE((e) => { e.accreditationBody = x; })} /></Field>
            <Field label="Accreditation number"><TextInput value={ex.registrationNumber} disabled={signed} onChange={(x) => setE((e) => { e.registrationNumber = x; })} /></Field>
            <Field label="Opinion"><Select value={ex.opinion} disabled={signed} placeholder="Choose" options={[{ value: 'verified', label: 'Verified as satisfactory' }, { value: 'verified_with_comments', label: 'Verified with comments' }, { value: 'not_verified', label: 'Not verified' }]} onChange={(x) => setE((e) => { e.opinion = x as typeof e.opinion; })} /></Field>
            <Field label="Verification report reference"><TextInput value={ex.reportReference} disabled={signed} onChange={(x) => setE((e) => { e.reportReference = x; })} /></Field>
            <Field label="Date"><input type="date" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={ex.date} disabled={signed} onChange={(e) => setE((x) => { x.date = e.target.value; })} /></Field>
          </div>
        </Card>
      )}

      <Card>
        <p className="text-sm font-semibold">Checklist</p>
        <ul className="grid gap-2">
          {CHECKS.map((c) => (
            <li key={c.id}>
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" checked={Boolean(iv.checklist[c.id])} disabled={signed} onChange={(e) => setI((x) => { x.checklist = { ...x.checklist, [c.id]: e.target.checked }; })} />
                <span><span className="mr-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{c.area}</span>{c.text}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
          <Field label="Site visit"><Select value={iv.siteVisit} disabled={signed} placeholder="Choose" options={[{ value: 'physical', label: 'Physical' }, { value: 'virtual', label: 'Virtual' }, { value: 'none', label: 'Waived' }]} onChange={(x) => setI((y) => { y.siteVisit = x as typeof y.siteVisit; })} /></Field>
          {iv.siteVisit && iv.siteVisit !== 'physical' && <Field label="Why no physical visit"><TextInput value={iv.siteVisitJustification} disabled={signed} placeholder="Physical visits in the previous periods, simple installation, evidence available remotely" onChange={(x) => setI((y) => { y.siteVisitJustification = x; })} /></Field>}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Misstatements</p>
          <span className="text-xs text-muted-foreground">Material above {MATERIALITY * 100}% of SEE per good</span>
        </div>
        {iv.misstatements.map((m) => (
          <div key={m.id} className="grid items-end gap-2 sm:grid-cols-[1.4fr_1fr_8rem_auto]">
            <Field label="Finding"><TextInput value={m.description} disabled={signed} onChange={(x) => setI((y) => { y.misstatements.find((z) => z.id === m.id)!.description = x; })} /></Field>
            <Field label="Process"><Select value={m.where} disabled={signed} options={w.processes.map((p) => ({ value: p.id, label: p.name }))} onChange={(x) => setI((y) => { y.misstatements.find((z) => z.id === m.id)!.where = x; })} /></Field>
            <Field label="Impact" hint="t CO2e"><NumInput value={m.impactTco2e} disabled={signed} onChange={(x) => setI((y) => { y.misstatements.find((z) => z.id === m.id)!.impactTco2e = x ?? 0; })} /></Field>
            <label className="flex items-center gap-2 pb-2 text-xs"><input type="checkbox" checked={m.resolved} disabled={signed} onChange={(e) => setI((y) => { y.misstatements.find((z) => z.id === m.id)!.resolved = e.target.checked; })} /> Corrected</label>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <input className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm" placeholder="Describe a finding" value={mDesc} disabled={signed} onChange={(e) => setMDesc(e.target.value)} />
          <AddButton disabled={signed || !mDesc.trim() || !w.processes.length} onClick={() => { setI((y) => { y.misstatements.push({ id: uid(), where: w.processes[0].id, description: mDesc.trim(), impactTco2e: 0, resolved: false, resolution: '' }); }); setMDesc(''); }}>Add</AddButton>
        </div>
        {rows.length > 0 && (
          <div className="grid gap-1 text-xs">
            {rows.map((x) => (
              <div key={x.processId} className="flex items-center justify-between gap-2">
                <span className="truncate">{x.name}</span>
                <span className={`font-mono ${x.material ? 'text-destructive' : 'text-muted-foreground'}`}>{Number.isFinite(x.share) ? `${(x.share * 100).toFixed(2)}%` : 'material'} of SEE</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Reviewer"><TextInput value={iv.reviewerName} disabled={signed} onChange={(x) => setI((y) => { y.reviewerName = x; })} /></Field>
          <Field label="Role"><TextInput value={iv.reviewerRole} disabled={signed} placeholder={v.mode === 'senseible' ? 'Senseible verifier' : 'Lead verifier'} onChange={(x) => setI((y) => { y.reviewerRole = x; })} /></Field>
          <Field label="Date"><input type="date" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={iv.date} disabled={signed} onChange={(e) => setI((y) => { y.date = e.target.value; })} /></Field>
        </div>
        {signed ? (
          <div className="grid gap-2 rounded-xl border border-success/40 bg-success/10 p-3 text-sm">
            <p className="flex items-center gap-2 font-semibold text-success"><Lock className="h-4 w-4" /> {v.mode === 'senseible' ? INTERNAL_LABEL : `Verified by ${ex.company || 'external verifier'}`}</p>
            <p className="break-all font-mono text-[11px] text-muted-foreground">SHA-256 {iv.signedHash}</p>
            <button type="button" onClick={onReopen} className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"><Unlock className="h-3.5 w-3.5" /> Reopen for changes</button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={!ready.ready} onClick={onSign} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition disabled:opacity-40">
              <ShieldCheck className="h-4 w-4" /> Sign off and freeze
            </button>
            {!ready.ready && <span className="text-xs text-muted-foreground">Still needed: {ready.missing.join(', ')}.</span>}
          </div>
        )}
        <p className="break-all font-mono text-[10px] text-muted-foreground">Current report SHA-256 {hash || '…'}</p>
      </Card>
    </div>
  );
}
