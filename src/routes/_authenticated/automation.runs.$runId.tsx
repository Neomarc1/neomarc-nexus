/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { db, type Row } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/automation/runs/$runId")({
  head: () => ({
    meta: [
      { title: "Automation run detail — NEOMARC NDOS" },
      { name: "description", content: "Full record of one automated action: what it received, what it returned, any error, and every retry attempt." },
      { property: "og:title", content: "Automation run detail — NEOMARC NDOS" },
      { property: "og:description", content: "Inspect payload, errors and retry history for a single NDOS automation run." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole level="admin">
      <RunDetail />
    </RequireRole>
  ),
});

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "failed"
      ? "bg-destructive/12 text-destructive"
      : status === "running" || status === "pending"
        ? "bg-warning/15 text-warning"
        : "bg-success/15 text-success";
  return <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${tone}`}>{status}</span>;
}

function Json({ value }: { value: any }) {
  const empty = value == null || (typeof value === "object" && Object.keys(value).length === 0);
  if (empty) return <p className="text-xs text-muted-foreground">Nothing recorded.</p>;
  return (
    <pre className="max-h-80 overflow-auto rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-words">
      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
    </pre>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function RunDetail() {
  const { runId } = useParams({ from: "/_authenticated/automation/runs/$runId" });
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: run, isLoading } = useQuery({
    queryKey: ["automation-run", runId],
    queryFn: async () => {
      const { data, error } = await db.from("automation_runs").select("*").eq("id", runId).maybeSingle();
      if (error) throw error;
      return data as Row | null;
    },
    refetchInterval: 30000,
  });

  const rootId = (run?.parent_run_id as string | null) ?? run?.id ?? runId;

  const { data: attempts = [] } = useQuery({
    enabled: !!run,
    queryKey: ["automation-run-attempts", rootId],
    queryFn: async () => {
      const { data, error } = await db
        .from("automation_runs")
        .select("*")
        .or(`id.eq.${rootId},parent_run_id.eq.${rootId}`)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Row[];
    },
    refetchInterval: 30000,
  });

  async function retry() {
    if (!run) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("retry_automation_run" as never, { _run_id: run.id } as never);
    setBusy(false);
    if (error) return void toast.error("Could not retry that run.");
    if ((data as any)?.ok) toast.success("Retry succeeded.");
    else toast.error("The retry failed again — it stays in the failed queue.");
    qc.invalidateQueries();
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!run) {
    return (
      <div className="space-y-3">
        <PageHeader title="Run not found" description="This automation run no longer exists." />
        <Button asChild variant="outline" className="h-11">
          <Link to="/automation">Back to Automation Centre</Link>
        </Button>
      </div>
    );
  }

  const result = run.result as any;
  const payload = result?.input ?? result?.payload ?? null;

  return (
    <div className="space-y-5">
      <Link to="/automation" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Automation Centre
      </Link>

      <PageHeader
        title={String(run.automation)}
        description={`${run.event_type}${run.job_key ? ` · ${run.job_key}` : ""}`}
        action={
          run.status === "failed" ? (
            <Button className="h-11" onClick={retry} disabled={busy}>
              <RotateCcw className="mr-2 h-4 w-4" /> Retry now
            </Button>
          ) : undefined
        }
      />

      <div className="surface-card grid gap-4 p-4 sm:grid-cols-3">
        <Field label="Status"><StatusPill status={String(run.status)} /></Field>
        <Field label="Attempts">{String(run.attempts)} ({Math.max(0, Number(run.attempts) - 1)} retries)</Field>
        <Field label="Actor">{String(run.actor)}</Field>
        <Field label="Started">{run.started_at ? formatDateTime(run.started_at) : formatDateTime(run.created_at)}</Field>
        <Field label="Finished">{run.finished_at ? formatDateTime(run.finished_at) : "—"}</Field>
        <Field label="Next retry">{run.next_retry_at ? formatDateTime(run.next_retry_at) : "—"}</Field>
        <Field label="Source record">
          {run.source_table ? `${run.source_table}${run.source_record_id ? ` · ${run.source_record_id}` : ""}` : "—"}
        </Field>
        <Field label="Resolved">{run.resolved_at ? formatDateTime(run.resolved_at) : "—"}</Field>
        <Field label="Run ID"><span className="break-all text-xs text-muted-foreground">{String(run.id)}</span></Field>
      </div>

      <div className="surface-card p-4">
        <p className="mb-2 font-display text-sm font-bold uppercase tracking-wide">Input payload</p>
        <Json value={payload} />
      </div>

      <div className="surface-card p-4">
        <p className="mb-2 font-display text-sm font-bold uppercase tracking-wide">Result / output</p>
        <Json value={result} />
      </div>

      <div className="surface-card p-4">
        <p className="mb-2 font-display text-sm font-bold uppercase tracking-wide">Error detail</p>
        {run.error ? (
          <pre className="max-h-80 overflow-auto rounded-lg bg-destructive/10 p-3 text-[11px] leading-relaxed text-destructive whitespace-pre-wrap break-words">
            {String(run.error)}
          </pre>
        ) : (
          <p className="text-xs text-muted-foreground">No error recorded for this run.</p>
        )}
      </div>

      <div className="surface-card p-4">
        <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Attempt log</p>
        <div className="space-y-1.5">
          {attempts.map((a, i) => (
            <div key={a.id} className={`rounded-lg border p-2.5 text-xs ${a.id === run.id ? "border-primary" : "border-border"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  Attempt {i + 1}
                  {a.parent_run_id ? " (retry)" : " (original)"}
                </span>
                <div className="flex items-center gap-2">
                  <StatusPill status={String(a.status)} />
                  {a.id !== run.id ? (
                    <Link to="/automation/runs/$runId" params={{ runId: String(a.id) }} className="text-primary underline">
                      Open
                    </Link>
                  ) : null}
                </div>
              </div>
              <p className="mt-1 text-muted-foreground">
                {a.started_at ? formatDateTime(a.started_at) : formatDateTime(a.created_at)}
                {a.finished_at ? ` → ${formatDateTime(a.finished_at)}` : ""}
              </p>
              {a.error ? <p className="mt-0.5 break-words text-destructive">{String(a.error)}</p> : null}
              {a.result && Object.keys(a.result as any).length > 0 ? (
                <pre className="mt-1.5 max-h-40 overflow-auto rounded bg-muted/60 p-2 text-[11px] whitespace-pre-wrap break-words">
                  {JSON.stringify(a.result, null, 2)}
                </pre>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
