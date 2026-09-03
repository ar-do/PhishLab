import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth } from '@/auth/RequireAuth';
import { LoginPage } from '@/features/auth/LoginPage';
import { CampaignsPage } from '@/features/campaigns/CampaignsPage';
import { CampaignDetailPage } from '@/features/campaigns/CampaignDetailPage';
import { CampaignWizard } from '@/features/campaigns/wizard/CampaignWizard';
import { MonitoringPage } from '@/features/monitoring/MonitoringPage';
import { ReportingPage } from '@/features/reporting/ReportingPage';
import { TargetsPage } from '@/features/targets/TargetsPage';
import { TemplateEditorPage } from '@/features/templates/TemplateEditorPage';
import { TemplatesPage } from '@/features/templates/TemplatesPage';

/*
  Routen sind deutsch benannt, weil die Oberflaeche primaer deutsch ist und
  URLs von Nutzern gelesen und geteilt werden.

  Die permission-Angabe am RequireAuth ist Anzeigelogik, keine Absicherung -
  das Backend prueft jeden Request erneut (siehe auth/permissions.ts).
*/
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/kampagnen" replace /> },
          { path: 'kampagnen', element: <CampaignsPage /> },
          { path: 'kampagnen/neu', element: <CampaignWizard /> },
          { path: 'kampagnen/:id', element: <CampaignDetailPage /> },
          { path: 'live', element: <MonitoringPage /> },
          { path: 'live/:id', element: <MonitoringPage /> },
          { path: 'vorlagen', element: <TemplatesPage /> },
          { path: 'vorlagen/:id', element: <TemplateEditorPage /> },
          { path: 'empfaenger', element: <TargetsPage /> },
          { path: 'auswertung', element: <ReportingPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/kampagnen" replace /> },
]);
