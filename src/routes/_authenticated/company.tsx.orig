/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { db, type Row } from "@/lib/db";
import { CrudModule } from "@/components/CrudModule";
import { PageHeader } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { useCurrentUser } from "@/hooks/useAuth";
import { formatNaira, titleCase } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/company")({
  head: () => ({
    meta: [
      { title: "Company & Finance Setup — NEOMARC NDOS" },
      { name: "description", content: "Company profile, fiscal settings and chart of accounts for NEOMARC Realty." },
      { property: "og:title", content: "Company & Finance Setup — NEOMARC NDOS" },
      { property: "og:description", content: "Company profile, fiscal settings and chart of accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole level="staff">
      <CompanyPage />
    </RequireRole>
  ),
});

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const PROFILE_FIELDS: { name: string; label: string; type?: string }[] = [
  { name: "legal_name", label: "Legal name" },
  { name: "trading_name", label: "Trading name" },
  { name: "site_name", label: "Site Name (Brand)" },
  { name: "site_abbreviation", label: "Site Abbreviation" },
  { name: "site_description", label: "Site Description" },
  { name: "logo_url", label: "Logo Image URL", type: "url" },
  { name: "favicon_url", label: "Favicon Image URL", type: "url" },
  { name: "rc_number", label: "RC number (CAC)" },
  { name: "tin", label: "Tax ID (TIN)" },
  { name: "vat_number", label: "VAT number" },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email", type: "email" },
  { name: "website", label: "Website", type: "url" },
  { name: "address", label: "Registered address" },
];

function CompanyPage() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const canEdit = !!me?.isAdmin;
  const [form, setForm] = useState<Row>({});

  const { data: profile } = useQuery({
    queryKey: ["company_profile"],
    queryFn: async () => {
      const { data, error } = await db.from("company_profile").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data as Row;
    },
  });
  useEffect(() => { if (profile) setForm(profile); }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { id: _id, updated_at: _u, ...rest } = form;
      const payload = {
        ...rest, id: 1, updated_by: me?.user.id,
        fiscal_year_start_month: Number(rest.fiscal_year_start_month ?? 1),
        vat_rate: Number(rest.vat_rate ?? 0), wht_rate: Number(rest.wht_rate ?? 0),
      };
      const { error } = await db.from("company_profile").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Company settings saved"); qc.invalidateQueries({ queryKey: ["company_profile"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (k: string, v: any) => setForm((f: Row) => ({ ...f, [k]: v }));
  const m = Number(form.fiscal_year_start_month ?? 1);
  const fyLabel = `${MONTHS[m - 1]} – ${MONTHS[(m + 10) % 12]}`;

  return (
    <div className="space-y-10">
      <PageHeader title="Company & Finance Setup" description="Company profile, fiscal settings and chart of accounts." />

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide">Company profile</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROFILE_FIELDS.map((f) => (
            <div key={f.name} className={f.name === "address" ? "space-y-1 sm:col-span-2" : "space-y-1"}>
              <Label>{f.label}</Label>
              <Input type={f.type ?? "text"} disabled={!canEdit} value={form[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide">Fiscal settings</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Financial year starts</Label>
            <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" disabled={!canEdit}
              value={m} onChange={(e) => set("fiscal_year_start_month", Number(e.target.value))}>
              {MONTHS.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
            </select>
            <p className="text-xs text-muted-foreground">Financial year: {fyLabel}</p>
          </div>
          <div className="space-y-1"><Label>Currency</Label><Input disabled value="Naira (₦ NGN)" /></div>
          <div className="space-y-1"><Label>VAT rate (%)</Label>
            <Input type="number" step="0.01" disabled={!canEdit} value={form.vat_rate ?? ""} onChange={(e) => set("vat_rate", e.target.value)} /></div>
          <div className="space-y-1"><Label>Withholding tax rate (%)</Label>
            <Input type="number" step="0.01" disabled={!canEdit} value={form.wht_rate ?? ""} onChange={(e) => set("wht_rate", e.target.value)} /></div>
          <div className="space-y-1"><Label>Time zone</Label><Input disabled value="Lagos (WAT, UTC+1)" /></div>
        </div>
        {canEdit ? (
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save settings"}</Button>
        ) : (
          <p className="text-xs text-muted-foreground">Only Super Admin or Management can change these settings.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide">Chart of accounts</h2>
        <AccountTotals />
        <CrudModule
          table="chart_of_accounts"
          entityName="Account"
          orderBy="code"
          searchKeys={["code", "name"]}
          defaults={{ is_active: true, account_type: "expense" }}
          columns={[
            { key: "code", label: "Code" },
            { key: "name", label: "Account" },
            { key: "account_type", label: "Type", render: (r) => titleCase(r.account_type) },
            { key: "is_active", label: "Active", render: (r) => (r.is_active ? "Yes" : "No") },
          ]}
          fields={[
            { name: "code", label: "Account code", required: true },
            { name: "name", label: "Account name", required: true },
            { name: "account_type", label: "Type", type: "select", options: ["asset","liability","equity","income","expense"].map((v) => ({ value: v, label: titleCase(v) })) },
            { name: "parent_id", label: "Parent account", type: "select", lookup: { table: "chart_of_accounts", labelKey: "name" } },
            { name: "is_active", label: "Active", type: "boolean" },
            { name: "description", label: "Description", type: "textarea", full: true },
          ]}
        />
      </section>
    </div>
  );
}

function AccountTotals() {
  const { data = [] } = useQuery({
    queryKey: ["expenses", "by-account"],
    queryFn: async () => {
      const { data, error } = await db.from("expenses").select("amount, status, chart_of_accounts(code, name)").neq("status", "rejected");
      if (error) throw error;
      const map = new Map<string, number>();
      for (const e of data as Row[]) {
        const k = e.chart_of_accounts ? `${e.chart_of_accounts.code} · ${e.chart_of_accounts.name}` : "Unassigned";
        map.set(k, (map.get(k) ?? 0) + Number(e.amount ?? 0));
      }
      return [...map.entries()].sort();
    },
  });
  if (!data.length) return <p className="text-sm text-muted-foreground">No expenses recorded yet. Assign an account when recording expenses to see totals here.</p>;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {data.map(([k, v]) => (
        <div key={k} className="rounded-md border bg-card p-3">
          <p className="text-xs text-muted-foreground">{k}</p>
          <p className="font-display font-bold">{formatNaira(v)}</p>
        </div>
      ))}
    </div>
  );
}
