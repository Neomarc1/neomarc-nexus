/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FlaskConical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/system/test-data")({
  head: () => ({
    meta: [
      { title: "Test Data Safety — NEOMARC NDOS" },
      {
        name: "description",
        content:
          "Review and remove NEOMARC pilot test records safely. Real customer and financial records are never touched.",
      },
      { property: "og:title", content: "Test Data Safety — NEOMARC NDOS" },
      { property: "og:description", content: "Review and clean up pilot test records safely." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireRole level="super_admin">
      <TestDataPage />
    </RequireRole>
  ),
});

const LABELS: Record<string, string> = {
  leads: "Test leads",
  inspections: "Test inspections",
  reservations: "Test reservations",
  sales: "Test sales",
  payments: "Test payments",
  documents: "Test documents",
  customers: "Test customers",
  commissions: "Commissions on test sales",
  schedule_rows: "Schedule rows on test sales",
  allocations: "Allocations on test sales",
};

function TestDataPage() {
  const qc = useQueryClient();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: report, isLoading } = useQuery({
    queryKey: ["test-data-report"],
    queryFn: async () => {
      const { data, error } = await db.rpc("test_data_report");
      if (error) throw error;
      return (data ?? {}) as Record<string, number>;
    },
  });

  const total = Object.values(report ?? {}).reduce((a, b) => a + Number(b), 0);

  async function purge() {
    setBusy(true);
    const { error } = await db.rpc("purge_test_data");
    setBusy(false);
    if (error) {
      toast.error("Cleanup failed. Only a Super Admin can remove test data.");
      return;
    }
    toast.success("Test data removed. The action was written to the audit log.");
    setConfirmText("");
    await qc.invalidateQueries();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Test Data Safety"
        description="Only records explicitly flagged as test data can be removed here."
      />

      <div className="surface-card p-4">
        <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide">
          What is marked as test data
        </p>
        {isLoading ? (
          <p className="py-6 text-center text-muted-foreground">Loading…</p>
        ) : total === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No test records exist. Nothing would be removed.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(report ?? {}).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
              >
                <span>{LABELS[k] ?? k}</span>
                <span className="font-display font-bold">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="surface-card space-y-3 border-destructive/30 p-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-destructive" />
          <p className="font-display text-sm font-bold uppercase tracking-wide">Cleanup tool</p>
        </div>
        <p className="text-sm text-muted-foreground">
          This removes only records flagged as test data, together with the schedules, commissions
          and allocations attached to test sales. Real customer records and real financial
          transactions are never deleted, and the cleanup is written to the audit log.
        </p>
        <div className="space-y-1.5">
          <Label className="text-xs">Type DELETE TEST DATA to enable the button</Label>
          <Input
            className="h-11"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE TEST DATA"
          />
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="h-11"
              disabled={confirmText !== "DELETE TEST DATA" || total === 0 || busy}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Remove test data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {total} test records?</AlertDialogTitle>
              <AlertDialogDescription>
                {Object.entries(report ?? {})
                  .filter(([, v]) => Number(v) > 0)
                  .map(([k, v]) => `${v} × ${LABELS[k] ?? k}`)
                  .join(", ") || "Nothing to remove"}
                . This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={purge}>Yes, remove test data</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
