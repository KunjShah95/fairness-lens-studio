import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Heart, Shield, Scale, Users, ArrowRight, CheckCircle2, Mail, MapPin, Linkedin, Twitter, Github } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';

const AboutPage: React.FC = () => {
  const values = [
    { icon: Heart, title: 'Patient-Centered', desc: 'Every decision we make centers on the people affected by AI systems — patients, not just metrics.' },
    { icon: Scale, title: 'Fairness First', desc: 'We believe公平 must be built into AI from the start, not added on as an afterthought.' },
    { icon: Shield, title: 'Transparency', desc: 'Healthcare decisions should be explainable, contestable, and accountable.' },
    { icon: Users, title: 'Inclusive', desc: 'We design for everyone — data scientists, compliance teams, and affected patients alike.' },
  ];

  const team = [
    { 
      name: 'Kunj Shah', 
      role: 'Founder & Full Stack Developer', 
      bio: 'Visionary behind EquityLens. Specialist in full-stack architecture and AI/ML system integrity.', 
      image: '/kunj.jpg',
      objectPosition: 'center 15%',
      linkedin: 'https://www.linkedin.com/in/kunjshah05'
    },
    { 
      name: 'Vidhya Mehta', 
      role: 'Co-founder', 
      bio: 'Expert in Python and AI/ML architectures. Driving fairness through causal modeling and algorithmic accountability.', 
      image: '/vidhya.jpeg',
      objectPosition: 'center center',
      linkedin: 'https://www.linkedin.com/in/vidhya-mehta-551a3836b/'
    },
  ];

  const timeline = [
    { year: '2024', event: 'Founded in Boston' },
    { year: '2025', event: 'First enterprise customer' },
    { year: '2025', event: 'GDPR compliance features' },
    { year: '2026', event: 'EU AI Act support' },
  ];

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 -z-10 bg-background" />

      <AppHeader />

      {/* Hero */}
      <section className="container px-4 py-16 md:py-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50 shadow-card mb-8">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">About EquityLens</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6 leading-tight">
          Building Trust in <br className="hidden sm:block" /> <span className="text-primary">Healthcare AI</span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
          We're on a mission to make AI-assisted healthcare decisions fair, explainable, and accountable — for data scientists, compliance teams, and the patients they serve.
        </p>
      </section>

      {/* Mission Statement */}
      <section className="container px-4 py-12">
        <Card className="card-warm border-border/30 max-w-3xl mx-auto overflow-hidden">
          <CardContent className="p-6 sm:p-8 md:p-12 text-center">
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">Our Mission</h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed italic">
              "To ensure every patient receives fair treatment from AI-assisted healthcare decisions — regardless of their race, gender, age, or background. We believe fairness is not a feature, but a fundamental right."
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Values */}
      <section className="container px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-center text-foreground mb-12">Our Values</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map(v => (
            <Card key={v.title} className="card-warm border-border/30 text-center group hover:border-primary/30 transition-all">
              <CardContent className="p-6">
                <div className="w-14 h-14 rounded-2xl gradient-warm flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <v.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="container py-16">
        <Card className="card-warm border-border/30">
          <CardContent className="p-8 md:p-12">
            <h2 className="text-2xl font-display font-bold text-center text-foreground mb-10">Our Journey</h2>
            <div className="flex flex-wrap justify-center gap-8">
              {timeline.map(t => (
                <div key={t.year} className="text-center">
                  <div className="w-12 h-12 rounded-2xl gradient-warm flex items-center justify-center mx-auto mb-3">
                    <span className="text-sm font-bold text-primary-foreground">{t.year.slice(-2)}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{t.event}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Team */}
      <section className="container px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-center text-foreground mb-4">Our Team</h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto text-sm sm:text-base">
          A multidisciplinary team of healthcare AI researchers, engineers, and policy experts.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {team.map(member => (
            <Card key={member.name} className="card-warm-hover border-border/30 overflow-hidden">
              <CardContent className="p-6 text-center">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 overflow-hidden border-2 border-primary/20 shadow-lg">
                  {member.image.startsWith('/') ? (
                    <img 
                      src={member.image} 
                      alt={member.name} 
                      className="w-full h-full object-cover" 
                      style={{ objectPosition: (member as any).objectPosition || 'center' }}
                    />
                  ) : (
                    <span className="text-2xl font-display font-bold text-primary">{member.image}</span>
                  )}
                </div>
                <h3 className="font-display font-semibold text-foreground text-lg">{member.name}</h3>
                <p className="text-sm font-bold text-primary mb-2 uppercase tracking-wider">{member.role}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{member.bio}</p>
                <div className="flex items-center justify-center gap-4 mt-6">
                  {member.linkedin && (
                    <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                      <Linkedin className="w-5 h-5" />
                    </a>
                  )}
                  <Twitter className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 text-center">
        <Card className="card-warm border-border/30 max-w-2xl mx-auto">
          <CardContent className="p-8">
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">Join Our Mission</h2>
            <p className="text-muted-foreground mb-6">
              We're always looking for passionate people to help build fairer healthcare AI.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/contact">
                <Button className="rounded-full btn-warm-primary gap-2">
                  Get in Touch <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="container py-8 text-center">
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

export default AboutPage;