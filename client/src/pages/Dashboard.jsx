import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Folder,
  Bug,
  CheckCircle2,
  UserCheck,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  ClipboardList,
  ChevronRight
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Spinner, StatCard, EmptyState, ProgressBar, Badge } from '../components/ui';
import { severityStyle, statusStyle, titleCase } from '../lib/ui';
import { cn } from '../lib/utils';

const SEVERITY_COLORS = {
  low: '#94a3b8',      // slate-400
  medium: '#eab308',   // yellow-500
  high: '#f97316',     // orange-500
  critical: '#ef4444'  // red-500
};

// Admin & Manager get the analytics dashboard; developers/testers get task lists.
export default function Dashboard() {
  const { user } = useAuth();
  if (['admin', 'manager'].includes(user.role)) return <ManagementDashboard />;
  return <WorkerDashboard />;
}

function ManagementDashboard() {
  const [data, setData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [velocity, setVelocity] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/overview'),
      api.get('/analytics/projects'),
      api.get('/analytics/velocity'),
    ]).then(([o, p, v]) => {
      setData(o.data.data);
      setProjects(p.data.data);
      setVelocity(v.data.data);
    });
  }, []);

  if (!data) return <Spinner />;

  const { counts, byStatus, bySeverity } = data;
  const severityData = Object.entries(bySeverity).map(([name, value]) => ({ name: titleCase(name), value }));
  const statusData = Object.entries(byStatus).map(([name, value]) => ({ name: titleCase(name), value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Projects"
          value={counts.totalProjects}
          icon={Folder}
          accent="text-foreground"
        />
        <StatCard
          label="Open Bugs"
          value={counts.openBugs}
          icon={Bug}
          accent="text-destructive"
        />
        <StatCard
          label="Resolution Rate"
          value={`${counts.resolutionRate}%`}
          icon={CheckCircle2}
          accent="text-emerald-600 dark:text-emerald-500"
        />
        <StatCard
          label="Pending Approvals"
          value={counts.pendingUsers}
          icon={UserCheck}
          accent="text-amber-600 dark:text-amber-500"
        />
      </div>

      {/* Main Charts */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="card p-6 md:col-span-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Bugs by Status
            </h3>
          </div>
          <div className="h-[260px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <XAxis dataKey="name" fontSize={11} stroke="#888888" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} fontSize={11} stroke="#888888" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" fill="currentColor" className="text-primary" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6 md:col-span-3 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
              <PieChartIcon className="h-4 w-4 text-muted-foreground" />
              Bugs by Severity
            </h3>
          </div>
          <div className="h-[260px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" outerRadius={75} labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {severityData.map((s) => (
                    <Cell key={s.name} fill={SEVERITY_COLORS[s.name.toLowerCase()] || '#6366f1'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Progress & Velocity */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              Project Progress
            </h3>
          </div>
          {projects.length === 0 ? (
            <EmptyState title="No projects yet" />
          ) : (
            <div className="space-y-4">
              {projects.map((p) => (
                <div key={p.id} className="space-y-2 border-b last:border-0 pb-3 last:pb-0">
                  <div className="flex justify-between text-sm">
                    <Link to={`/projects/${p.id}`} className="font-semibold text-foreground hover:underline">
                      {p.name}
                    </Link>
                    <span className="text-muted-foreground">
                      {p.resolvedBugs}/{p.totalBugs} Resolved · <span className="font-medium text-foreground">{p.progress}%</span>
                    </span>
                  </div>
                  <ProgressBar value={p.progress} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Team Velocity (resolutions)
            </h3>
          </div>
          {velocity.length === 0 ? (
            <EmptyState title="No resolutions yet" />
          ) : (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={velocity} layout="vertical">
                  <XAxis type="number" allowDecimals={false} fontSize={11} stroke="#888888" tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={110} fontSize={11} stroke="#888888" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                  />
                  <Bar dataKey="resolved" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkerDashboard() {
  const { user } = useAuth();
  const [bugs, setBugs] = useState(null);

  useEffect(() => {
    api.get('/bugs').then((r) => setBugs(r.data.data));
  }, []);

  if (!bugs) return <Spinner />;

  const isDev = user.role === 'developer';
  const active = bugs.filter((b) => !['closed'].includes(b.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {isDev ? 'My Task Dashboard' : 'My Bugs & Verifications'}
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Assigned / Reported"
          value={bugs.length}
          icon={ClipboardList}
          accent="text-foreground"
        />
        <StatCard
          label="Active"
          value={active.length}
          icon={Bug}
          accent="text-amber-600 dark:text-amber-500"
        />
        <StatCard
          label="In Progress"
          value={bugs.filter((b) => b.status === 'in_progress').length}
          icon={TrendingUp}
          accent="text-blue-600 dark:text-blue-500"
        />
        <StatCard
          label="Resolved / Verified"
          value={bugs.filter((b) => ['resolved', 'verified', 'closed'].includes(b.status)).length}
          icon={CheckCircle2}
          accent="text-emerald-600 dark:text-emerald-500"
        />
      </div>

      {/* Tasks Queue Card */}
      <div className="card overflow-hidden">
        <div className="border-b bg-muted/30 px-6 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">
            {isDev ? 'Assigned Bug Queue' : 'Your Reported Bugs'}
          </h3>
          <Badge className="font-normal">{bugs.length} total</Badge>
        </div>
        {bugs.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            subtitle={isDev ? 'No bugs assigned to you.' : 'You have not reported any bugs.'}
          />
        ) : (
          <div className="divide-y">
            {bugs.map((b) => (
              <Link
                key={b.id}
                to={`/bugs/${b.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-accent/40 transition-colors"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-foreground hover:underline flex items-center gap-1.5">
                    {b.title}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Folder className="h-3.5 w-3.5" />
                    {b.project?.name}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={cn("capitalize border font-medium", severityStyle[b.severity])}>
                    {b.severity}
                  </Badge>
                  <Badge className={cn("capitalize border font-medium", statusStyle[b.status])}>
                    {titleCase(b.status)}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
