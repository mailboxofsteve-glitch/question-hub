
-- Create the nodes table for Question Node platform
CREATE TABLE public.nodes (
  id TEXT NOT NULL UNIQUE PRIMARY KEY,
  title TEXT NOT NULL,
  alt_phrasings JSONB DEFAULT '[]'::jsonb,
  category TEXT,
  keywords TEXT,
  layer1 TEXT,
  layer2_json JSONB DEFAULT '{}'::jsonb,
  layer3_json JSONB DEFAULT '{}'::jsonb,
  published BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;

-- Public read policy for published nodes (content platform)
CREATE POLICY "Anyone can read published nodes"
  ON public.nodes FOR SELECT
  USING (published = true);

-- Create index for category filtering
CREATE INDEX idx_nodes_category ON public.nodes (category);

-- Create GIN index on alt_phrasings for future semantic search
CREATE INDEX idx_nodes_alt_phrasings ON public.nodes USING GIN (alt_phrasings);

-- Create GIN index on layer2_json for structured queries
CREATE INDEX idx_nodes_layer2_json ON public.nodes USING GIN (layer2_json);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_nodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_nodes_updated_at
  BEFORE UPDATE ON public.nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nodes_updated_at();
