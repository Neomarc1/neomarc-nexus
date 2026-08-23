import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OpsThresholds = {
  new_lead_uncontacted_hours: number;
  followup_overdue_days: number;
  reservation_expiring_days: number;
  payment_verification_hours: number;
  installment_overdue_days: number;
  sale_inactive_days: number;
  sale_stage_stuck_days: number;
  documentation_stalled_days: number;
};

export const DEFAULT_THRESHOLDS: OpsThresholds = {
  new_lead_uncontacted_hours: 24,
  followup_overdue_days: 0,
  reservation_expiring_days: 7,
  payment_verification_hours: 24,
  installment_overdue_days: 0,
  sale_inactive_days: 14,
  sale_stage_stuck_days: 21,
  documentation_stalled_days: 10,
};

export const THRESHOLD_LABELS: Record<keyof OpsThresholds, string> = {
  new_lead_uncontacted_hours: "New lead counts as uncontacted after (hours)",
  followup_overdue_days: "Follow-up counts as overdue after (days past due)",
  reservation_expiring_days: "Reservation counts as expiring soon within (days)",
  payment_verification_hours: "Payment waiting on verification too long after (hours)",
  installment_overdue_days: "Installment counts as overdue after (days past due)",
  sale_inactive_days: "Sale counts as inactive after (days with no activity)",
  sale_stage_stuck_days: "Sale counts as stuck in a stage after (days)",
  documentation_stalled_days: "Documentation counts as stalled after (days)",
};

export const THRESHOLDS_KEY = "ops_thresholds";

export function useOpsThresholds() {
  return useQuery({
    queryKey: ["ops-thresholds"],
    queryFn: async (): Promise<OpsThresholds> => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", THRESHOLDS_KEY)
        .maybeSingle();
      return {
        ...DEFAULT_THRESHOLDS,
        ...((data?.value as Partial<OpsThresholds> | null) ?? {}),
      };
    },
  });
}

export function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function hoursAgoISO(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

export function daysAheadDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}
