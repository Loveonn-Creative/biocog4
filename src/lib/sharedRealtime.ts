import { useEffect } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "@/lib/queryClient";

// One realtime channel per table and filter, however many components show the
// same data. A change refreshes the cached query once; the channel closes when
// the last component using it unmounts. (Before, every hook instance opened
// its own channel and refetched on its own.)
type Entry = { channel: ReturnType<typeof supabase.channel>; users: number };
const channels = new Map<string, Entry>();
let seq = 0;

export function useRealtimeRefresh(table: string, filter: string | null, queryKey: QueryKey, enabled = true): void {
  const keyStr = JSON.stringify(queryKey);
  useEffect(() => {
    if (!enabled || !filter) return;
    const id = `${table}|${filter}|${keyStr}`;
    let entry = channels.get(id);
    if (!entry) {
      const key = JSON.parse(keyStr) as QueryKey;
      const channel = supabase
        .channel(`shared-${table}-${++seq}`)
        .on("postgres_changes", { event: "*", schema: "public", table, filter }, () => {
          void queryClient.invalidateQueries({ queryKey: key });
        })
        .subscribe();
      entry = { channel, users: 0 };
      channels.set(id, entry);
    }
    entry.users++;
    return () => {
      const e = channels.get(id);
      if (!e) return;
      e.users--;
      if (e.users <= 0) { void supabase.removeChannel(e.channel); channels.delete(id); }
    };
  }, [table, filter, keyStr, enabled]);
}
