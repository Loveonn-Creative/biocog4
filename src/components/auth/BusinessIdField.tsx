import { useEffect, useRef, useState } from "react";
import { BadgeCheck, CircleAlert, CircleDashed, Loader2, ShieldQuestion, Building2 } from "lucide-react";
import {
  checkBusinessId, verifyBusinessIdRemote, type DerivedFacts, type BusinessIdType, type VerificationStatus,
} from "@/lib/indiaBusinessIds";

export interface BusinessIdResult {
  type: BusinessIdType | null;
  value: string;
  status: VerificationStatus;
  facts: DerivedFacts;
}

const TYPE_LABEL: Record<BusinessIdType, string> = { gstin: "GSTIN", cin: "CIN", pan: "Company PAN" };

/**
 * One field for GSTIN, CIN or company PAN. Checks the number offline the
 * moment it is complete, then asks the registry. Shows exactly one explicit
 * state, and reports derived facts upward so the form can prefill fields the
 * user has not typed into. Nothing here blocks signup: the field is optional
 * and every prefilled value stays editable.
 */
export const BusinessIdField = ({ onResult }: { onResult: (r: BusinessIdResult) => void }) => {
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<BusinessIdResult>({ type: null, value: "", status: "idle", facts: {} });
  const [reason, setReason] = useState<string | undefined>();
  const seq = useRef(0);

  useEffect(() => {
    const local = checkBusinessId(raw);
    // Wait until the number could be complete before judging it.
    const incomplete = local.type === null && local.value.length > 0 && local.value.length < 10;
    const run = ++seq.current;

    if (local.status === "idle" || incomplete) {
      const r = { type: null, value: local.value, status: "idle" as const, facts: {} };
      setResult(r); setReason(undefined); onResult(r);
      return;
    }
    if (local.status === "invalid") {
      const r = { type: local.type, value: local.value, status: "invalid" as const, facts: local.facts };
      setResult(r); setReason(local.reason); onResult(r);
      return;
    }

    setReason(undefined);
    setResult({ type: local.type, value: local.value, status: "pending", facts: local.facts });
    const timer = setTimeout(async () => {
      const remote = await verifyBusinessIdRemote(local.type!, local.value).catch(() => ({ status: "unavailable" as const }));
      if (run !== seq.current) return;
      // Registry facts win only on a verified response; otherwise keep what the number encodes.
      const facts = remote.status === "verified" ? { ...local.facts, ...(remote.facts ?? {}) } : local.facts;
      const r = { type: local.type, value: local.value, status: remote.status, facts };
      setResult(r); onResult(r);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  const { status, type, facts } = result;
  const tone =
    status === "verified" ? "border-primary ring-2 ring-primary/15"
    : status === "invalid" || status === "not_found" ? "border-destructive/60"
    : "border-border";

  return (
    <div className="space-y-2">
      <div className="relative">
        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={25}
          placeholder="GSTIN, CIN or company PAN (optional)"
          value={raw}
          onChange={e => setRaw(e.target.value)}
          aria-describedby="business-id-status"
          aria-invalid={status === "invalid" || status === "not_found"}
          className={`w-full pl-11 pr-11 py-3 rounded-xl border bg-background font-mono tracking-wide uppercase placeholder:normal-case placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${tone}`}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2" aria-hidden="true">
          {status === "pending" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          {status === "verified" && <BadgeCheck className="w-4 h-4 text-primary animate-in zoom-in-50 duration-300" />}
          {(status === "invalid" || status === "not_found") && <CircleAlert className="w-4 h-4 text-destructive" />}
          {(status === "format_ok" || status === "unavailable") && <CircleDashed className="w-4 h-4 text-foreground/70" />}
        </span>
      </div>

      {/* Exactly one explicit state, announced politely to screen readers. */}
      <div id="business-id-status" aria-live="polite" className="min-h-[1.25rem] text-xs">
        {status === "pending" && <p className="text-muted-foreground">Checking {type ? TYPE_LABEL[type] : "number"}…</p>}
        {status === "invalid" && <p className="text-destructive">Invalid. {reason}</p>}
        {status === "not_found" && <p className="text-destructive">Not found in the registry. Check the number, or continue and enter details yourself.</p>}
        {status === "verified" && <p className="text-primary">Verified with the registry.</p>}
        {status === "unavailable" && type && (
          <p className="text-muted-foreground flex items-start gap-1.5">
            <ShieldQuestion className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden="true" />
            <span>{TYPE_LABEL[type]} format checked. Registry check unavailable right now, so please confirm your details below.</span>
          </p>
        )}
      </div>

      {(status === "verified" || status === "unavailable" || status === "format_ok") && Object.keys(facts).length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl bg-secondary/50 px-4 py-3 text-xs animate-in fade-in slide-in-from-top-1 duration-300">
          {facts.state && <><dt className="text-muted-foreground">State</dt><dd>{facts.state}</dd></>}
          {facts.pan && type !== "pan" && <><dt className="text-muted-foreground">PAN</dt><dd className="font-mono">{facts.pan}</dd></>}
          {facts.holderType && <><dt className="text-muted-foreground">Entity</dt><dd>{facts.holderType}</dd></>}
          {facts.companyType && <><dt className="text-muted-foreground">Type</dt><dd>{facts.companyType}</dd></>}
          {facts.yearIncorporated && <><dt className="text-muted-foreground">Incorporated</dt><dd>{facts.yearIncorporated}</dd></>}
          {facts.listed !== undefined && <><dt className="text-muted-foreground">Listing</dt><dd>{facts.listed ? "Listed" : "Unlisted"}</dd></>}
          <dd className="col-span-2 pt-1 text-muted-foreground">
            {status === "verified" ? "From the registry." : "Read from the number itself, not from a registry."}
          </dd>
        </dl>
      )}
    </div>
  );
};
