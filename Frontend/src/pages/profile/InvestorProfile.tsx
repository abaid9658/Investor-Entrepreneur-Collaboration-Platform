import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Building2, MapPin, UserCircle, BarChart3, Briefcase, RefreshCw } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { getProfileById } from '../../api/services/profileService';

export const InvestorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();

  // Fetch real profile from backend
  const { data: profileResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['profile', id],
    queryFn: () => getProfileById(id || ''),
    enabled: !!id,
    retry: 1,
  });

  // Backend returns { success, data: profileDoc } where profileDoc.user is populated
  const profile = profileResponse?.data;
  const userDoc = profile?.user;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile || !userDoc) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Briefcase className="text-purple-500" size={28} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Investor not found</h2>
        <p className="text-gray-500 max-w-sm mx-auto mb-6">
          This investor profile doesn't exist yet or may have been removed. If you just registered, try refreshing.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            <RefreshCw size={16} /> Retry
          </button>
          <Link to="/investors">
            <Button variant="outline">Browse Investors</Button>
          </Link>
        </div>
      </div>
    );
  }

  // If somehow the user is not an investor, show a helpful redirect
  if (userDoc.role && userDoc.role !== 'investor') {
    return (
      <div className="text-center py-16 px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Not an investor profile</h2>
        <p className="text-gray-500 mb-6">This user is registered as a {userDoc.role}.</p>
        <Link to="/investors">
          <Button variant="outline">Browse Investors</Button>
        </Link>
      </div>
    );
  }

  const isCurrentUser = currentUser?.id === (userDoc._id?.toString() || userDoc.id);

  const investor = {
    id: userDoc._id || userDoc.id,
    name: userDoc.name || 'Unknown Investor',
    email: userDoc.email || '',
    avatarUrl: userDoc.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userDoc.name || 'I')}&background=random`,
    bio: userDoc.bio || profile.bio || 'This investor has not added a bio yet.',
    investmentInterests: profile.investmentInterests?.length ? profile.investmentInterests : ['Technology', 'FinTech', 'SaaS'],
    investmentStage: profile.investmentStage?.length ? profile.investmentStage : ['Seed', 'Series A'],
    portfolioCompanies: profile.portfolioCompanies || [],
    totalInvestments: profile.totalInvestmentsCount || 0,
    minimumInvestment: profile.minimumInvestment ? `$${profile.minimumInvestment.toLocaleString()}` : 'Negotiable',
    maximumInvestment: profile.maximumInvestment ? `$${profile.maximumInvestment.toLocaleString()}` : 'Negotiable',
    location: profile.location || userDoc.location || 'Location not specified',
    isOnline: userDoc.isOnline || false,
    website: profile.website || '',
    linkedIn: profile.linkedIn || '',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile header */}
      <Card>
        <CardBody className="sm:flex sm:items-start sm:justify-between p-6">
          <div className="sm:flex sm:space-x-6">
            <Avatar
              src={investor.avatarUrl}
              alt={investor.name}
              size="xl"
              status={investor.isOnline ? 'online' : 'offline'}
              className="mx-auto sm:mx-0"
            />
            
            <div className="mt-4 sm:mt-0 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{investor.name}</h1>
              <p className="text-gray-600 flex items-center justify-center sm:justify-start mt-1">
                <Building2 size={16} className="mr-1" />
                Investor{investor.totalInvestments > 0 ? ` • ${investor.totalInvestments} investments` : ''}
              </p>
              
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                <Badge variant="primary">
                  <MapPin size={14} className="mr-1" />
                  {investor.location}
                </Badge>
                {investor.investmentStage.slice(0, 3).map((stage: string, index: number) => (
                  <Badge key={index} variant="secondary" size="sm">{stage}</Badge>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6 sm:mt-0 flex justify-center sm:justify-end gap-2 flex-wrap">
            {!isCurrentUser && (
              <Link to={`/chat/${investor.id}`}>
                <Button leftIcon={<MessageCircle size={18} />}>
                  Message Investor
                </Button>
              </Link>
            )}
            
            {isCurrentUser && (
              <Link to="/settings">
                <Button
                  variant="outline"
                  leftIcon={<UserCircle size={18} />}
                >
                  Edit Profile
                </Button>
              </Link>
            )}
          </div>
        </CardBody>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - left side */}
        <div className="lg:col-span-2 space-y-6">
          {/* About / Investment Philosophy */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">About & Investment Thesis</h2>
            </CardHeader>
            <CardBody>
              <p className="text-gray-700 leading-relaxed">{investor.bio}</p>
            </CardBody>
          </Card>
          
          {/* Investment Preferences */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Investment Preferences</h2>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Target Industries</h3>
                  <div className="flex flex-wrap gap-2">
                    {investor.investmentInterests.map((interest: string, index: number) => (
                      <Badge key={index} variant="primary">{interest}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Investment Stages</h3>
                  <div className="flex flex-wrap gap-2">
                    {investor.investmentStage.map((stage: string, index: number) => (
                      <Badge key={index} variant="secondary">{stage}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Investment Range</h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {investor.minimumInvestment} — {investor.maximumInvestment}
                  </p>
                </div>

                {(investor.website || investor.linkedIn) && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Links</h3>
                    <div className="space-y-1">
                      {investor.website && (
                        <a href={investor.website} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline text-sm block">
                          🌐 Website
                        </a>
                      )}
                      {investor.linkedIn && (
                        <a href={investor.linkedIn} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline text-sm block">
                          💼 LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
          
          {/* Portfolio Companies */}
          {investor.portfolioCompanies.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900">Featured Portfolio</h2>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {investor.portfolioCompanies.map((company: string, index: number) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-xl text-center bg-gray-50 hover:bg-gray-100/70 transition-colors">
                      <Briefcase className="mx-auto text-purple-600 mb-2" size={24} />
                      <h3 className="font-semibold text-sm text-gray-900">{company}</h3>
                      <p className="text-xs text-gray-500 mt-1">Portfolio Company</p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
        
        {/* Sidebar - right side */}
        <div className="space-y-6">
          {/* Platform Stats */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Platform Activity</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <Briefcase size={16} className="mr-2" />
                    <span>Total Investments</span>
                  </div>
                  <span className="font-semibold text-gray-900">{investor.totalInvestments}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <BarChart3 size={16} className="mr-2" />
                    <span>Deal Flow Rate</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {investor.totalInvestments > 5 ? 'High' : investor.totalInvestments > 2 ? 'Medium' : 'Active'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin size={16} className="mr-2" />
                    <span>Location</span>
                  </div>
                  <span className="font-semibold text-gray-900 text-right text-sm">{investor.location}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Contact Card */}
          {!isCurrentUser && (
            <Card>
              <CardBody className="text-center p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Interested in partnering?</h3>
                <p className="text-gray-500 text-sm mb-4">Send a message to start a conversation with {investor.name.split(' ')[0]}.</p>
                <Link to={`/chat/${investor.id}`} className="block">
                  <Button leftIcon={<MessageCircle size={16} />} className="w-full">
                    Send Message
                  </Button>
                </Link>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};