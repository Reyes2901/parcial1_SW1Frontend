import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { Spinner } from '../components/ui/Spinner';

const SignInPage = lazy(() => import('./routes/sign-in/SignInPage'));
const SignUpPage = lazy(() => import('./routes/sign-up/SignUpPage'));
const ProjectsPage = lazy(() => import('./routes/projects/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./routes/projects/projectId/ProjectDetailPage'));
const EditorPage = lazy(() => import('./routes/editor/EditorPage'));
const SettingsPage = lazy(() => import('./routes/settings/SettingsPage'));
const GenerationPage = lazy(() => import('./routes/generations/GenerationPage'));
const TemplatesPage = lazy(() => import('./routes/templates/TemplatesPage'));
const ActivityPage = lazy(() => import('./routes/activity/ActivityPage'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen bg-[var(--color-background)]">
    <Spinner size="lg" />
  </div>
);

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  {
    path: '/sign-in',
    element: <Suspense fallback={<LoadingFallback />}><SignInPage /></Suspense>,
  },
  {
    path: '/sign-up',
    element: <Suspense fallback={<LoadingFallback />}><SignUpPage /></Suspense>,
  },
  {
    path: '/',
    element: <Protected><AppShell /></Protected>,
    children: [
      { index: true, element: <Protected><ProjectsPage /></Protected> },
      { path: 'projects', element: <Protected><ProjectsPage /></Protected> },
      { path: 'projects/:projectId', element: <Protected><ProjectDetailPage /></Protected> },
      { path: 'templates', element: <Protected><TemplatesPage /></Protected> },
      { path: 'activity', element: <Protected><ActivityPage /></Protected> },
      { path: 'settings', element: <Protected><SettingsPage /></Protected> },
      { path: 'generations/:generationId', element: <Protected><GenerationPage /></Protected> },
    ],
  },
  {
    path: '/editor/:diagramId',
    element: <Protected><EditorPage /></Protected>,
  },
  {
    path: '*',
    element: <Navigate to="/projects" replace />,
  },
]);


