import React, { useEffect, useState, useCallback } from 'react';
import { Bell, MessageCircle, UserPlus, DollarSign, Calendar, Loader2, CheckCheck, Handshake, Trash2 } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { getNotifications, markAsRead, markAllAsRead } from '../../api/services/notificationService';
import { useDispatch } from 'react-redux';
import { resetUnreadCount } from '../../redux/slices/notificationSlice';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    _id: string;
    name: string;
    avatarUrl: string;
  };
  metadata?: Record<string, unknown>;
}

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const dispatch = useDispatch();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getNotifications();
      setNotifications(res.data || []);
      // Reset sidebar badge when page is opened
      dispatch(resetUnreadCount());
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_message':
        return <MessageCircle size={16} className="text-blue-500" />;
      case 'meeting_request':
      case 'meeting_accepted':
      case 'meeting_rejected':
        return <Calendar size={16} className="text-purple-500" />;
      case 'collaborate_request':
        return <UserPlus size={16} className="text-green-500" />;
      case 'payment_update':
      case 'new_deal':
      case 'deal_update':
        return <DollarSign size={16} className="text-amber-500" />;
      case 'document_uploaded':
        return <Handshake size={16} className="text-indigo-500" />;
      case 'call_invitation':
        return <span className="text-base">📞</span>;
      default:
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'new_message': return 'primary';
      case 'meeting_request': return 'secondary';
      case 'collaborate_request': return 'success';
      case 'payment_update': return 'accent';
      default: return 'gray';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 size={32} className="animate-spin text-purple-500" />
        <p className="text-gray-500 text-sm">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-0.5">
            {unreadCount > 0 ? (
              <span><span className="text-purple-600 font-semibold">{unreadCount} unread</span> · {notifications.length} total</span>
            ) : (
              `${notifications.length} total notifications`
            )}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            leftIcon={markingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
          >
            {markingAll ? 'Marking...' : 'Mark all read'}
          </Button>
        )}
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Bell size={36} className="text-gray-300" />
          </div>
          <h2 className="text-xl font-semibold text-gray-700">All caught up!</h2>
          <p className="text-gray-400 mt-2 text-sm">No notifications yet. They'll appear here when you get them.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notification => (
            <Card
              key={notification._id}
              className={`transition-all duration-200 cursor-pointer hover:shadow-md ${
                !notification.isRead
                  ? 'bg-purple-50 border-l-4 border-l-purple-500'
                  : 'border-l-4 border-l-transparent'
              }`}
              onClick={() => !notification.isRead && handleMarkAsRead(notification._id)}
            >
              <CardBody className="flex items-start p-4 gap-4">
                {/* Avatar */}
                {notification.sender ? (
                  <Avatar
                    src={notification.sender.avatarUrl}
                    alt={notification.sender.name}
                    size="md"
                    className="flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Bell size={18} className="text-gray-400" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {notification.sender && (
                      <span className="font-semibold text-gray-900 text-sm">
                        {notification.sender.name}
                      </span>
                    )}
                    <span className="font-medium text-gray-800 text-sm">{notification.title}</span>
                    {!notification.isRead && (
                      <Badge variant="primary" size="sm" rounded>New</Badge>
                    )}
                  </div>

                  <p className="text-gray-600 mt-1 text-sm leading-relaxed">
                    {notification.message}
                  </p>

                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    {getNotificationIcon(notification.type)}
                    <span className="capitalize">{notification.type.replace(/_/g, ' ')}</span>
                    <span>·</span>
                    <span>
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Unread dot */}
                {!notification.isRead && (
                  <div className="w-2.5 h-2.5 bg-purple-500 rounded-full flex-shrink-0 mt-1" />
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};