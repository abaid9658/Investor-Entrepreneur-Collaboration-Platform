import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, PieChart, Filter, Search, PlusCircle, Loader2, Rocket } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getProfiles } from '../../api/services/profileService';

export const InvestorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);

  if (!user) return null;

  const { data: profilesData, isLoading } = useQuery({
    queryKey: ['profiles', 'entrepreneur'],
    queryFn: () => getProfiles('entrepreneur'),
  });

  const rawProfiles: any[] = profilesData?.data || [];

  const allEntrepreneurs = rawProfiles
    .filter((p: any) => p?.user && p.user.role === 'entrepreneur')
    .map((p: any) => ({
      id: p.user._id || p.user.id,
      name: p.user.name || 'Unknown',
      avatarUrl: p.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.user.name || 'E')}&background=random`,
      bio: p.user.bio || 'No bio yet.',
      isOnline: p.user.isOnline || false,
      startupName: p.startupName || 'Unnamed Startup',
      pitchSummary: p.pitchSummary || 'No pitch yet.',
      industry: p.industry || 'Technology',
      location: p.location || '',
      fundingStage: p.fundingStage || 'Seed',
    }));

  const industries = Array.from(new Set(allEntrepreneurs.map(e => e.industry)));

  const filteredEntrepreneurs = allEntrepreneurs.filter(e => {
    const matchesSearch = searchQuery === '' ||
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.startupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.industry.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIndustry = selectedIndustries.length === 0 || selectedIndustries.includes(e.industry);
    return matchesSearch && matchesIndustry;
  });

  const toggleIndustry = (industry: string) => {
    setSelectedIndustries(prev => prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discover Startups</h1>
          <p className="text-gray-600">Find and connect with promising entrepreneurs</p>
        </div>
        <Link to="/entrepreneurs">
          <Button leftIcon={<PlusCircle size={18} />}>View All Startups</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-purple-50 border border-purple-100">
          <CardBody>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <Users size={20} className="text-purple-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-700">Total Startups</p>
                <h3 className="text-xl font-semibold text-purple-900">{allEntrepreneurs.length}</h3>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-emerald-50 border border-emerald-100">
          <CardBody>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-full">
                <PieChart size={20} className="text-emerald-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-700">Industries</p>
                <h3 className="text-xl font-semibold text-emerald-900">{industries.length}</h3>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-blue-50 border border-blue-100">
          <CardBody>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Rocket size={20} className="text-blue-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Matching You</p>
                <h3 className="text-xl font-semibold text-blue-900">{filteredEntrepreneurs.length}</h3>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Search startups, industries, or keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
          startAdornment={<Search size={18} />}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={18} className="text-gray-500" />
          {industries.map(ind => (
            <Badge
              key={ind}
              variant={selectedIndustries.includes(ind) ? 'primary' : 'gray'}
              className="cursor-pointer"
              onClick={() => toggleIndustry(ind)}
            >
              {ind}
            </Badge>
          ))}
        </div>
      </div>

      {/* Grid */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">Featured Startups</h2>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-purple-600 mr-3" size={28} />
              <span className="text-gray-500">Loading startups...</span>
            </div>
          ) : filteredEntrepreneurs.length === 0 ? (
            <div className="text-center py-10">
              <Rocket className="mx-auto text-gray-300 mb-3" size={36} />
              <p className="text-gray-500">
                {allEntrepreneurs.length === 0
                  ? 'No entrepreneur profiles yet. They will appear here once registered.'
                  : 'No startups match your filters.'}
              </p>
              {selectedIndustries.length > 0 && (
                <Button variant="outline" className="mt-3" onClick={() => setSelectedIndustries([])}>Clear filters</Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEntrepreneurs.map(e => (
                <div
                  key={e.id}
                  className="border border-gray-100 rounded-xl p-4 hover:shadow-md hover:border-purple-100 transition-all cursor-pointer"
                  onClick={() => navigate(`/profile/entrepreneur/${e.id}`)}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar src={e.avatarUrl} alt={e.name} size="md" status={e.isOnline ? 'online' : 'offline'} />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">{e.name}</h3>
                      <p className="text-sm text-gray-500 truncate">Founder · {e.startupName}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <Badge variant="primary" size="sm">{e.industry}</Badge>
                    <Badge variant="secondary" size="sm">{e.fundingStage}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{e.pitchSummary}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1" onClick={(ev) => { ev.stopPropagation(); navigate(`/chat/${e.id}`); }}>
                      Message
                    </Button>
                    <Button size="sm" className="flex-1" onClick={(ev) => { ev.stopPropagation(); navigate(`/profile/entrepreneur/${e.id}`); }}>
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};