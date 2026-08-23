import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CrudModule } from "@/components/CrudModule";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatNaira, formatDate, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/sales/")({
  head: () => ({
    meta: [
      { title: "Sales — NEOMARC NDOS" },
      { name: "description", content: "Executed NEOMARC Realty sales, documentation and allocation status." },
      { property: "og:title", content: "Sales — NEOMARC NDOS" },
      { property: "og:description", content: "Executed NEOMARC Realty sales, documentation and allocation status." },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <PageHeader title="Sales" description="Subscriptions, contracts, documentation and allocation." />
      <CrudModule
        table="sales"
        onRowClick={(row) => navigate({ to: "/sales/$saleId", params: { saleId: row.id } })}
        entityName="Sale"
        searchKeys={["ref", "sales_officer"]}
        defaults={{ status: "active", documentation_status: "pending", allocation_status: "pending", discount: 0 }}
        columns={[
          { key: "ref", label: "Ref" },
          { key: "sale_date", label: "Date", render: (r) => formatDate(r.sale_date) },
          { key: "price", label: "Price", render: (r) => formatNaira(r.price) },
          { key: "discount", label: "Discount", render: (r) => formatNaira(r.discount) },
          { key: "total_payable", label: "Total payable", render: (r) => formatNaira(r.total_payable) },
          { key: "documentation_status", label: "Docs", render: (r) => <StatusBadge value={r.documentation_status} /> },
          { key: "allocation_status", label: "Allocation", render: (r) => <StatusBadge value={r.allocation_status} /> },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
        ]}
        fields={[
          { name: "customer_id", label: "Customer", type: "select", lookup: { table: "customers", labelKey: "full_name" }, required: true },
          { name: "is_test", label: "Mark as TEST record (pilot only)", type: "boolean" },
          { name: "estate_id", label: "Estate", type: "select", lookup: { table: "estates", labelKey: "name" }, required: true },
          { name: "property_id", label: "Plot", type: "select", lookup: { table: "properties", labelKey: "plot_number" }, required: true },
          { name: "realtor_id", label: "Realtor", type: "select", lookup: { table: "realtors", labelKey: "full_name" } },
          { name: "payment_plan_id", label: "Payment plan", type: "select", lookup: { table: "payment_plans", labelKey: "name" } },
          { name: "price", label: "Price (₦)", type: "number", required: true },
          { name: "discount", label: "Discount (₦)", type: "number" },
          { name: "total_payable", label: "Total payable (₦)", type: "number", required: true },
          { name: "deposit", label: "Initial deposit (₦)", type: "number" },
          { name: "sale_date", label: "Sale date", type: "date", required: true },
          { name: "expected_completion", label: "Expected completion", type: "date" },
          { name: "documentation_status", label: "Documentation", type: "select", options: [{ value: "pending", label: titleCase("pending") }, { value: "in_progress", label: titleCase("in_progress") }, { value: "completed", label: titleCase("completed") }] },
          { name: "allocation_status", label: "Allocation", type: "select", options: [{ value: "pending", label: titleCase("pending") }, { value: "allocated", label: titleCase("allocated") }] },
          { name: "status", label: "Status", type: "select", options: [{ value: "active", label: titleCase("active") }, { value: "completed", label: titleCase("completed") }, { value: "cancelled", label: titleCase("cancelled") }] },
          { name: "notes", label: "Notes", type: "textarea", full: true },
        ]}
      />
    </div>
  );
}
