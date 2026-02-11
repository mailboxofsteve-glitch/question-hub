import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { ArrowLeft, ChevronRight, BookOpen, Lightbulb, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/analytics';
import AppLayout from '@/components/layout/AppLayout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ReasoningBullet {
  id: string;
  title: string;
  summary: string;
  detail: string;
}

interface Layer2 {
  reasoning?: ReasoningBullet[];
}

interface Resource {
  title: string;
  url?: string;
  description?: string;
}

interface Layer3 {
  resources?: Resource[];
  related_questions?: string[];
  editorial_notes?: Record<string, string>;
}

const NodeDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: node, isLoading, error } = useQuery({
    queryKey: ['node-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .eq('id', id!)
        .eq('published', true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch related node titles for Layer 3
  const relatedIds = (node?.layer3_json as Layer3)?.related_questions ?? [];
  const { data: relatedNodes } = useQuery({
    queryKey: ['related-nodes', relatedIds],
    queryFn: async () => {
      if (relatedIds.length === 0) return [];
      // Supabase uses CSV for `in` filter — convert underscores in IDs to hyphens
      const normalized = relatedIds.map(r => r.replace(/_/g, '-'));
      const { data, error } = await supabase
        .from('nodes')
        .select('id, title, layer1, category')
        .eq('published', true)
        .in('id', normalized);
      if (error) throw error;
      return data;
    },
    enabled: relatedIds.length > 0,
  });

  const layer2 = (node?.layer2_json as Layer2) ?? {};
  const layer3 = (node?.layer3_json as Layer3) ?? {};
  const reasoning = layer2.reasoning ?? [];
  const resources = layer3.resources ?? [];

  // Track view_node once per node load
  const trackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (node?.id && trackedRef.current !== node.id) {
      trackedRef.current = node.id;
      trackEvent('view_node', node.id);
    }
  }, [node?.id]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container pt-24 pb-20 max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-8 w-3/4 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !node) {
    return (
      <AppLayout>
        <div className="container pt-24 pb-20 max-w-2xl mx-auto text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Node not found
          </h1>
          <p className="text-muted-foreground font-body mb-6">
            This question may not exist or isn't published yet.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <article className="container pt-10 pb-20 max-w-2xl mx-auto">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Category badge */}
        {node.category && (
          <span className="inline-block mb-3 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-subtle text-accent-foreground">
            {node.category}
          </span>
        )}

        {/* Title */}
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight mb-6">
          {node.title}
        </h1>

        {/* ── Layer 1: Always-visible answer ── */}
        <section className="mb-10">
          <div className="surface-elevated rounded-xl border border-border p-6">
            <p className="font-body text-base text-foreground leading-relaxed">
              {node.layer1}
            </p>
          </div>
        </section>

        {/* ── Layer 2: Reasoning accordion ── */}
        {reasoning.length > 0 && (
          <section className="mb-10">
            <Collapsible onOpenChange={(open) => { if (open) trackEvent('expand_reasoning', node.id); }}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full group cursor-pointer">
                <div className="w-8 h-8 rounded-md bg-amber-subtle flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-accent" />
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground flex-1 text-left">
                  Reasoning
                </h2>
                <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-4">
                <Accordion type="multiple" className="space-y-2" onValueChange={(values) => {
                  // Track each newly opened bullet
                  values.forEach(v => trackEvent('expand_reasoning_bullet', node.id, { bullet_id: v }));
                }}>
                  {reasoning.map((bullet, i) => (
                    <AccordionItem
                      key={bullet.id ?? i}
                      value={bullet.id ?? `r-${i}`}
                      className="surface-elevated rounded-lg border border-border px-5 data-[state=open]:glow-amber transition-shadow"
                    >
                      <AccordionTrigger className="py-4 hover:no-underline gap-3">
                        <div className="text-left flex-1 min-w-0">
                          <h3 className="font-display text-sm font-semibold text-foreground leading-snug">
                            {bullet.title}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground font-body line-clamp-2">
                            {bullet.summary}
                          </p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-5">
                        <div className="border-t border-border pt-4">
                          <p className="text-sm text-foreground font-body leading-relaxed whitespace-pre-line">
                            {bullet.detail}
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CollapsibleContent>
            </Collapsible>
          </section>
        )}

        {/* ── Layer 3: Next Steps ── */}
        {(resources.length > 0 || (relatedNodes && relatedNodes.length > 0)) && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-md bg-amber-subtle flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-accent" />
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground">
                Next Steps
              </h2>
            </div>

            {/* Deeper resources */}
            {resources.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Deeper Resources
                </h3>
                <div className="space-y-2">
                  {resources.map((res, i) => (
                    <a
                      key={i}
                      href={res.url ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 surface-elevated rounded-lg border border-border p-4 hover:border-accent/40 hover:glow-amber transition-all duration-200 group"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-accent transition-colors" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors font-display">
                          {res.title}
                        </p>
                        {res.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 font-body">
                            {res.description}
                          </p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Related Question Nodes */}
            {relatedNodes && relatedNodes.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Related Questions
                </h3>
                <div className="space-y-2">
                  {relatedNodes.map(rn => (
                    <Link
                      key={rn.id}
                      to={`/node/${rn.id}`}
                      onClick={() => trackEvent('click_related', node.id, { target_node_id: rn.id })}
                      className="flex items-start justify-between gap-3 surface-elevated rounded-lg border border-border p-4 hover:border-accent/40 hover:glow-amber transition-all duration-200 group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors font-display leading-snug">
                          {rn.title}
                        </p>
                        {rn.layer1 && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1 font-body">
                            {rn.layer1}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-accent transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </article>
    </AppLayout>
  );
};

export default NodeDetail;
