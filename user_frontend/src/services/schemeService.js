import { apiGet } from './api';

export const schemeService = {
  list:       (params) => apiGet('/schemes', params),
  getByCode:  (code)   => apiGet(`/schemes/${code}`),
};
