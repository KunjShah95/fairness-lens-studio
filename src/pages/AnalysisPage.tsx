import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FairnessGauge } from '@/components/FairnessGauge';
import { BiasNutritionLabel } from '@/components/BiasNutritionLabel';
import { useAppStore } from '@/lib/store';
import { runBiasAnalysis, getMitigationStrategies } from '@/lib/bias-engine';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { FlaskConical, AlertTriangle, Shield, Lightbulb } from 'lucide-react';

const CHART_COLORS = ['hsl(217, 91%, 60%)', 'hsl(262, 83%, 58%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(199, 89%, 48%)'];

const AnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentDataset, currentAnalysis, setCurrentAnalysis } = useAppStore();
  const [target, setTarget] = useState('');
  const [sensitive, setSensitive] = useState('');
  const [loading, setLoading] = useState(false);

  if (!currentDataset) {
    return (
      <div className="container py-12 text-center animate-fade-in">
        <p className="text-muted-foreground">No dataset loaded.</p>
        <Button className="mt-4" onClick={() => navigate('/upload')}>Upload Dataset</Button>
      </div>
    );
  }

  const handleAnalyze = () => {
    if (!target || !sensitive) return;
    setLoading(true);
    setTimeout(() => {
      const analysis = runBiasAnalysis(currentDataset, target, sensitive);
      setCurrentAnalysis(analysis);
      setLoading(false);
    }, 1200);
  };

  const mitigations = currentAnalysis ? getMitigationStrategies(currentAnalysis) : [];

  const radarData = currentAnalysis ? [
    { metric: 'Demographic Parity', value: currentAnalysis.metrics.demographicParity * 100 },
    { metric: 'Equal Opportunity', value: currentAnalysis.metrics.equalOpportunity * 100 },
    { metric: 'Disparate Impact', value: currentAnalysis.metrics.disparateImpact * 100 },
  ] : [];

  return (
    <div className="container py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-foreground">Bias Analysis</h1>
        <p className="text-muted-foreground mt-1">{currentDataset.name} — {currentDataset.rows} rows, {currentDataset.columns.length} columns</p>
      </div>

      {/* Config */}
      <Card className="mb-8 shadow-card">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Target Variable</label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger><SelectValue placeholder="Select target" /></SelectTrigger>
                <SelectContent>
                  {currentDataset.columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Sensitive Attribute</label>
              <Select value={sensitive} onValueChange={setSensitive}>
                <SelectTrigger><SelectValue placeholder="Select attribute" /></SelectTrigger>
                <SelectContent>
                  {currentDataset.columns.filter(c => c !== target).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAnalyze} disabled={!target || !sensitive || loading} className="gap-2 gradient-primary text-primary-foreground">
              <FlaskConical className="w-4 h-4" />
              {loading ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {currentAnalysis && (
        <div className="space-y-8">
          {/* Score + Nutrition Label */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="shadow-elevated flex items-center justify-center py-8">
              <FairnessGauge score={currentAnalysis.metrics.overallScore} label="Overall Fairness" />
            </Card>
            <Card className="shadow-elevated flex items-center justify-center py-8">
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
            <div className="flex justify-center">
              <BiasNutritionLabel metrics={currentAnalysis.metrics} sensitiveAttribute={currentAnalysis.sensitiveAttribute} datasetName={currentDataset.name} />
            </div>
          </div>

          {/* Group Metrics */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Group Outcomes by {currentAnalysis.sensitiveAttribute}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={currentAnalysis.groupMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="group" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 1]} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="positiveRate" name="Positive Rate" radius={[6, 6, 0, 0]}>
                    {currentAnalysis.groupMetrics.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Feature Importance + Proxy Detection */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5 text-primary" />
                  Feature Importance (SHAP-like)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={currentAnalysis.featureImportance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis type="category" dataKey="feature" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={80} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Bar dataKey="importance" radius={[0, 6, 6, 0]}>
                      {currentAnalysis.featureImportance.map((f, i) => (
                        <Cell key={i} fill={f.isProxy ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary inline-block" /> Normal</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive inline-block" /> Proxy bias detected</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lightbulb className="w-5 h-5 text-warning" />
                  Mitigation Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mitigations.slice(0, 4).map(m => (
                  <div key={m.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-foreground">{m.name}</span>
                      <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">+{m.impact}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => navigate('/simulator')}>
                  Try in Simulator →
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisPage;
