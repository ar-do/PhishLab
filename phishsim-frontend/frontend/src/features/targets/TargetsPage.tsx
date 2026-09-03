import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { targetsApi } from '@/api/targets';
import { Can } from '@/auth/Can';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { Card } from '@/components/ui/surface';
import { Table, Td, Th } from '@/components/ui/table';
import { useI18n } from '@/i18n/I18nProvider';
import { CsvImportDialog } from './CsvImportDialog';

export function TargetsPage() {
  const { t, fill } = useI18n();
  const queryClient = useQueryClient();
  const [groupId, setGroupId] = useState('');
  const [search, setSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const groups = useQuery({ queryKey: ['target-groups'], queryFn: targetsApi.groups });

  const targets = useQuery({
    queryKey: ['targets', { groupId, search }],
    queryFn: () => targetsApi.list({ groupId: groupId || undefined, q: search || undefined }),
  });

  const optOut = useMutation({
    mutationFn: (targetId: string) => targetsApi.optOut(targetId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['targets'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[20px] font-semibold tracking-tight text-ink">{t.targets.title}</h1>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="target-search">
            {t.targets.search}
          </label>
          <Input
            id="target-search"
            type="search"
            placeholder={t.targets.search}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-56"
          />

          <label className="sr-only" htmlFor="group-filter">
            {t.targets.group}
          </label>
          <Select
            id="group-filter"
            className="w-auto"
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
          >
            <option value="">{t.targets.group}</option>
            {groups.data?.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} · {fill(t.targets.members, { count: group.memberCount })}
              </option>
            ))}
          </Select>

          <Can do="target.import">
            <Button variant="primary" onClick={() => setImportOpen(true)}>
              <Upload size={15} aria-hidden="true" />
              {t.targets.import}
            </Button>
          </Can>
        </div>
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>{t.login.email}</Th>
              <Th>{t.campaigns.name}</Th>
              <Th>{t.targets.department}</Th>
              <Th className="w-32 text-right">{t.targets.optedOut}</Th>
            </tr>
          </thead>
          <tbody>
            {targets.data?.items.map((target) => (
              <tr key={target.id} className="hover:bg-surface-sunken/50">
                <Td className="font-mono text-[13px]">{target.email}</Td>
                <Td>
                  {target.firstName} {target.lastName}
                </Td>
                <Td className="text-muted">{target.department ?? '—'}</Td>
                <Td className="text-right">
                  {/* TGT-03: Abmeldung ist endgueltig und wird nicht
                      zurueckgenommen - deshalb gibt es hier nur einen Weg. */}
                  {target.optedOut ? (
                    <span className="text-[13px] text-muted">{t.targets.optedOut}</span>
                  ) : (
                    <Can do="target.opt_out">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={optOut.isPending}
                        onClick={() => optOut.mutate(target.id)}
                      >
                        {t.targets.optOut}
                      </Button>
                    </Can>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <CsvImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        groupId={groupId || null}
      />
    </div>
  );
}
