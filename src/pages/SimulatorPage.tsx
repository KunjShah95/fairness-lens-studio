import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { FairnessGauge } from '@/components/FairnessGauge';
import { useAppStore } from '@/lib/store';
import { runSimulation } from '@/lib/bias-engine';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Eye, Play, RotateCcw } from 'lucide-react';

const SimulatorPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentDataset, currentAnalysis, simulations, addSimulation, clearSimulations } = useAppStore();
  const [removedFeatures, setRemovedFeatures] = useState<string[]>([]);
  const [reweighted, setReweighted] = useState(false);

  if (!currentDataset || !currentAnalysis) {
    return (
      <div className="container py-12 text-center animate-fade-in">
        <p className="text-muted-foreground">Run an analysis first.</p>
        <Button className="mt-4" onClick={() => navigate('/analysis')}>Go to Analysis</Button>
      </div>
    );
  }

  const toggleFeature = (feature: string) => {
    setRemovedFeatures(prev => prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]);
  };

  const handleSimulate = () => {
    const sim = runSimulation(currentDataset, currentAnalysis, removedFeatures, reweighted);
    addSimulation(sim);
  };

  const comparisonData = currentAnalysis.groupMetrics.map(g => {
    const entry: Record<string, any> = { group: g.group, original: g.positiveRate };
    simulations.forEach((sim, i) => {
      const sg = sim.groupMetrics.find(sg => sg.group === g.group);
      entry[`sim_${i}`] = sg?.positiveRate || 0;
    });
    return entry;
  });

  const features = currentDataset.columns.filter(c => c !== currentAnalysis.targetVariable);

  return (
    <div className="container py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <Eye className="w-8 h-8 text-accent" />
          Human Impact Simulator
        </h1>
        <p className="text-muted-foreground mt-1">Simulate "what-if" scenarios and see how changes affect outcomes</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Controls */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Scenario Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground mb-3">Remove Features</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {features.map(f => (
                  <label key={f} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={removedFeatures.includes(f)} onCheckedChange={() => toggleFeature(f)} />
                    <span className={removedFeatures.includes(f) ? 'line-through text-muted-foreground' : 'text-foreground'}>{f}</span>
                    {currentAnalysis.featureImportance.find(fi => fi.feature === f)?.isProxy && (
                      <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">proxy</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm font-medium text-foreground">Apply Reweighting</span>
              <Switch checked={reweighted} onCheckedChange={setReweighted} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSimulate} className="flex-1 gap-2 gradient-primary text-primary-foreground">
                <Play className="w-4 h-4" /> Simulate
              </Button>
              <Button variant="outline" size="icon" onClick={() => { clearSimulations(); setRemovedFeatures([]); setReweighted(false); }}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score comparison */}
          <div className="flex flex-wrap gap-4">
            <Card className="shadow-card flex-1 min-w-[150px] flex flex-col items-center py-6">
              <p className="text-xs text-muted-foreground mb-2">Original</p>
              <FairnessGauge score={currentAnalysis.metrics.overallScore} size={120} />
            </Card>
            {simulations.map((sim, i) => (
              <Card key={sim.id} className="shadow-card flex-1 min-w-[150px] flex flex-col items-center py-6">
                <p className="text-xs text-muted-foreground mb-2 text-center">Scenario {i + 1}</p>
                <FairnessGauge score={sim.metrics.overallScore} size={120} />
                <p className="text-[10px] text-muted-foreground mt-2 text-center max-w-[140px] truncate">{sim.name}</p>
              </Card>
            ))}
          </div>

          {/* Group comparison chart */}
          {simulations.length > 0 && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Group Outcome Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="group" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="original" name="Original" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    {simulations.map((_, i) => (
                      <Bar key={i} dataKey={`sim_${i}`} name={`Scenario ${i + 1}`} fill={`hsl(${217 + i * 45}, 80%, 60%)`} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {simulations.length === 0 && (
            <Card className="shadow-card">
              <CardContent className="py-16 text-center">
                <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                <p className="text-muted-foreground">Configure a scenario and click "Simulate" to see the impact</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulatorPage;
