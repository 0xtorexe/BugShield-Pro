import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Plus, User, Calendar, FolderOpen, ChevronRight } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Spinner, Badge, Modal, EmptyState, ProgressBar } from '../../components/ui';
import { formatDate, titleCase } from '../../lib/ui';
import { cn } from '../../lib/utils';

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState(null);
  const [managers, setManagers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const isAdmin = user.role === 'admin';

  const load = useCallback(async () => {
    const { data } = await api.get('/projects');
    setProjects(data.data);
  }, []);

  useEffect(() => {
    load();
    if (isAdmin) api.get('/users', { params: { role: 'manager', status: 'approved' } }).then((r) => setManagers(r.data.data));
  }, [load, isAdmin]);

  if (!projects) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse and manage all workspace initiatives and active teams.
          </p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Project
          </button>
        )}
      </div>

      {/* Grid */}
      {projects.length === 0 ? (
        <EmptyState
          title="No projects active"
          subtitle={isAdmin ? 'Create your first project to get started.' : 'You are not assigned to any projects.'}
          icon={FolderOpen}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="card group hover:border-foreground/30 transition-all flex flex-col justify-between p-6"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {p.name}
                  </h3>
                  <Badge className={cn("border font-medium shrink-0", p.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-400' : 'bg-muted text-muted-foreground')}>
                    {titleCase(p.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 h-10 leading-relaxed">
                  {p.description || 'No description provided.'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t space-y-4">
                {/* Meta details */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[100px]">{p.manager?.name || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(p.deadline)}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Project Progress</span>
                    <span className="text-foreground">{p.progress}%</span>
                  </div>
                  <ProgressBar value={p.progress} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateProjectModal
        open={showCreate}
        managers={managers}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); load(); }}
      />
    </div>
  );
}

function CreateProjectModal({ open, onClose, onCreated, managers }) {
  const empty = { name: '', description: '', category: '', startDate: '', deadline: '', managerId: '' };
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, managerId: form.managerId || null, startDate: form.startDate || null, deadline: form.deadline || null };
      await api.post('/projects', payload);
      toast.success('Project created successfully');
      setForm(empty);
      onCreated();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create New Project">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1">
          <label className="label">Project Name</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="E.g. BugShield Mobile Client"
          />
        </div>
        <div className="space-y-1">
          <label className="label">Description</label>
          <textarea
            className="input"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Provide a brief context or scope details..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="label">Category</label>
            <input
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Web, Mobile, Core API"
            />
          </div>
          <div className="space-y-1">
            <label className="label">Project Manager</label>
            <select
              className="input"
              value={form.managerId}
              onChange={(e) => setForm({ ...form, managerId: e.target.value })}
            >
              <option value="">Unassigned</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="label">Start Date</label>
            <input
              type="date"
              className="input"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="label">Deadline</label>
            <input
              type="date"
              className="input"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t mt-6">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
