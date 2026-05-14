import axios from 'axios';

// Use the existing axios instance pattern
const api = axios.create({
  baseURL: '/api/v1',
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';
    return Promise.reject({ message });
  }
);

/**
 * Get call history
 * GET /api/calls
 */
export const getCalls = (params = {}) => {
  return api.get('/calls', { params });
};

/**
 * Trigger a new call for a client
 * POST /api/calls/trigger
 */
export const triggerCall = (clientId) => {
  return api.post('/calls/initiate', { clientId });
};

/**
 * Get real-time queue health/stats
 * GET /api/queue/health
 */
export const fetchQueueHealth = async () => {
  try {
    const res = await fetch("/api/queue/health");
    
    if (!res.ok) {
      throw new Error("API failed");
    }

    const data = await res.json();
    return data;

  } catch (err) {
    console.error("QUEUE FETCH ERROR:", err);
    return null;
  }
};


export default {
  getCalls,
  triggerCall,
  fetchQueueHealth
};
