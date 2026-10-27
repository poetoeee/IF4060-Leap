import { useToast } from '@/store/toast';
import { Icon } from './Icon';

/** Figma 15 "Mapping saved": bottom-centre, auto-dismisses, optional Undo. */
export function ToastHost() {
  const { toast, dismiss } = useToast();
  if (!toast) return null;

  return (
    <div
      key={toast.id}
      role="status"
      className="fixed bottom-7 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3.5 rounded-[14px] border border-border-strong bg-surface-2 py-3 pl-3.5 pr-3 shadow-[0_24px_60px_rgb(0_0_0/0.6)]"
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-success-subtle text-success">
        <Icon name="check" size={16} />
      </span>
      <div className="flex flex-col gap-0.5 pr-4">
        <span className="text-label">{toast.title}</span>
        {toast.message && <span className="text-caption text-fg-secondary">{toast.message}</span>}
      </div>
      {toast.undo && (
        <button
          type="button"
          className="rounded-ctrl px-2.5 py-2 text-label text-fg-secondary hover:bg-surface-3"
          onClick={() => {
            toast.undo?.();
            dismiss();
          }}
        >
          Undo
        </button>
      )}
      <button type="button" aria-label="Dismiss" className="p-1 text-fg-muted hover:text-fg-secondary" onClick={dismiss}>
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}
