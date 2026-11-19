import { IconLogout } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as authApi from '../api/auth';
import { refreshSession, setAccessToken, setSessionEndedHandler } from '../api/client';
import { useToast } from '../toast/ToastContext';
import { AuthContext } from './AuthContext';

const SESSION_ENDED_MESSAGE = 'Your session has ended. Please log in again.';

/**
 * Holds the signed-in user. The access token itself stays inside api/client.js.
 * On first load the refresh cookie restores the session, so a page reload keeps you logged in.
 */
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Set when the user ended the session on purpose ('logged-out', 'account-deleted'). RequireAuth
  // then sends them to a fresh Log in instead of remembering the page they were on.
  const [signOutReason, setSignOutReason] = useState(null);
  const userRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
    // Cached server data belongs to one user. Clear it after the logged-in pages are gone
    // (this effect runs after they unmount), so nothing refetches it without a token.
    if (!user) {
      queryClient.clear();
    }
  }, [user, queryClient]);

  useEffect(() => {
    let cancelled = false;
    refreshSession().then((session) => {
      if (!cancelled) {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // A logged-in request got 401 and the refresh failed: the token was signed with another
  // secret (a new demo), the account is gone, or the session expired. RequireAuth then shows
  // Log in, and this toast says why (UI-UX.md "States", Session).
  useEffect(() => {
    setSessionEndedHandler(() => {
      if (!userRef.current) {
        return; // Already logged out (a request that was in flight during logout).
      }
      setAccessToken(null);
      setUser(null);
      showToast({ message: SESSION_ENDED_MESSAGE, icon: IconLogout });
    });
  }, [showToast]);

  /** After log in, sign-up or a password change: { user, accessToken }. */
  const startSession = useCallback((session) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    setSignOutReason(null);
  }, []);

  /** Forgets the session in this tab only, after the server has already ended it. */
  const endSessionLocally = useCallback((reason = null) => {
    setAccessToken(null);
    setUser(null);
    setSignOutReason(reason);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      signOutReason,
      login: async (credentials) => startSession(await authApi.login(credentials)),
      register: async (input) => startSession(await authApi.register(input)),
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // The session ends in this tab anyway; the cookie expires on its own.
        }
        endSessionLocally('logged-out');
      },
      // After PATCH /me: the new name shown everywhere.
      updateUser: setUser,
      startSession,
      endSessionLocally,
    }),
    [user, isLoading, signOutReason, startSession, endSessionLocally],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
