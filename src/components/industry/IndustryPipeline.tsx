import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, ShieldCheck, Network, Coins, BookOpen, AlertCircle } from 'lucide-react';
import { INDUSTRY_PIPELINES, type PipelineLayer } from '@/data/industryPipeline';

const LAYERS: Array<{
  key: 'visibility' | 'verification' | 'supplyChain' | 'monetization';
  step: string;
  title: string;
  icon: typeof Eye;
  tone: string;
}> = [
  { key: 'visibility', step: '01', title: 'Visibility', icon: Eye, tone: 'text-blue-500 bg-blue-500/10' },
  { key: 'verification', step: '02', title: 'Verification', icon: ShieldCheck, tone: 'text-primary bg-primary/10' },
  { key: 'supplyChain', step: '03', title: 'Scope 3 & supply chain', icon: Network, tone: 'text-amber-500 bg-amber-500/10' },
  { key: 'monetization', step: '04', title: 'Monetization', icon: Coins, tone: 'text-success bg-success/10' },
];

const LayerBlock = ({
  step,
  title,
  icon: Icon,
  tone,
  layer,
}: {
  step: string;
  title: string;
  icon: typeof Eye;
  tone: string;
  layer: PipelineLayer;
}) => (
  <Card className="h-full">
    <CardHeader className="pb-3">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[11px] font-mono text-muted-foreground tracking-wider">{step}</div>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      <p className="text-sm text-muted-foreground leading-relaxed">{layer.summary}</p>
      <ul className="space-y-2 border-l border-border pl-4">
        {layer.points.map((p, i) => (
          <li key={i} className="text-sm leading-relaxed">
            {p}
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

const OUTCOMES: Array<{ key: 'visibility' | 'verification' | 'supplyChain' | 'monetization'; label: string; outcome: string }> = [
  { key: 'visibility', label: 'Becomes visible', outcome: 'Scope 1/2/3 split read out of documents already filed' },
  { key: 'verification', label: 'Becomes defensible', outcome: 'Each figure carries its factor, source and evidence hash' },
  { key: 'supplyChain', label: 'Becomes shareable', outcome: 'Buyer-facing Scope 3 record without exposing the invoices' },
  { key: 'monetization', label: 'Becomes usable', outcome: 'Border cost, lender KPI or credit eligibility — stated, not assumed' },
];

export const IndustryPipeline = ({ industryId }: { industryId: string }) => {
  const pipeline = INDUSTRY_PIPELINES[industryId];
  if (!pipeline) return null;

  return (
    <section className="mb-8 space-y-6">
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              What is structurally broken here
            </div>
            <p className="text-sm leading-relaxed">{pipeline.problem}</p>
          </div>
        </CardContent>
      </Card>

      {/* Outcome strip — the four layers read as outcomes before the detail. */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {OUTCOMES.map((o, i) => {
          const L = LAYERS[i];
          const Icon = L.icon;
          return (
            <div key={o.key} className="rounded-lg border bg-card p-4">
              <div className={`inline-flex p-1.5 rounded-md mb-3 ${L.tone}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="text-[11px] font-mono tracking-wider text-muted-foreground">{L.step}</div>
              <div className="text-sm font-medium">{o.label}</div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">{o.outcome}</p>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {LAYERS.map((l) => (
          <LayerBlock key={l.key} step={l.step} title={l.title} icon={l.icon} tone={l.tone} layer={pipeline[l.key]} />
        ))}
      </div>


      <Card className="bg-muted/30">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Basis for the figures referenced above</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {pipeline.references.map((r) => (
              <Badge key={r} variant="outline" className="font-normal text-xs">
                {r}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            No figure on this page is drawn from another customer's results. Emission factors come from published
            sources and every number a business sees in the product is computed from its own documents.
          </p>
        </CardContent>
      </Card>
    </section>
  );
};
