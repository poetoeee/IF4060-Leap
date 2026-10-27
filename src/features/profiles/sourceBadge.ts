import type { BadgeTone } from '@/components/Badge';
import type { Mapping } from '@/mapping/types';

export const SOURCE_BADGE: Record<Mapping['source'], { tone: BadgeTone; label: string; dot: boolean }> = {
  template: { tone: 'neutral', label: 'Template', dot: false },
  edited: { tone: 'warning', label: 'Edited', dot: true },
  custom: { tone: 'accent', label: 'Custom', dot: true },
};
