const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const TOKEN_KEY = 'worksphere_token';
const USER_KEY = 'worksphere_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Calls the backend. Throws an Error with .code and .message from the
 * standard error shape in 01_SHARED_BRIEF.md section 6.
 */
export async function apiRequest(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const e = new Error('Cannot reach the server. Is the backend running?');
    e.code = 'NETWORK_ERROR';
    throw e;
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const e = new Error(data?.error?.message || `Request failed (${res.status}).`);
    e.code = data?.error?.code || 'SERVER_ERROR';
    e.status = res.status;
    throw e;
  }
  return data;
}

export const api = {
  health: () => apiRequest('/health'),
  login: (phone, password) =>
    apiRequest('/auth/login', { method: 'POST', body: { phone, password } }),
  me: () => apiRequest('/auth/me'),
  skills: () => apiRequest('/skills'),
  createRequest: (raw_text, input_mode = 'text') =>
    apiRequest('/requests', { method: 'POST', body: { raw_text, input_mode } }),
  myRequests: () => apiRequest('/requests/mine'),
  getRequest: (id) => apiRequest(`/requests/${id}`),
  getMatches: (requestId) => apiRequest(`/requests/${requestId}/matches`),
  createBooking: (service_request_id, worker_user_id, scheduled_slot, quoted_amount_inr) =>
    apiRequest('/bookings', {
      method: 'POST',
      body: { service_request_id, worker_user_id, scheduled_slot, quoted_amount_inr },
    }),
  myBookings: () => apiRequest('/bookings/mine'),
  getBooking: (id) => apiRequest(`/bookings/${id}`),
  acceptBooking: (id) => apiRequest(`/bookings/${id}/accept`, { method: 'POST' }),
  verifyStartOtp: (id, otp) =>
    apiRequest(`/bookings/${id}/verify-start-otp`, { method: 'POST', body: { otp } }),
  verifyCompletionOtp: (id, otp) =>
    apiRequest(`/bookings/${id}/verify-completion-otp`, { method: 'POST', body: { otp } }),
  cancelBooking: (id) => apiRequest(`/bookings/${id}/cancel`, { method: 'POST' }),
  getPayment: (id) => apiRequest(`/bookings/${id}/payment`),
  adminStats: () => apiRequest('/admin/stats'),
  adminRotationQueue: () => apiRequest('/admin/rotation-queue'),
  adminBookings: () => apiRequest('/admin/bookings'),
};
