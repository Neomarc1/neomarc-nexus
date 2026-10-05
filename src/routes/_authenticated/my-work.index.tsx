/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Flame,
  CalendarCheck,
  BookmarkCheck,
  Handshake,
  Percent,
  PhoneCall,
  Plus,
  Map,
  Copy,
  Network,
} from "lucide-react";
import { db, type Row } from "@/lib/db";
import { useCurrentUser } from "@/hooks/useAuth";
import { PageHeader } from "@/components/layout/AppShell";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { formatNaira, todayLagos } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/my-work/")({
  head: () => ({
    meta: [
      { title: "My Work — NEOMARC NDOS" },
      { name: "description", content: "The NEOMARC realtor field workspace: leads, follow-ups, inspections, reservations and commissions." },
      { property: "og:title", content: "My Work — NEOMARC NDOS" },
      { property: "og:description", content: "Realtor field workspace for leads, inspections and reservations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyWorkPage,
});

function MyWorkPage() {
  const navigate = useNavigate();
  const { data: me } = useCurrentUser();
  const realtorId = me?.realtorId ?? null;
  const today = todayLagos();

  const scope = (q: any, col = "realtor_id") => (realtorId ? q.eq(col, realtorId) : q);

  const { data: leads = [] } = useQuery({
    queryKey: ["my-work", "leads", realtorId],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await scope(db.from("leads").select("*")).order("created_at", {
        ascending: false,
      });
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ["my-work", "inspections", realtorId],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await scope(db.from("inspections").select("*")).order("scheduled_date");
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["my-work", "reservations", realtorId],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await scope(db.from("reservations").select("*")).order("created_at", {
        ascending: false,
      });
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["my-work", "sales", realtorId],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await scope(db.from("sales").select("*"));
      if (error) throw error;
      return data as Row[];
    },
  });

  
  const { data: meRealtor } = useQuery({
    queryKey: ["my-work", "me-realtor", realtorId],
    enabled: !!realtorId,
    queryFn: async () => {
      const { data, error } = await db.from("realtors").select("*").eq("id", realtorId).single();
      if (error) throw error;
      return data as Row;
    },
  });

  const { data: downlines = [] } = useQuery({
    queryKey: ["my-work", "downlines", realtorId],
    enabled: !!realtorId,
    queryFn: async () => {
      const { data, error } = await db.from("realtors").select("*").eq("manager_id", realtorId);
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["my-work", "commissions", realtorId],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await scope(db.from("commissions").select("*"));
      if (error) throw error;
      return data as Row[];
    },
  });

  const newLeads = leads.filter((l) => l.status === "new");
  const dueToday = leads.filter(
    (l) => l.next_followup_at && String(l.next_followup_at).slice(0, 10) <= today,
  );
  const hot = leads.filter((l) => l.temperature === "hot");
  const upcoming = inspections.filter(
    (i) => !["completed", "cancelled"].includes(i.status) && i.scheduled_date >= today,
  );
  const activeRes = reservations.filter((r) => r.status === "active");
  const liveSales = sales.filter((s) => s.status !== "cancelled");
  const commissionDue = commissions
    .filter((c) => !["reversed", "cancelled"].includes(c.status))
    .reduce((s, c) => s + Number(c.amount ?? 0) - Number(c.amount_paid ?? 0), 0);

  
  const copyReferral = () => {
    if (meRealtor?.ref) {
      navigator.clipboard.writeText(meRealtor.ref);
      toast.success("Referral ID copied to clipboard!");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Work"
        description={`Field workspace · ${me?.profile?.full_name ?? me?.user?.email ?? ""}`}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Button className="h-16 flex-col gap-1 text-xs" onClick={() => navigate({ to: "/my-work/leads", search: { filter: "all" as const } })}>
          <Plus className="h-5 w-5" /> New lead
        </Button>
        <Button
          variant="outline"
          className="h-16 flex-col gap-1 text-xs"
          onClick={() => navigate({ to: "/my-work/leads", search: { filter: "followups" } as any })}
        >
          <PhoneCall className="h-5 w-5" /> Follow up
        </Button>
        <Button
          variant="outline"
          className="h-16 flex-col gap-1 text-xs"
          onClick={() => navigate({ to: "/my-work/inspections" })}
        >
          <CalendarCheck className="h-5 w-5" /> Book inspection
        </Button>
        <Button
          variant="outline"
          className="h-16 flex-col gap-1 text-xs"
          onClick={() => navigate({ to: "/properties/search" })}
        >
          <Map className="h-5 w-5" /> Find property
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/my-work/leads" search={{ filter: "all" as const }}>
          <StatCard label="My new leads" value={newLeads.length} icon={Users} />
        </Link>
        <Link to="/my-work/leads" search={{ filter: "followups" } as any}>
          <StatCard label="Follow-ups due" value={dueToday.length} icon={PhoneCall} tone="warning" />
        </Link>
        <Link to="/my-work/leads" search={{ filter: "hot" } as any}>
          <StatCard label="My hot leads" value={hot.length} icon={Flame} tone="destructive" />
        </Link>
        <Link to="/my-work/inspections">
          <StatCard label="My inspections" value={upcoming.length} icon={CalendarCheck} tone="info" />
        </Link>
        <Link to="/reservations">
          <StatCard label="Active reservations" value={activeRes.length} icon={BookmarkCheck} tone="gold" />
        </Link>
        <Link to="/sales">
          <StatCard label="My sales" value={liveSales.length} icon={Handshake} tone="success" />
        </Link>
        <Link to="/commissions">
          <StatCard
            label="Commission outstanding"
            value={formatNaira(commissionDue, true)}
            icon={Percent}
            tone="gold"
          />
        </Link>
        <Link to="/tasks">
          <StatCard label="My tasks" value="Open" icon={Users} />
        </Link>
      </div>

      {realtorId && meRealtor && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-8">
          <div className="surface-card p-5 sm:p-6 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Network className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display font-bold text-lg">My Referral Identity</h3>
                <p className="text-sm text-muted-foreground">Share this ID to earn indirect commissions from your downlines.</p>
              </div>
            </div>
            
            <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Your Unique Referral ID</div>
              <div className="flex items-center justify-between gap-4">
                <code className="text-2xl font-mono font-bold text-foreground">{meRealtor.ref}</code>
                <Button variant="secondary" onClick={copyReferral}>
                  <Copy className="h-4 w-4 mr-2" /> Copy ID
                </Button>
              </div>
            </div>
          </div>

          <div className="surface-card p-5 sm:p-6">
            <h3 className="font-display font-bold text-lg mb-4">My Referral Network</h3>
            {downlines.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-xl">
                You have no downline realtors yet. Share your Referral ID with new realtors to build your network!
              </div>
            ) : (
              <div className="space-y-3">
                {downlines.map((dl: any) => (
                  <div key={dl.id} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium text-sm">{dl.full_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{dl.ref}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</div>
                      <div className="text-sm">{dl.is_active ? "Active" : "Inactive"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
