import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminFetch } from '@/hooks/use-admin';
import { Tables } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import NodeForm from './NodeForm';
import { Plus, Pencil, Trash2, LogOut, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import ImportNodeDialog from './ImportNodeDialog';
import ImportCsvDialog from './ImportCsvDialog';
import WriterGuideDialog from './WriterGuideDialog';
import type { ParsedNode } from '@/lib/parse-node-markdown';
import type { Session } from '@supabase/supabase-js';
import { useAuth } from '@/hooks/use-auth';

type Node = Tables<'nodes'>;

interface AdminDashboardProps {
  session: Session;
}

const AdminDashboard = ({ session }: AdminDashboardProps) => {
  const { signOut } = useAuth();
  const token = session.access_token;

  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [tab, setTab] = useState('all');

  const fetchNodes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch('', token);
      setNodes(data);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchNodes(); }, [fetchNodes]);

  const handleCreate = async (data: Partial<Node> & { id: string; title: string }) => {
    setSaving(true);
    try {
      await adminFetch('', token, { method: 'POST', body: JSON.stringify(data) });
      toast({ title: 'Node created' });
      setView('list');
      fetchNodes();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (data: Partial<Node> & { id: string; title: string }) => {
    setSaving(true);
    try {
      const changes: Record<string, unknown> = {};
      if (editingNode) {
        for (const key of Object.keys(data) as Array<keyof typeof data>) {
          if (key === 'id') continue;
          if (JSON.stringify(data[key]) !== JSON.stringify(editingNode[key])) {
            changes[key] = data[key];
          }
        }
      }
      const payload = Object.keys(changes).length > 0 ? changes : data;
      await adminFetch(`/${encodeURIComponent(data.id)}`, token, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      toast({ title: 'Node updated' });
      setView('list');
      setEditingNode(null);
      fetchNodes();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete node "${id}"? This cannot be undone.`)) return;
    try {
      await adminFetch(`/${encodeURIComponent(id)}`, token, { method: 'DELETE' });
      toast({ title: 'Node deleted' });
      fetchNodes();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const filteredNodes = nodes.filter((n) => {
    if (tab === 'published') return n.published;
    if (tab === 'drafts') return !n.published;
    return true;
  });

  if (view === 'create') {
    return (
      <div className="min-h-screen bg-background p-6 max-w-4xl mx-auto">
        <NodeForm onSubmit={handleCreate} onCancel={() => setView('list')} loading={saving} />
      </div>
    );
  }

  if (view === 'edit' && editingNode) {
    return (
      <div className="min-h-screen bg-background p-6 max-w-4xl mx-auto">
        <NodeForm
          node={editingNode}
          onSubmit={handleUpdate}
          onCancel={() => { setView('list'); setEditingNode(null); }}
          loading={saving}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <h1 className="font-display text-2xl font-semibold">Node Admin</h1>
          <div className="flex gap-2">
            <ImportNodeDialog
              onConfirm={(parsed: ParsedNode) => {
                handleCreate({
                  id: parsed.id,
                  title: parsed.title,
                  category: parsed.category,
                  keywords: parsed.keywords,
                  alt_phrasings: parsed.alt_phrasings as any,
                  layer1: parsed.layer1,
                  layer2_json: parsed.layer2_json as any,
                  layer3_json: parsed.layer3_json as any,
                  published: parsed.published,
                  search_blob: parsed.search_blob,
                });
              }}
            />
            <ImportCsvDialog
              onConfirm={async (rows) => {
                for (const row of rows) {
                  await handleCreate(row);
                }
              }}
            />
            <WriterGuideDialog />
            <Button onClick={() => setView('create')}>
              <Plus className="w-4 h-4 mr-1" /> New Node
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} title="Log out">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All ({nodes.length})</TabsTrigger>
            <TabsTrigger value="published">
              Published ({nodes.filter((n) => n.published).length})
            </TabsTrigger>
            <TabsTrigger value="drafts">
              Drafts ({nodes.filter((n) => !n.published).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab}>
            {loading ? (
              <p className="text-muted-foreground py-8 text-center">Loading…</p>
            ) : filteredNodes.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">No nodes found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNodes.map((node) => (
                    <TableRow key={node.id}>
                      <TableCell className="font-mono text-xs">{node.id}</TableCell>
                      <TableCell className="font-medium">{node.title}</TableCell>
                      <TableCell>{node.category ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={node.published ? 'default' : 'secondary'}>
                          {node.published ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(node.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingNode(node); setView('edit'); }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(node.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
