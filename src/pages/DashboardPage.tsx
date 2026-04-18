import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FairnessGauge } from '@/components/FairnessGauge';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, AreaChart, Area, LineChart, Line, RadarChart, Radar, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Legend, ComposedChart
} from 'recharts';
import { 
  BarChart3, Upload, FlaskConical, Eye, TrendingUp, Users, Database, 
  ArrowRight, Home, Settings, FileText, Bell, LogOut, Menu, X, Plus,
  Shield, AlertTriangle, CheckCircle, Clock, TrendingDown, Activity,
  Target, UsersRound, PieChart as PieChartIcon, BarChartHorizontal
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const CHART_COLORS = ['hsl(18, 55%, 52%)', 'hsl(155, 25%, 45%)', 'hsl(28, 45%, 58%)', 'hsl(25, 60%, 55%)', 'hsl(0, 65%, 50%)'];
const GRADIENTS = {
  primary: 'linear-gradient(135deg, hsl(18, 55%, 52%), hsl(28, 45%, 58%))',
  secondary: 'linear-gradient(135deg, hsl(155, 25%, 45%), hsl(155, 30%, 52%))',
  accent: 'linear-gradient(135deg, hsl(28, 45%, 58%), hsl(18, 55%, 52%))',
};

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/upload', label: 'Upload', icon: Upload },
  { path: '/analysis', label: 'Analysis', icon: FlaskConical },
  { path: '/simulator', label: 'Simulator', icon: Eye },
  { path: '/transparency', label: 'Reports', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const mockTrendData = [
  { month: 'Jan', score: 65, target: 80 },
  { month: 'Feb', score: 68, target: 80 },
  { month: 'Mar', score: 72, target: 80 },
  { month: 'Apr', score: 70, target: 80 },
  { month: 'May', score: 75, target: 80 },
  { month: 'Jun', score: 78, target: 80 },
];

const mockBiasData = [
  { metric: 'Demographic Parity', current: 0.78, previous: 0.72, target: 0.80 },
  { metric: 'Equal Opportunity', current: 0.82, previous: 0.75, target: 0.80 },
  { metric: 'Disparate Impact', current: 0.75, previous: 0.68, target: 0.80 },
  { metric: 'Predictive Parity', current: 0.88, previous: 0.82, target: 0.85 },
];

const mockGroupData = [
  { group: 'Male', approved: 82, rejected: 18, total: 1250 },
  { group: 'Female', approved: 78, rejected: 22, total: 1180 },
  { group: 'Non-Binary', approved: 85, rejected: 15, total: 120 },
  { group: 'Other', approved: 80, rejected: 20, total: 450 },
];

const mockFeatureImportance = [
  { feature: 'Income', importance: 0.35, fair: false },
  { feature: 'Age', importance: 0.25, fair: true },
  { feature: 'Credit Score', importance: 0.20, fair: true },
  { feature: 'Location', importance: 0.12, fair: false },
  { feature: 'Education', importance: 0.08, fair: true },
];

const mockAlerts = [
  { id: 1, type: 'warning', message: 'Bias detected in gender group: Female', time: '2h ago' },
  { id: 2, type: 'success', message: 'Model re-trained successfully', time: '5h ago' },
  { id: 3, type: 'info', message: 'New dataset uploaded: clinical_2024.csv', time: '1d ago' },
];

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { currentDataset, currentAnalysis, datasets, simulations } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const score = currentAnalysis?.metrics.overallScore || 78;
  const isLoading = !currentAnalysis;

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const pieData = [
    { name: 'Approved', value: 79, color: CHART_COLORS[1] },
    { name: 'Pending', value: 12, color: CHART_COLORS[0] },
    { name: 'Rejected', value: 9, color: CHART_COLORS[3] },
  ];

  const radarData = [
    { metric: 'DP', value: 78, fullMark: 100 },
    { metric: 'EO', value: 82, fullMark: 100 },
    { metric: 'DI', value: 75, fullMark: 100 },
    { metric: 'PP', value: 88, fullMark: 100 },
    { metric: 'Calib', value: 85, fullMark: 100 },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card/95 backdrop-blur-xl border-r border-border/30 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <Link to="/" className="flex items-center gap-2">
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
              <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" onClick={() => logout().then(() => navigate('/login'))}>
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
          <span className="font-display font-bold">EquityLens</span>
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(user?.name || 'U')}</AvatarFallback>
          </Avatar>
        </header>

        <div className="p-4 md:p-6 space-y-6">
          {/* Welcome & Quick Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                Welcome back, {user?.name?.split(' ')[0] || 'User'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isLoading ? 'Getting started...' : 'Here\'s your fairness overview'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-full gap-2" onClick={() => navigate('/transparency')}>
                <FileText className="w-4 h-4" /> View Report
              </Button>
              {isLoading && (
                <Button className="rounded-full btn-warm-primary gap-2" onClick={() => navigate('/upload')}>
                  <Plus className="w-4 h-4" /> New Audit
                </Button>
              )}
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Fairness Score', value: score, icon: Shield, color: score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-destructive', trend: '+5%', trendUp: true },
              { label: 'Datasets', value: datasets.length || 3, icon: Database, color: 'text-primary', trend: '+1', trendUp: true },
              { label: 'Total Records', value: currentDataset?.rows || 12540, icon: Users, color: 'text-secondary', trend: '+2.1K', trendUp: true },
              { label: 'Bias Alerts', value: mockAlerts.filter(a => a.type === 'warning').length, icon: AlertTriangle, color: 'text-warning', trend: '-2', trendUp: false },
            ].map(stat => (
              <Card key={stat.label} className="card-warm border-border/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    <Badge variant={stat.trendUp ? 'secondary' : 'destructive'} className="text-xs">
                      {stat.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {stat.trend}
                    </Badge>
                  </div>
                  <p className="text-2xl font-display font-bold mt-2">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Charts Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Fairness Gauge - Hero */}
            <Card className="lg:col-span-1 card-warm border-border/20">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Fairness Score
                </CardTitle>
                <CardDescription>Overall model fairness rating</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center pb-6">
                <FairnessGauge score={score} size={180} />
                <div className="flex gap-4 mt-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-success">80+</p>
                    <p className="text-xs text-muted-foreground">Target</p>
                  </div>
                  <div className="w-px bg-border/30" />
                  <div>
                    <p className="text-lg font-bold text-primary">{score}</p>
                    <p className="text-xs text-muted-foreground">Current</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trend Area Chart */}
            <Card className="lg:col-span-2 card-warm border-border/20">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Fairness Trend
                </CardTitle>
                <CardDescription>Score over time vs target</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={mockTrendData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[50, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                    />
                    <Area type="monotone" dataKey="score" stroke={CHART_COLORS[0]} fillOpacity={1} fill="url(#colorScore)" strokeWidth={2} name="Score" />
                    <Line type="monotone" dataKey="target" stroke={CHART_COLORS[1]} strokeDasharray="5 5" strokeWidth={2} name="Target" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Second Row Charts */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Radar Chart - Metrics */}
            <Card className="card-warm border-border/20">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-primary" />
                  Fairness Metrics
                </CardTitle>
                <CardDescription>Multi-dimensional analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                    <Radar name="Score" dataKey="value" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.3} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bar Chart - By Group */}
            <Card className="card-warm border-border/20">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <BarChartHorizontal className="w-5 h-5 text-primary" />
                  Approval by Group
                </CardTitle>
                <CardDescription>Outcome distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={mockGroupData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <YAxis dataKey="group" type="category" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                    <Bar dataKey="approved" name="Approved" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="rejected" name="Rejected" fill={CHART_COLORS[3]} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Metrics Comparison */}
            <Card className="card-warm border-border/20">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  Metrics Comparison
                </CardTitle>
                <CardDescription>Current vs previous period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockBiasData.map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.metric}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={item.current >= item.target ? 'secondary' : 'outline'} className="text-xs">
                          {item.current >= item.target ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                          {item.current}
                        </Badge>
                      </div>
                    </div>
                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${item.current >= item.target ? 'bg-success' : 'bg-warning'}`}
                        style={{ width: `${item.current}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Third Row - Feature Importance & Alerts */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Feature Importance */}
            <Card className="card-warm border-border/20">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Feature Importance
                </CardTitle>
                <CardDescription>What drives model decisions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockFeatureImportance.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.feature}</span>
                        <div className="flex items-center gap-1">
                          {item.fair ? (
                            <Badge variant="secondary" className="text-xs bg-success/10 text-success">Fair</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-warning/10 text-warning">Bias Risk</Badge>
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${item.fair ? 'bg-success' : 'bg-warning'}`}
                          style={{ width: `${item.importance * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground w-10 text-right">
                      {(item.importance * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card className="card-warm border-border/20">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest updates and alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockAlerts.map(alert => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl bg-card/50">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      alert.type === 'success' ? 'bg-success/10 text-success' :
                      alert.type === 'warning' ? 'bg-warning/10 text-warning' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {alert.type === 'success' ? <CheckCircle className="w-4 h-4" /> :
                       alert.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
                       <Clock className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Empty State for New Users */}
          {isLoading && (
            <Card className="card-warm border-border/20 border-dashed">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl gradient-warm flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">Start Your First Audit</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Upload a dataset to begin detecting bias and generating fairness insights for your models.
                </p>
                <Button className="rounded-full btn-warm-primary gap-2" onClick={() => navigate('/upload')}>
                  <Upload className="w-4 h-4" /> Upload Dataset
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;