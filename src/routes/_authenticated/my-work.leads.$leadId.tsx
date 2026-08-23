/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CalendarCheck, NotebookPen, UserPlus } from "lucide-react";
import { db, type Row } from "@/lib/db";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { ContactActions } from "@/components/ContactActions";
import { ActivityDialog } from "@/components/ops/ActivityDialog";
import { RecordDialog } from "@/components/CrudModule";
import { Timeline } from "@/components/Timeline";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatNaira, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/my-work/leads/$leadId")({
  head: () => ({
    meta: [
      { title: "Lead Detail — NEOMARC NDOS" },
      { name: "description", content: "Full lead profile, activity history and next actions for NEOMARC realtors." },
      { property: "og:title", content: "Lead Detail — NEOMARC NDOS" },
      { property: "og:description", content: "Lead profile, activity history and next actions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeadDetailPage,
});

function Row2({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? "—"}</span>
    </div>
  );
}

function LeadDetailPage() {
  const { leadId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activityOpen, setActivityOpen] = useState(false);
  const [inspectionOpen, setInspectionOpen] = useState(false);

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: async () => {
      const { data, error } = await db
        .from("leads")
        .select("*, estates(name, location), realtors(full_name)")
        .eq("id", leadId)
        .maybeSingle();
      if (error) throw error;
      return data as Row | null;
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["lead-activities", leadId],
    queryFn: async () => {
      const { data, error } = await db
        .from("lead_activities")
        .select("*")
        .eq("lead_id", leadId)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
  });

  const convert = useMutation({
    mutationFn: async () => {
      if (!lead) return;
      if (lead.customer_id) throw new Error("This lead is already a customer.");
      const { data: auth } = await db.auth.getUser();
      const { data: customer, error } = await db
        .from("customers")
        .insert({
          full_name: lead.full_name,
          phone: lead.phone,
          whatsapp: lead.whatsapp,
          email: lead.email,
          location: lead.location,
          country: lead.country ?? "Nigeria",
          realtor_id: lead.realtor_id,
          status: "active",
          created_by: auth.user?.id,
          updated_by: auth.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      const { error: e2 } = await db
        .from("leads")
        .update({ customer_id: customer.id, status: "qualified" })
        .eq("id", lead.id);
      if (e2) throw e2;
      return customer;
    },
    onSuccess: () => {
      toast.success("Lead converted to customer");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <p className="py-10 text-center text-muted-foreground">Loading…</p>;
  if (!lead) return <p className="py-10 text-center text-muted-foreground">Lead not found.</p>;

  return (
    <div className="space-y-5">
      <Button variant="ghost" className="h-10 px-2" onClick={() => navigate({ to: "/my-work/leads", search: { filter: "all" as const } })}>
        <ArrowLeft className="mr-1 h-4 w-4" /> My leads
      </Button>

      <PageHeader title={lead.full_name} description={`${lead.ref} · ${titleCase(lead.source)}`} />

      <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
        <ContactActions phone={lead.phone} whatsapp={lead.whatsapp} name={lead.full_name} />
        <div className="flex flex-wrap gap-2">
          <StatusBadge value={lead.temperature} />
          <StatusBadge value={lead.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button className="h-14 flex-col gap-1 text-xs" onClick={() => setActivityOpen(true)}>
          <NotebookPen className="h-4 w-4" /> Add activity
        </Button>
        <Button
          variant="outline"
          className="h-14 flex-col gap-1 text-xs"
          onClick={() => setInspectionOpen(true)}
        >
          <CalendarCheck className="h-4 w-4" /> Book inspection
        </Button>
        <Button
          variant="outline"
          className="h-14 flex-col gap-1 text-xs"
          disabled={!!lead.customer_id || convert.isPending}
          onClick={() => convert.mutate()}
        >
          <UserPlus className="h-4 w-4" />
          {lead.customer_id ? "Converted" : "To customer"}
        </Button>
        <Button
          variant="outline"
          className="h-14 flex-col gap-1 text-xs"
          onClick={() => navigate({ to: "/properties/search" })}
        >
          Find property
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-4">
          <p className="mb-2 font-display text-sm font-bold uppercase tracking-wide">Contact</p>
          <Row2 label="Phone" value={lead.phone} />
          <Row2 label="WhatsApp" value={lead.whatsapp} />
          <Row2 label="Email" value={lead.email} />
          <Row2 label="Location" value={lead.location} />
          <Row2 label="Assigned realtor" value={lead.realtors?.full_name} />
        </div>

        <div className="surface-card p-4">
          <p className="mb-2 font-display text-sm font-bold uppercase tracking-wide">Interest</p>
          <Row2 label="Estate" value={lead.estates?.name} />
          <Row2 label="Budget" value={formatNaira(lead.budget)} />
          <Row2 label="Plot size" value={lead.preferred_plot_size} />
          <Row2 label="Purchase intent" value={titleCase(lead.purchase_intent)} />
          <Row2 label="Last contact" value={formatDateTime(lead.last_contact_at)} />
          <Row2 label="Next follow-up" value={formatDateTime(lead.next_followup_at)} />
        </div>
      </div>

      {lead.notes ? (
        <div className="surface-card p-4">
          <p className="mb-2 font-display text-sm font-bold uppercase tracking-wide">Notes</p>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{lead.notes}</p>
        </div>
      ) : null}

      <div className="surface-card p-4">
        <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Activity history</p>
        <Timeline
          empty="No activity logged yet. Tap Add activity after your first call."
          events={activities.map((a) => ({
            occurred_at: a.occurred_at,
            category: a.activity_type,
            event: a.summary,
            detail: [a.outcome, a.next_action ? `Next: ${a.next_action}` : null]
              .filter(Boolean)
              .join(" · "),
            actor: a.next_action_at ? `Due ${formatDate(a.next_action_at)}` : null,
          }))}
        />
      </div>

      <ActivityDialog
        leadId={lead.id}
        leadName={lead.full_name}
        open={activityOpen}
        onOpenChange={setActivityOpen}
      />

      {inspectionOpen ? (
        <RecordDialog
          open={inspectionOpen}
          onOpenChange={setInspectionOpen}
          title="Book inspection"
          fields={[
            { name: "estate_id", label: "Estate", type: "select", lookup: { table: "estates", labelKey: "name" }, required: true },
            { name: "scheduled_date", label: "Date", type: "date", required: true },
            { name: "scheduled_time", label: "Time", type: "time" },
            { name: "attendees", label: "Guests", type: "number" },
            { name: "escort", label: "Escort officer" },
            { name: "notes", label: "Notes", type: "textarea", full: true },
          ]}
          initial={{ estate_id: lead.estate_id, attendees: 1 }}
          onSubmit={async (values) => {
            const { data: auth } = await db.auth.getUser();
            const { error } = await db.from("inspections").insert({
              ...values,
              lead_id: lead.id,
              customer_id: lead.customer_id,
              realtor_id: lead.realtor_id,
              status: "scheduled",
              created_by: auth.user?.id,
              updated_by: auth.user?.id,
            });
            if (error) {
              toast.error(error.message);
              return;
            }
            toast.success("Inspection booked");
            setInspectionOpen(false);
            qc.invalidateQueries();
          }}
        />
      ) : null}
    </div>
  );
}
