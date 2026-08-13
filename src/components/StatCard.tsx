import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "gold" | "success" | "warning" | "destructive" | "info";
}) {
  const toneClass = {
    default: "bg-primary/10 text-primary",
    gold: "bg-gold/20 text-gold-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/12 text-destructive",
    info: "bg-info/15 text-info",
  }[tone];

  return (
    <div className="surface-card flex items-start gap-3 p-4">
      {Icon ? (
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", toneClass)}>
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 font-display text-xl font-bold tracking-tight">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}
