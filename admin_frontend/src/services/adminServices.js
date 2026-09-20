import { apiPost, apiGet, apiPatch, apiDelete } from './api';

export const authService = {
  loginTalati:   (d) => apiPost('/auth/officer/talati/login', d),
  loginOfficer:  (d) => apiPost('/auth/officer/login', d),
  getMe:         ()  => apiGet('/auth/me'),
  registerOfficer: (d) => apiPost('/auth/officer/register', d),
};

export const dashboardService = {
  getSummary: () => apiGet('/dashboard'),
};

export const familyService = {
  search:     (params) => apiGet('/families', params),
  getById:    (id)     => apiGet(`/families/${id}`),
  verify:     (id)     => apiPost(`/families/${id}/verify`),
  setStatus:  (id, s)  => apiPatch(`/families/${id}/status`, { status: s }),
};

export const applicationService = {
  list:         (params) => apiGet('/applications', params),
  getById:      (id)     => apiGet(`/applications/${id}`),
  getChecklist: (id)     => apiGet(`/applications/${id}/checklist`),
  decide:       (id, d)  => apiPost(`/applications/${id}/decide`, d),
};

export const schemeService = {
  list:             (p)       => apiGet('/schemes', p),
  getByCode:        (code)    => apiGet(`/schemes/${code}`),
  create:           (d)       => apiPost('/schemes', d),
  update:           (code, d) => apiPatch(`/schemes/${code}`, d),
  deactivate:       (code)    => apiDelete(`/schemes/${code}`),
  getBeneficiaries: (code, p) => apiGet(`/schemes/${code}/beneficiaries`, p),
  nudgeBeneficiary: (code, d) => apiPost(`/schemes/${code}/nudge`, d),
  triggerCron:      (code)    => apiPost(`/schemes/${code}/evaluate-cron`),
};

export const auditService = {
  list: (p) => apiGet('/auditlogs', p),
};
