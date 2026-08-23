/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bug } from "lucide-react";
import { toast } from "sonner";
import { db, type Row } from "@/lib/db";
import { PageHeader } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/system/errors")({
  head: () => ({
    meta: [
      { title: "Error Reports — NEOMARC NDOS" },
      {
        name: "description",
        content: "Problems reported by NEOMARC pilot users, with the page and action that failed.",
      },
      { property: "og:title", content: "Error Reports — NEOMARC NDOS" },
      { property: "og:description", content: "Problems reported by pilot users." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireRole>
      <ErrorReportsPage />
    </RequireRole>
  ),
});

function ErrorReportsPage() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["error_reports"],
    queryFn: async () => {
      const { data } = await db
        .from("error_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return (data ?? []) as Row[];
    },
  });

  async function mark(id: string, status: string) {
    const { error } = await db.from("error_reports").update({ status }).eq("id", id);
    if (error) {
      toast.error("Could not update this report.");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["error_reports"] });
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Error Reports" description="What broke, for whom, and where." />
      {isLoading ? (
        <p className="py-10 text-center text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Bug} title="No errors reported." description="Nothing has been sent in." />
      ) : (
        <div className="space-y-3">
          {rows.map((e) => (
            <div key={e.id} className="surface-card space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={e.status} />
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(e.created_at)} · {e.user_email ?? "—"} · {e.user_role ?? "—"}
                </span>
              </div>
              <p className="text-sm font-medium">{e.action_attempted ?? "Unknown action"}</p>
              <p className="text-xs text-muted-foreground">Page: {e.page_path ?? "—"}</p>
              <p className="break-words rounded-lg bg-muted p-3 text-xs">
                {e.error_summary ?? "No detail captured."}
              </p>
              <div className="flex gap-2">
                {e.status !== "reviewed" ? (
                  <Button size="sm" variant="outline" className="h-9" onClick={() => mark(e.id, "reviewed")}>
                    Mark reviewed
                  </Button>
                ) : null}
                {e.status !== "resolved" ? (
                  <Button size="sm" className="h-9" onClick={() => mark(e.id, "resolved")}>
                    Mark resolved
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
