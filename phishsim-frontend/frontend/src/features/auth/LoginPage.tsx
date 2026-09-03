import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { useI18n } from '@/i18n/I18nProvider';

type Stage = { name: 'credentials' } | { name: 'mfa'; mfaToken: string };

/**
 * FE-01: Anmeldung in zwei Schritten.
 *
 * Der zweite Faktor ist ein eigener Bildschirm, kein Feld unter dem Passwort.
 * Das Backend gibt nach Schritt 1 nur ein kurzlebiges MFA-Handle heraus, kein
 * Zugriffstoken - ein abgefangenes Passwort allein bringt damit nichts.
 */
export function LoginPage() {
  const { t } = useI18n();
  const { user, initialising, login, verifyMfa } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [stage, setStage] = useState<Stage>({ name: 'credentials' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (initialising) return null;
  if (user) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? '/kampagnen'} replace />;
  }

  async function submitCredentials() {
    setBusy(true);
    setError(null);
    try {
      const result = await login(email, password);
      if (result.status === 'mfa_required') {
        setStage({ name: 'mfa', mfaToken: result.mfaToken });
      } else {
        navigate('/kampagnen', { replace: true });
      }
    } catch {
      setError(t.login.failed);
    } finally {
      setBusy(false);
    }
  }

  async function submitMfa(mfaToken: string) {
    setBusy(true);
    setError(null);
    try {
      await verifyMfa(mfaToken, code);
      navigate('/kampagnen', { replace: true });
    } catch {
      setError(t.login.mfaFailed);
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">{t.app.name}</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">{t.login.intro}</p>

        <form
          className="mt-6 space-y-4 rounded-card border border-line bg-surface p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (stage.name === 'credentials') void submitCredentials();
            else void submitMfa(stage.mfaToken);
          }}
        >
          {/* Fehler stehen ueber dem Formular und werden angesagt (WCAG 3.3.1). */}
          {error && (
            <p
              role="alert"
              className="rounded border border-danger/30 bg-danger-wash px-3 py-2 text-[13px] text-danger"
            >
              {error}
            </p>
          )}

          {stage.name === 'credentials' ? (
            <>
              <Field label={t.login.email} required>
                {(props) => (
                  <Input
                    {...props}
                    type="email"
                    autoComplete="username"
                    autoFocus
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                )}
              </Field>

              <Field label={t.login.password} required>
                {(props) => (
                  <Input
                    {...props}
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                )}
              </Field>

              <Button type="submit" variant="primary" className="w-full" disabled={busy}>
                {t.login.submit}
              </Button>

              {/* AUT-01: Der IdP-Weg ist der Normalfall, lokale Konten sind Fallback. */}
              <a
                href={authApi.ssoStartUrl()}
                className="block rounded border border-line py-2 text-center text-sm font-medium text-ink hover:bg-surface-sunken"
              >
                {t.login.sso}
              </a>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-[15px] font-semibold text-ink">{t.login.mfaTitle}</h2>
                <p className="mt-1 text-[13px] text-muted">{t.login.mfaHint}</p>
              </div>

              <Field label={t.login.mfaCode} required>
                {(props) => (
                  <Input
                    {...props}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    autoFocus
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                    className="font-mono tracking-[0.3em]"
                  />
                )}
              </Field>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={busy || code.length < 6}
              >
                {t.login.mfaSubmit}
              </Button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
