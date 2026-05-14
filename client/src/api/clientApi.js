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

export const getClients = (params = {}) => {
  return api.get('/clients', { params });
};

export const getClient = (id) => {
  return api.get(`/clients/${id}`);
};

export const createClient = (data) => {
  return api.post('/clients', data);
};

export const updateClient = (id, data) => {
  return api.put(`/clients/${id}`, data);
};

export const deleteClient = async (id) => {
  const response = await api.delete(`/clients/${id}`);
  return response.data;
};

export const uploadClients = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/clients/upload', formData);
};

export const getStats = async () => {
  return api.get('/clients/stats');
};
