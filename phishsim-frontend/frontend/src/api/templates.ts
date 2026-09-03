import { api, toQueryString } from './client';
import type {
  Page,
  PageQuery,
  Placeholder,
  SenderProfile,
  Template,
  TemplateDraft,
  TemplatePreview,
  TemplateSummary,
} from './types';

export const templatesApi = {
  list: (query: PageQuery = {}) =>
    api.get<Page<TemplateSummary>>(`/templates${toQueryString(query)}`),

  get: (id: string) => api.get<Template>(`/templates/${id}`),
  create: (draft: TemplateDraft) => api.post<Template>('/templates', draft),
  update: (id: string, draft: Partial<TemplateDraft>) =>
    api.patch<Template>(`/templates/${id}`, draft),

  /**
   * TPL-02: Die Vorschau wird serverseitig gerendert und bereinigt
   * zurueckgegeben. Das Frontend baut kein HTML zusammen und fuehrt
   * nichts aus - die Anzeige laeuft in einem sandboxed iframe.
   */
  preview: (id: string, draft: TemplateDraft) =>
    api.post<TemplatePreview>(`/templates/${id}/preview`, draft),

  /** TPL-01: Platzhalterkatalog kommt vom Server. */
  placeholders: () => api.get<Placeholder[]>('/templates/placeholders'),

  /** TPL-04 */
  senderProfiles: () => api.get<SenderProfile[]>('/sender-profiles'),
};
