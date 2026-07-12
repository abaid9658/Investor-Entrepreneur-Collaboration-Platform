import axiosInstance from '../axiosInstance';

export const createMeeting = async (payload: any) => {
  const res = await axiosInstance.post('/meetings', payload);
  return res.data;
};

export const getMyMeetings = async () => {
  const res = await axiosInstance.get('/meetings');
  return res.data;
};

export const getMeetingById = async (id: string) => {
  const res = await axiosInstance.get(`/meetings/${id}`);
  return res.data;
};

export const updateMeetingStatus = async (id: string, status: string) => {
  const res = await axiosInstance.put(`/meetings/${id}/status`, { status });
  return res.data;
};

export const rescheduleMeeting = async (id: string, payload: { startTime: string; endTime: string }) => {
  const res = await axiosInstance.put(`/meetings/${id}/reschedule`, payload);
  return res.data;
};

export const deleteMeeting = async (id: string) => {
  const res = await axiosInstance.delete(`/meetings/${id}`);
  return res.data;
};
