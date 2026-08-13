/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Sparkles, LayoutGrid, Table2 } from "lucide-react";
import { db, type Row } from "@/lib/db";
import { CrudModule, useLookup, type ColumnDef, type FieldDef } from "@/components/CrudModule";
import { PageHeader } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatNaira, formatDate, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({
    meta: [
      { title: "Leads & CRM Pipeline — NEOMARC NDOS" },
      {
        name: "description",
        content: "Capture, qualify and progress NEOMARC Realty leads through the full sales pipeline.",
      },
      { property: "og:title", content: "Leads & CRM Pipeline — NEOMARC NDOS" },
      { property: "og:description", content: "Capture, qualify and progress NEOMARC Realty leads." },
    ],
  }),
  component: LeadsPage,
});

const STAGES = [
  "new",
  "contacted",
  "qualified",
  "inspection_scheduled",
  "inspection_done",
  "negotiation",
  "reserved",
  "closed_won",
  "closed_lost",
];

const TEMPERATURES = ["hot", "warm", "cold"];

function LeadsPage() {
  const [view, setView] = useState<"pipeline" | "table">("pipeline");
  const qc = useQueryClient();
  const estates = useLookup("estates", "name");
  const realtors = useLookup("realtors", "full_name");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", "*"],
    queryFn: async () => {
      const { data, error } = await db.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead stage updated");
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const qualify = useMutation({
    mutationFn: async (lead: Row) => {
      let score = 40;
      if (Number(lead.budget) > 0) score += 20;
      if (lead.estate_id) score += 10;
      if (lead.purchase_intent === "immediate") score += 25;
      else if (lead.purchase_intent === "3_months") score += 15;
      if (lead.phone) score += 5;
      score = Math.min(score, 99);
      const temperature = score >= 75 ? "hot" : score >= 50 ? "warm" : "cold";
      const summary = `${lead.full_name} from ${lead.location ?? "unknown location"} with a budget of ${formatNaira(lead.budget)} interested in ${lead.preferred_plot_size ?? "any plot size"}.`;
      const recommendation =
        temperature === "hot"
          ? "Call within 24 hours and schedule an estate inspection immediately."
          : temperature === "warm"
            ? "Send estate brochure and payment plan options, follow up in 3 days."
            : "Add to nurture campaign and re-engage monthly.";
      const { error } = await db
        .from("leads")
        .update({ ai_score: score, temperature, ai_summary: summary, ai_recommendation: recommendation })
        .eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead qualified");
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const map: Record<string, Row[]> = {};
    for (const s of STAGES) map[s] = [];
    for (const l of leads) (map[l.status] ??= []).push(l);
    return map;
  }, [leads]);

  const fields: FieldDef[] = [
    { name: "full_name", label: "Full name", required: true },
    { name: "phone", label: "Phone", required: true },
    { name: "whatsapp", label: "WhatsApp" },
    { name: "email", label: "Email", type: "email" },
    { name: "location", label: "Location" },
    { name: "country", label: "Country", placeholder: "Nigeria" },
    { name: "source", label: "Source", type: "select", options: [
      "Facebook", "Instagram", "WhatsApp", "Referral", "Walk-in", "Website", "Realtor", "Event", "Cold Call",
    ].map((v) => ({ value: v, label: v })) },
    { name: "campaign", label: "Campaign" },
    { name: "estate_id", label: "Estate of interest", type: "select", lookup: { table: "estates", labelKey: "name" } },
    { name: "budget", label: "Budget (₦)", type: "number" },
    { name: "preferred_plot_size", label: "Preferred plot size" },
    { name: "purchase_intent", label: "Purchase intent", type: "select", options: [
      { value: "immediate", label: "Immediate" },
      { value: "3_months", label: "Within 3 months" },
      { value: "6_months", label: "Within 6 months" },
      { value: "just_exploring", label: "Just exploring" },
    ] },
    { name: "temperature", label: "Temperature", type: "select", options: TEMPERATURES.map((v) => ({ value: v, label: titleCase(v) })) },
    { name: "status", label: "Stage", type: "select", options: STAGES.map((v) => ({ value: v, label: titleCase(v) })) },
    { name: "realtor_id", label: "Assigned realtor", type: "select", lookup: { table: "realtors", labelKey: "full_name" } },
    { name: "next_followup_at", label: "Next follow-up", type: "date" },
    { name: "notes", label: "Notes", type: "textarea", full: true },
  ];

  const columns: ColumnDef[] = [
    { key: "ref", label: "Ref" },
    { key: "full_name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "source", label: "Source" },
    { key: "budget", label: "Budget", render: (r) => formatNaira(r.budget) },
    {
      key: "estate_id",
      label: "Estate",
      render: (r) => estates.data?.find((e: any) => e.value === r.estate_id)?.label ?? "—",
    },
    { key: "temperature", label: "Temp", render: (r) => <StatusBadge value={r.temperature} /> },
    { key: "status", label: "Stage", render: (r) => <StatusBadge value={r.status} /> },
    {
      key: "realtor_id",
      label: "Realtor",
      render: (r) => realtors.data?.find((e: any) => e.value === r.realtor_id)?.label ?? "—",
    },
    { key: "next_followup_at", label: "Follow-up", render: (r) => formatDate(r.next_followup_at) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads & CRM"
        description="Every enquiry, from first contact to allocation."
        action={
          <Button variant="outline" onClick={() => setView(view === "pipeline" ? "table" : "pipeline")}>
            {view === "pipeline" ? <Table2 className="mr-2 h-4 w-4" /> : <LayoutGrid className="mr-2 h-4 w-4" />}
            {view === "pipeline" ? "Table view" : "Pipeline view"}
          </Button>
        }
      />

      {view === "pipeline" ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <div key={stage} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-bold uppercase tracking-wide">{titleCase(stage)}</p>
                <span className="rounded-full bg-muted px-2 text-xs font-semibold">
                  {(grouped[stage] ?? []).length}
                </span>
              </div>
              <div className="space-y-2 rounded-xl bg-muted/40 p-2">
                {isLoading ? (
                  <p className="p-3 text-xs text-muted-foreground">Loading…</p>
                ) : (grouped[stage] ?? []).length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground">Empty</p>
                ) : (
                  (grouped[stage] ?? []).map((lead) => (
                    <div key={lead.id} className="surface-card space-y-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-tight">{lead.full_name}</p>
                        <StatusBadge value={lead.temperature} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {lead.phone} · {lead.source ?? "—"}
                      </p>
                      <p className="text-xs font-medium">{formatNaira(lead.budget)}</p>
                      {lead.ai_score ? (
                        <p className="text-[11px] text-muted-foreground">AI score: {lead.ai_score}/100</p>
                      ) : null}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => qualify.mutate(lead)}
                        >
                          <Sparkles className="mr-1 h-3 w-3" /> Qualify
                        </Button>
                        <select
                          className="h-7 rounded-md border border-border bg-background px-1 text-[11px]"
                          value={lead.status}
                          onChange={(e) => move.mutate({ id: lead.id, status: e.target.value })}
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              {titleCase(s)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <CrudModule
          table="leads"
          entityName="Lead"
          columns={columns}
          fields={fields}
          searchKeys={["ref", "full_name", "phone", "email", "location", "source"]}
          defaults={{ status: "new", temperature: "warm", country: "Nigeria" }}
        />
      )}
    </div>
  );
}
