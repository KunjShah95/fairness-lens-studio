import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FairnessGauge } from '@/components/FairnessGauge';
import { BiasNutritionLabel } from '@/components/BiasNutritionLabel';
import { useAppStore } from '@/lib/store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { BarChart3, Upload, FlaskConical, Eye, TrendingUp, Users, Database, ArrowRight } from 'lucide-react';

const CHART_COLORS = ['hsl(15, 55%, 54%)', 'hsl(150, 20%, 46%)', 'hsl(35, 45%, 60%)', 'hsl(25, 40%, 65%)', 'hsl(0, 65%, 50%)'];

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentDataset, currentAnalysis, datasets, simulations } = useAppStore();

  if (!currentAnalysis) {
    return (
      <div className="container py-12 animate-fade-in">
        <div className="fixed inset-0 -z-10 bg-background" />

        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground mb-8">Start by uploading a clinical dataset or running an audit.</p>
        
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Upload, title: 'Upload Dataset', desc: 'Upload a healthcare CSV file to begin', path: '/upload', color: 'bg-primary/10 text-primary' },
            { icon: FlaskConical, title: 'Run Audit', desc: 'Detect bias in care outcomes', path: '/analysis', color: 'bg-secondary/10 text-secondary' },
            { icon: Eye, title: 'Simulate', desc: 'Test what-if scenarios', path: '/simulator', color: 'bg-accent/15 text-accent' },
          ].map(item => (
            <Card 
              key={item.path} 
              className="card-warm-hover cursor-pointer border-border/30" 
              onClick={() => navigate(item.path)}
            >
              <CardContent className="p-8 text-center">
                <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mx-auto mb-4`}>
                  <item.icon className="w-7 h-7" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-lg">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const pieData = currentAnalysis.groupMetrics.map(g => ({ name: g.group, value: g.count }));
  const bestSim = simulations.length > 0 ? simulations.reduce((a, b) => a.metrics.overallScore > b.metrics.overallScore ? a : b) : null;

  return (
    <div className="container py-8 animate-fade-in">
      <div className="fixed inset-0 -z-10 bg-background" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Fairness Dashboard</h1>
          <p className="text-muted-foreground mt-1">{currentDataset?.name}</p>
        </div>
        <Button variant="outline" className="rounded-full gap-2" onClick={() => navigate('/transparency')}>
          Public Report <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats - warm cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Database, label: 'Datasets', value: datasets.length, color: 'bg-primary/10 text-primary' },
          { icon: Users, label: 'Records', value: currentDataset?.rows || 0, color: 'bg-secondary/10 text-secondary' },
          { icon: BarChart3, label: 'Fairness Score', value: currentAnalysis.metrics.overallScore, color: 'bg-accent/15 text-accent' },
          { icon: TrendingUp, label: 'Simulations', value: simulations.length, color: 'bg-warning/15 text-warning' },
        ].map(s => (
          <Card key={s.label} className="card-warm border-border/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center shrink-0`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Fairness Gauge - hero */}
        <Card className="card-warm flex items-center justify-center py-8 border-border/30">
          <FairnessGauge score={currentAnalysis.metrics.overallScore} size={200} label="Fairness Score" />
        </Card>

        {/* Group chart */}
        <Card className="card-warm border-border/30">
          <CardHeader>
            <CardTitle className="text-base font-display">Care Access Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={currentAnalysis.groupMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="group" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                <Bar dataKey="positiveRate" radius={[8, 8, 0, 0]}>
                  {currentAnalysis.groupMetrics.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Population pie */}
        <Card className="card-warm border-border/30">
          <CardHeader>
            <CardTitle className="text-base font-display">Population Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie 
                  data={pieData} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={80} 
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row - Nutrition label + best sim */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {bestSim && (
          <Card className="card-warm border-border/30">
            <CardHeader>
              <CardTitle className="text-base font-display">Best Simulation Result</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <FairnessGauge score={bestSim.metrics.overallScore} size={140} label={bestSim.name} />
              <p className="text-sm text-success font-medium mt-3 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +{bestSim.metrics.overallScore - currentAnalysis.metrics.overallScore} points improvement
              </p>
            </CardContent>
          </Card>
        )}
        <div className="flex justify-center">
          <BiasNutritionLabel metrics={currentAnalysis.metrics} sensitiveAttribute={currentAnalysis.sensitiveAttribute} datasetName={currentDataset?.name || ''} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;