import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('nagrik_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('nagrik_admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const apiGet    = (url, params) => api.get(url, { params }).then(r => r.data.data);
export const apiPost   = (url, data)   => api.post(url, data).then(r => r.data.data);
export const apiPatch  = (url, data)   => api.patch(url, data).then(r => r.data.data);
export const apiDelete = (url, data)   => api.delete(url, { data }).then(r => r.data.data);

export default api;
