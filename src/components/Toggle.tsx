interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  size?: 'md' | 'lg';
  label: string;
  disabled?: boolean;
}

const sizes = {
  md: { track: 'h-[22px] w-10', knob: 'size-4', on: 'translate-x-5', off: 'translate-x-[3px]' },
  lg: { track: 'h-8 w-[60px]', knob: 'size-[26px]', on: 'translate-x-[30px]', off: 'translate-x-[2px]' },
};

export function Toggle({ checked, onChange, size = 'md', label, disabled }: ToggleProps) {
  const s = sizes[size];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex shrink-0 items-center rounded-full border transition-colors disabled:opacity-40 ${s.track} ${
        checked ? 'border-accent bg-accent' : 'border-border-strong bg-surface-3'
      }`}
    >
      <span
        className={`rounded-full transition-transform ${s.knob} ${checked ? `bg-fg-primary ${s.on}` : `bg-fg-muted ${s.off}`}`}
      />
    </button>
  );
}
