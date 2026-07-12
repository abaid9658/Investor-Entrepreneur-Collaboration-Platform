import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Auto-inject memory access tokens into authorization headers
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nexus_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: automatically handles expired tokens by requesting a refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error status is Unauthorized and request was not already a retry
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      !originalRequest.url.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        
        const { accessToken } = response.data.data;
        localStorage.setItem('nexus_access_token', accessToken);
        
        // Retry original API request with the new access token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshErr) {
        loggerRefreshError();
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

const loggerRefreshError = () => {
  localStorage.removeItem('nexus_access_token');
  localStorage.removeItem('business_nexus_user');
  // Avoid loop redirects if we are already on login page
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
};

export default axiosInstance;
