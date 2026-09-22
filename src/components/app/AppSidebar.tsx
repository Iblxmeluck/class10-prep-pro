import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  ChevronRight,
  Rocket,
  MoreHorizontal,
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { myActiveCourses } from "@/lib/courses.functions";

import type { FileRouteTypes } from "@/routeTree.gen";
import { supabase } from "@/integrations/supabase/client";
import { useSessionInfo } from "@/hooks/useSession";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

type Path = FileRouteTypes["to"];

type Item = {
  to: Path;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  children?: Item[];
};

type Section = {
  key: string;
  label: string;
  icon: typeof LayoutDashboard;
  items: Item[];
};

const activeClass = "bg-sidebar-accent text-sidebar-accent-foreground font-medium";

function buildSections(isAdmin: boolean): Section[] {
  const sections: Section[] = [
    {
      key: "features",
      label: "Features",
      icon: Rocket,
      items: [
        {
          to: "/games",
          label: "Learning Games",
          icon: Gamepad2,
          children: [
            { to: "/memory", label: "Memory Mode", icon: Brain },
            { to: "/challenge", label: "60-Second Challenge", icon: Timer },
            { to: "/battle", label: "Study Battle", icon: Swords },
          ],
        },
        { to: "/emergency", label: "Exam Emergency", icon: Siren },
        { to: "/admin/events", label: "Events", icon: CalendarDays, adminOnly: true },
      ],
    },
    {
      key: "content",
      label: "Content",
      icon: BookOpen,
      items: [
        { to: "/admin/questions", label: "Questions & Test", icon: FileQuestion, adminOnly: true },
        {
          to: isAdmin ? "/admin/quizzes" : "/quizzes",
          label: isAdmin ? "Quiz builder" : "Quizzes",
          icon: ClipboardList,
        },
        {
          to: isAdmin ? "/admin/resources" : "/resources",
          label: "PDFs & Images resources",
          icon: FileText,
        },
        { to: "/videos", label: "Video resources", icon: Video },
        { to: "/notes", label: "Notes", icon: NotebookPen },
        { to: "/flashcards", label: "Flashcards", icon: Layers },
        { to: "/topics", label: "Topic Learning Hub", icon: Compass },
        { to: "/tracker", label: "Chapter tracker", icon: ListTree },
        { to: "/admin/subjects", label: "Subjects", icon: BookOpen, adminOnly: true },
        { to: "/admin/chapters", label: "Chapters", icon: ListTree, adminOnly: true },
        { to: "/admin/topics", label: "Topics", icon: Compass, adminOnly: true },
      ],
    },
    {
      key: "exp",
      label: "EXP & Store",
      icon: ShoppingBag,
      items: [
        { to: "/store", label: "EXP Store", icon: ShoppingBag },
        { to: "/admin/store", label: "EXP & Store admin", icon: Sparkles, adminOnly: true },
        { to: "/admin/courses", label: "Courses", icon: GraduationCap, adminOnly: true },
      ],
    },
    {
      key: "more",
      label: "More",
      icon: MoreHorizontal,
      items: [
        { to: "/admin/members", label: "Members", icon: Users, adminOnly: true },
        { to: "/admin/tracking", label: "Student tracking", icon: LineChart, adminOnly: true },
        { to: "/admin/demands", label: "Demands", icon: Megaphone, adminOnly: true },
        { to: "/downloads", label: "Downloads", icon: Download },
        { to: "/activity", label: "Activity", icon: Activity },
        { to: "/settings", label: "Settings", icon: Settings },
      ],
    },
  ];

  const filter = (items: Item[]): Item[] =>
    items
      .filter((i) => !i.adminOnly || isAdmin)
      .map((i) => (i.children ? { ...i, children: filter(i.children) } : i));

  return sections.map((s) => ({ ...s, items: filter(s.items) })).filter((s) => s.items.length > 0);
}

function flatten(items: Item[]): Item[] {
  return items.flatMap((i) => [i, ...(i.children ? flatten(i.children) : [])]);
}

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const { data: session } = useSessionInfo();
  const sections = buildSections(Boolean(session?.isAdmin));
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const s of sections) {
      if (flatten(s.items).some((i) => isActive(i.to))) next[s.key] = true;
    }
    setOpen((prev) => ({ ...prev, ...next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, session?.isAdmin]);

  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const loadCourses = useServerFn(myActiveCourses);
  const { data: myCourses } = useQuery({
    queryKey: ["my-courses", session?.userId],
    enabled: !!session?.userId,
    refetchInterval: 60_000,
    queryFn: () => loadCourses({ data: {} as never }),
  });
  const { data: myPages } = useQuery({
    queryKey: ["my-pages", session?.userId],
    enabled: !!session?.userId,
    queryFn: async () =>
      (await supabase.from("custom_pages").select("id, name, slug").eq("is_published", true).order("name")).data ?? [],
  });

  const primary: Item[] = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/todo", label: "To-Do", icon: CheckSquare },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" onClick={closeOnMobile} className="flex items-center gap-2 px-1 py-1 font-display font-semibold">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </span>
          {!collapsed && <span className="truncate">CBSE 10 Prep</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {primary.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild tooltip={item.label} isActive={isActive(item.to)}>
                    <Link to={item.to} onClick={closeOnMobile} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {collapsed ? (
          sections.map((s) => (
            <SidebarGroup key={s.key}>
              <SidebarGroupContent>
                <SidebarMenu>
                  {flatten(s.items).map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild tooltip={item.label} isActive={isActive(item.to)}>
                        <Link to={item.to} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        ) : (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {sections.map((s) => (
                  <Collapsible
                    key={s.key}
                    asChild
                    className="group/collapsible"
                    open={open[s.key] ?? false}
                    onOpenChange={(v) => setOpen((p) => ({ ...p, [s.key]: v }))}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={s.label}>
                          <s.icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{s.label}</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {s.items.map((item) =>
                            item.children && item.children.length > 0 ? (
                              <Collapsible
                                key={item.to}
                                asChild
                                className="group/collapsible"
                                defaultOpen={flatten([item]).some((c) => isActive(c.to))}
                              >
                                <SidebarMenuSubItem>
                                  <div className="flex items-center">
                                    <SidebarMenuSubButton asChild isActive={isActive(item.to)} className="flex-1">
                                      <Link to={item.to} onClick={closeOnMobile} className="flex items-center gap-2">
                                        <item.icon className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{item.label}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                    <CollapsibleTrigger asChild>
                                      <button
                                        type="button"
                                        aria-label={`Toggle ${item.label}`}
                                        className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent"
                                      >
                                        <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                      </button>
                                    </CollapsibleTrigger>
                                  </div>
                                  <CollapsibleContent>
                                    <SidebarMenuSub>
                                      {item.children.map((child) => (
                                        <SidebarMenuSubItem key={child.to}>
                                          <SidebarMenuSubButton asChild isActive={isActive(child.to)}>
                                            <Link to={child.to} onClick={closeOnMobile} className="flex items-center gap-2">
                                              <child.icon className="h-4 w-4 shrink-0" />
                                              <span className="truncate">{child.label}</span>
                                            </Link>
                                          </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                      ))}
                                    </SidebarMenuSub>
                                  </CollapsibleContent>
                                </SidebarMenuSubItem>
                              </Collapsible>
                            ) : (
                              <SidebarMenuSubItem key={item.to}>
                                <SidebarMenuSubButton asChild isActive={isActive(item.to)}>
                                  <Link to={item.to} onClick={closeOnMobile} className="flex items-center gap-2">
                                    <item.icon className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{item.label}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ),
                          )}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(myCourses ?? []).length > 0 && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Courses</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {(myCourses ?? []).map((c) => (
                  <SidebarMenuItem key={c.id}>
                    <SidebarMenuButton asChild tooltip={c.name} isActive={pathname === `/courses/${c.id}`}>
                      <Link
                        to="/courses/$courseId"
                        params={{ courseId: c.id }}
                        onClick={closeOnMobile}
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
                    <SidebarMenuButton asChild tooltip={p.name} isActive={pathname === `/p/${p.slug}`}>
                      <Link to="/p/$slug" params={{ slug: p.slug }} onClick={closeOnMobile} className="flex items-center gap-2">
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
