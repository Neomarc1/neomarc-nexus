/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Users, Plus, Search, NotebookPen } from "lucide-react";
import { db, type Row } from "@/lib/db";
import { useCurrentUser } from "@/hooks/useAuth";
import { PageHeader } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { ContactActions } from "@/components/ContactActions";
import { ActivityDialog } from "@/components/ops/ActivityDialog";
import { RecordDialog, useLookup } from "@/components/CrudModule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, formatNaira, titleCase, todayLagos } from "@/lib/format";
import { toast } from "sonner";

type Filter = "all" | "new" | "followups" | "hot";

export const Route = createFileRoute("/_authenticated/my-work/leads/")({
  validateSearch: (search: Record<string, unknown>) => ({
    filter: (["all", "new", "followups", "hot"].includes(String(search['filter']))
      ? String(search['filter'])
      : "all") as Filter,
  }),
  head: () => ({
    meta: [
      { title: "My Leads — NEOMARC NDOS" },
      { name: "description", content: "Leads assigned to you, with one-tap call, WhatsApp and activity logging." },
      { property: "og:title", content: "My Leads — NEOMARC NDOS" },
      { property: "og:description", content: "Leads assigned to you with one-tap contact actions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyLeadsPage,
});

function MyLeadsPage() {
  const { filter } = Route.useSearch();
  const navigate = useNavigate();
  const { data: me } = useCurrentUser();
  const realtorId = me?.realtorId ?? null;
  const today = todayLagos();
  const [term, setTerm] = useState("");
  const [activityFor, setActivityFor] = useState<Row | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const estates = useLookup("estates", "name");

  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ["my-work", "leads", realtorId],
    enabled: !!me,
    queryFn: async () => {
      let q = db.from("leads").select("*").order("created_at", { ascending: false });
      if (realtorId) q = q.eq("realtor_id", realtorId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Row[];
    },
  });

  const rows = useMemo(() => {
    let out = leads;
    if (filter === "new") out = out.filter((l) => l.status === "new");
    if (filter === "hot") out = out.filter((l) => l.temperature === "hot");
    if (filter === "followups")
      out = out.filter((l) => l.next_followup_at && String(l.next_followup_at).slice(0, 10) <= today);
    const t = term.trim().toLowerCase();
    if (t)
      out = out.filter((l) =>
        [l.full_name, l.phone, l.email, l.location, l.ref].some((v: any) =>
          String(v ?? "").toLowerCase().includes(t),
        ),
      );
    return out;
  }, [leads, filter, term, today]);

  const estateName = (id?: string | null) =>
    estates.data?.find((e: any) => e.value === id)?.label ?? "—";

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Leads"
        description="Everyone you are responsible for contacting."
        action={
          <Button className="h-11" onClick={() => setNewOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> New lead
          </Button>
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 pl-9"
          placeholder="Search name or phone…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all", "new", "followups", "hot"] as Filter[]).map((f) => (
          <Button
            key={f}
            size="sm"
            className="h-10 shrink-0"
            variant={filter === f ? "default" : "outline"}
            onClick={() => navigate({ to: "/my-work/leads", search: { filter: f } })}
          >
            {f === "all" ? "All" : f === "followups" ? "Follow-ups due" : titleCase(f)}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No leads assigned yet."
          description="New enquiries assigned to you will appear here."
          action={
            <Button className="h-11" onClick={() => setNewOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Create a lead
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((l) => (
            <div key={l.id} className="surface-card space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{l.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {estateName(l.estate_id)} · {formatNaira(l.budget, true)}
                  </p>
                </div>
                <StatusBadge value={l.temperature} />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <StatusBadge value={l.status} />
                <span>Last contact: {formatDate(l.last_contact_at)}</span>
                <span>Next: {formatDate(l.next_followup_at)}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <ContactActions phone={l.phone} whatsapp={l.whatsapp} name={l.full_name} />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10"
                    onClick={() => setActivityFor(l)}
                  >
                    <NotebookPen className="mr-1 h-4 w-4" /> Log
                  </Button>
                  <Button
                    size="sm"
                    className="h-10"
                    onClick={() => navigate({ to: "/my-work/leads/$leadId", params: { leadId: l.id } })}
                  >
                    View
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activityFor ? (
        <ActivityDialog
          leadId={activityFor.id}
          leadName={activityFor.full_name}
          open={!!activityFor}
          onOpenChange={(v) => !v && setActivityFor(null)}
        />
      ) : null}

      {newOpen ? (
        <RecordDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          title="New lead"
          description="Capture the enquiry now — you can qualify it later."
          fields={[
            { name: "full_name", label: "Full name", required: true },
            { name: "phone", label: "Phone", required: true },
            { name: "whatsapp", label: "WhatsApp" },
            { name: "email", label: "Email", type: "email" },
            { name: "location", label: "Location" },
            { name: "source", label: "Source" },
            { name: "estate_id", label: "Estate of interest", type: "select", lookup: { table: "estates", labelKey: "name" } },
            { name: "budget", label: "Budget (₦)", type: "number" },
            { name: "next_followup_at", label: "Next follow-up", type: "date" },
            { name: "notes", label: "Notes", type: "textarea", full: true },
          ]}
          onSubmit={async (values) => {
            const { data: auth } = await db.auth.getUser();
            const { error } = await db.from("leads").insert({
              ...values,
              country: "Nigeria",
              status: "new",
              temperature: "warm",
              realtor_id: realtorId,
              created_by: auth.user?.id,
              updated_by: auth.user?.id,
            });
            if (error) {
              toast.error(error.message);
              return;
            }
            toast.success("Lead created");
            setNewOpen(false);
            refetch();
          }}
        />
      ) : null}
    </div>
  );
}
