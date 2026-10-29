import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Shield, Clock } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'developer' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/auth/register', form);
      setDone(true);
      toast.success('Registration submitted');
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Join the BugShield Pro workspace
          </p>
        </div>

        {done ? (
          <div className="rounded-md border bg-amber-500/10 border-amber-500/20 p-6 text-center text-sm text-amber-800 dark:text-amber-500">
            <div className="flex justify-center mb-3">
              <Clock className="h-10 w-10 text-amber-500 animate-pulse" />
            </div>
            <p className="font-semibold text-base text-amber-900 dark:text-amber-400">Awaiting Administrator Approval</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Your account has been created with a <span className="font-semibold">pending</span> status. You will be able to sign in once an administrator approves your access.
            </p>
            <Link to="/login" className="btn-secondary w-full mt-5">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <label className="label">Full Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-1">
              <label className="label">Email Address</label>
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
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1">
              <label className="label">Role</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="developer">Developer</option>
                <option value="tester">Tester</option>
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Project Manager and Admin accounts can only be created by an administrator.
              </p>
            </div>
            <button className="btn-primary w-full mt-2" disabled={busy}>
              {busy ? 'Submitting…' : 'Register'}
            </button>
          </form>
        )}

        {!done && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
