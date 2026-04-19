import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight, CheckCircle2, Lock, Award, Verified, Heart, Scale, Users, Zap } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 -z-10 bg-background" />
      
      <AppHeader />

      {/* Hero */}
      <section className="container px-4 pt-24 pb-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
            Building Fairness Into <span className="text-primary">Healthcare AI</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            We're on a mission to make AI-assisted healthcare decisions fair, explainable, 
            and accountable — for data scientists, compliance teams, and the patients they serve.
          </p>

          {/* Compliance */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border">
              <Lock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border">
              <Award className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">SOC 2 Type II</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border">
              <Verified className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">FDA Aligned</span>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Link to="/register">
              <Button className="btn-warm-primary">Get Started</Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline">Contact Sales</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="container px-4 py-16 border-t border-border/20">
        <div className="max-w-3xl mx-auto bg-card rounded-xl border border-border p-8 text-center">
          <h2 className="text-2xl font-display font-bold text-foreground mb-4">Our Mission</h2>
          <p className="text-muted-foreground italic">
            "To ensure every patient receives fair treatment from AI-assisted healthcare decisions — 
            regardless of their race, gender, age, or background. We believe fairness is not a feature, 
            but a fundamental right."
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="container px-4 py-16 border-t border-border/20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-display font-bold text-foreground mb-3">Our Values</h2>
          <p className="text-muted-foreground">Principles that guide everything we build</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Integrity', desc: 'Fairness must be built into AI from the start, not added as an afterthought.' },
            { title: 'Transparency', desc: 'Healthcare decisions should be explainable, contestable, and accountable.' },
            { title: 'Precision', desc: 'We provide the mathematical rigor required for clinical accountability.' },
            { title: 'Patient-Centered', desc: 'Every decision we make centers on the people affected by AI systems.' },
          ].map(item => (
            <div key={item.title} className="bg-card p-6 rounded-lg border border-border hover:border-primary transition-colors">
              <h3 className="font-display font-semibold text-foreground text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section className="container px-4 py-16 border-t border-border/20 bg-card/50">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-display font-bold text-foreground mb-3">What We Do</h2>
          <p className="text-muted-foreground">Full-stack fairness solutions</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
          {[
            'Bias Detection using Demographic Parity, Equal Opportunity, Disparate Impact',
            'Causal Analysis with DoWhy for defensible findings',
            'SHAP and LIME feature explanations',
            'What-if scenarios for patient populations',
            'Mitigation with reweighting and adversarial debiasing',
            'Compliance-ready PDF report generation',
          ].map(item => (
            <div key={item} className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              <span className="text-sm text-foreground">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="container px-4 py-16 border-t border-border/20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
          {[
            { value: '8+', label: 'Fairness Metrics' },
            { value: '12+', label: 'Bias Types' },
            { value: '50+', label: 'Healthcare Models' },
            { value: '99%', label: 'Accuracy' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container px-4 py-16 border-t border-border/20">
        <div className="bg-card rounded-xl border border-border p-10 text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-display font-bold text-foreground mb-4">Get Started</h2>
          <p className="text-muted-foreground mb-8">Ready to build fairer healthcare AI?</p>
          <div className="flex gap-4 justify-center">
            <Link to="/upload">
              <Button className="btn-warm-primary">Run Free Audit</Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline">Contact Sales</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container px-4 py-12 border-t border-border/20 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-display font-bold text-lg">EquityLens</span>
        </div>
        <div className="flex justify-center gap-6 text-sm text-muted-foreground mb-4">
          <Link to="/features">Features</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
        <p className="text-sm text-muted-foreground">© 2026 EquityLens. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default AboutPage;