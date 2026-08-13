import { createFileRoute } from "@tanstack/react-router";
import { CrudModule } from "@/components/CrudModule";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatNaira, formatDate, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — NEOMARC NDOS" },
      { name: "description", content: "Team task assignment, priorities and due dates across NEOMARC." },
      { property: "og:title", content: "Tasks — NEOMARC NDOS" },
      { property: "og:description", content: "Team task assignment, priorities and due dates across NEOMARC." },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" description="Who is doing what, and by when." />
      <CrudModule
        table="tasks"
        entityName="Task"
        searchKeys={["ref", "title", "category"]}
        defaults={{ status: "pending", priority: "medium" }}
        columns={[
          { key: "ref", label: "Ref" },
          { key: "title", label: "Task" },
          { key: "category", label: "Category" },
          { key: "priority", label: "Priority", render: (r) => <StatusBadge value={r.priority} /> },
          { key: "due_date", label: "Due", render: (r) => formatDate(r.due_date) },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
        ]}
        fields={[
          { name: "title", label: "Task title", required: true },
          { name: "category", label: "Category", type: "select", options: [{ value: "followup", label: titleCase("followup") }, { value: "documentation", label: titleCase("documentation") }, { value: "inspection", label: titleCase("inspection") }, { value: "collection", label: titleCase("collection") }, { value: "construction", label: titleCase("construction") }, { value: "admin", label: titleCase("admin") }] },
          { name: "priority", label: "Priority", type: "select", options: [{ value: "low", label: titleCase("low") }, { value: "medium", label: titleCase("medium") }, { value: "high", label: titleCase("high") }, { value: "urgent", label: titleCase("urgent") }] },
          { name: "due_date", label: "Due date", type: "date" },
          { name: "assigned_realtor_id", label: "Assign to realtor", type: "select", lookup: { table: "realtors", labelKey: "full_name" } },
          { name: "lead_id", label: "Related lead", type: "select", lookup: { table: "leads", labelKey: "full_name" } },
          { name: "customer_id", label: "Related customer", type: "select", lookup: { table: "customers", labelKey: "full_name" } },
          { name: "status", label: "Status", type: "select", options: [{ value: "pending", label: titleCase("pending") }, { value: "in_progress", label: titleCase("in_progress") }, { value: "completed", label: titleCase("completed") }, { value: "cancelled", label: titleCase("cancelled") }] },
          { name: "description", label: "Description", type: "textarea", full: true },
        ]}
      />
    </div>
  );
}
