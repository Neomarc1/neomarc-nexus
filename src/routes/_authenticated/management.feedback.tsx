/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MessageSquare, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { db, type Row } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime, titleCase } from "@/lib/format";
import { FEEDBACK_CATEGORIES } from "@/components/FeedbackDialog";

export const Route = createFileRoute("/_authenticated/management/feedback")({
  head: () => ({
    meta: [
      { title: "Pilot Feedback — NEOMARC NDOS" },
      {
        name: "description",
        content:
          "Bug reports, feature requests and workflow friction submitted by the NEOMARC pilot team.",
      },
      { property: "og:title", content: "Pilot Feedback — NEOMARC NDOS" },
      { property: "og:description", content: "What the pilot team is telling us about NDOS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireRole>
      <FeedbackPage />
    </RequireRole>
  ),
});

const STATUSES = ["open", "triaged", "in_progress", "resolved", "wont_fix"];

function FeedbackPage() {
  const qc = useQueryClient();
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["feedback", category, status],
    queryFn: async () => {
      let q = db.from("feedback").select("*").order("created_at", { ascending: false }).limit(200);
      if (category !== "all") q = q.eq("category", category);
      if (status !== "all") q = q.eq("status", status);
      const { data } = await q;
      return (data ?? []) as Row[];
    },
  });

  async function setStatusFor(id: string, next: string) {
    const { error } = await db.from("feedback").update({ status: next }).eq("id", id);
    if (error) {
      toast.error("Could not update this item.");
      return;
    }
    toast.success("Feedback updated.");
    await qc.invalidateQueries({ queryKey: ["feedback"] });
  }

  async function openScreenshot(path: string) {
    const { data, error } = await supabase.storage.from("feedback").createSignedUrl(path, 120);
    if (error || !data) {
      toast.error("Could not open the screenshot.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Pilot Feedback" description="Everything the pilot team has reported." />

      <div className="flex flex-wrap gap-2">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-10 w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {FEEDBACK_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-10 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {titleCase(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No feedback submitted yet." />
      ) : (
        <div className="space-y-3">
          {rows.map((f) => (
            <div key={f.id} className="surface-card space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={f.category} />
                <StatusBadge value={f.status} />
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(f.created_at)} · {f.user_email ?? "—"} · {f.user_role ?? "—"} ·{" "}
                  {f.page_path ?? "—"}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{f.description}</p>
              <div className="flex flex-wrap items-center gap-2">
                {f.screenshot_path ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9"
                    onClick={() => openScreenshot(f.screenshot_path)}
                  >
                    <Paperclip className="mr-2 h-4 w-4" /> Screenshot
                  </Button>
                ) : null}
                <Select value={f.status} onValueChange={(v) => setStatusFor(f.id, v)}>
                  <SelectTrigger className="h-9 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {titleCase(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
