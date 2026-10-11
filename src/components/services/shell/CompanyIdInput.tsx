import { useEffect, useState } from "react";
import { BadgeCheck, Building2, CircleAlert } from "lucide-react";
import { checkBusinessId } from "@/lib/indiaBusinessIds";
import { SECTOR_LABEL, sectorFromCin, type SectorKey } from "@/lib/nicSectors";
import { useCompany } from "./CompanyContext";

/**
 * Optional: type a GSTIN, CIN or company PAN to personalise the answer.
 * Everything is read offline from the number itself (state, entity type,
 * listing, and for a CIN the industry code). Nothing is sent or stored.
 */
export const CompanyIdInput = ({ askSector = true }: { askSector?: boolean }) => {
  const { facts, setFacts } = useCompany();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const r = checkBusinessId(raw);
    if (r.status === "idle" || (r.type === null && r.value.length < 10)) { setError(null); return; }
    if (r.status === "invalid") { setError(r.reason ?? "Check the number."); return; }
    setError(null);
    const fromCin = r.type === "cin" ? sectorFromCin(r.value) : null;
    setFacts({
      ...facts,
      idType: r.type ?? undefined,
      state: r.facts.state,
      listed: r.facts.listed,
      holderType: r.facts.holderType ?? r.facts.companyType,
      yearIncorporated: r.facts.yearIncorporated,
      ...(fromCin ? { sector: fromCin.sector, sectorSource: "cin" as const } : {}),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  const known = !!(facts.state || facts.sector);

  return (
    <div className="space-y-2">
      <label className="relative block">
        <span className="sr-only">GSTIN, CIN or company PAN (optional)</span>
        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <input
          value={raw}
          onChange={e => setRaw(e.target.value)}
          maxLength={25}
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="GSTIN or CIN to personalise (optional)"
          aria-invalid={!!error}
          className="w-full rounded-xl border border-border bg-background pl-9 pr-9 py-2.5 text-sm font-mono uppercase tracking-wide placeholder:normal-case placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
        />
        {known && !error && <BadgeCheck className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" aria-hidden="true" />}
        {error && <CircleAlert className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" aria-hidden="true" />}
      </label>
      <div aria-live="polite" className="text-xs">
        {error && <p className="text-destructive">{error}</p>}
        {!error && known && (
          <p className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
            {facts.state && <span className="rounded-full bg-secondary px-2 py-0.5">{facts.state}</span>}
            {facts.listed !== undefined && <span className="rounded-full bg-secondary px-2 py-0.5">{facts.listed ? "Listed" : "Unlisted"}</span>}
            {facts.sector && <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5">{SECTOR_LABEL[facts.sector]}</span>}
            <span>Read from the number, nothing sent.</span>
          </p>
        )}
      </div>
      {askSector && (
        <label className="block">
          <span className="sr-only">Sector</span>
          <select
            value={facts.sector ?? ""}
            onChange={e => setFacts({ ...facts, sector: (e.target.value || undefined) as SectorKey | undefined, sectorSource: "user" })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
          >
            <option value="">Your sector</option>
            {(Object.keys(SECTOR_LABEL) as SectorKey[]).map(k => <option key={k} value={k}>{SECTOR_LABEL[k]}</option>)}
          </select>
        </label>
      )}
    </div>
  );
};
