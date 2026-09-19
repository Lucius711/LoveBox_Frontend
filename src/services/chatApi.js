import axios from './api';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// ── REST ────────────────────────────────────────────────────────────────
export const listConversations   = ()          => axios.get('/chat/conversations').then(r => { const d = r.data; return Array.isArray(d) ? d : (d?.data ?? []); });
export const getConversation     = (id)        => axios.get(`/chat/conversations/${id}`).then(r => { const d = r.data; return d?.data ?? d; });
export const deleteConversation  = (id)        => axios.delete(`/chat/conversations/${id}`);
export const getPreferences      = ()          => axios.get('/chat/preferences').then(r => r.data.data);
export const updatePreferences   = (body)      => axios.put('/chat/preferences', body).then(r => r.data.data);

// ── SSE Streaming ───────────────────────────────────────────────────────
/**
 * Open an SSE stream for a chat message.
 * @param {object} opts
 *   conversationId?: string  (null → new conversation)
 *   message:         string
 *   onThinking():    void
 *   onChunk(text):   void
 *   onDone(event):   void    event = { messageId, conversationId, card, quickReplies, actions }
 *   onError(msg):    void
 * @returns {AbortController}  call .abort() to cancel
 */
export function streamChat({ conversationId, message, onThinking, onChunk, onDone, onError }) {
  const controller = new AbortController();
  const token = localStorage.getItem('access_token');

  (async () => {
    try {
      const res = await fetch(`${BASE}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ conversationId: conversationId || null, message }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        onError?.(err?.message || `HTTP ${res.status}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // SSE lines: "event: <type>\ndata: <json>\n\n"
        const blocks = buf.split('\n\n');
        buf = blocks.pop(); // keep incomplete tail

        for (const block of blocks) {
          const lines = block.split('\n');
          let eventType = '';
          let dataStr = '';
          for (const line of lines) {
            if (line.startsWith('event:')) eventType = line.slice(6).trim();
            if (line.startsWith('data:')) dataStr = line.slice(5).trim();
          }
          if (!dataStr) continue;

          try {
            const payload = JSON.parse(dataStr);
            if (eventType === 'thinking') onThinking?.();
            else if (eventType === 'chunk') onChunk?.(payload.text || '');
            else if (eventType === 'done')  onDone?.(payload);
            else if (eventType === 'error') onError?.(payload.message || 'Lỗi không xác định');
          } catch (_) { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') onError?.(err.message);
    }
  })();

  return controller;
}
