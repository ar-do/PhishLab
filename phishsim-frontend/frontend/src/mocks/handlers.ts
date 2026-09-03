import { http, HttpResponse } from 'msw';
import type {
  Campaign,
  CampaignProgress,
  CampaignSummary,
  GroupMetrics,
  Placeholder,
  SenderProfile,
  Target,
  TargetGroup,
  Template,
} from '@/api/types';

/**
 * Mock-Backend fuer die Entwicklung, solange die API nicht steht.
 *
 * Es bildet bewusst auch die unangenehmen Faelle ab, weil genau die im UI
 * gut aussehen muessen: eine Kampagne, die auf Freigabe wartet und vom
 * eingeloggten Nutzer nicht freigegeben werden darf, ein laufender Versand
 * fuer die Not-Aus-Leiste, eine unterdrueckte Gruppe im Report und
 * abgemeldete Empfaenger.
 */
const BASE = '/api';

const user = {
  id: 'u-1',
  displayName: 'Nadja Berger',
  email: 'nadja.berger@example.org',
  roles: ['manager' as const],
  tenantId: 't-1',
  locale: 'de' as const,
};

const campaigns: Campaign[] = [
  {
    id: 'c-1',
    name: 'Paketbenachrichtigung Q3',
    status: 'running',
    description: 'Versanddienstleister-Vorlage, mittlere Schwierigkeit.',
    templateId: 'tpl-1',
    templateName: 'Paketzustellung fehlgeschlagen',
    senderProfileId: 'sp-1',
    targetGroupId: 'g-1',
    targetGroupName: 'Standort Zürich',
    recipientCount: 412,
    scheduledStartAt: new Date(Date.now() - 36e5).toISOString(),
    createdAt: new Date(Date.now() - 6 * 864e5).toISOString(),
    updatedAt: new Date().toISOString(),
    authorizationRef: 'SEC-2026-014',
    schedule: {
      timezone: 'Europe/Zurich',
      startAt: new Date(Date.now() - 36e5).toISOString(),
      windowStart: '08:00',
      windowEnd: '17:00',
      mailsPerMinute: 30,
      jitterMinutes: 45,
    },
    approval: {
      requestedBy: 'Nadja Berger',
      requestedAt: new Date(Date.now() - 3 * 864e5).toISOString(),
      approvedBy: 'Tomas Lindqvist',
      approvedAt: new Date(Date.now() - 2 * 864e5).toISOString(),
      blockedForCurrentUser: false,
    },
  },
  {
    id: 'c-2',
    name: 'Interne IT-Meldung',
    status: 'pending_approval',
    description: 'Vorlage im Stil der internen IT-Kommunikation.',
    templateId: 'tpl-2',
    templateName: 'Passwort läuft ab',
    senderProfileId: 'sp-1',
    targetGroupId: 'g-2',
    targetGroupName: 'Vertrieb',
    recipientCount: 87,
    scheduledStartAt: new Date(Date.now() + 3 * 864e5).toISOString(),
    createdAt: new Date(Date.now() - 864e5).toISOString(),
    updatedAt: new Date().toISOString(),
    authorizationRef: 'SEC-2026-019',
    schedule: {
      timezone: 'Europe/Zurich',
      startAt: new Date(Date.now() + 3 * 864e5).toISOString(),
      windowStart: '09:00',
      windowEnd: '16:00',
      mailsPerMinute: 20,
      jitterMinutes: 60,
    },
    approval: {
      requestedBy: 'Nadja Berger',
      requestedAt: new Date(Date.now() - 864e5).toISOString(),
      approvedBy: null,
      approvedAt: null,
      // Der eingeloggte Nutzer hat selbst eingereicht (AUT-03).
      blockedForCurrentUser: true,
    },
  },
  {
    id: 'c-3',
    name: 'Rechnungsanhang Frühjahr',
    status: 'completed',
    description: '',
    templateId: 'tpl-3',
    templateName: 'Offene Rechnung',
    senderProfileId: 'sp-1',
    targetGroupId: 'g-1',
    targetGroupName: 'Standort Zürich',
    recipientCount: 398,
    scheduledStartAt: new Date(Date.now() - 40 * 864e5).toISOString(),
    createdAt: new Date(Date.now() - 50 * 864e5).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 864e5).toISOString(),
    authorizationRef: 'SEC-2026-004',
    schedule: {
      timezone: 'Europe/Zurich',
      startAt: new Date(Date.now() - 40 * 864e5).toISOString(),
      windowStart: '08:00',
      windowEnd: '17:00',
      mailsPerMinute: 25,
      jitterMinutes: 30,
    },
    approval: {
      requestedBy: 'Tomas Lindqvist',
      requestedAt: new Date(Date.now() - 45 * 864e5).toISOString(),
      approvedBy: 'Nadja Berger',
      approvedAt: new Date(Date.now() - 44 * 864e5).toISOString(),
      blockedForCurrentUser: false,
    },
  },
];

const toSummary = (campaign: Campaign): CampaignSummary => ({
  id: campaign.id,
  name: campaign.name,
  status: campaign.status,
  templateName: campaign.templateName,
  targetGroupName: campaign.targetGroupName,
  recipientCount: campaign.recipientCount,
  scheduledStartAt: campaign.scheduledStartAt,
  createdAt: campaign.createdAt,
  updatedAt: campaign.updatedAt,
});

const progress: CampaignProgress = {
  campaignId: 'c-1',
  status: 'running',
  queued: 148,
  sent: 264,
  delivered: 251,
  bounced: 13,
  opened: 132,
  clicked: 41,
  reported: 58,
  observedAt: new Date().toISOString(),
};

const templates: Template[] = [
  {
    id: 'tpl-1',
    name: 'Paketzustellung fehlgeschlagen',
    difficulty: 'medium',
    category: 'Logistik',
    version: 3,
    updatedAt: new Date(Date.now() - 7 * 864e5).toISOString(),
    subject: 'Ihre Sendung konnte nicht zugestellt werden',
    bodyHtml:
      '<p>Guten Tag {{firstName}},</p><p>wir konnten Ihre Sendung nicht zustellen. <a href="{{trackingUrl}}">Zustellung neu planen</a></p>',
    bodyText: 'Guten Tag {{firstName}}, wir konnten Ihre Sendung nicht zustellen: {{trackingUrl}}',
  },
  {
    id: 'tpl-2',
    name: 'Passwort läuft ab',
    difficulty: 'high',
    category: 'IT-Kommunikation',
    version: 5,
    updatedAt: new Date(Date.now() - 2 * 864e5).toISOString(),
    subject: 'Ihr Kennwort läuft in 24 Stunden ab',
    bodyHtml: '<p>Hallo {{firstName}},</p><p><a href="{{trackingUrl}}">Kennwort jetzt erneuern</a></p>',
    bodyText: 'Hallo {{firstName}}, Kennwort erneuern: {{trackingUrl}}',
  },
  {
    id: 'tpl-3',
    name: 'Offene Rechnung',
    difficulty: 'low',
    category: 'Finanzen',
    version: 2,
    updatedAt: new Date(Date.now() - 30 * 864e5).toISOString(),
    subject: 'Zahlungserinnerung',
    bodyHtml: '<p>Sehr geehrte Damen und Herren,</p><p><a href="{{trackingUrl}}">Rechnung öffnen</a></p>',
    bodyText: 'Rechnung öffnen: {{trackingUrl}}',
  },
];

const placeholders: Placeholder[] = [
  { key: 'firstName', label: 'Vorname', example: 'Nadja', required: false },
  { key: 'lastName', label: 'Nachname', example: 'Berger', required: false },
  { key: 'department', label: 'Abteilung', example: 'Vertrieb', required: false },
  { key: 'trackingUrl', label: 'Tracking-Link', example: 'https://…/t/abc123', required: true },
];

const senderProfiles: SenderProfile[] = [
  {
    id: 'sp-1',
    displayName: 'Paketdienst Service',
    fromAddress: 'service@sim-versand.example',
    replyTo: null,
    domain: 'sim-versand.example',
    domainVerified: true,
  },
  {
    id: 'sp-2',
    displayName: 'IT Helpdesk',
    fromAddress: 'helpdesk@sim-intern.example',
    replyTo: null,
    domain: 'sim-intern.example',
    domainVerified: false,
  },
];

const groups: TargetGroup[] = [
  { id: 'g-1', name: 'Standort Zürich', department: null, memberCount: 412, updatedAt: new Date().toISOString() },
  { id: 'g-2', name: 'Vertrieb', department: 'Vertrieb', memberCount: 87, updatedAt: new Date().toISOString() },
  { id: 'g-3', name: 'Geschäftsleitung', department: 'GL', memberCount: 4, updatedAt: new Date().toISOString() },
];

const targets: Target[] = [
  { id: 'p-1', email: 'anna.keller@example.org', firstName: 'Anna', lastName: 'Keller', department: 'Vertrieb', optedOut: false },
  { id: 'p-2', email: 'marc.dubois@example.org', firstName: 'Marc', lastName: 'Dubois', department: 'Vertrieb', optedOut: false },
  { id: 'p-3', email: 'sofia.rossi@example.org', firstName: 'Sofia', lastName: 'Rossi', department: 'IT', optedOut: true },
  { id: 'p-4', email: 'jan.novak@example.org', firstName: 'Jan', lastName: 'Novák', department: 'Finanzen', optedOut: false },
];

const groupMetrics: GroupMetrics[] = [
  { groupId: 'g-1', groupName: 'Standort Zürich', suppressed: false, memberCount: 412, openRate: 0.41, clickRate: 0.113, reportRate: 0.187 },
  { groupId: 'g-2', groupName: 'Vertrieb', suppressed: false, memberCount: 87, openRate: 0.52, clickRate: 0.164, reportRate: 0.121 },
  // REP-04: zu klein fuer eine Auswertung.
  { groupId: 'g-3', groupName: 'Geschäftsleitung', suppressed: true, memberCount: null, openRate: null, clickRate: null, reportRate: null },
];

export const handlers = [
  http.post(`${BASE}/auth/login`, () =>
    HttpResponse.json({ status: 'mfa_required', mfaToken: 'mock-mfa', method: 'totp' }),
  ),
  http.post(`${BASE}/auth/mfa`, () =>
    HttpResponse.json({
      accessToken: 'mock-token',
      expiresAt: new Date(Date.now() + 9e5).toISOString(),
      user,
    }),
  ),
  http.post(`${BASE}/auth/refresh`, () =>
    HttpResponse.json({
      accessToken: 'mock-token',
      expiresAt: new Date(Date.now() + 9e5).toISOString(),
      user,
    }),
  ),
  http.post(`${BASE}/auth/logout`, () => new HttpResponse(null, { status: 204 })),

  http.get(`${BASE}/campaigns/active`, () =>
    HttpResponse.json(campaigns.filter((c) => c.status === 'running' || c.status === 'paused').map(toSummary)),
  ),
  http.get(`${BASE}/campaigns/:id/progress`, () =>
    HttpResponse.json({ ...progress, observedAt: new Date().toISOString() }),
  ),
  http.get(`${BASE}/campaigns/:id`, ({ params }) => {
    const found = campaigns.find((c) => c.id === params.id);
    return found ? HttpResponse.json(found) : new HttpResponse(null, { status: 404 });
  }),
  http.get(`${BASE}/campaigns`, ({ request }) => {
    const status = new URL(request.url).searchParams.get('status');
    const items = campaigns.filter((c) => !status || c.status === status).map(toSummary);
    return HttpResponse.json({ items, total: items.length, page: 1, pageSize: 20 });
  }),

  http.get(`${BASE}/templates/placeholders`, () => HttpResponse.json(placeholders)),
  http.get(`${BASE}/templates/:id`, ({ params }) =>
    HttpResponse.json(templates.find((t) => t.id === params.id) ?? templates[0]),
  ),
  http.get(`${BASE}/templates`, () =>
    HttpResponse.json({ items: templates, total: templates.length, page: 1, pageSize: 20 }),
  ),
  http.post(`${BASE}/templates/:id/preview`, async ({ request }) => {
    const draft = (await request.json()) as { subject: string; bodyHtml: string; bodyText: string };
    const fill = (value: string) =>
      value
        .replace(/\{\{firstName\}\}/g, 'Nadja')
        .replace(/\{\{lastName\}\}/g, 'Berger')
        .replace(/\{\{department\}\}/g, 'Vertrieb')
        .replace(/\{\{trackingUrl\}\}/g, 'https://example.test/t/abc123');

    return HttpResponse.json({
      subject: fill(draft.subject),
      html: fill(draft.bodyHtml),
      text: fill(draft.bodyText),
      warnings: draft.bodyHtml.includes('{{trackingUrl}}')
        ? []
        : ['Kein Tracking-Link enthalten — Klicks werden nicht gemessen.'],
    });
  }),
  http.get(`${BASE}/sender-profiles`, () => HttpResponse.json(senderProfiles)),

  http.get(`${BASE}/target-groups`, () => HttpResponse.json(groups)),
  http.get(`${BASE}/targets`, () =>
    HttpResponse.json({ items: targets, total: targets.length, page: 1, pageSize: 20 }),
  ),

  http.get(`${BASE}/reports/campaigns/:id/groups`, () => HttpResponse.json(groupMetrics)),
  http.get(`${BASE}/reports/campaigns/:id`, ({ params }) =>
    HttpResponse.json({
      campaignId: params.id,
      campaignName: 'Rechnungsanhang Frühjahr',
      deliveryRate: 0.968,
      openRate: 0.437,
      clickRate: 0.121,
      reportRate: 0.174,
      medianTimeToReportSeconds: 1_260,
    }),
  ),
];
