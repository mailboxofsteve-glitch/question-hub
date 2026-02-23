import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useUserRole } from '@/hooks/use-user-role';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX } from 'lucide-react';

const Admin = () => {
  const { user, session, loading: authLoading } = useAuth();
  const { hasRole: isAdmin, loading: adminLoading } = useUserRole(user?.id, 'admin');
  const { hasRole: isEditor, loading: editorLoading } = useUserRole(user?.id, 'editor');
  const roleLoading = adminLoading || editorLoading;
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?redirect=/admin', { replace: true });
    }
  }, [authLoading, user, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!isAdmin && !isEditor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <ShieldX className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="font-display text-xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You don't have admin access. Contact the project owner to request access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AdminDashboard session={session!} isEditor={isEditor} />;
};

export default Admin;
