import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CUSTOM_WORK, estimateCustomScope, formatScopeRupees, scopeReviewMessage, type Complexity, type ScopeInput, type Volume, type WorkId } from '@/lib/customScopeEstimate';

const complexities: { id: Complexity; label: string; factor: string }[] = [
  { id: 'standard', label: 'Standard', factor: '×1.00' },
  { id: 'complex', label: 'Complex', factor: '×1.25' },
  { id: 'enterprise', label: 'Enterprise', factor: '×1.50' },
];
const volumes: { id: Volume; label: string }[] = [
  { id: 'normal', label: 'Usual' }, { id: 'high', label: 'High' }, { id: 'very-high', label: 'Very high' },
];

export function CustomScopeEstimator() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<ScopeInput['counts']>({});
  const [complexity, setComplexity] = useState<Complexity>('standard');
  const [entities, setEntities] = useState(1);
  const [users, setUsers] = useState(1);
  const [volume, setVolume] = useState<Volume>('normal');
  const input: ScopeInput = useMemo(() => ({ counts, complexity, entities, users, volume }), [counts, complexity, entities, users, volume]);
  const estimate = estimateCustomScope(input);

  function setCount(id: WorkId, value: number) {
    setCounts((current) => ({ ...current, [id]: value }));
  }

  function requestReview(requestInput: ScopeInput) {
    if (!estimateCustomScope(requestInput)) return;
    navigate('/contact', { state: { scopeInput: requestInput, scopeReview: scopeReviewMessage(requestInput) } });
  }

  return (
    <section aria-labelledby="custom-scope-title" className="border-y border-border bg-secondary/40 py-14 md:py-20">
      <div className="container mx-auto max-w-5xl px-4">
        <div className="max-w-2xl mb-10">
          <p className="text-sm font-medium text-primary mb-3">Outside the Scale plan</p>
          <h2 id="custom-scope-title" className="text-3xl font-semibold text-foreground mb-3">Have a different build in mind?</h2>
          <p className="text-muted-foreground">Standard integrations and existing reports are already covered by Scale. Estimate only work that needs something new, built for you.</p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
          <div className="space-y-9 min-w-0">
            <fieldset>
              <legend className="font-semibold text-lg mb-4">1. What needs building?</legend>
              <div className="grid sm:grid-cols-2 gap-3">
                {CUSTOM_WORK.map((work) => {
                  const count = counts[work.id] ?? 0;
                  return (
                    <div key={work.id} className="border border-border bg-background rounded-md p-4 min-w-0">
                      <div className="flex gap-3 items-start">
                        <Checkbox id={`scope-${work.id}`} checked={count > 0} onCheckedChange={(checked) => setCount(work.id, checked === true ? 1 : 0)} className="mt-0.5" />
                        <Label htmlFor={`scope-${work.id}`} className="leading-snug cursor-pointer text-sm font-medium">{work.label}</Label>
                      </div>
                      {count > 0 && (
                        <>
                          <div className="flex items-center gap-3 mt-4 pl-7">
                            <Label htmlFor={`count-${work.id}`} className="text-xs text-muted-foreground">{work.countLabel}</Label>
                            <Input id={`count-${work.id}`} aria-label={work.countLabel} type="number" min={1} max={10} step={1} value={count} onChange={(event) => setCount(work.id, Number(event.target.value))} className="w-20 h-9" />
                          </div>
                          <Button type="button" variant="link" className="pl-7 mt-2 h-auto text-xs whitespace-normal justify-start text-left" disabled={!estimateCustomScope({ ...input, counts: { [work.id]: count } })} onClick={() => requestReview({ ...input, counts: { [work.id]: count } })}>
                            Request Scope Review <ArrowRight className="h-3 w-3 ml-1 shrink-0" />
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">New system connections only. Existing Scale integrations and reporting formats are not counted here.</p>
            </fieldset>

            <fieldset>
              <legend className="font-semibold text-lg mb-4">2. How involved is the work?</legend>
              <div className="grid grid-cols-3 gap-2 max-w-md">
                {complexities.map((option) => (
                  <Button key={option.id} type="button" variant={complexity === option.id ? 'default' : 'outline'} aria-pressed={complexity === option.id} onClick={() => setComplexity(option.id)} className="h-auto min-h-14 flex-col gap-0 whitespace-normal text-xs sm:text-sm">
                    {option.label}<span className="text-[11px] opacity-80">{option.factor}</span>
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-5 max-w-md">
                <div className="space-y-2"><Label htmlFor="scope-entities">Business units</Label><Input id="scope-entities" type="number" min={1} max={100} step={1} value={entities} onChange={(event) => setEntities(Number(event.target.value))} /></div>
                <div className="space-y-2"><Label htmlFor="scope-users">Users</Label><Input id="scope-users" type="number" min={1} max={10000} step={1} value={users} onChange={(event) => setUsers(Number(event.target.value))} /></div>
              </div>
              <p className="text-sm font-medium mt-5 mb-2">Expected data volume</p>
              <div className="flex flex-wrap gap-2">
                {volumes.map((option) => (
                  <Button key={option.id} type="button" size="sm" variant={volume === option.id ? 'default' : 'outline'} aria-pressed={volume === option.id} onClick={() => setVolume(option.id)}>{option.label}</Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">Each extra item or higher load band adds 0.05 to the multiplier, up to ×1.80. Business units: 2–10 adds one band, 11+ adds two. Users: 21–100 adds one, 101+ adds two. Data volume: high adds one, very high adds two.</p>
            </fieldset>
          </div>

          <div className="min-w-0 lg:sticky lg:top-24 lg:self-start border-t-2 border-primary pt-6" aria-live="polite">
            {estimate ? (
              <>
                <p className="text-sm font-medium text-muted-foreground mb-3">Estimated project range</p>
                <p className="text-2xl sm:text-3xl font-semibold text-foreground break-words">{formatScopeRupees(estimate.min)} to {formatScopeRupees(estimate.max)}</p>
                <h3 className="font-semibold mt-7 mb-3">What is driving this estimate</h3>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">{estimate.drivers.map((driver) => <li key={driver}>{driver}</li>)}</ul>
                <p className="text-xs text-muted-foreground mt-6">Estimate only. Final pricing depends on confirmed scope, integrations, data volume and technical requirements. Senseible reviews every scope before agreeing a price.</p>
                <Button className="mt-6 w-full h-auto min-h-11 whitespace-normal text-left" onClick={() => requestReview(input)}>
                  Share estimate with Senseible <ArrowRight className="h-4 w-4 ml-2 shrink-0" />
                  <span className="sr-only">Request Scope Review</span>
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Review your details before sending.</p>
              </>
            ) : (
              <p className="text-muted-foreground">Choose the new work you need to see a range. All counts must be within the shown limits.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}