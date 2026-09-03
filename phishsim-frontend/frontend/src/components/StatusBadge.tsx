import type { CampaignStatus } from '@/api/types';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';

/**
 * Der Kampagnenstatus ist die wichtigste Information in diesem Werkzeug -
 * er entscheidet, ob gerade echte Mails an echte Kollegen rausgehen.
 * Deshalb ist Farbe hier ausschliesslich fuer Status reserviert.
 *
 * WCAG 1.4.1: Der Status steht immer als Text da, die Farbe traegt ihn nicht
 * allein. "Laeuft" bekommt zusaetzlich einen Pulspunkt.
 */
const STYLES: Record<CampaignStatus, string> = {
  draft: 'text-state-draft bg-surface-sunken',
  pending_approval: 'text-state-review bg-warn-wash',
  approved: 'text-state-done bg-ok-wash',
  scheduled: 'text-state-draft bg-surface-sunken',
  running: 'text-state-running bg-brand-wash',
  paused: 'text-state-paused bg-warn-wash',
  stopped: 'text-state-stopped bg-danger-wash',
  completed: 'text-state-done bg-ok-wash',
};

export function StatusBadge({
  status,
  className,
}: {
  status: CampaignStatus;
  className?: string;
}) {
  const { t } = useI18n();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[12px] font-medium',
        STYLES[status],
        className,
      )}
    >
      {status === 'running' && <span className="live-dot" aria-hidden="true" />}
      {t.status[status]}
    </span>
  );
}
