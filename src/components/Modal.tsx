import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icon';
import { IconButton } from './IconButton';

interface ModalProps {
  title: string;
  subtitle?: string;
  icon: IconName;
  tone?: 'accent' | 'danger';
  width: number;
  onClose: () => void;
  footer: ReactNode;
  children: ReactNode;
}

const badge = { accent: 'border-accent bg-accent-subtle text-accent', danger: 'border-danger bg-danger-subtle text-danger' };

/** Figma modal shell: scrim, header with icon badge, scrollable body, footer bar. */
export function Modal({ title, subtitle, icon, tone = 'accent', width, onClose, footer, children }: ModalProps) {
  useEffect(() => {
    // Recorders call preventDefault on keys they capture (e.g. Esc), so those don't close the modal.
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !e.defaultPrevented && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-inset/80" onClick={onClose} />
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        className="relative flex max-h-full w-full flex-col overflow-hidden rounded-[20px] border border-border-strong bg-surface shadow-[0_24px_60px_rgb(0_0_0/0.6)]"
        style={{ maxWidth: width }}
      >
        <header className="flex shrink-0 items-start gap-3.5 pb-[18px] pl-6 pr-5 pt-[22px]">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-[11px] border ${badge[tone]}`}>
            <Icon name={icon} size={19} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="text-h2">{title}</h2>
            {subtitle && <p className="text-small text-fg-secondary">{subtitle}</p>}
          </div>
          <IconButton icon="x" label="Close" onClick={onClose} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-[22px] pt-1">{children}</div>
        <footer className="flex shrink-0 items-center gap-2.5 border-t bg-surface-2 px-6 py-3.5">{footer}</footer>
      </div>
    </div>,
    document.body,
  );
}
