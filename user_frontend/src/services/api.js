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

// ── Request Interceptor: attach JWT ──────────────────────────
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('nagrik_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response Interceptor: normalize errors ────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear session and redirect
      sessionStorage.removeItem('nagrik_token');
      sessionStorage.removeItem('nagrik_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Typed helpers ─────────────────────────────────────────────
export const apiGet    = (url, params)  => api.get(url, { params }).then(r => r.data.data);
export const apiPost   = (url, data)    => api.post(url, data).then(r => r.data.data);
export const apiPatch  = (url, data)    => api.patch(url, data).then(r => r.data.data);
export const apiDelete = (url, data)    => api.delete(url, { data }).then(r => r.data.data);
export const apiUpload = (url, formData) =>
  api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data);

export default api;
