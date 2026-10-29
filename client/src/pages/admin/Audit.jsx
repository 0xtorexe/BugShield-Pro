import { useEffect, useState } from 'react';
import { History, ShieldAlert, Activity } from 'lucide-react';
import api from '../../api/client';
import { Spinner, Badge, EmptyState } from '../../components/ui';
import { roleStyle, titleCase, formatDateTime } from '../../lib/ui';
import { cn } from '../../lib/utils';

export default function Audit() {
  const [tab, setTab] = useState('audit');
  const [audit, setAudit] = useState(null);
  const [logins, setLogins] = useState(null);

  useEffect(() => {
    api.get('/analytics/audit').then((r) => setAudit(r.data.data));
    api.get('/analytics/logins').then((r) => setLogins(r.data.data));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShieldAlert className="h-8 w-8 text-primary" />
          Audit & Security Logs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review system activities, changes, and authentication logs.
        </p>
      </div>

      {/* Tab Switcher (Shadcn Tabs structure) */}
      <div className="flex bg-muted p-1 rounded-lg max-w-fit">
        {[
          { key: 'audit', label: 'Activity Log', icon: Activity },
          { key: 'logins', label: 'Login History', icon: History }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-medium transition-all",
              tab === key
                ? "bg-background text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:bg-background/40 hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {tab === 'audit' ? (
        audit === null ? <Spinner /> : (
          <div className="card overflow-hidden border">
            <div className="border-b bg-muted/20 px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm">System Activity Audit Log</h3>
              <Badge className="font-normal">{audit.length} records</Badge>
            </div>
            {audit.length === 0 ? (
              <EmptyState title="No activity recorded" subtitle="There are no system actions in the log yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
                    <tr>
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Action Type</th>
                      <th className="px-6 py-4">Target Entity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-foreground/90">
                    {audit.map((a) => (
                      <tr key={a.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(a.createdAt)}</td>
                        <td className="px-6 py-4 font-medium">{a.user ? a.user.name : <span className="text-muted-foreground font-normal">System</span>}</td>
                        <td className="px-6 py-4">
                          <Badge className="border bg-background font-mono text-[11px] font-medium text-foreground">
                            {a.action}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {a.entityType ? (
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                              {a.entityType} #{a.entityId ?? ''}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      ) : (
        logins === null ? <Spinner /> : (
          <div className="card overflow-hidden border">
            <div className="border-b bg-muted/20 px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm">User Login & Access History</h3>
              <Badge className="font-normal">{logins.length} attempts</Badge>
            </div>
            {logins.length === 0 ? (
              <EmptyState title="No login history" subtitle="No user authentication sessions recorded yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
                    <tr>
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Access Role</th>
                      <th className="px-6 py-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-foreground/90">
                    {logins.map((l) => (
                      <tr key={l.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(l.loginAt)}</td>
                        <td className="px-6 py-4 font-semibold text-foreground">
                          {l.user ? l.user.name : <span className="text-muted-foreground font-normal">#{l.userId}</span>}
                        </td>
                        <td className="px-6 py-4">
                          {l.user && (
                            <Badge className={cn("border font-medium", roleStyle[l.user.role])}>
                              {titleCase(l.user.role)}
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{l.ipAddress || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
