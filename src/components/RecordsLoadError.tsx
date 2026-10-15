import { AlertTriangle } from 'lucide-react';

/**
 * Shown when stored records failed to load, so a connection problem never
 * reads as "no data" or zero totals.
 */
export function RecordsLoadError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div role="alert" className="container mx-auto mt-20 max-w-3xl px-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
        <span className="min-w-0 flex-1">Your records could not be loaded, so figures below may be missing. Nothing has changed in your account.</span>
        {onRetry && (
          <button type="button" onClick={onRetry} className="rounded-full border border-border px-3 py-1 font-medium hover:bg-secondary">Try again</button>
        )}
      </div>
    </div>
  );
}
