// Knows whether the user is logged in and shares that with the whole app.
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

import { authRepo } from '@/data/authRepo';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

const AuthContext = createContext<AuthStatus>('loading');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    // Fires once at startup with the saved session, then on every log in / out.
    return authRepo.onSessionChange((signedIn) => {
      setStatus(signedIn ? 'signedIn' : 'signedOut');
    });
  }, []);

  return <AuthContext.Provider value={status}>{children}</AuthContext.Provider>;
}

export function useAuth(): { status: AuthStatus } {
  return { status: useContext(AuthContext) };
}
