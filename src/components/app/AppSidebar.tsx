import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Compass,
  FileQuestion,
  FileText,
  Video,
  NotebookPen,
  BookOpen,
  ListTree,
  Users,
  ClipboardList,
  LineChart,
  Download,
  Activity,
  Settings,
  GraduationCap,
  CheckSquare,
  Layers,
  Timer,
  Swords,
  Brain,
  Siren,
  Megaphone,
  Gamepad2,
  CalendarDays,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";

import type { FileRouteTypes } from "@/routeTree.gen";
import { supabase } from "@/integrations/supabase/client";
import { useSessionInfo } from "@/hooks/useSession";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type Path = FileRouteTypes["to"];

type Item = {
  to: Path;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  exact?: boolean;
};

type Group = { label?: string; items: Item[] };

function groups(isAdmin: boolean): Group[] {
  const all: Group[] = [
    {
      items: [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/todo", label: "To-Do", icon: CheckSquare },
      ],
    },
    {
      label: "New & Exciting",
      items: [
        { to: "/games", label: "Learning Games", icon: Gamepad2 },
        { to: "/challenge", label: "60-Second Challenge", icon: Timer },
        { to: "/battle", label: "Study Battle", icon: Swords },
        { to: "/memory", label: "Memory Mode", icon: Brain },
        { to: "/emergency", label: "Exam Emergency", icon: Siren },
        { to: "/admin/events", label: "Events", icon: CalendarDays, adminOnly: true },
      ],
    },
    {
      label: "Content",
      items: [
        {
          to: "/admin/questions",
          label: "Questions and test",
          icon: FileQuestion,
          adminOnly: true,
        },
        {
          to: isAdmin ? "/admin/quizzes" : "/quizzes",
          label: isAdmin ? "Quiz builder" : "Quizzes",
          icon: ClipboardList,
        },
        {
          to: isAdmin ? "/admin/resources" : "/resources",
          label: "PDFs and Images resources",
          icon: FileText,
        },
        { to: "/videos", label: "Video resources", icon: Video },
        { to: "/notes", label: "Notes", icon: NotebookPen },
        { to: "/flashcards", label: "Flashcards", icon: Layers },
        { to: "/topics", label: "Topic Learning Hub", icon: Compass },
        { to: "/tracker", label: "Chapter tracker", icon: ListTree },
      ],
    },
    {
      label: "Organization",
      items: [
        { to: "/admin/subjects", label: "Subjects", icon: BookOpen, adminOnly: true },
        { to: "/admin/chapters", label: "Chapters", icon: ListTree, adminOnly: true },
        { to: "/admin/topics", label: "Topics", icon: Compass, adminOnly: true },
      ],
    },
    {
      label: "Users",
      items: [
        { to: "/admin/members", label: "Members", icon: Users, adminOnly: true },
        { to: "/admin/tracking", label: "Student tracking", icon: LineChart, adminOnly: true },
        { to: "/admin/store", label: "EXP & Store", icon: ShoppingBag, adminOnly: true },
        { to: "/admin/courses", label: "Courses", icon: GraduationCap, adminOnly: true },
        { to: "/admin/demands", label: "Demands", icon: Megaphone, adminOnly: true },
      ],
    },
    {
      label: "EXP",
      items: [{ to: "/store", label: "EXP Store", icon: ShoppingBag }],
    },



    {
      label: "Tracking",
      items: [
        { to: "/downloads", label: "Downloads", icon: Download },
        { to: "/activity", label: "Activity", icon: Activity },
      ],
    },
    {
      label: "System",
      items: [{ to: "/settings", label: "Settings", icon: Settings }],
    },
  ];

  return all
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.adminOnly || isAdmin) }))
    .filter((g) => g.items.length > 0);
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { data: session } = useSessionInfo();
  const nav = groups(Boolean(session?.isAdmin));
  const { data: myPages } = useQuery({
    queryKey: ["my-pages", session?.userId],
    enabled: !!session?.userId,
    queryFn: async () =>
      (await supabase.from("custom_pages").select("id, name, slug").eq("is_published", true).order("name")).data ?? [],
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2 px-1 py-1 font-display font-semibold">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </span>
          {!collapsed && <span className="truncate">CBSE 10 Prep</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {nav.map((group, i) => (
          <SidebarGroup key={group.label ?? `group-${i}`}>
            {group.label && !collapsed && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <Link
                        to={item.to}
                        activeOptions={{ exact: item.to === "/admin" }}
                        activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
                        className="flex items-center gap-2"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {(myCourses ?? []).length > 0 && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Courses</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {(myCourses ?? []).map((c) => (
                  <SidebarMenuItem key={c.id}>
                    <SidebarMenuButton asChild tooltip={c.name}>
                      <Link
                        to="/courses/$courseId"
                        params={{ courseId: c.id }}
                        activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
                        className="flex items-center gap-2"
                      >
                        <GraduationCap className="h-4 w-4 shrink-0" />
                        <span className="truncate">{c.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {(myPages ?? []).length > 0 && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Unlocked</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {(myPages ?? []).map((p) => (
                  <SidebarMenuItem key={p.id}>
                    <SidebarMenuButton asChild tooltip={p.name}>
                      <Link
                        to="/p/$slug"
                        params={{ slug: p.slug }}
                        activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
                        className="flex items-center gap-2"
                      >
                        <Sparkles className="h-4 w-4 shrink-0" />
                        <span className="truncate">{p.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
