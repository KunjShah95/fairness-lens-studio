import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Shield, BarChart3, Users, Zap, FileText, Clock, Scale, Brain, ArrowRight, CheckCircle2, Lock, EyeOff, FlaskConical, Globe, Bell, Search, FileCheck, GraduationCap, Sparkles, Star, Heart, Target, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const FeaturesPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Shield,
      title: 'Bias Detection',
      description: 'Detect bias using Demographic Parity, Equal Opportunity, and Disparate Impact metrics.',
      details: ['Multiple fairness algorithms', 'Intersectional analysis', 'Proxy detection'],
      accent: 'from-primary/20 to-primary/5'
    },
    {
      icon: Brain,
      title: 'Causal Analysis',
      description: 'Go beyond correlation with DoWhy causal inference for legally defensible findings.',
      details: ['Causal DAG modeling', 'Treatment effect estimation', 'Counterfactual reasoning'],
      accent: 'from-secondary/20 to-secondary/5'
    },
    {
      icon: BarChart3,
      title: 'Feature Explainability',
      description: 'SHAP and LIME explanations show which features drive decisions.',
      details: ['SHAP values', 'Feature importance ranking', 'Local explanations'],
      accent: 'from-accent/20 to-accent/5'
    },
    {
      icon: Users,
      title: 'Impact Simulation',
      description: 'See how policy changes affect real patients with what-if scenarios.',
      details: ['Population impact', 'Counterfactual generation', 'Scenario modeling'],
      accent: 'from-warning/20 to-warning/5'
    },
    {
      icon: FlaskConical,
      title: 'Mitigation Tools',
      description: 'Apply reweighting, feature removal, or adversarial debiasing.',
      details: ['Automated techniques', 'Before/after comparison', 'Accuracy trade-off visibility'],
      accent: 'from-primary/20 to-primary/5'
    },
    {
      icon: FileText,
      title: 'Compliance Reports',
      description: 'Generate audit-ready PDF reports with full metric documentation.',
      details: ['Nutrition labels', 'Model cards', 'Regulatory mapping'],
      accent: 'from-secondary/20 to-secondary/5'
    },
    {
      icon: Clock,
      title: 'Temporal Monitoring',
      description: 'Schedule automated re-audits to catch model drift over time.',
      details: ['Scheduled audits', 'Drift alerts', 'Historical tracking'],
      accent: 'from-accent/20 to-accent/5'
    },
    {
      icon: Globe,
      title: 'Public Transparency',
      description: 'Give affected patients a portal to understand and appeal decisions.',
      details: ['Plain-language explanations', 'Appeal workflow', 'No-login access'],
      accent: 'from-warning/20 to-warning/5'
    },
  ];

  const metrics = [
    { name: 'Demographic Parity', description: 'Equal approval rates across groups', threshold: '≥ 0.80', icon: Scale },
    { name: 'Equal Opportunity', description: 'Equal true positive rates', threshold: '≥ 0.80', icon: Target },
    { name: 'Disparate Impact', description: 'EEOC 4/5ths rule', threshold: '≥ 0.80', icon: ShieldCheck },
    { name: 'Proxy Detection', description: 'Correlation with protected attributes', threshold: '> 0.70', icon: Search },
  ];

  const who = [
    { icon: GraduationCap, title: 'Data Scientists', desc: 'Run bias audits quickly with automated tools', color: 'bg-primary/10 text-primary' },
    { icon: Scale, title: 'Compliance Teams', desc: 'Generate audit-ready reports', color: 'bg-secondary/10 text-secondary' },
    { icon: Shield, title: 'Hospital Leaders', desc: 'Track fairness scores over time', color: 'bg-accent/15 text-accent' },
    { icon: Users, title: 'Affected Patients', desc: 'Understand and appeal decisions', color: 'bg-warning/15 text-warning' },
  ];

  const benefits = [
    { icon: Star, title: 'Reduce Legal Risk', desc: 'Meet EU AI Act and GDPR requirements with audit-ready documentation' },
    { icon: Heart, title: 'Build Patient Trust', desc: 'Show stakeholders your commitment to fair healthcare decisions' },
    { icon: Zap, title: 'Automate Audits', desc: 'Schedule recurring fairness checks without manual effort' },
    { icon: Lock, title: 'Stay Compliant', desc: 'Map metrics to specific regulations for your jurisdiction' },
  ];

  return (
    <div className="min-h-screen overflow-hidden">
      <div className="fixed inset-0 -z-10 bg-background" />

      {/* Header */}
      <nav className="container py-6 flex items-center justify-between relative z-10">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl gradient-warm flex items-center justify-center shadow-warm">
            <Eye className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-display font-bold text-foreground">EquityLens</span>
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle className="rounded-full" />
          <Link to="/features" className="text-sm text-primary font-medium px-4">Features</Link>
          <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground px-4">About</Link>
          <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground px-4">Contact</Link>
          <Link to="/login">
            <Button variant="outline" className="rounded-full">Sign In</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="container py-16 md:py-24 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass border border-primary/10 shadow-glass mb-8">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Platform Features</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-6">
          Fairness, <span className="text-gradient">Automated</span>
        </h1>

        <p className="text-xl text-foreground/80 mb-10 max-w-2xl mx-auto">
          Everything you need to detect, explain, and mitigate bias in AI-assisted healthcare decisions.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link to="/register">
            <Button className="rounded-full btn-warm-primary shadow-glow hover:-translate-y-1">
              Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Button variant="outline" className="rounded-full bg-card/60 backdrop-blur">
            Watch Demo
          </Button>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="container py-12 relative z-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {benefits.map(b => (
            <Card key={b.title} className="card-glass">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground text-sm">{b.title}</h3>
                  <p className="text-xs text-muted-foreground">{b.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="container py-16 relative z-10">
        <h2 className="text-3xl font-display font-bold text-center text-foreground mb-4">Core Capabilities</h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          A complete fairness platform for healthcare AI teams.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(f => (
            <Card key={f.title} className="card-warm-hover border border-border/30">
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.accent} flex items-center justify-center mb-4`}>
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{f.description}</p>
                <ul className="space-y-1.5">
                  {f.details.map(d => (
                    <li key={d} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-success shrink-0" /> {d}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Metrics */}
      <section className="container py-16 relative z-10">
        <Card className="card-glass">
          <CardContent className="p-8 md:p-12">
            <h2 className="text-2xl font-display font-bold text-center text-foreground mb-10">Fairness Metrics We Track</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map(m => (
                <div key={m.name} className="p-5 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30 text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <m.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-1">{m.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{m.description}</p>
                  <p className="text-sm font-bold text-primary">Threshold: {m.threshold}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Who It's For */}
      <section className="container py-16 relative z-10">
        <h2 className="text-2xl font-display font-bold text-center text-foreground mb-12">Who It’s For</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {who.map(w => (
            <Card key={w.title} className="card-warm-hover border border-border/30">
              <CardContent className="p-6 text-center">
                <div className={`w-14 h-14 rounded-2xl ${w.color} flex items-center justify-center mx-auto mb-4`}>
                  <w.icon className="w-7 h-7" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-1">{w.title}</h3>
                <p className="text-sm text-muted-foreground">{w.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 text-center relative z-10">
        <Card className="card-glass max-w-2xl mx-auto overflow-hidden relative">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          <CardContent className="p-10 relative z-10">
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground mb-8">
              Join healthcare teams already using EquityLens to build fairer AI.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/register">
                <Button className="rounded-full btn-warm-primary shadow-glow">
                  Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" className="rounded-full">Contact Sales</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="container py-8 text-center relative z-10">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-muted-foreground" />
          <span className="font-display font-semibold text-foreground">EquityLens</span>
        </div>
        <div className="flex items-center justify-center gap-6 mb-4">
          <Link to="/features" className="text-sm text-muted-foreground hover:text-foreground">Features</Link>
          <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">About</Link>
          <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link>
          <Link to="/portal" className="text-sm text-muted-foreground hover:text-foreground">Portal</Link>
        </div>
        <p className="text-sm text-muted-foreground">© 2026 EquityLens. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default FeaturesPage;