import { ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/use-auth';
import { useUserRole } from '@/hooks/use-user-role';
import { Button } from '@/components/ui/button';
import { LogOut, Sun, Moon, Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppLayoutProps {
  children: ReactNode;
}

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle dark mode"
    >
      <Sun className="w-4 h-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, signOut, loading } = useAuth();
  const { hasRole: isAdmin } = useUserRole(user?.id, 'admin');
  const { hasRole: isEditor } = useUserRole(user?.id, 'editor');
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = (
    <>
      <Link
        to="/explore"
        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setMobileOpen(false)}
      >
        Explore
      </Link>
      <Link
        to="/graph"
        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setMobileOpen(false)}
      >
        Graph
      </Link>
      {!loading && user && (isAdmin || isEditor) && (
        <Link
          to="/admin"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setMobileOpen(false)}
        >
          Node Admin
        </Link>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-md focus:bg-accent focus:text-accent-foreground focus:font-medium focus:text-sm"
      >
        Skip to main content
      </a>

      <header className="border-b border-border" role="banner">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2" aria-label="Home">
            <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-bold text-sm font-body">Q</span>
            </div>
            <span className="font-display text-xl font-semibold text-foreground">
              Question Node
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            {navLinks}
            <div className="h-8 w-px bg-border" />
            <ThemeToggle />
            {!loading && user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground truncate max-w-[160px]">
                  {user.email}
                </span>
                <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
                  <LogOut className="w-4 h-4" />
                  <span className="sr-only">Sign out</span>
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

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <nav className="flex flex-col gap-4 mt-8" aria-label="Mobile navigation">
                  {navLinks}
                  <div className="h-px bg-border my-2" />
                  {!loading && user ? (
                    <div className="flex flex-col gap-3">
                      <span className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => { signOut(); setMobileOpen(false); }} className="justify-start" aria-label="Sign out">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign out
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { navigate('/auth'); setMobileOpen(false); }}
                      className="text-sm font-medium text-accent-foreground bg-accent px-4 py-2 rounded-md hover:opacity-90 transition-opacity text-left"
                    >
                      Sign In
                    </button>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main id="main-content" className="flex-1" tabIndex={-1}>{children}</main>
    </div>
  );
};

export default AppLayout;
