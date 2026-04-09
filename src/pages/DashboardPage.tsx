import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FairnessGauge } from '@/components/FairnessGauge';
import { BiasNutritionLabel } from '@/components/BiasNutritionLabel';
import { useAppStore } from '@/lib/store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { BarChart3, Upload, FlaskConical, Eye, TrendingUp, Users, Database } from 'lucide-react';

const CHART_COLORS = ['hsl(217, 91%, 60%)', 'hsl(262, 83%, 58%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentDataset, currentAnalysis, datasets, simulations } = useAppStore();

  if (!currentAnalysis) {
    return (
      <div className="container py-12 animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground mb-6">Dashboard</h1>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Upload, title: 'Upload Dataset', desc: 'Start with a CSV file', path: '/upload' },
            { icon: FlaskConical, title: 'Run Analysis', desc: 'Detect bias in your data', path: '/analysis' },
            { icon: Eye, title: 'Simulate', desc: 'Test what-if scenarios', path: '/simulator' },
          ].map(item => (
            <Card key={item.path} className="shadow-elevated cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(item.path)}>
              <CardContent className="p-8 text-center">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">{currentDataset?.name}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/transparency')}>View Public Report →</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Database, label: 'Datasets', value: datasets.length },
          { icon: Users, label: 'Records', value: currentDataset?.rows || 0 },
          { icon: BarChart3, label: 'Fairness Score', value: currentAnalysis.metrics.overallScore },
          { icon: TrendingUp, label: 'Simulations', value: simulations.length },
        ].map(s => (
          <Card key={s.label} className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Gauge */}
        <Card className="shadow-elevated flex items-center justify-center py-8">
          <FairnessGauge score={currentAnalysis.metrics.overallScore} size={200} label="Current Fairness" />
        </Card>

        {/* Group chart */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Positive Rates by Group</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={currentAnalysis.groupMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="group" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Bar dataKey="positiveRate" radius={[6, 6, 0, 0]}>
                  {currentAnalysis.groupMetrics.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Population distribution */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Population Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Best simulation + Nutrition label */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {bestSim && (
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Best Simulation Result</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center">
              <FairnessGauge score={bestSim.metrics.overallScore} size={140} label={bestSim.name} />
              <p className="text-sm text-success font-medium mt-3">
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
