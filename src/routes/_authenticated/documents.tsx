import { createFileRoute } from "@tanstack/react-router";
import { CrudModule } from "@/components/CrudModule";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatNaira, formatDate, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Documents — NEOMARC NDOS" },
      { name: "description", content: "Allocation letters, contracts, receipts and title documents." },
      { property: "og:title", content: "Documents — NEOMARC NDOS" },
      { property: "og:description", content: "Allocation letters, contracts, receipts and title documents." },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Documents" description="Protected customer and transaction documents." />
      <CrudModule
        table="documents"
        entityName="Document"
        searchKeys={["ref", "title", "document_type"]}
        defaults={{ status: "draft", version: 1 }}
        columns={[
          { key: "ref", label: "Ref" },
          { key: "title", label: "Title" },
          { key: "document_type", label: "Type", render: (r) => titleCase(r.document_type) },
          { key: "date_issued", label: "Issued", render: (r) => formatDate(r.date_issued) },
          { key: "version", label: "Ver" },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
        ]}
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "document_type", label: "Document type", type: "select", options: [{ value: "allocation_letter", label: titleCase("allocation_letter") }, { value: "contract_of_sale", label: titleCase("contract_of_sale") }, { value: "deed_of_assignment", label: titleCase("deed_of_assignment") }, { value: "survey_plan", label: titleCase("survey_plan") }, { value: "receipt", label: titleCase("receipt") }, { value: "offer_letter", label: titleCase("offer_letter") }, { value: "kyc", label: titleCase("kyc") }, { value: "other", label: titleCase("other") }] },
          { name: "customer_id", label: "Customer", type: "select", lookup: { table: "customers", labelKey: "full_name" } },
          { name: "sale_id", label: "Sale", type: "select", lookup: { table: "sales", labelKey: "ref" } },
          { name: "estate_id", label: "Estate", type: "select", lookup: { table: "estates", labelKey: "name" } },
          { name: "date_issued", label: "Date issued", type: "date" },
          { name: "expiry_date", label: "Expiry date", type: "date" },
          { name: "version", label: "Version", type: "number" },
          { name: "storage_path", label: "File link / path", full: true },
          { name: "status", label: "Status", type: "select", options: [{ value: "draft", label: titleCase("draft") }, { value: "issued", label: titleCase("issued") }, { value: "signed", label: titleCase("signed") }, { value: "archived", label: titleCase("archived") }] },
        ]}
      />
    </div>
  );
}
