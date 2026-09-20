import { apiGet, apiPost, apiPatch } from './api';

export const v2WelfareService = {
  // Flagship "Analyze My Family" endpoint
  analyzeFamily: (familyId) => apiPost(`/families/${familyId}/analyze`),

  // Family Benefit Graph
  getGraph: (familyId) => apiGet(`/families/${familyId}/graph`),

  // Benefit Gap Detector
  getBenefitGaps: (familyId) => apiGet(`/families/${familyId}/benefit-gaps`),

  // Active / Entitled Benefits
  getFamilyBenefits: (familyId) => apiGet(`/families/${familyId}/benefits`),

  // Reusable Evidence Registry
  getEvidenceRegistry: (familyId) => apiGet(`/families/${familyId}/evidence-registry`),

  // Life Events History
  getLifeEvents: (familyId) => apiGet(`/families/${familyId}/life-events`),

  // Simulate Life Event (Interactive impact analysis)
  simulateLifeEvent: (familyId, payload) => apiPost(`/families/${familyId}/simulate-life-event`, payload),

  // Record a real life event
  recordLifeEvent: (payload) => apiPost('/life-events', payload),

  // Citizen Notifications
  getNotifications: () => apiGet('/notifications').then((d) => d?.notifications || []),

  markNotificationRead: (id) => apiPatch(`/notifications/${id}/read`),

  // Interoperability Connectors Status
  getConnectorsStatus: () => apiGet('/integrations/status'),
};
