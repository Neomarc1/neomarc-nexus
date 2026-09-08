/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlarmClock, ListTodo, ShieldAlert } from "lucide-react";
import { db, type Row } from "@/lib/db";
import { PageHeader } from "@/components/layout/AppShell";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/automation/tasks")({
  head: () => ({
    meta: [
      { title: "Task & Escalation Queue — NEOMARC NDOS" },
      { name: "description", content: "Automatically generated tasks, their owners, deadlines and escalation levels." },
      { property: "og:title", content: "Task & Escalation Queue — NEOMARC NDOS" },
      { property: "og:description", content: "Track owners, deadlines and escalations across NEOMARC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole level="staff">
      <TaskQueue />
    </RequireRole>
  ),
});

const FILTERS = ["All", "Overdue", "Escalated", "Open"] as const;

function TaskQueue() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const { data: tasks = [] } = useQuery({
    queryKey: ["escalation-tasks"],
    queryFn: async () => {
      const { data, error } = await db
        .from("tasks")
        .select("*, realtors:assigned_realtor_id(full_name), leads(full_name)")
        .in("status", ["todo", "in_progress", "overdue"])
        .order("due_date", { nullsFirst: false });
      if (error) throw error;
      return data as Row[];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const overdue = tasks.filter((t) => t.due_date && t.due_date < today);
  const escalated = tasks.filter((t) => (t.escalation_level ?? 0) > 0);

  const shown =
    filter === "Overdue" ? overdue : filter === "Escalated" ? escalated : filter === "Open" ? tasks.filter((t) => t.status === "todo") : tasks;

  async function complete(id: string) {
    const { error } = await db.from("tasks").update({ status: "completed" }).eq("id", id);
    if (error) {
      toast.error("Could not update the task.");
      return;
    }
    toast.success("Task completed.");
    qc.invalidateQueries({ queryKey: ["escalation-tasks"] });
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Task & Escalation Queue" description="Every open task, who owns it, and how many times it has been escalated." />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Open tasks" value={String(tasks.length)} icon={ListTodo} />
        <StatCard label="Overdue" value={String(overdue.length)} icon={AlarmClock} tone="destructive" />
        <StatCard label="Escalated" value={String(escalated.length)} icon={ShieldAlert} tone="warning" />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="h-9" onClick={() => setFilter(f)}>
            {f}
          </Button>
        ))}
      </div>

      <div className="surface-card p-4">
        {shown.length === 0 ? (
          <EmptyState icon={ListTodo} title="Nothing in this queue." />
        ) : (
          <div className="space-y-2">
            {shown.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.realtors?.full_name ?? "Unassigned"} · Due {formatDate(t.due_date)}
                    {t.is_auto ? " · Automatic" : ""}
                    {(t.escalation_level ?? 0) > 0 ? ` · Escalated ×${t.escalation_level}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={t.priority} />
                  <StatusBadge value={t.status} />
                  <Button size="sm" variant="outline" className="h-9" onClick={() => complete(t.id)}>
                    Complete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
