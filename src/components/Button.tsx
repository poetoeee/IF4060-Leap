import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-fg-on-accent hover:bg-accent-hover',
  secondary: 'border border-border-strong bg-surface-3 text-fg-primary hover:bg-surface-2',
  ghost: 'text-fg-secondary hover:bg-surface-2',
  danger: 'border border-danger bg-danger-subtle text-danger',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: IconName;
}

export function Button({ variant = 'secondary', icon, className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-ctrl px-3.5 text-label transition-colors disabled:opacity-40 ${variants[variant]} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}
