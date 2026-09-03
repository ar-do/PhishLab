import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { campaignsApi } from '@/api/campaigns';
import type { CampaignStatus } from '@/api/types';
import { Can } from '@/auth/Can';
import { StatusBadge } from '@/components/StatusBadge';
import { buttonStyles } from '@/components/ui/button';
import { Select } from '@/components/ui/field';
import { Card, EmptyState } from '@/components/ui/surface';
import { Table, Td, Th } from '@/components/ui/table';
import { useI18n } from '@/i18n/I18nProvider';
import { formatDateTime, formatNumber } from '@/lib/format';

const FILTERS: CampaignStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'scheduled',
  'running',
  'paused',
  'completed',
  'stopped',
];

export function CampaignsPage() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<CampaignStatus | ''>('');

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', { status }],
    queryFn: () => campaignsApi.list(status ? { status } : {}),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-[20px] font-semibold tracking-tight text-ink">{t.campaigns.title}</h1>

        <div className="ml-auto flex items-center gap-2">
          <label className="sr-only" htmlFor="status-filter">
            {t.campaigns.title}
          </label>
          <Select
            id="status-filter"
            className="w-auto"
            value={status}
            onChange={(event) => setStatus(event.target.value as CampaignStatus | '')}
          >
            <option value="">{t.common.of}</option>
            {FILTERS.map((value) => (
              <option key={value} value={value}>
                {t.status[value]}
              </option>
            ))}
          </Select>

          <Can do="campaign.edit">
            <Link to="/kampagnen/neu" className={buttonStyles({ variant: 'primary' })}>
              <Plus size={15} aria-hidden="true" />
              {t.campaigns.create}
            </Link>
          </Can>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-muted">{t.common.loading}</p>
        ) : data && data.items.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <Th>{t.campaigns.name}</Th>
                <Th>Status</Th>
                <Th>{t.campaigns.template}</Th>
                <Th>{t.campaigns.group}</Th>
                <Th className="text-right">{t.campaigns.recipients}</Th>
                <Th>{t.campaigns.start}</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-surface-sunken/50">
                  <Td>
                    <Link
                      to={`/kampagnen/${campaign.id}`}
                      className="font-medium text-ink underline-offset-2 hover:underline"
                    >
                      {campaign.name}
                    </Link>
                  </Td>
                  <Td>
                    <StatusBadge status={campaign.status} />
                  </Td>
                  <Td className="text-muted">{campaign.templateName}</Td>
                  <Td className="text-muted">{campaign.targetGroupName}</Td>
                  <Td className="text-right font-mono tabular-nums text-muted">
                    {formatNumber(campaign.recipientCount, locale)}
                  </Td>
                  <Td className="text-muted">
                    {formatDateTime(campaign.scheduledStartAt, locale)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState
            message={t.campaigns.empty}
            action={
              <Can do="campaign.edit">
                <Link to="/kampagnen/neu" className={buttonStyles({ variant: 'primary' })}>
                  {t.campaigns.create}
                </Link>
              </Can>
            }
          />
        )}
      </Card>
    </div>
  );
}
