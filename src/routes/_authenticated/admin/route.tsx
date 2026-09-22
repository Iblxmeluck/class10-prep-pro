import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useSessionInfo } from "@/hooks/useSession";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { data: session, isLoading } = useSessionInfo();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!session?.isAdmin)
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="font-display text-xl font-semibold">Admins only</h1>
        <p className="mt-2 text-sm text-muted-foreground">This area is restricted to platform administrators.</p>
      </div>
    );

  return <Outlet />;
}
