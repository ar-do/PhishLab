import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { campaignsApi } from '@/api/campaigns';
import { subscribeToCampaignProgress, type TransportMode } from '@/api/events';
import type { CampaignProgress } from '@/api/types';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, EmptyState, Metric } from '@/components/ui/surface';
import { useI18n } from '@/i18n/I18nProvider';
import { formatNumber, formatTime } from '@/lib/format';

/**
 * FE-05: Live-Ansicht.
 *
 * Ohne id in der URL wird die erste aktive Kampagne gezeigt - das ist der
 * Normalfall, weil selten zwei Simulationen gleichzeitig laufen.
 */
export function MonitoringPage() {
  const { id } = useParams();
  const { t } = useI18n();

  const active = useQuery({
    queryKey: ['campaigns', 'active'],
    queryFn: campaignsApi.active,
  });

  const campaignId = id ?? active.data?.[0]?.id ?? null;
  const campaign = active.data?.find((item) => item.id === campaignId);

  if (!campaignId) {
    return (
      <Card>
        <EmptyState message={t.monitoring.noneRunning} />
      </Card>
    );
  }

  return <CampaignMonitor campaignId={campaignId} name={campaign?.name ?? ''} />;
}

function CampaignMonitor({ campaignId, name }: { campaignId: string; name: string }) {
  const { t, locale, fill } = useI18n();
  const [progress, setProgress] = useState<CampaignProgress | null>(null);
  const [transport, setTransport] = useState<TransportMode>('poll');

  useEffect(() => {
    const subscription = subscribeToCampaignProgress({
      campaignId,
      onProgress: setProgress,
      onTransportChange: setTransport,
    });
    return () => subscription.close();
  }, [campaignId]);

  const counters: { label: string; value: number }[] = progress
    ? [
        { label: t.monitoring.queued, value: progress.queued },
        { label: t.monitoring.sent, value: progress.sent },
        { label: t.monitoring.delivered, value: progress.delivered },
        { label: t.monitoring.bounced, value: progress.bounced },
        { label: t.monitoring.opened, value: progress.opened },
        { label: t.monitoring.clicked, value: progress.clicked },
        { label: t.monitoring.reported, value: progress.reported },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[20px] font-semibold tracking-tight text-ink">{name}</h1>
        {progress && <StatusBadge status={progress.status} />}

        {/*
          Der Transportzustand ist sichtbar. Wenn der SSE-Kanal abreisst und
          auf Polling zurueckfaellt, muss das erkennbar sein - eine Ansicht,
          die stillschweigend veraltet, ist bei einem laufenden Versand
          gefaehrlicher als gar keine.
        */}
        <span className="ml-auto text-[13px] text-muted">
          {transport === 'stream' ? t.monitoring.liveUpdates : t.monitoring.polling}
          {progress && ` · ${fill(t.monitoring.lastUpdate, { time: formatTime(progress.observedAt, locale) })}`}
        </span>
      </div>

      {/* aria-live=polite statt assertive: Die Zahlen aendern sich staendig,
          assertive wuerde den Screenreader unbrauchbar machen. */}
      <Card>
        <div
          className="grid divide-y divide-line sm:grid-cols-2 sm:divide-x lg:grid-cols-4"
          aria-live="polite"
        >
          {counters.map((counter) => (
            <Metric
              key={counter.label}
              label={counter.label}
              value={formatNumber(counter.value, locale)}
            />
          ))}
        </div>
      </Card>

      {progress && progress.queued > 0 && (
        <Card className="p-4">
          <div className="mb-2 flex justify-between text-[13px] text-muted">
            <span>{t.monitoring.sent}</span>
            <span className="font-mono tabular-nums">
              {formatNumber(progress.sent, locale)} {t.common.of}{' '}
              {formatNumber(progress.sent + progress.queued, locale)}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.sent + progress.queued}
            aria-valuenow={progress.sent}
            aria-label={t.monitoring.sent}
            className="h-1.5 overflow-hidden rounded-full bg-surface-sunken"
          >
            <div
              className="h-full bg-brand transition-[width] duration-500"
              style={{
                width: `${(progress.sent / (progress.sent + progress.queued)) * 100}%`,
              }}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
