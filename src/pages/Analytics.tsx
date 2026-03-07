
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useUserRole } from '@/hooks/use-user-role';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX, Users, Eye, FileText, CheckCircle, Activity } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';

/* ---------- types ---------- */
interface EventRow {
  id: string;
  created_at: string;
  event_type: string;
  node_id: string | null;
  session_id: string;
  metadata: Record<string, unknown> | null;
}

/* ---------- helpers ---------- */
const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--muted-foreground))',
  'hsl(var(--destructive))',
];

const chartConfig: ChartConfig = {
  events: { label: 'Events', color: 'hsl(var(--primary))' },
  count: { label: 'Count', color: 'hsl(var(--primary))' },
};

/* ---------- component ---------- */
const Analytics = () => {
  const { user, loading: authLoading } = useAuth();
  const { hasRole: isAdmin, loading: adminLoading } = useUserRole(user?.id, 'admin');
  const { hasRole: isEditor, loading: editorLoading } = useUserRole(user?.id, 'editor');
  const roleLoading = adminLoading || editorLoading;
  const navigate = useNavigate();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveFeed, setLiveFeed] = useState<EventRow[]>([]);

  /* Auth redirect */
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?redirect=/analytics', { replace: true });
    }
  }, [authLoading, user, navigate]);

  /* Fetch events (last 30 days) */
  const fetchEvents = useCallback(async () => {
    const since = subDays(new Date(), 30).toISOString();
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setEvents(data as EventRow[]);
      setLiveFeed((data as EventRow[]).slice(0, 50));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && !roleLoading && (isAdmin || isEditor)) {
      fetchEvents();
    }
  }, [authLoading, roleLoading, isAdmin, isEditor, fetchEvents]);

  /* Realtime subscription */
  useEffect(() => {
    if (!isAdmin && !isEditor) return;

    const channel = supabase
      .channel('analytics-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events' },
        (payload) => {
          const newEvent = payload.new as EventRow;
          setEvents((prev) => [newEvent, ...prev]);
          setLiveFeed((prev) => [newEvent, ...prev].slice(0, 50));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, isEditor]);

  /* ---------- derived stats ---------- */
  const stats = useMemo(() => {
    const sessions = new Set(events.map((e) => e.session_id)).size;
    const pageViews = events.filter((e) => e.event_type === 'page_view').length;
    const uniqueNodes = new Set(events.filter((e) => e.node_id).map((e) => e.node_id)).size;
    const completions = events.filter((e) => e.event_type === 'diagnostic_complete').length;
    return { sessions, pageViews, uniqueNodes, completions };
  }, [events]);

  /* Traffic over time */
  const trafficData = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const key = format(subDays(new Date(), i), 'MMM dd');
      buckets[key] = 0;
    }
    events.forEach((e) => {
      const key = format(new Date(e.created_at), 'MMM dd');
      if (key in buckets) buckets[key]++;
    });
    return Object.entries(buckets).map(([date, count]) => ({ date, count }));
  }, [events]);

  /* Event type breakdown */
  const eventTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      counts[e.event_type] = (counts[e.event_type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  /* Top viewed nodes */
  const topNodes = useMemo(() => {
    const counts: Record<string, number> = {};
    events
      .filter((e) => e.event_type === 'view_node' && e.node_id)
      .forEach((e) => {
        counts[e.node_id!] = (counts[e.node_id!] || 0) + 1;
      });
    return Object.entries(counts)
      .map(([node, count]) => ({ node, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [events]);

  /* Device breakdown */
  const deviceData = useMemo(() => {
    let mobile = 0;
    let desktop = 0;
    events
      .filter((e) => e.event_type === 'session_start')
      .forEach((e) => {
        const meta = e.metadata as Record<string, unknown> | null;
        if (meta?.is_mobile) mobile++;
        else desktop++;
      });
    return [
      { name: 'Mobile', value: mobile },
      { name: 'Desktop', value: desktop },
    ].filter((d) => d.value > 0);
  }, [events]);

  /* Diagnostic funnel */
  const funnelData = useMemo(() => {
    const starts = events.filter((e) => e.event_type === 'diagnostic_start').length;
    const responds = events.filter((e) => e.event_type === 'diagnostic_respond').length;
    const completes = events.filter((e) => e.event_type === 'diagnostic_complete').length;
    return [
      { stage: 'Start', count: starts },
      { stage: 'Respond', count: responds },
      { stage: 'Complete', count: completes },
    ];
  }, [events]);

  /* ---------- guards ---------- */
  if (authLoading || roleLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin && !isEditor) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24 px-4">
          <Card className="w-full max-w-sm text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                <ShieldX className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="font-display text-xl">Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You don't have permission to view analytics.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-8 space-y-8">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <h1 className="font-display text-2xl font-bold text-foreground">Analytics</h1>
          <span className="text-sm text-muted-foreground ml-auto">Last 30 days</span>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading event data…</p>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<Users className="w-4 h-4" />} label="Sessions" value={stats.sessions} />
              <StatCard icon={<Eye className="w-4 h-4" />} label="Page Views" value={stats.pageViews} />
              <StatCard icon={<FileText className="w-4 h-4" />} label="Unique Nodes" value={stats.uniqueNodes} />
              <StatCard icon={<CheckCircle className="w-4 h-4" />} label="Dx Completions" value={stats.completions} />
            </div>

            {/* Charts row 1 */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Traffic over time */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Traffic Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[260px] w-full">
                    <LineChart data={trafficData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Event type breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Event Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[260px] w-full">
                    <BarChart data={eventTypeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Charts row 2 */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Top nodes */}
              <Card className="md:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Top Viewed Nodes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[260px] w-full">
                    <BarChart data={topNodes} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis dataKey="node" type="category" width={100} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Device breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Devices</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  {deviceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={deviceData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {deviceData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground py-12">No session data yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Diagnostic funnel */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Diagnostic Funnel</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[260px] w-full">
                    <BarChart data={funnelData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="stage" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Live feed */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  Live Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[320px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Time</th>
                        <th className="pb-2 pr-4 font-medium">Type</th>
                        <th className="pb-2 pr-4 font-medium">Node</th>
                        <th className="pb-2 font-medium">Session</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveFeed.map((e) => (
                        <tr key={e.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                          <td className="py-1.5 pr-4 text-muted-foreground whitespace-nowrap">
                            {format(new Date(e.created_at), 'MMM dd HH:mm:ss')}
                          </td>
                          <td className="py-1.5 pr-4 font-mono text-xs">{e.event_type}</td>
                          <td className="py-1.5 pr-4 text-muted-foreground truncate max-w-[140px]">
                            {e.node_id || '—'}
                          </td>
                          <td className="py-1.5 text-muted-foreground font-mono text-xs truncate max-w-[100px]">
                            {e.session_id.slice(0, 8)}…
                          </td>
                        </tr>
                      ))}
                      {liveFeed.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-muted-foreground">
                            No events yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
};

/* ---------- stat card ---------- */
const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) => (
  <Card>
    <CardContent className="flex items-center gap-3 p-4">
      <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
);

export default Analytics;
