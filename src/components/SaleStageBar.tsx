import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/format";

/** Stage values mirror the sales_stage_check constraint in the database. */
export const SALE_STAGES = [
  "payment_in_progress",
  "fully_paid",
  "documentation",
  "ready_for_allocation",
  "allocated",
  "closed",
] as const;

export function SaleStageBar({ stage }: { stage?: string | null }) {
  if (stage === "cancelled") {
    return (
      <div className="surface-card border-destructive/40 p-4">
        <p className="text-sm font-medium text-destructive">This transaction is cancelled.</p>
      </div>
    );
  }

  const current = SALE_STAGES.indexOf((stage ?? "") as (typeof SALE_STAGES)[number]);

  return (
    <div className="surface-card overflow-x-auto p-4">
      <ol className="flex min-w-max items-center gap-2 sm:min-w-0 sm:flex-wrap">
        {SALE_STAGES.map((s, i) => {
          const done = current > i;
          const isCurrent = current === i;
          return (
            <li key={s} className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium",
                  done && "border-success/30 bg-success/15 text-success",
                  isCurrent && "border-primary/40 bg-primary/12 text-primary",
                  !done && !isCurrent && "border-border bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : null}
                {titleCase(s)}
              </span>
              {i < SALE_STAGES.length - 1 ? (
                <span className={cn("h-px w-4", done ? "bg-success/50" : "bg-border")} />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
