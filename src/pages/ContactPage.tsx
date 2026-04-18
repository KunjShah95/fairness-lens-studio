import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Mail, MapPin, Phone, ArrowRight, CheckCircle2, Send, MessageSquare } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';

const ContactPage: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    organization: '',
    role: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = [
    { icon: Mail, title: 'Email', value: 'hello@equitylens.ai', desc: 'General inquiries' },
    { icon: Phone, title: 'Phone', value: '+1 (888) 555-EQLS', desc: 'Mon-Fri 9am-6pm EST' },
    { icon: MapPin, title: 'Office', value: 'Boston, MA', desc: 'Healthcare innovation hub' },
  ];

  const topics = [
    { value: 'demo', label: 'Request a Demo' },
    { value: 'pricing', label: 'Pricing & Plans' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'support', label: 'Technical Support' },
    { value: 'press', label: 'Press & Media' },
    { value: 'careers', label: 'Careers' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 -z-10 bg-background" />

      <AppHeader />

      {/* Hero */}
      <section className="container py-12 md:py-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50 shadow-card mb-6">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Get in Touch</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
          We'd Love to <span className="text-primary">Hear From You</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Questions about fairness? Need a demo? Want to partner? We're here to help.
        </p>
      </section>

      <div className="container py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="card-warm border-border/30">
              <CardHeader>
                <CardTitle className="text-xl font-display">Send us a message</CardTitle>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="py-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-success" />
                    </div>
                    <h3 className="text-xl font-display font-semibold text-foreground mb-2">Message Sent!</h3>
                    <p className="text-muted-foreground mb-4">Thanks for reaching out. We'll get back to you within 24 hours.</p>
                    <Button variant="outline" className="rounded-full" onClick={() => setSubmitted(false)}>
                      Send another message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name & Email */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block text-foreground">Your Name *</label>
                        <Input
                          placeholder="Jane Smith"
                          value={form.name}
                          onChange={e => handleChange('name', e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block text-foreground">Email *</label>
                        <Input
                          type="email"
                          placeholder="jane@organization.com"
                          value={form.email}
                          onChange={e => handleChange('email', e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Organization & Role */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block text-foreground">Organization</label>
                        <Input
                          placeholder="Acme Healthcare"
                          value={form.organization}
                          onChange={e => handleChange('organization', e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block text-foreground">Topic</label>
                        <Select value={form.subject} onValueChange={v => handleChange('subject', v)}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Select a topic" />
                          </SelectTrigger>
                          <SelectContent>
                            {topics.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="text-sm font-medium mb-2 block text-foreground">Message *</label>
                      <Textarea
                        placeholder="Tell us how we can help..."
                        value={form.message}
                        onChange={e => handleChange('message', e.target.value)}
                        className="rounded-xl min-h-[150px]"
                      />
                    </div>

                    <Button type="submit" className="w-full rounded-full btn-warm-primary gap-2" disabled={loading}>
                      {loading ? 'Sending...' : 'Send Message'} <Send className="w-4 h-4" />
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            {/* Direct Contact */}
            <Card className="card-warm border-border/30">
              <CardContent className="p-6">
                <h3 className="font-display font-semibold text-foreground mb-4">Contact Directly</h3>
                <div className="space-y-4">
                  {contactInfo.map(info => (
                    <div key={info.title} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <info.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{info.value}</p>
                        <p className="text-xs text-muted-foreground">{info.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Office Hours */}
            <Card className="card-warm border-border/30">
              <CardContent className="p-6">
                <h3 className="font-display font-semibold text-foreground mb-4">Support Hours</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monday - Friday</span>
                    <span className="text-foreground">9:00 AM - 6:00 PM EST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saturday</span>
                    <span className="text-foreground">10:00 AM - 2:00 PM EST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sunday</span>
                    <span className="text-foreground">Closed</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency */}
            <Card className="card-warm border-warning/30">
              <CardContent className="p-6">
                <h3 className="font-display font-semibold text-foreground mb-2">Emergency Support</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  For critical production issues, our enterprise customers can reach our 24/7 on-call team.
                </p>
                <Button variant="outline" className="w-full rounded-full">
                  Contact Enterprise Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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

export default ContactPage;