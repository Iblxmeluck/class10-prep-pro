import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Flame, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStudy } from '@/hooks/useStudy';
import { useSessionInfo } from '@/hooks/useSession';
import { studyStats } from '@/lib/study';
import { supabase } from '@/integrations/supabase/client';

export function TrophyButton() {
  const { data: session } = useSessionInfo();
  const { data } = useStudy(session?.userId);
  const streak = studyStats(data ?? []).current;
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const open = pathname === '/achievements';

  const { data: exp } = useQuery({
    queryKey: ['my-exp', session?.userId],
    enabled: !!session?.userId,
    queryFn: async () =>
      (await supabase.from('member_exp').select('balance').eq('user_id', session!.userId).maybeSingle()).data?.balance ?? 0,
  });

  return (
    <div className="flex items-center gap-0.5">
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
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 gap-1 px-1.5 text-xs font-semibold sm:px-2 sm:text-sm"
        title="Your EXP balance — open the EXP Store"
        aria-label={`Your EXP balance is ${exp ?? 0}. Open the EXP store.`}
        onClick={() => navigate({ to: '/store' })}
      >
        <Star className="h-4 w-4 text-primary" />
        <span className="tabular-nums">{(exp ?? 0).toLocaleString()}</span>
        <span className="hidden sm:inline">EXP</span>
      </Button>
    </div>
  );
}
