import { createFileRoute } from "@tanstack/react-router";
import { CrudModule } from "@/components/CrudModule";
import { ContactActions } from "@/components/ContactActions";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [
      { title: "Customers — NEOMARC NDOS" },
      { name: "description", content: "NEOMARC Realty customer records, KYC details and assigned realtors." },
      { property: "og:title", content: "Customers — NEOMARC NDOS" },
      { property: "og:description", content: "Customer records, KYC details and assigned realtors." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description="Verified buyers and subscribers." />
      <CrudModule
        table="customers"
        entityName="Customer"
        searchKeys={["ref", "full_name", "phone", "email", "location"]}
        defaults={{ status: "active", country: "Nigeria" }}
        columns={[
          { key: "ref", label: "Ref" },
          { key: "full_name", label: "Name" },
          {
            key: "phone",
            label: "Contact",
            render: (r) => <ContactActions phone={r.phone} whatsapp={r.whatsapp} name={r.full_name} />,
          },
          { key: "email", label: "Email" },
          { key: "location", label: "Location" },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          { key: "created_at", label: "Onboarded", render: (r) => formatDate(r.created_at) },
        ]}
        fields={[
          { name: "full_name", label: "Full name", required: true },
          { name: "is_test", label: "Mark as TEST record (pilot only)", type: "boolean" },
          { name: "phone", label: "Phone", required: true },
          { name: "whatsapp", label: "WhatsApp" },
          { name: "email", label: "Email", type: "email" },
          { name: "address", label: "Address", full: true },
          { name: "location", label: "City / State" },
          { name: "country", label: "Country" },
          {
            name: "id_type",
            label: "ID type",
            type: "select",
            options: ["NIN", "International Passport", "Driver's Licence", "Voter's Card"].map((v) => ({
              value: v,
              label: v,
            })),
          },
          { name: "id_number", label: "ID number" },
          { name: "next_of_kin", label: "Next of kin" },
          { name: "next_of_kin_phone", label: "Next of kin phone" },
          {
            name: "realtor_id",
            label: "Realtor",
            type: "select",
            lookup: { table: "realtors", labelKey: "full_name" },
          },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: ["active", "inactive"].map((v) => ({ value: v, label: v })),
          },
          { name: "notes", label: "Notes", type: "textarea", full: true },
        ]}
      />
    </div>
  );
}
