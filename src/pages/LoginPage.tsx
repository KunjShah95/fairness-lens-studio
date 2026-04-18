import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye, Mail, Lock, ArrowRight, Chrome, Sparkles, ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/lib/use-auth';
import { toast } from '@/hooks/use-toast';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login: storeLogin } = useAppStore();
  const { signIn, signInWithGoogle, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
      storeLogin({
        id: crypto.randomUUID(),
        name: email.split('@')[0],
        email,
        role: 'analyst',
      });
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password';
      setError(message);
      toast({
        title: 'Login failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      storeLogin({
        id: crypto.randomUUID(),
        name: 'Demo User',
        email: 'demo@equitylens.com',
        role: 'analyst',
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden">
      <div className="fixed inset-0 -z-10 bg-background" />

      {/* Back button */}
      <nav className="container py-6 relative z-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <ThemeToggle className="rounded-full" />
        </div>
      </nav>

      {/* Login Form */}
      <div className="container max-w-md py-8 relative z-10">
        <Card className="card-glass overflow-hidden">
          {/* Decorative header */}
          <div className="relative h-3 bg-gradient-to-r from-primary via-secondary to-accent" />
          
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-2xl gradient-warm flex items-center justify-center mx-auto mb-4 shadow-glow">
              <Eye className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-display">Welcome Back</CardTitle>
            <CardDescription>Sign in to continue to your dashboard</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            {/* Social Login */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="rounded-xl bg-card/60 backdrop-blur border-border/40 hover:bg-card/80" 
                onClick={handleGoogleLogin} 
                disabled={loading || authLoading}
              >
                <Chrome className="w-4 h-4 mr-2" /> Google
              </Button>
              <Button 
                variant="outline" 
                className="rounded-xl bg-card/60 backdrop-blur border-border/40 hover:bg-card/80" 
                onClick={handleDemoLogin} 
                disabled={loading || authLoading}
              >
                <Sparkles className="w-4 h-4 mr-2 text-primary" /> Try Demo
              </Button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card/60 px-4 text-sm text-muted-foreground backdrop-blur-sm">or continue with email</span>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" /> Email
                </label>
                <Input
                  type="email"
                  placeholder="you@organization.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="rounded-xl bg-card/70 backdrop-blur border-border/40"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" /> Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="rounded-xl bg-card/70 backdrop-blur border-border/40"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
              )}

              <Button type="submit" className="w-full rounded-xl btn-warm-primary shadow-glow hover:shadow-warm hover:-translate-y-0.5" disabled={loading || authLoading}>
                {loading || authLoading ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-pulse" /> Signing in...
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Forgot Password */}
            <div className="text-center">
              <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary">
                Forgot password?
              </Link>
            </div>

            {/* Register Link */}
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-medium hover:underline">
                Create one
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Back to home link */}
        <p className="text-center mt-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;