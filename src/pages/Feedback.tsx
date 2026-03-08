import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useUserRole } from '@/hooks/use-user-role';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShieldX, MessageSquareWarning, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FeedbackRow {
  id: string; // diagnostic_progress.id
  created_at: string | null;
  user_id: string;
  node_id: string;
  response: string;
  note: string | null;
  user_email: string | null;
  review_id: string | null;
  reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  addressed: boolean;
  addressed_by: string | null;
  addressed_at: string | null;
  resolution_note: string | null;
}

const Feedback = () => {
  const { user, loading: authLoading } = useAuth();
  const { hasRole: isAdmin, loading: adminLoading } = useUserRole(user?.id, 'admin');
  const { hasRole: isEditor, loading: editorLoading } = useUserRole(user?.id, 'editor');
  const roleLoading = adminLoading || editorLoading;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?redirect=/feedback', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch diagnostic_progress with disagree/dont_know that have notes
    const { data: progressData, error: pErr } = await supabase
      .from('diagnostic_progress')
      .select('id, created_at, user_id, node_id, response, note')
      .in('response', ['disagree', 'dont_know'])
      .not('note', 'is', null)
      .order('created_at', { ascending: false });

    if (pErr) {
      console.error('Error fetching progress:', pErr);
      setLoading(false);
      return;
    }

    if (!progressData || progressData.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    // Get unique user IDs for profile lookup
    const userIds = [...new Set(progressData.map((p) => p.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p.email]) ?? []);

    // Get feedback_reviews for these progress IDs
    const progressIds = progressData.map((p) => p.id);
    const { data: reviews } = await supabase
      .from('feedback_reviews')
      .select('*')
      .in('diagnostic_progress_id', progressIds);

    const reviewMap = new Map(
      reviews?.map((r: any) => [r.diagnostic_progress_id, r]) ?? []
    );

    const combined: FeedbackRow[] = progressData.map((p) => {
      const review = reviewMap.get(p.id);
      return {
        id: p.id,
        created_at: p.created_at,
        user_id: p.user_id,
        node_id: p.node_id,
        response: p.response,
        note: p.note,
        user_email: profileMap.get(p.user_id) ?? null,
        review_id: review?.id ?? null,
        reviewed: review?.reviewed ?? false,
        reviewed_by: review?.reviewed_by ?? null,
        reviewed_at: review?.reviewed_at ?? null,
        addressed: review?.addressed ?? false,
        addressed_by: review?.addressed_by ?? null,
        addressed_at: review?.addressed_at ?? null,
        resolution_note: review?.resolution_note ?? null,
      };
    });

    setRows(combined);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user && (isAdmin || isEditor)) fetchData();
  }, [user, isAdmin, isEditor, fetchData]);

  const upsertReview = async (
    progressId: string,
    updates: Record<string, unknown>
  ): Promise<string> => {
    const existing = rows.find((r) => r.id === progressId);
    if (existing?.review_id && existing.review_id !== 'temp') {
      const { error } = await supabase
        .from('feedback_reviews')
        .update(updates)
        .eq('id', existing.review_id);
      if (error) throw error;
      return existing.review_id;
    } else {
      const { data, error } = await supabase
        .from('feedback_reviews')
        .upsert(
          { diagnostic_progress_id: progressId, ...updates } as any,
          { onConflict: 'diagnostic_progress_id' }
        )
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    }
  };

  const toggleReviewed = async (row: FeedbackRow) => {
    try {
      const newVal = !row.reviewed;
      const reviewId = await upsertReview(row.id, {
        reviewed: newVal,
        reviewed_by: newVal ? user!.id : null,
        reviewed_at: newVal ? new Date().toISOString() : null,
      });
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, review_id: reviewId, reviewed: newVal, reviewed_by: newVal ? user!.id : null, reviewed_at: newVal ? new Date().toISOString() : null }
            : r
        )
      );
    } catch {
      toast({ title: 'Error', description: 'Failed to update reviewed status.', variant: 'destructive' });
    }
  };

  const toggleAddressed = async (row: FeedbackRow) => {
    if (!isEditor) return;
    try {
      const newVal = !row.addressed;
      const reviewId = await upsertReview(row.id, {
        addressed: newVal,
        addressed_by: newVal ? user!.id : null,
        addressed_at: newVal ? new Date().toISOString() : null,
      });
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, review_id: reviewId, addressed: newVal, addressed_by: newVal ? user!.id : null, addressed_at: newVal ? new Date().toISOString() : null }
            : r
        )
      );
    } catch {
      toast({ title: 'Error', description: 'Failed to update addressed status.', variant: 'destructive' });
    }
  };

  const saveResolutionNote = async (row: FeedbackRow) => {
    if (!isEditor) return;
    try {
      const reviewId = await upsertReview(row.id, { resolution_note: noteValue });
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, resolution_note: noteValue, review_id: reviewId } : r))
      );
      setEditingNote(null);
      toast({ title: 'Saved', description: 'Resolution note updated.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save note.', variant: 'destructive' });
    }
  };

  if (authLoading || roleLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin && !isEditor) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <Card className="w-full max-w-sm text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                <ShieldX className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="font-display text-xl">Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You don't have permission to view this page.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-8 space-y-6">
        <div className="flex items-center gap-3">
          <MessageSquareWarning className="w-6 h-6 text-primary" />
          <h1 className="font-display text-2xl font-bold text-foreground">
            Diagnostic Feedback
          </h1>
          <Badge variant="secondary" className="ml-auto">
            {rows.length} comment{rows.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No diagnostic feedback comments to review yet.
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Node</TableHead>
                  <TableHead className="w-[100px]">Response</TableHead>
                  <TableHead className="min-w-[200px]">Comment</TableHead>
                  <TableHead className="w-[90px] text-center">Reviewed</TableHead>
                  <TableHead className="w-[90px] text-center">Addressed</TableHead>
                  <TableHead className="min-w-[200px]">Resolution Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className={row.addressed ? 'opacity-60' : ''}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {row.created_at
                        ? new Date(row.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm truncate max-w-[180px]">
                      {row.user_email ?? <span className="text-muted-foreground italic">Unknown</span>}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.node_id}</code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.response === 'disagree' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {row.response === 'disagree' ? 'Disagree' : "Don't Know"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{row.note}</TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={row.reviewed}
                        onCheckedChange={() => toggleReviewed(row)}
                        aria-label="Mark as reviewed"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={row.addressed}
                        onCheckedChange={() => toggleAddressed(row)}
                        disabled={!isEditor}
                        aria-label="Mark as addressed"
                      />
                    </TableCell>
                    <TableCell>
                      {isEditor ? (
                        editingNote === row.id ? (
                          <Input
                            value={noteValue}
                            onChange={(e) => setNoteValue(e.target.value)}
                            onBlur={() => saveResolutionNote(row)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveResolutionNote(row);
                              if (e.key === 'Escape') setEditingNote(null);
                            }}
                            placeholder="How was this addressed?"
                            className="h-8 text-sm"
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => {
                              setEditingNote(row.id);
                              setNoteValue(row.resolution_note ?? '');
                            }}
                            className="text-sm text-left w-full min-h-[32px] px-2 py-1 rounded hover:bg-muted transition-colors"
                          >
                            {row.resolution_note || (
                              <span className="text-muted-foreground italic">Add note…</span>
                            )}
                          </button>
                        )
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {row.resolution_note || '—'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Feedback;
