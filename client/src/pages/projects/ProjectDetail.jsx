import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, User, Tag, Calendar, Users, Bug, Trash2, Plus } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Spinner, Badge, ProgressBar, EmptyState } from '../../components/ui';
import { roleStyle, severityStyle, statusStyle, titleCase, formatDate } from '../../lib/ui';
import { cn } from '../../lib/utils';

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [bugs, setBugs] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [addForm, setAddForm] = useState({ userId: '', roleInProject: 'developer' });

  const canManage = user.role === 'admin' || (user.role === 'manager' && project?.managerId === user.id);

  const load = useCallback(async () => {
    const [{ data: p }, { data: b }] = await Promise.all([
      api.get(`/projects/${id}`),
      api.get('/bugs', { params: { projectId: id } }),
    ]);
    setProject(p.data);
    setBugs(b.data);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (['admin', 'manager'].includes(user.role)) {
      api.get('/users', { params: { status: 'approved' } }).then((r) => setDirectory(r.data.data));
    }
  }, [user.role]);

  const addMember = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/projects/${id}/members`, { userId: Number(addForm.userId), roleInProject: addForm.roleInProject });
      toast.success('Member added successfully');
      setAddForm({ userId: '', roleInProject: 'developer' });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeMember = async (userId) => {
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      toast.success('Member removed');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const archive = async () => {
    try {
      await api.patch(`/projects/${id}/${project.status === 'active' ? 'archive' : 'restore'}`);
      toast.success(project.status === 'active' ? 'Project archived' : 'Project restored');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (!project) return <Spinner />;

  const members = project.projectMembers || [];
  const assignable = directory.filter((u) => ['developer', 'tester', 'manager'].includes(u.role));

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{project.name}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">{project.description || 'No description provided.'}</p>
        </div>
        {user.role === 'admin' && (
          <button
            className={cn(
              "btn border shrink-0",
              project.status === 'active'
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
            )}
            onClick={archive}
          >
            {project.status === 'active' ? 'Archive Project' : 'Restore Project'}
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="card p-5 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            Manager
          </p>
          <p className="font-semibold text-foreground truncate">{project.manager?.name || 'Unassigned'}</p>
        </div>
        <div className="card p-5 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Tag className="h-3.5 w-3.5" />
            Category
          </p>
          <p className="font-semibold text-foreground truncate">{project.category || '—'}</p>
        </div>
        <div className="card p-5 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Deadline
          </p>
          <p className="font-semibold text-foreground">{formatDate(project.deadline)}</p>
        </div>
        <div className="card p-5 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Progress</span>
            <span className="text-foreground font-bold">{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} className="mt-1" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Team Members List */}
        <div className="card p-6 lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-muted-foreground" />
              Team Directory ({members.length})
            </h3>
            
            <div className="space-y-3">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/10 transition-colors">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground leading-none">{m.user?.name}</p>
                    <Badge className={cn("border font-normal text-[10px] py-0 px-1.5 mt-1", roleStyle[m.user?.role])}>
                      {titleCase(m.roleInProject)}
                    </Badge>
                  </div>
                  {canManage && m.roleInProject !== 'manager' && (
                    <button
                      className="text-xs text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 rounded p-1 transition-all"
                      onClick={() => removeMember(m.userId)}
                      title="Remove Member"
                      aria-label="Remove Member"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {members.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No members assigned to this team.</p>}
            </div>
          </div>

          {canManage && (
            <form onSubmit={addMember} className="mt-6 space-y-3 border-t pt-6">
              <p className="text-sm font-semibold text-foreground">Add Team Member</p>
              <div className="space-y-2">
                <select
                  className="input"
                  value={addForm.userId}
                  onChange={(e) => setAddForm({ ...addForm, userId: e.target.value })}
                  required
                >
                  <option value="">Select user…</option>
                  {assignable.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
                
                <select
                  className="input"
                  value={addForm.roleInProject}
                  onChange={(e) => setAddForm({ ...addForm, roleInProject: e.target.value })}
                >
                  <option value="developer">Developer</option>
                  <option value="tester">Tester</option>
                </select>
              </div>
              
              <button className="btn-primary w-full">
                <Plus className="h-4 w-4 mr-1" />
                Add Member
              </button>
            </form>
          )}
        </div>

        {/* Project Bugs List */}
        <div className="card lg:col-span-2 overflow-hidden border">
          <div className="border-b bg-muted/20 px-6 py-4 flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
              <Bug className="h-4 w-4 text-muted-foreground" />
              Related Bugs Queue ({bugs.length})
            </h3>
            <Badge className="font-normal">{bugs.length} reported</Badge>
          </div>
          {bugs.length === 0 ? (
            <EmptyState title="No bugs reported" subtitle="There are no bugs logged for this project." icon={Bug} />
          ) : (
            <div className="divide-y">
              {bugs.map((b) => (
                <Link key={b.id} to={`/bugs/${b.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-accent/40 transition-colors">
                  <span className="font-semibold text-sm text-foreground hover:underline">{b.title}</span>
                  <div className="flex gap-2">
                    <Badge className={cn("border font-medium text-[10px] capitalize", severityStyle[b.severity])}>{b.severity}</Badge>
                    <Badge className={cn("border font-medium text-[10px] capitalize", statusStyle[b.status])}>{titleCase(b.status)}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
