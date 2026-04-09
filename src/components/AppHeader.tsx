import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Eye, BarChart3, Upload, FlaskConical, FileText, LogOut, Menu, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { path: '/upload', label: 'Upload', icon: Upload },
  { path: '/analysis', label: 'Analysis', icon: FlaskConical },
  { path: '/simulator', label: 'Simulator', icon: Eye },
  { path: '/transparency', label: 'Reports', icon: FileText },
];

export const AppHeader: React.FC = () => {
  const location = useLocation();
  const { user, setUser } = useAppStore();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  if (location.pathname === '/') return null;

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Eye className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg text-foreground">EquityLens</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(item => (
            <Link key={item.path} to={item.path}>
              <Button
                variant={location.pathname === item.path ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user && (
            <span className="hidden md:block text-sm text-muted-foreground">
              {user.name} <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-1">{user.role}</span>
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => { setUser(null); window.location.href = '/'; }}>
            <LogOut className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-border bg-card p-2">
          {navItems.map(item => (
            <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
              <Button variant={location.pathname === item.path ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start gap-2 mb-1">
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
