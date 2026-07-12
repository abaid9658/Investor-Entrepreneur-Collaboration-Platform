import axiosInstance from '../axiosInstance';

export const getConversations = async () => {
  const res = await axiosInstance.get('/chat/conversations');
  return res.data;
};

export const getMessages = async (receiverId: string) => {
  const res = await axiosInstance.get(`/chat/messages/${receiverId}`);
  return res.data;
};
