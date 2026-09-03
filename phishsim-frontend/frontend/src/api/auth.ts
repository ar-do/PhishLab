import { api } from './client';
import type { AuthSession, LoginRequest, LoginResult, MfaRequest } from './types';

export const authApi = {
  /** Schritt 1: Passwort. Liefert entweder eine Session oder ein MFA-Handle. */
  login: (body: LoginRequest) => api.post<LoginResult>('/auth/login', body),

  /** Schritt 2: MFA-Code (FE-01). */
  verifyMfa: (body: MfaRequest) => api.post<AuthSession>('/auth/mfa', body),

  /** AUT-01: Weiterleitung zum internen IdP (OIDC/SAML). */
  ssoStartUrl: () => `${import.meta.env.VITE_API_BASE_URL ?? '/api'}/auth/sso/start`,

  /** Beim Seitenaufbau: Session aus dem httpOnly-Refresh-Cookie herstellen. */
  refresh: () => api.post<AuthSession>('/auth/refresh'),

  logout: () => api.post<void>('/auth/logout'),
};
