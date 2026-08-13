import { createFileRoute } from "@tanstack/react-router";
import { CrudModule } from "@/components/CrudModule";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatNaira, formatDate, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/commissions")({
  head: () => ({
    meta: [
      { title: "Commissions — NEOMARC NDOS" },
      { name: "description", content: "Realtor commission accruals, approvals and payouts." },
      { property: "og:title", content: "Commissions — NEOMARC NDOS" },
      { property: "og:description", content: "Realtor commission accruals, approvals and payouts." },
    ],
  }),
  component: CommissionsPage,
});

function CommissionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Commissions" description="Earned, approved and paid realtor commissions." />
      <CrudModule
        table="commissions"
        entityName="Commission"
        searchKeys={["ref"]}
        defaults={{ status: "pending", amount_paid: 0 }}
        columns={[
          { key: "ref", label: "Ref" },
          { key: "sale_value", label: "Sale value", render: (r) => formatNaira(r.sale_value) },
          { key: "rate", label: "Rate", render: (r) => `${Number(r.rate ?? 0)}%` },
          { key: "amount", label: "Commission", render: (r) => formatNaira(r.amount) },
          { key: "amount_paid", label: "Paid", render: (r) => formatNaira(r.amount_paid) },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
        ]}
        fields={[
          { name: "realtor_id", label: "Realtor", type: "select", lookup: { table: "realtors", labelKey: "full_name" }, required: true },
          { name: "sale_id", label: "Sale", type: "select", lookup: { table: "sales", labelKey: "ref" } },
          { name: "sale_value", label: "Sale value (₦)", type: "number" },
          { name: "rate", label: "Rate (%)", type: "number" },
          { name: "amount", label: "Commission amount (₦)", type: "number", required: true },
          { name: "amount_paid", label: "Amount paid (₦)", type: "number" },
          { name: "status", label: "Status", type: "select", options: [{ value: "pending", label: titleCase("pending") }, { value: "approved", label: titleCase("approved") }, { value: "paid", label: titleCase("paid") }, { value: "cancelled", label: titleCase("cancelled") }] },
        ]}
      />
    </div>
  );
}
