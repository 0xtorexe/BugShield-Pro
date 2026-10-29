import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import api from '../api/client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.data);
      setUnread(data.meta.unread);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) socketRef.current.disconnect();
      socketRef.current = null;
      setNotifications([]);
      setUnread(0);
      return undefined;
    }

    refresh();

    const socket = io('/', { auth: { token: localStorage.getItem('token') } });
    socketRef.current = socket;

    socket.on('notification:new', (n) => {
      setNotifications((prev) => [n, ...prev]);
      setUnread((u) => u + 1);
      toast.info(n.message);
    });

    return () => socket.disconnect();
  }, [user, refresh]);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  };

  return (
    <SocketContext.Provider value={{ notifications, unread, markRead, markAllRead, refresh }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
