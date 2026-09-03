import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { campaignsApi } from '@/api/campaigns';
import { useAuth } from '@/auth/AuthProvider';
import { Can } from '@/auth/Can';
import { canApprove } from '@/auth/permissions';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Card, CardHeader } from '@/components/ui/surface';
import { useI18n } from '@/i18n/I18nProvider';
import { formatDateTime, formatNumber } from '@/lib/format';
import { isAllowed, isLive } from './stateMachine';

export function CampaignDetailPage() {
  const { id = '' } = useParams();
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [testMailbox, setTestMailbox] = useState('');

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaigns', id],
    queryFn: () => campaignsApi.get(id),
    enabled: id !== '',
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['campaigns'] });

  const approve = useMutation({ mutationFn: () => campaignsApi.approve(id), onSuccess: invalidate });
  const requestApproval = useMutation({
    mutationFn: () => campaignsApi.requestApproval(id),
    onSuccess: invalidate,
  });
  const testSend = useMutation({
    mutationFn: () => campaignsApi.testSend({ campaignId: id, mailboxes: [testMailbox] }),
    onSuccess: () => setTestMailbox(''),
  });

  if (isLoading) return <p className="text-sm text-muted">{t.common.loading}</p>;
  if (!campaign) return null;

  const approvable = user ? canApprove(user.roles, campaign.approval) : false;
  const awaitingApproval = campaign.status === 'pending_approval';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[20px] font-semibold tracking-tight text-ink">{campaign.name}</h1>
        <StatusBadge status={campaign.status} />

        <div className="ml-auto flex items-center gap-2">
          {isLive(campaign.status) && (
            <Link
              to={`/live/${campaign.id}`}
              className="text-[13px] font-medium text-brand underline-offset-2 hover:underline"
            >
              {t.monitoring.title}
            </Link>
          )}
        </div>
      </div>

      {/*
        AUT-03: Die Freigabe ist der wichtigste Moment im Ablauf und bekommt
        deshalb eine eigene Flaeche statt eines Knopfes irgendwo in der Leiste.
        Wer selbst eingereicht hat, sieht hier die Begruendung, warum der
        Knopf fehlt - sonst entsteht der Eindruck eines Fehlers.
      */}
      {awaitingApproval && (
        <Card className="border-state-review/30 bg-warn-wash">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <p className="text-[13px] text-ink">
              {approvable ? t.campaigns.approvalPending : t.campaigns.approvalBlocked}
            </p>
            {approvable && (
              <Button
                variant="primary"
                size="sm"
                className="ml-auto"
                disabled={approve.isPending}
                onClick={() => approve.mutate()}
              >
                {t.campaigns.approve}
              </Button>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={campaign.templateName} description={campaign.description} />
          <dl className="divide-y divide-line px-4 text-sm">
            <Row label={t.campaigns.group} value={campaign.targetGroupName} />
            <Row
              label={t.campaigns.recipients}
              value={formatNumber(campaign.recipientCount, locale)}
            />
            <Row
              label={t.campaigns.start}
              value={formatDateTime(campaign.scheduledStartAt, locale)}
            />
            <Row label={t.wizard.timezone} value={campaign.schedule.timezone} />
            <Row
              label={t.wizard.throughput}
              value={String(campaign.schedule.mailsPerMinute)}
            />
            <Row label={t.wizard.jitter} value={String(campaign.schedule.jitterMinutes)} />
            <Row label={t.campaigns.authorizationRef} value={campaign.authorizationRef} />
            <Row
              label={t.campaigns.approve}
              value={
                campaign.approval.approvedAt
                  ? `${campaign.approval.approvedBy ?? ''} · ${formatDateTime(campaign.approval.approvedAt, locale)}`
                  : '—'
              }
            />
          </dl>
        </Card>

        <div className="space-y-4">
          {/* CAM-06: Testversand vor der Freigabe. */}
          {isAllowed(campaign.status, 'test_send') && (
            <Can do="campaign.test_send">
              <Card>
                <CardHeader title={t.campaigns.testSend} />
                <div className="space-y-3 p-4">
                  <Field label="Prüf-Postfach">
                    {(props) => (
                      <Input
                        {...props}
                        type="email"
                        value={testMailbox}
                        onChange={(event) => setTestMailbox(event.target.value)}
                      />
                    )}
                  </Field>
                  <Button
                    className="w-full"
                    disabled={testMailbox.length === 0 || testSend.isPending}
                    onClick={() => testSend.mutate()}
                  >
                    {t.campaigns.testSend}
                  </Button>
                </div>
              </Card>
            </Can>
          )}

          {isAllowed(campaign.status, 'request_approval') && (
            <Can do="campaign.request_approval">
              <Button
                variant="primary"
                className="w-full"
                disabled={requestApproval.isPending}
                onClick={() => requestApproval.mutate()}
              >
                {t.campaigns.requestApproval}
              </Button>
            </Can>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
