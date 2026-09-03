import type { Role } from '@/api/types';

/**
 * FE-07 / AUT-02: Rollenabhaengige Sichtbarkeit.
 *
 * Wichtig: Das ist eine Anzeigeschicht, keine Sicherheitsgrenze. Wer die
 * URL kennt, kommt trotzdem an den Request - deshalb prueft das Backend
 * jede Aktion erneut. Die Matrix hier verhindert nur, dass Nutzern Knoepfe
 * angeboten werden, die anschliessend mit 403 fehlschlagen.
 *
 * Die Matrix ist bewusst eine einzige Tabelle statt verstreuter
 * role === 'admin'-Abfragen, damit sie gegen ein Rollenkonzept
 * gegengelesen werden kann.
 */
export const PERMISSIONS = [
  'campaign.view',
  'campaign.edit',
  'campaign.request_approval',
  'campaign.approve',
  'campaign.test_send',
  'campaign.stop',
  'template.view',
  'template.edit',
  'target.view',
  'target.import',
  'target.opt_out',
  'report.view',
  'report.export',
  'audit.view',
  'settings.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const MATRIX: Record<Role, Permission[]> = {
  admin: [...PERMISSIONS],

  manager: [
    'campaign.view',
    'campaign.edit',
    'campaign.request_approval',
    'campaign.test_send',
    'campaign.stop',
    'template.view',
    'template.edit',
    'target.view',
    'target.import',
    'target.opt_out',
    'report.view',
    'report.export',
  ],

  // Auditor ist strikt lesend. Kein Export, weil ein Export personenbezogene
  // Rohdaten aus dem System traegt - das gehoert an die verantwortliche Rolle.
  auditor: ['campaign.view', 'template.view', 'target.view', 'report.view', 'audit.view'],
};

export function hasPermission(roles: Role[], permission: Permission): boolean {
  return roles.some((role) => MATRIX[role]?.includes(permission));
}

/**
 * Ausnahme vom Matrixdenken: Die Freigabe haengt nicht nur an der Rolle,
 * sondern daran, wer die Kampagne eingereicht hat (AUT-03). Ein Admin, der
 * selbst eingereicht hat, darf trotz Berechtigung nicht freigeben.
 */
export function canApprove(
  roles: Role[],
  approval: { blockedForCurrentUser: boolean; approvedAt: string | null },
): boolean {
  if (!hasPermission(roles, 'campaign.approve')) return false;
  if (approval.blockedForCurrentUser) return false;
  return approval.approvedAt === null;
}
