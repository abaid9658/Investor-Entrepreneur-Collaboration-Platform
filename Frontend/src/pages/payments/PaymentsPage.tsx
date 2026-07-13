import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownLeft,
  CreditCard, Filter, CheckCircle, Clock, XCircle,
  Download, RefreshCw, ChevronRight, AlertTriangle, User, Calendar, ShieldCheck
} from 'lucide-react';
import {
  getLedger,
  getMyBalance,
  createPaymentIntent,
  confirmPayment,
  getTransactionById,
} from '../../api/services/paymentService';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: 'text-amber-600',  bg: 'bg-amber-50',  icon: <Clock size={14} /> },
  completed: { label: 'Completed', color: 'text-green-600',  bg: 'bg-green-50',  icon: <CheckCircle size={14} /> },
  failed:    { label: 'Failed',    color: 'text-red-600',    bg: 'bg-red-50',    icon: <XCircle size={14} /> },
  refunded:  { label: 'Refunded',  color: 'text-blue-600',   bg: 'bg-blue-50',   icon: <RefreshCw size={14} /> },
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; isCredit: boolean }> = {
  deposit:        { label: 'Deposit',        icon: <ArrowDownLeft size={16} />, isCredit: true  },
  withdraw:       { label: 'Withdrawal',     icon: <ArrowUpRight size={16} />,  isCredit: false },
  transfer:       { label: 'Transfer',       icon: <ArrowUpRight size={16} />,  isCredit: false },
  investment:     { label: 'Investment',     icon: <ArrowDownLeft size={16} />, isCredit: true  },
  withdrawal:     { label: 'Withdrawal',     icon: <ArrowUpRight size={16} />,  isCredit: false },
  subscription:   { label: 'Subscription',  icon: <CreditCard size={16} />,    isCredit: false },
  milestone:      { label: 'Milestone',     icon: <TrendingUp size={16} />,    isCredit: true  },
};

export const PaymentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [investForm, setInvestForm] = useState({ amount: '', currency: 'usd', recipientId: '', description: '' });
  const [cardForm, setCardForm] = useState({ name: '', number: '', expiry: '', cvv: '' });
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

  const confirmMutation = useMutation({
    mutationFn: confirmPayment,
    onSuccess: () => {
      toast.success('Payment completed! (Sandbox mode)');
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      setShowInvestModal(false);
      setIsProcessing(false);
      setInvestForm({ amount: '', currency: 'usd', recipientId: '', description: '' });
      setCardForm({ name: '', number: '', expiry: '', cvv: '' });
    },
    onError: (err: any) => {
      setIsProcessing(false);
      toast.error(err.response?.data?.message || 'Payment confirmation failed');
    },
  });

  const intentMutation = useMutation({
    mutationFn: createPaymentIntent,
    onSuccess: async (data) => {
      const txId = data.data?.transactionId;
      if (txId) {
        await confirmMutation.mutateAsync({ transactionId: txId, paymentMethodId: 'pm_card_visa' });
      }
    },
    onError: (err: any) => {
      setIsProcessing(false);
      toast.error(err.response?.data?.message || 'Payment initiation failed');
    },
  });

  const handleInvestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!investForm.amount || parseFloat(investForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!cardForm.name || !cardForm.number || !cardForm.expiry || !cardForm.cvv) {
      toast.error('Please fill in all credit card details');
      return;
    }
    
    setIsProcessing(true);
    intentMutation.mutate({
      amount: parseFloat(investForm.amount),
      currency: investForm.currency,
      recipientId: investForm.recipientId || undefined,
      description: investForm.description,
      type: 'investment',
    });
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments & Ledger</h1>
          <p className="text-gray-600">Track and manage your platform balances</p>
        </div>
        <Button leftIcon={<CreditCard size={18} />} onClick={() => { setShowInvestModal(true); }}>
          Make Investment
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Available Balance', value: balance.availableBalance, color: 'text-purple-600', icon: <DollarSign size={20} /> },
          { label: 'Pending', value: balance.pendingBalance, color: 'text-amber-600', icon: <Clock size={20} /> },
          { label: 'Total Invested', value: balance.totalInvested, color: 'text-gray-900', icon: <ArrowUpRight size={20} /> },
          { label: 'Total Received', value: balance.totalReceived, color: 'text-green-600', icon: <ArrowDownLeft size={20} /> }
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-gray-500">{stat.label}</span>
              <div className="p-2 bg-gray-50 rounded-lg text-gray-400">{stat.icon}</div>
            </div>
            <div className="mt-4">
              <h3 className={`text-2xl font-bold ${stat.color}`}>
                ${stat.value?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Ledger History */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="text-purple-500 animate-spin-slow" size={18} />
            <h2 className="text-lg font-bold text-gray-900">Transaction History</h2>
          </div>
          <div className="flex gap-2">
            {(['all', 'completed', 'pending', 'failed'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${filter === tab ? 'bg-purple-100 text-purple-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {isLedgerLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 text-gray-500 space-y-2">
            <Clock className="mx-auto text-gray-300" size={36} />
            <h3 className="font-semibold text-gray-700">No transactions recorded</h3>
            <p className="text-sm">Deposit or invest to start ledger entries.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((tx: any) => {
              const typeConfig = TYPE_CONFIG[tx.type] || TYPE_CONFIG.investment;
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
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-purple-500" />
                <h2 className="text-lg font-bold text-gray-900">Make Investment</h2>
              </div>
              <button onClick={() => setShowInvestModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XCircle size={20} className="text-gray-400" />
              </button>
            </div>

            {isProcessing ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-12 h-12 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mx-auto" />
                <h3 className="font-bold text-gray-900 text-lg">Authorizing Card...</h3>
                <p className="text-gray-500 text-sm">Please do not refresh. Securing sandbox tokens with Stripe.</p>
              </div>
            ) : (
              <form onSubmit={handleInvestSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Amount *</label>
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
                        className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Currency</label>
                    <select
                      value={investForm.currency}
                      onChange={e => setInvestForm(f => ({ ...f, currency: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-sm bg-white"
                    >
                      <option value="usd">USD</option>
                      <option value="eur">EUR</option>
                      <option value="gbp">GBP</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Recipient User ID</label>
                  <input
                    value={investForm.recipientId}
                    onChange={e => setInvestForm(f => ({ ...f, recipientId: e.target.value }))}
                    placeholder="Optional - paste user ID"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description / Memo</label>
                  <input
                    value={investForm.description}
                    onChange={e => setInvestForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Investment purpose, deal notes..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-sm"
                  />
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Credit Card Information</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Cardholder Name *</label>
                      <input
                        required
                        value={cardForm.name}
                        onChange={e => setCardForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Sarah Johnson"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Card Number *</label>
                      <input
                        required
                        maxLength={19}
                        value={cardForm.number}
                        onChange={e => setCardForm(f => ({ ...f, number: formatCardNumber(e.target.value) }))}
                        placeholder="4242 4242 4242 4242"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Expiry Date *</label>
                      <input
                        required
                        maxLength={5}
                        value={cardForm.expiry}
                        onChange={e => setCardForm(f => ({ ...f, expiry: formatExpiry(e.target.value) }))}
                        placeholder="MM/YY"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">CVV *</label>
                      <input
                        required
                        maxLength={4}
                        value={cardForm.cvv}
                        onChange={e => setCardForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g,'') }))}
                        placeholder="123"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowInvestModal(false)}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={intentMutation.isPending || confirmMutation.isPending}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    Confirm Investment
                  </button>
                </div>
              </form>
            )}
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
