import { useT } from "@/lib/i18n/useT";
import type { CapabilityStatus } from "@/data/enterpriseCapabilities";

const STYLES: Record<CapabilityStatus, string> = {
  live: "bg-primary/10 text-primary border-primary/30",
  pilot: "bg-warning/10 text-foreground border-warning/40",
  roadmap: "bg-transparent text-muted-foreground border-border",
};

/** Live, Pilot or Roadmap: shown next to every capability on /enterprise. */
export const StatusBadge = ({ status }: { status: CapabilityStatus }) => {
  const t = useT();
  const label = status === "live" ? t("ent.status.live", "Live") : status === "pilot" ? t("ent.status.pilot", "Pilot") : t("ent.status.roadmap", "Roadmap");
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${STYLES[status]}`}>
      {label}
    </span>
  );
};
