import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAppStore } from "@/lib/store";
import { 
  Lightbulb, Users, TrendingUp, ArrowRight, AlertTriangle, CheckCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CHART_COLORS = ['hsl(18, 55%, 52%)', 'hsl(155, 25%, 45%)', 'hsl(28, 45%, 58%)'];

export function SimulatorPage() {
  const { currentAnalysis, simulations, addSimulation } = useAppStore();
  const [simulating, setSimulating] = useState(false);
  const [selectedSim, setSelectedSim] = useState<string | null>(null);
  const [queryInstance, setQueryInstance] = useState({
    age: 35,
    income_level: 5,
    comorbidity_index: 2,
  });

  const handleRunSimulation = async (type: string) => {
    setSimulating(true);
    setTimeout(() => {
      addSimulation({
        id: `sim-${Date.now()}`,
        name: type,
        removedFeatures: type === 'feature_removal' ? ['location'] : [],
        reweighted: type === 'reweighting',
        metrics: { 
          demographicParity: type === 'reweighting' ? 0.88 : 0.82,
          equalOpportunity: type === 'reweighting' ? 0.90 : 0.84,
          disparateImpact: type === 'reweighting' ? 0.85 : 0.80,
          overallScore: type === 'reweighting' ? 88 : 82 
        },
        groupMetrics: currentAnalysis?.groupMetrics || [],
      });
      setSelectedSim(type);
      setSimulating(false);
    }, 1500);
  };

  const simResults = [
    { name: 'Baseline', score: currentAnalysis?.metrics.overallScore || 78, color: CHART_COLORS[2] },
    { name: 'Reweighting', score: simulations[0]?.metrics.overallScore || 85, color: CHART_COLORS[1] },
    { name: 'Feature Removal', score: simulations[1]?.metrics.overallScore || 82, color: CHART_COLORS[0] },
  ];

  return (
    <DashboardLayout title="Simulator" subtitle="What-if scenarios and counterfactuals">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Simulation Comparison */}
          <Card className="card-warm border-border/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Simulation Results
              </CardTitle>
              <CardDescription>Compare fairness improvements across mitigation strategies</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={simResults}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                  <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                    {simResults.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Scenario Selection */}
          <Card className="card-warm border-border/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                Run New Simulation
              </CardTitle>
              <CardDescription>Select a scenario to model</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Button variant="outline" className="p-4 h-auto rounded-xl" onClick={() => handleRunSimulation('reweighting')} disabled={simulating}>
                  <div className="text-center">
                    <p className="font-medium">Reweighting</p>
                    <p className="text-xs text-muted-foreground mt-1">Adjust sample weights</p>
                  </div>
                </Button>
                <Button variant="outline" className="p-4 h-auto rounded-xl" onClick={() => handleRunSimulation('feature_removal')} disabled={simulating}>
                  <div className="text-center">
                    <p className="font-medium">Remove Feature</p>
                    <p className="text-xs text-muted-foreground mt-1">Drop proxy features</p>
                  </div>
                </Button>
                <Button variant="outline" className="p-4 h-auto rounded-xl" onClick={() => handleRunSimulation('adversarial')} disabled={simulating}>
                  <div className="text-center">
                    <p className="font-medium">Adversarial</p>
                    <p className="text-xs text-muted-foreground mt-1">Train debiased model</p>
                  </div>
                </Button>
              </div>
              {selectedSim && (
                <div className="mt-4 p-4 rounded-xl bg-success/10 border border-success/20 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <p className="text-sm"><strong>{selectedSim}</strong> simulation complete</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Counterfactual Input */}
          <Card className="card-warm border-border/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Counterfactual Generator
              </CardTitle>
              <CardDescription>Generate what-if scenarios for individual patients</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm">Age</Label>
                  <Input 
                    type="number" 
                    value={queryInstance.age}
                    onChange={(e) => setQueryInstance({ ...queryInstance, age: Number(e.target.value) })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-sm">Income Level (1-10)</Label>
                  <Input 
                    type="number" 
                    value={queryInstance.income_level}
                    onChange={(e) => setQueryInstance({ ...queryInstance, income_level: Number(e.target.value) })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-sm">Comorbidity Index</Label>
                  <Input 
                    type="number" 
                    value={queryInstance.comorbidity_index}
                    onChange={(e) => setQueryInstance({ ...queryInstance, comorbidity_index: Number(e.target.value) })}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <Button className="rounded-full" disabled>
                Generate Counterfactuals <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Simulations List */}
          <Card className="card-warm border-border/20">
            <CardHeader>
              <CardTitle className="text-base">Saved Simulations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {simulations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No simulations yet</p>
              ) : (
                simulations.map((sim, i) => (
                  <div key={sim.id} className="p-3 rounded-xl border border-border/30">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">{sim.name}</span>
                      <Badge variant={sim.metrics.overallScore >= 80 ? 'secondary' : 'outline'} className={sim.metrics.overallScore >= 80 ? 'text-success' : 'text-warning'}>
                        {sim.metrics.overallScore}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      +{sim.metrics.overallScore - (currentAnalysis?.metrics.overallScore || 78)} pts
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="card-warm border-border/20">
            <CardHeader>
              <CardTitle className="text-base">Impact Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Best Improvement</span>
                <span className="text-sm font-medium text-success">
                  +{simulations.length > 0 ? Math.max(...simulations.map(s => s.metrics.overallScore)) - (currentAnalysis?.metrics.overallScore || 78) : 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Simulations Run</span>
                <span className="text-sm font-medium">{simulations.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Best Strategy</span>
                <span className="text-sm font-medium">
                  {simulations.length > 0 ? simulations.reduce((a, b) => a.metrics.overallScore > b.metrics.overallScore ? a : b).name : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default SimulatorPage;