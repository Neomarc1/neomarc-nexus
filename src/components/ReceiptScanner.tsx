/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Upload } from "lucide-react";
import { analyzeReceipt } from "@/lib/receipt-ai.functions";
import { db } from "@/lib/db";
import { useLookup } from "@/components/CrudModule";
import { useCurrentUser } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const toBase64 = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = rej;
    r.readAsDataURL(f);
  });

export function ReceiptScanner() {
  const analyze = useServerFn(analyzeReceipt);
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const { data: accounts = [] } = useLookup("chart_of_accounts", "name", ["is_active", true]);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<any>(null);

  const run = async () => {
    if (file && file.size > 10 * 1024 * 1024) return toast.error("File is larger than 10 MB.");
    setBusy(true);
    try {
      const out = await analyze({
        data: {
          text: notes || undefined,
          file: file ? { dataBase64: await toBase64(file), mimeType: file.type } : undefined,
        },
      });
      setDraft(out);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!draft?.amount || !draft?.expense_date) return toast.error("Amount and date are required.");
    let receipt_path: string | null = null;
    if (file) {
      const path = `receipts/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await db.storage.from("documents").upload(path, file);
      if (!error) receipt_path = path;
    }
    const { error } = await db.from("expenses").insert({
      amount: draft.amount, expense_date: draft.expense_date, vendor: draft.vendor,
      method: draft.method, description: draft.description, account_id: draft.account_id,
      category: "other", status: "pending", receipt_path, created_by: me?.user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Expense saved as pending");
    setDraft(null); setFile(null); setNotes("");
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries();
  };

  const set = (k: string, v: any) => setDraft((d: any) => ({ ...d, [k]: v }));

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm font-bold uppercase tracking-wide">AI receipt capture</h2>
      </div>
      <p className="text-sm text-muted-foreground">Upload a receipt photo or PDF, or type the details. AI fills in the expense and suggests an account — you check it before saving.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Receipt (photo or PDF)</Label>
          <Input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className="space-y-1">
          <Label>Or describe the expense</Label>
          <Textarea rows={2} placeholder="e.g. Paid ₦85,000 cash to Ade Prints for flyers on 20 Sept" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <Button onClick={run} disabled={busy || (!file && !notes.trim())}>
        <Upload className="mr-2 h-4 w-4" />{busy ? "Reading…" : "Extract details"}
      </Button>

      {draft && (
        <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label>Vendor</Label><Input value={draft.vendor ?? ""} onChange={(e) => set("vendor", e.target.value)} /></div>
            <div className="space-y-1"><Label>Amount (₦)</Label><Input type="number" value={draft.amount ?? ""} onChange={(e) => set("amount", Number(e.target.value))} /></div>
            <div className="space-y-1"><Label>Date</Label><Input type="date" value={draft.expense_date ?? ""} onChange={(e) => set("expense_date", e.target.value)} /></div>
            <div className="space-y-1"><Label>Payment method</Label>
              <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={draft.method ?? ""} onChange={(e) => set("method", e.target.value || null)}>
                <option value="">—</option><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="pos">POS</option><option value="cheque">Cheque</option>
              </select></div>
            <div className="space-y-1 sm:col-span-2"><Label>Account {draft.account_id && <span className="text-xs text-primary">(AI suggested{draft.confidence != null ? `, ${Math.round(draft.confidence * 100)}% sure` : ""})</span>}</Label>
              <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={draft.account_id ?? ""} onChange={(e) => set("account_id", e.target.value || null)}>
                <option value="">— choose —</option>
                {accounts.map((a: any) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
              {draft.reasoning && <p className="text-xs text-muted-foreground">{draft.reasoning}</p>}
            </div>
            <div className="space-y-1 sm:col-span-2"><Label>Description</Label><Input value={draft.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save}>Save expense</Button>
            <Button variant="outline" onClick={() => setDraft(null)}>Discard</Button>
          </div>
        </div>
      )}
    </section>
  );
}
