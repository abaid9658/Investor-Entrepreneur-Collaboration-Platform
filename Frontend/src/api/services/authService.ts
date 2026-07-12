import axiosInstance from '../axiosInstance';

export const registerUser = async (payload: any) => {
  const res = await axiosInstance.post('/auth/register', payload);
  return res.data;
};

export const loginUser = async (payload: any) => {
  const res = await axiosInstance.post('/auth/login', payload);
  return res.data;
};

export const verify2FALogin = async (payload: { email: string; code: string }) => {
  const res = await axiosInstance.post('/auth/verify-2fa', payload);
  return res.data;
};

export const logoutUserApi = async () => {
  const res = await axiosInstance.post('/auth/logout');
  return res.data;
};

export const forgotPasswordApi = async (email: string) => {
  const res = await axiosInstance.post('/auth/forgot-password', { email });
  return res.data;
};

export const resetPasswordApi = async (payload: any) => {
  const res = await axiosInstance.post('/auth/reset-password', payload);
  return res.data;
};
