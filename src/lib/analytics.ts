import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

type EventType = 'view_node' | 'expand_reasoning' | 'expand_reasoning_bullet' | 'click_related' | 'search';

const SESSION_KEY = 'qn_session_id';

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function trackEvent(
  eventType: EventType,
  nodeId?: string | null,
  metadata?: Record<string, Json>,
) {
  // Fire-and-forget — never block UI
  supabase
    .from('events')
    .insert([{
      event_type: eventType,
      node_id: nodeId ?? null,
      session_id: getSessionId(),
      metadata: metadata ?? {},
    }])
    .then(({ error }) => {
      if (error) console.warn('[analytics]', error.message);
    });
}
