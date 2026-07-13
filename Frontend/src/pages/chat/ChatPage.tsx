import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Phone, Video, Loader2, MessageCircle, AlertCircle } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { getProfileById } from '../../api/services/profileService';
import { getConversations, getMessages } from '../../api/services/chatService';
import { useSocket } from '../../context/SocketContext';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface ChatMsg {
  _id?: string;
  id?: string;
  sender: string | { _id: string; name: string };
  receiver?: string;
  content: string;
  createdAt?: string;
  timestamp?: string;
}

export const ChatPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatPartner, setChatPartner] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch conversations list
  const { data: conversationsData } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    enabled: !!currentUser,
  });

  // Fetch chat partner profile
  useEffect(() => {
    if (!userId) return;
    getProfileById(userId)
      .then((res) => {
        if (res?.data?.user) {
          setChatPartner({
            id: res.data.user._id || res.data.user.id,
            name: res.data.user.name,
            avatarUrl: res.data.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(res.data.user.name)}&background=random`,
            isOnline: res.data.user.isOnline || false,
          });
        }
      })
      .catch(() => {
        setChatPartner({ id: userId, name: 'Collaborator', avatarUrl: `https://ui-avatars.com/api/?name=User&background=random`, isOnline: false });
      });
  }, [userId]);

  // Fetch existing messages from backend
  useEffect(() => {
    if (!userId || !currentUser) return;
    getMessages(userId)
      .then((res) => {
        setMessages(res?.data || []);
      })
      .catch(() => setMessages([]));
  }, [userId, currentUser]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleReceive = (msg: ChatMsg) => {
      const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
      // Only append if it's from the person we're currently chatting with
      if (senderId === userId) {
        setMessages(prev => [...prev, msg]);
      }
    };

    const handleTyping = (data: { senderId: string; isTyping: boolean }) => {
      if (data.senderId === userId) setPartnerTyping(data.isTyping);
    };

    socket.on('message-received', handleReceive);
    socket.on('typing-received', handleTyping);

    return () => {
      socket.off('message-received', handleReceive);
      socket.off('typing-received', handleTyping);
    };
  }, [socket, userId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !userId) return;

    const content = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    if (socket) {
      socket.emit('send-message', { receiverId: userId, content }, (res: any) => {
        setIsSending(false);
        if (res?.success && res.message) {
          setMessages(prev => [...prev, res.message]);
        } else {
          toast.error(res?.error || 'Message failed to send');
        }
      });
    } else {
      setIsSending(false);
      toast.error('Not connected to chat server. Please refresh.');
    }
  };

  const handleTyping = () => {
    if (!socket || !userId) return;
    socket.emit('typing', { receiverId: userId, isTyping: true });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket?.emit('typing', { receiverId: userId, isTyping: false });
    }, 2000);
  };

  const handleStartCall = (type: 'video' | 'audio') => {
    if (!currentUser || !userId || !chatPartner) return;
    const roomId = [currentUser.id, userId].sort().join('_');
    
    // Emit call invite via socket
    if (socket) {
      socket.emit('call-invite', {
        calleeId: userId,
        roomId,
        callType: type,
        callerName: currentUser.name,
        callerAvatar: currentUser.avatarUrl,
      });
      toast.success(`Calling ${chatPartner.name}...`);
    }
    navigate(`/room/${roomId}`);
  };

  const conversations: any[] = conversationsData?.data || [];
  const senderId = currentUser?.id;

  const isMyMessage = (msg: ChatMsg) => {
    const sid = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
    return sid === senderId;
  };

  if (!currentUser) return null;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white border border-gray-200 rounded-xl overflow-hidden animate-fade-in">
      {/* Conversations sidebar */}
      <div className="hidden md:flex md:flex-col w-72 border-r border-gray-100 bg-gray-50">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No conversations yet</div>
          ) : (
            conversations.map((conv: any) => {
              const other = conv.participantDetails?.find((p: any) => p._id !== currentUser.id) || conv.participantDetails?.[0];
              if (!other) return null;
              return (
                <button
                  key={conv._id || conv.conversationId}
                  onClick={() => navigate(`/chat/${other._id}`)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                    userId === other._id ? 'bg-purple-50 border border-purple-100' : 'hover:bg-gray-100'
                  }`}
                >
                  <Avatar
                    src={other.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(other.name)}&background=random`}
                    alt={other.name}
                    size="sm"
                    status={other.isOnline ? 'online' : 'offline'}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{other.name}</p>
                    <p className="text-xs text-gray-500 truncate">{conv.lastMessage?.content || 'No messages'}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {chatPartner ? (
          <>
            {/* Header */}
            <div className="border-b border-gray-100 p-4 flex justify-between items-center bg-white shadow-sm">
              <div className="flex items-center gap-3">
                <Avatar src={chatPartner.avatarUrl} alt={chatPartner.name} size="md" status={chatPartner.isOnline ? 'online' : 'offline'} />
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{chatPartner.name}</h2>
                  <p className="text-xs text-gray-400">
                    {partnerTyping ? (
                      <span className="text-purple-500 animate-pulse">typing...</span>
                    ) : chatPartner.isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="rounded-full p-2" aria-label="Audio call" onClick={() => handleStartCall('audio')}>
                  <Phone size={18} />
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full p-2" aria-label="Video call" onClick={() => handleStartCall('video')}>
                  <Video size={18} />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <MessageCircle size={40} className="mb-3 text-gray-300" />
                  <p className="font-medium text-gray-500">Start the conversation</p>
                  <p className="text-sm mt-1">Say hello to {chatPartner.name}</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const mine = isMyMessage(msg);
                  return (
                    <div key={msg._id || msg.id || idx} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      {!mine && (
                        <Avatar src={chatPartner.avatarUrl} alt={chatPartner.name} size="xs" className="mr-2 mt-1 flex-shrink-0" />
                      )}
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                          mine
                            ? 'bg-purple-600 text-white rounded-br-sm'
                            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
                        }`}
                      >
                        <p className="leading-relaxed break-words">{msg.content}</p>
                        {(msg.createdAt || msg.timestamp) && (
                          <p className={`text-xs mt-1 ${mine ? 'text-purple-200' : 'text-gray-400'}`}>
                            {new Date(msg.createdAt || msg.timestamp!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 p-4 bg-white">
              <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                <Input
                  type="text"
                  placeholder={`Message ${chatPartner.name}...`}
                  value={newMessage}
                  onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                  fullWidth
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newMessage.trim() || isSending}
                  className="rounded-xl px-4 h-10 flex items-center justify-center"
                  aria-label="Send message"
                >
                  {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-4 text-gray-400">
            <MessageCircle size={48} className="mb-4 text-gray-300" />
            <h2 className="text-xl font-medium text-gray-600">Select a conversation</h2>
            <p className="text-sm mt-1">Choose a contact from the sidebar to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};