/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TYPES = [
  { value: "call", label: "Phone Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "meeting", label: "Meeting" },
  { value: "inspection", label: "Inspection" },
  { value: "followup", label: "Follow-up" },
  { value: "note", label: "Note" },
];

const OUTCOMES = ["Interested", "Needs follow-up", "Negotiating", "No answer", "Not interested"];

/** 30-second mobile activity logger for a lead. */
export function ActivityDialog({
  leadId,
  leadName,
  open,
  onOpenChange,
  defaultType = "call",
}: {
  leadId: string;
  leadName?: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultType?: string;
}) {
  const qc = useQueryClient();
  const [type, setType] = useState(defaultType);
  const [summary, setSummary] = useState("");
  const [outcome, setOutcome] = useState<string | null>(null);
  const [nextAt, setNextAt] = useState("");
  const [nextAction, setNextAction] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const { data: auth } = await db.auth.getUser();
      const { error } = await db.from("lead_activities").insert({
        lead_id: leadId,
        activity_type: type,
        summary: summary.trim() || TYPES.find((t) => t.value === type)?.label || "Activity",
        outcome,
        next_action: nextAction || null,
        next_action_at: nextAt ? new Date(nextAt).toISOString() : null,
        created_by: auth.user?.id,
        updated_by: auth.user?.id,
      });
      if (error) throw error;

      const patch: any = { last_contact_at: new Date().toISOString() };
      if (nextAt) patch.next_followup_at = new Date(nextAt).toISOString();
      const { error: e2 } = await db.from("leads").update(patch).eq("id", leadId);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Activity logged");
      setSummary("");
      setOutcome(null);
      setNextAt("");
      setNextAction("");
      qc.invalidateQueries();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Could not log activity"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] overflow-y-auto rounded-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log activity</DialogTitle>
          <DialogDescription>{leadName ?? "Lead"}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-xs font-medium">Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <Button
                  key={t.value}
                  type="button"
                  size="sm"
                  variant={type === t.value ? "default" : "outline"}
                  className="h-11 text-xs"
                  onClick={() => setType(t.value)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-medium">What happened?</Label>
            <Textarea
              rows={2}
              value={summary}
              placeholder="Spoke with client about plot options…"
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-2 block text-xs font-medium">Outcome</Label>
            <div className="flex flex-wrap gap-2">
              {OUTCOMES.map((o) => (
                <Button
                  key={o}
                  type="button"
                  size="sm"
                  variant={outcome === o ? "default" : "outline"}
                  className="h-10"
                  onClick={() => setOutcome(outcome === o ? null : o)}
                >
                  {o}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Next follow-up</Label>
              <Input type="datetime-local" value={nextAt} onChange={(e) => setNextAt(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium">Next action</Label>
              <Input
                value={nextAction}
                placeholder="Send brochure"
                onChange={(e) => setNextAction(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="h-11" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Log activity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
