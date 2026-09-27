import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

const RUN_ID = "X-Lovable-AIG-Run-ID";
const MODEL = "openai/gpt-6-astra";

function runIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_ID)) headers.set(RUN_ID, runId);
    const res = await fetch(input, { ...init, headers });
    runId ??= res.headers.get(RUN_ID)?.trim() || undefined;
    return res;
  };
}

export type Extraction = {
  vendor: string | null;
  amount: number | null;
  expense_date: string | null;
  method: string | null;
  description: string | null;
  account_code: string | null;
  confidence: number | null;
  reasoning: string | null;
};

export async function extractExpense(opts: {
  apiKey: string;
  text?: string | undefined;
  file?: { dataBase64: string; mimeType: string } | undefined;
  accounts: { code: string; name: string; description: string | null }[];
}): Promise<Extraction> {
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: opts.apiKey,
    headers: { "Lovable-API-Key": opts.apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch(),
  });

  const chart = opts.accounts.map((a) => `${a.code} — ${a.name}${a.description ? ` (${a.description})` : ""}`).join("\n");
  const instructions = `You are a finance assistant for a Nigerian real estate company (currency NGN ₦, Lagos time).
Extract the expense transaction from the receipt and/or notes, and recommend the best matching account from this chart of accounts:
${chart}

Reply with ONLY a JSON object, no markdown, with keys:
vendor (string|null), amount (number in Naira, no commas|null), expense_date (YYYY-MM-DD|null),
method (one of "bank_transfer","cash","pos","cheque" or null), description (short string|null),
account_code (a code from the list above, or null), confidence (0-1), reasoning (one short sentence on why that account).
Use null for anything not present. Never invent amounts or dates.`;

  const content: Exclude<ModelMessage["content"], string> = [
    { type: "text", text: opts.text?.trim() ? `Notes from staff:\n${opts.text}` : "No extra notes." },
  ] as never;
  if (opts.file) {
    (content as unknown[]).push(
      opts.file.mimeType.startsWith("image/")
        ? { type: "image", image: opts.file.dataBase64, mediaType: opts.file.mimeType }
        : { type: "file", data: opts.file.dataBase64, mediaType: opts.file.mimeType, filename: "receipt.pdf" },
    );
  }

  const result = streamText({
    model: provider.responses(MODEL),
    system: instructions,
    messages: [{ role: "user", content } as ModelMessage],
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = await result.text;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("The AI could not read this receipt. Try a clearer photo or add notes.");
  const raw = JSON.parse(match[0]);
  const codes = new Set(opts.accounts.map((a) => a.code));
  const amount = raw.amount == null ? null : Number(String(raw.amount).replace(/[^\d.]/g, ""));
  return {
    vendor: raw.vendor ?? null,
    amount: Number.isFinite(amount) ? amount : null,
    expense_date: /^\d{4}-\d{2}-\d{2}$/.test(raw.expense_date ?? "") ? raw.expense_date : null,
    method: ["bank_transfer", "cash", "pos", "cheque"].includes(raw.method) ? raw.method : null,
    description: raw.description ?? null,
    account_code: codes.has(raw.account_code) ? raw.account_code : null,
    confidence: typeof raw.confidence === "number" ? Math.max(0, Math.min(1, raw.confidence)) : null,
    reasoning: raw.reasoning ?? null,
  };
}
