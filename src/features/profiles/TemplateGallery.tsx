import { Badge } from '@/components/Badge';
import { GestureGlyph } from '@/components/GestureGlyph';
import { Icon } from '@/components/Icon';
import { actionCaps } from '@/mapping/format';
import { TEMPLATES, type MappingTemplate } from '@/mapping/templates';

interface Props {
  selected: string;
  onSelect: (template: MappingTemplate) => void;
  preview?: number;
}

export function TemplateGallery({ selected, onSelect, preview = 3 }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {TEMPLATES.map((t) => {
        const active = t.id === selected;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t)}
            aria-pressed={active}
            className={`flex flex-col gap-2 rounded-card border p-3.5 text-left transition-colors ${
              active ? 'border-[1.5px] border-accent bg-accent-subtle' : 'border bg-surface-2 hover:border-border-strong'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] border ${active ? 'bg-surface-2' : 'bg-inset'}`}>
                <Icon name={t.icon} size={18} className={active ? 'text-accent' : 'text-fg-secondary'} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-body-md">{t.name}</span>
                  {active && <Icon name="check" size={13} className="shrink-0 text-accent" />}
                </span>
                <span className="truncate text-caption text-fg-muted">{t.tagline}</span>
              </span>
            </div>

            {t.recommended && (
              <div>
                <Badge tone="accent" label="Recommended" dot={false} />
              </div>
            )}

            <div className="flex flex-col gap-1 border-t border-border pt-2">
              {t.mappings.slice(0, preview).map((mm) => (
                <div key={mm.id} className="flex items-center gap-2">
                  <GestureGlyph gesture={mm.gesture} size={16} />
                  <span className="min-w-0 flex-1 truncate text-caption text-fg-secondary">{mm.label ?? actionCaps(mm.action).join(' + ')}</span>
                </div>
              ))}
              {t.mappings.length > preview && (
                <span className="t-overline text-fg-muted">+{t.mappings.length - preview} more mappings</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
