import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Building2, MapPin, UserCircle, BarChart3, Briefcase } from 'lucide-react';
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
  const { data: profileResponse, isLoading, error } = useQuery({
    queryKey: ['profile', id],
    queryFn: () => getProfileById(id || ''),
    enabled: !!id
  });

  const profile = profileResponse?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile || profile.user?.role !== 'investor') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Investor not found</h2>
        <p className="text-gray-600 mt-2">The investor profile you're looking for doesn't exist or has been removed.</p>
        <Link to="/dashboard/entrepreneur">
          <Button variant="outline" className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const isCurrentUser = currentUser?.id === profile.user._id;

  const investor = {
    id: profile.user._id,
    name: profile.user.name,
    email: profile.user.email,
    avatarUrl: profile.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.user.name)}&background=random`,
    bio: profile.user.bio || 'No bio provided.',
    investmentInterests: profile.investmentInterests || ['FinTech', 'SaaS'],
    investmentStage: profile.investmentStage || ['Seed', 'Series A'],
    portfolioCompanies: profile.portfolioCompanies || [],
    totalInvestments: profile.totalInvestmentsCount || 0,
    minimumInvestment: profile.minimumInvestment ? `$${profile.minimumInvestment.toLocaleString()}` : '$100K',
    maximumInvestment: profile.maximumInvestment ? `$${profile.maximumInvestment.toLocaleString()}` : '$1M',
    location: profile.location || 'San Francisco, CA',
    isOnline: profile.user.isOnline || false
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
                Investor • {investor.totalInvestments} investments
              </p>
              
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                <Badge variant="primary">
                  <MapPin size={14} className="mr-1" />
                  {investor.location}
                </Badge>
                {investor.investmentStage.map((stage, index) => (
                  <Badge key={index} variant="secondary" size="sm">{stage}</Badge>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6 sm:mt-0 flex justify-center sm:justify-end">
            {!isCurrentUser && (
              <Link to={`/chat/${investor.id}`}>
                <Button
                  leftIcon={<MessageCircle size={18} />}
                >
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
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Target Industries</h3>
                  <div className="flex flex-wrap gap-2">
                    {investor.investmentInterests.map((interest, index) => (
                      <Badge key={index} variant="primary">{interest}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Investment Range</h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {investor.minimumInvestment} - {investor.maximumInvestment}
                  </p>
                </div>
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
                  {investor.portfolioCompanies.map((company, index) => (
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
                  <span className="font-semibold text-gray-900">High</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};