/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Activity, AlertTriangle, CheckCircle2, Clock, ListTodo, Pause, Play, RefreshCw, RotateCcw } from "lucide-react";
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
      { name: "description", content: "Every automatic action NDOS runs: successes, failures, pending work, retries and settings." },
      { property: "og:title", content: "Automation Centre — NEOMARC NDOS" },
      { property: "og:description", content: "Monitor, retry and control NEOMARC's automated operations." },
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

const SETTING_FIELDS: { key: string; label: string }[] = [
  { key: "lead_response_hours", label: "First contact deadline (hours after a lead is captured)" },
  { key: "task_escalation_days", label: "Re-escalate an overdue task every (days)" },
  { key: "dormant_lead_days", label: "Lead counts as dormant after (days without contact)" },
];

function cadence(mins: number) {
  if (mins % 1440 === 0) return mins === 1440 ? "Daily" : `Every ${mins / 1440} days`;
  if (mins % 60 === 0) return mins === 60 ? "Hourly" : `Every ${mins / 60} hours`;
  return `Every ${mins} minutes`;
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "failed"
      ? "bg-destructive/12 text-destructive"
      : status === "running" || status === "pending"
        ? "bg-warning/15 text-warning"
        : "bg-success/15 text-success";
  return <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${tone}`}>{status}</span>;
}

function AutomationCentre() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [runFilter, setRunFilter] = useState<"all" | "success" | "failed" | "pending">("all");

  const { data: jobs = [] } = useQuery({
    queryKey: ["automation-jobs"],
    queryFn: async () => {
      const { data, error } = await db.from("automation_jobs").select("*").order("name");
      if (error) throw error;
      return data as Row[];
    },
    refetchInterval: 30000,
  });

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
    refetchInterval: 30000,
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
  const pending = runs.filter((r) => r.status === "running" || r.status === "pending");
  const awaitingRetry = failed.filter((r) => r.next_retry_at);
  const today = new Date().toISOString().slice(0, 10);
  const overdueTasks = openTasks.filter((t) => t.due_date && t.due_date < today);

  async function runNow() {
    setBusy("run");
    const { error } = await supabase.rpc("run_automations" as never);
    setBusy(null);
    if (error) return void toast.error("Could not run the automations.");
    toast.success("Automations ran.");
    qc.invalidateQueries();
  }

  async function retryRun(id: string) {
    setBusy(id);
    const { data, error } = await supabase.rpc("retry_automation_run" as never, { _run_id: id } as never);
    setBusy(null);
    if (error) return void toast.error("Could not retry that run.");
    const ok = (data as any)?.ok;
    if (ok) toast.success("Retry succeeded.");
    else toast.error("The retry failed again — it stays in the failed queue.");
    qc.invalidateQueries();
  }

  async function togglePause(job: Row) {
    setBusy(job.key);
    const { error } = await supabase.rpc("set_automation_job_paused" as never, {
      _key: job.key,
      _paused: !job.paused_at,
      _reason: job.paused_at ? null : "Paused by management",
    } as never);
    setBusy(null);
    if (error) return void toast.error("Could not change that automation.");
    toast.success(job.paused_at ? "Automation resumed." : "Automation paused.");
    qc.invalidateQueries({ queryKey: ["automation-jobs"] });
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
    if (error) return void toast.error("Could not save the settings.");
    toast.success("Automation settings saved.");
    setDraft(null);
    qc.invalidateQueries({ queryKey: ["automation-settings"] });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Automation Centre"
        description="What NDOS is doing automatically, what is still running, what failed, and what can be retried."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Active automations" value={String(jobs.filter((j) => j.is_enabled && !j.paused_at).length)} icon={Activity} />
        <StatCard label="In progress" value={String(pending.length)} icon={Clock} tone="warning" />
        <StatCard label="Successful runs" value={String(succeeded.length)} icon={CheckCircle2} tone="success" />
        <StatCard label="Failed runs" value={String(failed.length)} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Overdue auto tasks" value={String(overdueTasks.length)} icon={ListTodo} tone="warning" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={runNow} disabled={busy === "run"} className="h-11">
          {busy === "run" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          Run automations now
        </Button>
        <Button asChild variant="outline" className="h-11">
          <Link to="/automation/tasks">Task &amp; escalation queue</Link>
        </Button>
      </div>

      <div className="surface-card p-4">
        <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Scheduled automations</p>
        {jobs.length === 0 ? (
          <EmptyState icon={Activity} title="No automations configured." />
        ) : (
          <div className="space-y-2">
            {jobs.map((j) => (
              <div key={j.key} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{j.name}</p>
                  <div className="flex items-center gap-2">
                    <StatusPill status={j.paused_at ? "paused" : (j.last_status ?? "pending")} />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9"
                      disabled={busy === j.key}
                      onClick={() => togglePause(j)}
                    >
                      {j.paused_at ? <Play className="mr-1.5 h-3.5 w-3.5" /> : <Pause className="mr-1.5 h-3.5 w-3.5" />}
                      {j.paused_at ? "Resume" : "Pause"}
                    </Button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{j.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {cadence(j.interval_minutes)} · Last run: {j.last_run_at ? formatDateTime(j.last_run_at) : "—"} · Next run:{" "}
                  {j.paused_at ? "paused" : formatDateTime(j.next_run_at)}
                </p>
                {j.paused_reason ? <p className="mt-1 text-xs text-warning">{j.paused_reason}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="surface-card p-4">
        <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Failed runs</p>
        {failed.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No failures." description="Every automation completed cleanly." />
        ) : (
          <div className="space-y-2">
            {failed.map((r) => (
              <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-destructive/40 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{r.automation}</p>
                  <p className="text-xs text-destructive">{r.error}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(r.created_at)} · Attempt {r.attempts}
                    {r.next_retry_at ? ` · Retries automatically ${formatDateTime(r.next_retry_at)}` : " · Needs a person"}
                  </p>
                </div>
                {r.job_key ? (
                  <Button size="sm" variant="outline" className="h-9" disabled={busy === r.id} onClick={() => retryRun(r.id)}>
                    <RotateCcw className={`mr-1.5 h-3.5 w-3.5 ${busy === r.id ? "animate-spin" : ""}`} />
                    Retry now
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="surface-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-sm font-bold uppercase tracking-wide">Automation runs</p>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "success", "failed", "pending"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={runFilter === f ? "default" : "outline"}
                className="h-8 capitalize"
                onClick={() => setRunFilter(f)}
              >
                {f === "success" ? "Successful" : f === "all" ? "All" : f}
                {f === "success" ? ` (${succeeded.length})` : f === "failed" ? ` (${failed.length})` : f === "pending" ? ` (${pending.length})` : ""}
              </Button>
            ))}
          </div>
        </div>
        {filteredRuns.length === 0 ? (
          <EmptyState icon={Activity} title="Nothing to show." description="No automation runs match this filter yet." />
        ) : (
          <div className="space-y-1.5">
            {filteredRuns.slice(0, 60).map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{r.automation}</span>
                  <div className="flex items-center gap-2">
                    {r.attempts > 1 ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{r.attempts - 1} retr{r.attempts - 1 === 1 ? "y" : "ies"}</span>
                    ) : null}
                    <StatusPill status={r.status} />
                  </div>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {r.event_type}
                  {r.job_key ? ` · ${r.job_key}` : ""} · Started {r.started_at ? formatDateTime(r.started_at) : formatDateTime(r.created_at)}
                  {r.finished_at ? ` · Finished ${formatDateTime(r.finished_at)}` : ""}
                </p>
                {r.error ? <p className="mt-0.5 text-destructive">{r.error}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {awaitingRetry.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {awaitingRetry.length} failed run(s) will be retried automatically with increasing delays before they need a person.
        </p>
      ) : null}

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
