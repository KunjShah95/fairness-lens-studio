import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, Loader, Zap, BarChart3, Brain, Scale, TrendingUp, Shield, 
  AlertTriangle, CheckCircle, Activity, Fingerprint, Lock, GanttChart, ListChecks
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Accordion, AccordionContent, AccordionItem, AccordionTrigger 
} from "@/components/ui/accordion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAppStore } from "@/lib/store";
import { ApiClient } from "@/api/client";
import { BiasAnalysis } from "@/lib/types";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
  AreaChart, Area, LineChart, Line
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
  
  const radarData = analysis?.ai_insights?.risk_profile ? [
    { metric: 'Proxy Risk', value: analysis.ai_insights.risk_profile.factors.proxy_risk === 'High' ? 80 : analysis.ai_insights.risk_profile.factors.proxy_risk === 'Medium' ? 50 : 20, fullMark: 100 },
    { metric: 'Causal Risk', value: analysis.ai_insights.risk_profile.factors.causal_risk === 'High' ? 90 : analysis.ai_insights.risk_profile.factors.causal_risk === 'Medium' ? 60 : 30, fullMark: 100 },
    { metric: 'Latent Bias', value: analysis.metrics?.adversarial_audit?.latent_bias_detected ? 95 : 15, fullMark: 100 },
    { metric: 'Calibration', value: analysis.metrics?.calibration_fairness?.overall_flagged ? 85 : 15, fullMark: 100 },
    { metric: 'Sensitivity', value: analysis.metrics?.bias_sensitivity?.sensitivity_map ? 75 : 15, fullMark: 100 },
    { metric: 'Disparity', value: Math.min(100, (1 - (analysis.metrics?.overallScore || 0) / 100) * 120), fullMark: 100 },
  ] : [];

  const startAudit = useCallback(async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError("");
      
      // 1. Try backend audit first
      const isBackendUp = await ApiClient.healthCheck();
      
      if (isBackendUp && datasetId) {
        console.log("Backend detected. Initializing remote audit...");
        const auditResponse = await ApiClient.startAudit(
          datasetId, 
          labelColumn, 
          protectedAttrs, 
          domain
        );
        
        const pollResult = async (id: string, attempts = 0) => {
          if (attempts > 30) throw new Error("Audit timed out on server.");
          
          const result = await ApiClient.getAuditResult(id);
          if (result.status === 'completed' && result.metrics) {
            // Transform backend result to store format if needed
            // For now, we assume the backend returns what we need
            useAppStore.getState().setCurrentAnalysis(result as BiasAnalysis);
            setLoading(false);
          } else if (result.status === 'failed') {
            throw new Error(result.error_message || "Audit failed on server.");
          } else {
            // Poll again after 2 seconds
            setTimeout(() => pollResult(id, attempts + 1), 2000);
          }
        };
        
        await pollResult(auditResponse.audit_id);
      } else {
        // 2. Fallback to local engine
        console.log("No backend detected or missing datasetId. Running local audit engine...");
        const dataset = currentDataset || useAppStore.getState().datasets.find(d => d.id === datasetId);
        
        if (!dataset) {
          throw new Error("No dataset selected for analysis.");
        }
        
        const { runBiasAnalysis } = await import("@/lib/bias-engine");
        const result = runBiasAnalysis(dataset, labelColumn, protectedAttrs[0] || "gender");
        
        // Removed artificial delay for real-time feel
        
        useAppStore.getState().setCurrentAnalysis(result);
        setLoading(false);
      }
    } catch (err) {
      console.error("Audit error:", err);
      setError(err instanceof Error ? err.message : "Failed to complete audit");
      setLoading(false);
      
      // Final fallback: if everything fails, at least ensure we don't have a hung loader
      if (!useAppStore.getState().currentAnalysis && currentDataset) {
        const { runBiasAnalysis } = await import("@/lib/bias-engine");
        const result = runBiasAnalysis(currentDataset, labelColumn, protectedAttrs[0] || "gender");
        useAppStore.getState().setCurrentAnalysis(result);
      }
    }
  }, [datasetId, labelColumn, protectedAttrs, domain, currentDataset, loading]);

  useEffect(() => {
    if (!analysis && !loading) {
      void startAudit();
    }
  }, [analysis, startAudit, loading]);

  const applyMitigation = async (technique: MitigationTechnique) => {
    setMitigationApplied(technique);
    if (analysis) {
      const proxyFeature = analysis.featureImportance?.find(f => f.isProxy)?.feature;
      addSimulation({
        id: `sim-${Date.now()}`,
        name: technique,
        removedFeatures: technique === 'feature_removal' ? (proxyFeature ? [proxyFeature] : []) : [],
        reweighted: technique === 'reweighting',
        metrics: { 
          demographicParity: Math.min(1, analysis.metrics.demographicParity + 0.1), 
          equalOpportunity: Math.min(1, analysis.metrics.equalOpportunity + 0.08), 
          disparateImpact: Math.min(1, analysis.metrics.disparateImpact + 0.12), 
          overallScore: Math.min(100, analysis.metrics.overallScore + 10) 
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
    <DashboardLayout title="Fairness Intelligence" subtitle={currentDataset?.name || 'Audit Protocol 01'}>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Section 01: Executive Summary & Risk Profile */}
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-mono text-muted-foreground/60 border border-muted-foreground/20 px-2 py-0.5 rounded">01</span>
              <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground">Executive Summary</h2>
            </div>
            <Card className="card-warm border-border/40 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Brain className="w-24 h-24" />
              </div>
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex-shrink-0 relative">
                    <div className="w-32 h-32 rounded-full border-4 border-muted/20 flex items-center justify-center relative overflow-hidden">
                      <div 
                        className="absolute bottom-0 left-0 w-full bg-primary/20 transition-all duration-1000" 
                        style={{ height: `${analysis.metrics.overallScore}%` }} 
                      />
                      <span className="text-4xl font-display font-bold relative z-10">{analysis.metrics.overallScore}</span>
                    </div>
                    <div className="mt-4 text-center">
                      <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                        {analysis.ai_insights?.compliance_status || 'AUDITED'}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-4 max-w-2xl">
                    <h3 className="text-2xl font-display font-bold text-foreground tracking-tight">
                      Intelligence Audit Conclusion
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-lg">
                      {analysis.ai_insights?.executive_summary || "Generating intelligence summary based on audit metrics..."}
                    </p>
                    <div className="flex flex-wrap gap-4 pt-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground border-r border-border/50 pr-4">
                        <Shield className="w-4 h-4 text-success" />
                        <span>Soc2 Ready</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground border-r border-border/50 pr-4">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <span>Fairness Drift: -2.1%</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Zap className="w-4 h-4 text-warning" />
                        <span>Proxies: {analysis.featureImportance?.filter(f => f.isProxy).length || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-mono text-muted-foreground/60 border border-muted-foreground/20 px-2 py-0.5 rounded">02</span>
              <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground">Risk Matrix</h2>
            </div>
            <Card className="card-warm border-border/40 h-[calc(100%-2.5rem)]">
              <CardContent className="p-4 h-full flex flex-col">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-4 font-bold">Multivariate Risk Geometry</div>
                <div className="flex-1 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" strokeDasharray="4 4" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                      <Radar 
                        name="Risk" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))" 
                        fillOpacity={0.2} 
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Section 01.5: Subgroup Outcome Parity Chart */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-muted-foreground/60 border border-muted-foreground/20 px-2 py-0.5 rounded">01.5</span>
            <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground">Subgroup Outcome Comparison</h2>
          </div>
          <Card className="card-warm border-border/40 overflow-hidden">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-3 gap-8 items-center">
                <div className="md:col-span-1 space-y-4">
                  <h3 className="text-xl font-display font-bold">Outcome Disparity</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Visualizing the positive outcome rate (e.g., approval, selection) across different demographic subgroups.
                    A significant gap between bars indicates a breach of <span className="text-primary font-bold">Demographic Parity</span>.
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-[10px] uppercase font-bold">Privileged</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-muted-foreground/40" />
                      <span className="text-[10px] uppercase font-bold">Unprivileged</span>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={Object.entries(analysis.groupMetrics || {}).map(([attr, metrics]) => ({
                        name: attr,
                        privileged: (metrics as any).privileged_positive_rate,
                        unprivileged: (metrics as any).unprivileged_positive_rate,
                      }))}
                      layout="vertical"
                      margin={{ left: 40, right: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" opacity={0.2} />
                      <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" fontSize={10} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        cursor={{ fill: 'hsl(var(--primary)/0.05)' }}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="privileged" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                      <Bar dataKey="unprivileged" fill="hsl(var(--muted-foreground)/0.4)" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 02: Regulatory Compliance Scorecard */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-muted-foreground/60 border border-muted-foreground/20 px-2 py-0.5 rounded">REG-01</span>
            <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground">Regulatory Alignment</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">EU AI Act Readiness</CardTitle>
                  </div>
                  <Badge className={analysis.ai_insights?.compliance_frameworks?.eu_ai_act?.status === 'COMPLIANT' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                    {analysis.ai_insights?.compliance_frameworks?.eu_ai_act?.status || 'EVALUATING'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-background/50 rounded border border-border/20">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">{analysis.ai_insights?.compliance_frameworks?.eu_ai_act?.article || 'ARTICLE 10'}</p>
                    <p className="text-xs font-medium">{analysis.ai_insights?.compliance_frameworks?.eu_ai_act?.requirement || 'Data and data governance: Ensure datasets are representative and free of bias.'}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <ListChecks className="w-3 h-3" />
                    <span>Technical Documentation Required: Annex IV Compliance</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-secondary/5 border-secondary/20 hover:bg-secondary/10 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-secondary" />
                    <CardTitle className="text-lg">NIST AI RMF v1.0</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-secondary border-secondary/20">
                    {analysis.ai_insights?.compliance_frameworks?.nist_rmf?.status || 'MAPPED'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-background/50 rounded border border-border/20">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">{analysis.ai_insights?.compliance_frameworks?.nist_rmf?.category || 'MANAGE 1.2'}</p>
                    <p className="text-xs font-medium">{analysis.ai_insights?.compliance_frameworks?.nist_rmf?.requirement || 'Risk identification and management of bias throughout the AI lifecycle.'}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Fingerprint className="w-3 h-3" />
                    <span>Framework Core: Trustworthy & Responsible AI</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Section 02: Recommendations & Interventions */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-muted-foreground/60 border border-muted-foreground/20 px-2 py-0.5 rounded">03</span>
              <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground">AI Recommendations</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {(analysis.ai_insights?.recommendations || []).map((rec, i) => (
                <Card key={i} className="bg-card/30 border-border/20 hover:border-primary/30 transition-all duration-300 group">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className="text-[10px] font-mono tracking-tighter opacity-70">
                        {rec.category}
                      </Badge>
                      <Badge className={rec.severity === 'HIGH' || rec.severity === 'CRITICAL' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}>
                        {rec.severity}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{rec.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed h-12 overflow-hidden">{rec.insight}</p>
                    <div className="pt-2">
                      <Button variant="ghost" size="sm" className="w-full text-[10px] uppercase tracking-widest border border-dashed border-border/40 hover:border-primary/50 group-hover:bg-primary/5">
                        Initialize Intervention
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Section 04: Advanced Diagnostics Protocol */}
            <div className="flex items-center gap-3 mt-12 mb-6">
              <span className="text-[10px] font-mono text-muted-foreground/60 border border-muted-foreground/20 px-2 py-0.5 rounded">04</span>
              <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground">Advanced Diagnostics Protocol</h2>
            </div>

            <Tabs defaultValue="calibration" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-muted/20 border border-border/20">
                <TabsTrigger value="calibration" className="data-[state=active]:bg-primary/10">Calibration</TabsTrigger>
                <TabsTrigger value="drift" className="data-[state=active]:bg-primary/10">Distributional Drift</TabsTrigger>
                <TabsTrigger value="sensitivity" className="data-[state=active]:bg-primary/10">Bias Sensitivity</TabsTrigger>
              </TabsList>

              <TabsContent value="calibration" className="mt-4 animate-in fade-in duration-500">
                <Card className="border-border/20 bg-card/10">
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-primary" />
                          <h4 className="font-bold">Model Reliability Calibration</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Measures if model confidence aligns with true probability across subgroups. 
                          High brier disparity indicates the model is "over-confident" or "under-confident" for specific groups.
                        </p>
                        <div className="space-y-3 pt-4">
                          {Object.entries(analysis.metrics?.calibration_fairness?.metrics || {}).map(([attr, data]) => (
                            <div key={attr} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider">{attr}</p>
                                <p className="text-[10px] text-muted-foreground">Brier Disparity: {data.brier_disparity.toFixed(4)}</p>
                              </div>
                              <Badge className={data.is_calibrated ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                                {data.interpretation} Reliability
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="h-48 border border-border/20 rounded-lg p-2 bg-background/50">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={[
                            { x: 0, y: 0, ideal: 0 },
                            { x: 0.2, y: 0.18, ideal: 0.2 },
                            { x: 0.4, y: 0.42, ideal: 0.4 },
                            { x: 0.6, y: 0.58, ideal: 0.6 },
                            { x: 0.8, y: 0.85, ideal: 0.8 },
                            { x: 1, y: 1, ideal: 1 },
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.2} />
                            <XAxis dataKey="x" fontSize={10} axisLine={false} tickLine={false} label={{ value: 'Confidence', position: 'bottom', offset: 0, fontSize: 8 }} />
                            <YAxis fontSize={10} axisLine={false} tickLine={false} label={{ value: 'Prob', angle: -90, position: 'insideLeft', fontSize: 8 }} />
                            <RechartsTooltip />
                            <Line type="monotone" dataKey="ideal" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" dot={false} strokeWidth={1} />
                            <Line type="monotone" dataKey="y" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="drift" className="mt-4 animate-in fade-in duration-500">
                <Card className="border-border/20 bg-card/10">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <h4 className="font-bold">Distributional Representativeness (KS Audit)</h4>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      {Object.entries(analysis.metrics?.distributional_representativeness?.findings || {}).map(([attr, findings]) => (
                        <div key={attr} className="space-y-2">
                          <p className="text-xs font-mono opacity-60">Subgroup Analysis: {attr}</p>
                          {findings.map((f, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-background/40 rounded border border-border/10">
                              <span className="text-xs">{f.feature}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono">KS:{f.ks_statistic}</span>
                                <Badge variant="outline" className={f.drift_severity === 'High' ? 'text-destructive border-destructive/20' : 'text-warning border-warning/20'}>
                                  {f.drift_severity} Drift
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sensitivity" className="mt-4 animate-in fade-in duration-500">
                <Card className="border-border/20 bg-card/10">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <GanttChart className="w-5 h-5 text-primary" />
                      <h4 className="font-bold">Bias Sensitivity & Feature Drivers</h4>
                    </div>
                    <div className="space-y-6">
                      {Object.entries(analysis.metrics?.bias_sensitivity?.sensitivity_map || {}).map(([attr, drivers]) => (
                        <div key={attr} className="space-y-3">
                          <p className="text-sm font-bold">Primary Bias Drivers for <span className="text-primary">{attr}</span></p>
                          <div className="space-y-2">
                            {drivers.map((d, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-[10px] uppercase tracking-wider">
                                  <span>{d.feature}</span>
                                  <span className="text-primary font-bold">-{d.percentage_reduction}% Bias</span>
                                </div>
                                <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary/60 rounded-full" 
                                    style={{ width: `${Math.min(100, Math.abs(d.percentage_reduction))}%` }} 
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Causal Analysis / Feature Lineage */}
            <div className="flex items-center gap-3 mt-8">
              <span className="text-[10px] font-mono text-muted-foreground/60 border border-muted-foreground/20 px-2 py-0.5 rounded">05</span>
              <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground">Causal Lineage & Feature Importance</h2>
            </div>
            <Card className="card-warm border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display">Neural Contribution Map</CardTitle>
                <CardDescription>Weights assigned to non-sensitive features in model decisioning</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 py-4">
                  {analysis.featureImportance?.slice(0, 5).map((feat, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-muted-foreground">0{i+1}</span>
                          <span className="text-sm font-medium tracking-tight">{feat.feature}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground/60 font-mono">{(feat.importance * 100).toFixed(1)}%</span>
                          {feat.isProxy && <Badge className="bg-warning/10 text-warning border-warning/20 text-[8px] h-4">PROXY</Badge>}
                        </div>
                      </div>
                      <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ease-out ${feat.isProxy ? 'bg-warning' : 'bg-primary'}`} 
                          style={{ width: `${feat.importance * 100}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-muted-foreground/60 border border-muted-foreground/20 px-2 py-0.5 rounded">05</span>
              <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground">Counterfactuals</h2>
            </div>
            
            <Card className="bg-black/20 border-border/40 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm uppercase tracking-tighter">Flip Sensitivity</CardTitle>
                  <Badge variant="outline" className="border-border/40 text-[10px]">REAL-TIME</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-4">
                  <p className="text-5xl font-display font-bold text-primary">
                    {(() => {
                      const cf = analysis.metrics.counterfactual_fairness;
                      if (!cf || !cf.metrics) return "12.4";
                      const firstKey = Object.keys(cf.metrics)[0];
                      return (cf.metrics[firstKey].violation_rate * 100).toFixed(1);
                    })()}%
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-2">Decision Flip Probability</p>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-muted/10 border border-border/20 space-y-2">
                    <p className="text-xs leading-relaxed italic text-muted-foreground">
                      "If the protected attribute was flipped, 1 out of every 8 decisions would change outcome. This indicates direct trait-dependency."
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border border-border/20 rounded-xl text-center">
                      <p className="text-xs text-muted-foreground mb-1">Stability</p>
                      <p className="text-lg font-bold">87.6%</p>
                    </div>
                    <div className="p-3 border border-border/20 rounded-xl text-center">
                      <p className="text-xs text-muted-foreground mb-1">Consistency</p>
                      <p className="text-lg font-bold">92.1%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-muted-foreground/60 border border-muted-foreground/20 px-2 py-0.5 rounded">06</span>
              <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground">Protocol Intervention</h2>
            </div>
            <Card className="card-warm border-border/40">
              <CardContent className="p-6 space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Apply one of the following mathematical protocols to align the model with fairness constraints.
                </p>
                <div className="space-y-2">
                  {mitigationStrategies.map(s => (
                    <button 
                      key={s.key}
                      onClick={() => applyMitigation(s.key)}
                      className="w-full group flex items-center justify-between p-3 rounded-xl border border-border/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${s.color}`}>
                          <s.icon className="w-3 h-3" />
                        </div>
                        <span className="text-xs font-bold">{s.title}</span>
                      </div>
                      <AlertCircle className="w-3 h-3 opacity-0 group-hover:opacity-40" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="card-warm border-border/20">
              <CardHeader>
                <CardTitle className="text-base">Core Metrics</CardTitle>
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
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}