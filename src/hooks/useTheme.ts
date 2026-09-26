import { useEffect, useState } from "react";

export type Theme = "neon" | "default" | "light" | "nordic" | "cosmic";

const KEY = "app-theme";

export const THEMES: { value: Theme; label: string; emoji: string }[] = [
  { value: "neon", label: "Neon Academic", emoji: "⚡" },
  { value: "default", label: "Aurora", emoji: "🌈" },
  { value: "light", label: "White", emoji: "☀️" },
  { value: "nordic", label: "Soft Pastel 3D", emoji: "🍑" },
  { value: "cosmic", label: "Cosmic", emoji: "🌌" },
];

function isTheme(v: string | null): v is Theme {
  return v === "neon" || v === "default" || v === "light" || v === "nordic" || v === "cosmic";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("theme-neon", "theme-default", "theme-light", "theme-nordic", "theme-cosmic");
  root.classList.add(`theme-${theme}`);
  root.classList.toggle("dark", theme !== "light" && theme !== "nordic");
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* storage unavailable */
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("neon");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {
      stored = null;
    }
    const initial: Theme = isTheme(stored) ? stored : "neon";
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    applyTheme(t);
  }

  return { theme, setTheme };
}
