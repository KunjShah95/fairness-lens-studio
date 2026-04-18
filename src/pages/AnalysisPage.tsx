import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader, Zap, BarChart3, Brain, Scale, TrendingUp, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAppStore } from "@/lib/store";
import { ApiClient } from "@/api/client";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';

const CHART_COLORS = ['hsl(18, 55%, 52%)', 'hsl(155, 25%, 45%)', 'hsl(28, 45%, 58%)', 'hsl(25, 60%, 55%)', 'hsl(0, 65%, 50%)'];

interface AttributeMetrics {
  demographic_parity_difference: number;
  demographic_parity_ratio: number;
  equal_opportunity_difference: number;
  privileged_positive_rate: number;
  unprivileged_positive_rate: number;
  flagged: boolean;
}

interface ProxyFeature {
  feature: string;
  protected_attribute: string;
  severity: "high" | "medium" | "low";
  correlation: number;
  p_value: number;
}

interface FeatureImportanceItem {
  feature: string;
  shap_importance: number;
}

type MitigationTechnique = "reweighting" | "feature_removal" | "adversarial";

const mitigationStrategies = [
  { key: "reweighting" as MitigationTechnique, title: "Reweighting", desc: "Adjust sample weights for underrepresented groups.", icon: Scale, color: "bg-success/10 text-success" },
  { key: "feature_removal" as MitigationTechnique, title: "Feature Removal", desc: "Remove proxy features and protected attributes.", icon: Zap, color: "bg-warning/10 text-warning" },
  { key: "adversarial" as MitigationTechnique, title: "Adversarial Debiasing", desc: "Train a fairness-aware model.", icon: Brain, color: "bg-primary/10 text-primary" },
];

export function AnalysisPage() {
  const [searchParams] = useSearchParams();
  const { currentDataset, currentAnalysis, addSimulation } = useAppStore();
  const datasetId = searchParams.get("dataset_id") || currentDataset?.id;
  const auditId = searchParams.get("audit_id");
  const labelColumn = searchParams.get("label") || currentDataset?.targetVariable || "approved";
  const protectedAttrs = (searchParams.get("protected") || currentDataset?.sensitiveAttributes?.join(",") || "gender").split(",").map(a => a.trim()).filter(Boolean);
  const domain = searchParams.get("domain") || "healthcare";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mitigationApplied, setMitigationApplied] = useState<string | null>(null);

  const analysis = currentAnalysis;
  const barData = analysis?.groupMetrics || [];
  const radarData = analysis ? [
    { metric: 'DP', value: analysis.metrics.demographicParity * 100, fullMark: 100 },
    { metric: 'EO', value: analysis.metrics.equalOpportunity * 100, fullMark: 100 },
    { metric: 'DI', value: analysis.metrics.disparateImpact * 100, fullMark: 100 },
    { metric: 'Score', value: analysis.metrics.overallScore, fullMark: 100 },
  ] : [];

  const startAudit = async () => {
    try {
      setLoading(true);
      console.log("Starting audit with:", { datasetId, labelColumn, protectedAttrs, domain });
      setTimeout(() => setLoading(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start audit");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!analysis) {
      void startAudit();
    }
  }, []);

  const applyMitigation = async (technique: MitigationTechnique) => {
    setMitigationApplied(technique);
    if (analysis) {
      addSimulation({
        id: `sim-${Date.now()}`,
        name: technique,
        removedFeatures: technique === 'feature_removal' ? ['location'] : [],
        reweighted: technique === 'reweighting',
        metrics: { 
          demographicParity: 0.85, 
          equalOpportunity: 0.88, 
          disparateImpact: 0.82, 
          overallScore: 85 
        },
        groupMetrics: analysis.groupMetrics,
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Analysis" subtitle="Running fairness audit...">
        <Card className="card-warm p-12 text-center border-border/20 max-w-md mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Loader className="w-10 h-10 text-primary animate-spin" />
          </div>
          <p className="text-xl font-display font-bold mb-2">Analyzing Fairness...</p>
          <p className="text-sm text-muted-foreground">This may take a few moments</p>
        </Card>
      </DashboardLayout>
    );
  }

  if (!analysis) {
    return (
      <DashboardLayout title="Analysis" subtitle="No analysis available">
        <Card className="card-warm border-border/20">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No analysis results available</p>
            <Button onClick={() => startAudit()} className="mt-4 rounded-full">Run Analysis</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Analysis" subtitle={currentDataset?.name || 'Fairness audit results'}>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Score & Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Fairness Score */}
          <Card className={`p-6 border-2 ${analysis.metrics.overallScore >= 80 ? 'bg-success/5 border-success/30' : analysis.metrics.overallScore >= 60 ? 'bg-warning/5 border-warning/30' : 'bg-destructive/5 border-destructive/30'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase text-muted-foreground mb-2">Fairness Score</p>
                <p className="text-6xl font-display font-bold">{analysis.metrics.overallScore}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={analysis.metrics.overallScore >= 80 ? 'bg-success/20 text-success' : analysis.metrics.overallScore >= 60 ? 'bg-warning/20 text-warning' : 'bg-destructive/20 text-destructive'}>
                    {analysis.metrics.overallScore >= 80 ? 'Pass' : analysis.metrics.overallScore >= 60 ? 'Review Needed' : 'High Risk'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">Target: ≥80</span>
                </div>
              </div>
              <Shield className={`w-20 h-20 ${analysis.metrics.overallScore >= 80 ? 'text-success' : analysis.metrics.overallScore >= 60 ? 'text-warning' : 'text-destructive'} opacity-30`} />
            </div>
          </Card>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="card-warm border-border/20">
              <CardHeader>
                <CardTitle className="text-base">Approval by Group</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="group" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                    <Bar dataKey="positiveRate" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="card-warm border-border/20">
              <CardHeader>
                <CardTitle className="text-base">Metrics Radar</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                    <Radar name="Score" dataKey="value" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Feature Importance & Proxy Detection */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="card-warm border-border/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="w-4 h-4" /> Feature Importance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.featureImportance?.map((feat, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{feat.feature}</span>
                      <span className="text-muted-foreground">{(feat.importance * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-muted/30 rounded-full">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${feat.importance * 100}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="card-warm border-warning/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="w-4 h-4 text-warning" /> Proxy Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.featureImportance?.filter(f => f.isProxy).map((feat, i) => (
                  <div key={i} className="p-3 rounded-xl bg-warning/10 border border-warning/20">
                    <div className="flex justify-between">
                      <span className="font-medium">{feat.feature}</span>
                      <Badge variant="outline" className="text-warning">Risk</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Correlates with {analysis.sensitiveAttribute}</p>
                  </div>
                ))}
                {(!analysis.featureImportance?.some(f => f.isProxy)) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No proxy features detected</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar - Metrics & Mitigation */}
        <div className="space-y-6">
          {/* Detailed Metrics */}
          <Card className="card-warm border-border/20">
            <CardHeader>
              <CardTitle className="text-base">Detailed Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Demographic Parity', value: analysis.metrics.demographicParity, target: 0.80 },
                { label: 'Equal Opportunity', value: analysis.metrics.equalOpportunity, target: 0.80 },
                { label: 'Disparate Impact', value: analysis.metrics.disparateImpact, target: 0.80 },
              ].map((m, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">{m.label}</span>
                    <Badge variant={m.value >= m.target ? 'secondary' : 'outline'} className={m.value >= m.target ? 'text-success' : 'text-warning'}>
                      {m.value >= m.target ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                      {m.value.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="h-2 bg-muted/30 rounded-full">
                    <div className={`h-full rounded-full ${m.value >= m.target ? 'bg-success' : 'bg-warning'}`} style={{ width: `${m.value * 100}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Mitigation Strategies */}
          <Card className="card-warm border-border/20">
            <CardHeader>
              <CardTitle className="text-base">Mitigation</CardTitle>
              <CardDescription>Apply debiasing techniques</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {mitigationStrategies.map(s => (
                <Button 
                  key={s.key} 
                  variant={mitigationApplied === s.key ? 'secondary' : 'outline'}
                  className="w-full justify-start gap-3 rounded-xl"
                  onClick={() => applyMitigation(s.key)}
                >
                  <s.icon className="w-4 h-4" />
                  {s.title}
                </Button>
              ))}
              {mitigationApplied && (
                <p className="text-sm text-success flex items-center gap-2"><CheckCircle className="w-4 h-4" /> {mitigationApplied} applied</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}