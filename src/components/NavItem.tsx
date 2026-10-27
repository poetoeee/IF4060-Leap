import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

const base = 'flex h-10 items-center gap-2.5 pr-2.5 transition-colors';
const state = (active: boolean) =>
  active ? 'rounded-nav border-l-2 border-accent bg-surface-2' : 'rounded-ctrl border-l-2 border-transparent hover:bg-surface';

interface MainProps {
  to: string;
  icon: IconName;
  label: string;
  end?: boolean;
}

export function NavItemMain({ to, icon, label, end }: MainProps) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `${base} pl-2.5 py-2.5 ${state(isActive)}`}>
      {({ isActive }) => (
        <>
          <Icon name={icon} className={isActive ? 'text-accent' : 'text-fg-secondary'} />
          <span className="flex-1 text-body-md">{label}</span>
        </>
      )}
    </NavLink>
  );
}

interface SubProps {
  to: string;
  label: string;
  caption: string;
  trailing?: ReactNode;
}

export function NavItemSub({ to, label, caption, trailing }: SubProps) {
  return (
    <NavLink to={to} className={({ isActive }) => `${base} pl-2.5 py-[7px] ${state(isActive)}`}>
      <span className="flex min-w-0 flex-1 flex-col gap-px whitespace-nowrap">
        <span className="text-label">{label}</span>
        <span className="text-caption text-fg-muted">{caption}</span>
      </span>
      {trailing}
    </NavLink>
  );
}
