import { createFileRoute } from "@tanstack/react-router";
import { CrudModule } from "@/components/CrudModule";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatNaira, formatDate, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/estates")({
  head: () => ({
    meta: [
      { title: "Estates — NEOMARC NDOS" },
      { name: "description", content: "NEOMARC estates including Rika Royal Garden and Emerald City." },
      { property: "og:title", content: "Estates — NEOMARC NDOS" },
      { property: "og:description", content: "NEOMARC estates including Rika Royal Garden and Emerald City." },
    ],
  }),
  component: EstatesPage,
});

function EstatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Estates" description="Land banks, pricing and title documentation." />
      <CrudModule
        table="estates"
        entityName="Estate"
        searchKeys={["ref", "name", "location", "state"]}
        defaults={{ status: "active" }}
        orderBy="name"
        columns={[
          { key: "ref", label: "Ref" },
          { key: "name", label: "Estate" },
          { key: "location", label: "Location" },
          { key: "state", label: "State" },
          { key: "default_plot_size", label: "Plot size" },
          { key: "default_price", label: "Price", render: (r) => formatNaira(r.default_price) },
          { key: "promo_price", label: "Promo", render: (r) => formatNaira(r.promo_price) },
          { key: "title_documentation", label: "Title" },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
        ]}
        fields={[
          { name: "name", label: "Estate name", required: true },
          { name: "location", label: "Location" },
          { name: "state", label: "State" },
          { name: "lga", label: "LGA" },
          { name: "default_plot_size", label: "Default plot size", placeholder: "300sqm" },
          { name: "default_price", label: "Default price (₦)", type: "number" },
          { name: "promo_price", label: "Promo price (₦)", type: "number" },
          { name: "title_documentation", label: "Title documentation", placeholder: "C of O / Registered Survey" },
          { name: "project_id", label: "Project", type: "select", lookup: { table: "projects", labelKey: "name" } },
          { name: "image_url", label: "Image URL", full: true },
          { name: "status", label: "Status", type: "select", options: [{ value: "active", label: titleCase("active") }, { value: "sold_out", label: titleCase("sold_out") }, { value: "coming_soon", label: titleCase("coming_soon") }] },
          { name: "description", label: "Description", type: "textarea", full: true },
        ]}
      />
    </div>
  );
}
