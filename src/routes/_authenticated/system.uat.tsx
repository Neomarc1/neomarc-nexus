/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { db, type Row } from "@/lib/db";
import { PageHeader } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useCurrentUser } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/system/uat")({
  head: () => ({
    meta: [
      { title: "UAT Checklist — NEOMARC NDOS" },
      {
        name: "description",
        content:
          "Track the NEOMARC pilot user acceptance tests for realtor, sales, accounts, documentation, management and mobile workflows.",
      },
      { property: "og:title", content: "UAT Checklist — NEOMARC NDOS" },
      { property: "og:description", content: "Pilot acceptance testing progress at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireRole level="staff">
      <UatPage />
    </RequireRole>
  ),
});

function UatPage() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["uat_checklist"],
    queryFn: async () => {
      const { data } = await db.from("uat_checklist").select("*").order("sort_order");
      return (data ?? []) as Row[];
    },
  });

  async function toggle(code: string, isDone: boolean) {
    const { error } = await db.from("uat_checklist").update({ is_done: isDone }).eq("code", code);
    if (error) {
      toast.error("Only management can tick off test items.");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["uat_checklist"] });
  }

  const done = rows.filter((r) => r.is_done).length;
  const pct = rows.length ? Math.round((done / rows.length) * 100) : 0;
  const sections = [...new Set(rows.map((r) => r.section as string))];

  return (
    <div className="space-y-5">
      <PageHeader
        title="UAT Checklist"
        description="Human acceptance testing for the controlled pilot."
      />

      <div className="surface-card p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Pilot progress</span>
          <span className="text-muted-foreground">
            {done} of {rows.length} complete ({pct}%)
          </span>
        </div>
        <Progress value={pct} />
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sections.map((section) => (
            <div key={section} className="surface-card p-4">
              <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide">
                {section}
              </p>
              <div className="space-y-2">
                {rows
                  .filter((r) => r.section === section)
                  .map((r) => (
                    <label
                      key={r.code}
                      className="flex items-start gap-3 rounded-lg border border-border p-3"
                    >
                      <Checkbox
                        checked={!!r.is_done}
                        disabled={!me?.isAdmin}
                        onCheckedChange={(v) => toggle(r.code, v === true)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{r.label}</span>
                        {r.is_done ? (
                          <span className="block text-xs text-muted-foreground">
                            Signed off {formatDateTime(r.done_at)}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
