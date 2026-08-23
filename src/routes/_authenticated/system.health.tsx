/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { useOpsThresholds, daysAheadDate, hoursAgoISO } from "@/hooks/useOpsThresholds";
import { todayLagos } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/system/health")({
  head: () => ({
    meta: [
      { title: "Workflow Health — NEOMARC NDOS" },
      {
        name: "description",
        content:
          "Live pilot monitor of leads, inspections, reservations, sales, payments, documents and allocations across NEOMARC NDOS.",
      },
      { property: "og:title", content: "Workflow Health — NEOMARC NDOS" },
      { property: "og:description", content: "Live pilot monitor of every NDOS workflow stage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireRole>
      <WorkflowHealthPage />
    </RequireRole>
  ),
});

type Metric = { label: string; value: number; to: string; tone?: "warn" | "bad" };

function WorkflowHealthPage() {
  const { data: t } = useOpsThresholds();

  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ["workflow-health", t],
    enabled: !!t,
    queryFn: async (): Promise<Metric[]> => {
      const today = todayLagos();
      const count = async (
        table: string,
        build: (q: any) => any = (q) => q,
      ): Promise<number> => {
        const { count: c } = await build(db.from(table).select("id", { count: "exact", head: true }));
        return c ?? 0;
      };

      const [
        leadsCreated,
        leadsContacted,
        leadsNoFollowup,
        inspScheduled,
        inspCompleted,
        resCreated,
        resExpiring,
        salesCreated,
        payPending,
        payVerified,
        docsPending,
        allocPending,
        readyToClose,
      ] = await Promise.all([
        count("leads"),
        count("leads", (q) => q.not("last_contact_at", "is", null)),
        count("leads", (q) =>
          q.is("next_followup_at", null).not("status", "in", "(closed_won,closed_lost)"),
        ),
        count("inspections", (q) => q.in("status", ["scheduled", "confirmed"])),
        count("inspections", (q) => q.eq("status", "completed")),
        count("reservations"),
        count("reservations", (q) =>
          q
            .eq("status", "active")
            .gte("expiry_date", today)
            .lte("expiry_date", daysAheadDate(t!.reservation_expiring_days)),
        ),
        count("sales"),
        count("payments", (q) => q.eq("status", "pending")),
        count("payments", (q) => q.eq("status", "verified")),
        count("documents", (q) => q.eq("status", "pending")),
        count("sales", (q) => q.eq("allocation_status", "pending").eq("stage", "documentation")),
        count("sales", (q) => q.eq("stage", "allocation").neq("status", "cancelled")),
      ]);

      const stalePending = await count("payments", (q) =>
        q.eq("status", "pending").lt("created_at", hoursAgoISO(t!.payment_verification_hours)),
      );

      return [
        { label: "Leads created", value: leadsCreated, to: "/leads" },
        { label: "Leads contacted", value: leadsContacted, to: "/leads" },
        {
          label: "Leads without follow-up",
          value: leadsNoFollowup,
          to: "/operations/exceptions",
          tone: leadsNoFollowup ? "warn" : undefined,
        },
        { label: "Inspections scheduled", value: inspScheduled, to: "/inspections" },
        { label: "Inspections completed", value: inspCompleted, to: "/inspections" },
        { label: "Reservations created", value: resCreated, to: "/reservations" },
        {
          label: "Reservations expiring",
          value: resExpiring,
          to: "/operations/exceptions",
          tone: resExpiring ? "warn" : undefined,
        },
        { label: "Sales created", value: salesCreated, to: "/sales" },
        {
          label: "Payments pending verification",
          value: payPending,
          to: "/accounts/payments",
          tone: payPending ? "warn" : undefined,
        },
        { label: "Payments verified", value: payVerified, to: "/payments" },
        {
          label: "Payments waiting too long",
          value: stalePending,
          to: "/operations/exceptions",
          tone: stalePending ? "bad" : undefined,
        },
        { label: "Documents pending review", value: docsPending, to: "/documentation" },
        { label: "Allocations pending", value: allocPending, to: "/documentation" },
        { label: "Sales ready to close", value: readyToClose, to: "/operations" },
      ];
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Workflow Health Monitor"
        description="Every pilot workflow stage, counted live. Tap a tile to open the records."
      />
      {isLoading ? (
        <p className="py-10 text-center text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((m) => (
            <Link
              key={m.label}
              to={m.to}
              className="surface-card flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {m.label}
                </p>
                <p
                  className={
                    "mt-1 font-display text-2xl font-bold " +
                    (m.tone === "bad"
                      ? "text-destructive"
                      : m.tone === "warn"
                        ? "text-warning-foreground"
                        : "")
                  }
                >
                  {m.value}
                </p>
              </div>
              <Activity className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
