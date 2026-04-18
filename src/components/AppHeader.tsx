import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Eye, BarChart3, Upload, FlaskConical, FileText, LogOut, Menu, X, Scale, Settings, Shield } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationCenter } from '@/components/NotificationCenter';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { path: '/upload', label: 'Upload', icon: Upload },
  { path: '/analysis', label: 'Analysis', icon: FlaskConical },
  { path: '/simulator', label: 'Simulator', icon: Eye },
  { path: '/transparency', label: 'Reports', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const publicNav = [
  { path: '/features', label: 'Features' },
  { path: '/about', label: 'About' },
  { path: '/contact', label: 'Contact' },
];

export const AppHeader: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAppStore();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isPublicRoute = ['/', '/features', '/about', '/contact'].includes(location.pathname);
  const isDashboardRoute = location.pathname.startsWith('/dashboard') || 
                           location.pathname.startsWith('/upload') || 
                           location.pathname.startsWith('/analysis') ||
                           location.pathname.startsWith('/transparency') ||
                           location.pathname.startsWith('/settings');

  if (isPublicRoute) {
    return (
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-4",
        isScrolled ? "bg-background/80 backdrop-blur-lg border-b border-border/20 shadow-sm" : "bg-transparent"
      )}>
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl gradient-warm flex items-center justify-center shadow-warm group-hover:scale-110 transition-transform">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-display font-bold text-foreground">EquityLens</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link to="/features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Features</Link>
              <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">About</Link>
              <Link to="/contact" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Contact</Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle className="rounded-full" />
            {user ? (
              <Link to="/dashboard">
                <Button className="rounded-full px-6">Dashboard</Button>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" className="rounded-full px-6">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button className="rounded-full px-6">Get Started</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl gradient-warm flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg text-foreground">EquityLens</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(item => (
            <Link key={item.path} to={item.path}>
              <Button
                variant={location.pathname === item.path ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2 rounded-full"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle className="rounded-full" />
          <NotificationCenter />
          {user && (
            <span className="hidden md:block text-sm text-muted-foreground">
              {user.name}{' '}
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-1">{user.role}</span>
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => { logout(); window.location.href = '/'; }}>
            <LogOut className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-border/50 bg-card p-2">
          {navItems.map(item => (
            <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
              <Button variant={location.pathname === item.path ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start gap-2 mb-1 rounded-xl">
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
};