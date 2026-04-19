import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Eye, BarChart3, Upload, FlaskConical, FileText, LogOut, Menu, X, Scale, Settings, Shield } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationCenter } from '@/components/NotificationCenter';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon?: any;
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { path: '/upload', label: 'Upload', icon: Upload },
  { path: '/analysis', label: 'Analysis', icon: FlaskConical },
  { path: '/simulator', label: 'Simulator', icon: Eye },
  { path: '/transparency', label: 'Reports', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const publicNav: NavItem[] = [
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

  const isPublicRoute = ['/', '/features', '/about', '/contact', '/login', '/register'].includes(location.pathname);
  const isDashboardRoute = !isPublicRoute;

  const HeaderLogo = () => (
    <Link to="/" className="flex items-center gap-3 group">
      <div className="w-10 h-10 border border-primary flex items-center justify-center transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Shield className="w-5 h-5" />
      </div>
      <span className="text-lg font-serif font-bold uppercase tracking-tighter text-foreground">EquityLens</span>
    </Link>
  );

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
      isScrolled || mobileOpen ? "bg-background border-b border-border/50" : "bg-transparent",
      isDashboardRoute && "relative bg-background border-b border-border sticky"
    )}>
      <div className={cn(
        "container flex items-center justify-between transition-all duration-500",
        isDashboardRoute ? "h-16" : (isScrolled ? "h-16" : "h-24")
      )}>
        <HeaderLogo />

        {/* Desktop Navigation */}
        {!isDashboardRoute && (
          <nav className="hidden md:flex items-center gap-10">
            {publicNav.map(item => (
              <Link 
                key={item.path} 
                to={item.path} 
                className={cn(
                  "text-[11px] font-bold uppercase tracking-[0.2em] transition-colors hover:text-secondary",
                  location.pathname === item.path ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {isDashboardRoute && (
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={location.pathname === item.path ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-2 rounded-none px-4 h-9 uppercase text-[10px] font-bold tracking-widest"
                  >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 md:gap-6">
          <ThemeToggle className="rounded-none hover:bg-muted" />
          
          <div className="hidden md:flex items-center gap-6">
            {isDashboardRoute && <NotificationCenter />}
            
            {user ? (
              <div className="flex items-center gap-6">
                {!isDashboardRoute && (
                  <Link to="/dashboard">
                    <Button className="rounded-none px-6 h-10 uppercase text-[11px] font-bold tracking-widest">Dashboard</Button>
                  </Link>
                )}
                {isDashboardRoute && (
                  <>
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] font-bold uppercase tracking-wider">{user.name}</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-[0.2em]">{user.role}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="rounded-none h-10 w-10 p-0" onClick={() => { logout(); window.location.href = '/'; }}>
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login">
                  <Button variant="ghost" className="rounded-none px-4 h-10 uppercase text-[11px] font-bold tracking-widest">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button className="rounded-none px-6 h-10 uppercase text-[11px] font-bold tracking-widest bg-primary text-primary-foreground">Get Started</Button>
                </Link>
              </div>
            )}
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden rounded-full" 
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileOpen && (
        <div className="md:hidden animate-in slide-in-from-top duration-300 border-t border-border/10 bg-background/95 backdrop-blur-xl h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="container py-8 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-4">Menu</span>
              {(isDashboardRoute ? navItems : publicNav).map(item => {
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.path} 
                    to={item.path} 
                    onClick={() => setMobileOpen(false)}
                  >
                    <Button 
                      variant={location.pathname === item.path ? 'secondary' : 'ghost'} 
                      className="w-full justify-start gap-4 text-lg h-14 rounded-2xl px-4"
                    >
                      {Icon && <Icon className="w-5 h-5 text-primary" />}
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>

            <div className="h-px bg-border/10 mx-4" />

            <div className="flex flex-col gap-3 px-4">
              {user ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-2xl">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold">{user.name}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest">{user.role}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl gap-2"
                    onClick={() => { logout(); setMobileOpen(false); window.location.href = '/'; }}
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Link to="/login" className="w-full" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full h-12 rounded-xl">Sign In</Button>
                  </Link>
                  <Link to="/register" className="w-full" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full h-12 rounded-xl shadow-glow">Get Started</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};