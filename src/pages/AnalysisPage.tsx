import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader, Zap, BarChart3, Brain, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiClient } from "@/api/client";

const CHART_COLORS = ['hsl(15, 55%, 54%)', 'hsl(150, 20%, 46%)', 'hsl(35, 45%, 60%)', 'hsl(25, 40%, 65%)', 'hsl(0, 65%, 50%)'];

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
  severity: "high" | "medium" | "low" | string;
  correlation: number;
  p_value: number;
}

interface FeatureImportanceItem {
  feature: string;
  shap_importance: number;
}

type MitigationTechnique = "reweighting" | "feature_removal" | "adversarial";

interface MitigationStrategy {
  key: MitigationTechnique;
  title: string;
  desc: string;
  icon: typeof Scale;
  color: string;
}

interface AuditResult {
  audit_id: string;
  status: string;
  created_at: string;
  dataset_id: string;
  metrics: Record<string, AttributeMetrics> | null;
  fairness_score: number | null;
  proxy_features: ProxyFeature[] | null;
  intersectional_results: unknown[] | null;
  feature_importance: FeatureImportanceItem[] | null;
  causal_analysis: Record<string, unknown> | null;
  error_message: string | null;
}

function MetricCard({ label, value, flagged, description }: { label: string; value: number | null; flagged: boolean; description: string; threshold?: number }) {
  return (
    <div className={`p-4 rounded-2xl ${flagged ? 'bg-destructive/10 border border-destructive/20' : 'bg-success/10 border border-success/20'}`}>
      <p className="text-xs font-semibold uppercase mb-1 text-muted-foreground">{label}</p>
      <p className={`text-2xl font-display font-bold ${flagged ? 'text-destructive' : 'text-success'}`}>
        {value !== null ? value.toFixed(3) : "N/A"}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
      {flagged && <p className="text-xs text-destructive font-semibold mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Concern</p>}
    </div>
  );
}

export function AnalysisPage() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset_id");
  const auditId = searchParams.get("audit_id");
  const labelColumn = searchParams.get("label") || "triage_priority";
  const protectedAttrs = (searchParams.get("protected") || "gender,age_group").split(",").map(a => a.trim()).filter(Boolean);
  const domain = searchParams.get("domain") || "healthcare";

  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mitigationLoading, setMitigationLoading] = useState(false);
  const [mitigationApplied, setMitigationApplied] = useState<string | null>(null);

  const pollAuditResults = useCallback(async (id: string) => {
    try {
      const result = await ApiClient.getAuditResult(id);
      if (result.status === 'completed' || result.status === 'failed') {
        setAuditResult(result);
        setLoading(false);
      } else {
        setTimeout(() => void pollAuditResults(id), 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch audit results");
      setLoading(false);
    }
  }, []);

  const fetchAuditInitial = useCallback(async (id: string) => {
    try {
      const result = await ApiClient.getAuditResult(id);
      setAuditResult(result);
      if (result.status === "queued" || result.status === "running") {
        setTimeout(() => void pollAuditResults(id), 2000);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch results");
      setLoading(false);
    }
  }, [pollAuditResults]);

  const startAudit = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ApiClient.startAudit(datasetId!, labelColumn, protectedAttrs, domain);
      fetchAuditInitial(response.audit_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start audit");
      setLoading(false);
    }
  }, [datasetId, labelColumn, protectedAttrs, domain, fetchAuditInitial]);

  useEffect(() => {
    if (datasetId && !auditId) {
      void startAudit();
    } else if (auditId) {
      void pollAuditResults(auditId);
    }
  }, [datasetId, auditId, startAudit, pollAuditResults]);

  const applyMitigation = async (technique: MitigationTechnique) => {
    try {
      setMitigationLoading(true);
      await ApiClient.applyMitigation(auditResult!.audit_id, technique);
      setMitigationApplied(technique);
      await pollAuditResults(auditResult!.audit_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to apply ${technique}`);
    } finally {
      setMitigationLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-success/10 border-success/30";
    if (score >= 60) return "bg-warning/10 border-warning/30";
    return "bg-destructive/10 border-destructive/30";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Pass";
    if (score >= 60) return "Marginal";
    return "High Risk";
  };

  const mitigationStrategies: MitigationStrategy[] = [
    { key: "reweighting", title: "Reweighting", desc: "Adjust sample weights for underrepresented groups.", icon: Scale, color: "bg-success/10 text-success" },
    { key: "feature_removal", title: "Feature Removal", desc: "Remove proxy features and protected attributes.", icon: Zap, color: "bg-warning/10 text-warning" },
    { key: "adversarial", title: "Adversarial Debiasing", desc: "Train a fairness-aware model.", icon: Brain, color: "bg-primary/10 text-primary" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="card-warm p-12 text-center border-border/30 max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Loader className="w-10 h-10 text-primary animate-spin" />
          </div>
          <p className="text-xl font-display font-bold text-foreground mb-2">Running Fairness Audit...</p>
          <p className="text-sm text-muted-foreground">Analyzing care decisions for bias and safety risks.</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-12">
        <Card className="card-warm border-destructive/30 max-w-2xl mx-auto">
          <CardContent className="p-6 flex gap-4">
            <AlertCircle className="text-destructive w-6 h-6 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-foreground">Error</h2>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!auditResult) {
    return <div className="container py-12"><p className="text-muted-foreground">No audit results available</p></div>;
  }

  return (
    <div className="container py-8">
      <div className="fixed inset-0 -z-10 bg-background" />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Audit Results</h1>
        <p className="text-sm text-muted-foreground">
          Audit completed {new Date(auditResult.created_at).toLocaleString()}
        </p>
        <Badge className="mt-2 rounded-full">{auditResult.status}</Badge>
      </div>

      {/* Fairness Score */}
      {auditResult.fairness_score !== null && (
        <Card className={`p-8 mb-8 ${getScoreColor(auditResult.fairness_score)} border-2`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-muted-foreground mb-2">Fairness Score</p>
              <p className="text-7xl font-display font-bold text-foreground">{auditResult.fairness_score}</p>
              <p className="text-lg font-medium text-foreground mt-2">{getScoreLabel(auditResult.fairness_score)}</p>
            </div>
            <Scale className="w-24 h-24 text-muted-foreground/20" />
          </div>
        </Card>
      )}

      {/* Error Message */}
      {auditResult.error_message && (
        <Card className="card-warm border-destructive/30 mb-8">
          <CardContent className="p-4">
            <p className="text-destructive text-sm"><strong>Error:</strong> {auditResult.error_message}</p>
          </CardContent>
        </Card>
      )}

      {/* Protected Attribute Metrics */}
      {auditResult.metrics && (
        <div className="mb-8">
          <h2 className="text-xl font-display font-bold text-foreground mb-4">Protected Attribute Analysis</h2>
          <div className="space-y-6">
            {Object.entries(auditResult.metrics).map(([attr, metrics]) => (
              <Card key={attr} className="card-warm border-border/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-display capitalize">{attr}</CardTitle>
                    {metrics.flagged && <Badge variant="destructive" className="rounded-full">Bias Detected</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard label="Demographic Parity" value={metrics.demographic_parity_difference} threshold={0.1} flagged={Math.abs(metrics.demographic_parity_difference) > 0.1} description="Difference in care access rates" />
                    <MetricCard label="Disparate Impact" value={metrics.demographic_parity_ratio} threshold={0.8} flagged={metrics.demographic_parity_ratio < 0.8} description="Selection rate ratio (EEOC: ≥0.80)" />
                    <MetricCard label="Equal Opportunity" value={metrics.equal_opportunity_difference} threshold={0.1} flagged={Math.abs(metrics.equal_opportunity_difference) > 0.1} description="True positive rate difference" />
                    <div className="p-4 rounded-2xl bg-secondary/10 border border-secondary/20">
                      <p className="text-xs font-semibold uppercase mb-2 text-muted-foreground">Care Access Rates</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Privileged:</span>
                          <span className="font-semibold text-foreground">{(metrics.privileged_positive_rate * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Unprivileged:</span>
                          <span className="font-semibold text-foreground">{(metrics.unprivileged_positive_rate * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Proxy Features */}
      {auditResult.proxy_features && auditResult.proxy_features.length > 0 && (
        <Card className="card-warm border-warning/30 mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-warning" />
              <CardTitle className="text-lg font-display">Proxy Features Detected</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Features that correlate with protected attributes.</p>
            <div className="space-y-3">
              {auditResult.proxy_features.map((proxy, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-warning/10 border border-warning/20">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{proxy.feature}</p>
                      <p className="text-xs text-muted-foreground">Correlates with {proxy.protected_attribute}</p>
                    </div>
                    <Badge variant={proxy.severity === "high" ? "destructive" : "secondary"} className="rounded-full">
                      {proxy.severity}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span><strong>Correlation:</strong> {Math.abs(proxy.correlation).toFixed(3)}</span>
                    <span><strong>p-value:</strong> {proxy.p_value.toFixed(4)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Importance */}
      {auditResult.feature_importance && auditResult.feature_importance.length > 0 && (
        <Card className="card-warm border-border/30 mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg font-display">Feature Importance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditResult.feature_importance.map((feature, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-muted/30">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-foreground">#{idx + 1} {feature.feature}</p>
                    <p className="text-lg font-display font-bold text-primary">{feature.shap_importance.toFixed(4)}</p>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                      {(() => {
                        const maxVal = Math.max(...auditResult.feature_importance.map((f) => f.shap_importance));
                        return <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min(100, (feature.shap_importance / maxVal) * 100)}%` }} />;
                      })()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mitigation Strategies */}
      <div className="mb-8">
        <h2 className="text-xl font-display font-bold text-foreground mb-4">Mitigation Strategies</h2>
        <p className="text-sm text-muted-foreground mb-6">Apply debiasing techniques to improve fairness.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mitigationStrategies.map(item => (
            <Card key={item.key} className="card-warm-hover border-border/30">
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center mb-4`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground mb-4">{item.desc}</p>
                <Button onClick={() => applyMitigation(item.key)} disabled={mitigationLoading} className="w-full rounded-full" variant={mitigationApplied === item.key ? "secondary" : "default"}>
                  {mitigationLoading && mitigationApplied === item.key ? "Applying..." : "Apply"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {mitigationApplied && (
          <Card className="card-warm border-success/30 mt-4">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="text-success w-5 h-5" />
              <p className="text-sm text-foreground"><strong>{mitigationApplied}</strong> applied successfully!</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary */}
      <Card className="card-warm border-border/30">
        <CardHeader>
          <CardTitle className="text-lg font-display">Summary & Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {auditResult.fairness_score !== null && (
              <>
                {auditResult.fairness_score < 60 && <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-destructive" />High Risk — Consider mitigation</li>}
                {auditResult.fairness_score >= 60 && auditResult.fairness_score < 80 && <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-warning" />Review Needed — Moderate bias detected</li>}
                {auditResult.fairness_score >= 80 && <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-success" />Fairness metrics acceptable</li>}
              </>
            )}
            {(auditResult.proxy_features?.length ?? 0) > 0 && (
              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-warning" />Found {auditResult.proxy_features?.length} proxy features</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}