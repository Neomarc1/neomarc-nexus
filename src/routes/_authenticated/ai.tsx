/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db, type Row } from "@/lib/db";
import { PageHeader } from "@/components/layout/AppShell";
import { formatNaira, formatDate, todayLagos } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({
    meta: [
      { title: "AI Chief of Staff — NEOMARC NDOS" },
      { name: "description", content: "Daily AI briefing on NEOMARC leads, collections, inventory and risks." },
      { property: "og:title", content: "AI Chief of Staff — NEOMARC NDOS" },
      { property: "og:description", content: "Daily briefing on leads, collections, inventory and risks." },
    ],
  }),
  component: AiPage,
});

function AiPage() {
  const today = todayLagos();
  const { data, isLoading } = useQuery({
    queryKey: ["ai-briefing"],
    queryFn: async () => {
      const [leads, schedule, properties, sales] = await Promise.all([
        db.from("leads").select("full_name, status, temperature, next_followup_at, budget"),
        db.from("payment_schedule").select("due_date, amount_due, amount_paid, status"),
        db.from("properties").select("status"),
        db.from("sales").select("total_payable, documentation_status"),
      ]);
      return {
        leads: (leads.data ?? []) as Row[],
        schedule: (schedule.data ?? []) as Row[],
        properties: (properties.data ?? []) as Row[],
        sales: (sales.data ?? []) as Row[],
      };
    },
  });

  if (isLoading || !data) return <p className="text-muted-foreground">Preparing your briefing…</p>;

  const hot = data.leads.filter((l: Row) => l.temperature === "hot");
  const dueFollowups = data.leads.filter(
    (l: Row) => l.next_followup_at && String(l.next_followup_at).slice(0, 10) <= today,
  );
  const overdue = data.schedule.filter((s: Row) => s.status !== "paid" && s.due_date < today);
  const overdueAmount = overdue.reduce((a: number, b: Row) => a + Number(b.amount_due) - Number(b.amount_paid ?? 0), 0);
  const available = data.properties.filter((p: Row) => p.status === "available").length;
  const pendingDocs = data.sales.filter((s: Row) => s.documentation_status !== "completed").length;

  const actions = [
    hot.length
      ? `Prioritise ${hot.length} hot lead${hot.length > 1 ? "s" : ""} today — highest budget is ${formatNaira(Math.max(0, ...hot.map((h: Row) => Number(h.budget ?? 0))))}.`
      : "No hot leads right now — push marketing to refill the top of the pipeline.",
    dueFollowups.length
      ? `${dueFollowups.length} follow-up${dueFollowups.length > 1 ? "s are" : " is"} due or overdue. Clear these before close of business.`
      : "All follow-ups are up to date.",
    overdue.length
      ? `Chase ${formatNaira(overdueAmount)} across ${overdue.length} overdue instalment${overdue.length > 1 ? "s" : ""}.`
      : "No overdue receivables. Collections are healthy.",
    pendingDocs
      ? `${pendingDocs} sale${pendingDocs > 1 ? "s" : ""} still awaiting documentation — allocation cannot proceed until completed.`
      : "Documentation is fully up to date.",
    available < 10
      ? `Only ${available} plots remain available. Consider releasing new inventory or raising prices.`
      : `${available} plots are available for sale across all estates.`,
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Chief of Staff"
        description={`Daily briefing for ${formatDate(today)} (Africa/Lagos).`}
      />
      <div className="surface-card space-y-4 p-6">
        <h2 className="font-display text-lg font-bold">Today's priorities</h2>
        <ol className="space-y-3">
          {actions.map((a, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span>{a}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="surface-card space-y-2 p-6">
        <h2 className="font-display text-lg font-bold">Pipeline snapshot</h2>
        <p className="text-sm text-muted-foreground">
          {data.leads.length} leads in the system · {hot.length} hot · {data.sales.length} sales ·{" "}
          {formatNaira(data.sales.reduce((a: number, b: Row) => a + Number(b.total_payable ?? 0), 0))} contracted value.
        </p>
      </div>
    </div>
  );
}
