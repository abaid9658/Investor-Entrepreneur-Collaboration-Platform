import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Bell, Calendar, TrendingUp, AlertCircle, PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getProfiles } from '../../api/services/profileService';
import { getMyMeetings } from '../../api/services/meetingService';

export const EntrepreneurDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  // Fetch recommended investors from backend
  const { data: investorData, isLoading: investorsLoading } = useQuery({
    queryKey: ['profiles', 'investor'],
    queryFn: () => getProfiles('investor'),
  });

  // Fetch upcoming meetings
  const { data: meetingsData } = useQuery({
    queryKey: ['meetings'],
    queryFn: getMyMeetings,
  });

  const rawInvestors: any[] = (investorData?.data || [])
    .filter((p: any) => p?.user?.role === 'investor')
    .slice(0, 4)
    .map((p: any) => ({
      id: p.user._id || p.user.id,
      name: p.user.name || 'Unknown',
      avatarUrl: p.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.user.name || 'I')}&background=random`,
      isOnline: p.user.isOnline || false,
      investmentInterests: p.investmentInterests?.slice(0, 2) || ['Technology'],
      investmentStage: p.investmentStage?.slice(0, 1) || ['Seed'],
    }));

  const meetings: any[] = meetingsData?.data || [];
  const upcomingMeetings = meetings.filter((m: any) => m.status === 'accepted' && new Date(m.startTime) > new Date());

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name} 👋</h1>
          <p className="text-gray-600">Here's what's happening with your startup today</p>
        </div>
        <Link to="/investors">
          <Button leftIcon={<PlusCircle size={18} />}>Find Investors</Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-purple-50 border border-purple-100">
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 rounded-full"><Bell size={18} className="text-purple-700" /></div>
              <div>
                <p className="text-xs font-medium text-purple-700">Meetings</p>
                <h3 className="text-xl font-semibold text-purple-900">{upcomingMeetings.length}</h3>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-emerald-50 border border-emerald-100">
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 rounded-full"><Users size={18} className="text-emerald-700" /></div>
              <div>
                <p className="text-xs font-medium text-emerald-700">Investors</p>
                <h3 className="text-xl font-semibold text-emerald-900">{rawInvestors.length}</h3>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-blue-50 border border-blue-100">
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-full"><Calendar size={18} className="text-blue-700" /></div>
              <div>
                <p className="text-xs font-medium text-blue-700">All Meetings</p>
                <h3 className="text-xl font-semibold text-blue-900">{meetings.length}</h3>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-amber-50 border border-amber-100">
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-full"><TrendingUp size={18} className="text-amber-700" /></div>
              <div>
                <p className="text-xs font-medium text-amber-700">Profile</p>
                <h3 className="text-xl font-semibold text-amber-900">Active</h3>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Meetings */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Upcoming Meetings</h2>
              <Link to="/meetings" className="text-sm text-purple-600 hover:text-purple-500 font-medium">View calendar</Link>
            </CardHeader>
            <CardBody>
              {upcomingMeetings.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle size={24} className="text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No upcoming meetings yet</p>
                  <Link to="/meetings">
                    <Button variant="outline" size="sm" className="mt-3">Schedule a Meeting</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingMeetings.slice(0, 4).map((m: any) => (
                    <div key={m._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{m.title}</p>
                        <p className="text-xs text-gray-500">{new Date(m.startTime).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={m.status === 'accepted' ? 'success' : 'secondary'} size="sm">{m.status}</Badge>
                        {m.meetingLink && (
                          <a href={m.meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline font-medium">Join</a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Recommended Investors */}
        <div>
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Recommended Investors</h2>
              <Link to="/investors" className="text-sm text-purple-600 hover:text-purple-500 font-medium">View all</Link>
            </CardHeader>
            <CardBody>
              {investorsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="animate-spin text-purple-500" /></div>
              ) : rawInvestors.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">No investors found yet</p>
              ) : (
                <div className="space-y-3">
                  {rawInvestors.map(inv => (
                    <div
                      key={inv.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/profile/investor/${inv.id}`)}
                    >
                      <Avatar src={inv.avatarUrl} alt={inv.name} size="sm" status={inv.isOnline ? 'online' : 'offline'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{inv.name}</p>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {inv.investmentStage.map((s: string, i: number) => (
                            <Badge key={i} variant="secondary" size="sm">{s}</Badge>
                          ))}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="flex-shrink-0" onClick={(e) => { e.stopPropagation(); navigate(`/chat/${inv.id}`); }}>
                        Message
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};