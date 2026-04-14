import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader, TrendingUp, Zap, Users, Lightbulb, ArrowRight } from "lucide-react";
import { ApiClient } from "@/api/client";
import type { JsonValue, MitigationType } from "@/lib/types";

interface Counterfactual {
  id: number;
  changes: Record<string, { from: number; to: number; change: number }>;
  total_distance: number;
  feasibility_score: number;
  profile: Record<string, JsonValue>;
}

interface PopulationImpactGroup {
  group_value: number;
  size: number;
  approval_rate_before: number;
  approval_rate_after: number;
  approved_before: number;
  approved_after: number;
  newly_approved: number;
  percentage_improvement: number;
}

interface ScenarioResult {
  scenario: { type: string; params: Record<string, JsonValue> };
  before: {
    overall_approval_rate: number;
    feature_count: number;
    by_group: Record<string, number>;
  };
  after: {
    overall_approval_rate: number;
    feature_count: number;
    by_group: Record<string, number>;
  };
  improvement: number;
  recommendation: string | null;
}

interface PopulationImpactByAttribute {
  groups: PopulationImpactGroup[];
}

interface PopulationImpactResult {
  total_population?: number;
  total_newly_approved?: number;
  impact_percentage?: number;
  by_attribute?: Record<string, PopulationImpactByAttribute>;
  error?: string;
}

export function SimulatorPage() {
  const [searchParams] = useSearchParams();
  const auditId = searchParams.get("audit_id");

  const [counterfactualsLoading, setCounterfactualsLoading] = useState(false);
  const [counterfactuals, setCounterfactuals] = useState<Counterfactual[] | null>(null);
  const [populationLoading, setPopulationLoading] = useState(false);
  const [populationImpact, setPopulationImpact] = useState<PopulationImpactResult | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioResults, setScenarioResults] = useState<ScenarioResult | null>(null);
  const [error, setError] = useState("");

  const [queryInstance, setQueryInstance] = useState<Record<string, JsonValue>>({
    age: 35,
    symptom_severity: 7,
    comorbidity_index: 2,
    prior_visit_count: 3,
  });

  const generateCounterfactuals = async () => {
    try {
      setCounterfactualsLoading(true);
      const result = await ApiClient.generateCounterfactuals(auditId!, queryInstance);
      setCounterfactuals(result.counterfactuals || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate counterfactuals");
    } finally {
      setCounterfactualsLoading(false);
    }
  };

  const estimatePopulationImpact = async (intervention: MitigationType = "reweighting") => {
    try {
      setPopulationLoading(true);
      const result = await ApiClient.getPopulationImpact(auditId!, intervention);
      setPopulationImpact(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to estimate population impact");
    } finally {
      setPopulationLoading(false);
    }
  };

  const runScenario = async (scenarioType: string, params: Record<string, JsonValue>) => {
    try {
      setScenarioLoading(true);
      const result = await ApiClient.modelScenario(auditId!, scenarioType, params);
      setScenarioResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to model scenario");
    } finally {
      setScenarioLoading(false);
    }
  };

  if (!auditId) {
    return (
      <div className="min-h-screen">
        <div className="fixed inset-0 -z-10 bg-background" />
        <Card className="card-warm max-w-2xl mx-auto p-6 border-border/30">
          <AlertCircle className="text-destructive mb-4 w-8 h-8" />
          <p className="text-foreground font-display font-semibold">No audit selected</p>
          <p className="text-sm text-gray-500 mt-2">Go back to the analysis page and select an audit to use the simulator.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Fairness Simulator</h1>
          <p className="text-gray-600">
            Explore counterfactual care scenarios, estimate population impact, and model what-if interventions.
          </p>
        </div>

        {error && (
          <Card className="p-4 bg-red-50 border border-red-200">
            <p className="text-red-700 text-sm">
              <strong>Error:</strong> {error}
            </p>
          </Card>
        )}

        {/* Section 1: Counterfactual Explanations */}
        <Card className="p-6 border-l-4 border-blue-400">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="text-blue-600" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">Counterfactual Explanations</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Discover the minimum feature changes needed to move a patient from deferred care to prioritized care. Enter a patient profile and explore alternative scenarios.
          </p>

          {/* Query Instance Input */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="font-semibold text-gray-900 mb-3">Patient Profile</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
{Object.entries(queryInstance).map(([key, value]) => (
                <div key={key}>
                  <label className='text-xs font-medium text-gray-700 uppercase'>{key}</label>
                  <input
                    type='number'
                    value={value as number}
                    onChange={(e) =>
                      setQueryInstance({ ...queryInstance, [key]: Number(e.target.value) })
                    }
                    className='w-full px-2 py-1 border border-gray-300 rounded mt-1 text-sm'
                  />
                </div>
              ))}
            </div>
            <button
              onClick={generateCounterfactuals}
              disabled={counterfactualsLoading}
              className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:bg-gray-400"
            >
              {counterfactualsLoading ? (
                <>
                  <Loader className="inline mr-2 animate-spin" size={16} />
                  Generating...
                </>
              ) : (
                "Generate Counterfactuals"
              )}
            </button>
          </div>

          {/* Counterfactuals Display */}
          {counterfactuals && counterfactuals.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-900">
                Generated {counterfactuals.length} Counterfactual Scenarios
              </p>
              {counterfactuals.map((cf) => (
                <div key={cf.id} className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">Scenario {cf.id}</p>
                      <p className="text-xs text-gray-600">
                        Distance: {cf.total_distance.toFixed(2)} | Feasibility: {(cf.feasibility_score * 100).toFixed(0)}%
                      </p>
                    </div>
                    <Badge className={cf.feasibility_score > 0.7 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                      {cf.feasibility_score > 0.7 ? "✓ Feasible" : "⚠️ Harder"}
                    </Badge>
                  </div>

                  {Object.keys(cf.changes).length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-700 uppercase">Changes Needed:</p>
                      {Object.entries(cf.changes).map(([feature, change]) => (
                        <div key={feature} className="text-xs bg-white p-2 rounded border border-blue-100">
                          <span className="font-semibold">{feature}:</span>
                          <span className="ml-1">{change.from.toFixed(2)} → {change.to.toFixed(2)}</span>
                          <span className={change.change > 0 ? "text-green-600" : "text-red-600"}>
                            {" "}
                            ({change.change > 0 ? "+" : ""}{change.change.toFixed(2)})
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600">No changes needed (already prioritized)</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Section 2: Population Impact */}
        <Card className="p-6 border-l-4 border-green-400">
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-green-600" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">Population Impact Estimates</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Estimate how many individuals would benefit from each fairness intervention across demographic groups.
          </p>

          {/* Impact Intervention Selector */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {(["reweighting", "feature_removal", "adversarial"] as MitigationType[]).map((intervention) => (
              <button
                key={intervention}
                onClick={() => estimatePopulationImpact(intervention)}
                disabled={populationLoading}
                className="px-4 py-2 rounded border-2 border-green-300 bg-green-50 text-green-900 font-medium hover:bg-green-100 disabled:bg-gray-400 disabled:border-gray-400 disabled:text-gray-600"
              >
                {intervention.replace("_", " ").toUpperCase()}
              </button>
            ))}
          </div>

          {/* Population Impact Results */}
          {populationImpact && !populationImpact.error && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">Total Population</p>
                    <p className="text-2xl font-bold text-green-600">{populationImpact.total_population?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">Newly Prioritized</p>
                    <p className="text-2xl font-bold text-green-600">+{populationImpact.total_newly_approved?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-medium">Impact %</p>
                    <p className="text-2xl font-bold text-green-600">{populationImpact.impact_percentage}%</p>
                  </div>
                </div>
              </div>

              {/* By Attribute Breakdown */}
              {populationImpact.by_attribute && (
                <div className="space-y-4">
                  {Object.entries(populationImpact.by_attribute).map(([attr, data]) => (
                    <div key={attr} className="p-4 rounded-lg border border-green-200">
                      <p className="font-semibold text-gray-900 mb-3">{attr}</p>
                      <div className="space-y-2">
                        {data.groups.map((group: PopulationImpactGroup, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-sm p-2 bg-green-50 rounded">
                            <span>Group {group.group_value} ({group.size} people)</span>
                            <div className="text-right">
                              <p className="text-xs text-gray-600">
                                {(group.approval_rate_before * 100).toFixed(0)}% → {(group.approval_rate_after * 100).toFixed(0)}%
                              </p>
                              <p className="font-semibold text-green-600">+{group.newly_approved} prioritized</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Section 3: What-If Scenarios */}
        <Card className="p-6 border-l-4 border-purple-400">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-purple-600" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">What-If Scenarios</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Model the impact of different interventions and strategies on fairness metrics.
          </p>

          {/* Scenario Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Remove Feature */}
            <button
              onClick={() => runScenario("remove_feature", { feature: "postal_code" })}
              disabled={scenarioLoading}
              className="p-4 rounded-lg border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 disabled:bg-gray-200 text-left"
            >
              <p className="font-semibold text-gray-900 text-sm">Remove Proxy Feature</p>
              <p className="text-xs text-gray-600 mt-1">Remove postal_code (known access proxy)</p>
            </button>

            {/* Balance Groups */}
            <button
              onClick={() => runScenario("balance_groups", { attribute: "gender" })}
              disabled={scenarioLoading}
              className="p-4 rounded-lg border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 disabled:bg-gray-200 text-left"
            >
              <p className="font-semibold text-gray-900 text-sm">Balance By Gender</p>
              <p className="text-xs text-gray-600 mt-1">Equalize outcomes across groups</p>
            </button>

            {/* Change Threshold */}
            <button
              onClick={() => runScenario("threshold_change", { new_threshold: 0.6 })}
              disabled={scenarioLoading}
              className="p-4 rounded-lg border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 disabled:bg-gray-200 text-left"
            >
              <p className="font-semibold text-gray-900 text-sm">Lower Prioritization Threshold</p>
              <p className="text-xs text-gray-600 mt-1">More inclusive clinical decision boundary</p>
            </button>
          </div>

          {/* Scenario Results */}
          {scenarioResults && !scenarioResults.improvement && (
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <p className="font-semibold text-gray-900 mb-3">{scenarioResults.scenario.type}</p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase font-medium mb-1">Before</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {(scenarioResults.before.overall_approval_rate * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-medium mb-1">After</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {(scenarioResults.after.overall_approval_rate * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {scenarioResults.recommendation && (
                <div className="p-3 rounded-lg bg-white border border-purple-200">
                  <p className="text-sm text-gray-900">{scenarioResults.recommendation}</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default SimulatorPage;
