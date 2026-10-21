import { Link } from 'react-router-dom';
import { FileSearch, Upload } from 'lucide-react';
import { useScope2Summary } from '@/hooks/useScope2';

// MRV with no emission records yet. Says what happened to what was uploaded,
// in plain words, and the one thing that fixes it.

const PLAIN: Record<string, string> = {
  missing_quantity: 'No units found on your bill. A sharper photo, or one of the meter, fixes it.',
  apparent_or_reactive_energy: 'Your bill is in kVAh. Upload a copy that shows kWh or the power factor.',
  single_meter_reading: 'One meter reading isn’t enough. Add the previous reading or this month’s bill.',
  meter_readings_unusable: 'The meter readings don’t add up. Try a closer, straight-on photo.',
  missing_period: 'No billing period on the bill. Upload the full bill.',
};

export function MRVEmptyState({ documentCount }: { documentCount: number }) {
  const scope2 = useScope2Summary();
  const reason = scope2.data?.needsData?.[0]?.reason;
  const plain = reason ? PLAIN[reason] : undefined;

  if (documentCount === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card px-6 py-10 text-center">
        <Upload className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-semibold">Start with one bill</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Electricity, fuel or purchase. See what it emits, line by line.</p>
        <Link to="/" className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Upload a bill</Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card px-6 py-10 text-center">
      <FileSearch className="mx-auto h-10 w-10 text-warning" aria-hidden="true" />
      <h2 className="mt-3 text-lg font-semibold">
        {documentCount === 1 ? 'Read, but nothing to count yet' : `${documentCount} documents read, nothing to count yet`}
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {plain ?? 'History shows what’s missing. A clearer copy usually fixes it.'}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link to="/" className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Upload clearer copy</Link>
        <Link to="/history" className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">See what was read</Link>
      </div>
    </section>
  );
}
