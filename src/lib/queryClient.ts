import { QueryClient } from "@tanstack/react-query";
import { onIdentityReset } from "@/lib/identity";
import { subscribeRecordsChanged } from "@/lib/recordsEvents";

// Retry only what a retry can fix: never auth, permission or validation
// errors (4xx, Postgres 42501/PGRST), at most twice for network or 5xx.
const isPermanentError = (err: unknown) => {
  const e = err as { status?: number; code?: string } | null;
  if (typeof e?.status === "number" && e.status >= 400 && e.status < 500) return true;
  return typeof e?.code === "string" && /^(42501|PGRST\d+|22\w{3}|23\w{3})$/.test(e.code);
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: (count, err) => count < 2 && !isPermanentError(err) },
  },
});

// One person's cached queries must never render for the next person on this device.
onIdentityReset(() => queryClient.clear());

/**
 * Records shared across pages (emissions, the audit ledger) live under this
 * key, so one "records changed" signal (verify, delete, upload, in this tab
 * or another) refreshes every open view and marks the rest stale.
 */
export const RECORDS_KEY = "records";
subscribeRecordsChanged(() => { void queryClient.invalidateQueries({ queryKey: [RECORDS_KEY] }); });

/** How long shared records count as fresh before a page visit refetches them in the background. */
export const RECORDS_STALE_MS = 30_000;

/** Small per-account values shown in the app chrome (business name, enterprise mode, admin role). */
export const accountKey = (userId: string | undefined, field: string) => ["account", userId ?? null, field] as const;
export const ACCOUNT_STALE_MS = 5 * 60_000;
/** Call after saving the profile so the chrome shows the new values. */
export const refreshAccount = (userId: string) => queryClient.invalidateQueries({ queryKey: ["account", userId] });
