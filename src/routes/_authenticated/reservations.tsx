import { createFileRoute } from "@tanstack/react-router";
import { CrudModule } from "@/components/CrudModule";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatNaira, formatDate, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reservations")({
  head: () => ({
    meta: [
      { title: "Reservations — NEOMARC NDOS" },
      { name: "description", content: "Plot reservations, expiry tracking and conversion to sale." },
      { property: "og:title", content: "Reservations — NEOMARC NDOS" },
      { property: "og:description", content: "Plot reservations, expiry tracking and conversion to sale." },
    ],
  }),
  component: ReservationsPage,
});

function ReservationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Reservations" description="Held plots and their expiry windows." />
      <CrudModule
        table="reservations"
        entityName="Reservation"
        searchKeys={["ref"]}
        defaults={{ status: "active", payment_status: "unpaid" }}
        columns={[
          { key: "ref", label: "Ref" },
          { key: "reservation_date", label: "Reserved", render: (r) => formatDate(r.reservation_date) },
          { key: "expiry_date", label: "Expires", render: (r) => formatDate(r.expiry_date) },
          { key: "reservation_fee", label: "Fee", render: (r) => formatNaira(r.reservation_fee) },
          { key: "payment_status", label: "Payment", render: (r) => <StatusBadge value={r.payment_status} /> },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
        ]}
        fields={[
          { name: "customer_id", label: "Customer", type: "select", lookup: { table: "customers", labelKey: "full_name" }, required: true },
          { name: "estate_id", label: "Estate", type: "select", lookup: { table: "estates", labelKey: "name" }, required: true },
          { name: "property_id", label: "Plot", type: "select", lookup: { table: "properties", labelKey: "plot_number" }, required: true },
          { name: "realtor_id", label: "Realtor", type: "select", lookup: { table: "realtors", labelKey: "full_name" } },
          { name: "reservation_date", label: "Reservation date", type: "date", required: true },
          { name: "expiry_date", label: "Expiry date", type: "date" },
          { name: "reservation_fee", label: "Reservation fee (₦)", type: "number" },
          { name: "payment_status", label: "Payment status", type: "select", options: [{ value: "unpaid", label: titleCase("unpaid") }, { value: "paid", label: titleCase("paid") }, { value: "refunded", label: titleCase("refunded") }] },
          { name: "status", label: "Status", type: "select", options: [{ value: "active", label: titleCase("active") }, { value: "converted", label: titleCase("converted") }, { value: "expired", label: titleCase("expired") }, { value: "cancelled", label: titleCase("cancelled") }] },
          { name: "notes", label: "Notes", type: "textarea", full: true },
        ]}
      />
    </div>
  );
}
