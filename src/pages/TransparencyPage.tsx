import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FairnessGauge } from '@/components/FairnessGauge';
import { BiasNutritionLabel } from '@/components/BiasNutritionLabel';
import { useAppStore } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie } from 'recharts';
import { Share2, Download, Globe, Copy, FileText, BookOpen, Database, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const CHART_COLORS = ['hsl(15, 55%, 54%)', 'hsl(150, 20%, 46%)', 'hsl(35, 45%, 60%)', 'hsl(25, 40%, 65%)', 'hsl(0, 65%, 50%)'];

interface DashboardData {
  audit_id: string;
  fairness_score: number;
  metadata: {
    created_at: string;
    status: string;
    protected_attributes: string[];
  };
  charts: {
    fairness_gauge: {
      label: string;
      value: number;
      max: number;
      color: string;
    };
    metrics_by_attribute: {
      attributes: string[];
      data: Array<{
        attribute: string;
        demographic_parity: number;
        disparate_impact: number;
        equal_opportunity: number;
      }>;
    };
    proxy_features: {
      count: number;
      features: string[];
    };
    feature_importance: {
      features: Array<{ name: string; importance: number }>;
      total_features: number;
    };
  };
  summary: {
    total_metrics: number;
    flagged_attributes: number;
    proxy_features_detected: number;
    causal_analysis_available: boolean;
  };
}

const TransparencyPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentDataset, currentAnalysis } = useAppStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportHTML, setReportHTML] = useState<string>('');
  const [modelCard, setModelCard] = useState<string>('');
  const [showModelCard, setShowModelCard] = useState(false);

  // For demo: use current analysis if available, otherwise show placeholder
  useEffect(() => {
    if (currentAnalysis && currentDataset) {
      // Mock dashboard data from current analysis
      const mockData: DashboardData = {
        audit_id: 'audit-' + Date.now(),
        fairness_score: currentAnalysis.metrics.overallScore || 75,
        metadata: {
          created_at: new Date().toISOString(),
          status: 'completed',
          protected_attributes: [currentAnalysis.sensitiveAttribute || 'gender']
        },
        charts: {
          fairness_gauge: {
            label: 'Overall Fairness',
            value: currentAnalysis.metrics.overallScore || 75,
            max: 100,
            color: currentAnalysis.metrics.overallScore >= 75 ? 'green' : 'orange'
          },
          metrics_by_attribute: {
            attributes: currentAnalysis.groupMetrics.map(g => g.group),
            data: currentAnalysis.groupMetrics.map(g => ({
              attribute: g.group,
              demographic_parity: g.positiveRate,
              disparate_impact: g.positiveRate,
              equal_opportunity: g.positiveRate
            }))
          },
          proxy_features: {
            count: 0,
            features: []
          },
          feature_importance: {
            features: [],
            total_features: 0
          }
        },
        summary: {
          total_metrics: currentAnalysis.groupMetrics.length,
          flagged_attributes: 0,
          proxy_features_detected: 0,
          causal_analysis_available: false
        }
      };
      setDashboardData(mockData);
    }
  }, [currentAnalysis, currentDataset]);

  const handleGenerateReport = async () => {
    if (!dashboardData) return;
    setLoading(true);
    try {
      // In production, this would call: GET /api/reports/audit-report-html/{audit_id}
      // For now, we'll generate a mock report
      const mockHTMLReport = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              h1 { color: #0066cc; }
              .score { font-size: 24px; font-weight: bold; color: ${dashboardData.fairness_score >= 75 ? '#10b981' : '#f59e0b'}; }
              .metric { margin: 10px 0; padding: 10px; background: #f3f4f6; border-left: 4px solid #0066cc; }
            </style>
          </head>
          <body>
            <h1>Healthcare Fairness Audit Report</h1>
            <p><strong>Dataset:</strong> ${currentDataset?.name || 'Unknown'}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <div class="metric">
              <strong>Fairness Score:</strong> <span class="score">${dashboardData.fairness_score}/100</span>
            </div>
            <h2>Executive Summary</h2>
            <p>This audit report evaluates fairness in healthcare decision support on the provided dataset.</p>
            <h2>Key Metrics</h2>
            <p>Demographic Parity: ${(currentAnalysis?.metrics.demographicParity * 100).toFixed(1)}%</p>
            <p>Equal Opportunity: ${(currentAnalysis?.metrics.equalOpportunity * 100).toFixed(1)}%</p>
          </body>
        </html>
      `;
      setReportHTML(mockHTMLReport);
      setActiveTab('report');
      toast.success('Report generated successfully');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateModelCard = async () => {
    if (!dashboardData) return;
    setLoading(true);
    try {
      // In production, this would call: GET /api/reports/model-card-markdown/{audit_id}
      const mockCard = `# Model Card: Clinical Decision Support Model v1.0

## Model Details
    - **Name**: Clinical Decision Support Model v1.0
- **Type**: Classification
- **Organization**: EquityLens
- **Date**: ${new Date().toLocaleDateString()}

## Intended Use
This model is designed to support fair and transparent healthcare decisions.

### Primary Use Cases
- Patient triage support
- Treatment prioritization
- Prior authorization review

## Model Limitations
- **Fairness**: May have disparate impact on certain groups
- **Performance**: Accuracy varies by demographic group
- **Data**: Depends on quality and representativeness of training data

## Ethical Considerations
1. **Fairness**: Regular audits and human review
2. **Transparency**: Explanation on request
3. **Accountability**: Full audit trail
4. **Data Rights**: GDPR/CCPA compliance

## Recommendations
- Monitor fairness metrics regularly
- Review appeals and feedback
- Update model quarterly
`;
      setModelCard(mockCard);
      setShowModelCard(true);
      toast.success('Model card generated successfully');
    } catch (error) {
      toast.error('Failed to generate model card');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!currentAnalysis) return;
    const rows = [
      ['Group', 'Positive Rate', 'Count'],
      ...currentAnalysis.groupMetrics.map(g => [g.group, g.positiveRate.toFixed(3), g.count.toString()]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fairness-report-${currentDataset?.name || 'export'}.csv`;
    a.click();
    toast.success('CSV downloaded');
  };

  const handleExportJSON = () => {
    if (!dashboardData) return;
    const json = JSON.stringify(dashboardData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fairness-audit-${currentDataset?.name || 'export'}.json`;
    a.click();
    toast.success('JSON downloaded');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  if (!currentAnalysis || !currentDataset) {
    return (
      <div className="container py-12 text-center animate-fade-in">
        <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
        <p className="text-muted-foreground">No analysis to display.</p>
        <Button className="mt-4" onClick={() => navigate('/analysis')}>Run Analysis</Button>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-6xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">Public Transparency Report</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Fairness Dashboard</h1>
          <p className="text-muted-foreground mt-1">{currentDataset.name} · {new Date().toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleCopyLink}>
            <Copy className="w-4 h-4" /> Share
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportJSON}>
            <Database className="w-4 h-4" /> JSON
          </Button>
          <Button size="sm" className="gap-2" onClick={handleGenerateReport} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Report
          </Button>
          <Button size="sm" className="gap-2" onClick={handleGenerateModelCard} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            Card
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="report" disabled={!reportHTML}>Report</TabsTrigger>
          <TabsTrigger value="model-card" disabled={!modelCard}>Model Card</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Fairness Gauge */}
            <Card className="shadow-elevated flex items-center justify-center py-10">
              <FairnessGauge score={dashboardData?.fairness_score || 75} size={200} label="Overall Fairness Score" />
            </Card>
            {/* Bias Nutrition Label */}
            <div className="flex justify-center items-center">
              <BiasNutritionLabel metrics={currentAnalysis.metrics} sensitiveAttribute={currentAnalysis.sensitiveAttribute} datasetName={currentDataset.name} />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-1">Total Metrics</div>
                <div className="text-2xl font-bold">{dashboardData?.summary.total_metrics || 0}</div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-1">Flagged Attributes</div>
                <div className="text-2xl font-bold text-warning">{dashboardData?.summary.flagged_attributes || 0}</div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-1">Proxy Features</div>
                <div className="text-2xl font-bold text-destructive">{dashboardData?.summary.proxy_features_detected || 0}</div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-1">Analysis Status</div>
                <Badge variant="secondary" className="mt-1">Completed</Badge>
              </CardContent>
            </Card>
          </div>

          {/* Outcome Rates Chart */}
          <Card className="shadow-card">
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
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Detailed Group Metrics</CardTitle>
            </CardHeader>
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

          {/* Metrics Summary */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Key Fairness Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Demographic Parity</div>
                  <div className="text-2xl font-bold">{(currentAnalysis.metrics.demographicParity * 100).toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground mt-1">Should be close to 100%</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Equal Opportunity</div>
                  <div className="text-2xl font-bold">{(currentAnalysis.metrics.equalOpportunity * 100).toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground mt-1">Should be close to 100%</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Overall Score</div>
                  <div className="text-2xl font-bold">{currentAnalysis.metrics.overallScore.toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Out of 100</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Tab */}
        <TabsContent value="report" className="space-y-6">
          {reportHTML ? (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Clinical Fairness Audit Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border border-border rounded-lg p-6 bg-white" dangerouslySetInnerHTML={{ __html: reportHTML }} />
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <FileText className="w-4 h-4" />
              <AlertDescription>Click the "Report" button to generate a comprehensive audit report.</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Model Card Tab */}
        <TabsContent value="model-card" className="space-y-6">
          {modelCard ? (
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>AI Model Card</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowModelCard(!showModelCard)}
                    className="gap-2"
                  >
                    {showModelCard ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showModelCard ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </CardHeader>
              {showModelCard && (
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{modelCard}</code>
                    </pre>
                  </div>
                </CardContent>
              )}
            </Card>
          ) : (
            <Alert>
              <BookOpen className="w-4 h-4" />
              <AlertDescription>Click the "Card" button to generate an OpenAI-style model card.</AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TransparencyPage;
