import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader, TrendingDown, AlertTriangle, Zap, Brain, BarChart3 } from "lucide-react";
import { ApiClient } from "@/api/client";

interface Metrics {
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
  correlation: number;
  p_value: number;
  severity: string;
}

interface IntersectionalResult {
  group: string;
  n: number;
  positive_rate: number;
  disparity_from_average: number;
  flagged: boolean;
}

interface FeatureImportance {
  feature: string;
  shap_importance: number;
  mean_value: number;
  std_value: number;
}

interface CausalAnalysis {
  treatment: string;
  treatment_effect: number | null;
  is_causal: boolean;
  interpretation: string | null;
  error?: string;
}

interface AuditResult {
  audit_id: string;
  status: string;
  created_at: string;
  dataset_id: string;
  metrics: Record<string, Metrics> | null;
  fairness_score: number | null;
  proxy_features: ProxyFeature[] | null;
  intersectional_results: IntersectionalResult[] | null;
  feature_importance: FeatureImportance[] | null;
  causal_analysis: CausalAnalysis | null;
  error_message: string | null;
}

export function AnalysisPage() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset_id");
  const auditId = searchParams.get("audit_id");

  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mitigationLoading, setMitigationLoading] = useState(false);
  const [mitigationApplied, setMitigationApplied] = useState<string | null>(null);

  // Start audit if dataset_id provided and no audit_id
  useEffect(() => {
    if (datasetId && !auditId) {
      startAudit();
    } else if (auditId) {
      pollAuditResults(auditId);
    }
  }, [datasetId, auditId]);

  const startAudit = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.startAudit(
        datasetId!,
        "approved",
        ["gender", "race"],
        "general"
      );
      pollAuditResults(response.audit_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start audit");
      setLoading(false);
    }
  };

  const pollAuditResults = async (id: string) => {
    try {
      const result = await ApiClient.getAuditResult(id);
      setAuditResult(result);

      if (result.status === "queued" || result.status === "running") {
        // Poll again in 2 seconds
        setTimeout(() => pollAuditResults(id), 2000);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch results");
      setLoading(false);
    }
  };

  const applyMitigation = async (technique: "reweighting" | "feature_removal" | "adversarial") => {
    try {
      setMitigationLoading(true);
      await ApiClient.applyMitigation(auditResult!.audit_id, technique);
      setMitigationApplied(technique);
      
      // Refresh results
      await pollAuditResults(auditResult!.audit_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to apply ${technique} mitigation`);
    } finally {
      setMitigationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <Card className="p-12 text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700">Running Bias Audit...</p>
          <p className="text-sm text-gray-500 mt-2">Analyzing data for fairness issues. This may take a minute.</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <Card className="max-w-2xl mx-auto p-6 border-red-200 bg-red-50">
          <div className="flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="font-semibold text-red-900">Error</h2>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!auditResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <Card className="max-w-2xl mx-auto p-6">
          <p className="text-gray-500">No audit results available</p>
        </Card>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "✅ Pass";
    if (score >= 60) return "⚠️ Marginal";
    return "🚨 High Risk";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Audit Results</h1>
          <p className="text-gray-600">
            Audit ID: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{auditResult.audit_id}</code>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(auditResult.created_at).toLocaleString()}
          </p>
        </div>

        {/* Fairness Score Card */}
        {auditResult.fairness_score !== null && (
          <Card className={`p-8 ${getScoreColor(auditResult.fairness_score)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase opacity-75 mb-2">Fairness Score</p>
                <p className="text-6xl font-bold">{auditResult.fairness_score}</p>
                <p className="text-lg mt-2">{getScoreLabel(auditResult.fairness_score)}</p>
              </div>
              <div className="text-7xl opacity-20">
                {auditResult.fairness_score >= 80 ? "✓" : auditResult.fairness_score >= 60 ? "!" : "✕"}
              </div>
            </div>
          </Card>
        )}

        {/* Error Message */}
        {auditResult.error_message && (
          <Card className="p-4 bg-red-50 border border-red-200">
            <p className="text-red-700 text-sm"><strong>Error:</strong> {auditResult.error_message}</p>
          </Card>
        )}

        {/* Status Badge */}
        <div className="flex gap-2 items-center">
          <span className="text-sm font-medium text-gray-600">Status:</span>
          <Badge
            className={
              auditResult.status === "complete"
                ? "bg-green-100 text-green-800"
                : auditResult.status === "failed"
                ? "bg-red-100 text-red-800"
                : "bg-blue-100 text-blue-800"
            }
          >
            {auditResult.status}
          </Badge>
        </div>

        {/* Protected Attribute Metrics */}
        {auditResult.metrics && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Protected Attribute Analysis</h2>
            <div className="grid grid-cols-1 gap-6">
              {Object.entries(auditResult.metrics).map(([attr, metrics]) => (
                <Card key={attr} className="p-6 border-l-4 border-gray-300">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{attr}</h3>
                      {metrics.flagged && (
                        <Badge className="bg-red-100 text-red-800 mt-2">⚠️ Bias Detected</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard
                      label="Demographic Parity"
                      value={metrics.demographic_parity_difference}
                      threshold={0.1}
                      flagged={Math.abs(metrics.demographic_parity_difference) > 0.1}
                      description="Difference in approval rates"
                    />
                    <MetricCard
                      label="Disparate Impact"
                      value={metrics.demographic_parity_ratio}
                      threshold={0.8}
                      flagged={metrics.demographic_parity_ratio < 0.8}
                      description="Selection rate ratio (EEOC: ≥0.80)"
                    />
                    <MetricCard
                      label="Equal Opportunity"
                      value={metrics.equal_opportunity_difference}
                      threshold={0.1}
                      flagged={Math.abs(metrics.equal_opportunity_difference) > 0.1}
                      description="True positive rate difference"
                    />
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-xs font-medium text-blue-600 uppercase mb-2">Approval Rates</p>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-semibold text-blue-900">Privileged:</span>
                          <span className="text-blue-800"> {(metrics.privileged_positive_rate * 100).toFixed(1)}%</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold text-blue-900">Unprivileged:</span>
                          <span className="text-blue-800"> {(metrics.unprivileged_positive_rate * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Proxy Features */}
        {auditResult.proxy_features && auditResult.proxy_features.length > 0 && (
          <Card className="p-6 border-l-4 border-orange-400">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="text-orange-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Proxy Features Detected</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              These features correlate with protected attributes and may smuggle discrimination into the model.
            </p>
            <div className="space-y-3">
              {auditResult.proxy_features.map((proxy, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{proxy.feature}</p>
                      <p className="text-xs text-gray-600">
                        Correlates with {proxy.protected_attribute}
                      </p>
                    </div>
                    <Badge className={proxy.severity === "high" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>
                      {proxy.severity}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                    <span><strong>Correlation:</strong> {Math.abs(proxy.correlation).toFixed(3)}</span>
                    <span><strong>p-value:</strong> {proxy.p_value.toFixed(4)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Intersectional Results */}
        {auditResult.intersectional_results && auditResult.intersectional_results.length > 0 && (
          <Card className="p-6 border-l-4 border-red-400">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-red-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Intersectional Bias</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Combined impact of multiple protected attributes. Worst disparities shown first.
            </p>
            <div className="space-y-3">
              {auditResult.intersectional_results.slice(0, 5).map((result, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    result.flagged
                      ? "bg-red-50 border-red-200"
                      : "bg-green-50 border-green-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-gray-900">{result.group}</p>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">n={result.n}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>
                      <strong>Approval Rate:</strong> {(result.positive_rate * 100).toFixed(1)}%
                    </span>
                    <span
                      className={
                        result.disparity_from_average < 0
                          ? "text-red-600"
                          : "text-green-600"
                      }
                    >
                      <strong>Disparity:</strong> {(result.disparity_from_average * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
              {auditResult.intersectional_results.length > 5 && (
                <p className="text-xs text-gray-500 pt-2">
                  +{auditResult.intersectional_results.length - 5} more groups
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Phase 3: SHAP Feature Importance */}
        {auditResult.feature_importance && auditResult.feature_importance.length > 0 && (
          <Card className="p-6 border-l-4 border-purple-400">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="text-purple-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Feature Importance (SHAP)</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Top features driving model predictions. High SHAP values indicate features with strong influence on outcomes.
            </p>
            <div className="space-y-3">
              {auditResult.feature_importance.map((feature, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">#{idx + 1} {feature.feature}</p>
                      <div className="text-xs text-gray-600 mt-1 space-y-1">
                        <span>Mean value: {feature.mean_value.toFixed(3)} ± {feature.std_value.toFixed(3)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-600">{feature.shap_importance.toFixed(4)}</p>
                      <p className="text-xs text-gray-600">SHAP importance</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, (feature.shap_importance / Math.max(...auditResult.feature_importance.map(f => f.shap_importance))) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Phase 3: DoWhy Causal Analysis */}
        {auditResult.causal_analysis && !auditResult.causal_analysis.error && (
          <Card className={`p-6 border-l-4 ${auditResult.causal_analysis.is_causal ? "border-red-400" : "border-green-400"}`}>
            <div className="flex items-center gap-2 mb-4">
              <Brain className={auditResult.causal_analysis.is_causal ? "text-red-600" : "text-green-600"} size={24} />
              <h2 className="text-xl font-bold text-gray-900">Causal Fairness Analysis</h2>
            </div>
            <div className={`p-4 rounded-lg ${auditResult.causal_analysis.is_causal ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">Treatment Variable</p>
                  <p className="text-lg text-gray-700">{auditResult.causal_analysis.treatment}</p>
                </div>
                {auditResult.causal_analysis.treatment_effect !== null && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Causal Effect</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {(auditResult.causal_analysis.treatment_effect * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Status</p>
                      <Badge className={auditResult.causal_analysis.is_causal ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                        {auditResult.causal_analysis.is_causal ? "⚠️ Significant" : "✓ Negligible"}
                      </Badge>
                    </div>
                  </div>
                )}
                {auditResult.causal_analysis.interpretation && (
                  <div className="pt-2 border-t border-gray-300">
                    <p className="text-sm text-gray-700">{auditResult.causal_analysis.interpretation}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Phase 4: Mitigation Strategies */}
        <Card className="p-6 border-l-4 border-indigo-400">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Mitigation Strategies</h2>
          <p className="text-sm text-gray-600 mb-6">
            Apply one of three debiasing techniques to improve fairness. Each has different trade-offs between invasiveness and effectiveness.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Reweighting */}
            <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50">
              <h3 className="font-semibold text-gray-900 mb-2">⚖️ Reweighting</h3>
              <p className="text-xs text-gray-600 mb-3">
                Adjust sample weights so underrepresented groups have more training influence.
              </p>
              <div className="text-xs text-gray-700 space-y-1 mb-4">
                <p><strong>Invasiveness:</strong> ⭐☆☆ Low</p>
                <p><strong>Effectiveness:</strong> ⭐⭐☆ Moderate</p>
                <p><strong>Trade-off:</strong> ~2% accuracy loss</p>
              </div>
              <button
                onClick={() => applyMitigation("reweighting")}
                disabled={mitigationLoading || mitigationApplied === "reweighting"}
                className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {mitigationLoading && mitigationApplied === "reweighting" ? "Applying..." : "Apply Reweighting"}
              </button>
            </div>

            {/* Feature Removal */}
            <div className="p-4 rounded-lg border-2 border-amber-200 bg-amber-50">
              <h3 className="font-semibold text-gray-900 mb-2">🔨 Feature Removal</h3>
              <p className="text-xs text-gray-600 mb-3">
                Remove proxy features and protected attributes from the dataset.
              </p>
              <div className="text-xs text-gray-700 space-y-1 mb-4">
                <p><strong>Invasiveness:</strong> ⭐⭐☆ Medium</p>
                <p><strong>Effectiveness:</strong> ⭐⭐⭐ High</p>
                <p><strong>Trade-off:</strong> ~5% accuracy loss</p>
              </div>
              <button
                onClick={() => applyMitigation("feature_removal")}
                disabled={mitigationLoading || mitigationApplied === "feature_removal"}
                className="w-full px-3 py-2 bg-amber-600 text-white rounded text-sm font-medium hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {mitigationLoading && mitigationApplied === "feature_removal" ? "Applying..." : "Apply Feature Removal"}
              </button>
            </div>

            {/* Adversarial Debiasing */}
            <div className="p-4 rounded-lg border-2 border-purple-200 bg-purple-50">
              <h3 className="font-semibold text-gray-900 mb-2">🧠 Adversarial Debiasing</h3>
              <p className="text-xs text-gray-600 mb-3">
                Train a fairness-aware model using adversarial loss. Most powerful approach.
              </p>
              <div className="text-xs text-gray-700 space-y-1 mb-4">
                <p><strong>Invasiveness:</strong> ⭐⭐⭐ High</p>
                <p><strong>Effectiveness:</strong> ⭐⭐⭐ Highest</p>
                <p><strong>Trade-off:</strong> ~3% accuracy loss</p>
              </div>
              <button
                onClick={() => applyMitigation("adversarial")}
                disabled={mitigationLoading || mitigationApplied === "adversarial"}
                className="w-full px-3 py-2 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {mitigationLoading && mitigationApplied === "adversarial" ? "Applying..." : "Apply Adversarial"}
              </button>
            </div>
          </div>

          {mitigationApplied && (
            <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-200">
              <p className="text-sm text-indigo-900">
                ✅ <strong>{mitigationApplied.charAt(0).toUpperCase() + mitigationApplied.slice(1)}</strong> mitigation applied successfully!
              </p>
              <p className="text-xs text-indigo-700 mt-1">
                Review the before/after comparison above to assess fairness improvements and accuracy trade-offs.
              </p>
            </div>
          )}
        </Card>

        {/* Summary & Recommendations */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Summary & Next Steps</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            {auditResult.fairness_score !== null && (
              <>
                {auditResult.fairness_score < 60 && (
                  <li className="flex gap-2">
                    <span>🔴</span>
                    <span><strong>High Risk:</strong> Significant bias detected. Consider implementing mitigation strategies (Phase 4).</span>
                  </li>
                )}
                {auditResult.fairness_score >= 60 && auditResult.fairness_score < 80 && (
                  <li className="flex gap-2">
                    <span>🟡</span>
                    <span><strong>Review Needed:</strong> Moderate bias detected. Review and consider mitigation options.</span>
                  </li>
                )}
                {auditResult.fairness_score >= 80 && (
                  <li className="flex gap-2">
                    <span>🟢</span>
                    <span><strong>Good:</strong> Fairness metrics are acceptable. Continue monitoring for drift.</span>
                  </li>
                )}
              </>
            )}
            {(auditResult.proxy_features?.length ?? 0) > 0 && (
              <li className="flex gap-2">
                <span>⚙️</span>
                <span><strong>Proxy Features:</strong> Found {auditResult.proxy_features?.length} features that may proxy for protected attributes. Consider feature removal or transformation.</span>
              </li>
            )}
            {(auditResult.intersectional_results?.length ?? 0) > 0 && (
              <li className="flex gap-2">
                <span>🔄</span>
                <span><strong>Intersectional Groups:</strong> Some demographic combinations show worse outcomes. Further investigation recommended.</span>
              </li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number | null;
  threshold: number;
  flagged: boolean;
  description: string;
}

function MetricCard({ label, value, flagged, description }: MetricCardProps) {
  return (
    <div className={`p-4 rounded-lg ${flagged ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
      <p className="text-xs font-semibold uppercase mb-1">{label}</p>
      <p className={`text-2xl font-bold ${flagged ? "text-red-600" : "text-green-600"}`}>
        {value !== null ? value.toFixed(3) : "N/A"}
      </p>
      <p className="text-xs text-gray-600 mt-1">{description}</p>
      {flagged && <p className="text-xs text-red-600 mt-1 font-semibold">⚠️ Concern</p>}
    </div>
  );
}
