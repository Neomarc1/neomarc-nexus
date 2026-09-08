/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Download, Repeat, RotateCcw, Target } from "lucide-react";
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

function attemptPayload(a: any): any | null {
  const input = a?.result?.input;
  return input != null && typeof input === "object" && Object.keys(input).length > 0 ? input : null;
}

function payloadText(a: any): string {
  const p = attemptPayload(a);
  return p ? JSON.stringify(p, null, 2) : "";
}

type DiffRow = { a?: string | undefined; b?: string | undefined; type: "same" | "del" | "add" };

function flattenJson(value: any, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) out[prefix || "(root)"] = Array.isArray(value) ? "[]" : "{}";
    for (const k of keys) flattenJson(value[k], prefix ? `${prefix}.${k}` : k, out);
  } else {
    out[prefix || "(root)"] = JSON.stringify(value);
  }
  return out;
}

type DiffSummary = { added: string[]; removed: string[]; changed: { path: string; from: string; to: string }[] };

function summarizeDiff(a: any, b: any): DiffSummary {
  const fa = flattenJson(a);
  const fb = flattenJson(b);
  const added: string[] = [];
  const removed: string[] = [];
  const changed: DiffSummary["changed"] = [];
  for (const k of Object.keys(fb)) {
    if (!(k in fa)) added.push(k);
    else if (fa[k] !== fb[k]) changed.push({ path: k, from: fa[k]!, to: fb[k]! });
  }
  for (const k of Object.keys(fa)) if (!(k in fb)) removed.push(k);
  return { added, removed, changed };
}

function diffLines(aLines: string[], bLines: string[]): DiffRow[] {
  // LCS-based line diff (payloads are small)
  const m = aLines.length, n = bLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i]![j] = aLines[i] === bLines[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const rows: DiffRow[] = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (aLines[i] === bLines[j]) { rows.push({ a: aLines[i], b: bLines[j], type: "same" }); i++; j++; }
    else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) { rows.push({ a: aLines[i], type: "del" }); i++; }
    else { rows.push({ b: bLines[j], type: "add" }); j++; }
  }
  while (i < m) { rows.push({ a: aLines[i], type: "del" }); i++; }
  while (j < n) { rows.push({ b: bLines[j], type: "add" }); j++; }
  return rows;
}

function RunDetail() {
  const { runId } = useParams({ from: "/_authenticated/automation/runs/$runId" });
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [diffA, setDiffA] = useState<number | null>(null);
  const [diffB, setDiffB] = useState<number | null>(null);
  const attemptRefs = useRef<Map<string, HTMLLIElement | null>>(new Map());
  const attemptCardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  function flashAttempt(index: number | null) {
    if (index == null) return;
    const attempt = attempts[index];
    if (!attempt) return;
    const li = attemptRefs.current.get(String(attempt.id));
    const card = attemptCardRefs.current.get(String(attempt.id));
    if (li) {
      li.scrollIntoView({ behavior: "smooth", block: "center" });
      li.classList.add("ring-2", "ring-primary", "rounded-lg");
    }
    if (card) {
      card.classList.add("bg-primary/10", "border-primary", "shadow-[0_0_0_3px_hsl(var(--primary)/0.25)]");
    }
    window.setTimeout(() => {
      li?.classList.remove("ring-2", "ring-primary", "rounded-lg");
      card?.classList.remove("bg-primary/10", "border-primary", "shadow-[0_0_0_3px_hsl(var(--primary)/0.25)]");
    }, 1400);
  }

  function copyPayload(a: any, n: number) {
    const text = payloadText(a);
    if (!text) return void toast.info("No payload recorded for that attempt.");
    navigator.clipboard.writeText(text).then(
      () => toast.success(`Attempt ${n} payload copied.`),
      () => toast.error("Could not copy to clipboard."),
    );
  }

  function downloadPayload(a: any, n: number) {
    const text = payloadText(a);
    if (!text) return void toast.info("No payload recorded for that attempt.");
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = `automation-attempt-${n}-payload.json`;
    el.click();
    URL.revokeObjectURL(url);
  }

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

  async function replay() {
    if (!run) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("replay_automation_run" as never, { _run_id: run.id } as never);
    setBusy(false);
    if (error) return void toast.error("Could not replay that run.");
    if ((data as any)?.ok) toast.success("Replayed — a new attempt was recorded.");
    else toast.error("The replay failed — the new attempt is in the failed queue.");
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
          <div className="flex flex-wrap gap-2">
            {run.status === "failed" ? (
              <Button className="h-11" onClick={retry} disabled={busy}>
                <RotateCcw className="mr-2 h-4 w-4" /> Retry now
              </Button>
            ) : null}
            {run.job_key ? (
              <Button variant="outline" className="h-11" onClick={replay} disabled={busy}>
                <Repeat className="mr-2 h-4 w-4" /> Replay
              </Button>
            ) : null}
          </div>
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
        <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Attempt timeline</p>
        <ol className="relative ml-3 space-y-4 border-l-2 border-border pl-5">
          {attempts.map((a, i) => {
            const status = String(a.status);
            const dot =
              status === "failed"
                ? "border-destructive bg-destructive"
                : status === "success"
                  ? "border-primary bg-primary"
                  : "border-amber-500 bg-amber-500";
            const outcome = status === "failed"
              ? `Failed${a.error ? ` — ${String(a.error)}` : ""}`
              : status === "success"
                ? "Completed successfully"
                : "In progress or awaiting retry";
            return (
              <li
                key={a.id}
                ref={(el) => { attemptRefs.current.set(String(a.id), el); }}
                className="relative scroll-mt-4"
              >
                <span
                  className={`absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 ${dot} ring-4 ring-background`}
                  aria-hidden
                >
                  <span className="text-[8px] font-bold text-white">{i + 1}</span>
                </span>
                <div className={`rounded-lg border p-2.5 text-xs ${a.id === run.id ? "border-primary" : "border-border"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      Attempt {i + 1}
                      {a.parent_run_id ? " (retry)" : " (original)"}
                    </span>
                    <div className="flex items-center gap-2">
                      <StatusPill status={status} />
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
                  <p className={`mt-1 font-medium ${status === "failed" ? "text-destructive" : status === "success" ? "text-primary" : "text-amber-600"}`}>
                    {outcome}
                  </p>
                  <details className="mt-1.5">
                    <summary className="cursor-pointer text-[11px] font-medium text-primary">
                      View input payload
                    </summary>
                    <div className="mt-1">
                      {a.result && (a.result as any).input != null && Object.keys((a.result as any).input).length > 0 ? (
                        <div>
                          <div className="mb-1 flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => copyPayload(a, i + 1)}
                              className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] font-medium hover:bg-muted"
                            >
                              <Copy className="h-3 w-3" /> Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadPayload(a, i + 1)}
                              className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] font-medium hover:bg-muted"
                            >
                              <Download className="h-3 w-3" /> Download JSON
                            </button>
                          </div>
                          <pre className="max-h-40 overflow-auto rounded bg-muted/60 p-2 text-[11px] whitespace-pre-wrap break-words">
                            {JSON.stringify((a.result as any).input, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          No input was recorded for this attempt — it ran with the job's default parameters.
                        </p>
                      )}
                    </div>
                  </details>
                  {a.result && Object.keys(a.result as any).length > 0 ? (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[11px] font-medium text-primary">View full output</summary>
                      <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted/60 p-2 text-[11px] whitespace-pre-wrap break-words">
                        {JSON.stringify(a.result, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>

        {attempts.length > 1 ? (
          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide">Compare attempt payloads</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                className="rounded border border-border bg-background px-2 py-1.5"
                value={diffA ?? ""}
                onChange={(e) => setDiffA(e.target.value === "" ? null : Number(e.target.value))}
              >
                <option value="">First attempt…</option>
                {attempts.map((_, i) => (
                  <option key={i} value={i}>Attempt {i + 1}</option>
                ))}
              </select>
              <span className="text-muted-foreground">vs</span>
              <select
                className="rounded border border-border bg-background px-2 py-1.5"
                value={diffB ?? ""}
                onChange={(e) => setDiffB(e.target.value === "" ? null : Number(e.target.value))}
              >
                <option value="">Second attempt…</option>
                {attempts.map((_, i) => (
                  <option key={i} value={i}>Attempt {i + 1}</option>
                ))}
              </select>
              {diffA != null && diffB != null && diffA !== diffB ? (
                <div className="ml-auto flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => scrollToAttempt(diffA)}
                    className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] font-medium hover:bg-muted"
                  >
                    <Target className="h-3 w-3" /> Jump to attempt {diffA + 1}
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToAttempt(diffB)}
                    className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] font-medium hover:bg-muted"
                  >
                    <Target className="h-3 w-3" /> Jump to attempt {diffB + 1}
                  </button>
                </div>
              ) : null}
            </div>
            {diffA != null && diffB != null && diffA !== diffB ? (() => {
              const ta = payloadText(attempts[diffA]);
              const tb = payloadText(attempts[diffB]);
              if (!ta || !tb)
                return (
                  <p className="mt-2 text-xs text-muted-foreground">
                    One of the selected attempts has no recorded payload to compare.
                  </p>
                );
              const rows = diffLines(ta.split("\n"), tb.split("\n"));
              const changed = rows.some((r) => r.type !== "same");
              const summary = changed ? summarizeDiff(attemptPayload(attempts[diffA]), attemptPayload(attempts[diffB])) : null;
              return (
                <div className="mt-2">
                  {summary ? (
                    <div className="mb-2 space-y-1 rounded border border-border bg-muted/40 p-2 text-[11px]">
                      <p className="font-display text-[11px] font-bold uppercase tracking-wide">
                        Summary: {summary.added.length} added · {summary.removed.length} removed · {summary.changed.length} changed
                      </p>
                      {summary.added.length > 0 ? (
                        <div className="space-y-0.5">
                          <p className="font-medium text-success">+ Added (in attempt {diffB + 1}):</p>
                          {summary.added.slice(0, 12).map((f) => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => scrollToAttempt(diffB)}
                              title={`Jump to attempt ${diffB + 1}`}
                              className="flex w-full items-center gap-1.5 rounded px-2 py-0.5 pl-4 text-left text-success hover:bg-success/10"
                            >
                              <span className="flex-1 truncate font-mono">{f}</span>
                              <Target className="h-3 w-3 shrink-0 opacity-60" />
                            </button>
                          ))}
                          {summary.added.length > 12 ? (
                            <p className="pl-4 text-muted-foreground">…and {summary.added.length - 12} more</p>
                          ) : null}
                        </div>
                      ) : null}
                      {summary.removed.length > 0 ? (
                        <div className="space-y-0.5">
                          <p className="font-medium text-destructive">− Removed (from attempt {diffA + 1}):</p>
                          {summary.removed.slice(0, 12).map((f) => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => scrollToAttempt(diffA)}
                              title={`Jump to attempt ${diffA + 1}`}
                              className="flex w-full items-center gap-1.5 rounded px-2 py-0.5 pl-4 text-left text-destructive hover:bg-destructive/10"
                            >
                              <span className="flex-1 truncate font-mono">{f}</span>
                              <Target className="h-3 w-3 shrink-0 opacity-60" />
                            </button>
                          ))}
                          {summary.removed.length > 12 ? (
                            <p className="pl-4 text-muted-foreground">…and {summary.removed.length - 12} more</p>
                          ) : null}
                        </div>
                      ) : null}
                      {summary.changed.length > 0 ? (
                        <div className="space-y-0.5">
                          <p className="font-medium text-amber-600">~ Changed:</p>
                          {summary.changed.slice(0, 12).map((c) => (
                            <div key={c.path} className="flex items-center gap-1.5 pl-2 text-muted-foreground">
                              <span className="flex-1 truncate">
                                <span className="font-medium text-foreground">{c.path}</span>:{" "}
                                <span className="text-destructive line-through">{c.from}</span> →{" "}
                                <span className="text-success">{c.to}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => scrollToAttempt(diffA)}
                                title={`Jump to attempt ${diffA + 1} (old value)`}
                                className="inline-flex shrink-0 items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium hover:bg-muted"
                              >
                                <Target className="h-2.5 w-2.5" /> A{diffA + 1}
                              </button>
                              <button
                                type="button"
                                onClick={() => scrollToAttempt(diffB)}
                                title={`Jump to attempt ${diffB + 1} (new value)`}
                                className="inline-flex shrink-0 items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium hover:bg-muted"
                              >
                                <Target className="h-2.5 w-2.5" /> A{diffB + 1}
                              </button>
                            </div>
                          ))}
                          {summary.changed.length > 12 ? (
                            <p className="pl-2 text-muted-foreground">…and {summary.changed.length - 12} more</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-1 text-[11px] font-medium text-muted-foreground">
                    <span>Attempt {diffA + 1}</span>
                    <span>Attempt {diffB + 1}</span>
                  </div>
                  {!changed ? (
                    <p className="mt-1 text-xs text-muted-foreground">The two payloads are identical.</p>
                  ) : null}
                  <div className="mt-1 grid max-h-72 grid-cols-2 gap-1 overflow-auto rounded bg-muted/60 p-2 font-mono text-[11px]">
                    {rows.map((r, k) => (
                      <div key={k} className="contents">
                        <div className={`whitespace-pre-wrap break-words rounded px-1 ${r.type === "del" ? "bg-destructive/15 text-destructive" : "text-muted-foreground"}`}>
                          {r.a ?? ""}
                        </div>
                        <div className={`whitespace-pre-wrap break-words rounded px-1 ${r.type === "add" ? "bg-success/15 text-success" : "text-muted-foreground"}`}>
                          {r.b ?? ""}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Red = only in attempt {diffA + 1}; green = only in attempt {diffB + 1}.
                  </p>
                </div>
              );
            })() : diffA != null && diffB != null ? (
              <p className="mt-2 text-xs text-muted-foreground">Pick two different attempts to compare.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
