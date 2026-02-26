import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ChevronRight, BookOpen, Lightbulb, ExternalLink, Share2, Home } from 'lucide-react';
import MarkdownText from '@/components/MarkdownText';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/analytics';
import AppLayout from '@/components/layout/AppLayout';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
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

const NodeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { addItem } = useRecentlyViewed();
  const [readingProgress, setReadingProgress] = useState(0);
  const articleRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Reading progress bar
  useEffect(() => {
    const handleScroll = () => {
      if (!articleRef.current) return;
      const { top, height } = articleRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const progress = Math.min(100, Math.max(0, ((windowHeight - top) / height) * 100));
      setReadingProgress(progress);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const relatedIds = (node?.layer3_json as Layer3)?.related_questions ?? [];
  const { data: relatedNodes } = useQuery({
    queryKey: ['related-nodes', relatedIds],
    queryFn: async () => {
      if (relatedIds.length === 0) return [];
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
  const sources = layer3.sources ?? [];

  // Track view + save to recently viewed + focus title for screen readers
  const trackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (node?.id && trackedRef.current !== node.id) {
      trackedRef.current = node.id;
      trackEvent('view_node', node.id);
      addItem({ id: node.id, title: node.title, category: node.category });
      // Focus the title so screen readers announce it
      titleRef.current?.focus();
    }
  }, [node?.id, node?.title, node?.category, addItem]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied', description: 'URL copied to clipboard.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy the link.', variant: 'destructive' });
    }
  };

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
            <Home className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Progress value={readingProgress} className="h-1 rounded-none bg-transparent [&>div]:bg-accent" />
      </div>

      <article ref={articleRef} className="container pt-10 pb-20 max-w-2xl mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {node.category && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{node.category}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate max-w-[200px]">{node.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Category badge */}
        {node.category && (
          <span className="inline-block mb-3 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-subtle text-accent-foreground">
            {node.category}
          </span>
        )}

        {/* Title + Share */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <h1 ref={titleRef} tabIndex={-1} className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight outline-none">
            {node.title}
          </h1>
          <Button variant="ghost" size="icon" onClick={handleCopyLink} aria-label="Copy link to clipboard" className="shrink-0 mt-1">
            <Share2 className="w-4 h-4" />
            <span className="sr-only">Share</span>
          </Button>
        </div>

        {/* ── Layer 1: Always-visible answer ── */}
        <section className="mb-10">
          <div className="surface-elevated rounded-xl border border-border p-6">
            <MarkdownText content={node.layer1 ?? ''} className="font-body text-base text-foreground leading-relaxed" />
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
                <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" aria-hidden="true" />
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-4">
                <Accordion type="multiple" className="space-y-2" onValueChange={(values) => {
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
                                  title={`Video: ${bullet.title}`}
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
                      <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-accent transition-colors" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Sources collapsible ── */}
        {sources.length > 0 && (
          <section className="mt-10">
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 w-full group cursor-pointer">
                <div className="w-8 h-8 rounded-md bg-amber-subtle flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-accent" aria-hidden="true" />
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground flex-1 text-left">
                  Sources
                </h2>
                <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" aria-hidden="true" />
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

export default NodeDetail;
