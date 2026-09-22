import { useState } from 'react';
import { Flame, Trophy, Clock, LockKeyhole, Medal } from 'lucide-react';
import { useStudy } from '@/hooks/useStudy';
import { achievementDefinitions, formatTime, studyHistory, studyStats } from '@/lib/study';
import { Button } from '@/components/ui/button';

export function StudyStatistics({userId, showAchievements=true}: {userId?:string|undefined; showAchievements?:boolean|undefined}) {
  const query=useStudy(userId);
  const [limit,setLimit]=useState(30);
  if(query.isPending) return <p className="text-muted-foreground">Loading study statistics…</p>;
  if(query.isError) return <p role="alert" className="text-destructive">Study statistics could not be loaded. <Button variant="outline" onClick={()=>query.refetch()}>Retry</Button></p>;
  const stats=studyStats(query.data);
  const history=studyHistory(query.data);
  const cards=[{label:'Current study streak',value:`${stats.current} days`,icon:Flame},{label:'Best study streak',value:`${stats.best} days`,icon:Trophy},{label:"Today's study time",value:formatTime(stats.today),icon:Clock},{label:'Total study time',value:formatTime(stats.total),icon:Clock}];
  return <div className="space-y-8">
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{cards.map(c=><div key={c.label} className="rounded-lg border border-border bg-card p-4"><c.icon className="mb-3 h-5 w-5 text-primary"/><p className="text-xl font-semibold">{c.value}</p><p className="text-sm text-muted-foreground">{c.label}</p></div>)}</div>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Daily study time</h2><p className="text-sm text-muted-foreground">India time · A study day requires at least 10 minutes.</p>
      <div className="divide-y divide-border">{history.slice(0,limit).map(day=><div key={day.study_date} className="flex items-center justify-between gap-3 py-3"><time dateTime={day.study_date}>{new Date(day.study_date+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</time><span className="flex items-center gap-2 font-medium">{day.seconds>=600 && <Flame aria-label="Study day" className="h-4 w-4 text-primary"/>}{formatTime(day.seconds)}</span></div>)}</div>
      {history.length>limit && <Button variant="outline" onClick={()=>setLimit(n=>n+30)}>Show earlier dates</Button>}
    </section>
    <section className="space-y-4"><h2 className="text-lg font-semibold">Achievements · {Object.keys(stats.unlocked).length}/{achievementDefinitions.length}</h2>
    {showAchievements && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{achievementDefinitions.map(a=>{const date=stats.unlocked[a.id];const value=Math.min(a.target,a.kind==='time'?stats.total:stats.best);return <article key={a.id} className="rounded-lg border border-border bg-card p-5"><div className="mb-3 flex items-center justify-between">{date?<Medal className="h-6 w-6 text-primary"/>:<LockKeyhole className="h-6 w-6 text-muted-foreground"/>}<span className="text-xs text-muted-foreground">{date?'Unlocked':'Locked'}</span></div><h3 className="font-semibold">{a.name}</h3><p className="mt-1 min-h-10 text-sm text-muted-foreground">{a.description}</p><progress className="mt-4 h-2 w-full accent-primary" aria-label={`${a.name} progress`} value={value} max={a.target}/><p className="mt-2 text-xs text-muted-foreground">{date?`Unlocked ${new Date(date+'T12:00:00Z').toLocaleDateString('en-GB')}`:a.kind==='time'?`${formatTime(value)} / ${formatTime(a.target)}`:`${value} / ${a.target} days`}</p></article>;})}</div>}
    </section>
  </div>;
}
