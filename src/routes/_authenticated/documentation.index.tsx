/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, FolderOpen, Stamp } from "lucide-react";
import { db, type Row } from "@/lib/db";
import { PageHeader } from "@/components/layout/AppShell";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { DocumentUploader } from "@/components/ops/DocumentUploader";
import { Button } from "@/components/ui/button";
import { formatDate, formatNaira } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/documentation/")({
  head: () => ({
    meta: [
      { title: "Documentation Workspace — NEOMARC NDOS" },
      { name: "description", content: "Upload contracts, receipts and allocation papers, and track sales ready for allocation." },
      { property: "og:title", content: "Documentation Workspace — NEOMARC NDOS" },
      { property: "og:description", content: "Manage NEOMARC sale documents and the allocation-ready queue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentationPage,
});

function DocumentationPage() {
  const [uploadFor, setUploadFor] = useState<Row | null>(null);

  const { data: sales = [] } = useQuery({
    queryKey: ["documentation", "sales"],
    queryFn: async () => {
      const { data, error } = await db
        .from("sales")
        .select("*, customers(full_name), properties(plot_number, block), estates(name)")
        .neq("status", "cancelled")
        .order("sale_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["documentation", "recent-docs"],
    queryFn: async () => {
      const { data, error } = await db
        .from("documents")
        .select("*, customers(full_name)")
        .eq("is_current", true)
        .order("uploaded_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data as Row[];
    },
  });

  const awaitingDocs = sales.filter((s) => s.documentation_status !== "complete");
  const allocationReady = sales.filter(
    (s) => s.documentation_status === "complete" && s.allocation_status !== "allocated",
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Documentation Workspace" description="Papers in order, allocations on time." />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Awaiting documentation" value={String(awaitingDocs.length)} icon={FileText} tone="warning" />
        <StatCard label="Allocation ready" value={String(allocationReady.length)} icon={Stamp} tone="success" />
        <StatCard label="Documents on file" value={String(docs.length)} icon={FolderOpen} />
      </div>

      <div className="surface-card p-4">
        <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Allocation-ready sales</p>
        {allocationReady.length === 0 ? (
          <EmptyState icon={Stamp} title="No sale is allocation-ready." description="Complete documentation first." />
        ) : (
          <div className="space-y-2">
            {allocationReady.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {s.customers?.full_name} · {s.estates?.name} Plot {s.properties?.plot_number}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.ref} · {formatDate(s.sale_date)} · {formatNaira(s.total_payable)}
                  </p>
                </div>
                <Button asChild size="sm" className="h-10">
                  <Link to="/sales/$saleId" params={{ saleId: s.id }}>
                    Open sale
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="surface-card p-4">
        <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Sales awaiting documents</p>
        {awaitingDocs.length === 0 ? (
          <EmptyState icon={FileText} title="Every sale is documented." />
        ) : (
          <div className="space-y-2">
            {awaitingDocs.slice(0, 15).map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {s.customers?.full_name} · {s.ref}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.estates?.name} Plot {s.properties?.plot_number} · {formatDate(s.sale_date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={s.documentation_status} />
                  <Button size="sm" variant="outline" className="h-10" onClick={() => setUploadFor(s)}>
                    Upload
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="surface-card p-4">
        <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Recent uploads</p>
        {docs.length === 0 ? (
          <EmptyState icon={FolderOpen} title="No documents uploaded yet." />
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.title ?? d.file_name ?? d.document_type}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.customers?.full_name ?? "—"} · v{d.version} · {formatDate(d.uploaded_at)}
                  </p>
                </div>
                <StatusBadge value={d.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {uploadFor ? (
        <DocumentUploader
          open={!!uploadFor}
          onOpenChange={(v) => !v && setUploadFor(null)}
          saleId={uploadFor.id}
          customerId={uploadFor.customer_id}
          estateId={uploadFor.estate_id}
          propertyId={uploadFor.property_id}
        />
      ) : null}
    </div>
  );
}
