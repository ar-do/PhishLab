import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from './button';

/**
 * Modaler Dialog. Bewusst mit dem nativen <dialog>-Element, weil der Browser
 * damit Fokusfalle, Escape und die Verdeckung des Hintergrunds fuer den
 * Screenreader selbst uebernimmt (WCAG 2.1.2, 2.4.3). Eine eigene
 * Implementierung davon ist eine haeufige Fehlerquelle.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-card border border-line bg-surface p-0 text-ink backdrop:bg-ink/40"
    >
      <div className="border-b border-line px-5 py-4">
        <h2 id="dialog-title" className="text-[15px] font-semibold">
          {title}
        </h2>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>}
      </div>

      {children && <div className="px-5 py-4">{children}</div>}

      <div className="flex justify-end gap-2 border-t border-line bg-surface-sunken/60 px-5 py-3">
        {footer}
      </div>
    </dialog>
  );
}

export function DialogCancel({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" onClick={onClick}>
      {label}
    </Button>
  );
}
