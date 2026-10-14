import { useState, useSyncExternalStore } from "react";
import { loadSupabase } from "@/integrations/supabase/lazyClient";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { emitRecordsChanged } from "@/lib/recordsEvents";
import { describeGuestCounts, getPendingGuestImport, setPendingGuestImport, subscribeGuestImport } from "@/lib/guestImport";
import { forgetGuestSession, useSession } from "@/hooks/useSession";
import { hasGuestData } from "@/lib/guestImport";
import { forgetLocalGuestResults, importLocalGuestResults } from "@/lib/guestImportLocal";
import { toast } from "sonner";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Asks the person who just signed in whether this device's recent guest
 * uploads are theirs. On a shared device the answer is usually no, and then
 * nothing moves.
 */
export function GuestImportPrompt() {
  const pending = useSyncExternalStore(subscribeGuestImport, getPendingGuestImport, () => null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useSession();
  if (!pending) return null;

  // Close for now; the uploads stay on this device (24 hours) and are offered again next visit.
  const later = () => { setPendingGuestImport(null); setError(null); };
  const decline = () => {
    forgetGuestSession(pending.sessionId);
    void forgetLocalGuestResults();
    setPendingGuestImport(null);
    setError(null);
  };
  const accept = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      // Older guest rows on the server move as before.
      if (hasGuestData(pending.counts)) {
        const supabase = await loadSupabase();
        const { data, error: err } = await supabase.functions.invoke("merge-session", {
          body: { sessionId: pending.sessionId, deviceFingerprint: pending.deviceFingerprint, confirm: true },
        });
        if (err || !data?.success) {
          setError(err ? await getFunctionErrorMessage(err, "Could not add these uploads right now. Try again.") : "Could not add these uploads right now. Try again.");
          return;
        }
      }
      // Browser-held results: each file is read again under this account.
      if ((pending.localInvoices ?? 0) > 0 && user) {
        const outcome = await importLocalGuestResults(user.id);
        if (outcome.stoppedAt) {
          setError(`Added ${outcome.added}. Stopped at ${outcome.stoppedAt}`);
          emitRecordsChanged("upload");
          return;
        }
        if (outcome.skipped.length) toast.warning(`Added ${outcome.added}. Not added: ${outcome.skipped.slice(0, 2).join("; ")}${outcome.skipped.length > 2 ? "…" : ""}`, { duration: 8000 });
        else toast.success(`Added ${outcome.added + outcome.alreadyThere} invoice${outcome.added + outcome.alreadyThere === 1 ? "" : "s"} to your account.`);
      }
      forgetGuestSession(pending.sessionId);
      await forgetLocalGuestResults();
      setPendingGuestImport(null);
      emitRecordsChanged("upload");
    } catch {
      setError("Could not add these uploads right now. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const what = describeGuestCounts(pending.counts, pending.localInvoices ?? 0);
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Add {what} from this device to your account?</AlertDialogTitle>
          <AlertDialogDescription>
            Someone uploaded {what} on this device without signing in, in the last 24 hours. Add them only if that was you.
            If this device is shared, choose "Not mine": they stay out of your account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <AlertDialogFooter>
          <Button variant="ghost" onClick={later} disabled={busy}>Later</Button>
          <Button variant="outline" onClick={decline} disabled={busy}>Not mine</Button>
          <Button onClick={accept} disabled={busy}>{busy ? "Adding..." : "Yes, add them"}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default GuestImportPrompt;
