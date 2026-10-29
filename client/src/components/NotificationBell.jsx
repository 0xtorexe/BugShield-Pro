import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { formatDateTime } from '../lib/ui';
import { cn } from '../lib/utils';

export default function NotificationBell() {
  const { notifications, unread, markRead, markAllRead } = useSocket();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const onClick = async (n) => {
    if (!n.isRead) await markRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-md border bg-background transition-colors hover:bg-accent hover:text-accent-foreground",
          open && "bg-accent"
        )}
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-foreground" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                onClick={markAllRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-8 text-center text-muted-foreground">
                <Inbox className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-xs">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onClick(n)}
                  className={cn(
                    "block w-full px-4 py-3 text-left hover:bg-accent/50 transition-colors",
                    n.isRead ? "opacity-60" : "bg-accent/20 font-medium"
                  )}
                >
                  <p className="text-xs text-foreground leading-normal">{n.message}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
