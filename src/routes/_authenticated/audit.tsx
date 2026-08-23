/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { db, type Row } from "@/lib/db";
import { DataTable } from "@/components/CrudModule";
import { PageHeader } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatDateTime, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log — NEOMARC NDOS" },
      {
        name: "description",
        content: "Immutable record of every create, update and delete across NEOMARC NDOS.",
      },
      { property: "og:title", content: "Audit Log — NEOMARC NDOS" },
      { property: "og:description", content: "Immutable record of every change across the system." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const [user, setUser] = useState("");
  const [action, setAction] = useState("all");
  const [module, setModule] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["audit_logs", action, module, from, to],
    queryFn: async () => {
      let q = db
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (action !== "all") q = q.eq("action", action);
      if (module !== "all") q = q.eq("table_name", module);
      if (from) q = q.gte("created_at", new Date(from + "T00:00:00").toISOString());
      if (to) q = q.lte("created_at", new Date(to + "T23:59:59").toISOString());
      const { data } = await q;
      return (data ?? []) as Row[];
    },
  });

  const { data: facets } = useQuery({
    queryKey: ["audit_facets"],
    queryFn: async () => {
      const { data } = await db.from("audit_logs").select("action, table_name").limit(1000);
      const list = (data ?? []) as Row[];
      return {
        actions: [...new Set(list.map((r) => r.action as string))].sort(),
        modules: [...new Set(list.map((r) => r.table_name as string))].sort(),
      };
    },
  });

  const filtered = useMemo(() => {
    const term = user.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => String(r.user_email ?? "").toLowerCase().includes(term));
  }, [rows, user]);

  function reset() {
    setUser("");
    setAction("all");
    setModule("all");
    setFrom("");
    setTo("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit & Activity Review"
        description="Full traceability of system activity. Entries cannot be edited or deleted."
      />

      <div className="surface-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-1.5">
          <Label className="text-xs">User email</Label>
          <Input
            className="h-11"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="Search user"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Action</Label>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {(facets?.actions ?? []).map((a) => (
                <SelectItem key={a} value={a}>
                  {titleCase(a)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Module</Label>
          <Select value={module} onValueChange={setModule}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modules</SelectItem>
              {(facets?.modules ?? []).map((m) => (
                <SelectItem key={m} value={m}>
                  {titleCase(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">From</Label>
          <Input type="date" className="h-11" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">To</Label>
          <Input type="date" className="h-11" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="sm:col-span-2 xl:col-span-5">
          <Button variant="outline" size="sm" onClick={reset}>
            Clear filters
          </Button>
        </div>
      </div>

      <DataTable
        loading={isLoading}
        rows={filtered}
        empty="No activity matches these filters."
        columns={[
          { key: "created_at", label: "When", render: (r) => formatDateTime(r.created_at) },
          { key: "user_email", label: "User" },
          { key: "action", label: "Action", render: (r) => titleCase(r.action) },
          { key: "table_name", label: "Module", render: (r) => titleCase(r.table_name) },
          {
            key: "record_id",
            label: "Record",
            render: (r) => String(r.record_id ?? "—").slice(0, 8),
          },
        ]}
      />
    </div>
  );
}
