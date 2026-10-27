import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { ToastHost } from '@/components/Toast';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { DebugOverlay } from '@/features/debug/DebugOverlay';
import { DemoPage } from '@/features/demo/DemoPage';
import { ProfilePage } from '@/features/profiles/ProfilePage';
import { startPipeline } from '@/pipeline';
import { useTrackingRuntime } from '@/tracking/useTracking';

function Shell() {
  useTrackingRuntime();
  useEffect(startPipeline, []);
  return (
    <div className="flex min-h-full">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
      <DebugOverlay />
      <ToastHost />
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
