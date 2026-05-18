import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error?.details?.[0] ||
      error.message ||
      'Something went wrong';
    return Promise.reject({ 
      message, 
      details: error.response?.data?.error?.details || [] 
    });
  }
);

export const getSupportMembers = (params = {}) => {
  return api.get('/support-members', { params });
};

export const getSupportMember = (id) => {
  return api.get(`/support-members/${id}`);
};

export const createSupportMember = (data) => {
  return api.post('/support-members', data);
};

export const updateSupportMember = (id, data) => {
  return api.put(`/support-members/${id}`, data);
};

export const deleteSupportMember = (id) => {
  return api.delete(`/support-members/${id}`);
};

export const getWorkloads = () => {
  return api.get('/support-members/workload');
};

export const assignClients = (data) => {
  return api.post('/support-members/assign', data);
};

export const getAssignedClients = (id) => {
  return api.get(`/support-members/${id}/clients`);
};

export const assignClientsToMember = (id, clientIds) => {
  return api.post(`/support-members/${id}/assign-clients`, { clientIds });
};

export const removeClientFromMember = (id, clientId) => {
  return api.post(`/support-members/${id}/remove-client`, { clientId });
};
