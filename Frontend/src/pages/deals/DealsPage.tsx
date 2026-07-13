import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, DollarSign, TrendingUp, Users, Calendar,
  Plus, X, Loader2, ChevronDown, Trash2, Edit3, BarChart3
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { getDeals, createDeal, updateDeal, deleteDeal, getEntrepreneurs } from '../../api/services/dealService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface DealParticipant {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string;
}

interface Deal {
  _id: string;
  investor: DealParticipant;
  entrepreneur: DealParticipant;
  startupName: string;
  industry: string;
  amount: number;
  equity: string;
  status: string;
  stage: string;
  notes: string;
  createdAt: string;
}

interface DealStats {
  totalAmount: number;
  totalDeals: number;
  activeDeals: number;
  closedDeals: number;
  portfolioCount: number;
}

interface Entrepreneur {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string;
}

const STATUS_LABELS: Record<string, string> = {
  exploring: 'Exploring',
  due_diligence: 'Due Diligence',
  term_sheet: 'Term Sheet',
  negotiation: 'Negotiation',
  closed: 'Closed',
  passed: 'Passed',
};

const STAGE_LABELS: Record<string, string> = {
  pre_seed: 'Pre-Seed',
  seed: 'Seed',
  series_a: 'Series A',
  series_b: 'Series B',
  series_c: 'Series C',
  growth: 'Growth',
};

type BadgeVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'error' | 'gray';

const getStatusVariant = (status: string): BadgeVariant => {
  const map: Record<string, BadgeVariant> = {
    exploring: 'gray',
    due_diligence: 'primary',
    term_sheet: 'secondary',
    negotiation: 'accent',
    closed: 'success',
    passed: 'error',
  };
  return map[status] || 'gray';
};

export const DealsPage: React.FC = () => {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stats, setStats] = useState<DealStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [entrepreneurs, setEntrepreneurs] = useState<Entrepreneur[]>([]);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    entrepreneurId: '',
    startupName: '',
    industry: '',
    amount: '',
    equity: '',
    status: 'exploring',
    stage: 'seed',
    notes: '',
  });

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getDeals();
      setDeals(res.data?.deals || []);
      setStats(res.data?.stats || null);
    } catch {
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const openAddModal = async () => {
    setShowAddModal(true);
    setEditingDeal(null);
    setForm({ entrepreneurId: '', startupName: '', industry: '', amount: '', equity: '', status: 'exploring', stage: 'seed', notes: '' });
    if (user?.role === 'investor' && entrepreneurs.length === 0) {
      try {
        const res = await getEntrepreneurs();
        setEntrepreneurs(res.data || []);
      } catch {
        toast.error('Failed to load entrepreneurs list');
      }
    }
  };

  const openEditModal = (deal: Deal) => {
    setEditingDeal(deal);
    setShowAddModal(true);
    setForm({
      entrepreneurId: deal.entrepreneur._id,
      startupName: deal.startupName,
      industry: deal.industry,
      amount: deal.amount.toString(),
      equity: deal.equity,
      status: deal.status,
      stage: deal.stage,
      notes: deal.notes,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || isNaN(Number(form.amount))) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setSubmitting(true);
      if (editingDeal) {
        await updateDeal(editingDeal._id, {
          status: form.status,
          notes: form.notes,
          equity: form.equity,
          amount: Number(form.amount),
          stage: form.stage,
        });
        toast.success('Deal updated successfully');
      } else {
        if (!form.entrepreneurId) {
          toast.error('Please select an entrepreneur');
          return;
        }
        await createDeal({
          entrepreneurId: form.entrepreneurId,
          startupName: form.startupName,
          industry: form.industry,
          amount: Number(form.amount),
          equity: form.equity,
          status: form.status,
          stage: form.stage,
          notes: form.notes,
        });
        toast.success('Deal created! Entrepreneur has been notified.');
      }
      setShowAddModal(false);
      fetchDeals();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to save deal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (dealId: string) => {
    if (!window.confirm('Are you sure you want to remove this deal?')) return;
    try {
      await deleteDeal(dealId);
      toast.success('Deal removed');
      fetchDeals();
    } catch {
      toast.error('Failed to delete deal');
    }
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const filteredDeals = deals.filter(deal => {
    const matchesSearch =
      deal.startupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.entrepreneur?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(deal.status);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investment Deals</h1>
          <p className="text-gray-600 mt-0.5">Track and manage your investment pipeline</p>
        </div>
        {user?.role === 'investor' && (
          <Button leftIcon={<Plus size={16} />} onClick={openAddModal}>
            Add Deal
          </Button>
        )}
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardBody>
                <div className="h-12 bg-gray-100 animate-pulse rounded-lg" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg mr-3">
                  <DollarSign size={20} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Invested</p>
                  <p className="text-lg font-bold text-gray-900">
                    ${stats.totalAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg mr-3">
                  <TrendingUp size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Deals</p>
                  <p className="text-lg font-bold text-gray-900">{stats.activeDeals}</p>
                </div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg mr-3">
                  <Users size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Portfolio Companies</p>
                  <p className="text-lg font-bold text-gray-900">{stats.portfolioCount}</p>
                </div>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center">
                <div className="p-3 bg-amber-100 rounded-lg mr-3">
                  <BarChart3 size={20} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Closed Deals</p>
                  <p className="text-lg font-bold text-gray-900">{stats.closedDeals}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-2/3">
          <Input
            placeholder="Search by startup name, industry or entrepreneur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startAdornment={<Search size={16} />}
            fullWidth
          />
        </div>
        <div className="w-full md:w-1/3 flex items-center gap-2 flex-wrap">
          <Filter size={16} className="text-gray-400 flex-shrink-0" />
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <Badge
              key={key}
              variant={selectedStatuses.includes(key) ? getStatusVariant(key) : 'gray'}
              className="cursor-pointer select-none"
              onClick={() => toggleStatus(key)}
            >
              {label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Deals Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            {filteredDeals.length} Deal{filteredDeals.length !== 1 ? 's' : ''}
          </h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={32} className="animate-spin text-purple-500" />
            </div>
          ) : filteredDeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <DollarSign size={28} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-medium text-gray-700">No deals found</h3>
              <p className="text-gray-400 text-sm mt-1">
                {user?.role === 'investor'
                  ? 'Click "Add Deal" to create your first deal'
                  : 'No deals have been initiated with you yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Startup</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Entrepreneur</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Equity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stage</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredDeals.map(deal => (
                    <tr key={deal._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{deal.startupName}</p>
                          {deal.industry && <p className="text-xs text-gray-500">{deal.industry}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={deal.entrepreneur?.avatarUrl}
                            alt={deal.entrepreneur?.name}
                            size="sm"
                          />
                          <div>
                            <p className="text-sm text-gray-900">{deal.entrepreneur?.name}</p>
                            <p className="text-xs text-gray-400">{deal.entrepreneur?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-semibold text-gray-900">
                          ${deal.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-700">{deal.equity || '—'}</span>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={getStatusVariant(deal.status)}>
                          {STATUS_LABELS[deal.status] || deal.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-700">{STAGE_LABELS[deal.stage] || deal.stage}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-gray-500">
                          {new Date(deal.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user?.role === 'investor' && (
                            <>
                              <button
                                onClick={() => openEditModal(deal)}
                                className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(deal._id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Add / Edit Deal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingDeal ? 'Edit Deal' : 'Add New Deal'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editingDeal && user?.role === 'investor' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Entrepreneur <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.entrepreneurId}
                      onChange={e => {
                        const selected = entrepreneurs.find(en => en._id === e.target.value);
                        setForm(f => ({
                          ...f,
                          entrepreneurId: e.target.value,
                          startupName: selected ? f.startupName : f.startupName
                        }));
                      }}
                      required
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400 bg-white"
                    >
                      <option value="">Select an entrepreneur...</option>
                      {entrepreneurs.map(en => (
                        <option key={en._id} value={en._id}>{en.name} ({en.email})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Startup Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.startupName}
                      onChange={e => setForm(f => ({ ...f, startupName: e.target.value }))}
                      placeholder="e.g. TechWave AI"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                    <input
                      type="text"
                      value={form.industry}
                      onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                      placeholder="e.g. FinTech, HealthTech"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (USD) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="e.g. 500000"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Equity %</label>
                  <input
                    type="text"
                    value={form.equity}
                    onChange={e => setForm(f => ({ ...f, equity: e.target.value }))}
                    placeholder="e.g. 15%"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400 bg-white"
                  >
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                  <select
                    value={form.stage}
                    onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400 bg-white"
                  >
                    {Object.entries(STAGE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Deal notes, terms, conditions..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  fullWidth
                  disabled={submitting}
                  leftIcon={submitting ? <Loader2 size={14} className="animate-spin" /> : undefined}
                >
                  {submitting ? 'Saving...' : editingDeal ? 'Update Deal' : 'Create Deal'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};