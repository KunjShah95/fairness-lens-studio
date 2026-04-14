import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, ArrowRight, Shield, BarChart3, Users, Zap, CheckCircle2, Heart, Activity, Scale, Sparkles, Globe, ArrowDown } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { ThemeToggle } from '@/components/ThemeToggle';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAppStore();
  const [name, setName] = useState('');

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

      {/* Navigation */}
      <nav className="container py-6 flex items-center justify-between relative z-10">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl gradient-warm flex items-center justify-center shadow-glow animate-pulse-glow">
            <Eye className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-display font-bold text-foreground">EquityLens</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle className="rounded-full border-border/60" />
          <Link to="/features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4">Features</Link>
          <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4">About</Link>
          <Link to="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4">Contact</Link>
          <Link to="/login">
            <Button variant="outline" className="rounded-full border-border/60 hover:bg-primary/5">Sign In</Button>
          </Link>
          <Link to="/register">
            <Button className="rounded-full btn-warm-primary shadow-glow hover:shadow-warm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="container py-16 md:py-24 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge with glow */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass border border-primary/10 shadow-glass mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Healthcare AI Fairness Platform</span>
          </div>

          {/* Headline with gradient text */}
          <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Make AI Care Decisions
            <br />
            <span className="text-gradient">Fairer for Everyone</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Detect, explain, simulate, and mitigate bias in clinical AI. Build trust with patients and regulators through transparent fairness audits.
          </p>

          {/* CTA buttons */}
          <div className="flex items-center justify-center gap-4 mb-16 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link to="/register">
              <Button size="lg" className="rounded-full px-8 py-6 text-base btn-warm-primary shadow-glow hover:shadow-warm hover:-translate-y-1">
                Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="rounded-full px-8 py-6 text-base border-border/60 bg-card/60 backdrop-blur">
              View Demo
            </Button>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {stats.map(stat => (
              <div key={stat.label} className="flex items-center gap-2.5 text-muted-foreground">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-secondary" />
                </div>
                <span className="font-display font-bold text-foreground text-lg">{stat.value}</span>
                <span className="text-sm">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="flex justify-center mt-8 animate-bounce">
          <ArrowDown className="w-5 h-5 text-muted-foreground/50" />
        </div>
      </section>

      {/* Features */}
      <section className="container py-20 relative z-10">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-center text-foreground mb-4">
          Fairness, <span className="text-primary">Simplified</span>
        </h2>
        <p className="text-center text-muted-foreground mb-16 max-w-xl mx-auto text-lg">
          Everything you need to audit AI healthcare decisions — from data upload to compliance reports.
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <Card 
              key={f.title} 
              className="card-warm-hover group border border-border/30 animate-fade-in" 
              style={{ animationDelay: `${0.1 * i}s` }}
            >
              <CardContent className="p-8">
                <div className={`w-14 h-14 rounded-2xl ${f.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500`}>
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works - Glass card */}
      <section className="container py-20 relative z-10">
        <Card className="glass max-w-4xl mx-auto">
          <CardContent className="p-10 md:p-14">
            <h2 className="text-3xl font-display font-bold text-center text-foreground mb-12">How It Works</h2>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 flex-wrap">
              {[
                { n: 1, label: 'Upload Data' },
                { n: 2, label: 'Select Attributes' },
                { n: 3, label: 'Run Audit' },
                { n: 4, label: 'Simulate' },
                { n: 5, label: 'Export Report' }
              ].map((step, i) => (
                <React.Fragment key={step.n}>
                  <div className="flex items-center gap-3 bg-card/60 backdrop-blur-sm rounded-2xl px-6 py-4 border border-border/30">
                    <span className="w-10 h-10 rounded-xl gradient-warm flex items-center justify-center text-primary-foreground text-sm font-bold shadow-warm">
                      {step.n}
                    </span>
                    <span className="text-base font-medium text-foreground">{step.label}</span>
                  </div>
                  {i < 4 && (
                    <ArrowRight className="w-5 h-5 text-muted-foreground/40 hidden md:block" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="container py-20 relative z-10">
        <Card className="card-glass max-w-3xl mx-auto overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full blur-2xl" />
          <CardContent className="p-10 md:p-14 text-center relative z-10">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Ready to Build Fairer AI?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
              Join healthcare teams using EquityLens to ensure every patient receives fair treatment — regardless of background.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/register">
                <Button size="lg" className="rounded-full px-8 py-6 text-base btn-warm-primary shadow-glow">
                  Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="rounded-full px-8 py-6 text-base">
                  Contact Sales
                </Button>
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

export default LandingPage;