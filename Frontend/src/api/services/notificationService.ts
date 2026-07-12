import axiosInstance from '../axiosInstance';

export const getNotifications = async () => {
  const res = await axiosInstance.get('/notifications');
  return res.data;
};

export const markAsRead = async (id: string) => {
  const res = await axiosInstance.put(`/notifications/${id}/read`);
  return res.data;
};

export const markAllAsRead = async () => {
  const res = await axiosInstance.put('/notifications/read-all');
  return res.data;
};
