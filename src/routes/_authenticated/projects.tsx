import { createFileRoute } from "@tanstack/react-router";
import { CrudModule } from "@/components/CrudModule";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatNaira, formatDate, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { title: "Projects — NEOMARC NDOS" },
      { name: "description", content: "Estate development projects, budgets and construction progress." },
      { property: "og:title", content: "Projects — NEOMARC NDOS" },
      { property: "og:description", content: "Estate development projects, budgets and construction progress." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="Development pipeline and site progress." />
      <CrudModule
        table="projects"
        entityName="Project"
        searchKeys={["ref", "name", "location"]}
        defaults={{ status: "planning", progress: 0 }}
        columns={[
          { key: "ref", label: "Ref" },
          { key: "name", label: "Project" },
          { key: "location", label: "Location" },
          { key: "budget", label: "Budget", render: (r) => formatNaira(r.budget) },
          { key: "actual_cost", label: "Spent", render: (r) => formatNaira(r.actual_cost) },
          { key: "progress", label: "Progress", render: (r) => `${Number(r.progress ?? 0)}%` },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
        ]}
        fields={[
          { name: "name", label: "Project name", required: true },
          { name: "location", label: "Location" },
          { name: "project_type", label: "Type", type: "select", options: [{ value: "land", label: titleCase("land") }, { value: "estate_development", label: titleCase("estate_development") }, { value: "construction", label: titleCase("construction") }] },
          { name: "land_size", label: "Land size" },
          { name: "start_date", label: "Start date", type: "date" },
          { name: "target_completion", label: "Target completion", type: "date" },
          { name: "budget", label: "Budget (₦)", type: "number" },
          { name: "actual_cost", label: "Actual cost (₦)", type: "number" },
          { name: "progress", label: "Progress (%)", type: "number" },
          { name: "manager_name", label: "Project manager" },
          { name: "status", label: "Status", type: "select", options: [{ value: "planning", label: titleCase("planning") }, { value: "active", label: titleCase("active") }, { value: "on_hold", label: titleCase("on_hold") }, { value: "completed", label: titleCase("completed") }] },
          { name: "notes", label: "Notes", type: "textarea", full: true },
        ]}
      />
    </div>
  );
}
