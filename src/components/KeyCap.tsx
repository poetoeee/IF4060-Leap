/** Keyboard key chip (Figma KeyCap 2:202). Multiple caps are joined with "+". */
export function KeyCaps({ caps, dim = false }: { caps: string[]; dim?: boolean }) {
  return (
    <span className={`flex shrink-0 items-center gap-1 ${dim ? 'opacity-50' : ''}`}>
      {caps.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="font-mono text-key text-fg-muted">+</span>}
          <kbd className="whitespace-nowrap rounded-nav border border-b-2 border-border-strong bg-surface-3 px-2 py-[3px] font-mono text-key text-fg-primary">
            {c}
          </kbd>
        </span>
      ))}
    </span>
  );
}
