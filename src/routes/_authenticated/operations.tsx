/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlarmClock, Banknote, Stamp, Users } from "lucide-react";
import { db, type Row } from "@/lib/db";
import { PageHeader } from "@/components/layout/AppShell";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { ContactActions } from "@/components/ContactActions";
import { Button } from "@/components/ui/button";
import { formatDate, formatNaira, todayLagos } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/operations")({
  head: () => ({
    meta: [
      { title: "Operations Command — NEOMARC NDOS" },
      { name: "description", content: "Overdue follow-ups, unverified payments and sales ready to close, in one management view." },
      { property: "og:title", content: "Operations Command — NEOMARC NDOS" },
      { property: "og:description", content: "Overdue follow-ups, unverified payments and sales ready to close." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OperationsPage,
});

function OperationsPage() {
  const today = todayLagos();

  const { data: overdueLeads = [] } = useQuery({
    queryKey: ["ops", "overdue-leads", today],
    queryFn: async () => {
      const { data, error } = await db
        .from("leads")
        .select("*, realtors(full_name)")
        .lt("next_followup_at", `${today}T00:00:00Z`)
        .not("status", "in", "(closed_won,closed_lost)")
        .order("next_followup_at");
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: pendingPayments = [] } = useQuery({
    queryKey: ["ops", "pending-payments"],
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

  const { data: readySales = [] } = useQuery({
    queryKey: ["ops", "ready-sales"],
    queryFn: async () => {
      const { data, error } = await db
        .from("sales")
        .select("*, customers(full_name), estates(name), properties(plot_number)")
        .eq("allocation_status", "allocated")
        .neq("stage", "closed")
        .order("sale_date");
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: expiring = [] } = useQuery({
    queryKey: ["ops", "expiring-reservations", today],
    queryFn: async () => {
      const { data, error } = await db
        .from("reservations")
        .select("*, customers(full_name, phone), properties(plot_number), estates(name)")
        .eq("status", "active")
        .order("expiry_date");
      if (error) throw error;
      return data as Row[];
    },
  });

  const pendingTotal = pendingPayments.reduce((s, p) => s + Number(p.amount ?? 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Operations Command" description="What is stuck today, and who must move it." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Overdue follow-ups" value={String(overdueLeads.length)} icon={AlarmClock} tone="destructive" />
        <StatCard label="Unverified money" value={formatNaira(pendingTotal)} icon={Banknote} tone="warning" />
        <StatCard label="Sales ready to close" value={String(readySales.length)} icon={Stamp} tone="success" />
        <StatCard label="Active reservations" value={String(expiring.length)} icon={Users} />
      </div>

      <div className="surface-card p-4">
        <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Overdue follow-ups</p>
        {overdueLeads.length === 0 ? (
          <EmptyState icon={AlarmClock} title="No overdue follow-ups." description="The pipeline is being worked." />
        ) : (
          <div className="space-y-2">
            {overdueLeads.slice(0, 15).map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{l.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Due {formatDate(l.next_followup_at)} · {l.realtors?.full_name ?? "Unassigned"}
                  </p>
                </div>
                <ContactActions phone={l.phone} whatsapp={l.whatsapp} name={l.full_name} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="surface-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-sm font-bold uppercase tracking-wide">Payments awaiting verification</p>
          <Button asChild size="sm" variant="ghost" className="h-9">
            <Link to="/accounts/payments">Open queue</Link>
          </Button>
        </div>
        {pendingPayments.length === 0 ? (
          <EmptyState icon={Banknote} title="All payments verified." />
        ) : (
          <div className="space-y-2">
            {pendingPayments.slice(0, 10).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.customers?.full_name ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(p.payment_date)} · {p.transaction_reference ?? p.ref}
                  </p>
                </div>
                <span className="whitespace-nowrap font-display font-bold">{formatNaira(p.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="surface-card p-4">
        <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Sales ready to close</p>
        {readySales.length === 0 ? (
          <EmptyState icon={Stamp} title="Nothing waiting on a closing decision." />
        ) : (
          <div className="space-y-2">
            {readySales.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {s.customers?.full_name} · {s.estates?.name} Plot {s.properties?.plot_number}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.ref} · {formatNaira(s.total_payable)}
                  </p>
                </div>
                <Button asChild size="sm" className="h-10">
                  <Link to="/sales/$saleId" params={{ saleId: s.id }}>
                    Review
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
