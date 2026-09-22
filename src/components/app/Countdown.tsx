import { useEffect, useState } from "react";

const UNIT_LABEL: Record<string, [string, string]> = {
  minute: ["Minute", "Minutes"],
  hour: ["Hour", "Hours"],
  day: ["Day", "Days"],
  week: ["Week", "Weeks"],
  month: ["Month", "Months"],
};

export function durationLabel(value: number, unit: string) {
  const pair = UNIT_LABEL[unit] ?? ["", ""];
  return `${value} ${value === 1 ? pair[0] : pair[1]}`;
}

export function formatRemaining(ms: number) {
  if (ms <= 0) return "Expired";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d} Day${d === 1 ? "" : "s"} ${h} Hour${h === 1 ? "" : "s"}`;
  if (h > 0) return `${h} Hour${h === 1 ? "" : "s"} ${m} Minute${m === 1 ? "" : "s"}`;
  if (m > 0) return `${m} Minute${m === 1 ? "" : "s"} ${sec} Second${sec === 1 ? "" : "s"}`;
  return `${sec} Second${sec === 1 ? "" : "s"}`;
}

/** Live countdown to an ISO timestamp. Informational only — the server enforces access. */
export function Countdown({ expiresAt, onExpire }: { expiresAt: string | null; onExpire?: () => void }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const left = expiresAt ? new Date(expiresAt).getTime() - now : Number.POSITIVE_INFINITY;

  useEffect(() => {
    if (expiresAt && left <= 0) onExpire?.();
  }, [expiresAt, left, onExpire]);

  if (!expiresAt) return <span className="tabular-nums">Unlimited</span>;
  return <span className="tabular-nums">{formatRemaining(left)}</span>;
}
