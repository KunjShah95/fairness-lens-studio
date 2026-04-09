import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FairnessGauge } from '@/components/FairnessGauge';
import { BiasNutritionLabel } from '@/components/BiasNutritionLabel';
import { useAppStore } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Share2, Download, Globe, Copy } from 'lucide-react';
import { toast } from 'sonner';

const CHART_COLORS = ['hsl(217, 91%, 60%)', 'hsl(262, 83%, 58%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

const TransparencyPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentDataset, currentAnalysis } = useAppStore();

  if (!currentAnalysis || !currentDataset) {
    return (
      <div className="container py-12 text-center animate-fade-in">
        <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
        <p className="text-muted-foreground">No analysis to display.</p>
        <Button className="mt-4" onClick={() => navigate('/analysis')}>Run Analysis</Button>
      </div>
    );
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  const handleExportCSV = () => {
    const rows = [
      ['Group', 'Positive Rate', 'Count'],
      ...currentAnalysis.groupMetrics.map(g => [g.group, g.positiveRate.toFixed(3), g.count.toString()]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fairness-report-${currentDataset.name}.csv`;
    a.click();
    toast.success('CSV downloaded');
  };

  return (
    <div className="container py-8 max-w-4xl animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">Public Transparency Report</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Fairness Report</h1>
          <p className="text-muted-foreground mt-1">{currentDataset.name} · Generated {new Date().toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleCopyLink}>
            <Copy className="w-4 h-4" /> Share Link
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="shadow-elevated flex items-center justify-center py-10">
          <FairnessGauge score={currentAnalysis.metrics.overallScore} size={200} label="Overall Fairness Score" />
        </Card>
        <div className="flex justify-center items-center">
          <BiasNutritionLabel metrics={currentAnalysis.metrics} sensitiveAttribute={currentAnalysis.sensitiveAttribute} datasetName={currentDataset.name} />
        </div>
      </div>

      <Card className="shadow-card mb-6">
        <CardHeader>
          <CardTitle className="text-base">Outcome Rates by {currentAnalysis.sensitiveAttribute}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={currentAnalysis.groupMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="group" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Bar dataKey="positiveRate" name="Positive Rate" radius={[6, 6, 0, 0]}>
                {currentAnalysis.groupMetrics.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Detailed Group Metrics</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 font-medium text-muted-foreground">Group</th>
                  <th className="text-right py-3 font-medium text-muted-foreground">Count</th>
                  <th className="text-right py-3 font-medium text-muted-foreground">Positive Rate</th>
                  <th className="text-right py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {currentAnalysis.groupMetrics.map(g => {
                  const avg = currentAnalysis.groupMetrics.reduce((s, gm) => s + gm.positiveRate, 0) / currentAnalysis.groupMetrics.length;
                  const diff = g.positiveRate - avg;
                  return (
                    <tr key={g.group} className="border-b border-border/50">
                      <td className="py-3 font-medium text-foreground">{g.group}</td>
                      <td className="py-3 text-right text-muted-foreground">{g.count}</td>
                      <td className="py-3 text-right font-mono">{(g.positiveRate * 100).toFixed(1)}%</td>
                      <td className="py-3 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          Math.abs(diff) < 0.05 ? 'bg-success/10 text-success' :
                          diff < 0 ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                        }`}>
                          {Math.abs(diff) < 0.05 ? 'Fair' : diff < 0 ? 'Disadvantaged' : 'Advantaged'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransparencyPage;
