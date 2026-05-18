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

export const getSchedules = async (params) => {
  return await api.get('/schedules', { params });
};

export const createSchedule = async (data) => {
  return await api.post('/schedules', data);
};

export const updateSchedule = async (id, data) => {
  return await api.put(`/schedules/${id}`, data);
};

export const cancelSchedule = async (id) => {
  return await api.delete(`/schedules/${id}`);
};
