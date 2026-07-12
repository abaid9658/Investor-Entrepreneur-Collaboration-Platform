import axiosInstance from '../axiosInstance';

// Get user's ledger balance summary
export const getMyBalance = async () => {
  const res = await axiosInstance.get('/payments/balance');
  return res.data;
};

// Get full ledger / transaction history
export const getLedger = async () => {
  const res = await axiosInstance.get('/payments/ledger');
  return res.data;
};

// Create a Stripe payment intent (sandbox)
export const createPaymentIntent = async (payload: {
  amount: number;
  currency: string;
  recipientId?: string;
  description?: string;
  type?: string;
}) => {
  const res = await axiosInstance.post('/payments/intent', payload);
  return res.data;
};

// Confirm a payment intent
export const confirmPayment = async (payload: {
  transactionId: string;
  paymentMethodId?: string;
}) => {
  const res = await axiosInstance.post('/payments/confirm', payload);
  return res.data;
};

// Get single transaction detail
export const getTransactionById = async (id: string) => {
  const res = await axiosInstance.get(`/payments/transaction/${id}`);
  return res.data;
};

// Legacy compatibility helpers
export const getPaymentDashboard = async () => {
  const res = await axiosInstance.get('/payments/dashboard');
  return res.data;
};

export const depositFunds = async (amount: number) => {
  const res = await axiosInstance.post('/payments/deposit', { amount });
  return res.data;
};

export const confirmDeposit = async (transactionId: string) => {
  const res = await axiosInstance.post('/payments/confirm-deposit', { transactionId });
  return res.data;
};

export const transferFunds = async (payload: { 
  amount: number; 
  recipientId: string; 
  description?: string; 
}) => {
  const res = await axiosInstance.post('/payments/transfer', payload);
  return res.data;
};

export const withdrawFunds = async (amount: number) => {
  const res = await axiosInstance.post('/payments/withdraw', { amount });
  return res.data;
};
