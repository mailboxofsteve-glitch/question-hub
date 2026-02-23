import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, BookOpen, Lightbulb, ExternalLink } from 'lucide-react';
import MarkdownText from '@/components/MarkdownText';
import { supabase } from '@/integrations/supabase/client';
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
  video_url?: string;
  image_url?: string;
}

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if ((u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') && u.pathname === '/watch') {
      const v = u.searchParams.get('v');
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if ((u.hostname === 'www.vimeo.com' || u.hostname === 'vimeo.com') && /^\/\d+/.test(u.pathname)) {
      return `https://player.vimeo.com/video${u.pathname}`;
    }
    return null;
  } catch {
    return null;
  }
}

interface Layer2 { reasoning?: ReasoningBullet[]; }
interface Resource { title: string; url?: string; description?: string; }
interface Source { title: string; url?: string; description?: string; }
interface Layer3 {
  resources?: Resource[];
  sources?: Source[];
  related_questions?: string[];
  editorial_notes?: Record<string, string>;
}

const NodePreview = () => {
  const { id } = useParams<{ id: string }>();

  const { data: node, isLoading, error } = useQuery({
    queryKey: ['node-preview', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const relatedIds = (node?.layer3_json as Layer3)?.related_questions ?? [];
  const { data: relatedNodes } = useQuery({
    queryKey: ['related-nodes-preview', relatedIds],
    queryFn: async () => {
      if (relatedIds.length === 0) return [];
      const normalized = relatedIds.map(r => r.replace(/_/g, '-'));
      const { data, error } = await supabase
        .from('nodes')
        .select('id, title, layer1, category')
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
  const sources = layer3.sources ?? [];

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
            This question may not exist or you don't have permission to preview it.
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
        {/* Draft banner */}
        {!node.published && (
          <div className="bg-amber-100 text-amber-800 text-sm font-medium px-4 py-2 rounded-md mb-6 text-center">
            Preview — This node is not published yet
          </div>
        )}

        {/* Back link */}
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin
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

        {/* Layer 1 */}
        <section className="mb-10">
          <div className="surface-elevated rounded-xl border border-border p-6">
            <MarkdownText content={node.layer1 ?? ''} className="font-body text-base text-foreground leading-relaxed" />
          </div>
        </section>

        {/* Layer 2: Reasoning */}
        {reasoning.length > 0 && (
          <section className="mb-10">
            <Collapsible>
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
                <Accordion type="multiple" className="space-y-2">
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
                          <MarkdownText content={bullet.summary} className="mt-1 text-sm text-muted-foreground font-body" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-5">
                        <div className="border-t border-border pt-4">
                          <MarkdownText content={bullet.detail} className="text-sm text-foreground font-body leading-relaxed whitespace-pre-line" />
                          {bullet.image_url && (
                            <img
                              src={bullet.image_url}
                              alt={bullet.title}
                              className="mt-3 rounded-md w-full object-contain max-h-96"
                            />
                          )}
                          {bullet.video_url && (() => {
                            const embedUrl = toEmbedUrl(bullet.video_url);
                            return embedUrl ? (
                              <div className="aspect-video mt-3">
                                <iframe
                                  src={embedUrl}
                                  className="w-full h-full rounded-md"
                                  allowFullScreen
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                />
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CollapsibleContent>
            </Collapsible>
          </section>
        )}

        {/* Layer 3: Next Steps */}
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
                        <MarkdownText content={res.title} className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors font-display" />
                        {res.description && (
                          <MarkdownText content={res.description} className="text-xs text-muted-foreground mt-0.5 font-body" />
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {relatedNodes && relatedNodes.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Related Questions
                </h3>
                <div className="space-y-2">
                  {relatedNodes.map(rn => (
                    <Link
                      key={rn.id}
                      to={`/node/${rn.id}/preview`}
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

        {/* Sources */}
        {sources.length > 0 && (
          <section className="mt-10">
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 w-full group cursor-pointer">
                <div className="w-8 h-8 rounded-md bg-amber-subtle flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-accent" />
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground flex-1 text-left">
                  Sources
                </h2>
                <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-4">
                <div className="space-y-2">
                  {sources.map((src, i) => (
                    <a
                      key={i}
                      href={src.url ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 surface-elevated rounded-lg border border-border p-4 hover:border-accent/40 hover:glow-amber transition-all duration-200 group"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-accent transition-colors" />
                      <div className="flex-1 min-w-0">
                        <MarkdownText content={src.title} className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors font-display" />
                        {src.description && (
                          <MarkdownText content={src.description} className="text-xs text-muted-foreground mt-0.5 font-body" />
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </section>
        )}
      </article>
    </AppLayout>
  );
};

export default NodePreview;
