import { useQuery } from '@tanstack/react-query';
import { getDemoAccounts } from '../../api/demo';
import { queryKeys } from '../../api/queryKeys';

/**
 * The demo accounts, or an error when demo mode is off (GET /api/demo answers 404). One cached
 * query serves the "Try the demo" link on Log in, the demo page and the note on Forgot password.
 */
export function useDemoAccounts() {
  return useQuery({ queryKey: queryKeys.demo, queryFn: getDemoAccounts, retry: false, staleTime: Infinity });
}
