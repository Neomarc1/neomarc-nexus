/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db, type Row } from "@/lib/db";
import { PageHeader } from "@/components/layout/AppShell";
import { DataTable } from "@/components/CrudModule";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { formatNaira, formatDate } from "@/lib/format";
import { useCurrentUser } from "@/hooks/useAuth";
import { Banknote, Building2, Receipt } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({
    meta: [
      { title: "Customer Portal — NEOMARC NDOS" },
      { name: "description", content: "View your NEOMARC property, payment schedule, receipts and documents." },
      { property: "og:title", content: "Customer Portal — NEOMARC NDOS" },
      { property: "og:description", content: "Your property, payments, receipts and documents." },
    ],
  }),
  component: PortalPage,
});

function PortalPage() {
  const { data: me } = useCurrentUser();

  const { data, isLoading } = useQuery({
    queryKey: ["portal", me?.user.id],
    enabled: !!me?.user.id,
    queryFn: async () => {
      const { data: customers } = await db.from("customers").select("*").eq("user_id", me!.user.id);
      const customer = (customers ?? [])[0] as Row | undefined;
      if (!customer) return { customer: null, sales: [], schedule: [], payments: [], documents: [] };
      const [sales, schedule, payments, documents] = await Promise.all([
        db.from("sales").select("*").eq("customer_id", customer.id),
        db.from("payment_schedule").select("*").eq("customer_id", customer.id).order("due_date"),
        db.from("payments").select("*").eq("customer_id", customer.id).order("payment_date", { ascending: false }),
        db.from("documents").select("*").eq("customer_id", customer.id),
      ]);
      return {
        customer,
        sales: (sales.data ?? []) as Row[],
        schedule: (schedule.data ?? []) as Row[],
        payments: (payments.data ?? []) as Row[],
        documents: (documents.data ?? []) as Row[],
      };
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading your portal…</p>;

  if (!data?.customer) {
    return (
      <div className="space-y-4">
        <PageHeader title="Customer Portal" description="Your NEOMARC property dashboard." />
        <p className="text-muted-foreground">
          No customer record is linked to your account yet. Contact NEOMARC support to be linked.
        </p>
      </div>
    );
  }

  const contract = data.sales.reduce((s: number, r: Row) => s + Number(r.total_payable ?? 0), 0);
  const paid = data.payments
    .filter((p: Row) => p.status === "verified")
    .reduce((s: number, p: Row) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${data.customer.full_name}`} description="Your property, payments and documents." />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Properties" value={data.sales.length} icon={Building2} />
        <StatCard label="Contract value" value={formatNaira(contract, true)} icon={Banknote} tone="gold" />
        <StatCard label="Balance" value={formatNaira(Math.max(contract - paid, 0), true)} icon={Receipt} tone="warning" />
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide">Payment schedule</h2>
        <DataTable
          rows={data.schedule}
          empty="No instalments scheduled."
          columns={[
            { key: "label", label: "Instalment", render: (r) => r.label ?? `#${r.installment_no}` },
            { key: "due_date", label: "Due", render: (r) => formatDate(r.due_date) },
            { key: "amount_due", label: "Amount", render: (r) => formatNaira(r.amount_due) },
            { key: "amount_paid", label: "Paid", render: (r) => formatNaira(r.amount_paid) },
            { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide">Receipts</h2>
        <DataTable
          rows={data.payments}
          empty="No payments recorded yet."
          columns={[
            { key: "receipt_number", label: "Receipt" },
            { key: "payment_date", label: "Date", render: (r) => formatDate(r.payment_date) },
            { key: "amount", label: "Amount", render: (r) => formatNaira(r.amount) },
            { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide">Documents</h2>
        <DataTable
          rows={data.documents}
          empty="No documents issued yet."
          columns={[
            { key: "title", label: "Title" },
            { key: "document_type", label: "Type" },
            { key: "date_issued", label: "Issued", render: (r) => formatDate(r.date_issued) },
            { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          ]}
        />
      </section>
    </div>
  );
}
