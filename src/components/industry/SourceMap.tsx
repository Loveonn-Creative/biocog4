import { useState } from "react";
import type { IndustryData } from "@/data/industriesData";
import { SECTOR_ART, SectorDrawing } from "./SectorArt";

const SCOPES = [
  { n: 1 as const, title: "Scope 1", sub: "Fuel you burn", doc: "Fuel invoices", tone: "hsl(var(--destructive))" },
  { n: 2 as const, title: "Scope 2", sub: "Power you buy", doc: "Electricity bills", tone: "hsl(var(--primary))" },
  { n: 3 as const, title: "Scope 3", sub: "What you buy and ship", doc: "Purchase and freight invoices", tone: "hsl(38 92% 50%)" },
];

/**
 * Where a sector's emissions come from, on a drawing of its own plant. Choose
 * a scope: its marker pulses on the drawing and its sources appear, with the
 * document that proves them. One scope at a time keeps it scannable.
 */
export function SourceMap({ ind }: { ind: IndustryData }) {
  const [scope, setScope] = useState<1 | 2 | 3>(1);
  const art = SECTOR_ART[ind.id];
  const sources = scope === 1 ? ind.scope1Sources : scope === 2 ? ind.scope2Sources : ind.scope3Sources;
  const s = SCOPES[scope - 1];

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
      <div className="relative mx-auto aspect-[3/2] w-full max-w-[520px] [perspective:1200px]">
        <div className="absolute inset-0 rounded-3xl border border-border bg-card [transform:rotateX(10deg)_rotateY(-12deg)] shadow-[0_40px_70px_-50px_hsl(var(--foreground)/.5)]">
          <SectorDrawing id={ind.id} className="absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] text-foreground/70" />
          {art && SCOPES.map(sc => {
            const [x, y] = art.pins[sc.n];
            const on = sc.n === scope;
            return (
              <button key={sc.n} type="button" onClick={() => setScope(sc.n)} aria-label={`${sc.title}: ${sc.sub}`}
                style={{ left: `${x}%`, top: `${y}%`, background: sc.tone }}
                className={`absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[11px] font-semibold text-white shadow-md transition-transform duration-300 ${on ? "scale-125" : "scale-90 opacity-60 hover:opacity-100"}`}>
                {on && <span className="absolute inset-0 rounded-full motion-safe:animate-ping" style={{ background: sc.tone, opacity: 0.35 }} aria-hidden="true" />}
                <span className="relative">{sc.n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div role="tablist" aria-label="Emission scope" className="grid grid-cols-3 gap-2">
          {SCOPES.map(sc => (
            <button key={sc.n} role="tab" type="button" aria-selected={sc.n === scope} onClick={() => setScope(sc.n)}
              className={`rounded-2xl border p-3 text-left transition-all ${sc.n === scope ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/40"}`}>
              <div className="text-sm font-semibold">{sc.title}</div>
              <div className={`text-xs ${sc.n === scope ? "text-background/70" : "text-muted-foreground"}`}>{sc.sub}</div>
            </button>
          ))}
        </div>
        <div key={scope} className="mt-5 motion-safe:animate-[lm-pop_300ms_ease-out]">
          <ul className="flex flex-wrap gap-2">
            {sources.map(src => <li key={src} className="rounded-full border border-border bg-background px-3.5 py-1.5 text-sm">{src}</li>)}
          </ul>
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: s.tone }} aria-hidden="true" />
            Evidence Senseible reads: <span className="font-medium text-foreground">{s.doc}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SourceMap;
