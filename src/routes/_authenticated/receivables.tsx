/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { db, type Row } from "@/lib/db";
import { DataTable } from "@/components/CrudModule";
import { PageHeader } from "@/components/layout/AppShell";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { formatNaira, formatDate, todayLagos } from "@/lib/format";
import { Banknote, AlertTriangle, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/receivables")({
  head: () => ({
    meta: [
      { title: "Receivables & Payment Schedules — NEOMARC NDOS" },
      { name: "description", content: "Track NEOMARC Realty instalment schedules, due dates and overdue balances." },
      { property: "og:title", content: "Receivables & Payment Schedules — NEOMARC NDOS" },
      { property: "og:description", content: "Instalment schedules, due dates and overdue balances." },
    ],
  }),
  component: ReceivablesPage,
});

function ReceivablesPage() {
  const today = todayLagos();
  const [filter, setFilter] = useState<"all" | "due" | "overdue" | "paid">("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["payment_schedule", "receivables"],
    queryFn: async () => {
      const { data, error } = await db
        .from("payment_schedule")
        .select("*, customers(full_name), sales(ref)")
        .order("due_date");
      if (error) throw error;
      return data as Row[];
    },
  });

  const balance = (r: Row) => Number(r.amount_due) - Number(r.amount_paid ?? 0);
  const isOverdue = (r: Row) => r.status !== "paid" && r.due_date < today;

  const filtered = rows.filter((r: Row) => {
    if (filter === "overdue") return isOverdue(r);
    if (filter === "paid") return r.status === "paid";
    if (filter === "due") return r.status !== "paid" && r.due_date >= today;
    return true;
  });

  const totalDue = rows.filter((r: Row) => r.status !== "paid").reduce((s: number, r: Row) => s + balance(r), 0);
  const totalOverdue = rows.filter(isOverdue).reduce((s: number, r: Row) => s + balance(r), 0);
  const totalPaid = rows.reduce((s: number, r: Row) => s + Number(r.amount_paid ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Receivables" description="Instalment schedules and outstanding balances." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Outstanding" value={formatNaira(totalDue, true)} icon={Receipt} tone="warning" />
        <StatCard label="Overdue" value={formatNaira(totalOverdue, true)} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Collected" value={formatNaira(totalPaid, true)} icon={Banknote} tone="success" />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "due", "overdue", "paid"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "due" ? "Upcoming" : f === "overdue" ? "Overdue" : "Paid"}
          </Button>
        ))}
      </div>

      <DataTable
        loading={isLoading}
        rows={filtered}
        empty="No scheduled instalments yet. They are generated automatically when a sale is created with a payment plan."
        columns={[
          { key: "customer", label: "Customer", render: (r) => r.customers?.full_name ?? "—" },
          { key: "sale", label: "Sale", render: (r) => r.sales?.ref ?? "—" },
          { key: "label", label: "Instalment", render: (r) => r.label ?? `#${r.installment_no}` },
          { key: "due_date", label: "Due", render: (r) => formatDate(r.due_date) },
          { key: "amount_due", label: "Amount due", render: (r) => formatNaira(r.amount_due) },
          { key: "amount_paid", label: "Paid", render: (r) => formatNaira(r.amount_paid) },
          { key: "balance", label: "Balance", render: (r) => formatNaira(balance(r)) },
          {
            key: "status",
            label: "Status",
            render: (r) => <StatusBadge value={isOverdue(r) ? "overdue" : r.status} />,
          },
        ]}
      />
    </div>
  );
}
