import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth-context';
import { 
  Home, Upload, FlaskConical, Eye, FileText, Settings, LogOut, Menu, X, Shield,
  BarChart3, Bell, ChevronRight
} from 'lucide-react';

export const NAV_ITEMS = [
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
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card/95 backdrop-blur-xl border-r border-border/30 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-warm flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">EquityLens</span>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <Link key={item.path} to={item.path}>
              <Button 
                variant={location.pathname === item.path ? 'secondary' : 'ghost'} 
                className={`w-full justify-start gap-3 rounded-xl ${location.pathname === item.path ? 'bg-primary/10 text-primary' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/20">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-9 h-9">
              <AvatarImage src="" />
              <AvatarFallback className="text-sm bg-primary/10 text-primary">{getInitials(user?.name || 'U')}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">{user?.role || 'analyst'}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between p-4 bg-card/80 backdrop-blur-md border-b border-border/30 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <span className="font-display font-bold">{title || 'EquityLens'}</span>
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(user?.name || 'U')}</AvatarFallback>
          </Avatar>
        </header>

        {/* Page Header */}
        {(title || subtitle) && (
          <div className="hidden md:flex items-center justify-between p-6 border-b border-border/20">
            <div>
              {title && <h1 className="text-2xl font-display font-bold">{title}</h1>}
              {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
            </div>
          </div>
        )}

        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}