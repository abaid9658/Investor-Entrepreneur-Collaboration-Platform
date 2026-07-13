import React, { useState } from 'react';
import { Search, Filter, MapPin, Users, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardBody, CardFooter } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { getProfiles } from '../../api/services/profileService';

export const InvestorsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const navigate = useNavigate();

  // Fetch real investors from backend
  const { data: profilesResponse, isLoading, error } = useQuery({
    queryKey: ['profiles', 'investor'],
    queryFn: () => getProfiles('investor'),
  });

  // Backend returns { success, data: Profile[] } where each Profile has populated .user
  const rawProfiles: any[] = profilesResponse?.data || [];

  // Map to flat investor objects using real MongoDB _id
  const allInvestors = rawProfiles
    .filter((p: any) => p?.user && p.user.role === 'investor')
    .map((p: any) => ({
      id: p.user._id || p.user.id,         // real MongoDB _id → used for profile navigation
      name: p.user.name || 'Unknown',
      email: p.user.email || '',
      avatarUrl: p.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.user.name || 'I')}&background=random`,
      bio: p.user.bio || 'No bio yet.',
      isOnline: p.user.isOnline || false,
      investmentInterests: p.investmentInterests?.length ? p.investmentInterests : ['Technology'],
      investmentStage: p.investmentStage?.length ? p.investmentStage : ['Seed'],
      portfolioCompanies: p.portfolioCompanies || [],
      totalInvestments: p.totalInvestmentsCount || 0,
      minimumInvestment: p.minimumInvestment ? `$${p.minimumInvestment.toLocaleString()}` : 'Negotiable',
      maximumInvestment: p.maximumInvestment ? `$${p.maximumInvestment.toLocaleString()}` : 'Negotiable',
      location: p.location || 'Location not set',
    }));

  // Derive filter options from real data
  const allStages = Array.from(new Set(allInvestors.flatMap(i => i.investmentStage)));
  const allInterests = Array.from(new Set(allInvestors.flatMap(i => i.investmentInterests)));

  // Apply filters
  const filteredInvestors = allInvestors.filter(investor => {
    const matchesSearch = searchQuery === '' ||
      investor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      investor.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      investor.investmentInterests.some((interest: string) =>
        interest.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesStages = selectedStages.length === 0 ||
      investor.investmentStage.some((stage: string) => selectedStages.includes(stage));
    const matchesInterests = selectedInterests.length === 0 ||
      investor.investmentInterests.some((interest: string) => selectedInterests.includes(interest));
    return matchesSearch && matchesStages && matchesInterests;
  });

  const toggleStage = (stage: string) => {
    setSelectedStages(prev => prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]);
  };
  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find Investors</h1>
        <p className="text-gray-600">Connect with investors who match your startup's needs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Filter size={18} /> Filters
              </h2>
            </CardHeader>
            <CardBody className="space-y-6">
              {allStages.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Investment Stage</h3>
                  <div className="space-y-1">
                    {allStages.map(stage => (
                      <button
                        key={stage}
                        onClick={() => toggleStage(stage)}
                        className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          selectedStages.includes(stage)
                            ? 'bg-purple-50 text-purple-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {stage}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {allInterests.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {allInterests.map(interest => (
                      <Badge
                        key={interest}
                        variant={selectedInterests.includes(interest) ? 'primary' : 'gray'}
                        className="cursor-pointer"
                        onClick={() => toggleInterest(interest)}
                      >
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search investors by name, interests, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startAdornment={<Search size={18} />}
              fullWidth
            />
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Users size={18} className="text-gray-500" />
              <span className="text-sm text-gray-600">{filteredInvestors.length} results</span>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-purple-600" size={32} />
              <span className="ml-3 text-gray-500">Loading investors...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-red-500 font-medium">Failed to load investors.</p>
              <p className="text-sm mt-1">Please make sure you are logged in and the server is running.</p>
            </div>
          )}

          {!isLoading && !error && filteredInvestors.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <Users className="mx-auto text-gray-300 mb-3" size={40} />
              <h3 className="font-semibold text-gray-700">No investors found</h3>
              <p className="text-sm mt-1">
                {allInvestors.length === 0
                  ? 'No investor profiles exist yet. Try seeding the database first.'
                  : 'Try adjusting your search or filters.'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredInvestors.map(investor => (
              <Card key={investor.id} hoverable className="transition-all duration-300 h-full cursor-pointer" onClick={() => navigate(`/profile/investor/${investor.id}`)}>
                <CardBody className="flex flex-col">
                  <div className="flex items-start gap-4">
                    <Avatar
                      src={investor.avatarUrl}
                      alt={investor.name}
                      size="lg"
                      status={investor.isOnline ? 'online' : 'offline'}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{investor.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">Investor • {investor.totalInvestments} investments</p>
                      <div className="flex flex-wrap gap-1.5">
                        {investor.investmentStage.slice(0, 2).map((stage: string, index: number) => (
                          <Badge key={index} variant="secondary" size="sm">{stage}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Interests</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {investor.investmentInterests.slice(0, 4).map((interest: string, index: number) => (
                        <Badge key={index} variant="primary" size="sm">{interest}</Badge>
                      ))}
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-gray-600 line-clamp-2">{investor.bio}</p>

                  <div className="mt-3 flex justify-between items-center text-sm">
                    <div className="flex items-center text-gray-500 gap-1">
                      <MapPin size={14} /> {investor.location}
                    </div>
                    <span className="text-gray-700 font-medium">{investor.minimumInvestment} – {investor.maximumInvestment}</span>
                  </div>
                </CardBody>
                <CardFooter className="border-t border-gray-100 bg-gray-50 flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); navigate(`/chat/${investor.id}`); }}
                  >
                    Message
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); navigate(`/profile/investor/${investor.id}`); }}
                  >
                    View Profile
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};