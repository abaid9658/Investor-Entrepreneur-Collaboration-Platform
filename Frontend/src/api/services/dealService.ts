import axiosInstance from '../axiosInstance';

export const getDeals = async () => {
  const res = await axiosInstance.get('/deals');
  return res.data;
};

export const createDeal = async (dealData: {
  entrepreneurId: string;
  startupName: string;
  industry?: string;
  amount: number;
  equity?: string;
  status?: string;
  stage?: string;
  notes?: string;
}) => {
  const res = await axiosInstance.post('/deals', dealData);
  return res.data;
};

export const updateDeal = async (id: string, updates: Partial<{
  status: string;
  notes: string;
  equity: string;
  amount: number;
  stage: string;
}>) => {
  const res = await axiosInstance.put(`/deals/${id}`, updates);
  return res.data;
};

export const deleteDeal = async (id: string) => {
  const res = await axiosInstance.delete(`/deals/${id}`);
  return res.data;
};

export const getEntrepreneurs = async () => {
  const res = await axiosInstance.get('/deals/entrepreneurs');
  return res.data;
};
