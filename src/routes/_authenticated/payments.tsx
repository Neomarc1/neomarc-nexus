import { createFileRoute } from "@tanstack/react-router";
import { CrudModule } from "@/components/CrudModule";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatNaira, formatDate, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: "Payments — NEOMARC NDOS" },
      { name: "description", content: "Record, verify and receipt NEOMARC Real Estate customer payments." },
      { property: "og:title", content: "Payments — NEOMARC NDOS" },
      { property: "og:description", content: "Record, verify and receipt NEOMARC Real Estate customer payments." },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Every naira received, verified and receipted." />
      <CrudModule
        table="payments"
        entityName="Payment"
        searchKeys={["receipt_number", "transaction_reference", "ref"]}
        defaults={{ status: "pending", method: "bank_transfer" }}
        orderBy="payment_date"
        columns={[
          { key: "receipt_number", label: "Receipt" },
          { key: "payment_date", label: "Date", render: (r) => formatDate(r.payment_date) },
          { key: "amount", label: "Amount", render: (r) => formatNaira(r.amount) },
          { key: "method", label: "Method", render: (r) => titleCase(r.method) },
          { key: "transaction_reference", label: "Txn ref" },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
        ]}
        fields={[
          { name: "customer_id", label: "Customer", type: "select", lookup: { table: "customers", labelKey: "full_name" }, required: true },
          { name: "sale_id", label: "Sale", type: "select", lookup: { table: "sales", labelKey: "ref" } },
          { name: "amount", label: "Amount (₦)", type: "number", required: true },
          { name: "payment_date", label: "Payment date", type: "date", required: true },
          { name: "method", label: "Method", type: "select", options: [{ value: "bank_transfer", label: titleCase("bank_transfer") }, { value: "cash", label: titleCase("cash") }, { value: "pos", label: titleCase("pos") }, { value: "cheque", label: titleCase("cheque") }, { value: "online", label: titleCase("online") }] },
          { name: "bank_account", label: "Bank account" },
          { name: "transaction_reference", label: "Transaction reference" },
          { name: "status", label: "Status", type: "select", options: [{ value: "pending", label: titleCase("pending") }, { value: "verified", label: titleCase("verified") }, { value: "rejected", label: titleCase("rejected") }] },
          { name: "narration", label: "Narration", type: "textarea", full: true },
        ]}
      />
    </div>
  );
}
