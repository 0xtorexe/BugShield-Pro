import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="card w-full max-w-md bg-card p-8 border shadow-md rounded-lg">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Shield className="h-6 w-6" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">BugShield Pro</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Enterprise Bug Tracking & Project Management
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1">
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              placeholder="name@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              placeholder="••••••••"
            />
          </div>
          <button className="btn-primary w-full mt-2" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Register
          </Link>
        </p>

        <div className="mt-8 rounded-md border bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">Demo Accounts (Password shown):</p>
          <div className="space-y-1">
            <div className="flex justify-between border-b pb-1">
              <span>admin@bugshield.com</span>
              <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">Admin@123</span>
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground/80 pt-1">
              <span>manager / developer / tester</span>
              <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">Passw0rd!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
