import { api, toQueryString } from './client';
import type {
  DomainPolicy,
  ImportCommit,
  ImportPreview,
  Page,
  PageQuery,
  Target,
  TargetGroup,
} from './types';

export interface TargetQuery extends PageQuery {
  groupId?: string;
  includeOptedOut?: boolean;
}

export const targetsApi = {
  groups: () => api.get<TargetGroup[]>('/target-groups'),

  list: (query: TargetQuery = {}) => api.get<Page<Target>>(`/targets${toQueryString(query)}`),

  /**
   * TGT-01: Zweistufiger Import. Erst hochladen und pruefen lassen, dann
   * mit bestaetigtem Mapping uebernehmen. Ein einstufiger Import waere
   * hier fahrlaessig - ein falsches Mapping verschickt an die falschen Leute.
   */
  previewImport: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<ImportPreview>('/targets/import/preview', formData);
  },

  commitImport: (body: ImportCommit) => api.post<{ imported: number }>('/targets/import', body),

  /** TGT-03: Opt-out gilt dauerhaft und kampagnenuebergreifend. */
  optOut: (targetId: string) => api.post<Target>(`/targets/${targetId}/opt-out`),

  /** TGT-02 */
  domainPolicy: () => api.get<DomainPolicy>('/policies/domains'),
};
