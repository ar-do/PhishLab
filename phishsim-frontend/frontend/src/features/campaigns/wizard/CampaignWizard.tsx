import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { campaignsApi } from '@/api/campaigns';
import { targetsApi } from '@/api/targets';
import { templatesApi } from '@/api/templates';
import type { CampaignDraft } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { Card } from '@/components/ui/surface';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';

/**
 * FE-02: Zielgruppe -> Vorlage -> Absenderprofil -> Zeitplan -> Freigabe.
 *
 * Der Wizard endet nicht mit "Starten", sondern mit "Zur Freigabe einreichen".
 * Das ist Absicht: Nach AUT-03 kann niemand seine eigene Kampagne
 * losschicken, und ein Startknopf am Ende des Wizards wuerde genau das
 * suggerieren.
 */
const STEPS = ['audience', 'template', 'sender', 'schedule', 'review'] as const;
type Step = (typeof STEPS)[number];

const EMPTY_DRAFT: CampaignDraft = {
  name: '',
  description: '',
  targetGroupId: '',
  templateId: '',
  senderProfileId: '',
  authorizationRef: '',
  schedule: {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    startAt: '',
    windowStart: '08:00',
    windowEnd: '17:00',
    mailsPerMinute: 30,
    jitterMinutes: 45,
  },
};

export function CampaignWizard() {
  const { t, fill } = useI18n();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<CampaignDraft>(EMPTY_DRAFT);

  const step: Step = STEPS[stepIndex] ?? 'audience';

  const groups = useQuery({ queryKey: ['target-groups'], queryFn: targetsApi.groups });
  const templates = useQuery({ queryKey: ['templates'], queryFn: () => templatesApi.list() });
  const senders = useQuery({ queryKey: ['sender-profiles'], queryFn: templatesApi.senderProfiles });

  const submit = useMutation({
    mutationFn: async () => {
      const campaign = await campaignsApi.create(draft);
      await campaignsApi.requestApproval(campaign.id);
      return campaign;
    },
    onSuccess: (campaign) => navigate(`/kampagnen/${campaign.id}`),
  });

  function patch(changes: Partial<CampaignDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  function patchSchedule(changes: Partial<CampaignDraft['schedule']>) {
    setDraft((current) => ({ ...current, schedule: { ...current.schedule, ...changes } }));
  }

  const canContinue = {
    audience: draft.name.trim().length > 0 && draft.targetGroupId !== '',
    template: draft.templateId !== '',
    sender: draft.senderProfileId !== '',
    schedule: draft.schedule.startAt !== '',
    review: draft.authorizationRef.trim().length > 0,
  }[step];

  const selectedGroup = groups.data?.find((group) => group.id === draft.targetGroupId);
  const selectedTemplate = templates.data?.items.find((item) => item.id === draft.templateId);
  const selectedSender = senders.data?.find((profile) => profile.id === draft.senderProfileId);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight text-ink">
          {t.campaigns.create}
        </h1>
        <p className="mt-0.5 text-[13px] text-muted">
          {fill(t.wizard.step, { current: stepIndex + 1, total: STEPS.length })}
        </p>
      </div>

      {/* Fortschritt. Nummerierung ist hier berechtigt, weil es tatsaechlich
          eine Abfolge ist und die Reihenfolge inhaltlich bindet. */}
      <ol className="flex gap-1" aria-label={t.wizard.review}>
        {STEPS.map((name, index) => (
          <li key={name} className="flex-1">
            <div
              className={cn(
                'h-0.5 rounded-full',
                index <= stepIndex ? 'bg-brand' : 'bg-line',
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                'mt-1.5 block text-[12px]',
                index === stepIndex ? 'font-medium text-ink' : 'text-muted',
              )}
              aria-current={index === stepIndex ? 'step' : undefined}
            >
              {t.wizard[name]}
            </span>
          </li>
        ))}
      </ol>

      <Card className="space-y-4 p-5">
        {step === 'audience' && (
          <>
            <Field label={t.campaigns.name} required>
              {(props) => (
                <Input
                  {...props}
                  value={draft.name}
                  onChange={(event) => patch({ name: event.target.value })}
                />
              )}
            </Field>

            <Field label={t.targets.group} required>
              {(props) => (
                <Select
                  {...props}
                  value={draft.targetGroupId}
                  onChange={(event) => patch({ targetGroupId: event.target.value })}
                >
                  <option value="">—</option>
                  {groups.data?.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({fill(t.targets.members, { count: group.memberCount })})
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            {/* TGT-03: Abgemeldete Empfaenger sind hier sichtbar, nicht erst
                im Versandprotokoll. */}
            {selectedGroup && (
              <p className="rounded border border-line bg-surface-sunken px-3 py-2 text-[13px] text-muted">
                {fill(t.wizard.optedOutExcluded, { count: 0 })}
              </p>
            )}
          </>
        )}

        {step === 'template' && (
          <Field label={t.campaigns.template} required>
            {(props) => (
              <Select
                {...props}
                value={draft.templateId}
                onChange={(event) => patch({ templateId: event.target.value })}
              >
                <option value="">—</option>
                {templates.data?.items.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · {t.templates[`difficulty${capitalise(template.difficulty)}`]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}

        {step === 'sender' && (
          <Field label={t.wizard.sender} required>
            {(props) => (
              <Select
                {...props}
                value={draft.senderProfileId}
                onChange={(event) => patch({ senderProfileId: event.target.value })}
              >
                <option value="">—</option>
                {senders.data?.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.displayName} &lt;{profile.fromAddress}&gt;
                    {profile.domainVerified ? '' : ' — SPF/DKIM/DMARC unvollständig'}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}

        {step === 'schedule' && (
          <>
            <Field label={t.wizard.startAt} required>
              {(props) => (
                <Input
                  {...props}
                  type="datetime-local"
                  value={draft.schedule.startAt}
                  onChange={(event) => patchSchedule({ startAt: event.target.value })}
                />
              )}
            </Field>

            <Field label={t.wizard.timezone}>
              {(props) => (
                <Input
                  {...props}
                  value={draft.schedule.timezone}
                  onChange={(event) => patchSchedule({ timezone: event.target.value })}
                />
              )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={`${t.wizard.window} (${t.wizard.startAt})`}>
                {(props) => (
                  <Input
                    {...props}
                    type="time"
                    value={draft.schedule.windowStart}
                    onChange={(event) => patchSchedule({ windowStart: event.target.value })}
                  />
                )}
              </Field>
              <Field label={`${t.wizard.window} (Ende)`}>
                {(props) => (
                  <Input
                    {...props}
                    type="time"
                    value={draft.schedule.windowEnd}
                    onChange={(event) => patchSchedule({ windowEnd: event.target.value })}
                  />
                )}
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t.wizard.throughput}>
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    min={1}
                    value={draft.schedule.mailsPerMinute}
                    onChange={(event) =>
                      patchSchedule({ mailsPerMinute: Number(event.target.value) })
                    }
                  />
                )}
              </Field>

              {/* CAM-03 */}
              <Field label={t.wizard.jitter} hint={t.wizard.jitterHint}>
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    min={0}
                    value={draft.schedule.jitterMinutes}
                    onChange={(event) =>
                      patchSchedule({ jitterMinutes: Number(event.target.value) })
                    }
                  />
                )}
              </Field>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            <dl className="divide-y divide-line text-sm">
              <Row label={t.targets.group} value={selectedGroup?.name ?? '—'} />
              <Row label={t.campaigns.template} value={selectedTemplate?.name ?? '—'} />
              <Row label={t.wizard.sender} value={selectedSender?.fromAddress ?? '—'} />
              <Row label={t.wizard.startAt} value={draft.schedule.startAt || '—'} />
              <Row
                label={t.wizard.throughput}
                value={String(draft.schedule.mailsPerMinute)}
              />
            </dl>

            {/* NFA-11: Ohne dokumentierte Beauftragung kein Versand. */}
            <Field
              label={t.campaigns.authorizationRef}
              hint="Aktenzeichen oder Link zur dokumentierten Freigabe der Simulation."
              required
            >
              {(props) => (
                <Input
                  {...props}
                  value={draft.authorizationRef}
                  onChange={(event) => patch({ authorizationRef: event.target.value })}
                />
              )}
            </Field>

            <p className="rounded border border-line bg-surface-sunken px-3 py-2 text-[13px] leading-relaxed text-muted">
              {t.campaigns.approvalPending}
            </p>
          </>
        )}
      </Card>

      <div className="flex justify-between">
        <Button
          onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
          disabled={stepIndex === 0}
        >
          {t.wizard.back}
        </Button>

        {step === 'review' ? (
          <Button
            variant="primary"
            disabled={!canContinue || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {t.wizard.submit}
          </Button>
        ) : (
          <Button
            variant="primary"
            disabled={!canContinue}
            onClick={() => setStepIndex((index) => Math.min(STEPS.length - 1, index + 1))}
          >
            {t.wizard.next}
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

function capitalise(value: string): 'Low' | 'Medium' | 'High' {
  return (value.charAt(0).toUpperCase() + value.slice(1)) as 'Low' | 'Medium' | 'High';
}
