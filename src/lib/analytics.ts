import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

type EventType =
  | 'view_node'
  | 'expand_reasoning'
  | 'expand_reasoning_bullet'
  | 'click_related'
  | 'search'
  | 'page_view'
  | 'click_category'
  | 'click_recently_viewed'
  | 'diagnostic_start'
  | 'diagnostic_respond'
  | 'diagnostic_edit_response'
  | 'diagnostic_complete'
  | 'diagnostic_route_choice'
  | 'copy_share_link'
  | 'scroll_to_bottom'
  | 'session_start'
  | 'sign_in'
  | 'sign_up';

const SESSION_KEY = 'qn_session_id';

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);

    // Fire session_start for new sessions
    const metadata: Record<string, Json> = {
      user_agent: navigator.userAgent,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      is_mobile: window.innerWidth < 768,
    };
    // Use raw insert to avoid circular dependency with trackEvent
    supabase
      .from('events')
      .insert([{
        event_type: 'session_start' as string,
        session_id: id,
        metadata,
      }])
      .then(({ error }) => {
        if (error) console.warn('[analytics]', error.message);
      });
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
