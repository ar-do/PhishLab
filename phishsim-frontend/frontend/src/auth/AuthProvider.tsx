import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '@/api/auth';
import { setAccessToken, setUnauthorizedHandler } from '@/api/client';
import type { AuthSession, CurrentUser, LoginResult } from '@/api/types';
import { hasPermission, type Permission } from './permissions';

interface AuthContextValue {
  user: CurrentUser | null;
  /** Solange true, ist noch nicht entschieden, ob eine Session existiert. */
  initialising: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyMfa: (mfaToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [initialising, setInitialising] = useState(true);

  const applySession = useCallback((session: AuthSession) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  /**
   * Beim Laden der Seite existiert kein Token im Speicher. Wir versuchen
   * einmal, ueber das httpOnly-Refresh-Cookie eine Session herzustellen.
   * Schlaegt das fehl, ist der Nutzer schlicht nicht angemeldet - das ist
   * kein Fehlerfall und wird nicht angezeigt.
   */
  useEffect(() => {
    let cancelled = false;

    authApi
      .refresh()
      .then((session) => {
        if (!cancelled) applySession(session);
      })
      .catch(() => {
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setInitialising(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applySession, clearSession]);

  // Ein 401 aus irgendeinem Request beendet die Sitzung im UI.
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initialising,

      login: async (email, password) => {
        const result = await authApi.login({ email, password });
        if (result.status === 'authenticated') applySession(result.session);
        return result;
      },

      verifyMfa: async (mfaToken, code) => {
        applySession(await authApi.verifyMfa({ mfaToken, code }));
      },

      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          clearSession();
        }
      },

      can: (permission) => (user ? hasPermission(user.roles, permission) : false),
    }),
    [user, initialising, applySession, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden.');
  return context;
}
