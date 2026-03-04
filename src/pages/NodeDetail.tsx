import { useParams, Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Home } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Progress } from '@/components/ui/progress';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import NodeDetailContent from '@/components/NodeDetailContent';

const NodeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [readingProgress, setReadingProgress] = useState(0);
  const articleRef = useRef<HTMLElement>(null);

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

  // Minimal query just for breadcrumb data
  const { data: node, isLoading, error } = useQuery({
    queryKey: ['node-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nodes')
        .select('id, title, category')
        .eq('id', id!)
        .eq('published', true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

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
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Node not found</h1>
          <p className="text-muted-foreground font-body mb-6">This question may not exist or isn't published yet.</p>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
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

        <NodeDetailContent id={id!} />
      </article>
    </AppLayout>
  );
};

export default NodeDetail;
