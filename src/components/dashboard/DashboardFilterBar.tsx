import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import {
  DEFAULT_FILTERS,
  TIME_RANGE_LABELS,
  type DashboardFilters,
  type TimeRange,
  type ScopeFilter,
  type StatusFilter,
} from '@/lib/dashboardAnalytics';

interface Props {
  filters: DashboardFilters;
  categories: string[];
  matchedCount: number;
  totalCount: number;
  onChange: (next: DashboardFilters) => void;
  /** What Reset returns to (signed-in users start on verified records). */
  defaults?: DashboardFilters;
}

const selectClass =
  'h-9 min-w-0 rounded-lg border border-border bg-card px-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring';

export const DashboardFilterBar = ({ filters, categories, matchedCount, totalCount, onChange, defaults = DEFAULT_FILTERS }: Props) => {
  const isDefault =
    filters.range === defaults.range &&
    filters.scope === defaults.scope &&
    filters.status === defaults.status &&
    filters.category === defaults.category;

  return (
    <div role="group" aria-label="Filter your emissions" className="flex flex-wrap items-center gap-2">

        <select
          aria-label="Time range"
          className={selectClass}
          value={filters.range}
          onChange={(e) => onChange({ ...filters, range: e.target.value as TimeRange })}
        >
          {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((r) => (
            <option key={r} value={r}>
              {TIME_RANGE_LABELS[r]}
            </option>
          ))}
        </select>

        <select
          aria-label="Scope"
          className={selectClass}
          value={String(filters.scope)}
          onChange={(e) =>
            onChange({
              ...filters,
              scope: e.target.value === 'all' ? 'all' : (Number(e.target.value) as ScopeFilter),
            })
          }
        >
          <option value="all">All scopes</option>
          <option value="1">Scope 1: direct</option>
          <option value="2">Scope 2: electricity</option>
          <option value="3">Scope 3: value chain</option>
        </select>

        <select
          aria-label="Verification status"
          className={selectClass}
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value as StatusFilter })}
        >
          <option value="all">Any status</option>
          <option value="verified">Verified only</option>
          <option value="unverified">Unverified only</option>
        </select>

        <select
          aria-label="Category"
          className={selectClass}
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground tabular-nums">
            {matchedCount} of {totalCount} records
          </span>
          {!isDefault && (
            <Button variant="ghost" size="sm" onClick={() => onChange(defaults)} className="gap-1">
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
    </div>
  );
};
