import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Plus, Bug, Search, Filter, Calendar } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Spinner, Badge, Modal, EmptyState } from '../../components/ui';
import { severityStyle, statusStyle, titleCase, formatDate } from '../../lib/ui';
import { cn } from '../../lib/utils';

export default function Bugs() {
  const { user } = useAuth();
  const [bugs, setBugs] = useState(null);
  const [filters, setFilters] = useState({ status: '', severity: '' });
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.severity) params.severity = filters.severity;
    const { data } = await api.get('/bugs', { params });
    setBugs(data.data);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  if (!bugs) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bug className="h-8 w-8 text-primary" />
            Bug Registry
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track, report, and monitor system bugs, tasks, and verifications.
          </p>
        </div>
        {user.role === 'tester' && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Report Bug
          </button>
        )}
      </div>

      {/* Filters (Clean Shadcn styling) */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          Filter:
        </div>
        <select
          className="input max-w-[180px] bg-background"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Statuses</option>
          {['new', 'assigned', 'in_progress', 'resolved', 'verified', 'reopened', 'closed'].map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </select>
        <select
          className="input max-w-[180px] bg-background"
          value={filters.severity}
          onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
        >
          <option value="">All Severities</option>
          {['low', 'medium', 'high', 'critical'].map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </select>
      </div>

      {/* Table Card */}
      <div className="card overflow-hidden border">
        {bugs.length === 0 ? (
          <EmptyState title="No bugs found" subtitle="No reports match your selected filter criteria." icon={Bug} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
                <tr>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Project</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Reporter</th>
                  <th className="px-6 py-4">Date Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y text-foreground/90">
                {bugs.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-semibold whitespace-nowrap">
                      <Link to={`/bugs/${b.id}`} className="text-foreground hover:underline">
                        {b.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{b.project?.name}</td>
                    <td className="px-6 py-4">
                      <Badge className={cn("border font-medium text-[10px] capitalize", severityStyle[b.severity])}>
                        {b.severity}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={cn("border font-medium text-[10px] capitalize", statusStyle[b.status])}>
                        {titleCase(b.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{b.reporter?.name}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                        {formatDate(b.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReportBugModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
    </div>
  );
}

function ReportBugModal({ open, onClose, onCreated }) {
  const empty = {
    projectId: '', title: '', description: '', stepsToReproduce: '',
    expectedResult: '', actualResult: '', environment: '', severity: 'medium',
  };
  const [form, setForm] = useState(empty);
  const [projects, setProjects] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) api.get('/projects').then((r) => setProjects(r.data.data));
  }, [open]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/bugs', { ...form, projectId: Number(form.projectId) });
      toast.success('Bug reported successfully');
      setForm(empty);
      onCreated();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Report New Bug Instance" width="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="label">Project</label>
            <select className="input" value={form.projectId} onChange={set('projectId')} required>
              <option value="">Select project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="label">Severity</label>
            <select className="input" value={form.severity} onChange={set('severity')}>
              {['low', 'medium', 'high', 'critical'].map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="label">Bug Title</label>
          <input
            className="input"
            value={form.title}
            onChange={set('title')}
            required
            placeholder="E.g. Authentication token expires prematurely"
          />
        </div>
        
        <div className="space-y-1">
          <label className="label">Description</label>
          <textarea
            className="input"
            rows={2}
            value={form.description}
            onChange={set('description')}
            required
            placeholder="Describe the issue in detail..."
          />
        </div>
        
        <div className="space-y-1">
          <label className="label">Steps to Reproduce</label>
          <textarea
            className="input"
            rows={3}
            value={form.stepsToReproduce}
            onChange={set('stepsToReproduce')}
            placeholder="1. Go to Login&#13;2. Enter credentials&#13;3. Observe..."
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="label">Expected Result</label>
            <textarea
              className="input"
              rows={2}
              value={form.expectedResult}
              onChange={set('expectedResult')}
              placeholder="What should have happened..."
            />
          </div>
          <div className="space-y-1">
            <label className="label">Actual Result</label>
            <textarea
              className="input"
              rows={2}
              value={form.actualResult}
              onChange={set('actualResult')}
              placeholder="What actually happened..."
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="label">Testing Environment</label>
          <input
            className="input"
            placeholder="E.g. Chrome 126 / Windows 11"
            value={form.environment}
            onChange={set('environment')}
          />
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t mt-6">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit Report'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
