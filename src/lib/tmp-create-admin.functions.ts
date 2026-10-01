import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const tmpCreateAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email: z.string().email(), password: z.string().min(6) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: "Super Admin" },
    });
    if (error) return { error: error.message };
    const uid = created.user.id;
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: uid, role: "super_admin" }, { onConflict: "user_id,role" });
    return { uid, roleError: rErr?.message ?? null };
  });
