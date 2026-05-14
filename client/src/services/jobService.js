import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject({ message });
  }
);

/**
 * Get recent background jobs from the queue
 * GET /api/v1/jobs
 */
export const getJobs = (params = {}) => {
  return api.get('/jobs', { params });
};

/**
 * Get job details by ID
 * GET /api/v1/jobs/:id
 */
export const getJobDetails = (id) => {
  return api.get(`/jobs/${id}`);
};

export default {
  getJobs,
  getJobDetails
};
