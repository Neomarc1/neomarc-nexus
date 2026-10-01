import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/tmp-create-admin")({
  server: { handlers: { GET: async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = "sontomneverdies@gmail.com";
    let uid: string | undefined;
    const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password: "Ebuks404", email_confirm: true, user_metadata: { full_name: "Super Admin" } });
    if (error) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const u = list?.users.find((x) => x.email === email);
      if (!u) return Response.json({ error: error.message });
      uid = u.id;
      await supabaseAdmin.auth.admin.updateUserById(uid, { password: "Ebuks404", email_confirm: true });
    } else uid = data.user.id;
    const { error: r } = await supabaseAdmin.from("user_roles").upsert({ user_id: uid!, role: "super_admin" }, { onConflict: "user_id,role" });
    return Response.json({ uid, roleError: r?.message ?? null });
  } } },
});
