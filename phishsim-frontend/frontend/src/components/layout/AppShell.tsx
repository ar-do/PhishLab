import { NavLink, Outlet } from 'react-router-dom';
import {
  Activity,
  ClipboardList,
  FileText,
  LayoutList,
  LogOut,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import type { Permission } from '@/auth/permissions';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import { LiveCampaignBar } from './LiveCampaignBar';

interface NavItem {
  to: string;
  labelKey: keyof ReturnType<typeof useI18n>['t']['nav'];
  icon: LucideIcon;
  permission: Permission;
}

const NAV: NavItem[] = [
  { to: '/kampagnen', labelKey: 'campaigns', icon: LayoutList, permission: 'campaign.view' },
  { to: '/live', labelKey: 'monitoring', icon: Activity, permission: 'campaign.view' },
  { to: '/vorlagen', labelKey: 'templates', icon: FileText, permission: 'template.view' },
  { to: '/empfaenger', labelKey: 'targets', icon: Users, permission: 'target.view' },
  { to: '/auswertung', labelKey: 'reports', icon: ClipboardList, permission: 'report.view' },
];

export function AppShell() {
  const { t, locale, setLocale } = useI18n();
  const { user, can, logout } = useAuth();

  return (
    <div className="min-h-screen bg-bg">
      <a href="#main" className="skip-link">
        {t.app.skipToContent}
      </a>

      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-2.5">
          <span className="font-semibold tracking-tight text-ink">{t.app.name}</span>

          <nav aria-label={t.app.name} className="flex items-center gap-1">
            {NAV.filter((item) => can(item.permission)).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                    isActive ? 'bg-brand-wash text-brand-ink' : 'text-muted hover:text-ink',
                  )
                }
              >
                <item.icon size={15} aria-hidden="true" />
                {t.nav[item.labelKey]}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {/* FE-09: Sprachumschaltung, nicht in Einstellungen vergraben. */}
            <label className="sr-only" htmlFor="locale-select">
              {t.nav.language}
            </label>
            <select
              id="locale-select"
              value={locale}
              onChange={(event) => setLocale(event.target.value as 'de' | 'en')}
              className="rounded border border-line bg-surface px-2 py-1 text-[13px] text-muted"
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>

            <span className="hidden text-[13px] text-muted sm:inline">{user?.displayName}</span>

            <button
              type="button"
              onClick={() => void logout()}
              className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[13px] text-muted hover:text-ink"
            >
              <LogOut size={15} aria-hidden="true" />
              {t.nav.logout}
            </button>
          </div>
        </div>
      </header>

      <LiveCampaignBar />

      <main id="main" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
