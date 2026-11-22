import { apiRequest } from './client';

/** { accounts: [{ role, email }] } in demo mode; 404 otherwise (the demo block is hidden). Never a password. */
export const getDemoAccounts = () => apiRequest('/demo', { auth: false });

/** "Log in as <role>": the backend starts the demo account's session, no password needed. { user, accessToken } */
export const demoLogin = (role) => apiRequest('/demo/login', { method: 'POST', body: { role }, auth: false });
