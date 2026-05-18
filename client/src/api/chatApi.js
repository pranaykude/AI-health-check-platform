import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1/chat',
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

// 1. Conversation REST APIs
export const getConversations = () => {
  return api.get('/conversations');
};

export const getConversationById = (id) => {
  return api.get(`/conversations/${id}`);
};

export const getClientConversations = (clientId) => {
  return api.get(`/conversations/client/${clientId}`);
};

// 2. Real-Time Messages REST APIs
export const getMessages = (conversationId) => {
  return api.get(`/messages/${conversationId}`);
};

export const markRead = (conversationId) => {
  return api.post(`/messages/${conversationId}/read`);
};

// 3. Secure Private Notes REST APIs (Step 5)
export const getInternalNotes = (clientId) => {
  return api.get(`/internal-notes/${clientId}`);
};

export const createInternalNote = (clientId, data) => {
  return api.post(`/internal-notes/${clientId}`, data);
};
