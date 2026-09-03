import type { ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import type { Permission } from './permissions';

/**
 * FE-07: Blendet Bedienelemente aus, fuer die die Rolle nicht berechtigt ist.
 *
 * Bewusst ohne "ausgegraut"-Variante: Ein deaktivierter Knopf verraet die
 * Existenz einer Aktion und fuehrt zu Ruecksprachen. Wer sie nicht ausfuehren
 * darf, soll sie nicht sehen. Ausnahme sind Faelle, in denen die Abwesenheit
 * verwirrt - dort wird `fallback` gesetzt.
 */
export function Can({
  do: permission,
  children,
  fallback = null,
}: {
  do: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return useAuth().can(permission) ? <>{children}</> : <>{fallback}</>;
}
