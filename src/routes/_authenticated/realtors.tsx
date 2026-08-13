import { createFileRoute } from "@tanstack/react-router";
import { CrudModule } from "@/components/CrudModule";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatNaira, formatDate, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/realtors")({
  head: () => ({
    meta: [
      { title: "Realtors — NEOMARC NDOS" },
      { name: "description", content: "NEOMARC Realty realtor network, commission rates and performance." },
      { property: "og:title", content: "Realtors — NEOMARC NDOS" },
      { property: "og:description", content: "NEOMARC Realty realtor network, commission rates and performance." },
    ],
  }),
  component: RealtorsPage,
});

function RealtorsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Realtors" description="Your sales force and their commission structure." />
      <CrudModule
        table="realtors"
        entityName="Realtor"
        searchKeys={["ref", "full_name", "phone", "email"]}
        defaults={{ registration_status: "pending", commission_rate: 5, is_active: true }}
        columns={[
          { key: "ref", label: "Ref" },
          { key: "full_name", label: "Name" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "location", label: "Location" },
          { key: "commission_rate", label: "Rate", render: (r) => `${Number(r.commission_rate ?? 0)}%` },
          { key: "registration_status", label: "Registration", render: (r) => <StatusBadge value={r.registration_status} /> },
          { key: "date_joined", label: "Joined", render: (r) => formatDate(r.date_joined) },
        ]}
        fields={[
          { name: "full_name", label: "Full name", required: true },
          { name: "phone", label: "Phone", required: true },
          { name: "whatsapp", label: "WhatsApp" },
          { name: "email", label: "Email", type: "email" },
          { name: "location", label: "Location" },
          { name: "commission_rate", label: "Commission rate (%)", type: "number" },
          { name: "date_joined", label: "Date joined", type: "date" },
          { name: "registration_status", label: "Registration status", type: "select", options: [{ value: "pending", label: titleCase("pending") }, { value: "verified", label: titleCase("verified") }, { value: "suspended", label: titleCase("suspended") }] },
          { name: "manager_id", label: "Sales manager", type: "select", lookup: { table: "realtors", labelKey: "full_name" } },
          { name: "notes", label: "Notes", type: "textarea", full: true },
        ]}
      />
    </div>
  );
}
