
-- Analytics events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  node_id TEXT,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS (allow anonymous inserts, no reads from client)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert events (public analytics)
CREATE POLICY "Anyone can insert events"
ON public.events
FOR INSERT
WITH CHECK (true);

-- Index for querying by event type and node
CREATE INDEX idx_events_event_type ON public.events (event_type);
CREATE INDEX idx_events_node_id ON public.events (node_id);
CREATE INDEX idx_events_created_at ON public.events (created_at);
