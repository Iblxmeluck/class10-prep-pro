import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Trophy, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStudy } from '@/hooks/useStudy';
import { useSessionInfo } from '@/hooks/useSession';
import { studyStats } from '@/lib/study';

export function TrophyButton() {
  const { data: session } = useSessionInfo();
  const { data } = useStudy(session?.userId);
  const streak = studyStats(data ?? []).current;
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const open = pathname === '/achievements';

  return (
    <Button
      variant={open ? 'secondary' : 'ghost'}
      size="sm"
      aria-pressed={open}
      title={open ? 'Close study statistics' : 'Study statistics and achievements'}
      aria-label={`${open ? 'Close' : 'Open'} study statistics and achievements${streak ? `, ${streak} day streak` : ''}`}
      onClick={() => navigate({ to: open ? '/dashboard' : '/achievements' })}
    >
      <Trophy className="h-4 w-4" />
      {streak > 0 && (
        <>
          <Flame className="h-3 w-3 text-primary" />
          <span>{streak}</span>
        </>
      )}
    </Button>
  );
}
