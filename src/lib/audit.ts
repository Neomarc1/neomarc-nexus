import { supabase } from "@/integrations/supabase/client";

export async function logAudit(params: {
  action: string;
  table: string;
  recordId?: string | null;
  previous?: unknown;
  next?: unknown;
}) {
  const { data } = await supabase.auth.getUser();
  await supabase.from("audit_logs").insert({
    user_id: data.user?.id ?? null,
    user_email: data.user?.email ?? null,
    action: params.action,
    table_name: params.table,
    record_id: params.recordId ?? null,
    previous_value: (params.previous ?? null) as never,
    new_value: (params.next ?? null) as never,
  });
}
