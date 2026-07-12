import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownLeft,
  CreditCard, Filter, CheckCircle, Clock, XCircle,
  Download, RefreshCw, ChevronRight, AlertTriangle
} from 'lucide-react';
import {
  getLedger,
  getMyBalance,
  createPaymentIntent,
  confirmPayment,
  getTransactionById,
} from '../../api/services/paymentService';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: 'text-amber-600',  bg: 'bg-amber-50',  icon: <Clock size={14} /> },
  completed: { label: 'Completed', color: 'text-green-600',  bg: 'bg-green-50',  icon: <CheckCircle size={14} /> },
  failed:    { label: 'Failed',    color: 'text-red-600',    bg: 'bg-red-50',    icon: <XCircle size={14} /> },
  refunded:  { label: 'Refunded',  color: 'text-blue-600',   bg: 'bg-blue-50',   icon: <RefreshCw size={14} /> },
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; isCredit: boolean }> = {
  investment:     { label: 'Investment',     icon: <ArrowDownLeft size={16} />, isCredit: true  },
  withdrawal:     { label: 'Withdrawal',     icon: <ArrowUpRight size={16} />,  isCredit: false },
  subscription:   { label: 'Subscription',  icon: <CreditCard size={16} />,    isCredit: false },
  milestone:      { label: 'Milestone',     icon: <TrendingUp size={16} />,    isCredit: true  },
};

export const PaymentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [investForm, setInvestForm] = useState({ amount: '', currency: 'usd', recipientId: '', description: '' });
  const [selectedTx, setSelectedTx] = useState<any>(null);

  const { data: balanceData, isLoading: isBalanceLoading } = useQuery({
    queryKey: ['balance'],
    queryFn: getMyBalance,
  });

  const { data: ledgerData, isLoading: isLedgerLoading } = useQuery({
    queryKey: ['ledger'],
    queryFn: getLedger,
  });

  const balance = balanceData?.data || { availableBalance: 0, pendingBalance: 0, totalInvested: 0, totalReceived: 0 };
  const allTransactions = ledgerData?.data || [];
  const transactions = filter === 'all' ? allTransactions : allTransactions.filter((t: any) => t.status === filter);

  const intentMutation = useMutation({
    mutationFn: createPaymentIntent,
    onSuccess: async (data) => {
      // Immediately confirm in sandbox mode (no real Stripe card UI)
      const clientSecret = data.data?.clientSecret;
      const txId = data.data?.transactionId;
      if (txId) {
        await confirmMutation.mutateAsync({ transactionId: txId, paymentMethodId: 'pm_card_visa' });
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Payment initiation failed'),
  });

  const confirmMutation = useMutation({
    mutationFn: confirmPayment,
    onSuccess: () => {
      toast.success('Payment completed! (Sandbox mode)');
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      setShowInvestModal(false);
      setInvestForm({ amount: '', currency: 'usd', recipientId: '', description: '' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Payment confirmation failed'),
  });

  const handleInvest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!investForm.amount || parseFloat(investForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    intentMutation.mutate({
      amount: parseFloat(investForm.amount),
      currency: investForm.currency,
      recipientId: investForm.recipientId || undefined,
      description: investForm.description,
      type: 'investment',
    });
  };

  const isLoading = isBalanceLoading || isLedgerLoading;

  const stats = [
    {
      label: 'Available Balance',
      value: `$${balance.availableBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: <DollarSign size={22} />,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-100',
    },
    {
      label: 'Pending',
      value: `$${balance.pendingBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: <Clock size={22} />,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
    {
      label: 'Total Invested',
      value: `$${balance.totalInvested?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: <TrendingUp size={22} />,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      label: 'Total Received',
      value: `$${balance.totalReceived?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: <ArrowDownLeft size={22} />,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments & Ledger</h1>
          <p className="text-gray-500 text-sm mt-1">Track investments and financial activity</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
            <AlertTriangle size={12} />
            Sandbox Mode
          </div>
          <button
            id="make-investment-btn"
            onClick={() => setShowInvestModal(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-md shadow-purple-200 text-sm"
          >
            <CreditCard size={16} /> Make Investment
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`bg-white rounded-2xl border ${stat.border} p-5 shadow-sm`}>
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center ${stat.color} mb-3`}>
              {stat.icon}
            </div>
            <p className="text-gray-500 text-xs font-medium">{stat.label}</p>
            <p className={`text-xl font-bold mt-1 ${isLoading ? 'animate-pulse text-gray-300' : 'text-gray-900'}`}>
              {isLoading ? '—' : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Transaction Ledger */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Transaction History</h2>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as any)}
              className="border-none text-sm text-gray-600 focus:outline-none focus:ring-0 cursor-pointer"
            >
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {isLedgerLoading ? (
          <div className="p-8 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <DollarSign size={40} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">No transactions yet</p>
            <p className="text-sm mt-1">Make your first investment to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map((tx: any) => {
              const typeConfig = TYPE_CONFIG[tx.type] || { label: tx.type, icon: <DollarSign size={16} />, isCredit: false };
              const statusConfig = STATUS_CONFIG[tx.status] || STATUS_CONFIG.pending;
              return (
                <div
                  key={tx._id}
                  onClick={() => setSelectedTx(tx)}
                  className="flex items-center justify-between p-5 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeConfig.isCredit ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {typeConfig.icon}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{tx.description || typeConfig.label}</p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {new Date(tx.createdAt).toLocaleDateString()} · {tx.transactionRef?.slice(0, 12)}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${typeConfig.isCredit ? 'text-green-600' : 'text-gray-900'}`}>
                        {typeConfig.isCredit ? '+' : '-'}${tx.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-gray-400 text-xs">{tx.currency?.toUpperCase()}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Investment Modal */}
      {showInvestModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-purple-500" />
                <h2 className="text-xl font-bold text-gray-900">Make Investment</h2>
              </div>
              <button onClick={() => setShowInvestModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XCircle size={20} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleInvest} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                    <input
                      required
                      type="number"
                      min="1"
                      step="0.01"
                      value={investForm.amount}
                      onChange={e => setInvestForm(f => ({ ...f, amount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={investForm.currency}
                    onChange={e => setInvestForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-sm"
                  >
                    <option value="usd">USD</option>
                    <option value="eur">EUR</option>
                    <option value="gbp">GBP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient ID</label>
                <input
                  value={investForm.recipientId}
                  onChange={e => setInvestForm(f => ({ ...f, recipientId: e.target.value }))}
                  placeholder="Optional - paste user ID"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={investForm.description}
                  onChange={e => setInvestForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Investment purpose, deal notes..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-sm resize-none"
                />
              </div>

              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>This is a <strong>sandbox environment</strong>. No real money will be charged. Test card <code className="bg-amber-100 px-1 rounded">4242 4242 4242 4242</code> is auto-used.</span>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowInvestModal(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  id="confirm-payment-btn"
                  type="submit"
                  disabled={intentMutation.isPending || confirmMutation.isPending}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl transition-colors text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {intentMutation.isPending || confirmMutation.isPending ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CreditCard size={14} /> Confirm Investment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Detail Drawer */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Transaction Details</h3>
              <button onClick={() => setSelectedTx(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XCircle size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-center py-4">
                <p className={`text-3xl font-bold ${TYPE_CONFIG[selectedTx.type]?.isCredit ? 'text-green-600' : 'text-gray-900'}`}>
                  {TYPE_CONFIG[selectedTx.type]?.isCredit ? '+' : '-'}${selectedTx.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} {selectedTx.currency?.toUpperCase()}
                </p>
                <div className={`inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[selectedTx.status]?.bg} ${STATUS_CONFIG[selectedTx.status]?.color}`}>
                  {STATUS_CONFIG[selectedTx.status]?.icon} {STATUS_CONFIG[selectedTx.status]?.label}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Reference', value: selectedTx.transactionRef },
                  { label: 'Type', value: selectedTx.type },
                  { label: 'Description', value: selectedTx.description || '—' },
                  { label: 'Date', value: new Date(selectedTx.createdAt).toLocaleString() },
                  { label: 'Provider', value: selectedTx.provider || 'stripe' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-gray-900 font-medium text-right max-w-[60%] truncate">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
