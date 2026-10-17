import { NOT_RECORDED, recordCalculation, type CalculationRow } from '@/lib/recordCalculation';

// One record's calculation, as stored: quantity × factor = kg, then where the
// factor and the figure came from. Used in History and Verify.
export function RecordCalculationLine({ row, cachedResult }: { row: CalculationRow; cachedResult?: unknown }) {
  const c = recordCalculation(row, cachedResult);
  return (
    <div className="text-xs text-muted-foreground">
      <p className="font-mono text-foreground/80 break-words">{c.line ?? `Calculation ${NOT_RECORDED}`}</p>
      <p className="break-words">
        Factor: {c.factorSource} · Source: {c.page} · Factor set: {c.factorSetVersion}
        {' · '}Assumptions: {c.assumptions === null ? NOT_RECORDED : c.assumptions.length ? c.assumptions.join('; ') : 'none'}
      </p>
    </div>
  );
}
