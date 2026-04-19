import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Info, MessageSquare, Send, Heart, Shield, ArrowRight } from 'lucide-react';
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
    // Warm background
    step: 'input',
    auditId: '',
    profile: {
      age: 0,
      symptom_severity: 0,
      comorbidity_index: 0,
      prior_visit_count: 0,
    },
    explanationResult: null,
    loading: false,
    error: null,
    appealSubmitted: false,
    appealId: null,
  });

  const [appealForm, setAppealForm] = useState({
    email: '',
    reason: '',
  });

  // Handle profile input changes
  const handleProfileChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setState(prev => ({
      ...prev,
      profile: { ...prev.profile, [field]: numValue }
    }));
  };

  // Handle audit ID change
  const handleAuditIdChange = (value: string) => {
    setState(prev => ({ ...prev, auditId: value }));
  };

  // Request explanation
  const handleGetExplanation = async () => {
    if (!state.auditId) {
      setState(prev => ({ ...prev, error: 'Please enter an audit ID' }));
      return;
    }

    if (Object.values(state.profile).every(v => v === 0)) {
      setState(prev => ({ ...prev, error: 'Please enter at least one profile value' }));
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
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
    }
  };

  // Move to appeal form
  const handleStartAppeal = () => {
    setState(prev => ({ ...prev, step: 'appeal', error: null }));
  };

  // Submit appeal
  const handleSubmitAppeal = async () => {
    if (!appealForm.email || !appealForm.reason) {
      setState(prev => ({ ...prev, error: 'Please fill in all appeal fields' }));
      return;
    }

    if (appealForm.reason.length < 50) {
      setState(prev => ({ ...prev, error: 'Explanation must be at least 50 characters' }));
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
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
    }
  };

  // Reset to input
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
    <div className="min-h-screen">
      <div className="fixed inset-0 -z-10 bg-background" />
      {/* Header */}
      <div className="bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Care Decision Appeal Portal</h1>
            <p className="text-muted-foreground mt-2">
              Understand your care prioritization decision and appeal if you believe it was unfair
            </p>
          </div>
          <ThemeToggle className="rounded-full" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Step: Input Profile */}
        {state.step === 'input' && (
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>
                Enter your profile details to receive an explanation of the care decision
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {state.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="auditId">Audit ID</Label>
                  <Input
                    id="auditId"
                    placeholder="Enter the audit ID (e.g., audit-123)"
                    value={state.auditId}
                    onChange={(e) => handleAuditIdChange(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    This was provided when your care case was reviewed
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="Your age"
                      value={state.profile.age || ''}
                      onChange={(e) => handleProfileChange('age', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="symptom_severity">Symptom Severity (1-10)</Label>
                    <Input
                      id="symptom_severity"
                      type="number"
                      placeholder="Current symptom severity"
                      value={state.profile.symptom_severity || ''}
                      onChange={(e) => handleProfileChange('symptom_severity', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="comorbidity_index">Comorbidity Index</Label>
                    <Input
                      id="comorbidity_index"
                      type="number"
                      placeholder="Comorbidity burden score"
                      value={state.profile.comorbidity_index || ''}
                      onChange={(e) => handleProfileChange('comorbidity_index', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prior_visit_count">Prior Visit Count</Label>
                    <Input
                      id="prior_visit_count"
                      type="number"
                      placeholder="Visits in last 12 months"
                      value={state.profile.prior_visit_count || ''}
                      onChange={(e) => handleProfileChange('prior_visit_count', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  We don't collect protected information like race, gender, or religion.
                  Your explanation is generated without using these attributes.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleGetExplanation}
                disabled={state.loading}
                className="w-full"
                size="lg"
              >
                {state.loading ? 'Analyzing...' : 'Get Care Decision Explanation'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Explanation Display */}
        {state.step === 'explanation' && state.explanationResult && (
          <div className="space-y-6">
            {/* Decision Summary */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">📋 Decision Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">{state.explanationResult.decision_summary}</p>
              </CardContent>
            </Card>

            {/* Key Factors */}
            {state.explanationResult.key_factors && state.explanationResult.key_factors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🎯 Key Factors in Your Decision</CardTitle>
                  <CardDescription>
                    These features had the strongest influence on the care outcome
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {state.explanationResult.key_factors.map((factor, idx: number) => (
                      <div key={idx} className="border rounded-lg p-3 bg-slate-50">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-slate-900">
                            {factor.feature?.toUpperCase()}
                          </span>
                          <span className="text-sm font-mono bg-amber-100 text-amber-900 px-2 py-1 rounded">
                            {factor.importance}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">Your value: {factor.your_value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bias Risk */}
            {state.explanationResult.bias_risk_factors && state.explanationResult.bias_risk_factors.length > 0 && (
              <Card className="bg-orange-50 border-orange-200">
                <CardHeader>
                  <CardTitle className="text-orange-900 text-lg">⚠️ Potential Bias Concerns</CardTitle>
                  <CardDescription className="text-orange-800">
                    These factors may have unfairly influenced your decision
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {state.explanationResult.bias_risk_factors.map((risk, idx: number) => (
                      <div key={idx} className="border-l-4 border-orange-400 pl-4 py-2">
                        <p className="font-semibold text-slate-900">{risk.feature}</p>
                        <p className="text-sm text-slate-600 mt-1">{risk.note}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Counterfactuals */}
            {state.explanationResult.counterfactual_paths && state.explanationResult.counterfactual_paths.length > 0 && (
              <Card className="bg-green-50 border-green-200">
                <CardHeader>
                  <CardTitle className="text-green-900 text-lg">✨ What Could Change the Outcome</CardTitle>
                  <CardDescription className="text-green-800">
                    Here's what would be different if your profile factors changed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {state.explanationResult.counterfactual_paths.map((cf, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4 bg-white">
                        <p className="font-semibold text-slate-900 mb-2">{cf.scenario}</p>
                        <ul className="space-y-1 mb-3">
                          {cf.changes?.map((change: string, cidx: number) => (
                            <li key={cidx} className="text-sm text-slate-700 flex items-start gap-2">
                              <span className="text-green-600 mt-0.5">→</span>
                              {change}
                            </li>
                          ))}
                        </ul>
                        <div className="flex gap-4">
                          <span className="text-sm font-semibold text-green-700">
                            {cf.outcome}
                          </span>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            {cf.feasibility}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Appeal Button */}
            <div className="flex gap-3">
              <Button
                onClick={handleStartAppeal}
                size="lg"
                className="flex-1"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                File an Appeal
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                size="lg"
                className="flex-1"
              >
                Check Another Decision
              </Button>
            </div>
          </div>
        )}

        {/* Step: Appeal Form */}
        {state.step === 'appeal' && (
          <Card>
            <CardHeader>
              <CardTitle>File Your Appeal</CardTitle>
              <CardDescription>
                Explain why you believe the care decision was unfair. Our review team will examine your case
                within 3-5 business days.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {state.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="appeal-email">Your Email</Label>
                  <Input
                    id="appeal-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={appealForm.email}
                    onChange={(e) => setAppealForm(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    We'll send status updates to this email address
                  </p>
                </div>

                <div>
                  <Label htmlFor="appeal-reason">Why You're Appealing</Label>
                  <div className="mt-1 flex gap-2">
                    <Textarea
                      id="appeal-reason"
                      placeholder="Please explain why you believe the decision was unfair, including any relevant facts or changes in your circumstances..."
                      value={appealForm.reason}
                      onChange={(e) => setAppealForm(prev => ({ ...prev, reason: e.target.value }))}
                      className="min-h-32"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Minimum 50 characters ({appealForm.reason.length}/50+)
                  </p>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Our Appeal Process (4 Steps):</strong>
                  <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                    <li>Days 1-2: Your appeal received and logged</li>
                    <li>Days 3-5: Initial review by our analysis team</li>
                    <li>Days 6-7: Escalation to manager if needed</li>
                    <li>Days 8-10: Final decision sent to your email</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button
                  onClick={handleSubmitAppeal}
                  disabled={state.loading}
                  className="flex-1"
                  size="lg"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {state.loading ? 'Submitting...' : 'Submit Appeal'}
                </Button>
                <Button
                  onClick={() => setState(prev => ({ ...prev, step: 'explanation' }))}
                  variant="outline"
                  size="lg"
                >
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Confirmation */}
        {state.step === 'confirmation' && state.appealSubmitted && state.appealId && (
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-900 flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6" />
                Appeal Submitted Successfully
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-white border rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-2">Appeal ID (for reference):</p>
                <p className="font-mono text-sm font-semibold text-slate-900">{state.appealId}</p>
              </div>

              <div className="space-y-3">
                <p className="font-semibold text-slate-900">📧 Next Steps:</p>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold mt-0.5">✓</span>
                    Confirmation email sent to {appealForm.email}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">1</span>
                    Our review team will examine your case (3-5 business days)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">2</span>
                    If needed, escalation to management for further review
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">3</span>
                    Final decision communication via email
                  </li>
                </ul>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Questions?</strong> Contact our appeals team at{' '}
                  <span className="font-semibold">appeals@fairness-lens.io</span>
                  {' '}(Monday-Friday, 9 AM - 5 PM EST)
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleReset}
                className="w-full"
                size="lg"
              >
                Check Another Decision
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
