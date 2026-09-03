import { api, toQueryString } from './client';
import type {
  Campaign,
  CampaignDraft,
  CampaignProgress,
  CampaignSummary,
  CampaignStatus,
  Page,
  PageQuery,
  TestSendRequest,
} from './types';

export interface CampaignQuery extends PageQuery {
  status?: CampaignStatus;
}

export const campaignsApi = {
  list: (query: CampaignQuery = {}) =>
    api.get<Page<CampaignSummary>>(`/campaigns${toQueryString(query)}`),

  get: (id: string) => api.get<Campaign>(`/campaigns/${id}`),

  create: (draft: CampaignDraft) => api.post<Campaign>('/campaigns', draft),

  update: (id: string, draft: Partial<CampaignDraft>) =>
    api.patch<Campaign>(`/campaigns/${id}`, draft),

  /** AUT-03: Freigabe anfragen. Der Anfragende darf nicht selbst freigeben. */
  requestApproval: (id: string) => api.post<Campaign>(`/campaigns/${id}/approval-request`),
  approve: (id: string) => api.post<Campaign>(`/campaigns/${id}/approve`),

  /** CAM-06 */
  testSend: (body: TestSendRequest) =>
    api.post<void>(`/campaigns/${body.campaignId}/test-send`, { mailboxes: body.mailboxes }),

  /**
   * CAM-05 / FE-08: Pause und Abbruch. Beides verwirft eingereihte Jobs,
   * der Unterschied liegt in der Fortsetzbarkeit.
   */
  pause: (id: string) => api.post<Campaign>(`/campaigns/${id}/pause`),
  resume: (id: string) => api.post<Campaign>(`/campaigns/${id}/resume`),
  stop: (id: string, reason: string) => api.post<Campaign>(`/campaigns/${id}/stop`, { reason }),

  progress: (id: string) => api.get<CampaignProgress>(`/campaigns/${id}/progress`),

  /** Alle aktuell laufenden oder pausierten Kampagnen fuer die Not-Aus-Leiste. */
  active: () => api.get<CampaignSummary[]>('/campaigns/active'),
};
