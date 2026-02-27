
-- Add tier and spine_gates columns to nodes table
ALTER TABLE public.nodes ADD COLUMN tier integer;
ALTER TABLE public.nodes ADD COLUMN spine_gates jsonb NOT NULL DEFAULT '[]'::jsonb;
