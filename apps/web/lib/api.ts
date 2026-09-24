const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getAnonId(): string {
  if (typeof window === 'undefined') return 'server_side';
  let anonId = localStorage.getItem('planbot_anon_id');
  if (!anonId) {
    anonId = 'anon_' + Math.random().toString(36).substring(2, 12);
    localStorage.setItem('planbot_anon_id', anonId);
  }
  return anonId;
}

// No custom API keys: strictly server-side Gemini execution

async function request(path: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach anonymous identifier & timezone
  headers.set('X-Anon-Id', getAnonId());
  try {
    headers.set('X-Timezone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  } catch (e) {
    headers.set('X-Timezone', 'UTC');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: any = new Error(data?.error?.message || 'Network request failed');
    error.status = response.status;
    error.code = data?.error?.code || (data?.error ? data.error : null);
    error.details = data?.error;
    error.upgradeRequired = data?.upgradeRequired || data?.error?.upgradeRequired;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  register: (body: { email: string; password: string; name?: string }) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  googleLogin: (body: { email?: string; name?: string; googleId?: string; avatar?: string } = {}) =>
    request('/api/auth/google', { method: 'POST', body: JSON.stringify(body) }),

  logout: () =>
    request('/api/auth/logout', { method: 'POST' }),

  getMe: () =>
    request('/api/auth/me', { method: 'GET' }),

  // Subscription & Quota
  getSubscriptionStatus: () =>
    request('/api/subscription/status', { method: 'GET' }),

  createSubscriptionOrder: () =>
    request('/api/subscription/create-order', { method: 'POST' }),

  verifySubscriptionPayment: (body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature?: string }) =>
    request('/api/subscription/verify-payment', { method: 'POST', body: JSON.stringify(body) }),

  getQuota: () =>
    request('/api/subscription/status', { method: 'GET' }),

  // Conversations
  getConversations: (limit = 30) =>
    request(`/api/conversations?limit=${limit}`, { method: 'GET' }),

  getConversation: (id: string) =>
    request(`/api/conversations/${id}`, { method: 'GET' }),

  createConversation: (title: string, mode: string) =>
    request('/api/conversations', { method: 'POST', body: JSON.stringify({ title, mode }) }),

  renameConversation: (id: string, title: string) =>
    request(`/api/conversations/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),

  deleteConversation: (id: string) =>
    request(`/api/conversations/${id}`, { method: 'DELETE' }),

  // Sharing
  sharePoem: (payload: {
    prompt: string;
    content: string;
    mode: string;
    poemType?: string;
    genre?: string;
    tone?: string;
    language?: string;
  }) =>
    request('/api/poems/share', { method: 'POST', body: JSON.stringify(payload) }),

  getPublicPoem: (slug: string) =>
    request(`/api/poems/p/${slug}`, { method: 'GET' }),

  // Originality & Similarity Screening
  checkOriginality: (body: { content: string; contentType?: string; contentId?: string }) =>
    request('/api/originality/check', { method: 'POST', body: JSON.stringify(body) })
};
