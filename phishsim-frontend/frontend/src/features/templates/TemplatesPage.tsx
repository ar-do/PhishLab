import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { templatesApi } from '@/api/templates';
import { Can } from '@/auth/Can';
import { buttonStyles } from '@/components/ui/button';
import { Card, EmptyState } from '@/components/ui/surface';
import { Table, Td, Th } from '@/components/ui/table';
import { useI18n } from '@/i18n/I18nProvider';
import { formatDateTime } from '@/lib/format';

export function TemplatesPage() {
  const { t, locale } = useI18n();
  const { data } = useQuery({ queryKey: ['templates'], queryFn: () => templatesApi.list() });

  const difficultyLabel = {
    low: t.templates.difficultyLow,
    medium: t.templates.difficultyMedium,
    high: t.templates.difficultyHigh,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-[20px] font-semibold tracking-tight text-ink">{t.templates.title}</h1>
        <Can do="template.edit">
          <Link to="/vorlagen/neu" className={`ml-auto ${buttonStyles({ variant: 'primary' })}`}>
            <Plus size={15} aria-hidden="true" />
            {t.templates.create}
          </Link>
        </Can>
      </div>

      <Card>
        {data && data.items.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <Th>{t.campaigns.name}</Th>
                <Th>{t.templates.category}</Th>
                <Th>{t.templates.difficulty}</Th>
                <Th className="text-right">Version</Th>
                <Th>{t.common.save}</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((template) => (
                <tr key={template.id} className="hover:bg-surface-sunken/50">
                  <Td>
                    <Link
                      to={`/vorlagen/${template.id}`}
                      className="font-medium text-ink underline-offset-2 hover:underline"
                    >
                      {template.name}
                    </Link>
                  </Td>
                  <Td className="text-muted">{template.category}</Td>
                  <Td className="text-muted">{difficultyLabel[template.difficulty]}</Td>
                  <Td className="text-right font-mono tabular-nums text-muted">
                    {template.version}
                  </Td>
                  <Td className="text-muted">{formatDateTime(template.updatedAt, locale)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState message={t.templates.title} />
        )}
      </Card>
    </div>
  );
}
