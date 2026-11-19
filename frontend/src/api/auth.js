import { apiRequest } from './client';

// Calls made before there is a session use auth: false, so a 401 (wrong password) stays a form error.

export const login = (credentials) => apiRequest('/auth/login', { method: 'POST', body: credentials, auth: false });

export const register = (input) => apiRequest('/auth/register', { method: 'POST', body: input, auth: false });

export const logout = () => apiRequest('/auth/logout', { method: 'POST', auth: false });

/** 202 with the same message whether or not the account exists. */
export const forgotPassword = (email) =>
  apiRequest('/auth/forgot-password', { method: 'POST', body: { email }, auth: false });

/** 204; 400 RESET_LINK_EXPIRED for a used, replaced or expired link. */
export const resetPassword = (token, password) =>
  apiRequest('/auth/reset-password', { method: 'POST', body: { token, password }, auth: false });
