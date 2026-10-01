import { createServerFn } from "@tanstack/react-start";

export const tmpCreateAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = "sontomneverdies@gmail.com";
  const password = "Nx-_HTrqIBbxwM29f-5";
  let userId: string | undefined;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Super Admin" },
  });
  if (error) {
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const u = list?.users.find((x) => x.email === email);
    if (!u) return { ok: false, error: error.message };
    userId = u.id;
    const { error: e2 } = await supabaseAdmin.auth.admin.updateUserById(u.id, { password, email_confirm: true });
    if (e2) return { ok: false, error: e2.message };
  } else userId = data.user.id;
  const { error: re } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId!, role: "super_admin" }, { onConflict: "user_id,role" });
  return { ok: !re, userId, roleError: re?.message };
});
