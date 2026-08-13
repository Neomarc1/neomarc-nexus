import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/format";

const TONES: Record<string, string> = {
  available: "bg-success/15 text-success border-success/30",
  verified: "bg-success/15 text-success border-success/30",
  paid: "bg-success/15 text-success border-success/30",
  approved: "bg-success/15 text-success border-success/30",
  completed: "bg-success/15 text-success border-success/30",
  closed_won: "bg-success/15 text-success border-success/30",
  active: "bg-success/15 text-success border-success/30",
  hot: "bg-destructive/12 text-destructive border-destructive/30",
  overdue: "bg-destructive/12 text-destructive border-destructive/30",
  failed: "bg-destructive/12 text-destructive border-destructive/30",
  cancelled: "bg-destructive/12 text-destructive border-destructive/30",
  closed_lost: "bg-destructive/12 text-destructive border-destructive/30",
  blocked: "bg-destructive/12 text-destructive border-destructive/30",
  reserved: "bg-warning/20 text-warning-foreground border-warning/40",
  pending: "bg-warning/20 text-warning-foreground border-warning/40",
  partial: "bg-warning/20 text-warning-foreground border-warning/40",
  warm: "bg-warning/20 text-warning-foreground border-warning/40",
  on_hold: "bg-warning/20 text-warning-foreground border-warning/40",
  sold: "bg-primary/12 text-primary border-primary/30",
  allocated: "bg-primary/12 text-primary border-primary/30",
  scheduled: "bg-info/15 text-info border-info/30",
  cold: "bg-info/15 text-info border-info/30",
};

export function StatusBadge({ value, className }: { value?: string | null; className?: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const tone = TONES[value] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      {titleCase(value)}
    </span>
  );
}
