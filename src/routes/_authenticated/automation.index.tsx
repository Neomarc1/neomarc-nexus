/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Activity, AlertTriangle, CheckCircle2, ListTodo, Play, RefreshCw } from "lucide-react";
import { db, type Row } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/AppShell";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/automation/")({
  head: () => ({
    meta: [
      { title: "Automation Centre — NEOMARC NDOS" },
      { name: "description", content: "Every automatic action NDOS runs: successes, failures, pending work and settings." },
      { property: "og:title", content: "Automation Centre — NEOMARC NDOS" },
      { property: "og:description", content: "Monitor and control NEOMARC's automated operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole level="admin">
      <AutomationCentre />
    </RequireRole>
  ),
});

const AUTOMATIONS = [
  { key: "lead_intake", name: "Lead intake", desc: "First-contact task, deadline and alert when a lead is captured." },
  { key: "lead_followup", name: "Lead follow-up", desc: "Creates a follow-up task when a lead's follow-up date arrives." },
  { key: "task_escalation", name: "Task escalation", desc: "Marks tasks overdue, raises priority and alerts management." },
  { key: "nightly_operations", name: "Nightly operations", desc: "Reservation expiry, schedule refresh and payment reminders." },
];

const SETTING_FIELDS: { key: string; label: string }[] = [
  { key: "lead_response_hours", label: "First contact deadline (hours after a lead is captured)" },
  { key: "task_escalation_days", label: "Re-escalate an overdue task every (days)" },
  { key: "dormant_lead_days", label: "Lead counts as dormant after (days without contact)" },
];

function AutomationCentre() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: runs = [] } = useQuery({
    queryKey: ["automation-runs"],
    queryFn: async () => {
      const { data, error } = await db
        .from("automation_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: openTasks = [] } = useQuery({
    queryKey: ["automation-open-tasks"],
    queryFn: async () => {
      const { data, error } = await db
        .from("tasks")
        .select("id, status, due_date, escalation_level")
        .eq("is_auto", true)
        .in("status", ["todo", "in_progress", "overdue"]);
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["automation-settings"],
    queryFn: async () => {
      const { data } = await db
        .from("system_settings")
        .select("value")
        .eq("key", "automation_settings")
        .maybeSingle();
      return (data?.value ?? {}) as Record<string, any>;
    },
  });

  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const values = draft ?? Object.fromEntries(SETTING_FIELDS.map((f) => [f.key, String(settings?.[f.key] ?? "")]));

  const failed = runs.filter((r) => r.status === "failed" && !r.resolved_at);
  const succeeded = runs.filter((r) => r.status === "success");
  const today = new Date().toISOString().slice(0, 10);
  const overdueTasks = openTasks.filter((t) => t.due_date && t.due_date < today);

  async function runNow() {
    setRunning(true);
    const { error } = await supabase.rpc("run_automations" as never);
    setRunning(false);
    if (error) {
      toast.error("Could not run the automations.");
      return;
    }
    toast.success("Automations ran.");
    qc.invalidateQueries();
  }

  async function saveSettings() {
    const payload = { ...(settings ?? {}) } as Record<string, any>;
    for (const f of SETTING_FIELDS) {
      const n = Number(values[f.key]);
      if (!Number.isNaN(n) && values[f.key] !== "") payload[f.key] = n;
    }
    const { error } = await db
      .from("system_settings")
      .upsert({ key: "automation_settings", value: payload }, { onConflict: "key" });
    if (error) {
      toast.error("Could not save the settings.");
      return;
    }
    toast.success("Automation settings saved.");
    setDraft(null);
    qc.invalidateQueries({ queryKey: ["automation-settings"] });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Automation Centre"
        description="What NDOS is doing automatically, what failed, and what still needs a human."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active automations" value={String(AUTOMATIONS.length)} icon={Activity} />
        <StatCard label="Successful runs" value={String(succeeded.length)} icon={CheckCircle2} tone="success" />
        <StatCard label="Failed runs" value={String(failed.length)} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Overdue auto tasks" value={String(overdueTasks.length)} icon={ListTodo} tone="warning" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={runNow} disabled={running} className="h-11">
          {running ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          Run automations now
        </Button>
        <Button asChild variant="outline" className="h-11">
          <Link to="/automation/tasks">Task &amp; escalation queue</Link>
        </Button>
      </div>

      <div className="surface-card p-4">
        <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Automations</p>
        <div className="space-y-2">
          {AUTOMATIONS.map((a) => {
            const last = runs.find((r) => r.automation === a.key);
            return (
              <div key={a.key} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{a.name}</p>
                  <span
                    className={
                      last?.status === "failed"
                        ? "rounded-full bg-destructive/12 px-2 py-0.5 text-xs text-destructive"
                        : "rounded-full bg-success/15 px-2 py-0.5 text-xs text-success"
                    }
                  >
                    {last ? (last.status === "failed" ? "Last run failed" : "Healthy") : "Not run yet"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{a.desc}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Last run: {last ? formatDateTime(last.created_at) : "—"} · Next run: nightly
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="surface-card p-4">
        <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Failed runs</p>
        {failed.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No failures." description="Every automation completed cleanly." />
        ) : (
          <div className="space-y-2">
            {failed.map((r) => (
              <div key={r.id} className="rounded-lg border border-destructive/40 p-3">
                <p className="text-sm font-medium">{r.automation}</p>
                <p className="text-xs text-destructive">{r.error}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="surface-card p-4">
        <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Recent activity</p>
        {runs.length === 0 ? (
          <EmptyState icon={Activity} title="Nothing has run yet." />
        ) : (
          <div className="space-y-1.5">
            {runs.slice(0, 40).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-xs">
                <span className="font-medium">{r.automation}</span>
                <span className="text-muted-foreground">{r.event_type}</span>
                <span className={r.status === "failed" ? "text-destructive" : "text-success"}>{r.status}</span>
                <span className="text-muted-foreground">{formatDateTime(r.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="surface-card p-4">
        <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Settings</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SETTING_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs">{f.label}</Label>
              <Input
                inputMode="numeric"
                value={values[f.key] ?? ""}
                onChange={(e) => setDraft({ ...values, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <Button className="mt-4 h-11" onClick={saveSettings} disabled={!draft}>
          Save settings
        </Button>
      </div>
    </div>
  );
}
