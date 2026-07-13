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

      // Incoming call notification — ring globally regardless of current page
      s.on('incoming-call', (data: { callerId: string; callerName: string; callerAvatar: string; roomId: string; callType: string }) => {
        toast(
          (t) => (
            <div className="flex flex-col gap-2 min-w-[240px]">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📞</span>
                <div>
                  <p className="font-semibold text-gray-900">{data.callerName} is calling...</p>
                  <p className="text-xs text-gray-500">{data.callType === 'video' ? '🎥 Video Call' : '🎤 Audio Call'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    s?.emit('call-response', { callerId: data.callerId, roomId: data.roomId, accepted: true });
                    window.location.href = `/room/${data.roomId}`;
                  }}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-1.5 rounded-lg transition-colors"
                >
                  ✅ Accept
                </button>
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    s?.emit('call-response', { callerId: data.callerId, roomId: data.roomId, accepted: false });
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-1.5 rounded-lg transition-colors"
                >
                  ❌ Decline
                </button>
              </div>
            </div>
          ),
          { duration: 30000, icon: undefined }
        );
      });

      // Call accepted — navigate to room
      s.on('call-accepted', (data: { calleeName: string; roomId: string }) => {
        toast.success(`${data.calleeName} accepted the call!`);
      });

      // Call rejected
      s.on('call-rejected', (data: { calleeName: string }) => {
        toast.error(`${data.calleeName} declined the call`);
      });

      // Meeting notification
      s.on('meeting-notification', (data: { type: string; message: string; meetingId?: string; startTime?: string }) => {
        toast(
          (t) => (
            <div className="flex flex-col gap-1" onClick={() => { toast.dismiss(t.id); window.location.href = '/meetings'; }}>
              <span className="font-semibold text-gray-900">📅 {data.type === 'new_meeting' ? 'New Meeting Invite' : 'Meeting Update'}</span>
              <span className="text-sm text-gray-600">{data.message}</span>
              {data.startTime && (
                <span className="text-xs text-gray-400">{new Date(data.startTime).toLocaleString()}</span>
              )}
              <span className="text-xs text-purple-600 font-medium cursor-pointer mt-1">Click to view meetings →</span>
            </div>
          ),
          { icon: '📅', duration: 8000 }
        );
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
