import { createFileRoute } from "@tanstack/react-router";
import { CrudModule } from "@/components/CrudModule";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatNaira, formatDate, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inspections")({
  head: () => ({
    meta: [
      { title: "Inspections — NEOMARC NDOS" },
      { name: "description", content: "Schedule and track NEOMARC estate site inspections and outcomes." },
      { property: "og:title", content: "Inspections — NEOMARC NDOS" },
      { property: "og:description", content: "Schedule and track NEOMARC estate site inspections and outcomes." },
    ],
  }),
  component: InspectionsPage,
});

function InspectionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Inspections" description="Site visits, escorts and outcomes." />
      <CrudModule
        table="inspections"
        entityName="Inspection"
        searchKeys={["ref", "escort", "outcome"]}
        defaults={{ status: "scheduled", attendees: 1 }}
        columns={[
          { key: "ref", label: "Ref" },
          { key: "scheduled_date", label: "Date", render: (r) => formatDate(r.scheduled_date) },
          { key: "scheduled_time", label: "Time" },
          { key: "escort", label: "Escort" },
          { key: "attendees", label: "Guests" },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          { key: "outcome", label: "Outcome" },
          { key: "followup_date", label: "Follow-up", render: (r) => formatDate(r.followup_date) },
        ]}
        fields={[
          { name: "lead_id", label: "Lead", type: "select", lookup: { table: "leads", labelKey: "full_name" } },
          { name: "customer_id", label: "Customer", type: "select", lookup: { table: "customers", labelKey: "full_name" } },
          { name: "estate_id", label: "Estate", type: "select", lookup: { table: "estates", labelKey: "name" }, required: true },
          { name: "realtor_id", label: "Realtor", type: "select", lookup: { table: "realtors", labelKey: "full_name" } },
          { name: "scheduled_date", label: "Date", type: "date", required: true },
          { name: "scheduled_time", label: "Time", type: "time" },
          { name: "escort", label: "Escort officer" },
          { name: "attendees", label: "Number of guests", type: "number" },
          { name: "status", label: "Status", type: "select", options: [{ value: "scheduled", label: titleCase("scheduled") }, { value: "confirmed", label: titleCase("confirmed") }, { value: "completed", label: titleCase("completed") }, { value: "no_show", label: titleCase("no_show") }, { value: "cancelled", label: titleCase("cancelled") }] },
          { name: "outcome", label: "Outcome" },
          { name: "followup_date", label: "Follow-up date", type: "date" },
          { name: "notes", label: "Notes", type: "textarea", full: true },
        ]}
      />
    </div>
  );
}
