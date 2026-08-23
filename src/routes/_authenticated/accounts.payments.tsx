/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Plus, Receipt, XCircle } from "lucide-react";
import { db, type Row } from "@/lib/db";
import { PageHeader } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { RecordDialog } from "@/components/CrudModule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, formatNaira, titleCase, todayLagos } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/accounts/payments")({
  head: () => ({
    meta: [
      { title: "Payment Verification Queue — NEOMARC NDOS" },
      { name: "description", content: "Verify or reject customer payments and issue NEOMARC receipts in one pass." },
      { property: "og:title", content: "Payment Verification Queue — NEOMARC NDOS" },
      { property: "og:description", content: "Verify or reject customer payments and issue receipts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerificationQueuePage,
});

function VerificationQueuePage() {
  const qc = useQueryClient();
  const today = todayLagos();
  const [term, setTerm] = useState("");
  const [recordOpen, setRecordOpen] = useState(false);
  const [tab, setTab] = useState<"pending" | "verified">("pending");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["accounts", "queue", tab],
    queryFn: async () => {
      const { data, error } = await db
        .from("payments")
        .select("*, customers(full_name, phone), sales(ref)")
        .eq("status", tab)
        .order("payment_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Row[];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ row, verified }: { row: Row; verified: boolean }) => {
      const { data: auth } = await db.auth.getUser();
      const values: any = verified
        ? {
            status: "verified",
            verified_by: auth.user?.id ?? null,
            verified_at: new Date().toISOString(),
            receipt_number: row.receipt_number ?? `RCP-${Date.now().toString().slice(-8)}`,
          }
        : { status: "failed", verified_by: auth.user?.id ?? null, verified_at: new Date().toISOString() };
      const { error } = await db.from("payments").update(values).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.verified ? "Payment verified and receipted" : "Payment rejected");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = rows.filter((r) => {
    const t = term.trim().toLowerCase();
    if (!t) return true;
    return [r.customers?.full_name, r.transaction_reference, r.receipt_number, r.ref, r.sales?.ref]
      .map((v: any) => String(v ?? "").toLowerCase())
      .join(" ")
      .includes(t);
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payment Verification"
        description="Confirm money actually landed before it counts."
        action={
          <Button className="h-11" onClick={() => setRecordOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Record payment
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          {(["pending", "verified"] as const).map((t) => (
            <Button
              key={t}
              variant={tab === t ? "default" : "outline"}
              className="h-11"
              onClick={() => setTab(t)}
            >
              {titleCase(t)}
            </Button>
          ))}
        </div>
        <Input
          className="h-11 sm:max-w-xs"
          placeholder="Search customer or reference…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={tab === "pending" ? "Verification queue is clear." : "No verified payments yet."}
          description={tab === "pending" ? "New lodgements will appear here." : ""}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((p) => (
            <div key={p.id} className="surface-card space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.customers?.full_name ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(p.payment_date)} · {titleCase(p.method)} · {p.sales?.ref ?? "No sale"}
                  </p>
                </div>
                <StatusBadge value={p.status} />
              </div>
              <p className="font-display text-xl font-bold">{formatNaira(p.amount)}</p>
              <p className="text-xs text-muted-foreground">
                Ref: {p.transaction_reference ?? "—"}
                {p.receipt_number ? ` · Receipt ${p.receipt_number}` : ""}
                {p.bank_account ? ` · ${p.bank_account}` : ""}
              </p>
              {p.status === "pending" ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-11 flex-1"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ row: p, verified: true })}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" /> Verify
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-11 flex-1 text-destructive"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ row: p, verified: false })}
                  >
                    <XCircle className="mr-1 h-4 w-4" /> Reject
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {recordOpen ? (
        <RecordDialog
          open={recordOpen}
          onOpenChange={setRecordOpen}
          title="Record payment"
          fields={[
            { name: "customer_id", label: "Customer", type: "select", lookup: { table: "customers", labelKey: "full_name" }, required: true },
            { name: "sale_id", label: "Sale", type: "select", lookup: { table: "sales", labelKey: "ref" } },
            { name: "amount", label: "Amount (₦)", type: "number", required: true },
            { name: "payment_date", label: "Payment date", type: "date", required: true },
            {
              name: "method",
              label: "Method",
              type: "select",
              options: ["bank_transfer", "cash", "pos", "cheque", "online"].map((v) => ({
                value: v,
                label: titleCase(v),
              })),
            },
            { name: "bank_account", label: "Bank account" },
            { name: "transaction_reference", label: "Transaction reference" },
            { name: "narration", label: "Narration", type: "textarea", full: true },
          ]}
          initial={{ payment_date: today, method: "bank_transfer" }}
          onSubmit={async (values) => {
            const { data: auth } = await db.auth.getUser();
            const { error } = await db.from("payments").insert({
              ...values,
              status: "pending",
              created_by: auth.user?.id,
              updated_by: auth.user?.id,
            });
            if (error) {
              toast.error(error.message);
              return;
            }
            toast.success("Payment lodged for verification");
            setRecordOpen(false);
            setTab("pending");
            qc.invalidateQueries();
          }}
        />
      ) : null}
    </div>
  );
}
