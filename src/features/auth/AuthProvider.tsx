// Knows whether the user is logged in and shares that with the whole app.
// 'recovering' = signed in from a password-reset link but no new password yet:
// the app shows "Set new password" before anything else.
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { authRepo } from '@/data/authRepo';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'recovering';

type AuthContextValue = { status: AuthStatus; setRecovering: (recovering: boolean) => void };

const AuthContext = createContext<AuthContextValue>({
  status: 'loading',
  setRecovering: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<'loading' | 'signedOut' | 'signedIn'>('loading');
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    // Fires once at startup with the saved session, then on every log in / out.
    return authRepo.onSessionChange((signedIn) => {
      setSession(signedIn ? 'signedIn' : 'signedOut');
      if (!signedIn) setRecovering(false); // signing out always ends a reset
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: session === 'signedIn' && recovering ? 'recovering' : session,
      setRecovering,
    }),
    [session, recovering],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
