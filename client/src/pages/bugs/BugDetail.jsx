import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  Calendar,
  User,
  Activity,
  FileText,
  CheckCircle2,
  MessageSquare,
  Clock,
  ArrowRight,
  ShieldCheck,
  Send,
  AlertCircle
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Spinner, Badge, Modal, EmptyState } from '../../components/ui';
import { severityStyle, statusStyle, roleStyle, titleCase, formatDateTime, nextStatuses } from '../../lib/ui';
import { cn } from '../../lib/utils';

export default function BugDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [bug, setBug] = useState(null);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [comment, setComment] = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [showResolve, setShowResolve] = useState(false);

  const load = useCallback(async () => {
    const [{ data: b }, { data: c }, { data: h }] = await Promise.all([
      api.get(`/bugs/${id}`),
      api.get(`/bugs/${id}/comments`),
      api.get(`/bugs/${id}/history`),
    ]);
    setBug(b.data);
    setComments(c.data);
    setHistory(h.data);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (!bug) return <Spinner />;

  const isManager = user.role === 'admin' || user.role === 'manager';
  const isAssignedDev = bug.developers?.some((d) => d.id === user.id);
  const isTester = bug.assignment?.tester?.id === user.id || bug.reporter?.id === user.id;

  const changeStatus = async (status) => {
    if (status === 'resolved') { setShowResolve(true); return; }
    try {
      await api.patch(`/bugs/${id}/status`, { status });
      toast.success(`Status updated to ${titleCase(status)}`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await api.post(`/bugs/${id}/comments`, { content: comment });
      setComment('');
      const { data } = await api.get(`/bugs/${id}/comments`);
      setComments(data.data);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Which transitions can this user trigger?
  const available = (nextStatuses[bug.status] || []).filter((s) => {
    if (['in_progress', 'resolved'].includes(s)) return isAssignedDev || isManager;
    if (['verified', 'reopened'].includes(s)) return isTester || isManager;
    if (s === 'assigned') return isManager;
    if (s === 'closed') return isTester || isManager;
    return false;
  });

  return (
    <div className="space-y-6">
      {/* Back & Breadcrumbs */}
      <div className="space-y-2">
        <Link to="/bugs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to Registry
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{bug.title}</h1>
              <Badge className={cn("border font-medium text-[10px] capitalize", severityStyle[bug.severity])}>
                {bug.severity}
              </Badge>
              <Badge className={cn("border font-medium text-[10px] capitalize", statusStyle[bug.status])}>
                {titleCase(bug.status)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Project:{' '}
              <Link to={`/projects/${bug.project?.id}`} className="text-foreground hover:underline font-semibold">
                {bug.project?.name}
              </Link>{' '}
              · Reported by <span className="font-semibold text-foreground">{bug.reporter?.name}</span>
            </p>
          </div>
          
          {/* Action buttons bar */}
          <div className="flex flex-wrap items-center gap-2">
            {isManager && (
              <button className="btn-primary text-xs h-8" onClick={() => setShowAssign(true)}>
                Assign Team
              </button>
            )}
            {available.map((s) => (
              <button
                key={s}
                className={cn(
                  "btn h-8 text-xs border transition-colors",
                  s === 'resolved'
                    ? "bg-emerald-600 text-white hover:bg-emerald-600/90 border-transparent"
                    : "btn-secondary"
                )}
                onClick={() => changeStatus(s)}
              >
                Move to {titleCase(s)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: detailed reports */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description Section */}
          <Section title="Problem Description" icon={AlertCircle}>
            {bug.description}
          </Section>
          
          {/* Steps to Reproduce */}
          <Section title="Steps to Reproduce" icon={Activity}>
            {bug.stepsToReproduce}
          </Section>

          {/* Results Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Section title="Expected Outcome" icon={ShieldCheck}>
              {bug.expectedResult}
            </Section>
            <Section title="Actual Outcome" icon={AlertCircle}>
              {bug.actualResult}
            </Section>
          </div>
          
          {/* Environment */}
          <Section title="Test Environment" icon={FileText}>
            {bug.environment}
          </Section>

          {/* Resolution report card */}
          {bug.resolutions?.length > 0 && (
            <div className="card border-emerald-500/20 bg-emerald-500/5 p-6 space-y-4">
              <h3 className="text-base font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                Resolution Report
              </h3>
              {bug.resolutions.map((r) => (
                <div key={r.id} className="space-y-3 text-sm border-t border-emerald-500/10 pt-3 first:border-t-0 first:pt-0">
                  <p className="text-[11px] text-muted-foreground">
                    Logged by <span className="font-semibold text-foreground">{r.developer?.name}</span> · {formatDateTime(r.createdAt)}
                  </p>
                  <div className="grid gap-2 border rounded-md p-3 bg-background">
                    <Field label="Resolution Summary" value={r.description} />
                    <Field label="Root Cause Analysis" value={r.rootCause} />
                    <Field label="Code Changes" value={r.codeChangeSummary} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comments Feed */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Activity Discussion ({comments.length})
            </h3>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No discussions yet. Type below to write a comment.</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg border p-4 bg-muted/20 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{c.author?.name}</span>
                    <span className="text-muted-foreground">{formatDateTime(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                </div>
              ))}
            </div>
            
            <form onSubmit={postComment} className="mt-4 flex gap-2">
              <input
                className="input"
                placeholder="Post an update or detail comment…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button className="btn-primary h-9 flex items-center justify-center shrink-0">
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Sidebar: configuration, assignments & actions log */}
        <div className="space-y-6">
          {/* Assignments Panel */}
          <div className="card p-6 space-y-4">
            <h3 className="text-base font-semibold text-foreground">Ownership & Assignment</h3>
            
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Assigned Developers</p>
                {bug.developers?.length ? (
                  <div className="space-y-1.5">
                    {bug.developers.map((d) => (
                      <div key={d.id} className="flex items-center justify-between border rounded-md p-2 bg-muted/10">
                        <span className="text-xs font-medium text-foreground">{d.name}</span>
                        <Badge className="border bg-background font-normal text-[9px] py-0 px-1 border-purple-500/20 text-purple-700 dark:text-purple-400">
                          Dev
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No developers assigned yet.</p>
                )}
              </div>
              
              <div className="space-y-1.5 border-t pt-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Assigned QA Tester</p>
                {bug.assignment?.tester ? (
                  <div className="flex items-center justify-between border rounded-md p-2 bg-muted/10">
                    <span className="text-xs font-medium text-foreground">{bug.assignment.tester.name}</span>
                    <Badge className="border bg-background font-normal text-[9px] py-0 px-1 border-teal-500/20 text-teal-700 dark:text-teal-400">
                      QA
                    </Badge>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No verifying tester assigned.</p>
                )}
              </div>
            </div>
          </div>

          {/* History Timeline */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-foreground mb-4">Activity Log</h3>
            {history.length === 0 ? (
              <EmptyState title="No changes recorded" icon={Clock} />
            ) : (
              <ol className="relative border-l border-border pl-4 space-y-4 text-xs">
                {history.map((h) => (
                  <li key={h.id} className="space-y-1">
                    <span className="absolute -left-[6px] top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-border" />
                    <p className="font-semibold text-foreground capitalize leading-none">{titleCase(h.action)}</p>
                    {h.newValue && (
                      <p className="text-muted-foreground text-[10px] py-0.5 font-mono">
                        {h.oldValue ? `${h.oldValue} → ` : ''}
                        {h.newValue}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/80">
                      by {h.changer?.name || 'System'} · {formatDateTime(h.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      <AssignModal open={showAssign} bug={bug} onClose={() => setShowAssign(false)} onDone={() => { setShowAssign(false); load(); }} />
      <ResolveModal open={showResolve} bugId={id} onClose={() => setShowResolve(false)} onDone={() => { setShowResolve(false); load(); }} />
    </div>
  );
}

function Section({ title, children, icon: Icon }) {
  return (
    <div className="card p-6 space-y-2">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {title}
      </h3>
      <p className="whitespace-pre-wrap text-sm text-foreground/80 leading-relaxed">
        {children || <span className="text-muted-foreground italic">No details logged.</span>}
      </p>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="text-xs">
      <span className="font-semibold text-foreground block">{label}</span>
      <span className="text-muted-foreground leading-relaxed mt-0.5 block">{value}</span>
    </div>
  );
}

function AssignModal({ open, onClose, onDone, bug }) {
  const [team, setTeam] = useState({ developers: [], testers: [] });
  const [devIds, setDevIds] = useState([]);
  const [testerId, setTesterId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !bug) return;
    api.get(`/projects/${bug.project.id}`).then((r) => {
      const members = r.data.data.projectMembers || [];
      setTeam({
        developers: members.filter((m) => m.user?.role === 'developer').map((m) => m.user),
        testers: members.filter((m) => m.user?.role === 'tester').map((m) => m.user),
      });
    });
    setDevIds(bug.developers?.map((d) => d.id) || []);
    setTesterId(bug.assignment?.tester?.id || '');
  }, [open, bug]);

  const toggleDev = (id) => setDevIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async (e) => {
    e.preventDefault();
    if (devIds.length === 0) { toast.error('Select at least one developer'); return; }
    setBusy(true);
    try {
      await api.post(`/bugs/${bug.id}/assign`, { developerIds: devIds, testerId: testerId ? Number(testerId) : null });
      toast.success('Bug assignment updated successfully');
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Assign Project Staff">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <label className="label">Developers (multiple selection)</label>
          <div className="space-y-2 rounded-md border p-3 bg-muted/10 max-h-40 overflow-y-auto">
            {team.developers.length === 0 && <p className="text-xs text-muted-foreground italic">No developers associated with this project team.</p>}
            {team.developers.map((d) => (
              <label key={d.id} className="flex items-center gap-2 text-sm text-foreground/90 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                  checked={devIds.includes(d.id)}
                  onChange={() => toggleDev(d.id)}
                />
                {d.name}
              </label>
            ))}
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="label">Verifying QA Tester</label>
          <select className="input" value={testerId} onChange={(e) => setTesterId(e.target.value)}>
            <option value="">None / Unassigned</option>
            {team.testers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t mt-6">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Assigning…' : 'Save Assignment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ResolveModal({ open, onClose, onDone, bugId }) {
  const empty = { description: '', rootCause: '', codeChangeSummary: '' };
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.patch(`/bugs/${bugId}/status`, { status: 'resolved', ...form });
      toast.success('Resolution report logged successfully');
      setForm(empty);
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Log Bug Resolution Details">
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-800 dark:text-amber-500 leading-normal">
          All analysis and change summary fields are strictly mandatory to log a resolution status.
        </div>
        
        <div className="space-y-1">
          <label className="label">Resolution Summary</label>
          <textarea
            className="input"
            rows={2}
            value={form.description}
            onChange={set('description')}
            required
            placeholder="Explain how the bug was solved..."
          />
        </div>
        
        <div className="space-y-1">
          <label className="label">Root Cause Analysis</label>
          <textarea
            className="input"
            rows={2}
            value={form.rootCause}
            onChange={set('rootCause')}
            required
            placeholder="What was causing this issue?"
          />
        </div>
        
        <div className="space-y-1">
          <label className="label">Code Changes Summary</label>
          <textarea
            className="input"
            rows={2}
            value={form.codeChangeSummary}
            onChange={set('codeChangeSummary')}
            required
            placeholder="E.g. Modified token verification handler in auth middleware..."
          />
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t mt-6">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-success" disabled={busy}>
            {busy ? 'Submitting…' : 'Mark Resolved'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
