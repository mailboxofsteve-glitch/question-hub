import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-bold text-sm font-body">Q</span>
            </div>
            <span className="font-display text-xl font-semibold text-foreground">
              Question Node
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              to="/explore"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Explore
            </Link>
            <Link
              to="/graph"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Graph
            </Link>
            <div className="h-8 w-px bg-border" />
            {!loading && user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground truncate max-w-[160px]">
                  {user.email}
                </span>
                <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="text-sm font-medium text-accent-foreground bg-accent px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
              >
                Sign In
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
};

export default AppLayout;
