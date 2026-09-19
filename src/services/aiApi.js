import api from './axiosInstance';
export const createConversation = ()                        => api.post('/ai/conversations');
export const getConversation    = (id)                      => api.get(`/ai/conversations/${id}`);
export const sendMessage        = (conversationId, message) =>
  api.post(`/ai/conversations/${conversationId}/messages`, { message });
export const generateImage      = (prompt, conversationId)  =>
  api.post('/ai/images/generate', { prompt, conversationId });
export const createGiftDesign   = (payload)                 => api.post('/gift-designs', payload);
export const createGreetingWish = (payload)                 => api.post('/greeting-wishes', payload);
export const getMyGiftDesigns   = ()                            => api.get('/gift-designs').then(r => { const d = r.data; return Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []); });

