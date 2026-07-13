import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageCircle, Loader2, Search } from 'lucide-react';
import { getConversations } from '../../api/services/chatService';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useDispatch } from 'react-redux';
import { resetUnreadMessages } from '../../redux/slices/notificationSlice';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface Participant {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
  isOnline?: boolean;
}

interface LastMessage {
  _id: string;
  content: string;
  sender: string;
  receiver: string;
  isRead: boolean;
  createdAt: string;
}

interface Conversation {
  conversationId: string;
  lastMessage: LastMessage;
  otherParticipant: Participant;
}

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userId: activeUserId } = useParams<{ userId: string }>();
  const dispatch = useDispatch();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getConversations();
      setConversations(res.data || []);
      dispatch(resetUnreadMessages());
    } catch {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  if (!user) return null;

  const filtered = conversations.filter(c =>
    c.otherParticipant?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage?.content?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-purple-500" />
          <p className="text-gray-500 text-sm">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Messages</h2>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {filtered.map(conv => {
              const other = conv.otherParticipant;
              const last = conv.lastMessage;
              const isActive = activeUserId === other?._id;
              const isUnread = last && !last.isRead && last.sender !== user.id;

              return (
                <div
                  key={conv.conversationId}
                  onClick={() => navigate(`/chat/${other._id}`)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-purple-50 border-l-4 border-l-purple-600'
                      : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar
                      src={other?.avatarUrl}
                      alt={other?.name || 'User'}
                      size="md"
                    />
                    {other?.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
                        {other?.name || 'Unknown User'}
                      </h3>
                      {last && (
                        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                          {formatDistanceToNow(new Date(last.createdAt), { addSuffix: false })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-0.5">
                      <p className={`text-xs truncate ${isUnread ? 'text-gray-900' : 'text-gray-500'}`}>
                        {last ? (
                          <>
                            {last.sender === user.id ? (
                              <span className="text-gray-400">You: </span>
                            ) : null}
                            {last.content}
                          </>
                        ) : (
                          <span className="text-gray-400 italic">No messages yet</span>
                        )}
                      </p>
                      {isUnread && (
                        <Badge variant="primary" size="sm" rounded className="ml-2 flex-shrink-0">New</Badge>
                      )}
                    </div>

                    <p className="text-[10px] text-gray-400 capitalize mt-0.5">{other?.role}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MessageCircle size={28} className="text-gray-300" />
            </div>
            <h2 className="text-lg font-medium text-gray-700">
              {search ? 'No results found' : 'No messages yet'}
            </h2>
            <p className="text-gray-400 text-sm mt-2">
              {search
                ? 'Try a different search term'
                : 'Start connecting with entrepreneurs and investors to begin conversations'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};