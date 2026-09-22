import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSessionInfo } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CBSE 10 Prep" },
      { name: "description", content: "Manage your CBSE 10 Prep account details and password." },
      { property: "og:title", content: "Settings — CBSE 10 Prep" },
      { property: "og:description", content: "Update your account password and view your profile." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: session } = useSessionInfo();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function changePassword() {
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setPassword("");
      toast.success("Password updated");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Your account details and security.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name: </span>
            {session?.displayName}
          </p>
          <p className="flex items-center gap-2">
            <span className="text-muted-foreground">Username: </span>@{session?.username}
            {session?.isAdmin && <Badge>Admin</Badge>}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-pw">New password</Label>
            <Input
              id="new-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min 8 characters"
            />
          </div>
          <Button disabled={busy || password.length < 8} onClick={changePassword}>
            Update password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
