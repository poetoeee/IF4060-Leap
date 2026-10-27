import { Icon, type IconName } from './Icon';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({ options, value, onChange, label, disabled }: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex w-full gap-1 rounded-ctrl-lg border bg-inset p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled || o.disabled}
            onClick={() => onChange(o.value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[7px] border px-2 py-1.5 text-label transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              active ? 'border-border-strong bg-surface-3 text-fg-primary' : 'border-transparent text-fg-muted enabled:hover:text-fg-secondary'
            }`}
          >
            {o.icon && <Icon name={o.icon} size={14} className={active ? 'text-accent' : ''} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
