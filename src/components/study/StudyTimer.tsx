import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSessionInfo } from '@/hooks/useSession';

// A single visible, focused tab owns the heartbeat; server timestamps prevent
// overlapping sessions from multiplying elapsed time. Hidden/idle time is excluded.
export function StudyTimer() {
  const {data:session} = useSessionInfo();
  useEffect(() => {
    if (!session?.userId || !session.isActive) return;
    let lastInput = performance.now(), stopped = false, busy = false, release: (()=>void) | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    const active = () => document.visibilityState === 'visible' && document.hasFocus() && performance.now()-lastInput < 60000;
    const heartbeat = async (value:boolean) => {
      if (busy) return;
      busy = true;
      try { await supabase.rpc('study_heartbeat', {_active:value}); } finally { busy=false; }
    };
    const stop = () => { if(timer) { clearInterval(timer); timer=undefined; void heartbeat(false); } release?.(); release=undefined; };
    const start = async () => {
      if(stopped || !active() || timer) return;
      const run = async () => {
        if(stopped || !active()) return;
        void heartbeat(true);
        timer=setInterval(() => { if(!active()) stop(); else void heartbeat(true); },5000);
        await new Promise<void>(resolve => { release=resolve; });
      };
      if(navigator.locks) await navigator.locks.request(`study-${session.userId}`, {ifAvailable:true}, async lock => {if(lock) await run();});
      else await run();
    };
    const input = () => { lastInput=performance.now(); void start(); };
    const visibility = () => { if(document.visibilityState==='hidden' || !document.hasFocus()) stop(); else input(); };
    const events=['pointerdown','pointermove','keydown','scroll','touchstart'];
    events.forEach(e=>window.addEventListener(e,input,{passive:true}));
    window.addEventListener('focus',visibility); window.addEventListener('blur',visibility); document.addEventListener('visibilitychange',visibility);
    void start();
    return () => { stopped=true; stop(); events.forEach(e=>window.removeEventListener(e,input)); window.removeEventListener('focus',visibility); window.removeEventListener('blur',visibility); document.removeEventListener('visibilitychange',visibility); };
  },[session?.userId,session?.isActive]);
  return null;
}
