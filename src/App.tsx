import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { ToastHost } from '@/components/Toast';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { DemoPage } from '@/features/demo/DemoPage';
import { FloatingHudOverlay } from '@/features/hud/FloatingHudOverlay';
import { Hud } from '@/features/hud/Hud';
import { startHudSync } from '@/features/hud/view';
import { Onboarding } from '@/features/onboarding/Onboarding';
import { NewProfileModal } from '@/features/profiles/NewProfileModal';
import { ProfilePage } from '@/features/profiles/ProfilePage';
import { startPipeline } from '@/pipeline';
import { startController } from '@/pipeline/controller';
import { useTrackingRuntime } from '@/tracking/useTracking';

function Shell() {
  useTrackingRuntime();
  useEffect(startPipeline, []);
  useEffect(startController, []);
  useEffect(startHudSync, []);
  return (
    <div className="flex min-h-full">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
      <Hud />
      <Onboarding />
      <NewProfileModal />
      <ToastHost />
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="hud-overlay" element={<FloatingHudOverlay />} />
      <Route element={<Shell />}>
        <Route index element={<DashboardPage />} />
        <Route path="demo" element={<DemoPage />} />
        <Route path="profiles/:id" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
