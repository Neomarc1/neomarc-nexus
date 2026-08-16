import { formatDateTime, titleCase } from "@/lib/format";

export type TimelineEvent = {
  occurred_at: string;
  category: string;
  event: string;
  actor?: string | null;
  detail?: string | null;
};

/** Chronological event rail — fed directly by the sale_timeline() DB function. */
export function Timeline({ events, empty = "No activity yet." }: { events: TimelineEvent[]; empty?: string }) {
  if (!events.length) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {events.map((e, i) => (
        <li key={`${e.occurred_at}-${i}`} className="relative">
          <span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {titleCase(e.category)}
            </span>
            <span className="text-sm font-medium">{e.event}</span>
          </div>
          {e.detail ? <p className="mt-1 text-sm text-muted-foreground break-words">{e.detail}</p> : null}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDateTime(e.occurred_at)}
            {e.actor ? ` · ${e.actor}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
