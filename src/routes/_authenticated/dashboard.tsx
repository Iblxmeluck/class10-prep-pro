import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Activity as ActivityIcon,
  ArrowRight,
  Bot,
  BookOpen,
  Brain,
  CalendarDays,
  ClipboardList,
  Compass,
  Rocket,
  Clock,
  FileQuestion,
  FileText,
  Flame,
  GraduationCap,
  Layers,
  NotebookPen,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Video,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSessionInfo } from "@/hooks/useSession";
import { useStudy } from "@/hooks/useStudy";
import { formatTime, studyStats } from "@/lib/study";
import { boardCountdown } from "@/lib/board";
import { cn } from "@/lib/utils";
import type { FileRouteTypes } from "@/routeTree.gen";

type Path = FileRouteTypes["to"];

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Class 10 Study Hub" },
      { name: "description", content: "Your CBSE Class 10 progress, study time, streaks, subjects and recommended practice." },
      { property: "og:title", content: "Dashboard — Class 10 Study Hub" },
      { property: "og:description", content: "Track your Class 10 preparation: progress, study time, streaks and subjects." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const greeting = () => {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }).format(new Date()));
  return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
};

const ago = (iso: string) => {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
};

const barColors = [
  "from-[oklch(0.64_0.2_254)] to-[oklch(0.65_0.29_319)]",
  "from-[oklch(0.74_0.16_162)] to-[oklch(0.64_0.2_254)]",
  "from-[oklch(0.54_0.26_285)] to-[oklch(0.65_0.29_319)]",
  "from-[oklch(0.86_0.16_86)] to-[oklch(0.7_0.19_45)]",
  "from-[oklch(0.65_0.29_319)] to-[oklch(0.74_0.16_162)]",
  "from-[oklch(0.7_0.19_45)] to-[oklch(0.86_0.16_86)]",
];

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("dashboard-panel rounded-2xl border border-border bg-card p-5", className)}>{children}</section>;
}

function Dashboard() {
  const { data: session } = useSessionInfo();
  const { data: studyDays } = useStudy(session?.userId);
  const stats = studyStats(studyDays ?? []);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const countdown = boardCountdown(now);

  const { data } = useQuery({
    queryKey: ["dashboard-v2"],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const [subjects, chapters, attempts, logs, counts] = await Promise.all([
        supabase.from("subjects").select("id, name, icon").order("sort_order"),
        supabase.from("chapters").select("id, name, subject_id"),
        supabase
          .from("question_attempts")
          .select("is_correct, is_skipped, question_id, created_at, questions(subject_id, chapter_id)")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("activity_logs").select("id, event, detail, created_at").order("created_at", { ascending: false }).limit(6),
        supabase.rpc("dashboard_counts"),
      ]);
      const c = (counts.data ?? {}) as Record<string, number>;
      return {
        subjects: subjects.data ?? [],
        chapters: chapters.data ?? [],
        attempts: attempts.data ?? [],
        logs: logs.data ?? [],
        counts: {
          questions: c["questions"] ?? 0,
          testsQuizzes: (c["quizzes"] ?? 0) + (c["tests"] ?? 0),
          flashcards: c["flashcards"] ?? 0,
          resources: (c["resources"] ?? 0) + (c["links"] ?? 0),
        },
      };
    },
  });


  const attempts = data?.attempts ?? [];
  const answered = attempts.filter((a) => !a.is_skipped);
  const overall = answered.length ? Math.round((answered.filter((a) => a.is_correct).length / answered.length) * 100) : 0;

  const subjectProgress = (data?.subjects ?? []).map((s, i) => {
    const rows = answered.filter((a) => (a.questions as unknown as { subject_id?: string } | null)?.subject_id === s.id);
    const pct = rows.length ? Math.round((rows.filter((r) => r.is_correct).length / rows.length) * 100) : 0;
    return { ...s, pct, attempts: rows.length, color: barColors[i % barColors.length] as string };
  });

  // Recommendation: weakest chapter with enough attempts
  const byChapter = new Map<string, { total: number; wrong: number }>();
  for (const a of answered) {
    const chapterId = (a.questions as unknown as { chapter_id?: string } | null)?.chapter_id;
    if (!chapterId) continue;
    const row = byChapter.get(chapterId) ?? { total: 0, wrong: 0 };
    row.total += 1;
    if (!a.is_correct) row.wrong += 1;
    byChapter.set(chapterId, row);
  }
  const weakest = [...byChapter.entries()]
    .filter(([, v]) => v.total >= 3)
    .map(([id, v]) => ({ id, ...v, accuracy: Math.round(((v.total - v.wrong) / v.total) * 100) }))
    .sort((a, b) => a.accuracy - b.accuracy)[0];
  const weakChapter = weakest ? data?.chapters.find((c) => c.id === weakest.id) : undefined;
  const weakSubject = weakChapter ? data?.subjects.find((s) => s.id === weakChapter.subject_id) : undefined;

  const quickStats = [
    { icon: FileQuestion, label: "Total Questions", value: data?.counts.questions ?? 0, tint: "text-[oklch(0.64_0.2_254)]" },
    { icon: ClipboardList, label: "Tests & Quizzes", value: data?.counts.testsQuizzes ?? 0, tint: "text-[oklch(0.54_0.26_285)]" },
    { icon: Layers, label: "Flashcards", value: data?.counts.flashcards ?? 0, tint: "text-[oklch(0.74_0.16_162)]" },
    { icon: FileText, label: "Study Resources", value: data?.counts.resources ?? 0, tint: "text-[oklch(0.65_0.29_319)]" },
  ];

  const quickLinks: { icon: typeof FileQuestion; label: string; to: Path }[] = [
    { icon: FileQuestion, label: "Go to Questions", to: session?.isAdmin ? "/admin/questions" : "/practice" },
    { icon: ClipboardList, label: "Start a Test", to: session?.isAdmin ? "/admin/quizzes" : "/quizzes" },
    { icon: Layers, label: "Open Flashcards", to: "/flashcards" },
    { icon: NotebookPen, label: "View Notes", to: "/notes" },
    { icon: Video, label: "Watch Videos", to: "/videos" },
  ];

  type AiLink = { icon: typeof FileQuestion; label: string; note: string; to: Path };
  const adminAi: AiLink[] = session?.isAdmin
    ? [{ icon: Sparkles, label: "AI Question Generation", note: "Generate practice questions instantly", to: "/admin/questions" }]
    : [];
  const aiLinks: AiLink[] = [
    ...adminAi,
    { icon: Brain, label: "AI Flashcard Generation", note: "Create flashcards from any topic", to: "/flashcards" },
    { icon: Target, label: "Smart Practice", note: "Focus on your weak areas", to: "/practice" },
    { icon: Bot, label: "Topic Learning Hub", note: "Notes, videos and AI explanations", to: "/topics" },
  ];

  const dailyGoal = 2 * 3600;
  const todayPct = Math.min(100, Math.round((stats.today / dailyGoal) * 100));

  // Study Journey — derived only from the member's real activity.
  const attemptDays = new Set(attempts.map((a) => String(a.created_at).slice(0, 10)));
  const hasActivity = answered.length > 0 || (data?.logs.length ?? 0) > 0 || stats.total > 0;
  const journey = [
    { icon: "🌱", label: "Start", done: true },
    { icon: "📖", label: "Learn", done: stats.total > 0 || (data?.logs.length ?? 0) > 0 },
    { icon: "🧠", label: "Practice", done: answered.length >= 5 },
    { icon: "🔄", label: "Revise", done: attemptDays.size >= 2 },
    { icon: "🏆", label: "Master", done: answered.length >= 20 && overall >= 80 },
  ];
  const journeyStage = journey.filter((s) => s.done).length;

  const modes: { icon: string; label: string; note: string; to: Path; ring: string }[] = [
    { icon: "⏱️", label: "60-Second Challenge", note: "Quick question sprint", to: "/challenge", ring: "oklch(0.86 0.16 86)" },
    { icon: "⚔️", label: "Study Battle", note: "Beat your own best score", to: "/battle", ring: "oklch(0.65 0.29 319)" },
    { icon: "🧠", label: "Memory Mode", note: "Memorise, hide, recall", to: "/memory", ring: "oklch(0.54 0.26 285)" },
    { icon: "🚨", label: "Exam Emergency", note: "Urgent revision plan", to: "/emergency", ring: "oklch(0.7 0.19 45)" },
  ];

  const starters: { icon: typeof FileQuestion; label: string; to: Path }[] = [
    { icon: FileQuestion, label: "Practice Questions", to: "/practice" },
    { icon: Layers, label: "Open Flashcards", to: "/flashcards" },
    { icon: ClipboardList, label: "Take a Quiz", to: "/quizzes" },
    { icon: Video, label: "Watch Video", to: "/videos" },
  ];


  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="min-w-0 space-y-5">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-border p-5 sm:p-8">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(110deg,oklch(0.30_0.13_262),oklch(0.34_0.17_290)_45%,oklch(0.45_0.22_330))]" />
          <div className="absolute -right-8 bottom-0 -z-10 h-48 w-72 rounded-full bg-[oklch(0.65_0.29_319/35%)] blur-3xl" />
          <h1 className="font-display text-2xl font-bold text-[oklch(0.98_0.01_270)] sm:text-3xl">
            {greeting()}, {session?.displayName ?? "there"} ☀️
          </h1>
          <p className="mt-2 max-w-lg text-[oklch(0.9_0.03_270)]">
            Keep going! Your hard work today builds your success tomorrow.
          </p>
          <p className="mt-6 font-display text-lg italic text-[oklch(0.95_0.02_270)] lg:absolute lg:right-8 lg:top-8 lg:mt-0 lg:text-xl">
            Small Steps · Big Results
          </p>
        </section>

        {/* Quick stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickStats.map((s) => (
            <div key={s.label} className="dashboard-stat rounded-2xl border border-border bg-card p-5">
              <s.icon className={cn("h-6 w-6", s.tint)} />
              <p className="mt-3 font-display text-2xl font-bold">{s.value.toLocaleString("en-IN")}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Start Your Preparation — only for accounts with no activity yet */}
        {!hasActivity && (
          <Panel>
            <h2 className="font-display font-semibold">🚀 Start Your Preparation</h2>
            <p className="text-sm text-muted-foreground">Choose a subject and start learning today!</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {starters.map((s) => (
                <Link
                  key={s.label}
                  to={s.to}
                  className="dashboard-link flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm transition-colors hover:border-primary"
                >
                  <s.icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 truncate">{s.label}</span>
                </Link>
              ))}
            </div>
          </Panel>
        )}

        {/* Study Journey */}
        <Panel>
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-display font-semibold">Study Journey</h2>
              <p className="text-xs text-muted-foreground">Stage {journeyStage} of {journey.length} — from your real progress</p>
            </div>
          </div>
          <div className="mt-4 -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
            {journey.map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  "flex min-w-[88px] flex-1 snap-start flex-col items-center gap-1 rounded-xl border p-3 text-center",
                  s.done ? "border-primary/60 bg-primary/10" : "border-border opacity-60",
                )}
              >
                <span className="text-xl">{s.icon}</span>
                <span className="text-xs font-medium">{s.label}</span>
                <span className="text-[10px] text-muted-foreground">{s.done ? "Done" : i === journeyStage ? "Next" : "Locked"}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[oklch(0.74_0.16_162)] to-[oklch(0.64_0.2_254)]"
              style={{ width: `${(journeyStage / journey.length) * 100}%` }}
            />
          </div>
        </Panel>

        {/* Exciting Features */}
        <Panel>
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-[oklch(0.65_0.29_319)]" />
            <div>
              <h2 className="font-display font-semibold">Exciting Features</h2>
              <p className="text-xs text-muted-foreground">Fast study modes built on your own question bank</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {modes.map((m) => (
              <Link
                key={m.label}
                to={m.to}
                className="dashboard-feature flex min-h-14 items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary"
                style={{ boxShadow: `inset 3px 0 0 ${m.ring}` }}
              >
                <span className="text-xl">{m.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{m.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{m.note}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </Panel>



        <div className="grid gap-5 lg:grid-cols-2">
          {/* Progress */}
          <Panel>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-display font-semibold">Your Progress</h2>
                <p className="text-xs text-muted-foreground">Overall performance across all subjects</p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-5">
              <div
                className="grid h-28 w-28 shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(oklch(0.64 0.2 254) ${overall * 3.6}deg, oklch(0.5 0.05 265 / 25%) 0deg)`,
                }}
              >
                <div className="grid h-20 w-20 place-items-center rounded-full bg-card text-center">
                  <span>
                    <span className="block font-display text-xl font-bold">{overall}%</span>
                    <span className="block text-[10px] text-muted-foreground">Accuracy</span>
                  </span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2.5">
                {subjectProgress.length === 0 && <p className="text-sm text-muted-foreground">No subjects yet.</p>}
                {subjectProgress.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    <span className="w-24 shrink-0 truncate text-muted-foreground">{s.name}</span>
                    <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                      <span className={cn("block h-full rounded-full bg-gradient-to-r", s.color)} style={{ width: `${s.pct}%` }} />
                    </span>
                    <span className="w-9 shrink-0 text-right text-xs">{s.attempts ? `${s.pct}%` : "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          {/* Study time */}
          <Panel>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="font-display font-semibold">Today's Study Time</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              You've spent <span className="font-semibold text-foreground">{formatTime(stats.today)}</span> on the Study Hub today.
            </p>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[oklch(0.64_0.2_254)] to-[oklch(0.74_0.16_162)]"
                style={{ width: `${todayPct}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs text-muted-foreground">{formatTime(stats.today)} / 2h</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Flame className="h-5 w-5 text-[oklch(0.7_0.19_45)]" />
                <span>
                  <span className="block text-xs text-muted-foreground">Current Streak</span>
                  <span className="font-display font-bold">{stats.current} days</span>
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Trophy className="h-5 w-5 text-[oklch(0.86_0.16_86)]" />
                <span>
                  <span className="block text-xs text-muted-foreground">Best Streak</span>
                  <span className="font-display font-bold">{stats.best} days</span>
                </span>
              </div>
            </div>
          </Panel>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Recommended + Recent activity */}
          <div className="space-y-5">
            <Panel>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-[oklch(0.65_0.29_319)]" />
                <div>
                  <h2 className="font-display font-semibold">Recommended for You</h2>
                  <p className="text-xs text-muted-foreground">Based on your real performance</p>
                </div>
              </div>
              {weakest && weakChapter ? (
                <div className="mt-4 rounded-xl border border-border p-4">
                  <p className="font-medium">Revise: {weakChapter.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {weakSubject?.name ?? "Subject"} · Accuracy {weakest.accuracy}% · {weakest.wrong} question
                    {weakest.wrong === 1 ? "" : "s"} wrong
                  </p>
                  <Link
                    to="/practice"
                    search={{ subject: weakChapter.subject_id, chapter: weakChapter.id }}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Start Practice <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Attempt a few questions and your weakest chapter will appear here.
                </p>
              )}
            </Panel>

            <Panel>
              <div className="flex items-center gap-2">
                <ActivityIcon className="h-5 w-5 text-primary" />
                <h2 className="font-display font-semibold">Recent Activity</h2>
              </div>
              <div className="mt-3 divide-y divide-border">
                {(data?.logs ?? []).length === 0 && <p className="py-3 text-sm text-muted-foreground">No activity yet.</p>}
                {(data?.logs ?? []).map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{l.event}</span>
                      {l.detail ? <span className="text-muted-foreground"> · {l.detail}</span> : null}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{ago(l.created_at)}</span>
                  </div>
                ))}
              </div>
              <Link to="/activity" className="mt-3 inline-flex items-center gap-1 text-sm text-primary">
                View all activity <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Panel>
          </div>

          {/* Subjects */}
          <Panel>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-display font-semibold">Subjects</h2>
                <p className="text-xs text-muted-foreground">Explore all subjects and start learning</p>
              </div>
            </div>
            {subjectProgress.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {subjectProgress.map((s) => (
                  <Link
                    key={s.id}
                    to="/topics"
                    search={{ subject: s.id }}
                    className={cn(
                      "subject-card rounded-xl border border-border bg-gradient-to-br p-4 transition-transform hover:-translate-y-0.5",
                      s.color,
                    )}
                  >
                    <span className="text-lg">{s.icon || "📘"}</span>
                    <p className="mt-2 font-semibold text-[oklch(0.99_0.005_270)]">{s.name}</p>
                    <p className="text-xs text-[oklch(0.95_0.02_270/80%)]">Chapters · Notes · Tests</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No subjects have been assigned to your account yet.
              </p>
            )}
          </Panel>
        </div>

        {/* Teacher-controlled */}
        <Panel className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-display font-semibold">Teacher-Controlled Platform</h2>
            <p className="text-sm text-muted-foreground">
              Your account, resources and access are managed through the existing teacher/admin system. Safe. Secure. Structured.
            </p>
          </div>
        </Panel>
      </div>

      {/* Right rail */}
      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-2xl border border-border p-5">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,oklch(0.32_0.14_264),oklch(0.40_0.20_300))]" />
          <div className="flex items-center gap-2 text-[oklch(0.98_0.01_270)]">
            <GraduationCap className="h-5 w-5" />
            <h2 className="font-display font-semibold">Board Exams Countdown</h2>
            <CalendarDays className="ml-auto h-4 w-4 opacity-70" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { v: countdown.days, l: "Days" },
              { v: countdown.hours, l: "Hours" },
              { v: countdown.minutes, l: "Minutes" },
            ].map((c) => (
              <div key={c.l} className="rounded-xl bg-[oklch(0.2_0.08_265/55%)] py-3">
                <p className="font-display text-2xl font-bold text-[oklch(0.98_0.01_270)]">{c.v}</p>
                <p className="text-xs text-[oklch(0.9_0.03_270)]">{c.l}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-[oklch(0.92_0.02_270)]">Stay focused. You can do it! 💪</p>
        </section>

        <Panel>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-[oklch(0.86_0.16_86)]" />
            <h2 className="font-display font-semibold">Quick Links</h2>
          </div>
          <div className="mt-3 space-y-2">
            {quickLinks.map((q) => (
              <Link
                key={q.label}
                to={q.to}
                className="dashboard-link flex items-center gap-3 rounded-xl border border-border p-3 text-sm transition-colors hover:border-primary"
              >
                <q.icon className="h-4 w-4 text-primary" />
                <span className="flex-1">{q.label}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[oklch(0.65_0.29_319)]" />
            <div>
              <h2 className="font-display font-semibold">AI-Powered Learning</h2>
              <p className="text-xs text-muted-foreground">Study smarter with AI tools</p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {aiLinks.map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className="dashboard-link flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary"
              >
                <a.icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{a.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{a.note}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
