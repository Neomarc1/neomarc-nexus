/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Banknote, Clock, Receipt, TriangleAlert } from "lucide-react";
import { db, type Row } from "@/lib/db";
import { PageHeader } from "@/components/layout/AppShell";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { formatDate, formatNaira, todayLagos } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/accounts/")({
  head: () => ({
    meta: [
      { title: "Accounts Workspace — NEOMARC NDOS" },
      { name: "description", content: "Verify payments, track money-in and chase overdue installments for NEOMARC Real Estate." },
      { property: "og:title", content: "Accounts Workspace — NEOMARC NDOS" },
      { property: "og:description", content: "Verify payments, track money-in and chase overdue installments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountsPage,
});

function AccountsPage() {
  const today = todayLagos();

  const { data: pending = [] } = useQuery({
    queryKey: ["accounts", "pending-payments"],
    queryFn: async () => {
      const { data, error } = await db
        .from("payments")
        .select("*, customers(full_name)")
        .eq("status", "pending")
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: verifiedToday = [] } = useQuery({
    queryKey: ["accounts", "verified-today", today],
    queryFn: async () => {
      const { data, error } = await db
        .from("payments")
        .select("amount")
        .eq("status", "verified")
        .eq("payment_date", today);
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: overdue = [] } = useQuery({
    queryKey: ["accounts", "overdue-schedule", today],
    queryFn: async () => {
      const { data, error } = await db
        .from("payment_schedule")
        .select("*, customers(full_name, phone), sales(ref)")
        .lt("due_date", today)
        .neq("status", "paid")
        .is("waived_at", null)
        .order("due_date");
      if (error) throw error;
      return data as Row[];
    },
  });

  const moneyToday = verifiedToday.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const overdueTotal = overdue.reduce(
    (s, r) => s + (Number(r.amount_due ?? 0) - Number(r.amount_paid ?? 0)),
    0,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Accounts Workspace"
        description="Money in, verified and reconciled."
        action={
          <Button asChild className="h-11">
            <Link to="/accounts/payments">Verification queue</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Awaiting verification" value={String(pending.length)} icon={Clock} />
        <StatCard label="Verified today" value={formatNaira(moneyToday)} icon={Banknote} />
        <StatCard label="Overdue receivables" value={formatNaira(overdueTotal)} icon={TriangleAlert} tone="destructive" />
      </div>

      <div className="surface-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-sm font-bold uppercase tracking-wide">Latest pending payments</p>
          <Button asChild variant="ghost" size="sm" className="h-9">
            <Link to="/accounts/payments">See all</Link>
          </Button>
        </div>
        {pending.length === 0 ? (
          <EmptyState icon={Receipt} title="Nothing awaiting verification." description="Every payment is reconciled." />
        ) : (
          <div className="space-y-2">
            {pending.slice(0, 6).map((p) => (
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
        <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Overdue installments</p>
        {overdue.length === 0 ? (
          <EmptyState icon={Receipt} title="No overdue installments." description="All schedules are current." />
        ) : (
          <div className="space-y-2">
            {overdue.slice(0, 10).map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.customers?.full_name ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.sales?.ref ?? ""} · #{r.installment_no} due {formatDate(r.due_date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={r.status} />
                  <span className="whitespace-nowrap font-display font-bold">
                    {formatNaira(Number(r.amount_due ?? 0) - Number(r.amount_paid ?? 0))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
