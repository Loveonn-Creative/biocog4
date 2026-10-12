import { useState, useSyncExternalStore } from "react";
import { loadSupabase } from "@/integrations/supabase/lazyClient";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { emitRecordsChanged } from "@/lib/recordsEvents";
import { describeGuestCounts, getPendingGuestImport, setPendingGuestImport, subscribeGuestImport } from "@/lib/guestImport";
import { forgetGuestSession } from "@/hooks/useSession";
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
  if (!pending) return null;

  const decline = () => {
    forgetGuestSession(pending.sessionId);
    setPendingGuestImport(null);
    setError(null);
  };
  const accept = async () => {
    setBusy(true); setError(null);
    try {
      const supabase = await loadSupabase();
      const { data, error: err } = await supabase.functions.invoke("merge-session", {
        body: { sessionId: pending.sessionId, deviceFingerprint: pending.deviceFingerprint, confirm: true },
      });
      if (err || !data?.success) {
        setError(err ? await getFunctionErrorMessage(err, "Could not add these uploads right now. Try again.") : "Could not add these uploads right now. Try again.");
        return;
      }
      forgetGuestSession(pending.sessionId);
      setPendingGuestImport(null);
      emitRecordsChanged("upload");
    } finally {
      setBusy(false);
    }
  };

  const what = describeGuestCounts(pending.counts);
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
          <Button variant="outline" onClick={decline} disabled={busy}>Not mine</Button>
          <Button onClick={accept} disabled={busy}>{busy ? "Adding..." : "Yes, add them"}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default GuestImportPrompt;
