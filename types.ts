/**
 * API-Kontrakt zwischen Frontend (FE) und Backend-API.
 *
 * Diese Datei ist die einzige Stelle, an der Frontend und Backend sich auf
 * Formate einigen. Sie ist bewusst als eigenstaendiges Dokument geschrieben,
 * weil das Backend spaeter dagegen gebaut wird.
 *
 * Grundregeln:
 *  - Alle Zeitstempel sind ISO-8601 mit Zeitzone (UTC), Feldnamen enden auf At.
 *  - Alle IDs sind UUIDv4 als String.
 *  - Listen sind immer paginiert, nie ein blankes Array.
 *  - Das Frontend erzwingt keine Berechtigungen, es blendet nur aus. Die
 *    Autoritaet liegt beim Backend (siehe auth/permissions.ts).
 */

// ---------------------------------------------------------------------------
// Querschnitt
// ---------------------------------------------------------------------------

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: string;
}

/** Einheitliches Fehlerformat (RFC 7807 angelehnt). */
export interface ApiProblem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  /** Feldbezogene Validierungsfehler, Schluessel = Feldpfad. */
  errors?: Record<string, string[]>;
  /** NFA-04: Correlation-ID, damit Support das Log finden kann. */
  correlationId?: string;
}

// ---------------------------------------------------------------------------
// Auth (AUT-01, AUT-02) — FE-01, FE-07
// ---------------------------------------------------------------------------

export type Role = 'admin' | 'manager' | 'auditor';

export interface CurrentUser {
  id: string;
  displayName: string;
  email: string;
  roles: Role[];
  /** AUT-02: Mandant, auf den alle Anfragen implizit eingeschraenkt sind. */
  tenantId: string;
  locale: 'de' | 'en';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface MfaRequest {
  /** Kurzlebiges Handle aus dem ersten Schritt, kein Zugriffstoken. */
  mfaToken: string;
  code: string;
}

export interface AuthSession {
  /**
   * FE-01: Access-Token ist kurzlebig und wird nur im Speicher gehalten,
   * nie in localStorage. Das Refresh-Token liegt in einem httpOnly-Cookie
   * und taucht in diesem Kontrakt bewusst nicht auf.
   */
  accessToken: string;
  expiresAt: string;
  user: CurrentUser;
}

/** Antwort auf Schritt 1 des Logins: entweder fertig oder MFA erforderlich. */
export type LoginResult =
  | { status: 'authenticated'; session: AuthSession }
  | { status: 'mfa_required'; mfaToken: string; method: 'totp' | 'webauthn' };

// ---------------------------------------------------------------------------
// Kampagnen (CAM-01 … CAM-06) — FE-02, FE-05, FE-08
// ---------------------------------------------------------------------------

/**
 * CAM-01 plus Freigabe- und Abbruchzustaende.
 * Erlaubte Uebergaenge stehen in features/campaigns/stateMachine.ts.
 */
export type CampaignStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'scheduled'
  | 'running'
  | 'paused'
  | 'stopped'
  | 'completed';

export interface CampaignSchedule {
  /** CAM-02: IANA-Zeitzone, z. B. "Europe/Zurich". */
  timezone: string;
  startAt: string;
  /** Versandfenster als lokale Uhrzeit HH:mm innerhalb der Zeitzone. */
  windowStart: string;
  windowEnd: string;
  /** CAM-02: Drosselung. */
  mailsPerMinute: number;
  /** CAM-03: Streuung des Versands in Minuten, verhindert Warnketten. */
  jitterMinutes: number;
}

export interface CampaignSummary {
  id: string;
  name: string;
  status: CampaignStatus;
  templateName: string;
  targetGroupName: string;
  recipientCount: number;
  scheduledStartAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign extends CampaignSummary {
  description: string;
  templateId: string;
  senderProfileId: string;
  targetGroupId: string;
  schedule: CampaignSchedule;
  approval: ApprovalState;
  /** NFA-11: Referenz auf die dokumentierte Beauftragung. */
  authorizationRef: string;
}

/** AUT-03: Vier-Augen-Prinzip. */
export interface ApprovalState {
  requestedBy: string | null;
  requestedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  /** True, wenn der eingeloggte Nutzer selbst angefragt hat und daher
   *  nicht freigeben darf. Das Backend entscheidet, das FE spiegelt es. */
  blockedForCurrentUser: boolean;
}

export interface CampaignDraft {
  name: string;
  description: string;
  targetGroupId: string;
  templateId: string;
  senderProfileId: string;
  schedule: CampaignSchedule;
  authorizationRef: string;
}

/** CAM-06: Testversand vor der Freigabe. */
export interface TestSendRequest {
  campaignId: string;
  mailboxes: string[];
}

// ---------------------------------------------------------------------------
// Live-Monitoring (FE-05)
// ---------------------------------------------------------------------------

export interface CampaignProgress {
  campaignId: string;
  status: CampaignStatus;
  queued: number;
  sent: number;
  delivered: number;
  bounced: number;
  opened: number;
  clicked: number;
  reported: number;
  /** Zeitpunkt der Zaehlung, damit das UI Veraltung anzeigen kann. */
  observedAt: string;
}

/**
 * Server-Sent-Event auf /campaigns/{id}/stream.
 *
 * Anmerkung zur Architektur: Die Skizze zeigt zwischen Frontend und API nur
 * REST/HTTP. Fuer FE-05 braucht es entweder diesen SSE-Kanal oder Polling.
 * Der Client in api/events.ts kann beides und faellt automatisch zurueck.
 */
export type CampaignStreamEvent =
  | { type: 'progress'; data: CampaignProgress }
  | { type: 'status'; data: { campaignId: string; status: CampaignStatus } }
  | { type: 'heartbeat'; data: { at: string } };

// ---------------------------------------------------------------------------
// Templates und Absenderprofile (TPL-01 … TPL-04) — FE-03
// ---------------------------------------------------------------------------

export type TemplateDifficulty = 'low' | 'medium' | 'high';

export interface TemplateSummary {
  id: string;
  name: string;
  /** TPL-03: Metadatum fuer die spaetere Auswertung. */
  difficulty: TemplateDifficulty;
  category: string;
  version: number;
  updatedAt: string;
}

export interface Template extends TemplateSummary {
  subject: string;
  /** TPL-02: Wird serverseitig bereinigt. Das FE zeigt nur an. */
  bodyHtml: string;
  bodyText: string;
}

export interface TemplateDraft {
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  difficulty: TemplateDifficulty;
  category: string;
}

/** TPL-01: Verfuegbare Platzhalter, kommen vom Server, nicht hartkodiert. */
export interface Placeholder {
  key: string;
  label: string;
  example: string;
  required: boolean;
}

/** Serverseitig gerenderte Vorschau. Das FE rendert HTML nie selbst zusammen. */
export interface TemplatePreview {
  subject: string;
  html: string;
  text: string;
  warnings: string[];
}

/** TPL-04 */
export interface SenderProfile {
  id: string;
  displayName: string;
  fromAddress: string;
  replyTo: string | null;
  domain: string;
  /** MTA-04: Zeigt an, ob SPF/DKIM/DMARC fuer die Domain stimmen. */
  domainVerified: boolean;
}

// ---------------------------------------------------------------------------
// Zielgruppen (TGT-01 … TGT-04) — FE-04
// ---------------------------------------------------------------------------

export interface TargetGroup {
  id: string;
  name: string;
  department: string | null;
  memberCount: number;
  updatedAt: string;
}

export interface Target {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  department: string | null;
  /** TGT-03: kampagnenuebergreifend, wird nie ueberschrieben. */
  optedOut: boolean;
}

/** TGT-01: Ergebnis der Vorpruefung eines CSV-Uploads. */
export interface ImportPreview {
  importId: string;
  detectedColumns: string[];
  /** Vorschlag des Servers, vom Nutzer korrigierbar. */
  suggestedMapping: Record<string, string>;
  sampleRows: Record<string, string>[];
  totalRows: number;
  duplicateRows: number;
  /** TGT-02: Adressen ausserhalb der freigegebenen Domains. */
  blockedRows: number;
  optedOutRows: number;
  errors: { row: number; message: string }[];
}

export interface ImportCommit {
  importId: string;
  mapping: Record<string, string>;
  targetGroupId: string | null;
  newGroupName: string | null;
}

/** TGT-02 */
export interface DomainPolicy {
  allowedDomains: string[];
  blockedAddresses: string[];
}

// ---------------------------------------------------------------------------
// Reporting (REP-01 … REP-04) — FE-06
// ---------------------------------------------------------------------------

export interface CampaignMetrics {
  campaignId: string;
  campaignName: string;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  reportRate: number;
  /** REP-01: Median in Sekunden zwischen Zustellung und Meldung. */
  medianTimeToReportSeconds: number | null;
}

/**
 * REP-04 / NFA-10: Aggregat ueber eine Gruppe. Liegt die Gruppe unter der
 * Mindestgroesse, liefert der Server suppressed=true und keine Zahlen.
 * Das Frontend zeigt in dem Fall eine Erklaerung statt einer leeren Zeile.
 */
export interface GroupMetrics {
  groupId: string;
  groupName: string;
  suppressed: boolean;
  memberCount: number | null;
  openRate: number | null;
  clickRate: number | null;
  reportRate: number | null;
}

export interface TrendPoint {
  campaignId: string;
  campaignName: string;
  endedAt: string;
  clickRate: number;
  reportRate: number;
}

export type ExportFormat = 'csv' | 'pdf';

/**
 * REP-03: Exporte werden serverseitig erzeugt. Das Frontend stoesst an und
 * pollt den Status, statt im Browser eine PDF zu bauen.
 */
export interface ExportJob {
  id: string;
  status: 'pending' | 'ready' | 'failed';
  format: ExportFormat;
  downloadUrl: string | null;
  failureReason: string | null;
}

// ---------------------------------------------------------------------------
// Audit (AUT-04)
// ---------------------------------------------------------------------------

export interface AuditEntry {
  id: string;
  at: string;
  actorName: string;
  action: string;
  objectType: string;
  objectId: string;
  sourceIp: string;
  correlationId: string;
}
