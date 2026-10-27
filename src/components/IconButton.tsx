import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  tone?: 'default' | 'danger' | 'warning';
}

const tones = { default: 'text-fg-secondary', danger: 'text-danger', warning: 'text-warning' };

/** 32 px square outline button (row actions, modal close). */
export function IconButton({ icon, label, tone = 'default', className = '', ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`flex size-8 shrink-0 items-center justify-center rounded-ctrl border transition-colors hover:bg-surface-2 disabled:opacity-40 ${tones[tone]} ${className}`}
      {...rest}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}
