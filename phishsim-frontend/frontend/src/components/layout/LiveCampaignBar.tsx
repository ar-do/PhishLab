import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { campaignsApi } from '@/api/campaigns';
import type { CampaignSummary } from '@/api/types';
import { Can } from '@/auth/Can';
import { Button } from '@/components/ui/button';
import { Dialog, DialogCancel } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { useI18n } from '@/i18n/I18nProvider';

/**
 * FE-08: Not-Aus.
 *
 * Diese Leiste haengt in der Shell, nicht auf einer Seite. Wenn ein Versand
 * laeuft, ist der Stopp-Knopf aus jeder Ansicht heraus mit einem Klick
 * erreichbar - auch wenn jemand gerade in den Vorlagen arbeitet. Genau das
 * ist der Sinn eines Not-Aus: er darf nicht erst gesucht werden muessen.
 *
 * Der Bestaetigungsdialog ist trotzdem da. Ein versehentlicher Abbruch einer
 * laufenden Kampagne ist teuer, und der Grund muss ins Protokoll (AUT-04).
 */
export function LiveCampaignBar() {
  const { t, fill } = useI18n();
  const queryClient = useQueryClient();
  const [stopTarget, setStopTarget] = useState<CampaignSummary | null>(null);
  const [reason, setReason] = useState('');

  const { data: active = [] } = useQuery({
    queryKey: ['campaigns', 'active'],
    queryFn: campaignsApi.active,
    // Haeufiger als der Rest: Diese Leiste muss stimmen.
    refetchInterval: 10_000,
  });

  const stop = useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      campaignsApi.stop(input.id, input.reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setStopTarget(null);
      setReason('');
    },
  });

  const pause = useMutation({
    mutationFn: (id: string) => campaignsApi.pause(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const resume = useMutation({
    mutationFn: (id: string) => campaignsApi.resume(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  if (active.length === 0) return null;

  return (
    <>
      {/* aria-live, damit auch ohne Blick auf den Bildschirm klar wird,
          dass ein Versand angelaufen ist. */}
      <div
        role="region"
        aria-live="polite"
        aria-label={t.monitoring.liveUpdates}
        className="border-b border-brand/20 bg-brand-wash"
      >
        {active.map((campaign) => (
          <div
            key={campaign.id}
            className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2"
          >
            <span className="flex items-center gap-2 text-[13px] font-medium text-brand-ink">
              <span className="live-dot" aria-hidden="true" />
              {campaign.status === 'paused' ? t.status.paused : t.status.running}
            </span>

            <Link
              to={`/kampagnen/${campaign.id}`}
              className="text-[13px] font-semibold text-ink underline-offset-2 hover:underline"
            >
              {campaign.name}
            </Link>

            <span className="text-[13px] text-muted">
              {campaign.recipientCount} {t.campaigns.recipients.toLowerCase()}
            </span>

            <div className="ml-auto flex items-center gap-2">
              <Can do="campaign.stop">
                {campaign.status === 'paused' ? (
                  <Button
                    size="sm"
                    onClick={() => resume.mutate(campaign.id)}
                    disabled={resume.isPending}
                  >
                    {t.emergency.resume}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => pause.mutate(campaign.id)}
                    disabled={pause.isPending}
                  >
                    {t.emergency.pause}
                  </Button>
                )}

                <Button size="sm" variant="danger" onClick={() => setStopTarget(campaign)}>
                  {t.emergency.label}
                </Button>
              </Can>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={stopTarget !== null}
        onClose={() => setStopTarget(null)}
        title={t.emergency.dialogTitle}
        description={
          stopTarget ? fill(t.emergency.dialogBody, { name: stopTarget.name }) : undefined
        }
        footer={
          <>
            <DialogCancel label={t.common.cancel} onClick={() => setStopTarget(null)} />
            <Button
              variant="danger"
              disabled={reason.trim().length === 0 || stop.isPending}
              onClick={() => stopTarget && stop.mutate({ id: stopTarget.id, reason })}
            >
              {t.emergency.confirm}
            </Button>
          </>
        }
      >
        <Field label={t.emergency.reason} hint={t.emergency.reasonHint} required>
          {(props) => (
            <Input {...props} value={reason} onChange={(e) => setReason(e.target.value)} />
          )}
        </Field>
      </Dialog>
    </>
  );
}
