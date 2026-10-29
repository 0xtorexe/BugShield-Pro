import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Folder,
  Bug,
  FileText,
  Settings,
  Shield,
  LogOut, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { roleStyle, titleCase } from '../lib/ui';
import NotificationBell from './NotificationBell';
import { cn } from '../lib/utils';

// Navigation items keyed by the roles allowed to see them.
const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'developer', 'tester'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['admin'] },
  { to: '/projects', label: 'Projects', icon: Folder, roles: ['admin', 'manager', 'developer', 'tester'] },
  { to: '/bugs', label: 'Bugs', icon: Bug, roles: ['admin', 'manager', 'developer', 'tester'] },
  { to: '/audit', label: 'Audit & Logs', icon: FileText, roles: ['admin'] },
  { to: '/profile', label: 'Profile', icon: Settings, roles: ['admin', 'manager', 'developer', 'tester'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  const items = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center gap-2 px-6 border-b">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight text-foreground">BugShield Pro</span>
        </div>
        
        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </NavLink>
            );
          })}
        </nav>
        
        <div className="border-t p-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>v1.0 · Enterprise</span>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur px-6 py-3 sticky top-0 z-30">
          <div className="md:hidden flex items-center gap-2 text-lg font-bold">
            <Shield className="h-5 w-5 text-primary" />
            <span className="tracking-tight">BugShield</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <NotificationBell />
            
            <div className="flex items-center gap-3 border-l pl-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground leading-none">{user.name}</p>
                <span className={cn("badge mt-1 font-normal scale-90 origin-right border", roleStyle[user.role])}>
                  {titleCase(user.role)}
                </span>
              </div>
              
              {user.profilePicture ? (
                <img src={user.profilePicture} alt={user.name} className="h-8 w-8 rounded-full border object-cover shadow-sm" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground text-sm border shadow-sm">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>

                        <button
              onClick={toggleTheme}
              className="btn-secondary h-8 w-8 p-0 flex items-center justify-center"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={onLogout}
              className="btn-secondary h-8 w-8 p-0 flex items-center justify-center"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b bg-card px-4 py-2 md:hidden">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 p-6 overflow-y-auto max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
