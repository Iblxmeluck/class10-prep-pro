import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { emailForUsername } from "@/lib/username";
import { adminExists, bootstrapAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CBSE 10 Prep" },
      { name: "description", content: "Sign in to your CBSE Class 10 question bank and practice account." },
      { property: "og:title", content: "Sign in — CBSE 10 Prep" },
      { property: "og:description", content: "Members sign in with the username issued by their teacher." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: adminState, refetch } = useQuery({
    queryKey: ["admin-exists"],
    queryFn: () => adminExists(),
  });
  const setupMode = adminState?.exists === false;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (setupMode) {
        await bootstrapAdmin({ data: { username, password, displayName } });
        toast.success("Administrator created. Signing you in…");
        await refetch();
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: emailForUsername(username),
        password,
      });
      if (error) throw new Error("Invalid username or password");
      await supabase.rpc("touch_last_login");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold">{setupMode ? "Create administrator" : "Member sign in"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {setupMode
            ? "No administrator exists yet. Set up the first account to manage the platform."
            : "Use the username and password issued by your teacher."}
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {setupMode && (
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Full name</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : setupMode ? "Create & sign in" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
