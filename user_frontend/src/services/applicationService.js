import { apiGet, apiPost, apiPatch, apiDelete } from './api';
import { apiUpload } from './api';

export const applicationService = {
  submit:               (data)     => apiPost('/applications', data),
  list:                 (params)   => apiGet('/applications', params),
  getById:              (id)       => apiGet(`/applications/${id}`),
  withdraw:             (id)       => apiDelete(`/applications/${id}`),
  resubmit:             (id, data) => apiPatch(`/applications/${id}/resubmit`, data),
  respondClarification: (id, data) => apiPost(`/applications/${id}/respond-clarify`, data),
};

export const uploadService = {
  uploadDocument: (file, docKey) => {
    const form = new FormData();
    form.append('document', file);
    form.append('docKey', docKey);
    return apiUpload('/uploads/document', form);
  },
  deleteDocument: (publicId) => apiDelete('/uploads/document', { publicId }),
};
