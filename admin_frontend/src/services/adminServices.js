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
  search:         (params) => apiGet('/families', params),
  getById:        (id)     => apiGet(`/families/${id}`),
  verify:         (id, notes) => apiPost(`/families/${id}/verify`, { action: 'Approve', verificationNotes: notes }),
  reject:         (id, notes) => apiPost(`/families/${id}/verify`, { action: 'Reject', verificationNotes: notes }),
  setStatus:      (id, s)  => apiPatch(`/families/${id}/status`, { status: s }),
  verifyDocument: (familyId, certNumber, data) => apiPost(`/families/${familyId}/documents/${certNumber}/verify`, data),
  // Phase 1 — Family Lifecycle
  splitFamily:     (id, data)  => apiPost(`/families/${id}/split`, data),
  mergeFamily:     (id, data)  => apiPost(`/families/${id}/merge`, data),
  transferMember:  (id, memberId, data) => apiPost(`/families/${id}/members/${memberId}/transfer`, data),
  changeHead:      (id, data)  => apiPatch(`/families/${id}/change-head`, data),
  recalculate:     (id)        => apiPost(`/families/${id}/recalculate`),
  addMember:       (id, data)  => apiPost(`/families/${id}/members`, data),
  updateMember:    (id, memberId, data) => apiPatch(`/families/${id}/members/${memberId}/profile`, data),
};

export const applicationService = {
  list:                 (params) => apiGet('/applications', params),
  getById:              (id)     => apiGet(`/applications/${id}`),
  getChecklist:         (id)     => apiGet(`/applications/${id}/checklist`),
  decide:               (id, d)  => apiPost(`/applications/${id}/decide`, d),
  bulkDecide:           (d)      => apiPost('/applications/bulk-decide', d),
  requestClarification: (id, d)  => apiPost(`/applications/${id}/clarify`, d),
  escalate:             (id, d)  => apiPost(`/applications/${id}/escalate`, d),
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
  // Phase 2 — Rule Versioning
  createVersion:    (code, d) => apiPost(`/schemes/${code}/version`, d),
  getHistory:       (code)    => apiGet(`/schemes/${code}/versions`),
  rollback:         (code, v, d) => apiPost(`/schemes/${code}/rollback/${v}`, d),
};

export const socialRegistryService = {
  getOverview:      (p)        => apiGet('/schemes/social-registry/overview', p),
  recalculate:      (d)        => apiPost('/schemes/social-registry/recalculate', d),
  getFamilyScore:   (familyId) => apiGet(`/schemes/social-registry/family/${familyId}`),
};

export const v2WelfareService = {
  getCaseView:       (id)     => apiGet(`/v2/officer/families/${id}/case-view`),
  getOfficerTasks:   (params) => apiGet('/v2/officer/tasks', params),
  updateTask:        (id, d)  => apiPatch(`/v2/officer/tasks/${id}`, d),
  getRiskSignals:    ()       => apiGet('/v2/risk-signals'),
  verifyLifeEvent:   (id)     => apiPost(`/v2/life-events/${id}/verify`),
};

export const analyticsService = {
  getGeographicSaturation: (p) => apiGet('/v2/analytics/geographic-saturation', p),
  getPriorityFamilies:      (p) => apiGet('/v2/analytics/priority-families', p),
  triggerCron:              (d) => apiPost('/v2/cron/trigger', d),
};

export const auditService = {
  list:        (p)        => apiGet('/auditlogs', p),
  getTimeline: (id, p)    => apiGet(`/auditlogs/timeline/${id}`, p),
  exportUrl:   ()         => '/api/v1/auditlogs/export',
};

export const dataQualityService = {
  getReport:       (params)   => apiGet('/data-quality/report', params),
  getIncomplete:   (params)   => apiGet('/data-quality/incomplete', params),
  getFamilyScore:  (id)       => apiGet(`/data-quality/family/${id}`),
  sendNudge:       (id, data) => apiPost(`/data-quality/family/${id}/nudge`, data),
};
