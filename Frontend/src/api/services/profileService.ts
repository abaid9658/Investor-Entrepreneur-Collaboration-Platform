import axiosInstance from '../axiosInstance';

export const getProfiles = async (role?: string) => {
  const params = role ? { role } : {};
  const res = await axiosInstance.get('/profiles', { params });
  return res.data;
};

export const getMyProfile = async () => {
  const res = await axiosInstance.get('/profiles/me');
  return res.data;
};

export const updateMyProfile = async (payload: any) => {
  const res = await axiosInstance.put('/profiles/me', payload);
  return res.data;
};

export const getProfileById = async (userId: string) => {
  const res = await axiosInstance.get(`/profiles/${userId}`);
  return res.data;
};

export const uploadAvatar = async (formData: FormData) => {
  const res = await axiosInstance.post('/profiles/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return res.data;
};
