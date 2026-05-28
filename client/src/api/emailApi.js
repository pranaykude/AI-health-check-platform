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

/**
 * Helper to convert a File object to base64 string
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Sends a real email through the backend Resend service
 * @param {Object} emailData - Email options including to, cc, subject, bodyHtml, and attachments
 */
export const sendRealEmail = async (emailData) => {
  const preparedAttachments = [];
  
  if (emailData.attachments && emailData.attachments.length > 0) {
    for (const att of emailData.attachments) {
      if (att.rawFile) {
        try {
          const base64Content = await fileToBase64(att.rawFile);
          preparedAttachments.push({
            name: att.name,
            type: att.type,
            content: base64Content,
          });
        } catch (err) {
          console.error('Failed to convert attachment:', att.name, err);
        }
      }
    }
  }

  return api.post('/emails/send', {
    to: emailData.to,
    cc: emailData.cc,
    subject: emailData.subject,
    bodyHtml: emailData.bodyHtml,
    attachments: preparedAttachments,
  });
};
