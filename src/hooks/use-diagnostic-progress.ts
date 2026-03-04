import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

export type DiagnosticResponse = 'agree' | 'disagree' | 'dont_know';

interface ProgressEntry {
  node_id: string;
  response: DiagnosticResponse;
  note?: string;
}

interface NodeRecord {
  id: string;
  tier: number | null;
  spine_gates: string[];
  published: boolean;
}

/**
 * Computes which node IDs are unlocked based on responded nodes.
 * Rules:
 * 1. S-01 is always unlocked.
 * 2. Responding to a spine node S-XX unlocks S-(XX+1) and its branch children.
 * 3. Responding to any node unlocks nodes whose spine_gates include it.
 */
function computeUnlocked(
  respondedIds: Set<string>,
  allNodes: NodeRecord[],
): Set<string> {
  const unlocked = new Set<string>();
  // Always unlock S-01
  unlocked.add('s-01');

  const spinePattern = /^s-(\d+)$/i;

  respondedIds.forEach((id) => {
    const lower = id.toLowerCase();
    unlocked.add(lower);

    // If spine node, unlock next sequential spine
    const m = lower.match(spinePattern);
    if (m) {
      const next = parseInt(m[1]) + 1;
      const nextId = `s-${String(next).padStart(2, '0')}`;
      unlocked.add(nextId);
    }

    // Unlock children that list this node in spine_gates
    allNodes.forEach((n) => {
      const gates = Array.isArray(n.spine_gates) ? n.spine_gates : [];
      if (gates.some((g: string) => g.toLowerCase() === lower)) {
        unlocked.add(n.id.toLowerCase());
      }
    });
  });

  return unlocked;
}

export function useDiagnosticProgress(allNodes: NodeRecord[] | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Local state for anonymous users
  const [localProgress, setLocalProgress] = useState<ProgressEntry[]>(() => {
    try {
      const stored = localStorage.getItem('diagnostic_progress');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist local progress to localStorage
  useEffect(() => {
    if (!user) {
      localStorage.setItem('diagnostic_progress', JSON.stringify(localProgress));
    }
  }, [localProgress, user]);

  // Fetch progress from DB for authenticated users
  const { data: dbProgress } = useQuery({
    queryKey: ['diagnostic-progress', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diagnostic_progress')
        .select('node_id, response, note')
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data ?? []) as ProgressEntry[];
    },
    enabled: !!user,
  });

  const progress = user ? (dbProgress ?? []) : localProgress;

  const respondedIds = useMemo(
    () => new Set(progress.map((p) => p.node_id.toLowerCase())),
    [progress],
  );

  const responseMap = useMemo(() => {
    const map = new Map<string, DiagnosticResponse>();
    progress.forEach((p) => map.set(p.node_id.toLowerCase(), p.response as DiagnosticResponse));
    return map;
  }, [progress]);

  const unlockedIds = useMemo(
    () => computeUnlocked(respondedIds, allNodes ?? []),
    [respondedIds, allNodes],
  );

  // Mutation for authenticated users
  const mutation = useMutation({
    mutationFn: async (entry: ProgressEntry) => {
      const { error } = await supabase
        .from('diagnostic_progress')
        .upsert(
          { user_id: user!.id, node_id: entry.node_id, response: entry.response, note: entry.note },
          { onConflict: 'user_id,node_id' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostic-progress', user?.id] });
    },
  });

  const respond = useCallback(
    (nodeId: string, response: DiagnosticResponse, note?: string) => {
      const entry: ProgressEntry = { node_id: nodeId, response, note };
      if (user) {
        mutation.mutate(entry);
      } else {
        setLocalProgress((prev) => {
          const filtered = prev.filter((p) => p.node_id !== nodeId);
          return [...filtered, entry];
        });
      }
    },
    [user, mutation],
  );

  return { progress, respondedIds, responseMap, unlockedIds, respond };
}
