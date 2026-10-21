import { Link } from 'react-router-dom';
import { FileSearch, Upload } from 'lucide-react';
import { useScope2Summary } from '@/hooks/useScope2';

// MRV with no emission records yet. Says what happened to what was uploaded,
// in plain words, and the one thing that fixes it.

const PLAIN: Record<string, string> = {
  missing_quantity: 'We couldn’t find how many units you used on your electricity bill, so there’s nothing to measure yet. A sharper photo of the bill, or a photo of the meter, fixes it.',
  apparent_or_reactive_energy: 'Your bill is charged in kVAh, not kWh. Upload a copy that shows the kWh or the power factor and we’ll count it.',
  single_meter_reading: 'The meter photo shows one reading. Add the previous reading, or this month’s bill, and we’ll work out what you used.',
  meter_readings_unusable: 'The readings in the meter photo don’t add up to a believable figure. A closer, straight-on photo usually solves it.',
  missing_period: 'Your bill doesn’t show a billing period, so we can’t place it in a reporting year. A full copy of the bill fixes it.',
};

export function MRVEmptyState({ documentCount }: { documentCount: number }) {
  const scope2 = useScope2Summary();
  const reason = scope2.data?.needsData?.[0]?.reason;
  const plain = reason ? PLAIN[reason] : undefined;

  if (documentCount === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card px-6 py-10 text-center">
        <Upload className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-semibold">Your carbon record starts with one bill</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Upload an electricity bill, a fuel invoice or a purchase invoice. You’ll see what it emits, line by line, with the source behind every number.</p>
        <Link to="/" className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Upload a bill</Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card px-6 py-10 text-center">
      <FileSearch className="mx-auto h-10 w-10 text-warning" aria-hidden="true" />
      <h2 className="mt-3 text-lg font-semibold">
        {documentCount === 1 ? 'We read your document. Nothing could be counted yet.' : `We read your ${documentCount} documents. Nothing could be counted yet.`}
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {plain ?? 'Each document in History says what was missing. Usually it’s a quantity the reader couldn’t see, and a clearer copy fixes it.'}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link to="/" className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Upload a clearer copy</Link>
        <Link to="/history" className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">See what was read</Link>
      </div>
    </section>
  );
}
