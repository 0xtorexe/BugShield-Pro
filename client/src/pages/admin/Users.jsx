import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { UserPlus, UserCheck, Search, Filter } from 'lucide-react';
import api from '../../api/client';
import { Spinner, Badge, Modal, EmptyState } from '../../components/ui';
import { roleStyle, userStatusStyle, titleCase, formatDateTime } from '../../lib/ui';
import { cn } from '../../lib/utils';

export default function Users() {
  const [users, setUsers] = useState(null);
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    const params = filter ? { status: filter } : {};
    const { data } = await api.get('/users', { params });
    setUsers(data.data);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, action, extra) => {
    try {
      await api.patch(`/users/${id}/${action}`, extra || {});
      toast.success(`User ${action}d successfully`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const reject = (id) => {
    const reason = window.prompt('Reason for rejection (optional):') || undefined;
    act(id, 'reject', { reason });
  };

  if (!users) return <Spinner />;

  const pending = users.filter((u) => u.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage system access, approve registrations, and assign roles.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <UserPlus className="h-4 w-4 mr-1.5" />
          Create User
        </button>
      </div>

      {/* Pending Banner */}
      {pending.length > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-500">
          <UserCheck className="h-5 w-5 text-amber-600 dark:text-amber-500" />
          <div>
            <span className="font-semibold">{pending.length} user registration(s)</span> are currently awaiting review and approval.
          </div>
        </div>
      )}

      {/* Filters (Shadcn Tabs structure) */}
      <div className="flex flex-wrap gap-1 bg-muted p-1 rounded-lg max-w-fit">
        {['', 'pending', 'approved', 'suspended', 'rejected'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              filter === s
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/40 hover:text-foreground"
            )}
          >
            {s ? titleCase(s) : 'All Users'}
          </button>
        ))}
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden border">
        {users.length === 0 ? (
          <EmptyState title="No users found" subtitle="No accounts match the selected status filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">System Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Last Authentication</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-foreground/90">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-semibold text-foreground">{u.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                    <td className="px-6 py-4">
                      <Badge className={cn("border font-medium", roleStyle[u.role])}>
                        {titleCase(u.role)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={cn("border font-medium capitalize", userStatusStyle[u.status])}>
                        {u.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{formatDateTime(u.lastLogin)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {u.role !== 'admin' && u.status === 'pending' && (
                          <>
                            <button className="btn-success h-8 px-3 text-xs" onClick={() => act(u.id, 'approve')}>
                              Approve
                            </button>
                            <button className="btn-danger h-8 px-3 text-xs" onClick={() => reject(u.id)}>
                              Reject
                            </button>
                          </>
                        )}
                        {u.role !== 'admin' && u.status === 'approved' && (
                          <button className="btn-secondary h-8 px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" onClick={() => act(u.id, 'suspend')}>
                            Suspend
                          </button>
                        )}
                        {u.role !== 'admin' && ['suspended', 'rejected'].includes(u.status) && (
                          <button className="btn-success h-8 px-3 text-xs" onClick={() => act(u.id, 'reactivate')}>
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateUserModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
    </div>
  );
}

function CreateUserModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'manager' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/users', form);
      toast.success('User created & approved');
      setForm({ name: '', email: '', password: '', role: 'manager' });
      onCreated();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create User Accounts">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1">
          <label className="label">Full Name</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="Jane Doe"
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
            placeholder="jane@example.com"
          />
        </div>
        <div className="space-y-1">
          <label className="label">Temporary Password</label>
          <input
            type="password"
            minLength={6}
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            placeholder="••••••••"
          />
        </div>
        <div className="space-y-1">
          <label className="label">Assigned Role</label>
          <select
            className="input"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="manager">Project Manager</option>
            <option value="developer">Developer</option>
            <option value="tester">Tester</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t mt-6">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
