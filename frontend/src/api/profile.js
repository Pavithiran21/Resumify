import { apiRequest } from './client';

/** PATCH /me: the name is the only profile field. Returns the user. */
export const updateProfile = (name) => apiRequest('/me', { method: 'PATCH', body: { name } });

/**
 * Returns a new { user, accessToken }: every other session is signed out.
 * 400 WRONG_PASSWORD (a field error on currentPassword), 403 DEMO_ACCOUNT_LOCKED.
 */
export const changePassword = (currentPassword, newPassword) =>
  apiRequest('/me/password', { method: 'POST', body: { currentPassword, newPassword } });

/** Removes the account, resumes, jobs and matches. 400 WRONG_PASSWORD, 403 DEMO_ACCOUNT_LOCKED. */
export const deleteAccount = (password) => apiRequest('/me', { method: 'DELETE', body: { password } });
