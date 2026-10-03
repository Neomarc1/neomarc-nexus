import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractExpense } from "./receipt-ai.server";

const Input = z.object({
  text: z.string().max(5000).optional(),
  file: z
    .object({
      dataBase64: z.string().max(14_000_000),
      mimeType: z.string().regex(/^(image\/(png|jpe?g|webp|gif)|application\/pdf)$/),
    })
    .optional(),
});

export const analyzeReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { data: fin } = await context.supabase.rpc("can_finance", { _user_id: context.userId });
    const { data: adm } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!fin && !adm) throw new Error("Only finance staff can use receipt scanning.");
    if (!data.text?.trim() && !data.file) throw new Error("Upload a receipt or type the expense details.");

    const { data: accounts, error } = await context.supabase
      .from("chart_of_accounts")
      .select("id, code, name, description")
      .eq("is_active", true)
      .eq("account_type", "expense")
      .order("code");
    if (error) throw new Error(error.message);

    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this app.");

    try {
      const out = await extractExpense({ apiKey, text: data.text, file: data.file, accounts: accounts ?? [] });
      const acct = (accounts ?? []).find((a) => a.code === out.account_code);
      return { ...out, account_id: acct?.id ?? null, account_name: acct?.name ?? null };
    } catch (e: any) {
      const status = e?.statusCode ?? e?.status;
      if (status === 429) throw new Error("The AI is busy right now. Please wait a minute and try again.");
      if (status === 402) throw new Error("AI credits have run out. Add credits in Settings → Plans & credits.");
      if (status === 403) throw new Error("AI access is blocked for this workspace. Ask a workspace admin.");
      throw new Error(e?.message ?? "Receipt analysis failed.");
    }
  });
