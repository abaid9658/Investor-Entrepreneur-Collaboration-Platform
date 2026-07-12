import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import toast from 'react-hot-toast';

interface SocketContextProps {
  socket: Socket | null;
  onlineUsers: Record<string, string>; // userId -> socketId / status
}

const SocketContext = createContext<SocketContextProps>({
  socket: null,
  onlineUsers: {}
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, string>>({});
  const { token, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    let s: Socket | null = null;
    
    if (isAuthenticated && token) {
      const baseUrl = import.meta.env.VITE_API_URL 
        ? import.meta.env.VITE_API_URL.replace('/api', '') 
        : 'http://localhost:5000';

      s = io(baseUrl, {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      setSocket(s);

      s.on('connect', () => {
        console.log('Connected to socket gateway');
      });

      // Status updates
      s.on('user-status', (data: { userId: string; status: string }) => {
        setOnlineUsers((prev) => ({
          ...prev,
          [data.userId]: data.status
        }));
      });

      // Notification listener: triggers browser toast alert
      s.on('notification-received', (notification: { title: string; message: string }) => {
        toast((t) => (
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-gray-900">{notification.title}</span>
            <span className="text-sm text-gray-600">{notification.message}</span>
          </div>
        ), {
          icon: '🔔',
          duration: 5000
        });
      });

      s.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });
    }

    return () => {
      if (s) {
        s.close();
        setSocket(null);
      }
    };
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
