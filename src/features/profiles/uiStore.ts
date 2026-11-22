import { create } from 'zustand';
import { DEFAULT_TEMPLATE_ID } from '@/mapping/templates';

interface ProfileUiState {
  newProfileOpen: boolean;
  presetTemplateId: string;
  openNewProfile: (templateId?: string) => void;
  closeNewProfile: () => void;
}

export const useProfileUi = create<ProfileUiState>((set) => ({
  newProfileOpen: false,
  presetTemplateId: DEFAULT_TEMPLATE_ID,
  openNewProfile: (templateId) => set({ newProfileOpen: true, presetTemplateId: templateId ?? DEFAULT_TEMPLATE_ID }),
  closeNewProfile: () => set({ newProfileOpen: false }),
}));
