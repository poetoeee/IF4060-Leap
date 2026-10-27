export type BadgeTone = 'neutral' | 'accent' | 'warning' | 'success' | 'danger';

const tones: Record<BadgeTone, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: 'bg-neutral-subtle', fg: 'text-fg-secondary', dot: 'bg-fg-secondary' },
  accent: { bg: 'bg-accent-subtle', fg: 'text-accent', dot: 'bg-accent' },
  warning: { bg: 'bg-warning-subtle', fg: 'text-warning', dot: 'bg-warning' },
  success: { bg: 'bg-success-subtle', fg: 'text-success', dot: 'bg-success' },
  danger: { bg: 'bg-danger-subtle', fg: 'text-danger', dot: 'bg-danger' },
};

export function Badge({ tone, label, dot = true }: { tone: BadgeTone; label: string; dot?: boolean }) {
  const t = tones[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full py-[3px] pl-2 pr-2.5 ${t.bg}`}>
      {dot && <span className={`size-1.5 rounded-full ${t.dot}`} />}
      <span className={`whitespace-nowrap text-caption ${t.fg}`}>{label}</span>
    </span>
  );
}
