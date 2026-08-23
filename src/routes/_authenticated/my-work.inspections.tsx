/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, Plus } from "lucide-react";
import { db, type Row } from "@/lib/db";
import { useCurrentUser } from "@/hooks/useAuth";
import { PageHeader } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { RecordDialog } from "@/components/CrudModule";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, todayLagos } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/my-work/inspections")({
  head: () => ({
    meta: [
      { title: "My Inspections — NEOMARC NDOS" },
      { name: "description", content: "Book, reschedule and complete NEOMARC estate inspections from the field." },
      { property: "og:title", content: "My Inspections — NEOMARC NDOS" },
      { property: "og:description", content: "Book, reschedule and complete estate inspections." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyInspectionsPage,
});

const OUTCOMES = ["Interested", "Needs Follow-up", "Negotiating", "Not Interested", "Reschedule", "Other"];

function MyInspectionsPage() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const realtorId = me?.realtorId ?? null;
  const today = todayLagos();
  const [bookOpen, setBookOpen] = useState(false);
  const [completing, setCompleting] = useState<Row | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [followup, setFollowup] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["my-work", "inspections", realtorId, "full"],
    enabled: !!me,
    queryFn: async () => {
      let q = db
        .from("inspections")
        .select("*, estates(name, location), leads(full_name, phone), customers(full_name, phone)")
        .order("scheduled_date", { ascending: false });
      if (realtorId) q = q.eq("realtor_id", realtorId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Row[];
    },
  });

  const patch = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: any }) => {
      const { error } = await db.from("inspections").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inspection updated");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const complete = useMutation({
    mutationFn: async () => {
      if (!completing || !outcome) throw new Error("Select what happened.");
      const { data: auth } = await db.auth.getUser();
      const { error } = await db
        .from("inspections")
        .update({
          status: outcome === "Reschedule" ? "rescheduled" : "completed",
          outcome,
          notes: notes || completing.notes,
          followup_date: followup || null,
        })
        .eq("id", completing.id);
      if (error) throw error;

      const { error: taskErr } = await db.from("tasks").insert({
        title: `Inspection follow-up: ${outcome}`,
        description: notes || `Follow up after estate inspection ${completing.ref}.`,
        category: "inspection_followup",
        priority: outcome === "Interested" || outcome === "Negotiating" ? "high" : "medium",
        due_date: followup || today,
        lead_id: completing.lead_id,
        customer_id: completing.customer_id,
        assigned_realtor_id: completing.realtor_id,
        assigned_to: auth.user?.id ?? null,
        status: "todo",
        created_by: auth.user?.id,
        updated_by: auth.user?.id,
      });
      if (taskErr) throw taskErr;
    },
    onSuccess: () => {
      toast.success("Inspection completed and follow-up task created");
      setCompleting(null);
      setOutcome(null);
      setNotes("");
      setFollowup("");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Inspections"
        description="Site visits you are escorting."
        action={
          <Button className="h-11" onClick={() => setBookOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Book inspection
          </Button>
        }
      />

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No inspections scheduled."
          description="Book a site visit as soon as a lead shows interest."
          action={
            <Button className="h-11" onClick={() => setBookOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Book inspection
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((i) => (
            <div key={i.id} className="surface-card space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {i.leads?.full_name ?? i.customers?.full_name ?? "Guest"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {i.estates?.name ?? "—"} · {formatDate(i.scheduled_date)}{" "}
                    {i.scheduled_time ? `· ${String(i.scheduled_time).slice(0, 5)}` : ""}
                  </p>
                </div>
                <StatusBadge value={i.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {i.attendees} guest(s){i.outcome ? ` · ${i.outcome}` : ""}
              </p>
              {!["completed", "cancelled"].includes(i.status) ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="h-10" onClick={() => setCompleting(i)}>
                    Mark completed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10"
                    onClick={() => {
                      const d = window.prompt("New date (YYYY-MM-DD)", i.scheduled_date);
                      if (d) patch.mutate({ id: i.id, values: { scheduled_date: d, status: "rescheduled" } });
                    }}
                  >
                    Reschedule
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 text-destructive"
                    onClick={() => patch.mutate({ id: i.id, values: { status: "cancelled" } })}
                  >
                    Cancel
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {bookOpen ? (
        <RecordDialog
          open={bookOpen}
          onOpenChange={setBookOpen}
          title="Book inspection"
          fields={[
            { name: "lead_id", label: "Lead", type: "select", lookup: { table: "leads", labelKey: "full_name" } },
            { name: "customer_id", label: "Customer", type: "select", lookup: { table: "customers", labelKey: "full_name" } },
            { name: "estate_id", label: "Estate", type: "select", lookup: { table: "estates", labelKey: "name" }, required: true },
            { name: "scheduled_date", label: "Date", type: "date", required: true },
            { name: "scheduled_time", label: "Time", type: "time" },
            { name: "attendees", label: "Guests", type: "number" },
            { name: "escort", label: "Escort officer" },
            { name: "notes", label: "Notes", type: "textarea", full: true },
          ]}
          initial={{ attendees: 1 }}
          onSubmit={async (values) => {
            const { data: auth } = await db.auth.getUser();
            const { error } = await db.from("inspections").insert({
              ...values,
              realtor_id: realtorId,
              status: "scheduled",
              created_by: auth.user?.id,
              updated_by: auth.user?.id,
            });
            if (error) {
              toast.error(error.message);
              return;
            }
            toast.success("Inspection booked");
            setBookOpen(false);
            qc.invalidateQueries();
          }}
        />
      ) : null}

      <Dialog open={!!completing} onOpenChange={(v) => !v && setCompleting(null)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] rounded-xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>What happened?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map((o) => (
                <Button
                  key={o}
                  variant={outcome === o ? "default" : "outline"}
                  className="h-12 text-xs"
                  onClick={() => setOutcome(o)}
                >
                  {o}
                </Button>
              ))}
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Follow-up date</Label>
              <Input type="date" value={followup} onChange={(e) => setFollowup(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-11" onClick={() => setCompleting(null)}>
              Cancel
            </Button>
            <Button className="h-11" disabled={complete.isPending} onClick={() => complete.mutate()}>
              Save outcome
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
