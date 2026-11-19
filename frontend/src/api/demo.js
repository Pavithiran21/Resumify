import { apiRequest } from './client';

/** { accounts: [{ role, email, password }] } in demo mode; 404 otherwise (the demo block is hidden). */
export const getDemoAccounts = () => apiRequest('/demo', { auth: false });
