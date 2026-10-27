import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { DemoPage } from '@/features/demo/DemoPage';
import { ProfilePage } from '@/features/profiles/ProfilePage';

function Shell() {
  return (
    <div className="flex min-h-full">
      {/* TODO(P1): wire to the active TrackingSource status. */}
      <Sidebar sourceName="Camera" sourceStatus="idle" sourceTone="muted" />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<DashboardPage />} />
        <Route path="demo" element={<DemoPage />} />
        <Route path="profiles/:id" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
