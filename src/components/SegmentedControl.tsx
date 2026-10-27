interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
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
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-[7px] border py-1.5 text-label transition-colors disabled:opacity-40 ${
              active ? 'border-border-strong bg-surface-3 text-fg-primary' : 'border-transparent text-fg-muted hover:text-fg-secondary'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
