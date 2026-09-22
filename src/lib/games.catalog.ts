import type { GAME_KEYS } from "@/lib/games.functions";

export type GameKey = (typeof GAME_KEYS)[number];

export type GameDef = {
  key: GameKey;
  emoji: string;
  title: string;
  blurb: string;
  /** Gradient used for the card face. Theme-aware oklch accents. */
  gradient: string;
  accent: string;
  /** Locked to one subject (matched by name) when set. */
  subjectName?: string;
  /** Which difficulty levels make sense for this game. */
  difficulties: ("Easy" | "Medium" | "Hard")[];
  kind: "mcq" | "pairs" | "words";
  /** Questions / pairs per round. */
  count: number;
  /** Round timer in seconds, null = untimed. */
  limitSeconds: number | null;
  lifelines?: boolean;
  lives?: number;
  stages?: number;
  progressive?: boolean;
  /** Extra points per correct answer for score-based games. */
  pointsPerCorrect?: number;
};

export const GAMES: GameDef[] = [
  {
    key: "battle",
    emoji: "⚔️",
    title: "Study Battle",
    blurb: "Beat your own previous score on real questions from any chapter.",
    gradient: "from-[oklch(0.54_0.26_285)] to-[oklch(0.65_0.29_319)]",
    accent: "text-[oklch(0.65_0.29_319)]",
    difficulties: ["Easy", "Medium", "Hard"],
    kind: "mcq",
    count: 10,
    limitSeconds: null,
  },
  {
    key: "memory_match",
    emoji: "🧠",
    title: "Memory Match",
    blurb: "Flip cards and match terms with their meanings, formulas and answers.",
    gradient: "from-[oklch(0.64_0.2_254)] to-[oklch(0.74_0.16_162)]",
    accent: "text-[oklch(0.74_0.16_162)]",
    difficulties: ["Easy", "Medium", "Hard"],
    kind: "pairs",
    count: 6,
    limitSeconds: null,
  },
  {
    key: "millionaire",
    emoji: "💰",
    title: "Knowledge Millionaire",
    blurb: "Climb the money ladder with lifelines: 50/50, remove one, hint.",
    gradient: "from-[oklch(0.86_0.16_86)] to-[oklch(0.7_0.19_45)]",
    accent: "text-[oklch(0.86_0.16_86)]",
    difficulties: ["Easy", "Medium", "Hard"],
    kind: "mcq",
    count: 10,
    limitSeconds: null,
    lifelines: true,
    progressive: true,
    pointsPerCorrect: 100,
  },
  {
    key: "escape",
    emoji: "🏃",
    title: "Escape the Exam",
    blurb: "Clear stage after stage. Wrong answers cost a life and time.",
    gradient: "from-[oklch(0.7_0.19_45)] to-[oklch(0.65_0.29_319)]",
    accent: "text-[oklch(0.7_0.19_45)]",
    difficulties: ["Easy", "Medium", "Hard"],
    kind: "mcq",
    count: 12,
    limitSeconds: 240,
    lives: 3,
    stages: 4,
  },
  {
    key: "science_lab",
    emoji: "🧪",
    title: "Science Lab",
    blurb: "Science-only challenges with instant feedback after every answer.",
    gradient: "from-[oklch(0.74_0.16_162)] to-[oklch(0.64_0.2_254)]",
    accent: "text-[oklch(0.74_0.16_162)]",
    subjectName: "Science",
    difficulties: ["Easy", "Medium", "Hard"],
    kind: "mcq",
    count: 10,
    limitSeconds: null,
  },
  {
    key: "time_machine",
    emoji: "🌍",
    title: "SST Time Machine",
    blurb: "History, Geography, Civics and Economics challenges from your chapters.",
    gradient: "from-[oklch(0.64_0.2_254)] to-[oklch(0.86_0.16_86)]",
    accent: "text-[oklch(0.64_0.2_254)]",
    subjectName: "Social Science",
    difficulties: ["Easy", "Medium", "Hard"],
    kind: "mcq",
    count: 10,
    limitSeconds: null,
  },
  {
    key: "maths_speed",
    emoji: "🧮",
    title: "Maths Speed Run",
    blurb: "Solve as many Maths questions as you can before the clock stops.",
    gradient: "from-[oklch(0.65_0.29_319)] to-[oklch(0.64_0.2_254)]",
    accent: "text-[oklch(0.65_0.29_319)]",
    subjectName: "Mathematics",
    difficulties: ["Easy", "Medium", "Hard"],
    kind: "mcq",
    count: 15,
    limitSeconds: 120,
    progressive: true,
  },
  {
    key: "word_builder",
    emoji: "🔤",
    title: "Word Builder",
    blurb: "Unscramble terms from English, Hindi and IT chapters letter by letter.",
    gradient: "from-[oklch(0.86_0.16_86)] to-[oklch(0.74_0.16_162)]",
    accent: "text-[oklch(0.86_0.16_86)]",
    difficulties: ["Easy", "Medium", "Hard"],
    kind: "words",
    count: 8,
    limitSeconds: null,
  },
  {
    key: "sixty_second",
    emoji: "⚡",
    title: "60-Second Challenge",
    blurb: "One minute, mixed questions, as many correct answers as possible.",
    gradient: "from-[oklch(0.7_0.19_45)] to-[oklch(0.86_0.16_86)]",
    accent: "text-[oklch(0.86_0.16_86)]",
    difficulties: ["Easy", "Medium", "Hard"],
    kind: "mcq",
    count: 20,
    limitSeconds: 60,
  },
];

export const SUBJECT_FILTERS = [
  "All",
  "Mathematics",
  "Science",
  "Social Science",
  "English",
  "Hindi",
  "Information technology",
] as const;
