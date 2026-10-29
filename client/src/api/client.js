import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalise errors to a message string on the rejection.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Request failed';
    error.message = message;
    // Auto-logout on auth failure (but not during the login request itself).
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export default api;
