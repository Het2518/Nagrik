import axios from 'axios';

let rawBaseUrl = import.meta.env.VITE_API_URL || 'https://nagrik-backend-iz5j.onrender.com/api/v1';
rawBaseUrl = rawBaseUrl.trim().replace(/\/+$/, '');
if (!rawBaseUrl.endsWith('/api/v1')) {
  rawBaseUrl = `${rawBaseUrl}/api/v1`;
}
const BASE_URL = rawBaseUrl;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
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
