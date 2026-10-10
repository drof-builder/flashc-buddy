// Knows whether the user is logged in and shares that with the whole app.
// 'recovering' = signed in from a password-reset link but no new password yet:
// the app shows "Set new password" before anything else.
//
// beginReset() only marks a reset as PENDING; it becomes 'recovering' when the
// link's session actually arrives. So a failed link never tears down the decks
// of a user who was already signed in.
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { authRepo } from '@/data/authRepo';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'recovering';

type AuthContextValue = {
  status: AuthStatus;
  /** A password-reset link is being opened; the next sign-in is that reset. */
  beginReset: () => void;
  /** The reset finished, was cancelled, or the link failed. */
  endReset: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  status: 'loading',
  beginReset: () => {},
  endReset: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<'loading' | 'signedOut' | 'signedIn'>('loading');
  const [recovering, setRecovering] = useState(false);
  const resetPending = useRef(false);

  useEffect(() => {
    // Fires once at startup with the saved session, then on every log in / out.
    return authRepo.onSessionChange((signedIn) => {
      if (signedIn && resetPending.current) {
        resetPending.current = false;
        setRecovering(true);
      }
      if (!signedIn) {
        resetPending.current = false;
        setRecovering(false); // signing out always ends a reset
      }
      setSession(signedIn ? 'signedIn' : 'signedOut');
    });
  }, []);

  const beginReset = useCallback(() => {
    resetPending.current = true;
  }, []);

  const endReset = useCallback(() => {
    resetPending.current = false;
    setRecovering(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: session === 'signedIn' && recovering ? 'recovering' : session,
      beginReset,
      endReset,
    }),
    [session, recovering, beginReset, endReset],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
