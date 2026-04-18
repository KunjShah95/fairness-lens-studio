import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FairnessGauge } from '@/components/FairnessGauge';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/use-auth';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, RadarChart, Radar, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Line 
} from 'recharts';
import { 
  BarChart3, Shield, AlertTriangle, CheckCircle, 
  Target, PieChart as PieChartIcon, BarChartHorizontal, 
  TrendingUp, TrendingDown, Activity, Bell, Clock, Upload, Plus, Database, Users, FileText
} from 'lucide-react';
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";

const CHART_COLORS = ['hsl(18, 55%, 52%)', 'hsl(155, 25%, 45%)', 'hsl(28, 45%, 58%)', 'hsl(25, 60%, 55%)', 'hsl(0, 65%, 50%)'];

const mockTrendData = [
  { month: 'Jan', score: 65, target: 80 },
  { month: 'Feb', score: 68, target: 80 },
  { month: 'Mar', score: 72, target: 80 },
  { month: 'Apr', score: 70, target: 80 },
  { month: 'May', score: 75, target: 80 },
  { month: 'Jun', score: 78, target: 80 },
];

const radarData = [
  { metric: 'Demographic Parity', value: 78, fullMark: 100 },
  { metric: 'Equal Opportunity', value: 82, fullMark: 100 },
  { metric: 'Disparate Impact', value: 75, fullMark: 100 },
  { metric: 'Predictive Parity', value: 88, fullMark: 100 },
  { metric: 'Calibration', value: 85, fullMark: 100 },
];

const mockGroupData = [
  { group: 'Male', approved: 82, rejected: 18 },
  { group: 'Female', approved: 74, rejected: 26 },
  { group: 'Non-Binary', approved: 85, rejected: 15 },
  { group: 'Other', approved: 80, rejected: 20 },
];

const mockBiasData = [
  { metric: 'Gender Parity', current: 78, target: 80 },
  { metric: 'Age Fairness', current: 85, target: 80 },
  { metric: 'Income Neutrality', current: 72, target: 80 },
];

const mockFeatureImportance = [
  { feature: 'income_level', importance: 0.35, fair: true },
  { feature: 'credit_score', importance: 0.25, fair: true },
  { feature: 'location', importance: 0.15, fair: false },
  { feature: 'age_group', importance: 0.12, fair: true },
  { feature: 'education', importance: 0.08, fair: true },
];

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentDataset, currentAnalysis, datasets, notifications } = useAppStore();
  const isLoading = false;

  const score = currentAnalysis?.metrics.overallScore || 78;

  const mockAlerts = notifications.map(n => ({
    id: n.id,
    message: `${n.title}: ${n.message}`,
    type: n.type,
    time: 'Recent'
  }));

  // Ensure we have some default alerts if notifications are empty
  const displayAlerts = mockAlerts.length > 0 ? mockAlerts : [
    { id: '1', message: 'Demographic Parity: Low score in Gender group', type: 'warning', time: '2h ago' },
    { id: '2', message: 'Audit Complete: Finance Model v2', type: 'success', time: '5h ago' }
  ];

  return (
    <DashboardLayout title="Dashboard" subtitle="Overview of your fairness audits and model performance">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              Welcome back, {user?.name?.split(' ')[0] || 'User'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's your fairness overview
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full gap-2" onClick={() => navigate('/transparency')}>
              <FileText className="w-4 h-4" /> View Report
            </Button>
            <Button className="rounded-full btn-warm-primary gap-2" onClick={() => navigate('/upload')}>
              <Plus className="w-4 h-4" /> New Audit
            </Button>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Fairness Score', value: score, icon: Shield, color: score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-destructive', trend: '+5%', trendUp: true },
            { label: 'Datasets', value: datasets.length || 3, icon: Database, color: 'text-primary', trend: '+1', trendUp: true },
            { label: 'Total Records', value: currentDataset?.rows || 12540, icon: Users, color: 'text-secondary', trend: '+2.1K', trendUp: true },
            { label: 'Bias Alerts', value: displayAlerts.filter(a => a.type === 'warning').length, icon: AlertTriangle, color: 'text-warning', trend: '-2', trendUp: false },
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

        <div className="grid md:grid-cols-3 gap-6">
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

          <Card className="card-warm border-border/20">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                Metrics Comparison
              </CardTitle>
              <CardDescription>Current vs target</CardDescription>
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

        <div className="grid md:grid-cols-2 gap-6">
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

          <Card className="card-warm border-border/20">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest updates and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {displayAlerts.map(alert => (
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

        {datasets.length === 0 && (
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
    </DashboardLayout>
  );
};

export default DashboardPage;