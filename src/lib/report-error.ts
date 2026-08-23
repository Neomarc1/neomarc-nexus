import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";

export type ErrorReportInput = {
  pagePath?: string;
  actionAttempted?: string;
  errorSummary?: string;
  context?: Record<string, unknown>;
};

/** Safe, non-sensitive technical context captured with a report. */
export function captureTechnicalContext(extra: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return { ...extra };
  return {
    user_agent: window.navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    language: window.navigator.language,
    url: window.location.pathname + window.location.search,
    occurred_at: new Date().toISOString(),
    ...extra,
  };
}

/** Never surface raw database/system errors to ordinary users. */
export function safeErrorSummary(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
  return raw.slice(0, 500);
}

export async function submitErrorReport(input: ErrorReportInput) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const { error } = await db.from("error_reports").insert({
    user_id: user.id,
    user_email: user.email ?? null,
    user_role: (roleRows ?? []).map((r: { role: string }) => r.role).join(", ") || null,
    page_path: input.pagePath ?? (typeof window !== "undefined" ? window.location.pathname : null),
    action_attempted: input.actionAttempted ?? null,
    error_summary: input.errorSummary ?? null,
    technical_context: captureTechnicalContext(input.context ?? {}),
  });

  if (error) return { ok: false as const, error: "Could not send the report" };
  return { ok: true as const };
}
