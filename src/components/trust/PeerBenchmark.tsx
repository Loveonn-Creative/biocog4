import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";

interface PeerBenchmarkProps {
  totalCO2Kg: number;
  scopeBreakdown: { scope1: number; scope2: number; scope3: number };
  dominantCategory?: string;
}

// Sector benchmarks (kgCO₂e per INR 10,000 revenue) — same as verify-carbon
const SECTOR_BENCHMARKS: Record<string, { label: string; avgCO2PerUnit: number }> = {
  FUEL: { label: 'Manufacturing (Energy)', avgCO2PerUnit: 45 },
  ELECTRICITY: { label: 'Power & Utilities', avgCO2PerUnit: 35 },
  TRANSPORT: { label: 'Logistics', avgCO2PerUnit: 25 },
  RAW_MATERIAL: { label: 'Manufacturing', avgCO2PerUnit: 55 },
  WASTE: { label: 'Waste Management', avgCO2PerUnit: 15 },
};

export const PeerBenchmark = ({ totalCO2Kg, scopeBreakdown, dominantCategory }: PeerBenchmarkProps) => {
  const category = (dominantCategory || 'RAW_MATERIAL').toUpperCase();
  const benchmark = SECTOR_BENCHMARKS[category] || SECTOR_BENCHMARKS.RAW_MATERIAL;
  
  const scope1Pct = totalCO2Kg > 0 ? (scopeBreakdown.scope1 / totalCO2Kg) * 100 : 0;
  const scope2Pct = totalCO2Kg > 0 ? (scopeBreakdown.scope2 / totalCO2Kg) * 100 : 0;
  
  // Compare scope ratios against sector averages
  const sectorAvgScope1Pct = 40; // typical MSME
  const sectorAvgScope2Pct = 35;
  
  const scope1Diff = Math.round(scope1Pct - sectorAvgScope1Pct);
  const scope2Diff = Math.round(scope2Pct - sectorAvgScope2Pct);

  return (
    <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-accent" />
        Peer Benchmark — {benchmark.label} Sector
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 rounded-lg bg-background/50">
          <div className="flex items-center gap-1 mb-1">
            {scope1Diff <= 0 
              ? <TrendingDown className="h-3 w-3 text-success" /> 
              : <TrendingUp className="h-3 w-3 text-destructive" />
            }
            <span className="text-xs font-medium">Scope 1 ratio</span>
          </div>
          <p className={`text-sm font-mono font-bold ${scope1Diff <= 0 ? 'text-success' : 'text-destructive'}`}>
            {scope1Diff <= 0 ? '' : '+'}{scope1Diff}%
          </p>
          <p className="text-[10px] text-muted-foreground">
            {scope1Diff <= 0 ? 'Below' : 'Above'} sector average
          </p>
        </div>
        <div className="p-2 rounded-lg bg-background/50">
          <div className="flex items-center gap-1 mb-1">
            {scope2Diff <= 0 
              ? <TrendingDown className="h-3 w-3 text-success" /> 
              : <TrendingUp className="h-3 w-3 text-destructive" />
            }
            <span className="text-xs font-medium">Scope 2 ratio</span>
          </div>
          <p className={`text-sm font-mono font-bold ${scope2Diff <= 0 ? 'text-success' : 'text-destructive'}`}>
            {scope2Diff <= 0 ? '' : '+'}{scope2Diff}%
          </p>
          <p className="text-[10px] text-muted-foreground">
            {scope2Diff <= 0 ? 'Below' : 'Above'} sector average
          </p>
        </div>
      </div>
    </div>
  );
};
