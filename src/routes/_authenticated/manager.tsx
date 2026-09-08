/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlarmClock, Banknote, CalendarCheck, Flame, FileText, ListTodo } from "lucide-react";
import { db, type Row } from "@/lib/db";
import { PageHeader } from "@/components/layout/AppShell";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { ContactActions } from "@/components/ContactActions";
import { StatusBadge } from "@/components/StatusBadge";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { formatDate, formatNaira, todayLagos } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/manager")({
  head: () => ({
    meta: [
      { title: "Manager Command Centre — NEOMARC NDOS" },
      { name: "description", content: "Today's tasks, hot leads, inspections, money and documentation in one mobile-first view." },
      { property: "og:title", content: "Manager Command Centre — NEOMARC NDOS" },
      { property: "og:description", content: "Run the NEOMARC sales floor from one screen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole level="staff">
      <ManagerCentre />
    </RequireRole>
  ),
});

function Section({ title, to, linkLabel, children }: { title: string; to?: string; linkLabel?: string; children: React.ReactNode }) {
  return (
    <div className="surface-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-display text-sm font-bold uppercase tracking-wide">{title}</p>
        {to ? (
          <Button asChild size="sm" variant="ghost" className="h-9">
            <Link to={to}>{linkLabel ?? "Open"}</Link>
          </Button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function ManagerCentre() {
  const today = todayLagos();

  const { data: tasks = [] } = useQuery({
    queryKey: ["mgr", "tasks", today],
    queryFn: async () => {
      const { data, error } = await db
        .from("tasks")
        .select("*, realtors:assigned_realtor_id(full_name)")
        .in("status", ["todo", "in_progress", "overdue"])
        .lte("due_date", today)
        .order("due_date");
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: hotLeads = [] } = useQuery({
    queryKey: ["mgr", "hot-leads"],
    queryFn: async () => {
      const { data, error } = await db
        .from("leads")
        .select("*, realtors(full_name)")
        .eq("temperature", "hot")
        .not("status", "in", "(closed_won,closed_lost)")
        .order("next_followup_at", { nullsFirst: false })
        .limit(15);
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ["mgr", "inspections", today],
    queryFn: async () => {
      const { data, error } = await db
        .from("inspections")
        .select("*, customers(full_name), leads(full_name), estates(name)")
        .gte("scheduled_date", today)
        .in("status", ["scheduled", "confirmed"])
        .order("scheduled_date")
        .limit(10);
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: pendingPayments = [] } = useQuery({
    queryKey: ["mgr", "pending-payments"],
    queryFn: async () => {
      const { data, error } = await db
        .from("payments")
        .select("*, customers(full_name)")
        .eq("status", "pending")
        .order("payment_date");
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: overdueSchedule = [] } = useQuery({
    queryKey: ["mgr", "overdue-schedule", today],
    queryFn: async () => {
      const { data, error } = await db
        .from("payment_schedule")
        .select("*, customers(full_name, phone, whatsapp)")
        .lt("due_date", today)
        .neq("status", "paid")
        .order("due_date")
        .limit(15);
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: docSales = [] } = useQuery({
    queryKey: ["mgr", "doc-sales"],
    queryFn: async () => {
      const { data, error } = await db
        .from("sales")
        .select("*, customers(full_name), estates(name)")
        .in("stage", ["documentation", "allocation"])
        .neq("status", "cancelled")
        .order("sale_date")
        .limit(15);
      if (error) throw error;
      return data as Row[];
    },
  });

  const pendingTotal = pendingPayments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const overdueTotal = overdueSchedule.reduce((s, r) => s + (Number(r.amount_due ?? 0) - Number(r.amount_paid ?? 0)), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Manager Command Centre" description="Everything the sales floor must move today." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tasks due today" value={String(tasks.length)} icon={ListTodo} tone="warning" />
        <StatCard label="Hot leads" value={String(hotLeads.length)} icon={Flame} tone="destructive" />
        <StatCard label="Money awaiting verification" value={formatNaira(pendingTotal)} icon={Banknote} />
        <StatCard label="Overdue instalments" value={formatNaira(overdueTotal)} icon={AlarmClock} tone="destructive" />
      </div>

      <Section title="Today's tasks" to="/automation/tasks" linkLabel="Full queue">
        {tasks.length === 0 ? (
          <EmptyState icon={ListTodo} title="Nothing due today." />
        ) : (
          <div className="space-y-2">
            {tasks.slice(0, 12).map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.realtors?.full_name ?? "Unassigned"} · Due {formatDate(t.due_date)}
                    {(t.escalation_level ?? 0) > 0 ? ` · Escalated ×${t.escalation_level}` : ""}
                  </p>
                </div>
                <StatusBadge value={t.priority} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Hot leads" to="/leads" linkLabel="All leads">
        {hotLeads.length === 0 ? (
          <EmptyState icon={Flame} title="No hot leads right now." />
        ) : (
          <div className="space-y-2">
            {hotLeads.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{l.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {l.realtors?.full_name ?? "Unassigned"} · Follow-up {formatDate(l.next_followup_at)}
                  </p>
                </div>
                <ContactActions phone={l.phone} whatsapp={l.whatsapp} name={l.full_name} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Upcoming inspections" to="/inspections">
        {inspections.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="No inspections booked." />
        ) : (
          <div className="space-y-2">
            {inspections.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{i.customers?.full_name ?? i.leads?.full_name ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(i.scheduled_date)} · {i.estates?.name ?? "—"}
                  </p>
                </div>
                <StatusBadge value={i.status} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Overdue accounts" to="/receivables">
        {overdueSchedule.length === 0 ? (
          <EmptyState icon={AlarmClock} title="No overdue instalments." />
        ) : (
          <div className="space-y-2">
            {overdueSchedule.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.customers?.full_name ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">Due {formatDate(r.due_date)}</p>
                </div>
                <span className="whitespace-nowrap font-display font-bold text-destructive">
                  {formatNaira(Number(r.amount_due ?? 0) - Number(r.amount_paid ?? 0))}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Documentation in progress" to="/documentation">
        {docSales.length === 0 ? (
          <EmptyState icon={FileText} title="Nothing in documentation." />
        ) : (
          <div className="space-y-2">
            {docSales.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.customers?.full_name ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.estates?.name ?? "—"} · {formatNaira(s.total_payable)}
                  </p>
                </div>
                <StatusBadge value={s.stage} />
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
