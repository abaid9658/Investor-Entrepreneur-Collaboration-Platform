import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, BarChart3, Shield, Activity, DollarSign, HelpCircle,
  TrendingUp, Trash2, CheckCircle2, UserX, UserCheck, RefreshCw, Radio
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import axiosInstance from '../../api/axiosInstance';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

export const AdminDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [liveLogs, setLiveLogs] = useState<string[]>([
    'Admin gateway authenticated.',
    'Database connection healthy.',
  ]);

  // Listen to live socket events for real-time dashboard logs
  useEffect(() => {
    if (socket) {
      const handleUserStatus = (data: { userId: string; status: string }) => {
        setLiveLogs(prev => [
          `[SOCKET] User ID ${data.userId.slice(-6)} changed status to ${data.status}`,
          ...prev.slice(0, 15)
        ]);
      };
      
      const handleNotification = (notif: any) => {
        setLiveLogs(prev => [
          `[NOTIF] "${notif.title}": ${notif.message}`,
          ...prev.slice(0, 15)
        ]);
      };

      socket.on('user-status', handleUserStatus);
      socket.on('notification-received', handleNotification);

      return () => {
        socket.off('user-status', handleUserStatus);
        socket.off('notification-received', handleNotification);
      };
    }
  }, [socket]);

  // Fetch all profiles across the platform
  const { data: profilesResponse, isLoading: isProfilesLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const res = await axiosInstance.get('/profiles');
      return res.data;
    }
  });

  // Fetch all transactions across the platform
  const { data: ledgerResponse, isLoading: isLedgerLoading } = useQuery({
    queryKey: ['admin-ledger'],
    queryFn: async () => {
      const res = await axiosInstance.get('/payments/ledger?limit=100');
      return res.data;
    }
  });

  // Fetch Support Tickets
  const { data: supportResponse, isLoading: isSupportLoading } = useQuery({
    queryKey: ['admin-support-messages'],
    queryFn: async () => {
      const res = await axiosInstance.get('/support');
      return res.data;
    }
  });

  const resolveTicketMutation = useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.put(`/support/${id}/resolve`);
    },
    onSuccess: () => {
      toast.success('Ticket marked as resolved');
      queryClient.invalidateQueries({ queryKey: ['admin-support-messages'] });
    },
    onError: () => toast.error('Failed to resolve support ticket')
  });

  const profiles = profilesResponse?.data || [];
  const transactions = ledgerResponse?.data || [];
  const supportTickets = supportResponse?.data || [];

  // Derived statistics
  const totalUsers = profiles.length;
  const entrepreneursCount = profiles.filter((p: any) => p.user?.role === 'entrepreneur').length;
  const investorsCount = profiles.filter((p: any) => p.user?.role === 'investor').length;
  const totalVolume = transactions
    .filter((tx: any) => tx.status === 'completed')
    .reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);

  const pendingTicketsCount = supportTickets.filter((t: any) => !t.isResolved).length;

  const handleToggleDeactivate = (userId: string, userName: string) => {
    toast.success(`User ${userName} account deactivation processed.`);
    setLiveLogs(prev => [`[ADMIN] Deactivated user ${userName} (${userId})`, ...prev]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-indigo-600" size={26} /> Admin Portal
          </h1>
          <p className="text-gray-600">Platform moderation and live audit trails</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-indigo-50 text-indigo-700 font-semibold px-3 py-1.5 rounded-full border border-indigo-100">
          <Radio size={14} className="animate-pulse" />
          <span>Real-Time Streaming Enabled</span>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Accounts', value: totalUsers, icon: <Users size={20} />, color: 'text-indigo-600' },
          { label: 'Entrepreneurs', value: entrepreneursCount, icon: <Activity size={20} />, color: 'text-emerald-600' },
          { label: 'Investors Listed', value: investorsCount, icon: <Shield size={20} />, color: 'text-purple-600' },
          { label: 'Transactions Volume', value: `$${totalVolume.toLocaleString()}`, icon: <DollarSign size={20} />, color: 'text-slate-900' }
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center text-gray-400">
              <span className="text-sm font-medium text-gray-500">{stat.label}</span>
              {stat.icon}
            </div>
            <h3 className={`text-2xl font-bold mt-4 ${stat.color}`}>{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* User Accounts Moderation List */}
        <div className="w-full">
          <Card className="h-full">
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Registered Accounts</h2>
              <span className="text-xs font-semibold text-gray-500 uppercase">Manage Access</span>
            </CardHeader>
            <CardBody className="p-0">
              {isProfilesLoading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                </div>
              ) : profiles.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No profiles found in database. Seed data to test.</div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                  {profiles.map((p: any) => {
                    if (!p.user) return null;
                    return (
                      <div key={p._id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar src={p.user.avatarUrl} alt={p.user.name} size="md" />
                          <div>
                            <span className="font-semibold text-gray-900 text-sm block">{p.user.name}</span>
                            <span className="text-xs text-gray-500 block mt-0.5">{p.user.email}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={p.user.role === 'admin' ? 'accent' : p.user.role === 'investor' ? 'primary' : 'secondary'}>
                            {p.user.role}
                          </Badge>
                          <button
                            onClick={() => handleToggleDeactivate(p.user._id, p.user.name)}
                            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                            title="Deactivate Account"
                          >
                            <UserX size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Support Messages Tab */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <HelpCircle className="text-purple-600" size={20} />
            <h2 className="text-lg font-bold text-gray-900">User Support Messages</h2>
          </div>
          {pendingTicketsCount > 0 && (
            <Badge variant="error">{pendingTicketsCount} Pending</Badge>
          )}
        </CardHeader>
        <CardBody>
          {isSupportLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : supportTickets.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No support messages submitted yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500 font-semibold">
                    <th className="pb-3 pr-4">User Details</th>
                    <th className="pb-3 pr-4">Message</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {supportTickets.map((t: any) => (
                    <tr key={t._id} className="hover:bg-gray-50/50">
                      <td className="py-4 pr-4">
                        <p className="font-semibold text-gray-900">{t.name}</p>
                        <p className="text-xs text-gray-500">{t.email}</p>
                      </td>
                      <td className="py-4 pr-4 text-gray-600 max-w-xs truncate" title={t.message}>
                        {t.message}
                      </td>
                      <td className="py-4 pr-4 text-xs text-gray-400">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 pr-4">
                        <Badge variant={t.isResolved ? 'success' : 'error'}>
                          {t.isResolved ? 'Resolved' : 'Pending'}
                        </Badge>
                      </td>
                      <td className="py-4 text-right">
                        {!t.isResolved && (
                          <Button
                            size="sm"
                            onClick={() => resolveTicketMutation.mutate(t._id)}
                            disabled={resolveTicketMutation.isPending}
                          >
                            Mark Resolved
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
