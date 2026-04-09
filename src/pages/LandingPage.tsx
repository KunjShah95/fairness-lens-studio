import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, ArrowRight, Shield, BarChart3, Users, Zap, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAppStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleLogin = () => {
    if (!name.trim()) return;
    setUser({
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim() || 'user@example.com',
      role: 'analyst',
    });
    navigate('/dashboard');
  };

  const features = [
    { icon: Shield, title: 'Bias Detection', desc: 'Compute Demographic Parity, Equal Opportunity, and Disparate Impact across protected groups.' },
    { icon: BarChart3, title: 'Explainability', desc: 'SHAP-like feature importance and proxy bias detection to understand what drives unfairness.' },
    { icon: Users, title: 'Human Impact Simulator', desc: 'Simulate what-if scenarios and see how changes affect real people and communities.' },
    { icon: Zap, title: 'Mitigation Strategies', desc: 'Get automated suggestions — reweighting, feature removal, adversarial debiasing — with before/after comparison.' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="gradient-hero text-primary-foreground">
        <div className="container py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
              <span className="text-2xl font-display font-bold">EquityLens</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-extrabold leading-tight mb-6">
              Human-Centric<br />
              <span className="text-gradient">AI Bias Detection</span>
            </h1>
            <p className="text-lg md:text-xl opacity-80 mb-10 max-w-2xl mx-auto leading-relaxed">
              Detect, explain, simulate, and mitigate bias in AI systems. Make fairer decisions that respect every individual.
            </p>

            {/* Quick login */}
            <Card className="max-w-md mx-auto shadow-elevated">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-foreground mb-4">Get started — enter your name</p>
                <div className="space-y-3">
                  <Input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                  <Button onClick={handleLogin} disabled={!name.trim()} className="w-full gap-2 gradient-primary text-primary-foreground">
                    Enter EquityLens <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <h2 className="text-3xl font-display font-bold text-center text-foreground mb-12">Core Capabilities</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(f => (
            <Card key={f.title} className="shadow-card hover:shadow-elevated transition-shadow">
              <CardContent className="p-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-card border-y border-border">
        <div className="container py-20">
          <h2 className="text-3xl font-display font-bold text-center text-foreground mb-12">How It Works</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            {['Upload Dataset', 'Select Variables', 'Run Analysis', 'Simulate & Mitigate', 'Export Report'].map((step, i) => (
              <React.Fragment key={step}>
                <div className="flex items-center gap-3 bg-muted rounded-xl px-5 py-3">
                  <span className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">{i + 1}</span>
                  <span className="text-sm font-medium text-foreground whitespace-nowrap">{step}</span>
                </div>
                {i < 4 && <ChevronRight className="w-5 h-5 text-muted-foreground hidden md:block" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container py-8 text-center text-sm text-muted-foreground">
        <p>EquityLens — Making AI fairer, one dataset at a time.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
