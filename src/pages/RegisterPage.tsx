import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Mail, Lock, User, Building2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { UserRole } from '@/lib/types';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAppStore();
  const [form, setForm] = useState({
    name: '',
    email: '',
    organization: '',
    role: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      login({
        id: crypto.randomUUID(),
        name: form.name,
        email: form.email,
        role: (form.role || 'analyst') as UserRole,
      });
      navigate('/dashboard');
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 -z-10 bg-background" />

      {/* Header */}
      <nav className="container py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl gradient-warm flex items-center justify-center shadow-warm">
            <Eye className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-display font-bold text-foreground">EquityLens</span>
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle className="rounded-full" />
          <Link to="/features" className="text-sm text-muted-foreground hover:text-foreground">Features</Link>
          <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">About</Link>
          <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link>
        </div>
      </nav>

      {/* Register Form */}
      <div className="container max-w-lg py-8">
        <Card className="card-warm border-border/30">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-display">Create Account</CardTitle>
            <CardDescription>Get started with EquityLens for free</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2 text-foreground">
                  <User className="w-4 h-4" /> Full Name *
                </label>
                <Input
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={e => handleChange('name', e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2 text-foreground">
                  <Mail className="w-4 h-4" /> Work Email *
                </label>
                <Input
                  type="email"
                  placeholder="jane@organization.com"
                  value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {/* Organization */}
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2 text-foreground">
                  <Building2 className="w-4 h-4" /> Organization
                </label>
                <Input
                  placeholder="Acme Healthcare"
                  value={form.organization}
                  onChange={e => handleChange('organization', e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {/* Role */}
              <div>
                <label className="text-sm font-medium mb-2 text-foreground">Your Role</label>
                <Select value={form.role} onValueChange={v => handleChange('role', v)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="analyst">Data Analyst</SelectItem>
                    <SelectItem value="compliance">Compliance Officer</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Password */}
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2 text-foreground">
                  <Lock className="w-4 h-4" /> Password *
                </label>
                <Input
                  type="password"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={e => handleChange('password', e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2 text-foreground">
                  <Lock className="w-4 h-4" /> Confirm Password *
                </label>
                <Input
                  type="password"
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={e => handleChange('confirmPassword', e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full rounded-full btn-warm-primary gap-2" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'} <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            {/* Terms */}
            <p className="text-xs text-center text-muted-foreground">
              By creating an account, you agree to our{' '}
              <a href="#" className="underline hover:text-foreground">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="underline hover:text-foreground">Privacy Policy</a>.
            </p>

            {/* Login Link */}
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;