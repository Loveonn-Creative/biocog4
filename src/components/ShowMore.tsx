import { ChevronDown } from 'lucide-react';

// The toggle under a list shortened by useShowMore.

export function ShowMoreButton({ hidden, all, onClick, total, noun }: { hidden: number; all: boolean; onClick: () => void; total: number; noun: string }) {
  if (hidden <= 0) return null;
  return (
    <button type="button" onClick={onClick} aria-expanded={all}
      className="mt-2 inline-flex items-center gap-1 rounded-md px-1 py-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {all ? 'Show fewer' : `Show all ${total} ${noun}`}
      <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${all ? 'rotate-180' : ''}`} aria-hidden="true" />
    </button>
  );
}
