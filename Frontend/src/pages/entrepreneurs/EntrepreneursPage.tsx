import React, { useState } from 'react';
import { Search, Filter, MapPin, Users, Loader2, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardBody, CardFooter } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { getProfiles } from '../../api/services/profileService';

export const EntrepreneursPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const navigate = useNavigate();

  // Fetch real entrepreneurs from backend
  const { data: profilesResponse, isLoading, error } = useQuery({
    queryKey: ['profiles', 'entrepreneur'],
    queryFn: () => getProfiles('entrepreneur'),
  });

  // Backend returns { success, data: Profile[] } where each Profile has populated .user
  const rawProfiles: any[] = profilesResponse?.data || [];

  // Map to flat entrepreneur objects using real MongoDB _id
  const allEntrepreneurs = rawProfiles
    .filter((p: any) => p?.user && p.user.role === 'entrepreneur')
    .map((p: any) => ({
      id: p.user._id || p.user.id,       // real MongoDB _id → used for profile navigation
      name: p.user.name || 'Unknown',
      email: p.user.email || '',
      avatarUrl: p.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.user.name || 'E')}&background=random`,
      bio: p.user.bio || 'No bio yet.',
      isOnline: p.user.isOnline || false,
      startupName: p.startupName || 'Unnamed Startup',
      pitchSummary: p.pitchSummary || 'No pitch summary yet.',
      industry: p.industry || 'Technology',
      location: p.location || 'Location not set',
      foundedYear: p.foundedYear || new Date().getFullYear(),
      teamSize: p.teamSize || 1,
      fundingStage: p.fundingStage || 'Seed',
      fundingNeeded: p.minimumInvestment ? `$${p.minimumInvestment.toLocaleString()}` : 'Seeking Investment',
    }));

  // Derive filter options from real data
  const allIndustries = Array.from(new Set(allEntrepreneurs.map(e => e.industry)));

  // Apply filters
  const filteredEntrepreneurs = allEntrepreneurs.filter(entrepreneur => {
    const matchesSearch = searchQuery === '' ||
      entrepreneur.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entrepreneur.startupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entrepreneur.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entrepreneur.pitchSummary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIndustry = selectedIndustries.length === 0 ||
      selectedIndustries.includes(entrepreneur.industry);
    return matchesSearch && matchesIndustry;
  });

  const toggleIndustry = (industry: string) => {
    setSelectedIndustries(prev => prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find Startups</h1>
        <p className="text-gray-600">Discover promising startups looking for investment</p>
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
              {allIndustries.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Industry</h3>
                  <div className="space-y-1">
                    {allIndustries.map(industry => (
                      <button
                        key={industry}
                        onClick={() => toggleIndustry(industry)}
                        className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          selectedIndustries.includes(industry)
                            ? 'bg-purple-50 text-purple-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {industry}
                      </button>
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
              placeholder="Search startups by name, industry, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startAdornment={<Search size={18} />}
              fullWidth
            />
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Users size={18} className="text-gray-500" />
              <span className="text-sm text-gray-600">{filteredEntrepreneurs.length} results</span>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-purple-600" size={32} />
              <span className="ml-3 text-gray-500">Loading startups...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-red-500 font-medium">Failed to load entrepreneurs.</p>
              <p className="text-sm mt-1">Please make sure you are logged in and the server is running.</p>
            </div>
          )}

          {!isLoading && !error && filteredEntrepreneurs.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <Rocket className="mx-auto text-gray-300 mb-3" size={40} />
              <h3 className="font-semibold text-gray-700">No startups found</h3>
              <p className="text-sm mt-1">
                {allEntrepreneurs.length === 0
                  ? 'No entrepreneur profiles exist yet. Try seeding the database first.'
                  : 'Try adjusting your search or filters.'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredEntrepreneurs.map(entrepreneur => (
              <Card key={entrepreneur.id} hoverable className="transition-all duration-300 h-full cursor-pointer" onClick={() => navigate(`/profile/entrepreneur/${entrepreneur.id}`)}>
                <CardBody className="flex flex-col">
                  <div className="flex items-start gap-4">
                    <Avatar
                      src={entrepreneur.avatarUrl}
                      alt={entrepreneur.name}
                      size="lg"
                      status={entrepreneur.isOnline ? 'online' : 'offline'}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{entrepreneur.name}</h3>
                      <p className="text-sm text-gray-500 mb-1">Founder · {entrepreneur.startupName}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="primary" size="sm">{entrepreneur.industry}</Badge>
                        <Badge variant="secondary" size="sm">{entrepreneur.fundingStage}</Badge>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-gray-600 line-clamp-2">{entrepreneur.pitchSummary}</p>

                  <div className="mt-3 flex justify-between items-center text-sm">
                    <div className="flex items-center text-gray-500 gap-1">
                      <MapPin size={14} /> {entrepreneur.location}
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500 text-xs">Seeking</span>
                      <p className="text-gray-900 font-semibold">{entrepreneur.fundingNeeded}</p>
                    </div>
                  </div>
                </CardBody>
                <CardFooter className="border-t border-gray-100 bg-gray-50 flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); navigate(`/chat/${entrepreneur.id}`); }}
                  >
                    Message
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); navigate(`/profile/entrepreneur/${entrepreneur.id}`); }}
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