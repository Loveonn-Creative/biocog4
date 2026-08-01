import { AlertTriangle, BookOpen, CheckCircle2 } from "lucide-react";

interface Props {
  /** Engine methodology version string, e.g. "LOGISTICS-v1.0 (GLEC v3.0 / ISO 14083)" */
  methodologyVersion: string;
  /** Datasets the numbers came from */
  factorSources: string[];
  /**
   * Data-quality caveats detected from the inputs actually supplied.
   * Empty array means every value used was entered by the user.
   */
  issues?: string[];
}

/**
 * Transparency block shown under every calculator result.
 * States which method produced the number, which datasets it used, and where
 * default proxies stood in for missing user data — so a result is never
 * presented as more certain than its inputs allow.
 */
export const MethodologyPanel = ({ methodologyVersion, factorSources, issues = [] }: Props) => {
  const clean = issues.length === 0;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-start gap-2">
        {clean ? (
          <CheckCircle2 className="w-4 h-4 mt-0.5 text-success shrink-0" />
        ) : (
          <AlertTriangle className="w-4 h-4 mt-0.5 text-warning shrink-0" />
        )}
        <div className="text-sm">
          <p className="font-medium text-foreground">
            {clean ? "Computed entirely from your inputs" : "Computed with default proxies"}
          </p>
          {!clean && (
            <ul className="mt-1 list-disc list-inside space-y-0.5 text-muted-foreground">
              {issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <BookOpen className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <div>
          <p>
            <span className="text-foreground">Method:</span> {methodologyVersion}
          </p>
          <p>
            <span className="text-foreground">Factors:</span> {factorSources.join(" · ")}
          </p>
          <p className="mt-1">
            Emission factors are published averages, not measurements of your specific
            operations. Results are indicative for planning and disclosure preparation, and
            are not an audited or certified figure.
          </p>
        </div>
      </div>
    </div>
  );
};
