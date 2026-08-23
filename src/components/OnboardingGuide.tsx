import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import { useCurrentUser, type AppRole } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

type Step = { to: string; label: string; hint: string };

const GUIDES: Partial<Record<AppRole, { title: string; steps: Step[] }>> = {
  realtor: {
    title: "Welcome to NEOMARC NDOS",
    steps: [
      { to: "/my-work/leads", label: "My Leads", hint: "Everything assigned to you." },
      { to: "/my-work/leads", label: "Contact Lead", hint: "Call or WhatsApp in one tap." },
      { to: "/my-work/leads", label: "Log Follow-up", hint: "Record every conversation." },
      { to: "/my-work/inspections", label: "Book Inspection", hint: "Schedule and close it out." },
      { to: "/properties/search", label: "Find Property", hint: "Search live inventory." },
      { to: "/reserve", label: "Create Reservation", hint: "Hold a plot for your client." },
    ],
  },
  accounts: {
    title: "Welcome to the Accounts desk",
    steps: [
      { to: "/accounts/payments", label: "Pending Payments", hint: "Money awaiting verification." },
      { to: "/accounts/payments", label: "Verify Payment", hint: "Confirm and post to the sale." },
      { to: "/payments", label: "Record Payment", hint: "Lodge a new payment." },
      { to: "/receivables", label: "Generate Receipt", hint: "Issue proof of payment." },
    ],
  },
  documentation: {
    title: "Welcome to the Documentation desk",
    steps: [
      { to: "/documents", label: "Upload Documents", hint: "Store files privately." },
      { to: "/documentation", label: "Review Documents", hint: "Check what is pending." },
      { to: "/documentation", label: "Track Documentation", hint: "Follow each sale's paperwork." },
      { to: "/documentation", label: "Prepare Allocation", hint: "Work the allocation queue." },
    ],
  },
  sales_manager: {
    title: "Welcome to NEOMARC NDOS",
    steps: [
      { to: "/dashboard", label: "Dashboard", hint: "Today's numbers." },
      { to: "/leads", label: "Leads / CRM", hint: "The full pipeline." },
      { to: "/operations", label: "Operations Command", hint: "What is stuck." },
      { to: "/operations/exceptions", label: "Exceptions", hint: "Records needing attention." },
    ],
  },
  management: {
    title: "Welcome to NEOMARC NDOS",
    steps: [
      { to: "/dashboard", label: "Dashboard", hint: "Executive command centre." },
      { to: "/operations", label: "Operations Command", hint: "Daily bottlenecks." },
      { to: "/operations/exceptions", label: "Exceptions", hint: "Everything off-track." },
      { to: "/reports", label: "Reports", hint: "Performance and revenue." },
    ],
  },
};
GUIDES.super_admin = GUIDES.management!;
GUIDES.project_manager = {
  title: "Welcome to NEOMARC NDOS",
  steps: [
    { to: "/projects", label: "Projects", hint: "Track site progress." },
    { to: "/estates", label: "Estates", hint: "Estate records." },
    { to: "/tasks", label: "Tasks", hint: "Your assignments." },
  ],
};

export function OnboardingGuide() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: state, isLoading } = useQuery({
    queryKey: ["user-onboarding", me?.user.id],
    enabled: !!me?.user.id,
    queryFn: async () => {
      const { data } = await db
        .from("user_onboarding")
        .select("*")
        .eq("user_id", me!.user.id)
        .maybeSingle();
      return data ?? null;
    },
  });

  const guide = me?.primaryRole ? GUIDES[me.primaryRole] : undefined;
  if (isLoading || !me || !guide) return null;
  if (state?.dismissed_at || state?.completed_at) return null;

  async function dismiss() {
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await db.from("user_onboarding").upsert({
        user_id: userData.user.id,
        dismissed_at: new Date().toISOString(),
        last_seen_role: me?.primaryRole ?? null,
      });
      await qc.invalidateQueries({ queryKey: ["user-onboarding"] });
    }
    setBusy(false);
  }

  return (
    <div className="surface-card mb-6 border-gold/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/20 text-gold-foreground">
            <Compass className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-sm font-bold">{guide.title}</p>
            <p className="text-xs text-muted-foreground">Start with these steps.</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={dismiss} disabled={busy} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {guide.steps.map((s, i) => (
          <Link
            key={`${s.to}-${i}`}
            to={s.to}
            className="rounded-lg border border-border p-3 transition-colors hover:bg-muted"
          >
            <p className="text-sm font-medium">
              {i + 1}. {s.label}
            </p>
            <p className="text-xs text-muted-foreground">{s.hint}</p>
          </Link>
        ))}
      </div>

      <div className="mt-3 flex justify-end">
        <Button variant="outline" size="sm" onClick={dismiss} disabled={busy}>
          Don't show this again
        </Button>
      </div>
    </div>
  );
}
