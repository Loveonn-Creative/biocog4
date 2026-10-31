import { useSeen } from "@/components/privacy/parts";

/*
 * Privacy by design, as a bill's journey from upload to share. A rail draws
 * down and each step is ticked off in turn, once, when the list comes into
 * view. Reduced motion shows every tick at once.
 *
 * Sources: src/lib/guestResults.ts and supabase/functions/_shared/guestScan.ts
 * (guests: no file or result kept on the server, results in the browser for
 * 24 hours); extract-document (SHA-256 per bill, private Storage);
 * drizzle/migrations/0034_enterprise_pilot.sql (request links stored only as
 * token_hash); src/pages/SupplierShare.tsx (totals only, after Share, stop any
 * time); managed Supabase infrastructure (TLS in transit, encrypted at rest;
 * /enterprise/pricing already says "Encrypted storage and transfer").
 */
const STEPS: { label: string; detail?: string }[] = [
  { label: "We never keep guest uploads", detail: "Results stay in your browser for 24 hours" },
  { label: "Every bill gets a fingerprint", detail: "SHA-256" },
  { label: "Bills stay in your account", detail: "Private storage, no public links" },
  { label: "Encrypted in transit and at rest" },
  { label: "Supplier request links stored as hashes" },
  { label: "Suppliers share totals, never bills", detail: "Only after they press Share" },
  { label: "Suppliers can stop sharing any time" },
];

const STEP_MS = 150;
const EASE = "cubic-bezier(.2,.8,.2,1)";

export const PrivacySequence = () => {
  const { ref, seen } = useSeen<HTMLOListElement>(0.25);
  return (
    <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-start">
      <div className="md:sticky md:top-24">
        <h2 className="text-3xl md:text-4xl font-semibold">Privacy by design</h2>
      </div>

      <ol ref={ref} className="relative">
        {STEPS.map((s, i) => {
          const delay = `${i * STEP_MS + 120}ms`;
          return (
            <li key={s.label} className="relative flex items-start gap-4 py-3">
              {/* The rail to the next step, drawn as this one is ticked */}
              {i < STEPS.length - 1 && (
                <span aria-hidden="true" className="absolute left-[13px] top-[26px] h-full w-px origin-top bg-primary/40"
                  style={{ transform: `scaleY(${seen ? 1 : 0})`, transition: `transform ${STEP_MS + 80}ms linear calc(${delay} + 200ms)` }} />
              )}
              <svg viewBox="0 0 28 28" className="relative h-7 w-7 shrink-0 bg-background rounded-full" aria-hidden="true">
                <circle cx="14" cy="14" r="12" fill="none" className="stroke-primary" strokeWidth="1.75" pathLength={1}
                  style={{ strokeDasharray: 1, strokeDashoffset: seen ? 0 : 1, transition: `stroke-dashoffset 360ms ${EASE} ${delay}` }} />
                <path d="M8.5 14.5 l3.5 3.5 l7.5 -8" fill="none" className="stroke-primary" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" pathLength={1}
                  style={{ strokeDasharray: 1, strokeDashoffset: seen ? 0 : 1, transition: `stroke-dashoffset 260ms ${EASE} calc(${delay} + 220ms)` }} />
              </svg>
              <div className="pt-0.5 sm:flex sm:flex-1 sm:items-baseline sm:justify-between sm:gap-4"
                style={{ opacity: seen ? 1 : 0, transition: `opacity 300ms ${EASE} ${delay}` }}>
                <span className="font-medium text-foreground">{s.label}</span>
                {s.detail && <span className="block font-mono text-xs text-muted-foreground sm:text-right">{s.detail}</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
