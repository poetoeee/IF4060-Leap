import { create } from 'zustand';
import { useAppStore } from '@/store';

/** Opens by itself until the tour has been finished or skipped once. */
export const useOnboarding = create<{ open: boolean }>(() => ({ open: !useAppStore.getState().settings.onboardingDone }));

export const openOnboarding = () => useOnboarding.setState({ open: true });

export function finishOnboarding() {
  useOnboarding.setState({ open: false });
  useAppStore.getState().setSetting('onboardingDone', true);
}
