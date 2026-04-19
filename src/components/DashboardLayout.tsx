import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/use-auth';
import { 
  Home, Upload, FlaskConical, Eye, FileText, Settings, LogOut, Menu, X, Shield,
  BarChart3, Bell, ChevronRight
} from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/upload', label: 'Upload', icon: Upload },
  { path: '/analysis', label: 'Analysis', icon: FlaskConical },
  { path: '/simulator', label: 'Simulator', icon: Eye },
  { path: '/transparency', label: 'Reports', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-card/95 backdrop-blur-xl border-r border-border/30 transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="flex items-center justify-between p-6 border-b border-border/20">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl gradient-warm flex items-center justify-center shadow-warm">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">EquityLens</span>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden rounded-full" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-180px)]">
          <div className="px-3 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Intelligence Hub</span>
          </div>
          {NAV_ITEMS.map(item => (
            <Link key={item.path} to={item.path}>
              <Button 
                variant={location.pathname === item.path ? 'secondary' : 'ghost'} 
                className={`w-full justify-start gap-4 h-12 rounded-2xl transition-all duration-200 ${location.pathname === item.path ? 'bg-primary/10 text-primary shadow-sm' : 'hover:bg-muted/50'}`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className={cn("w-5 h-5", location.pathname === item.path ? "text-primary" : "text-muted-foreground")} />
                <span className="font-medium">{item.label}</span>
              </Button>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border/20 bg-card/50 backdrop-blur-md">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-10 h-10 border border-border/50">
              <AvatarImage src="" />
              <AvatarFallback className="text-sm bg-primary/10 text-primary font-bold">{getInitials(user?.name || 'U')}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest">{user?.role || 'analyst'}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-3 h-11 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" /> 
            <span className="text-sm font-medium">Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-muted/5 overflow-hidden">
        {/* Mobile Top Bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between px-4 h-16 bg-background/80 backdrop-blur-lg border-b border-border/20 md:hidden">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl gradient-warm flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold truncate max-w-[120px]">{title || 'EquityLens'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="w-9 h-9 rounded-full" />
            <NotificationCenter />
          </div>
        </header>

        {/* Page Header (Desktop) */}
        <div className="hidden md:flex items-center justify-between px-8 h-20 bg-background/40 backdrop-blur-sm border-b border-border/10">
          <div>
            {title && <h1 className="text-2xl font-display font-bold tracking-tight">{title}</h1>}
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <ThemeToggle className="rounded-full" />
              <NotificationCenter />
            </div>
            <div className="h-8 w-px bg-border/20" />
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-bold">{user?.name || 'User'}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{user?.role || 'analyst'}</p>
              </div>
              <Avatar className="w-10 h-10 border border-border/50 shadow-sm">
                <AvatarFallback className="bg-primary/10 text-primary font-bold">{getInitials(user?.name || 'U')}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}