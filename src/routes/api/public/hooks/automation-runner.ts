import { createFileRoute } from "@tanstack/react-router";

/**
 * Background automation runner.
 *
 * Called on a schedule (pg_cron) over HTTP. Every invocation:
 *  - authenticates with a shared secret header
 *  - asks the database runner for a bounded batch of due jobs + due retries
 *  - the database holds a single-flight lease per job, so overlapping calls no-op
 */
export const Route = createFileRoute("/api/public/hooks/automation-runner")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["AUTOMATION_RUNNER_SECRET"];
        const provided = request.headers.get("x-automation-secret") ?? "";
        if (!secret || provided !== secret) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let limit = 5;
        try {
          const body = (await request.json()) as { limit?: number };
          if (typeof body?.limit === "number" && body.limit > 0 && body.limit <= 25) limit = body.limit;
        } catch {
          /* empty body is fine */
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("run_due_automations" as never, {
          _limit: limit,
          _actor: "scheduler",
        } as never);

        if (error) {
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, result: data }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
