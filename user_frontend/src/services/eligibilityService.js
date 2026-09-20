import { apiGet } from './api';

export const eligibilityService = {
  check:    (familyId, memberId) => apiGet(`/eligibility/${familyId}`, memberId ? { memberId } : undefined),
};
