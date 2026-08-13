import { createFileRoute } from "@tanstack/react-router";
import { CrudModule } from "@/components/CrudModule";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatNaira, formatDate, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — NEOMARC NDOS" },
      { name: "description", content: "Project and estate expenditure tracking for NEOMARC Realty." },
      { property: "og:title", content: "Expenses — NEOMARC NDOS" },
      { property: "og:description", content: "Project and estate expenditure tracking for NEOMARC Realty." },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" description="Operational and project expenditure." />
      <CrudModule
        table="expenses"
        entityName="Expense"
        searchKeys={["ref", "vendor", "category"]}
        defaults={{ status: "pending" }}
        orderBy="expense_date"
        columns={[
          { key: "ref", label: "Ref" },
          { key: "expense_date", label: "Date", render: (r) => formatDate(r.expense_date) },
          { key: "category", label: "Category" },
          { key: "vendor", label: "Vendor" },
          { key: "amount", label: "Amount", render: (r) => formatNaira(r.amount) },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
        ]}
        fields={[
          { name: "category", label: "Category", type: "select", options: [{ value: "marketing", label: titleCase("marketing") }, { value: "logistics", label: titleCase("logistics") }, { value: "construction", label: titleCase("construction") }, { value: "admin", label: titleCase("admin") }, { value: "legal", label: titleCase("legal") }, { value: "commission", label: titleCase("commission") }, { value: "other", label: titleCase("other") }] },
          { name: "amount", label: "Amount (₦)", type: "number", required: true },
          { name: "expense_date", label: "Date", type: "date", required: true },
          { name: "vendor", label: "Vendor" },
          { name: "method", label: "Payment method", type: "select", options: [{ value: "bank_transfer", label: titleCase("bank_transfer") }, { value: "cash", label: titleCase("cash") }, { value: "pos", label: titleCase("pos") }, { value: "cheque", label: titleCase("cheque") }] },
          { name: "project_id", label: "Project", type: "select", lookup: { table: "projects", labelKey: "name" } },
          { name: "estate_id", label: "Estate", type: "select", lookup: { table: "estates", labelKey: "name" } },
          { name: "status", label: "Status", type: "select", options: [{ value: "pending", label: titleCase("pending") }, { value: "approved", label: titleCase("approved") }, { value: "rejected", label: titleCase("rejected") }] },
          { name: "description", label: "Description", type: "textarea", full: true },
        ]}
      />
    </div>
  );
}
