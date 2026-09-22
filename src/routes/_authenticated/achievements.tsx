import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { useSessionInfo } from '@/hooks/useSession';
import { StudyStatistics } from '@/components/study/StudyStatistics';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/_authenticated/achievements')({
  head: () => ({
    meta: [
      { title: 'Study Statistics & Achievements — CBSE 10 Prep' },
      { name: 'description', content: 'Your active study time, daily streaks and earned study achievements.' },
      { property: 'og:title', content: 'Study Statistics & Achievements — CBSE 10 Prep' },
      { property: 'og:description', content: 'Track meaningful study time and celebrate your Class 10 study milestones.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: Achievements,
});

function Achievements() {
  const { data: session } = useSessionInfo();
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">Study statistics & achievements</h1>
        <Button
          variant="outline"
          size="icon"
          aria-label="Close study statistics"
          onClick={() => navigate({ to: '/dashboard' })}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <StudyStatistics userId={session?.userId} />
    </div>
  );
}
