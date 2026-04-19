import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, ArrowRight, Shield, BarChart3, Users, Zap, CheckCircle2, Heart, Activity, Scale, Sparkles, Globe, ArrowDown } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AppHeader } from '@/components/AppHeader';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, setCurrentDataset, setCurrentAnalysis } = useAppStore();
  const [name, setName] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);

  const handleLogin = () => {
    if (!name.trim()) return;
    setUser({
      id: crypto.randomUUID(),
      name: name.trim(),
      email: 'user@example.com',
      role: 'analyst',
    });
    navigate('/dashboard');
  };

  const runDemo = async () => {
    setDemoLoading(true);
    try {
      // Set demo user
      setUser({
        id: 'demo-user',
        name: 'Demo User',
        email: 'demo@equitylens.dev',
        role: 'analyst',
      });

      // Set demo dataset
      setCurrentDataset({
        id: 'demo-dataset-001',
        name: 'Demo Healthcare Dataset',
        rows: 5000,
        columns: ['gender', 'race', 'age', 'symptom_severity', 'comorbidity_index', 'prior_visit_count', 'insurance_tier', 'postal_code_risk', 'triage_priority'],
        data: [],
        uploadedAt: new Date(),
        targetVariable: 'triage_priority',
        sensitiveAttributes: ['gender', 'race', 'age'],
      });

      // Set demo analysis results - using id instead of auditId
      setCurrentAnalysis({
        id: 'demo-audit-001',
        datasetId: 'demo-dataset-001',
        metrics: {
          demographicParity: 0.68,
          equalOpportunity: 0.74,
          disparateImpact: 0.71,
          overallScore: 72,
        },
        groupMetrics: [
          { group: 'Male', positiveRate: 0.82, count: 2450 },
          { group: 'Female', positiveRate: 0.68, count: 2550 },
          { group: 'Age 18-35', positiveRate: 0.78, count: 1500 },
          { group: 'Age 36-55', positiveRate: 0.75, count: 2000 },
          { group: 'Age 56+', positiveRate: 0.65, count: 1500 },
        ],
        sensitiveAttribute: 'gender',
        targetVariable: 'triage_priority',
        featureImportance: [
          { feature: 'symptom_severity', importance: 0.45, isProxy: false },
          { feature: 'comorbidity_index', importance: 0.25, isProxy: false },
          { feature: 'postal_code_risk', importance: 0.15, isProxy: true },
          { feature: 'insurance_tier', importance: 0.10, isProxy: true },
          { feature: 'prior_visit_count', importance: 0.05, isProxy: false },
        ],
        correlations: [
          { feature: 'postal_code_risk', correlation: 0.81 },
          { feature: 'insurance_tier', correlation: 0.72 },
        ],
        timestamp: new Date(),
      });

      navigate('/analysis');
    } catch (err) {
      console.error('Demo error:', err);
    } finally {
      setDemoLoading(false);
    }
  };

  const features = [
    { 
      icon: Shield, 
      title: 'Bias Detection', 
      desc: 'Detect bias with Demographic Parity, Equal Opportunity, and Disparate Impact metrics.',
      color: 'bg-gradient-to-br from-primary/20 to-primary/5 text-primary'
    },
    { 
      icon: BarChart3, 
      title: 'Explainability', 
      desc: 'SHAP-like importance and proxy bias detection for transparent decisions.',
      color: 'bg-gradient-to-br from-secondary/20 to-secondary/5 text-secondary'
    },
    { 
      icon: Users, 
      title: 'Impact Simulator', 
      desc: 'What-if scenarios showing how policy changes affect patients.',
      color: 'bg-gradient-to-br from-accent/20 to-accent/5 text-accent'
    },
    { 
      icon: Zap, 
      title: 'Mitigation', 
      desc: 'Apply reweighting, feature removal, or adversarial debiasing.',
      color: 'bg-gradient-to-br from-warning/20 to-warning/5 text-warning'
    },
  ];

  const stats = [
    { icon: Scale, value: '8', label: 'Metrics' },
    { icon: Heart, value: '50K+', label: 'Patients' },
    { icon: Activity, value: '99%', label: 'Accuracy' },
  ];

  return (
    <div className="min-h-screen overflow-hidden">
      <div className="fixed inset-0 -z-10 bg-background" />

      <AppHeader />

      {/* Hero */}
      <section className="container pt-32 pb-16 md:pt-48 md:pb-32 relative z-10 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge with glow */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/10 shadow-glass mb-6 animate-fade-in mx-auto">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs md:text-sm font-medium text-foreground">Healthcare AI Fairness Platform</span>
          </div>

          {/* Headline with gradient text */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold text-foreground mb-6 leading-tight animate-fade-in px-2" style={{ animationDelay: '0.1s' }}>
            Make AI Care Decisions
            <br className="hidden sm:block" />
            <span className="text-gradient"> Fairer for Everyone</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-2xl text-foreground/80 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in px-4" style={{ animationDelay: '0.2s' }}>
            Detect, explain, simulate, and mitigate bias in clinical AI. Build trust with patients and regulators through transparent fairness audits.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
            <Link to="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto rounded-full px-8 py-6 text-base btn-warm-primary shadow-glow hover:shadow-warm hover:-translate-y-1 transition-all">
                Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-8 py-6 text-base border-border/60 bg-card/60 backdrop-blur transition-all" onClick={runDemo} disabled={demoLoading}>
              {demoLoading ? 'Loading Demo...' : 'View Demo'}
            </Button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {stats.map(stat => (
              <div key={stat.label} className="flex items-center justify-center sm:justify-start gap-3 text-muted-foreground p-4 bg-muted/5 rounded-2xl border border-border/5 sm:bg-transparent sm:p-0 sm:border-0">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                  <stat.icon className="w-5 h-5 text-secondary" />
                </div>
                <div className="text-left">
                  <p className="font-display font-bold text-foreground text-xl leading-none">{stat.value}</p>
                  <p className="text-xs uppercase tracking-widest mt-1 opacity-60">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20 px-4 relative z-10">
        <div className="text-center mb-16 px-4">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
            Fairness, <span className="text-primary">Simplified</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg leading-relaxed">
            Everything you need to audit AI healthcare decisions — from data upload to compliance reports.
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <Card 
              key={f.title} 
              className="card-warm-hover group border border-border/30 animate-fade-in overflow-hidden" 
              style={{ animationDelay: `${0.1 * i}s` }}
            >
              <CardContent className="p-8">
                <div className={`w-14 h-14 rounded-2xl ${f.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm`}>
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-xl mb-3">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container py-20 px-4 relative z-10">
        <Card className="glass max-w-5xl mx-auto overflow-hidden border-border/20">
          <CardContent className="p-8 md:p-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-center text-foreground mb-12">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
              {[
                { n: 1, label: 'Upload Data' },
                { n: 2, label: 'Select Attributes' },
                { n: 3, label: 'Run Audit' },
                { n: 4, label: 'Simulate' },
                { n: 5, label: 'Export Report' }
              ].map((step, i) => (
                <div key={step.n} className="relative">
                  <div className="flex flex-row md:flex-col items-center gap-4 md:gap-6 bg-card/60 backdrop-blur-sm rounded-2xl p-6 border border-border/30 h-full">
                    <span className="w-12 h-12 shrink-0 rounded-2xl gradient-warm flex items-center justify-center text-primary-foreground text-lg font-bold shadow-warm">
                      {step.n}
                    </span>
                    <span className="text-base font-bold text-foreground text-center">{step.label}</span>
                  </div>
                  {i < 4 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 -translate-y-1/2 z-20">
                      <ArrowRight className="w-5 h-5 text-primary/30" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="container py-20 px-4 relative z-10">
        <Card className="card-glass max-w-4xl mx-auto overflow-hidden relative border-primary/10 shadow-glow">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[100px] -mr-40 -mt-40" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-[80px] -ml-32 -mb-32" />
          <CardContent className="p-10 md:p-20 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-6">
              Ready to Build Fairer AI?
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Join healthcare teams using EquityLens to ensure every patient receives fair treatment — regardless of background.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto rounded-full px-10 py-7 text-lg btn-warm-primary shadow-glow transition-all">
                  Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/contact" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-10 py-7 text-lg border-border/40 hover:bg-muted/50 transition-all">
                  Contact Sales
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="container py-12 px-4 text-center relative z-10 border-t border-border/10 mt-12">
        <div className="flex items-center justify-center gap-3 mb-8 group cursor-pointer">
          <div className="w-10 h-10 rounded-2xl gradient-warm flex items-center justify-center shadow-warm transition-transform group-hover:scale-110">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-2xl text-foreground">EquityLens</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mb-8">
          <Link to="/features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Features</Link>
          <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">About</Link>
          <Link to="/contact" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Contact</Link>
          <Link to="/portal" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Portal</Link>
          <Link to="/privacy" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Privacy</Link>
        </nav>
        <p className="text-xs text-muted-foreground uppercase tracking-widest opacity-50">© 2026 EquityLens Intelligent Systems. Optimized for Equity.</p>
      </footer>
    </div>
  );
};

export default LandingPage;