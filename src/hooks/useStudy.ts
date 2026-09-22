import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
export function useStudy(userId?: string) {
  return useQuery({ queryKey: ['study-days', userId], enabled: !!userId, refetchInterval: 15000, queryFn: async () => {
    if (!userId) return [];
    const rows: {study_date:string; seconds:number}[] = [];
    for (let offset=0;;offset+=1000) {
      const {data,error} = await supabase.from('study_days').select('study_date, seconds').eq('user_id',userId).order('study_date').range(offset,offset+999);
      if(error) throw error;
      rows.push(...data);
      if(data.length<1000) return rows;
    }
  }});
}
