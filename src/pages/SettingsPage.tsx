import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from '@/hooks/use-toast';
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Users, 
  Building2, 
  Mail, 
  Lock, 
  Save,
  Camera,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, login } = useAppStore();
  const [profile, setProfile] = React.useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [notifications, setNotifications] = React.useState({
    emailAlerts: JSON.parse(localStorage.getItem('notif_emailAlerts') ?? 'true'),
    biasAlerts: JSON.parse(localStorage.getItem('notif_biasAlerts') ?? 'true'),
    weeklyReport: JSON.parse(localStorage.getItem('notif_weeklyReport') ?? 'false'),
    teamUpdates: JSON.parse(localStorage.getItem('notif_teamUpdates') ?? 'true'),
  });
  const [compactMode, setCompactMode] = React.useState(() => JSON.parse(localStorage.getItem('compactMode') ?? 'false'));
  const [saving, setSaving] = React.useState(false);
  const [orgName, setOrgName] = React.useState(() => localStorage.getItem('orgName') ?? 'EquityLens Organization');
  const [orgPlan, setOrgPlan] = React.useState(() => localStorage.getItem('orgPlan') ?? 'Free Plan');
  const [orgMembers, setOrgMembers] = React.useState(() => parseInt(localStorage.getItem('orgMembers') ?? '3'));
  const [passwordDialogOpen, setPasswordDialogOpen] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = React.useState(() => JSON.parse(localStorage.getItem('twoFactorEnabled') ?? 'false'));
  const [sessions, setSessions] = React.useState(() => {
    const stored = localStorage.getItem('activeSessions');
    return stored ? JSON.parse(stored) : [{ id: '1', device: 'Current Browser', location: 'Local', lastActive: new Date().toISOString(), current: true }];
  });
  const [sessionsDialogOpen, setSessionsDialogOpen] = React.useState(false);

  React.useEffect(() => {
    localStorage.setItem('notif_emailAlerts', JSON.stringify(notifications.emailAlerts));
    localStorage.setItem('notif_biasAlerts', JSON.stringify(notifications.biasAlerts));
    localStorage.setItem('notif_weeklyReport', JSON.stringify(notifications.weeklyReport));
    localStorage.setItem('notif_teamUpdates', JSON.stringify(notifications.teamUpdates));
  }, [notifications]);

  React.useEffect(() => {
    localStorage.setItem('compactMode', JSON.stringify(compactMode));
  }, [compactMode]);

  React.useEffect(() => {
    localStorage.setItem('orgName', orgName);
    localStorage.setItem('orgPlan', orgPlan);
    localStorage.setItem('orgMembers', orgMembers.toString());
  }, [orgName, orgPlan, orgMembers]);

  React.useEffect(() => {
    localStorage.setItem('twoFactorEnabled', JSON.stringify(twoFactorEnabled));
    localStorage.setItem('activeSessions', JSON.stringify(sessions));
  }, [twoFactorEnabled, sessions]);

  const handleSaveProfile = async () => {
    if (!profile.name.trim() || !profile.email.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in both name and email',
        variant: 'destructive',
      });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    login({ ...user!, name: profile.name, email: profile.email });
    toast({
      title: 'Profile updated',
      description: 'Your profile has been saved successfully',
      className: 'bg-success text-success-foreground border-success',
    });
    setSaving(false);
  };

  const handleNotificationChange = (key: keyof typeof notifications, value: boolean) => {
    setNotifications(n => ({ ...n, [key]: value }));
    toast({
      title: key === 'emailAlerts' ? 'Email alerts' 
        : key === 'biasAlerts' ? 'Bias alerts'
        : key === 'weeklyReport' ? 'Weekly reports'
        : 'Team updates',
      description: value ? 'Enabled' : 'Disabled',
      className: value ? 'bg-success text-success-foreground border-success' : '',
    });
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) {
      toast({ title: 'Password too short', description: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', description: 'Please confirm your password', variant: 'destructive' });
      return;
    }
    await new Promise(r => setTimeout(r, 800));
    localStorage.setItem('lastPasswordChange', new Date().toISOString());
    setPasswordDialogOpen(false);
    setNewPassword('');
    setConfirmPassword('');
    toast({ title: 'Password changed', description: 'Your password has been updated', className: 'bg-success text-success-foreground border-success' });
  };

  const handleToggle2FA = () => {
    setTwoFactorEnabled(!twoFactorEnabled);
    localStorage.setItem('twoFactorEnabled', JSON.stringify(!twoFactorEnabled));
    toast({
      title: twoFactorEnabled ? '2FA disabled' : '2FA enabled',
      description: twoFactorEnabled ? 'Two-factor authentication is now off' : 'Two-factor authentication is now on',
      className: !twoFactorEnabled ? 'bg-success text-success-foreground border-success' : '',
    });
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (sessionId === '1') return;
    await new Promise(r => setTimeout(r, 300));
    setSessions(s => s.filter(sess => sess.id !== sessionId));
    toast({ title: 'Session revoked', description: 'Device has been logged out', className: 'bg-success text-success-foreground border-success' });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="container py-8 animate-fade-in">
      <div className="fixed inset-0 -z-10 bg-background" />

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="rounded-full">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="md:w-64 shrink-0">
            <TabsList className="flex flex-row md:flex-col w-full bg-transparent h-auto p-0">
              <TabsTrigger 
                value="profile" 
                className="w-full justify-start gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <User className="w-4 h-4" />
                <span className="hidden md:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger 
                value="notifications" 
                className="w-full justify-start gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden md:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger 
                value="security" 
                className="w-full justify-start gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden md:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger 
                value="appearance" 
                className="w-full justify-start gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Palette className="w-4 h-4" />
                <span className="hidden md:inline">Appearance</span>
              </TabsTrigger>
              <TabsTrigger 
                value="organization" 
                className="w-full justify-start gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Building2 className="w-4 h-4" />
                <span className="hidden md:inline">Organization</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Content */}
          <div className="flex-1 max-w-2xl">
            <TabsContent value="profile" className="m-0">
              <Card className="card-warm border-border/30">
                <CardHeader>
                  <CardTitle className="font-display text-xl flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>Update your personal details and contact information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <Avatar className="w-20 h-20 border-4 border-card shadow-glass">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-2xl bg-primary/10 text-primary font-display">
                          {getInitials(profile.name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <Button size="icon" className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                        <Camera className="w-3 h-3" />
                      </Button>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{profile.name || 'Your Name'}</p>
                      <p className="text-sm text-muted-foreground">{user?.role || 'User'}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Form */}
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input 
                        id="name" 
                        value={profile.name}
                        onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                        placeholder="Enter your full name"
                        className="rounded-xl bg-card/50 border-border/30"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input 
                        id="email" 
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                        placeholder="Enter your email"
                        className="rounded-xl bg-card/50 border-border/30"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Role</Label>
                      <Badge variant="secondary" className="w-fit bg-primary/10 text-primary font-medium">
                        {user?.role || 'analyst'}
                      </Badge>
                      <p className="text-xs text-muted-foreground">Contact your administrator to change your role</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={saving}
                      className="btn-warm-primary gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="m-0">
              <Card className="card-warm border-border/30">
                <CardHeader>
                  <CardTitle className="font-display text-xl flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>Choose how you want to be notified</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {[
                      { key: 'emailAlerts', label: 'Email Alerts', desc: 'Receive important alerts via email', icon: Mail },
                      { key: 'biasAlerts', label: 'Bias Detection Alerts', desc: 'Get notified when bias is detected in models', icon: Shield },
                      { key: 'weeklyReport', label: 'Weekly Reports', desc: 'Receive weekly fairness summary', icon: Bell },
                      { key: 'teamUpdates', label: 'Team Updates', desc: 'Updates about team activity and changes', icon: Users },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-card/30 border border-border/20">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <item.icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{item.label}</p>
                            <p className="text-sm text-muted-foreground">{item.desc}</p>
                          </div>
                        </div>
                        <Switch 
                          checked={notifications[item.key as keyof typeof notifications]}
                          onCheckedChange={(checked) => handleNotificationChange(item.key as keyof typeof notifications, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="m-0">
              <Card className="card-warm border-border/30">
                <CardHeader>
                  <CardTitle className="font-display text-xl flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Security Settings
                  </CardTitle>
                  <CardDescription>Manage your account security and authentication</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-card/30 border border-border/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Password</p>
                            <p className="text-sm text-muted-foreground">Last changed {(() => {
                              const last = localStorage.getItem('lastPasswordChange');
                              if (!last) return 'never';
                              const days = Math.floor((Date.now() - new Date(last).getTime()) / (1000*60*60*24));
                              return days === 0 ? 'today' : `${days} days ago`;
                            })()}</p>
                          </div>
                        </div>
                        <Button variant="outline" className="rounded-full" onClick={() => setPasswordDialogOpen(true)}>Change Password</Button>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-card/30 border border-border/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-secondary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Two-Factor Authentication</p>
                            <p className="text-sm text-muted-foreground">{twoFactorEnabled ? 'Enabled' : 'Add an extra layer of security'}</p>
                          </div>
                        </div>
                        <Switch checked={twoFactorEnabled} onCheckedChange={handleToggle2FA} />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-card/30 border border-border/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-accent" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Active Sessions</p>
                            <p className="text-sm text-muted-foreground">{sessions.length} device{sessions.length !== 1 ? 's' : ''} connected</p>
                          </div>
                        </div>
                        <Button variant="outline" className="rounded-full" onClick={() => setSessionsDialogOpen(true)}>View All</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Password Change Dialog */}
              <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>Enter your new password below. It must be at least 8 characters.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="newpass">New Password</Label>
                      <div className="relative">
                        <Input 
                          id="newpass" 
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pr-10"
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="absolute right-0 top-0 h-full w-10" 
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirmpass">Confirm Password</Label>
                      <Input 
                        id="confirmpass" 
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handlePasswordChange}>Save Password</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Sessions Dialog */}
              <Dialog open={sessionsDialogOpen} onOpenChange={setSessionsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Active Sessions</DialogTitle>
                    <DialogDescription>Manage your logged-in devices</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-4 max-h-[300px] overflow-y-auto">
                    {sessions.map(session => (
                      <div key={session.id} className="flex items-center justify-between p-3 rounded-xl bg-card/50 border border-border/20">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{session.device} {session.current && <Badge variant="secondary" className="ml-2 text-xs">Current</Badge>}</p>
                            <p className="text-xs text-muted-foreground">{session.location} • Last active {new Date(session.lastActive).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {!session.current && (
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRevokeSession(session.id)}>
                            Revoke
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSessionsDialogOpen(false)}>Close</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="appearance" className="m-0">
              <Card className="card-warm border-border/30">
                <CardHeader>
                  <CardTitle className="font-display text-xl flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    Appearance
                  </CardTitle>
                  <CardDescription>Customize how EquityLens looks on your device</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 rounded-xl bg-card/30 border border-border/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">Theme</p>
                        <p className="text-sm text-muted-foreground">Choose between light, dark, or system theme</p>
                      </div>
                      <ThemeToggle className="rounded-full" />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-card/30 border border-border/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">Compact Mode</p>
                        <p className="text-sm text-muted-foreground">Reduce spacing for more data density</p>
                      </div>
                      <Switch 
                        checked={compactMode}
                        onCheckedChange={(checked) => {
                          setCompactMode(checked);
                          toast({
                            title: 'Compact Mode',
                            description: checked ? 'Enabled' : 'Disabled',
                            className: checked ? 'bg-success text-success-foreground border-success' : '',
                          });
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="organization" className="m-0">
              <Card className="card-warm border-border/30">
                <CardHeader>
                  <CardTitle className="font-display text-xl flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Organization
                  </CardTitle>
                  <CardDescription>Manage your organization settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-border/20 text-center">
                    <Building2 className="w-12 h-12 mx-auto mb-4 text-primary/60" />
                    <p className="font-display text-xl font-semibold text-foreground">{orgName}</p>
                    <p className="text-sm text-muted-foreground mt-1">{orgPlan}</p>
                    <div className="flex justify-center gap-2 mt-4">
                      <Badge variant="secondary">{orgMembers} Members</Badge>
                      <Badge variant="outline">Unlimited Datasets</Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-card/30 border border-border/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Team Members</p>
                            <p className="text-sm text-muted-foreground">Manage who has access</p>
                          </div>
                        </div>
                        <Button variant="outline" className="rounded-full">Manage</Button>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-card/30 border border-border/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-secondary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Compliance Settings</p>
                            <p className="text-sm text-muted-foreground">Configure regulatory thresholds</p>
                          </div>
                        </div>
                        <Button variant="outline" className="rounded-full">Configure</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default SettingsPage;