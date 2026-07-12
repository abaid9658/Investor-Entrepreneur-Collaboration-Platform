import axiosInstance from '../axiosInstance';

export const uploadDocument = async (formData: FormData) => {
  const res = await axiosInstance.post('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const uploadNewVersion = async (id: string, formData: FormData) => {
  const res = await axiosInstance.post(`/documents/${id}/version`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

// Get all documents belonging to current user (alias for getDocuments)
export const getMyDocuments = async () => {
  const res = await axiosInstance.get('/documents');
  return res.data;
};

export const getDocuments = async () => {
  const res = await axiosInstance.get('/documents');
  return res.data;
};

export const getDocumentById = async (id: string) => {
  const res = await axiosInstance.get(`/documents/${id}`);
  return res.data;
};

export const getDocumentVersions = async (id: string) => {
  const res = await axiosInstance.get(`/documents/${id}/versions`);
  return res.data;
};

export const shareDocument = async (id: string, sharedWithUserId: string) => {
  const res = await axiosInstance.post(`/documents/${id}/share`, { sharedWithUserId });
  return res.data;
};

// Accept payload object with signatureImage + signerNote
export const signDocument = async (
  id: string,
  payload: { signatureImage: string; signerNote?: string }
) => {
  const res = await axiosInstance.post(`/documents/${id}/sign`, payload);
  return res.data;
};

export const deleteDocument = async (id: string) => {
  const res = await axiosInstance.delete(`/documents/${id}`);
  return res.data;
};
