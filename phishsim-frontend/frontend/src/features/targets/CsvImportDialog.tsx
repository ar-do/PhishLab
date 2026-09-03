import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { targetsApi } from '@/api/targets';
import type { ImportPreview } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogCancel } from '@/components/ui/dialog';
import { Field, Select } from '@/components/ui/field';
import { useI18n } from '@/i18n/I18nProvider';

/**
 * TGT-01 / FE-04: Zweistufiger Import.
 *
 * Der Server liest die Datei, schlaegt ein Spalten-Mapping vor und meldet
 * zurueck, was er gefunden hat. Erst danach wird uebernommen. Ein direkter
 * Import waere hier riskant: Eine vertauschte Spalte bedeutet, dass eine
 * Phishing-Simulation an die falschen Adressen geht.
 *
 * Dubletten, geblockte Domains (TGT-02) und Abmeldungen (TGT-03) werden vor
 * der Uebernahme gezeigt, nicht danach im Protokoll.
 */
const TARGET_FIELDS = ['email', 'firstName', 'lastName', 'department'] as const;

export function CsvImportDialog({
  open,
  onClose,
  groupId,
}: {
  open: boolean;
  onClose: () => void;
  groupId: string | null;
}) {
  const { t, fill } = useI18n();
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const uploadPreview = useMutation({
    mutationFn: (file: File) => targetsApi.previewImport(file),
    onSuccess: (result) => {
      setPreview(result);
      setMapping(result.suggestedMapping);
    },
  });

  const commit = useMutation({
    mutationFn: () =>
      targetsApi.commitImport({
        importId: preview!.importId,
        mapping,
        targetGroupId: groupId,
        newGroupName: null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['targets'] });
      void queryClient.invalidateQueries({ queryKey: ['target-groups'] });
      reset();
    },
  });

  function reset() {
    setPreview(null);
    setMapping({});
    onClose();
  }

  const importable = preview
    ? preview.totalRows - preview.duplicateRows - preview.blockedRows - preview.optedOutRows
    : 0;

  return (
    <Dialog
      open={open}
      onClose={reset}
      title={t.targets.importTitle}
      footer={
        <>
          <DialogCancel label={t.targets.importCancel} onClick={reset} />
          <Button
            variant="primary"
            disabled={!preview || importable <= 0 || commit.isPending}
            onClick={() => commit.mutate()}
          >
            {fill(t.targets.importCommit, { count: importable })}
          </Button>
        </>
      }
    >
      {!preview ? (
        <Field label={t.targets.importDrop}>
          {(props) => (
            <input
              {...props}
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadPreview.mutate(file);
              }}
              className="w-full rounded border border-dashed border-line bg-surface-sunken px-3 py-6 text-sm"
            />
          )}
        </Field>
      ) : (
        <div className="space-y-4">
          <p className="rounded border border-line bg-surface-sunken px-3 py-2 text-[13px] leading-relaxed text-muted">
            {fill(t.targets.importSummary, {
              total: preview.totalRows,
              duplicates: preview.duplicateRows,
              blocked: preview.blockedRows,
              optedOut: preview.optedOutRows,
            })}
          </p>

          {preview.blockedRows > 0 && (
            <p className="rounded border border-state-review/30 bg-warn-wash px-3 py-2 text-[13px] text-ink">
              {t.targets.importBlockedHint}
            </p>
          )}

          <div className="space-y-3">
            <h3 className="text-[13px] font-semibold text-ink">{t.targets.importMapping}</h3>
            {TARGET_FIELDS.map((field) => (
              <Field key={field} label={field}>
                {(props) => (
                  <Select
                    {...props}
                    value={mapping[field] ?? ''}
                    onChange={(event) =>
                      setMapping((current) => ({ ...current, [field]: event.target.value }))
                    }
                  >
                    <option value="">—</option>
                    {preview.detectedColumns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ))}
          </div>

          {preview.errors.length > 0 && (
            <ul className="space-y-1 rounded border border-danger/30 bg-danger-wash px-3 py-2 text-[13px] text-danger">
              {preview.errors.slice(0, 5).map((error) => (
                <li key={`${error.row}-${error.message}`}>
                  {error.row}: {error.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Dialog>
  );
}
