export type DotTone = 'accent' | 'success' | 'warning' | 'danger' | 'muted';

const tones: Record<DotTone, string> = {
  accent: 'bg-accent shadow-glow-accent',
  success: 'bg-success shadow-glow-success',
  warning: 'bg-warning shadow-glow-warning',
  danger: 'bg-danger shadow-glow-danger',
  muted: 'bg-fg-muted',
};

export function StatusDot({ tone, size = 8 }: { tone: DotTone; size?: number }) {
  return <span aria-hidden className={`inline-block shrink-0 rounded-full ${tones[tone]}`} style={{ width: size, height: size }} />;
}
