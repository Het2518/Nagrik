import { apiPost, apiGet, apiPatch } from './api';

export const authService = {
  register:       (data)     => apiPost('/auth/citizen/register', data),
  login:          (data)     => apiPost('/auth/citizen/login', data),
  getMe:          ()         => apiGet('/auth/me'),
  changePassword: (data)     => apiPatch('/auth/citizen/change-password', data),
};
