import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { templatesApi } from '@/api/templates';
import type { TemplateDraft, TemplateDifficulty } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Card, CardHeader } from '@/components/ui/surface';
import { useI18n } from '@/i18n/I18nProvider';

const DIFFICULTIES: TemplateDifficulty[] = ['low', 'medium', 'high'];

/**
 * FE-03: Editor mit Live-Vorschau und Platzhalter-Hilfe.
 *
 * Zwei Entscheidungen, die sicherheitsrelevant sind:
 *
 *  1. Die Vorschau wird vom Server gerendert (TPL-02) und hier nur angezeigt.
 *     Wenn das Frontend das HTML selbst zusammensetzen wuerde, waere die
 *     Vorschau eine andere Mail als die, die spaeter rausgeht - und der
 *     Sanitizer waere umgehbar.
 *  2. Die Anzeige laeuft in einem iframe mit leerem sandbox-Attribut. Damit
 *     kann Vorlagen-HTML weder Skripte ausfuehren noch das Dashboard
 *     navigieren, selbst wenn der Sanitizer etwas durchlaesst.
 */
export function TemplateEditorPage() {
  const { id = '' } = useParams();
  const { t } = useI18n();
  const htmlRef = useRef<HTMLTextAreaElement>(null);

  const [draft, setDraft] = useState<TemplateDraft>({
    name: '',
    subject: '',
    bodyHtml: '',
    bodyText: '',
    difficulty: 'medium',
    category: '',
  });

  const template = useQuery({
    queryKey: ['templates', id],
    queryFn: () => templatesApi.get(id),
    enabled: id !== '' && id !== 'neu',
  });

  const placeholders = useQuery({
    queryKey: ['placeholders'],
    queryFn: templatesApi.placeholders,
  });

  useEffect(() => {
    if (!template.data) return;
    const { name, subject, bodyHtml, bodyText, difficulty, category } = template.data;
    setDraft({ name, subject, bodyHtml, bodyText, difficulty, category });
  }, [template.data]);

  const preview = useMutation({
    mutationFn: () => templatesApi.preview(id, draft),
  });

  const save = useMutation({
    mutationFn: () => (id === 'neu' ? templatesApi.create(draft) : templatesApi.update(id, draft)),
  });

  /**
   * Platzhalter an der Cursorposition einfuegen statt am Ende anzuhaengen.
   * Kleinigkeit, aber der Unterschied zwischen benutzbar und nervig.
   */
  function insertPlaceholder(key: string) {
    const field = htmlRef.current;
    if (!field) return;

    const token = `{{${key}}}`;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const next = draft.bodyHtml.slice(0, start) + token + draft.bodyHtml.slice(end);

    setDraft((current) => ({ ...current, bodyHtml: next }));

    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-[20px] font-semibold tracking-tight text-ink">
          {draft.name || t.templates.create}
        </h1>
        <div className="ml-auto flex gap-2">
          <Button onClick={() => preview.mutate()} disabled={preview.isPending}>
            {t.templates.preview}
          </Button>
          <Button variant="primary" onClick={() => save.mutate()} disabled={save.isPending}>
            {t.templates.save}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.campaigns.name} required>
                {(props) => (
                  <Input
                    {...props}
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  />
                )}
              </Field>

              <Field label={t.templates.category}>
                {(props) => (
                  <Input
                    {...props}
                    value={draft.category}
                    onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                  />
                )}
              </Field>
            </div>

            {/* TPL-03: Schwierigkeitsgrad ist Auswertungsmetadatum, kein Etikett. */}
            <Field label={t.templates.difficulty}>
              {(props) => (
                <Select
                  {...props}
                  value={draft.difficulty}
                  onChange={(event) =>
                    setDraft({ ...draft, difficulty: event.target.value as TemplateDifficulty })
                  }
                >
                  {DIFFICULTIES.map((level) => (
                    <option key={level} value={level}>
                      {level === 'low'
                        ? t.templates.difficultyLow
                        : level === 'medium'
                          ? t.templates.difficultyMedium
                          : t.templates.difficultyHigh}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label={t.templates.subject} required>
              {(props) => (
                <Input
                  {...props}
                  value={draft.subject}
                  onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
                />
              )}
            </Field>

            <Field label={t.templates.html} hint={t.templates.sanitizeNote}>
              {(props) => (
                <Textarea
                  {...props}
                  ref={htmlRef}
                  rows={14}
                  value={draft.bodyHtml}
                  onChange={(event) => setDraft({ ...draft, bodyHtml: event.target.value })}
                />
              )}
            </Field>

            {/* Nur-Text ist kein Beiwerk: Ohne Textteil landet die Mail
                haeufiger im Spam und faellt damit aus der Messung. */}
            <Field label={t.templates.text}>
              {(props) => (
                <Textarea
                  {...props}
                  rows={6}
                  value={draft.bodyText}
                  onChange={(event) => setDraft({ ...draft, bodyText: event.target.value })}
                />
              )}
            </Field>
          </Card>

          <Card>
            <CardHeader title={t.templates.preview} />
            {preview.data ? (
              <div className="p-4">
                <p className="mb-2 text-[13px] text-muted">
                  {t.templates.subject}: <span className="text-ink">{preview.data.subject}</span>
                </p>

                {preview.data.warnings.length > 0 && (
                  <ul className="mb-3 space-y-1 rounded border border-state-review/30 bg-warn-wash px-3 py-2 text-[13px] text-ink">
                    {preview.data.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                )}

                <iframe
                  title={t.templates.preview}
                  sandbox=""
                  srcDoc={preview.data.html}
                  className="h-96 w-full rounded border border-line bg-white"
                />
              </div>
            ) : (
              <p className="px-4 py-10 text-center text-sm text-muted">{t.templates.preview}</p>
            )}
          </Card>
        </div>

        {/* TPL-01: Platzhalterkatalog kommt vom Server, damit Editor und
            Renderer nicht auseinanderlaufen. */}
        <Card className="h-fit">
          <CardHeader title={t.templates.placeholders} description={t.templates.placeholderHint} />
          <ul className="divide-y divide-line">
            {placeholders.data?.map((placeholder) => (
              <li key={placeholder.key}>
                <button
                  type="button"
                  onClick={() => insertPlaceholder(placeholder.key)}
                  className="w-full px-4 py-2.5 text-left hover:bg-surface-sunken"
                >
                  <span className="font-mono text-[13px] text-brand-ink">
                    {`{{${placeholder.key}}}`}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-muted">
                    {placeholder.label} · {placeholder.example}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
