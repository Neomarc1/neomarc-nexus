import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import { captureTechnicalContext } from "@/lib/report-error";
import { useCurrentUser, ROLE_LABELS } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const FEEDBACK_CATEGORIES = [
  { value: "bug", label: "Bug report" },
  { value: "feature", label: "Feature request" },
  { value: "confusing", label: "Confusing workflow" },
  { value: "improvement", label: "Improvement suggestion" },
] as const;

export function FeedbackDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("bug");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: me } = useCurrentUser();

  async function submit() {
    if (description.trim().length < 5) {
      toast.error("Please describe what happened.");
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("no session");

      let screenshotPath: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "png";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("feedback").upload(path, file);
        if (upErr) throw upErr;
        screenshotPath = path;
      }

      const { error } = await db.from("feedback").insert({
        user_id: user.id,
        user_email: user.email ?? null,
        user_role: me?.primaryRole ? ROLE_LABELS[me.primaryRole] : null,
        category,
        description: description.trim(),
        page_path: pathname,
        screenshot_path: screenshotPath,
        technical_context: captureTechnicalContext({ route: pathname }),
      });
      if (error) throw error;

      toast.success("Thank you — your feedback was sent to management.");
      setDescription("");
      setFile(null);
      setCategory("bug");
      setOpen(false);
    } catch {
      toast.error("Could not send your feedback. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" aria-label="Send feedback">
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>
            Tell us what is broken, confusing or missing on this screen.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What were you trying to do, and what happened?"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Screenshot (optional)</Label>
            <Input
              type="file"
              accept="image/*"
              className="h-11"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Page <span className="font-medium">{pathname}</span> and your role are attached
            automatically.
          </p>
          <Button className="h-11 w-full" onClick={submit} disabled={saving}>
            {saving ? "Sending…" : "Submit feedback"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
