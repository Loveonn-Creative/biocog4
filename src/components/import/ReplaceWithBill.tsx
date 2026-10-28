import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getFunctionErrorMessage } from "@/lib/functionErrors";
import { emitRecordsChanged } from "@/lib/recordsEvents";

/**
 * A typed (imported) record is replaced by its bill: the typed row is removed
 * through the existing delete-document function (ownership checked, verified
 * records refused, removal logged), then the upload box opens so the bill is
 * read and saved as usual. Deleting does not give the read back.
 */
export function ReplaceWithBill({ documentId, label }: { documentId: string; label: string }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const replace = async () => {
    setBusy(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.functions.invoke("delete-document", { body: { documentId } });
      if (error) { toast.error(await getFunctionErrorMessage(error, "Could not remove the typed row.")); return; }
      emitRecordsChanged("delete");
      toast.success("Typed row removed. Upload the bill now.");
      navigate("/");
    } finally {
      setBusy(false);
    }
  };
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={busy} aria-label={`Replace ${label} with the bill`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Replace with the bill"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Replace with the bill?</AlertDialogTitle>
          <AlertDialogDescription>This removes the typed row. Upload the bill to add it again, read from the bill.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep</AlertDialogCancel>
          <AlertDialogAction onClick={() => void replace()}>Remove and upload</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
