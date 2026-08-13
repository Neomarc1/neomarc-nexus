/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db, type Row } from "@/lib/db";
import { DataTable } from "@/components/CrudModule";
import { PageHeader } from "@/components/layout/AppShell";
import { formatDateTime, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log — NEOMARC NDOS" },
      { name: "description", content: "Immutable record of every create, update and delete across NEOMARC NDOS." },
      { property: "og:title", content: "Audit Log — NEOMARC NDOS" },
      { property: "og:description", content: "Immutable record of every change across the system." },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["audit_logs"],
    queryFn: async () => {
      const { data } = await db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300);
      return (data ?? []) as Row[];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" description="Full traceability of system activity." />
      <DataTable
        loading={isLoading}
        rows={rows}
        empty="No activity recorded yet."
        columns={[
          { key: "created_at", label: "When", render: (r) => formatDateTime(r.created_at) },
          { key: "user_email", label: "User" },
          { key: "action", label: "Action", render: (r) => titleCase(r.action) },
          { key: "table_name", label: "Module" },
          { key: "record_id", label: "Record", render: (r) => String(r.record_id ?? "—").slice(0, 8) },
        ]}
      />
    </div>
  );
}
