export type StudyDay = { study_date: string; seconds: number };
export const studyDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
export const shiftDate = (day: string, amount: number) => new Date(Date.parse(day + 'T12:00:00Z') + amount * 86400000).toISOString().slice(0, 10);
export const formatTime = (seconds: number) => { const m = Math.floor(seconds / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };
export const achievementDefinitions = [
  ...[1, 3, 7, 14, 30].map(target => ({ id: `streak-${target}`, name: target === 1 ? 'First Day' : `${target}-Day Streak`, description: target === 1 ? 'Study for at least 10 minutes in one day.' : `Study at least 10 minutes daily for ${target} consecutive days.`, target, kind: 'streak' as const })),
  ...[1, 5, 10, 25, 50].map(hours => ({ id: `hours-${hours}`, name: `${hours} ${hours === 1 ? 'Hour' : 'Hours'}`, description: `Reach ${hours} ${hours === 1 ? 'hour' : 'hours'} of total study time.`, target: hours * 3600, kind: 'time' as const })),
];
export function studyStats(days: StudyDay[], today = studyDate()) {
  const rows = [...days].sort((a,b) => a.study_date.localeCompare(b.study_date));
  let total = 0, best = 0, run = 0, last = '';
  const unlocked: Record<string, string> = {};
  for (const row of rows) {
    total += row.seconds;
    if (row.seconds >= 600) { run = last === shiftDate(row.study_date, -1) ? run + 1 : 1; last = row.study_date; best = Math.max(best, run); }
    else run = 0;
    for (const a of achievementDefinitions) if (!unlocked[a.id] && (a.kind === 'time' ? total : run) >= a.target) unlocked[a.id] = row.study_date;
  }
  const qualified = new Set(rows.filter(d => d.seconds >= 600).map(d => d.study_date));
  let cursor = qualified.has(today) ? today : shiftDate(today, -1), current = 0;
  while (qualified.has(cursor)) { current++; cursor = shiftDate(cursor, -1); }
  return { total, best, current, today: rows.find(r => r.study_date === today)?.seconds ?? 0, unlocked };
}
export function studyHistory(days: StudyDay[], today = studyDate()) {
  const map = new Map(days.map(d => [d.study_date, d.seconds]));
  const first = days.reduce((a,d) => d.study_date < a ? d.study_date : a, today);
  const result: StudyDay[] = [];
  for (let date = today; date >= first; date = shiftDate(date, -1)) result.push({ study_date: date, seconds: map.get(date) ?? 0 });
  return result;
}
