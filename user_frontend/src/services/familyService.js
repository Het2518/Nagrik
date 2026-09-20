import { apiGet, apiPost, apiPatch } from './api';

export const familyService = {
  register:         (data)               => apiPost('/families', data),
  getProfile:       (familyId)           => apiGet(`/families/${familyId}`),
  updateProfile:    (familyId, data)     => apiPatch(`/families/${familyId}`, data),
  addMember:        (familyId, data)     => apiPost(`/families/${familyId}/members`, data),
  getMember:        (familyId, memberId) => apiGet(`/families/${familyId}/members/${memberId}`),
  updateMember:     (familyId, memberId, data) => apiPatch(`/families/${familyId}/members/${memberId}/profile`, data),
  getApplications:  (familyId)           => apiGet(`/families/${familyId}/applications`),
};
