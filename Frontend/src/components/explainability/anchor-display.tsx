"use client";

export function AnchorDisplay({ rule }: { rule: string }) {
  const unavailable = rule.toLowerCase().includes("unavailable") || rule.toLowerCase().includes("no stable rule");

  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Anchor Rule
      </h4>
      <div className="rounded border border-border bg-muted/30 px-3 py-2">
        {unavailable ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Anchor explanation is unavailable for this quote. The model decision is still valid;
            review SHAP factors above for feature-level impact.
          </p>
        ) : (
          <p className="font-mono text-xs leading-relaxed text-foreground/90">
            {rule}
          </p>
        )}
      </div>
    </div>
  );
}
