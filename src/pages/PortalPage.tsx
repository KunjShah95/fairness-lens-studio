import { useState } from 'react';
import { ArrowRight, CheckCircle2, AlertCircle, Send, Scale, Shield, ClipboardCheck, MessageSquare, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ApiClient } from '@/api/client';
import { ThemeToggle } from '@/components/ThemeToggle';

interface KeyFactor {
  feature: string;
  importance: string;
  your_value: string | number;
}

interface BiasRiskFactor {
  feature: string;
  note: string;
}

interface CounterfactualPath {
  scenario: string;
  changes: string[];
  outcome: string;
  feasibility: string;
}

interface PortalExplanationResult {
  valid?: boolean;
  error?: string;
  decision_summary?: string;
  key_factors?: KeyFactor[];
  bias_risk_factors?: BiasRiskFactor[];
  counterfactual_paths?: CounterfactualPath[];
}

interface PortalState {
  step: 'input' | 'explanation' | 'appeal' | 'confirmation';
  auditId: string;
  profile: Record<string, number>;
  explanationResult: PortalExplanationResult | null;
  loading: boolean;
  error: string | null;
  appealSubmitted: boolean;
  appealId: string | null;
}

export default function PortalPage() {
  const [state, setState] = useState<PortalState>({
    step: 'input',
    auditId: '',
    profile: { age: 0, symptom_severity: 0, comorbidity_index: 0, prior_visit_count: 0 },
    explanationResult: null,
    loading: false,
    error: null,
    appealSubmitted: false,
    appealId: null,
  });

  const [appealForm, setAppealForm] = useState({ email: '', reason: '' });

  const handleProfileChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setState(prev => ({ ...prev, profile: { ...prev.profile, [field]: numValue } }));
  };

  const handleAuditIdChange = (value: string) => {
    setState(prev => ({ ...prev, auditId: value }));
  };

  const handleGetExplanation = async () => {
    if (!state.auditId) {
      setState(prev => ({ ...prev, error: 'Please enter an audit ID' }));
      return;
    }
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = (await ApiClient.portalExplain(state.auditId, state.profile)) as PortalExplanationResult;
      setState(prev => ({
        ...prev,
        explanationResult: result,
        step: result.valid ? 'explanation' : 'input',
        error: result.error || null,
        loading: false,
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get explanation';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
    }
  };

  const handleStartAppeal = () => {
    setState(prev => ({ ...prev, step: 'appeal', error: null }));
  };

  const handleSubmitAppeal = async () => {
    if (!appealForm.email || !appealForm.reason) {
      setState(prev => ({ ...prev, error: 'Please fill in all appeal fields' }));
      return;
    }
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await ApiClient.submitAppeal(state.auditId, appealForm.email, appealForm.reason);
      setState(prev => ({
        ...prev,
        appealSubmitted: result.success,
        appealId: result.appeal_id,
        step: 'confirmation',
        loading: false,
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit appeal';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
    }
  };

  const handleReset = () => {
    setState(prev => ({
      ...prev,
      step: 'input',
      auditId: '',
      profile: { age: 0, symptom_severity: 0, comorbidity_index: 0, prior_visit_count: 0 },
      explanationResult: null,
      error: null,
      appealSubmitted: false,
      appealId: null,
    }));
    setAppealForm({ email: '', reason: '' });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 -z-10 bg-background" />
      
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md border-b border-border/20 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Appeal Portal</h1>
              <p className="text-xs text-muted-foreground">Patient Transparency System</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Step: Input */}
        {state.step === 'input' && (
          <div className="grid lg:grid-cols-[1fr_300px] gap-12">
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-display font-bold text-foreground mb-4">
                  Transparency is the foundation of trust.
                </h2>
                <p className="text-muted-foreground">
                  Every care decision is auditable. Enter your profile to reconstruct the logic used in your case.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="auditId">Audit Reference</Label>
                  <Input
                    id="auditId"
                    placeholder="e.g., ADT-90210"
                    value={state.auditId}
                    onChange={(e) => handleAuditIdChange(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input id="age" type="number" value={state.profile.age || ''} onChange={(e) => handleProfileChange('age', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="symptom_severity">Severity (1-10)</Label>
                    <Input id="symptom_severity" type="number" value={state.profile.symptom_severity || ''} onChange={(e) => handleProfileChange('symptom_severity', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="comorbidity_index">Comorbidity</Label>
                    <Input id="comorbidity_index" type="number" value={state.profile.comorbidity_index || ''} onChange={(e) => handleProfileChange('comorbidity_index', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="prior_visit_count">Prior Visits</Label>
                    <Input id="prior_visit_count" type="number" value={state.profile.prior_visit_count || ''} onChange={(e) => handleProfileChange('prior_visit_count', e.target.value)} />
                  </div>
                </div>
              </div>

              {state.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}

              <Button onClick={handleGetExplanation} disabled={state.loading} className="btn-warm-primary">
                {state.loading ? 'Processing...' : 'Analyze My Case'} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <aside className="space-y-6">
              <div className="p-6 bg-card rounded-lg border border-border">
                <Shield className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold text-foreground mb-2">Privacy Pledge</h3>
                <p className="text-sm text-muted-foreground">
                  Fairness Lens operates on Zero-Knowledge principle. We do not use race, gender, or orientation in our models.
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold">GDPR Compliant</span>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Step: Explanation */}
        {state.step === 'explanation' && state.explanationResult && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-display font-bold">Decision Reconstruction</h2>
              <p className="text-muted-foreground mt-2">
                Audit reference: <span className="font-mono">{state.auditId}</span>
              </p>
            </div>

            <div className="grid lg:grid-cols-[1fr_280px] gap-8">
              <div className="space-y-8">
                <div className="p-6 bg-card rounded-lg border border-border">
                  <p className="text-xs font-bold text-primary mb-2">Decision Summary</p>
                  <p className="text-lg text-foreground">{state.explanationResult.decision_summary}</p>
                </div>

                {state.explanationResult.key_factors && state.explanationResult.key_factors.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-4">Contributing Attributes</h3>
                    <div className="space-y-3">
                      {state.explanationResult.key_factors.map((factor, idx) => (
                        <div key={idx} className="p-4 bg-card rounded-lg border border-border">
                          <div className="flex justify-between mb-2">
                            <span className="text-xs text-muted-foreground">{factor.feature}</span>
                            <span className="text-xs font-bold text-primary">{factor.importance}</span>
                          </div>
                          <p className="text-sm">Your value: <span className="font-mono">{factor.your_value}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {state.explanationResult.counterfactual_paths && state.explanationResult.counterfactual_paths.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-4">What-If Scenarios</h3>
                    <div className="space-y-4">
                      {state.explanationResult.counterfactual_paths.map((cf, idx) => (
                        <div key={idx} className="p-4 bg-card rounded-lg border-l-4 border-l-primary/40">
                          <p className="font-medium mb-2">{cf.scenario}</p>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {cf.changes.map((change, cidx) => (
                              <div key={cidx} className="flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-primary/40" />
                                {change}
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 flex items-center gap-4">
                            <span className="text-xs font-bold text-primary">{cf.outcome}</span>
                            <span className="text-xs text-muted-foreground">{cf.feasibility}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <aside className="space-y-6">
                <div className="p-6 bg-primary text-primary-foreground rounded-lg">
                  <h3 className="font-bold mb-2">Believe this is wrong?</h3>
                  <p className="text-sm text-primary-foreground/80 mb-4">
                    If your medical reality differs, you can file an appeal.
                  </p>
                  <Button onClick={handleStartAppeal} className="w-full bg-white text-primary hover:bg-white/90">
                    Start Formal Appeal
                  </Button>
                </div>
              </aside>
            </div>

            <Button variant="ghost" onClick={() => setState(prev => ({ ...prev, step: 'input' }))} className="mt-8">
              Back to Search
            </Button>
          </div>
        )}

        {/* Step: Appeal */}
        {state.step === 'appeal' && (
          <Card>
            <CardHeader>
              <CardTitle>File Your Appeal</CardTitle>
              <CardDescription>
                Explain why you believe the care decision was unfair. Our review team will examine your case within 3-5 business days.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {state.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="appeal-email">Your Email</Label>
                <Input id="appeal-email" type="email" placeholder="your.email@example.com" value={appealForm.email} onChange={(e) => setAppealForm(prev => ({ ...prev, email: e.target.value }))} />
              </div>

              <div>
                <Label htmlFor="appeal-reason">Why You're Appealing</Label>
                <Textarea id="appeal-reason" placeholder="Please explain why you believe the decision was unfair..." value={appealForm.reason} onChange={(e) => setAppealForm(prev => ({ ...prev, reason: e.target.value }))} className="min-h-32" />
                <p className="text-xs text-muted-foreground mt-1">Minimum 50 characters ({appealForm.reason.length}/50)</p>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Appeal Process:</strong> Days 1-2: Receive, Days 3-5: Review, Days 6-7: Escalation if needed, Days 8-10: Decision
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button onClick={handleSubmitAppeal} disabled={state.loading} className="flex-1">
                  <Send className="mr-2 h-4 w-4" />
                  {state.loading ? 'Submitting...' : 'Submit Appeal'}
                </Button>
                <Button onClick={() => setState(prev => ({ ...prev, step: 'explanation' }))} variant="outline">
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Confirmation */}
        {state.step === 'confirmation' && state.appealSubmitted && state.appealId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
                Appeal Submitted Successfully
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Appeal ID:</p>
                <p className="font-mono text-sm font-bold">{state.appealId}</p>
              </div>

              <div>
                <p className="font-bold mb-3">Next Steps:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Confirmation email sent to {appealForm.email}</li>
                  <li className="flex items-center gap-2"><span>1</span> Our review team will examine (3-5 days)</li>
                  <li className="flex items-center gap-2"><span>2</span> Escalation if needed</li>
                  <li className="flex items-center gap-2"><span>3</span> Final decision via email</li>
                </ul>
              </div>

              <Button onClick={handleReset} className="w-full">Check Another Decision</Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}