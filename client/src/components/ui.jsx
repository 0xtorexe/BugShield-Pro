import React from 'react';
import { X, Loader2, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export function Badge({ className = '', children, ...props }) {
  return (
    <span
      className={cn(
        "badge border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function Spinner({ label = 'Loading…', className = '' }) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-muted-foreground", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="mt-3 text-sm font-medium">{label}</span>
    </div>
  );
}

export function EmptyState({ title, subtitle, icon: Icon = Info, className = '' }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-16 px-4 border border-dashed rounded-lg bg-card text-muted-foreground", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="mt-4 font-semibold text-foreground">{title}</p>
      {subtitle && <p className="text-sm mt-1 max-w-sm">{subtitle}</p>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null;

  // Handle escape key to close
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-all duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-lg border bg-background text-foreground shadow-lg animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col z-10",
          width
        )}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold leading-none tracking-tight">{title}</h3>
          <button
            className="rounded-sm opacity-75 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none text-muted-foreground hover:bg-accent hover:text-accent-foreground p-1"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

export function StatCard({ label, value, accent = 'text-primary', icon: Icon }) {
  return (
    <div className="card p-6 flex flex-row items-center justify-between space-y-0 pb-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className={cn("text-2xl font-bold tracking-tight", accent)}>{value}</p>
      </div>
      {Icon && (
        <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

export function ProgressBar({ value, className = '' }) {
  const percentage = Math.min(Math.max(value, 0), 100);
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <div
        className="h-full bg-primary transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
