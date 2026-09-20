import { apiGet, apiPost, apiPatch } from './api';

export const v2AdminService = {
  // 360-degree Family Case View
  getFamilyCaseView: (familyId) => apiGet(`/officer/families/${familyId}/case-view`),

  // Officer Actionable Tasks
  getTasks: (params) => apiGet('/officer/tasks', params),
  updateTask: (taskId, data) => apiPatch(`/officer/tasks/${taskId}`, data),

  // Life Event Verification
  verifyLifeEvent: (eventId, notes = '') => apiPost(`/life-events/${eventId}/verify`, { notes }),

  // Risk Signals
  getRiskSignals: (params) => apiGet('/risk-signals', params),

  // Government Data Connector Status
  getIntegrationsStatus: () => apiGet('/integrations/status'),
};

export default v2AdminService;
