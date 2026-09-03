import type { CampaignStatus } from '@/api/types';

/**
 * CAM-01: Statusmodell.
 *
 * Steht hier an einer Stelle, damit es gegen das Fachkonzept gegengelesen
 * werden kann - und damit das UI nicht an fuenf Stellen unterschiedlich
 * entscheidet, welcher Knopf sichtbar ist.
 *
 * Das Backend ist auch hier die Autoritaet. Diese Tabelle steuert nur, was
 * angeboten wird, und sollte mit der serverseitigen identisch sein.
 */
export type CampaignAction =
  | 'edit'
  | 'request_approval'
  | 'approve'
  | 'test_send'
  | 'pause'
  | 'resume'
  | 'stop';

const ALLOWED: Record<CampaignStatus, CampaignAction[]> = {
  draft: ['edit', 'test_send', 'request_approval'],
  pending_approval: ['approve', 'test_send'],
  // Nach der Freigabe ist Bearbeiten gesperrt: Sonst waere die Freigabe
  // wertlos, weil zwischen Freigabe und Versand noch etwas geaendert werden
  // koennte (AUT-03).
  approved: ['test_send', 'stop'],
  scheduled: ['stop'],
  running: ['pause', 'stop'],
  paused: ['resume', 'stop'],
  stopped: [],
  completed: [],
};

export function isAllowed(status: CampaignStatus, action: CampaignAction): boolean {
  return ALLOWED[status].includes(action);
}

/** Zustaende, in denen tatsaechlich Mails unterwegs sein koennen. */
export function isLive(status: CampaignStatus): boolean {
  return status === 'running' || status === 'paused';
}
