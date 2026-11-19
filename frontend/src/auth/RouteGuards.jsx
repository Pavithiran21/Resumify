import { Navigate, Outlet, useLocation } from 'react-router';
import { LoadingScreen } from '../components/StatePanels';
import { useAuth } from './AuthContext';

/**
 * Pages for logged-in users, and the one place that sends a signed-out user to Log in (/).
 * A guest, or a user whose session ended by itself, comes back here after logging in, so a link
 * to a match result still opens that result. A user who logged out or deleted the account starts fresh.
 */
export function RequireAuth() {
  const { user, isLoading, signOutReason } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }
  if (!user) {
    const state = signOutReason ? null : { from: location };
    return <Navigate to="/" replace state={state} />;
  }
  return <Outlet />;
}

/** Log in (/), the demo, Create account and Forgot password. A logged-in user goes to the page they wanted, or Home (/home). */
export function GuestOnly() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }
  if (user) {
    const from = location.state?.from;
    return <Navigate to={from ? from.pathname + from.search : '/home'} replace />;
  }
  return <Outlet />;
}
