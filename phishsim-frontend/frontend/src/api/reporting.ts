import { api, toQueryString } from './client';
import type { CampaignMetrics, ExportFormat, ExportJob, GroupMetrics, TrendPoint } from './types';

export const reportingApi = {
  campaign: (campaignId: string) => api.get<CampaignMetrics>(`/reports/campaigns/${campaignId}`),

  /** REP-04: Gruppen unterhalb der Mindestgroesse kommen als suppressed zurueck. */
  byGroup: (campaignId: string) =>
    api.get<GroupMetrics[]>(`/reports/campaigns/${campaignId}/groups`),

  /** REP-02 */
  trend: (params: { from?: string; to?: string } = {}) =>
    api.get<TrendPoint[]>(`/reports/trend${toQueryString(params)}`),

  /** REP-03: Export laeuft serverseitig, das FE pollt den Job. */
  requestExport: (campaignId: string, format: ExportFormat) =>
    api.post<ExportJob>(`/reports/campaigns/${campaignId}/exports`, { format }),

  exportStatus: (jobId: string) => api.get<ExportJob>(`/reports/exports/${jobId}`),
};
