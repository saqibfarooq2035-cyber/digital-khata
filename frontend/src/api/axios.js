import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error?.config?.url?.includes('/auth/login');

    if (!isLoginRequest) {
      const isNetworkError = !error?.response;
      const message = error?.response?.data?.message || (isNetworkError ? 'Network error' : 'Failed to load data');
      toast.error(message);

      if (error?.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
