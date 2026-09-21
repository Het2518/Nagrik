import { apiGet, apiPost, apiPatch, apiDelete } from './api';

export const familyService = {
  register:         (data)               => apiPost('/families', data),
  getProfile:       (familyId)           => apiGet(`/families/${familyId}`),
  updateProfile:    (familyId, data)     => apiPatch(`/families/${familyId}`, data),
  addMember:        (familyId, data)     => apiPost(`/families/${familyId}/members`, data),
  getMember:        (familyId, memberId) => apiGet(`/families/${familyId}/members/${memberId}`),
  updateMember:     (familyId, memberId, data) => apiPatch(`/families/${familyId}/members/${memberId}/profile`, data),
  updateMemberLifecycle: (familyId, memberId, data) => apiPatch(`/families/${familyId}/members/${memberId}/lifecycle`, data),
  getApplications:  (familyId)           => apiGet(`/families/${familyId}/applications`),
  getDocuments:     (familyId)           => apiGet(`/families/${familyId}/documents`),
  addDocument:      (familyId, data)     => apiPost(`/families/${familyId}/documents`, data),
  deleteDocument:   (familyId, certNum)  => apiDelete(`/families/${familyId}/documents/${certNum}`),
  // Phase 1 — Family Lifecycle
  splitFamily:      (familyId, data)     => apiPost(`/families/${familyId}/split`, data),
  mergeFamily:      (familyId, data)     => apiPost(`/families/${familyId}/merge`, data),
  transferMember:   (familyId, memberId, data) => apiPost(`/families/${familyId}/members/${memberId}/transfer`, data),
  changeHead:       (familyId, data)     => apiPatch(`/families/${familyId}/change-head`, data),
  recalculateComposition: (familyId)     => apiPost(`/families/${familyId}/recalculate`),
  // Phase 3 — Evidence Locker & DigiLocker
  getCompleteness:  (familyId)           => apiGet(`/families/${familyId}/evidence/completeness`),
  matchScheme:      (familyId, code)     => apiGet(`/families/${familyId}/evidence/match-scheme/${code}`),
  renewDocument:    (familyId, docId, d) => apiPost(`/families/${familyId}/evidence/${docId}/renew`, d),
  getDigiLockerDocs:(familyId, memberId) => apiGet(`/families/${familyId}/digilocker/available${memberId ? `?memberId=${memberId}` : ''}`),
  importDigiLocker: (familyId, data)     => apiPost(`/families/${familyId}/digilocker/import`, data),
};
