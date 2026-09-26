import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  BookOpen,
  Bot,
  CheckCircle2,
  ClipboardList,
  FileText,
  FlaskConical,
  Globe,
  Languages,
  Sigma,
  Flame,
  GraduationCap,
  HelpCircle,
  Layers,
  LineChart,
  Lock,
  Monitor,
  Sparkles,
  Target,
  Timer,
  Trophy,
  UserCog,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { getLandingStats } from "@/lib/landing.functions";
import heroImage from "@/assets/landing-hero.jpg";

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      return await getLandingStats();
    } catch {
      return { questions: 0, testsAndQuizzes: 0, flashcards: 0, resources: 0 } as Awaited<ReturnType<typeof getLandingStats>>;
    }
  },
  head: () => ({
    meta: [
      { title: "Class 10 Study Hub — CBSE Class 10 Preparation, All in One Place" },
      {
        name: "description",
        content:
          "Class 10 Study Hub brings CBSE question banks, quizzes, tests, flashcards, videos, PDFs and progress tracking together in one teacher-controlled platform.",
      },
      { property: "og:title", content: "Class 10 Study Hub — CBSE Class 10 Preparation, All in One Place" },
      {
        property: "og:description",
        content:
          "Practice smarter, learn faster and track your progress with chapter-wise questions, tests, flashcards and study resources.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "Subjects", href: "#subjects" },
  { label: "About", href: "#about" },
];

const subjects = [
  { name: "Mathematics", glyph: "π", icon: Sigma, tint: "from-chart-3/30 to-chart-1/10" },
  { name: "Science", glyph: "S", icon: FlaskConical, tint: "from-chart-1/30 to-chart-4/10" },
  { name: "Social Science", glyph: "G", icon: Globe, tint: "from-chart-5/30 to-chart-4/10" },
  { name: "English", glyph: "E", icon: BookOpen, tint: "from-chart-2/30 to-chart-3/10" },
  { name: "Hindi", glyph: "अ", icon: Languages, tint: "from-chart-3/30 to-chart-5/10" },
  { name: "IT", glyph: "IT", icon: Monitor, tint: "from-chart-2/30 to-chart-1/10" },
];

const journey = [
  {
    step: "1. Learn",
    icon: BookOpen,
    items: ["Videos", "PDFs", "Notes & Flashcards"],
  },
  {
    step: "2. Practice",
    icon: Target,
    items: ["Questions", "Quizzes & Tests", "Chapter-wise Practice"],
  },
  {
    step: "3. Improve",
    icon: LineChart,
    items: ["Accuracy", "Streaks", "Study Time & Achievements"],
  },
];

const boardPoints = [
  "CBSE-style questions",
  "Competency-based questions",
  "Case-based questions",
  "Assertion & Reason",
  "Mock Tests",
  "Complete board exam preparation",
];

const controlPoints = [
  { icon: Users, title: "Controlled Access", text: "by Teachers/Admin" },
  { icon: ClipboardList, title: "Manage Resources", text: "& Content" },
  { icon: LineChart, title: "Track Progress", text: "& Performance" },
  { icon: Lock, title: "Secure & Reliable", text: "Platform" },
];

function Section({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto w-full max-w-6xl px-4">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">{children}</div>
    </section>
  );
}

function Landing() {
  const stats = Route.useLoaderData();

  const glance = [
    { icon: HelpCircle, label: "Questions", value: stats.questions, note: "Practice questions" },
    { icon: ClipboardList, label: "Tests & Quizzes", value: stats.testsAndQuizzes, note: "Chapter & mock tests" },
    { icon: Layers, label: "Flashcards", value: stats.flashcards, note: "AI generated sets" },
    { icon: FileText, label: "Study Resources", value: stats.resources, note: "PDFs, notes, videos & more" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-semibold">
              Class 10 <span className="text-primary">Study Hub</span>
            </span>
          </Link>
          <nav className="ml-6 hidden items-center gap-6 text-sm md:flex">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm" className="rounded-full">
              <Link to="/auth">
                <Users className="mr-1.5 h-4 w-4" /> Member Sign In
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="space-y-6 pb-10">
        {/* Hero */}
        <section id="home" className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 lg:grid-cols-2 lg:py-16">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium">
                <BookOpen className="h-3.5 w-3.5 text-primary" /> CBSE Class 10
              </p>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
                Your Class 10 preparation, all in{" "}
                <span className="bg-gradient-to-r from-chart-3 via-chart-2 to-chart-1 bg-clip-text text-transparent">
                  one place
                </span>
                .
              </h1>
              <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
                Practice smarter. Learn faster. Track your progress. Prepare confidently for your boards.
              </p>
              <Button asChild size="lg" className="mt-7 rounded-full px-6">
                <Link to="/auth">
                  <Users className="mr-2 h-4 w-4" /> Member Sign In <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <p className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> Secure
                <span aria-hidden>•</span> Teacher Controlled
                <span aria-hidden>•</span> CBSE Focused
              </p>
            </div>
            <div className="relative">
              <img
                src={heroImage}
                alt="Illustration of the Class 10 Study Hub dashboard on a laptop with books and study icons"
                width={1280}
                height={960}
                className="w-full rounded-2xl border border-border shadow-lg"
              />
            </div>
          </div>
        </section>

        {/* At a glance */}
        <Section id="features">
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <div>
              <h2 className="font-display text-2xl font-bold">
                Our Platform
                <br />
                at a Glance
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Everything you need for Class 10 success.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {glance.map((g) => (
                <div
                  key={g.label}
                  className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <g.icon className="h-4 w-4" />
                  </span>
                  <p className="mt-3 text-sm text-muted-foreground">{g.label}</p>
                  <p className="font-display text-2xl font-bold">{g.value.toLocaleString("en-IN")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{g.note}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Learn → Practice → Improve */}
        <Section>
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <div>
              <p className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                THE SMART WAY
              </p>
              <h2 className="mt-4 font-display text-2xl font-bold">
                Learn <span className="text-muted-foreground">→</span> Practice{" "}
                <span className="text-muted-foreground">→</span>{" "}
                <span className="bg-gradient-to-r from-chart-3 to-chart-2 bg-clip-text text-transparent">
                  Improve
                </span>
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                A complete learning cycle designed to help you build concepts, practice effectively and track
                your progress.
              </p>
            </div>
            <div className="grid items-stretch gap-4 sm:grid-cols-3">
              {journey.map((j) => (
                <div
                  key={j.step}
                  className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <j.icon className="h-4 w-4" />
                  </span>
                  <h3 className="mt-3 font-display text-lg font-semibold">{j.step}</h3>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {j.items.map((i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden /> {i}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Track your progress */}
        <Section>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <LineChart className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold">Track Your Progress</h2>
              <p className="text-sm text-muted-foreground">See your growth. Stay motivated.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.2fr_220px]">
            <div className="space-y-3">
              {[
                { icon: Flame, title: "Study Streak", text: "Counted from real study time, not logins" },
                { icon: Timer, title: "Study Time", text: "Daily and total active study time" },
                { icon: Trophy, title: "Achievements", text: "Unlocked as your streak and hours grow" },
              ].map((r) => (
                <div key={r.title} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <r.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">Chapter Progress</p>
              <ul className="mt-3 space-y-3">
                {subjects.slice(0, 4).map((s) => (
                  <li key={s.name} className="flex items-center gap-3 text-sm">
                    <s.icon aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                    <span className="w-28 shrink-0 truncate text-muted-foreground">{s.name}</span>
                    <span className="h-2 flex-1 rounded-full bg-secondary">
                      <span className="block h-2 w-0 rounded-full bg-gradient-to-r from-chart-3 to-chart-2" />
                    </span>
                    <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                      after sign in
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Your chapter-wise tracker fills up as you complete work.
              </p>
            </div>

            <div className="hidden items-center justify-center text-center lg:flex">
              <p className="font-display text-2xl leading-tight italic text-muted-foreground">
                Small
                <br />
                Steps
                <br />
                <span className="text-primary">Big</span>
                <br />
                Results
              </p>
            </div>
          </div>
        </Section>

        {/* Subjects */}
        <Section id="subjects">
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <div>
              <h2 className="font-display text-xl font-bold">Explore All Subjects</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Access complete study material for all subjects and chapters, organized for your convenience.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {subjects.map((s) => (
                <Link
                  key={s.name}
                  to="/auth"
                  className={`rounded-xl border border-border bg-gradient-to-br ${s.tint} p-3 text-center transition-transform hover:-translate-y-0.5`}
                >
                  <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-card text-primary">
                    <s.icon aria-hidden className="h-4 w-4" />
                  </span>
                  <p className="mt-2 text-sm font-semibold">{s.name}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Chapters · Notes · Practice</p>
                  <span className="mx-auto mt-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </Section>

        {/* AI + Board prep */}
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold">AI-Powered Learning</h2>
                <p className="text-sm text-muted-foreground">Smarter tools. Better results.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { icon: HelpCircle, title: "AI Question Generation", text: "Create practice questions" },
                { icon: Layers, title: "AI Flashcard Generation", text: "Quick & smart flashcards" },
                { icon: Sparkles, title: "Smart Practice", text: "Personalised practice sets" },
              ].map((c) => (
                <div key={c.title} className="rounded-xl border border-border bg-card p-3">
                  <c.icon className="h-4 w-4 text-primary" />
                  <p className="mt-2 text-sm font-semibold">{c.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-gradient-to-br from-chart-3/20 via-card to-chart-2/15 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Target className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold">Board Exam Preparation</h2>
                <p className="text-sm text-muted-foreground">Be ready for the real exam.</p>
              </div>
            </div>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {boardPoints.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {p}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Teacher controlled */}
        <Section id="about">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr] lg:items-center">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <UserCog className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold">Teacher-Controlled Platform</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Accounts, resources and access are managed through the existing teacher/admin system. Safe.
                  Secure. Structured.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {controlPoints.map((c) => (
                <div key={c.title} className="text-center">
                  <c.icon className="mx-auto h-5 w-5 text-primary" />
                  <p className="mt-2 text-sm font-semibold">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display font-semibold">
                Class 10 <span className="text-primary">Study Hub</span>
              </p>
              <p className="text-xs text-muted-foreground">Better Learning • Brighter Future</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Monitor className="h-3.5 w-3.5" /> CBSE Class 10
            </span>
            <span aria-hidden>|</span>
            <span>Study Smart</span>
            <span aria-hidden>•</span>
            <span className="flex items-center gap-1">
              <Award className="h-3.5 w-3.5" /> Score High
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
