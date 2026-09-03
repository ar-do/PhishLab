import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-card border border-line bg-surface', className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Leere Zustaende sind eine Einladung zu handeln, kein Achselzucken. */
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {action}
    </div>
  );
}

/** Kennzahlkachel. Zahl gross und in Ziffernbreite, Bezeichnung klein darunter. */
export function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="px-4 py-3">
      <div className="font-mono text-[26px] leading-none tabular-nums text-ink">{value}</div>
      <div className="mt-1.5 text-[13px] text-muted">{label}</div>
      {hint && <div className="mt-0.5 text-[12px] text-muted/80">{hint}</div>}
    </div>
  );
}
