import axios from 'axios';

// Base URL configuration - using the specific endpoint requested in Step 3
const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Initiate an outbound call
 * POST /api/calls/initiate
 */
export const initiateCall = async (clientId) => {
  try {
    const response = await axios.post(`${API_BASE}/api/v1/calls/initiate`, { clientId });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: error.message };
  }
};

/**
 * Get call history with pagination and status filtering
 * GET /api/calls
 */
export const getCallHistory = async (page = 1, status = '', limit = 20) => {
  try {
    const response = await axios.get(`${API_BASE}/api/v1/calls`, {
      params: { page, status, limit }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: error.message };
  }
};

/**
 * Get real-time queue statistics
 * GET /api/queue/stats
 */
export const getQueueStats = async () => {
  try {
    const response = await axios.get(`${API_BASE}/api/v1/queue/stats`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: error.message };
  }
};

/**
 * Retry a failed call
 * POST /api/calls/:id/retry
 */
export const retryCall = async (id) => {
  try {
    const response = await axios.post(`${API_BASE}/api/v1/calls/${id}/retry`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: error.message };
  }
};
/**
 * Get single call details by ID
 * GET /api/calls/:id
 */
export const getCallDetail = async (id) => {
  try {
    const response = await axios.get(`${API_BASE}/api/v1/calls/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: error.message };
  }
};
