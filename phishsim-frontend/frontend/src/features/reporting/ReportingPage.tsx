import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { campaignsApi } from '@/api/campaigns';
import { reportingApi } from '@/api/reporting';
import type { ExportFormat } from '@/api/types';
import { Can } from '@/auth/Can';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/field';
import { Card, CardHeader, Metric } from '@/components/ui/surface';
import { Table, Td, Th } from '@/components/ui/table';
import { useI18n } from '@/i18n/I18nProvider';
import { formatDuration, formatPercent } from '@/lib/format';

/** REP-04: Muss mit dem serverseitigen Schwellenwert uebereinstimmen. */
const MIN_GROUP_SIZE = 5;

export function ReportingPage() {
  const { t, locale, fill } = useI18n();
  const [campaignId, setCampaignId] = useState('');

  const campaigns = useQuery({
    queryKey: ['campaigns', { status: 'completed' }],
    queryFn: () => campaignsApi.list({ status: 'completed' }),
  });

  const metrics = useQuery({
    queryKey: ['report', campaignId],
    queryFn: () => reportingApi.campaign(campaignId),
    enabled: campaignId !== '',
  });

  const groups = useQuery({
    queryKey: ['report', campaignId, 'groups'],
    queryFn: () => reportingApi.byGroup(campaignId),
    enabled: campaignId !== '',
  });

  /**
   * REP-03: Der Export laeuft serverseitig. Das Frontend stoesst an und
   * pollt den Job, statt im Browser eine PDF zu bauen - sonst muessten die
   * Rohdaten dafuer erst in den Browser geladen werden.
   */
  const [job, setJob] = useState<string | null>(null);

  const requestExport = useMutation({
    mutationFn: (format: ExportFormat) => reportingApi.requestExport(campaignId, format),
    onSuccess: (created) => setJob(created.id),
  });

  const exportStatus = useQuery({
    queryKey: ['export', job],
    queryFn: () => reportingApi.exportStatus(job!),
    enabled: job !== null,
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 2000 : false),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[20px] font-semibold tracking-tight text-ink">{t.reports.title}</h1>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="campaign-select">
            {t.campaigns.title}
          </label>
          <Select
            id="campaign-select"
            className="w-auto"
            value={campaignId}
            onChange={(event) => setCampaignId(event.target.value)}
          >
            <option value="">{t.campaigns.title}</option>
            {campaigns.data?.items.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </Select>

          <Can do="report.export">
            <Button disabled={!campaignId} onClick={() => requestExport.mutate('csv')}>
              {t.reports.exportCsv}
            </Button>
            <Button disabled={!campaignId} onClick={() => requestExport.mutate('pdf')}>
              {t.reports.exportPdf}
            </Button>
          </Can>
        </div>
      </div>

      {exportStatus.data?.status === 'pending' && (
        <p className="text-[13px] text-muted">{t.reports.exportPending}</p>
      )}
      {exportStatus.data?.status === 'ready' && exportStatus.data.downloadUrl && (
        <a
          href={exportStatus.data.downloadUrl}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-brand underline-offset-2 hover:underline"
        >
          <Download size={15} aria-hidden="true" />
          {t.reports.exportReady}
        </a>
      )}

      {metrics.data && (
        <Card>
          <div className="grid divide-y divide-line sm:grid-cols-2 sm:divide-x lg:grid-cols-5">
            <Metric
              label={t.reports.deliveryRate}
              value={formatPercent(metrics.data.deliveryRate, locale)}
            />
            <Metric label={t.reports.openRate} value={formatPercent(metrics.data.openRate, locale)} />
            <Metric
              label={t.reports.clickRate}
              value={formatPercent(metrics.data.clickRate, locale)}
            />
            {/*
              Die Meldequote steht bewusst gleichrangig neben der Klickrate.
              Sie ist die Zahl, die tatsaechlich zeigt, ob Awareness wirkt -
              die Klickrate allein laedt dazu ein, Leute zu zaehlen statt
              Verhalten zu verbessern.
            */}
            <Metric
              label={t.reports.reportRate}
              value={formatPercent(metrics.data.reportRate, locale)}
            />
            <Metric
              label={t.reports.timeToReport}
              value={formatDuration(metrics.data.medianTimeToReportSeconds, locale)}
            />
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title={t.reports.byGroup} description={t.reports.noIndividualNote} />
        <Table>
          <thead>
            <tr>
              <Th>{t.targets.group}</Th>
              <Th className="text-right">{t.reports.openRate}</Th>
              <Th className="text-right">{t.reports.clickRate}</Th>
              <Th className="text-right">{t.reports.reportRate}</Th>
            </tr>
          </thead>
          <tbody>
            {groups.data?.map((group) =>
              /*
                REP-04 / NFA-10: Zu kleine Gruppen werden nicht ausgewertet.
                Die Zeile verschwindet aber nicht - sonst waere unklar, ob die
                Gruppe fehlt oder unterdrueckt wurde, und jemand koennte per
                Differenzbildung doch auf Einzelne schliessen.
              */
              group.suppressed ? (
                <tr key={group.groupId} className="bg-surface-sunken/40">
                  <Td className="text-muted">{group.groupName}</Td>
                  <Td colSpan={3} className="text-[13px] text-muted">
                    {t.reports.suppressed} ·{' '}
                    {fill(t.reports.suppressedHint, { min: MIN_GROUP_SIZE })}
                  </Td>
                </tr>
              ) : (
                <tr key={group.groupId}>
                  <Td>{group.groupName}</Td>
                  <Td className="text-right font-mono tabular-nums">
                    {formatPercent(group.openRate, locale)}
                  </Td>
                  <Td className="text-right font-mono tabular-nums">
                    {formatPercent(group.clickRate, locale)}
                  </Td>
                  <Td className="text-right font-mono tabular-nums">
                    {formatPercent(group.reportRate, locale)}
                  </Td>
                </tr>
              ),
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
