import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { GraduationCap, LogOut, Settings as SettingsIcon, Trophy, User } from "lucide-react";
import type { ReactNode } from "react";
import pandaImg from "@/assets/panda.webp";
import { supabase } from "@/integrations/supabase/client";
import { useSessionInfo } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { GlobalSearch } from "@/components/app/GlobalSearch";
import { StudyTimer } from "@/components/study/StudyTimer";
import { TrophyButton } from "@/components/study/TrophyButton";
import { NotificationBell } from "@/components/app/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppShell({ children }: { children: ReactNode }) {
  const { data: session } = useSessionInfo();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initial = (session?.displayName ?? "?").charAt(0).toUpperCase();

  return (
    <SidebarProvider>
      <StudyTimer />
      <div aria-hidden className="study-bg pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <span className="study-blob study-blob-a" />
        <span className="study-blob study-blob-b" />
        <span className="study-blob study-blob-c" />
        <img src={pandaImg} alt="" width={360} height={360} decoding="async" loading="lazy" className="study-panda" />
      </div>
      <div className="relative z-[1] flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-card/80 px-3 backdrop-blur sm:px-4">
            <SidebarTrigger />
            <Link to="/dashboard" className="flex shrink-0 items-center gap-2 font-display font-semibold">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="h-4 w-4" />
              </span>
              <span className="hidden sm:inline">
                Class 10 <span className="text-primary">Study Hub</span>
              </span>
            </Link>
            <div className="mx-auto hidden flex-1 justify-center px-4 md:flex">
              <GlobalSearch />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
              <ThemeToggle />
              <TrophyButton />
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-1.5 sm:px-2" aria-label="Account menu">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {initial}
                    </span>
                    <span className="hidden max-w-28 truncate text-sm sm:inline">{session?.displayName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="truncate">
                    {session?.displayName}
                    {session?.username ? <span className="block text-xs font-normal text-muted-foreground">@{session.username}</span> : null}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void navigate({ to: "/achievements" })}>
                    <Trophy className="mr-2 h-4 w-4" /> Study statistics
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void navigate({ to: "/activity" })}>
                    <User className="mr-2 h-4 w-4" /> My activity
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void navigate({ to: "/settings" })}>
                    <SettingsIcon className="mr-2 h-4 w-4" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void signOut()}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <div className="border-b border-border bg-card/60 px-3 py-2 md:hidden">
            <GlobalSearch />
          </div>
          <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 overflow-x-hidden px-3 py-6 sm:px-4 sm:py-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
