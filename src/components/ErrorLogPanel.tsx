import { useState } from "react";
import { readPageErrors } from "@/lib/reliability/errorLog";

/** Shown only when the URL has ?diag=1: the last page errors kept on this device. */
export function ErrorLogPanel() {
  const [open, setOpen] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("diag") === "1");
  if (!open) return null;
  const list = readPageErrors();
  return (
    <div role="dialog" aria-label="Recent page errors" className="fixed inset-x-3 bottom-3 z-[100] max-h-[60vh] overflow-auto rounded-2xl border border-border bg-background p-4 text-left text-xs text-foreground shadow-2xl sm:left-auto sm:w-[28rem]">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">Recent page errors on this device</p>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-border px-2.5 py-1">Close</button>
      </div>
      {list.length === 0 ? <p className="text-muted-foreground">None recorded.</p> : (
        <ol className="grid gap-3">
          {list.map((e, i) => (
            <li key={i} className="break-words rounded-lg bg-muted/50 p-2.5 font-mono">
              <div>{e.at} · {e.path}</div>
              <div className="mt-1 font-semibold">{e.message}</div>
              {e.where && <div className="mt-1 text-muted-foreground">{e.where}</div>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
